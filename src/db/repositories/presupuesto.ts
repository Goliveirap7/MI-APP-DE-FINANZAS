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

export interface PresupuestoConceptoLocal {
  id_local: string;
  espacio_id: string;
  mes: string;                   // 'YYYY-MM-01'
  categoria_egreso_id: string;
  concepto_detalle_id: string;
  monto_asignado: number;        // Monto asignado al concepto
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Todos los presupuestos de categoría de un mes (excluyendo Transferencias). */
export async function getPresupuestoByMes(
  db: SQLiteDatabase,
  mes: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<PresupuestoCatLocal[]> {
  return db.getAllAsync<PresupuestoCatLocal>(
    `SELECT id_local, espacio_id, mes, categoria_egreso_id, porcentaje_asignado, monto_asignado
       FROM presupuesto_categoria
      WHERE espacio_id = ? AND mes = ? AND eliminado = 0
        AND categoria_egreso_id NOT IN (
          SELECT id_local FROM categorias_egreso WHERE LOWER(TRIM(nombre)) = 'transferencias'
        )`,
    [espacioId, mes],
  );
}

/** Todos los presupuestos de conceptos de un mes. */
export async function getPresupuestoConceptosByMes(
  db: SQLiteDatabase,
  mes: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<PresupuestoConceptoLocal[]> {
  return db.getAllAsync<PresupuestoConceptoLocal>(
    `SELECT id_local, espacio_id, mes, categoria_egreso_id, concepto_detalle_id, monto_asignado
       FROM presupuesto_concepto
      WHERE espacio_id = ? AND mes = ? AND eliminado = 0`,
    [espacioId, mes],
  );
}

/** Presupuesto de conceptos para una categoría específica en un mes. */
export async function getPresupuestoConceptosByCategoria(
  db: SQLiteDatabase,
  mes: string,
  categoriaEgresoId: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<PresupuestoConceptoLocal[]> {
  return db.getAllAsync<PresupuestoConceptoLocal>(
    `SELECT id_local, espacio_id, mes, categoria_egreso_id, concepto_detalle_id, monto_asignado
       FROM presupuesto_concepto
      WHERE espacio_id = ? AND mes = ? AND categoria_egreso_id = ? AND eliminado = 0`,
    [espacioId, mes, categoriaEgresoId],
  );
}

/**
 * Guarda (upsert) el presupuesto completo de un mes sin violar la restricción UNIQUE.
 * Reemplaza o actualiza todos los registros de categoría y concepto en una transacción atómica.
 * Excluye automáticamente cualquier categoría de movimiento interno como "Transferencias".
 *
 * @param items      Array de { categoria_egreso_id, porcentaje_asignado, monto_asignado }
 * @param conceptos  Array opcional de { categoria_egreso_id, concepto_detalle_id, monto_asignado }
 */
export async function upsertPresupuestoMes(
  db: SQLiteDatabase,
  mes: string,
  items: { categoria_egreso_id: string; porcentaje_asignado: number; monto_asignado: number }[],
  conceptos?: { categoria_egreso_id: string; concepto_detalle_id: string; monto_asignado: number }[],
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<void> {
  const ts = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // Excluir cualquier categoría de Transferencias por seguridad
    const transferRow = await db.getFirstAsync<{ id_local: string }>(
      `SELECT id_local FROM categorias_egreso WHERE espacio_id = ? AND LOWER(TRIM(nombre)) = 'transferencias'`,
      [espacioId],
    );
    const validItems = items.filter((i) => i.categoria_egreso_id !== transferRow?.id_local);

    // Obtener registros existentes de categoría para este mes
    const existingRows = await db.getAllAsync<{ id_local: string; categoria_egreso_id: string }>(
      `SELECT id_local, categoria_egreso_id FROM presupuesto_categoria
        WHERE espacio_id = ? AND mes = ?`,
      [espacioId, mes],
    );

    const existingMap = new Map(existingRows.map((r) => [r.categoria_egreso_id, r.id_local]));
    const incomingCatIds = new Set(validItems.map((i) => i.categoria_egreso_id));

    // 1. Insertar o actualizar cada categoría entrante
    for (const item of validItems) {
      const existingId = existingMap.get(item.categoria_egreso_id);

      if (existingId) {
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

    // 2. Marcar como eliminados los de categoría que ya no están en items
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

    // 3. Upsert conceptos si fueron provistos
    if (conceptos && conceptos.length > 0) {
      const existingConceptRows = await db.getAllAsync<{ id_local: string; concepto_detalle_id: string }>(
        `SELECT id_local, concepto_detalle_id FROM presupuesto_concepto
          WHERE espacio_id = ? AND mes = ?`,
        [espacioId, mes],
      );

      const existingConceptMap = new Map(existingConceptRows.map((r) => [r.concepto_detalle_id, r.id_local]));
      const incomingConceptIds = new Set(conceptos.map((c) => c.concepto_detalle_id));

      for (const conc of conceptos) {
        const existingConceptId = existingConceptMap.get(conc.concepto_detalle_id);

        if (existingConceptId) {
          await db.runAsync(
            `UPDATE presupuesto_concepto
                SET monto_asignado = ?,
                    categoria_egreso_id = ?,
                    estado_sync = 'pendiente',
                    fecha_modificacion = ?,
                    eliminado = 0
              WHERE id_local = ?`,
            [conc.monto_asignado, conc.categoria_egreso_id, ts, existingConceptId],
          );

          await _enqueue(
            db,
            'presupuesto_concepto',
            existingConceptId,
            'editar',
            {
              espacio_id: espacioId,
              mes,
              categoria_egreso_id: conc.categoria_egreso_id,
              concepto_detalle_id: conc.concepto_detalle_id,
              monto_asignado: conc.monto_asignado,
            },
            ts,
          );
        } else {
          const newConceptId = Crypto.randomUUID();
          await db.runAsync(
            `INSERT INTO presupuesto_concepto
               (id_local, espacio_id, mes, categoria_egreso_id, concepto_detalle_id,
                monto_asignado, estado_sync, fecha_modificacion, eliminado)
             VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, 0)`,
            [
              newConceptId,
              espacioId,
              mes,
              conc.categoria_egreso_id,
              conc.concepto_detalle_id,
              conc.monto_asignado,
              ts,
            ],
          );

          await _enqueue(
            db,
            'presupuesto_concepto',
            newConceptId,
            'crear',
            {
              espacio_id: espacioId,
              mes,
              categoria_egreso_id: conc.categoria_egreso_id,
              concepto_detalle_id: conc.concepto_detalle_id,
              monto_asignado: conc.monto_asignado,
            },
            ts,
          );
        }
      }

      // Marcar eliminados los conceptos que se hayan removido
      for (const [concId, idLocal] of existingConceptMap.entries()) {
        if (!incomingConceptIds.has(concId)) {
          await db.runAsync(
            `UPDATE presupuesto_concepto
                SET eliminado = 1,
                    estado_sync = 'pendiente',
                    fecha_modificacion = ?
              WHERE id_local = ?`,
            [ts, idLocal],
          );
          await _enqueue(db, 'presupuesto_concepto', idLocal, 'editar', { eliminado: 1 }, ts);
        }
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
