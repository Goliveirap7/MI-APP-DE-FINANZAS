/**
 * presupuesto.ts — Repositorio de presupuesto_categoria (RF-04, RF-05).
 *
 * Un registro por categoría de egreso por mes.
 * porcentaje_asignado: 0.00–1.00, la suma de todas las categorías del mes debe ser 1.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { DEFAULT_ESPACIO_ID } from '../seed';

export interface PresupuestoCatLocal {
  id_local: string;
  espacio_id: string;
  mes: string;                   // 'YYYY-MM-01'
  categoria_egreso_id: string;
  porcentaje_asignado: number;   // 0.00–1.00
  monto_asignado: number;        // Monto fijo tope
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Todos los presupuestos de un mes. */
export async function getPresupuestoByMes(
  db: SQLiteDatabase,
  mes: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<PresupuestoCatLocal[]> {
  return db.getAllAsync<PresupuestoCatLocal>(
    `SELECT id_local, espacio_id, mes, categoria_egreso_id, porcentaje_asignado, monto_asignado
       FROM presupuesto_categoria
      WHERE espacio_id = ? AND mes = ? AND eliminado = 0`,
    [espacioId, mes],
  );
}

/**
 * Guarda (upsert) el presupuesto completo de un mes.
 * Reemplaza todos los registros del mes en una transacción atómica.
 *
 * @param items  Array de { categoria_egreso_id, porcentaje_asignado, monto_asignado }
 */
export async function upsertPresupuestoMes(
  db: SQLiteDatabase,
  mes: string,
  items: { categoria_egreso_id: string; porcentaje_asignado: number; monto_asignado: number }[],
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<void> {
  const ts = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // Soft-delete de los registros anteriores del mes
    await db.runAsync(
      `UPDATE presupuesto_categoria
          SET eliminado = 1, fecha_modificacion = ?
        WHERE espacio_id = ? AND mes = ?`,
      [ts, espacioId, mes],
    );

    // Insertar los nuevos
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO presupuesto_categoria
           (id_local, espacio_id, mes, categoria_egreso_id,
            porcentaje_asignado, monto_asignado, estado_sync, fecha_modificacion, eliminado)
         VALUES (?,?,?,?,?,?, 'pendiente',?,0)`,
        [
          Crypto.randomUUID(),
          espacioId,
          mes,
          item.categoria_egreso_id,
          item.porcentaje_asignado,
          item.monto_asignado,
          ts,
        ],
      );
    }
  });
}
