/**
 * usePresupuesto — carga y combina presupuesto + gasto real + disponible
 * para armar la vista completa de la pantalla de Presupuesto del mes.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/database';
import { getCatEgresoByEspacio, type CatEgreso } from '../db/repositories/categorias';
import { getPresupuestoByMes, upsertPresupuestoMes } from '../db/repositories/presupuesto';
import { getSumByTipoMes, getSumByCategoriaMes } from '../db/repositories/transacciones';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BudgetRow {
  categoria:          CatEgreso;
  porcentaje:         number;   // 0–100 (para mostrar en UI)
  monto_presupuesto:  number;   // = porcentaje/100 * disponible
  monto_real:         number;   // gasto registrado en el mes
  diferencia:         number;   // presupuesto - real
}

export interface UsePresupuesto {
  disponible:   number;
  rows:         BudgetRow[];
  totalPct:     number;        // suma de porcentajes
  totalMonto:   number;        // suma de montos
  loading:      boolean;
  saving:       boolean;
  updatePct:    (catId: string, nuevoPct: number) => void;
  updateMonto:  (catId: string, nuevoMonto: number) => void;
  guardar:      () => Promise<void>;
  refetch:      () => void;
}

// ── Mes previo helper ─────────────────────────────────────────────────────────
function mesPrevio(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePresupuesto(
  mes: string,
  espacioId = DEFAULT_ESPACIO_ID,
): UsePresupuesto {
  const db = useDatabase();

  const [disponible, setDisponible] = useState(0);
  const [rows, setRows]             = useState<BudgetRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // ── Disponible del mes (saldo previo + ingresos) ──────────────────────
      const prev      = mesPrevio(mes);
      const prevIng   = await getSumByTipoMes(db, prev, 'ingreso',  espacioId);
      const prevEgr   = await getSumByTipoMes(db, prev, 'egreso',   espacioId);
      const saldoInicial = Math.max(prevIng - prevEgr, 0);

      const ingMes    = await getSumByTipoMes(db, mes, 'ingreso', espacioId);
      const disp      = saldoInicial + ingMes;
      setDisponible(disp);

      // ── Categorías y su presupuesto guardado ─────────────────────────────
      const [cats, presupuestos, reales] = await Promise.all([
        getCatEgresoByEspacio(db, espacioId),
        getPresupuestoByMes(db, mes, espacioId),
        getSumByCategoriaMes(db, mes, espacioId),
      ]);

      const built: BudgetRow[] = cats.map((cat) => {
        const saved = presupuestos.find((p) => p.categoria_egreso_id === cat.id_local);
        let monto = 0;
        let pct = 0;
        if (saved) {
          // Backward compatibility: If monto_asignado is 0 but we had a porcentaje_asignado, calculate it
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

      setRows(built);
    } finally {
      setLoading(false);
    }
  }, [db, mes, espacioId]);

  useEffect(() => { load(); }, [load]);

  // ── Actualizar % localmente (sin guardar todavía) ─────────────────────────
  const updatePct = useCallback((catId: string, nuevoPct: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.categoria.id_local !== catId) return r;
        const pct   = Math.max(0, Math.min(100, nuevoPct));
        const monto = Number(((pct / 100) * disponible).toFixed(2));
        return {
          ...r,
          porcentaje:        pct,
          monto_presupuesto: monto,
          diferencia:        monto - r.monto_real,
        };
      }),
    );
  }, [disponible]);

  const updateMonto = useCallback((catId: string, nuevoMonto: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.categoria.id_local !== catId) return r;
        const monto = Math.max(0, nuevoMonto);
        const pct = disponible > 0 ? Number(((monto / disponible) * 100).toFixed(1)) : 0;
        return {
          ...r,
          porcentaje:        pct,
          monto_presupuesto: monto,
          diferencia:        monto - r.monto_real,
        };
      }),
    );
  }, [disponible]);

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
    } finally {
      setSaving(false);
    }
  }, [db, mes, rows, totalMonto, disponible, espacioId]);

  return { disponible, rows, totalPct, totalMonto, loading, saving, updatePct, updateMonto, guardar, refetch: load };
}
