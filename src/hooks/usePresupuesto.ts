/**
 * usePresupuesto — carga y combina presupuesto + gasto real + disponible
 * para armar la vista completa de la pantalla de Presupuesto del mes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '../db/database';
import { getCatEgresoByEspacio, type CatEgreso } from '../db/repositories/categorias';
import { getPresupuestoByMes, upsertPresupuestoMes } from '../db/repositories/presupuesto';
import { getSumByTipoMes, getSumByCategoriaMes, getSaldoHistoricoHasta } from '../db/repositories/transacciones';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BudgetRow {
  categoria:          CatEgreso;
  porcentaje:         number;   // 0–100 (para mostrar en UI)
  monto_presupuesto:  number;   // = porcentaje/100 * disponible
  monto_real:         number;   // gasto registrado en el mes
  diferencia:         number;   // presupuesto - real
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
  guardar:      () => Promise<void>;
  discardDraft: () => Promise<void>;
  refetch:      () => void;
}

// ── Mes previo helper ─────────────────────────────────────────────────────────
function mesPrevio(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ── Helper clave borrador ─────────────────────────────────────────────────────
const getBudgetDraftKey = (espacioId: string, mes: string) => `@aphelios_budget_draft_${espacioId}_${mes}`;

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

      // ── Categorías y su presupuesto guardado ─────────────────────────────
      const [allCats, presupuestos, reales] = await Promise.all([
        getCatEgresoByEspacio(db, espacioId),
        getPresupuestoByMes(db, mes, espacioId),
        getSumByCategoriaMes(db, mes, espacioId),
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
        if (disp > 0) {
          pct = Number(((monto / disp) * 100).toFixed(1));
        }

        const real  = reales.find((r) => r.categoria_egreso_id === cat.id_local)?.total ?? 0;
        return {
          categoria:          cat,
          porcentaje:         pct,
          monto_presupuesto:  monto,
          monto_real:         real,
          diferencia:         monto - real,
        };
      });

      // Revisar si existe un borrador sin guardar en almacenamiento local
      try {
        const draftRaw = await AsyncStorage.getItem(getBudgetDraftKey(espacioId, mes));
        if (draftRaw) {
          const draftMap: Record<string, { porcentaje: number; monto_presupuesto: number }> = JSON.parse(draftRaw);
          let appliedDraft = false;
          built = built.map((row) => {
            const entry = draftMap[row.categoria.id_local];
            if (entry) {
              appliedDraft = true;
              return {
                ...row,
                porcentaje:        entry.porcentaje,
                monto_presupuesto: entry.monto_presupuesto,
                diferencia:        entry.monto_presupuesto - row.monto_real,
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
      const draftMap: Record<string, { porcentaje: number; monto_presupuesto: number }> = {};
      updatedRows.forEach((r) => {
        draftMap[r.categoria.id_local] = {
          porcentaje: r.porcentaje,
          monto_presupuesto: r.monto_presupuesto,
        };
      });
      AsyncStorage.setItem(getBudgetDraftKey(espacioId, mes), JSON.stringify(draftMap));
      setHasDraft(true);
    } catch (e) {
      console.warn('[usePresupuesto] Error guardando borrador:', e);
    }
  }, [espacioId, mes]);

  // ── Actualizar % localmente (guardando borrador) ─────────────────────────
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
      await upsertPresupuestoMes(
        db,
        mes,
        rows.map((r) => ({
          categoria_egreso_id:  r.categoria.id_local,
          porcentaje_asignado:  r.porcentaje / 100,
          monto_asignado:       r.monto_presupuesto,
        })),
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
    guardar,
    discardDraft,
    refetch: load,
  };
}
