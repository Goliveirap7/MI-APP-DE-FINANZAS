/**
 * usePresupuesto — carga y combina presupuesto + gasto real + disponible
 * para armar la vista completa de la pantalla de Presupuesto del mes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '../db/database';
import { getCatEgresoByEspacio, type CatEgreso, type ConceptoDetalle } from '../db/repositories/categorias';
import { getPresupuestoByMes, getPresupuestoConceptosByMes, upsertPresupuestoMes } from '../db/repositories/presupuesto';
import { getSumByTipoMes, getSumByCategoriaMes, getSumByConceptoMes, getSaldoHistoricoHasta } from '../db/repositories/transacciones';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ConceptBudgetRow {
  concepto:          ConceptoDetalle;
  monto_presupuesto: number;   // Monto asignado al concepto
  monto_real:        number;   // Gasto real registrado en el mes
  diferencia:        number;   // presupuesto - real
}

export interface BudgetRow {
  categoria:          CatEgreso;
  porcentaje:         number;   // 0–100 (para mostrar en UI)
  monto_presupuesto:  number;   // = porcentaje/100 * disponible o suma de conceptos
  monto_real:         number;   // gasto registrado en el mes
  diferencia:         number;   // presupuesto - real
  conceptos:          ConceptBudgetRow[];
}

export interface BudgetSummaryItem {
  nombre: string;
  pct: number;
  monto: number;
}

export interface UsePresupuesto {
  disponible:   number;
  rows:         BudgetRow[];
  totalPct:     number;        // suma de porcentajes
  totalMonto:   number;        // suma de montos
  loading:      boolean;
  saving:       boolean;
  hasExistingBudget: boolean;
  existingBudgetSummary: BudgetSummaryItem[];
  hasDraft:     boolean;
  updatePct:    (catId: string, nuevoPct: number) => void;
  updateMonto:  (catId: string, nuevoMonto: number) => void;
  updateConceptMonto: (catId: string, conceptoId: string, nuevoMonto: number) => void;
  guardar:      () => Promise<void>;
  discardDraft: () => Promise<void>;
  refetch:      () => void;
}

// ── Helper clave borrador ─────────────────────────────────────────────────────
const getBudgetDraftKey = (espacioId: string, mes: string) => `@aphelios_budget_draft_${espacioId}_${mes}`;

interface DraftCategoryData {
  porcentaje: number;
  monto_presupuesto: number;
  conceptos?: Record<string, number>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePresupuesto(
  mes: string,
  espacioId = DEFAULT_ESPACIO_ID,
): UsePresupuesto {
  const db = useDatabase();

  const [disponible, setDisponible] = useState(0);
  const [rows, setRows]             = useState<BudgetRow[]>([]);
  const [hasExistingBudget, setHasExistingBudget] = useState(false);
  const [existingBudgetSummary, setExistingBudgetSummary] = useState<BudgetSummaryItem[]>([]);
  const [hasDraft, setHasDraft]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // ── Disponible del mes (saldo acumulado real + ingresos de este mes) ──
      const saldoInicial = await getSaldoHistoricoHasta(db, mes, espacioId);
      const ingMes       = await getSumByTipoMes(db, mes, 'ingreso', espacioId);
      const disp         = Math.max(saldoInicial + ingMes, 0);
      setDisponible(disp);

      // ── Categorías, conceptos y sus presupuestos guardados ───────────────
      const [allCats, presupuestos, reales, allConceptos, presupConceptos, realesConceptos] = await Promise.all([
        getCatEgresoByEspacio(db, espacioId),
        getPresupuestoByMes(db, mes, espacioId),
        getSumByCategoriaMes(db, mes, espacioId),
        db.getAllAsync<ConceptoDetalle>(
          `SELECT id_local, categoria_egreso_id, nombre 
             FROM conceptos_detalle 
            WHERE eliminado = 0 
            ORDER BY rowid ASC`
        ),
        getPresupuestoConceptosByMes(db, mes, espacioId),
        getSumByConceptoMes(db, mes, undefined, espacioId),
      ]);

      // Las transferencias son movimientos internos, no deben presupuestarse
      const cats = allCats.filter(
        (c) => c.nombre.trim().toLowerCase() !== 'transferencias'
      );

      const catTransferenciasId = allCats.find(
        (c) => c.nombre.trim().toLowerCase() === 'transferencias'
      )?.id_local;
      const presupuestosValidos = presupuestos.filter(
        (p) => p.categoria_egreso_id !== catTransferenciasId
      );

      const hasBudget = presupuestosValidos.some((p) => p.monto_asignado > 0 || p.porcentaje_asignado > 0);
      setHasExistingBudget(hasBudget);

      // Resumen del presupuesto actualmente guardado (para confirmación)
      const summary: BudgetSummaryItem[] = cats
        .map((cat) => {
          const saved = presupuestosValidos.find((p) => p.categoria_egreso_id === cat.id_local);
          if (!saved || (saved.monto_asignado <= 0 && saved.porcentaje_asignado <= 0)) return null;
          let monto = saved.monto_asignado;
          let pct = saved.porcentaje_asignado * 100;
          if (monto === 0 && saved.porcentaje_asignado > 0 && disp > 0) {
            monto = saved.porcentaje_asignado * disp;
          } else if (pct === 0 && disp > 0 && monto > 0) {
            pct = (monto / disp) * 100;
          }
          return {
            nombre: cat.nombre,
            pct: Number(pct.toFixed(1)),
            monto: Number(monto.toFixed(2)),
          };
        })
        .filter(Boolean) as BudgetSummaryItem[];

      setExistingBudgetSummary(summary);

      let built: BudgetRow[] = cats.map((cat) => {
        const catConceptos = allConceptos.filter((c) => c.categoria_egreso_id === cat.id_local);
        const conceptosRows: ConceptBudgetRow[] = catConceptos.map((conc) => {
          const concSaved = presupConceptos.find((pc) => pc.concepto_detalle_id === conc.id_local);
          const concReal = realesConceptos.find((rc) => rc.concepto_detalle_id === conc.id_local)?.total ?? 0;
          const concMonto = concSaved?.monto_asignado ?? 0;
          return {
            concepto: conc,
            monto_presupuesto: concMonto,
            monto_real: concReal,
            diferencia: concMonto - concReal,
          };
        });

        const saved = presupuestosValidos.find((p) => p.categoria_egreso_id === cat.id_local);
        let monto = 0;
        let pct = 0;
        if (saved) {
          if (saved.monto_asignado > 0) {
            monto = saved.monto_asignado;
          } else if (saved.porcentaje_asignado > 0) {
            monto = saved.porcentaje_asignado * disp;
          }
        }

        // Si la categoría tiene conceptos presupuestados y superan o definen el monto, respetar
        const conceptSum = conceptosRows.reduce((acc, c) => acc + c.monto_presupuesto, 0);
        if (monto === 0 && conceptSum > 0) {
          monto = conceptSum;
        }

        if (disp > 0) {
          pct = Number(((monto / disp) * 100).toFixed(1));
        }

        const real = reales.find((r) => r.categoria_egreso_id === cat.id_local)?.total ?? 0;
        return {
          categoria:          cat,
          porcentaje:         pct,
          monto_presupuesto:  monto,
          monto_real:         real,
          diferencia:         monto - real,
          conceptos:          conceptosRows,
        };
      });

      // Revisar si existe un borrador sin guardar en almacenamiento local
      try {
        const draftRaw = await AsyncStorage.getItem(getBudgetDraftKey(espacioId, mes));
        if (draftRaw) {
          const draftMap: Record<string, DraftCategoryData> = JSON.parse(draftRaw);
          let appliedDraft = false;
          built = built.map((row) => {
            const entry = draftMap[row.categoria.id_local];
            if (entry) {
              appliedDraft = true;
              const nextConceptos = row.conceptos.map((c) => {
                const concMonto = entry.conceptos?.[c.concepto.id_local];
                if (concMonto !== undefined) {
                  return {
                    ...c,
                    monto_presupuesto: concMonto,
                    diferencia: concMonto - c.monto_real,
                  };
                }
                return c;
              });

              return {
                ...row,
                porcentaje:        entry.porcentaje,
                monto_presupuesto: entry.monto_presupuesto,
                diferencia:        entry.monto_presupuesto - row.monto_real,
                conceptos:         nextConceptos,
              };
            }
            return row;
          });
          setHasDraft(appliedDraft);
        } else {
          setHasDraft(false);
        }
      } catch (e) {
        console.warn('[usePresupuesto] Error cargando borrador local:', e);
      }

      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [db, mes, espacioId]);

  useEffect(() => { load(); }, [load]);

  // Guardar borrador en AsyncStorage
  const persistDraft = useCallback((updatedRows: BudgetRow[]) => {
    try {
      const draftMap: Record<string, DraftCategoryData> = {};
      updatedRows.forEach((r) => {
        const concDraft: Record<string, number> = {};
        r.conceptos.forEach((c) => {
          concDraft[c.concepto.id_local] = c.monto_presupuesto;
        });
        draftMap[r.categoria.id_local] = {
          porcentaje: r.porcentaje,
          monto_presupuesto: r.monto_presupuesto,
          conceptos: concDraft,
        };
      });
      AsyncStorage.setItem(getBudgetDraftKey(espacioId, mes), JSON.stringify(draftMap));
      setHasDraft(true);
    } catch (e) {
      console.warn('[usePresupuesto] Error guardando borrador:', e);
    }
  }, [espacioId, mes]);

  // ── Actualizar % de categoría (guardando borrador) ───────────────────────
  const updatePct = useCallback((catId: string, nuevoPct: number) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.categoria.id_local !== catId) return r;
        const pct   = Math.max(0, Math.min(100, nuevoPct));
        const monto = Number(((pct / 100) * disponible).toFixed(2));
        return {
          ...r,
          porcentaje:        pct,
          monto_presupuesto: monto,
          diferencia:        monto - r.monto_real,
        };
      });
      persistDraft(next);
      return next;
    });
  }, [disponible, persistDraft]);

  // ── Actualizar monto de categoría directamente ──────────────────────────
  const updateMonto = useCallback((catId: string, nuevoMonto: number) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.categoria.id_local !== catId) return r;
        const monto = Math.max(0, nuevoMonto);
        const pct = disponible > 0 ? Number(((monto / disponible) * 100).toFixed(1)) : 0;
        return {
          ...r,
          porcentaje:        pct,
          monto_presupuesto: monto,
          diferencia:        monto - r.monto_real,
        };
      });
      persistDraft(next);
      return next;
    });
  }, [disponible, persistDraft]);

  // ── Actualizar monto de un concepto de detalle ───────────────────────────
  const updateConceptMonto = useCallback((catId: string, conceptoId: string, nuevoMonto: number) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.categoria.id_local !== catId) return r;
        const validMonto = Math.max(0, nuevoMonto);
        const nextConceptos = r.conceptos.map((c) => {
          if (c.concepto.id_local !== conceptoId) return c;
          return {
            ...c,
            monto_presupuesto: validMonto,
            diferencia: validMonto - c.monto_real,
          };
        });

        // La categoría suma automáticamente el monto de todos sus conceptos
        const nuevaSumaConceptos = nextConceptos.reduce((acc, c) => acc + c.monto_presupuesto, 0);
        const nuevoPct = disponible > 0 ? Number(((nuevaSumaConceptos / disponible) * 100).toFixed(1)) : 0;

        return {
          ...r,
          porcentaje: nuevoPct,
          monto_presupuesto: Number(nuevaSumaConceptos.toFixed(2)),
          diferencia: Number((nuevaSumaConceptos - r.monto_real).toFixed(2)),
          conceptos: nextConceptos,
        };
      });
      persistDraft(next);
      return next;
    });
  }, [disponible, persistDraft]);

  const totalPct = rows.reduce((s, r) => s + r.porcentaje, 0);
  const totalMonto = rows.reduce((s, r) => s + r.monto_presupuesto, 0);

  // ── Guardar en SQLite ──────────────────────────────────────────────────
  const guardar = useCallback(async () => {
    const errorMonto = Math.abs(totalMonto - disponible);
    if (disponible > 0 && errorMonto > 0.1) {
      throw new Error(`Has asignado S/ ${totalMonto.toFixed(2)} pero tienes S/ ${disponible.toFixed(2)} disponibles. Por favor cuadra el presupuesto.`);
    }
    setSaving(true);
    try {
      const flatConceptos: { categoria_egreso_id: string; concepto_detalle_id: string; monto_asignado: number }[] = [];
      for (const r of rows) {
        for (const c of r.conceptos) {
          flatConceptos.push({
            categoria_egreso_id: r.categoria.id_local,
            concepto_detalle_id: c.concepto.id_local,
            monto_asignado: c.monto_presupuesto,
          });
        }
      }

      await upsertPresupuestoMes(
        db,
        mes,
        rows.map((r) => ({
          categoria_egreso_id:  r.categoria.id_local,
          porcentaje_asignado:  r.porcentaje / 100,
          monto_asignado:       r.monto_presupuesto,
        })),
        flatConceptos,
        espacioId,
      );
      // Limpiar borrador al guardar exitosamente
      await AsyncStorage.removeItem(getBudgetDraftKey(espacioId, mes));
      setHasDraft(false);
    } finally {
      setSaving(false);
    }
  }, [db, mes, rows, totalMonto, disponible, espacioId]);

  // ── Descartar borrador y restaurar lo guardado en BD ─────────────────────
  const discardDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(getBudgetDraftKey(espacioId, mes));
      setHasDraft(false);
      await load();
    } catch (e) {
      console.warn('[usePresupuesto] Error descartando borrador:', e);
    }
  }, [espacioId, mes, load]);

  return {
    disponible,
    rows,
    totalPct,
    totalMonto,
    loading,
    saving,
    hasExistingBudget,
    existingBudgetSummary,
    hasDraft,
    updatePct,
    updateMonto,
    updateConceptMonto,
    guardar,
    discardDraft,
    refetch: load,
  };
}
