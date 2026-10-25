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
 * Guarda (upsert) el presupuesto completo de un mes sin violar la restricción UNIQUE.
 * Reemplaza o actualiza todos los registros del mes en una transacción atómica.
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
    // Obtener registros existentes para este mes
    const existingRows = await db.getAllAsync<{ id_local: string; categoria_egreso_id: string }>(
      `SELECT id_local, categoria_egreso_id FROM presupuesto_categoria
        WHERE espacio_id = ? AND mes = ?`,
      [espacioId, mes],
    );

    const existingMap = new Map(existingRows.map((r) => [r.categoria_egreso_id, r.id_local]));
    const incomingCatIds = new Set(items.map((i) => i.categoria_egreso_id));

    // 1. Insertar o actualizar cada categoría entrante
    for (const item of items) {
      const existingId = existingMap.get(item.categoria_egreso_id);

      if (existingId) {
        // Ya existía un registro para esta categoría en este mes: actualizar
        await db.runAsync(
          `UPDATE presupuesto_categoria
              SET porcentaje_asignado = ?,
                  monto_asignado = ?,
                  estado_sync = 'pendiente',
                  fecha_modificacion = ?,
                  eliminado = 0
            WHERE id_local = ?`,
          [item.porcentaje_asignado, item.monto_asignado, ts, existingId],
        );

        await _enqueue(
          db,
          'presupuesto_categoria',
          existingId,
          'editar',
          {
            espacio_id: espacioId,
            mes,
            categoria_egreso_id: item.categoria_egreso_id,
            porcentaje_asignado: item.porcentaje_asignado,
            monto_asignado: item.monto_asignado,
          },
          ts,
        );
      } else {
        // Nuevo registro para esta categoría en este mes
        const newId = Crypto.randomUUID();
        await db.runAsync(
          `INSERT INTO presupuesto_categoria
             (id_local, espacio_id, mes, categoria_egreso_id,
              porcentaje_asignado, monto_asignado, estado_sync, fecha_modificacion, eliminado)
           VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, 0)`,
          [
            newId,
            espacioId,
            mes,
            item.categoria_egreso_id,
            item.porcentaje_asignado,
            item.monto_asignado,
            ts,
          ],
        );

        await _enqueue(
          db,
          'presupuesto_categoria',
          newId,
          'crear',
          {
            espacio_id: espacioId,
            mes,
            categoria_egreso_id: item.categoria_egreso_id,
            porcentaje_asignado: item.porcentaje_asignado,
            monto_asignado: item.monto_asignado,
          },
          ts,
        );
      }
    }

    // 2. Marcar como eliminados los que ya no están en items
    for (const [catId, idLocal] of existingMap.entries()) {
      if (!incomingCatIds.has(catId)) {
        await db.runAsync(
          `UPDATE presupuesto_categoria
              SET eliminado = 1,
                  estado_sync = 'pendiente',
                  fecha_modificacion = ?
            WHERE id_local = ?`,
          [ts, idLocal],
        );
        await _enqueue(db, 'presupuesto_categoria', idLocal, 'editar', { eliminado: 1 }, ts);
      }
    }
  });
}

async function _enqueue(
  db: SQLiteDatabase,
  tabla: string,
  idLocal: string,
  op: 'crear' | 'editar' | 'eliminar',
  datos: object,
  ts: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_queue (id, tabla, id_local, tipo_operacion, datos, intentos, creado_en)
     VALUES (?,?,?,?,?,0,?)`,
    [Crypto.randomUUID(), tabla, idLocal, op, JSON.stringify(datos), ts],
  );
}
