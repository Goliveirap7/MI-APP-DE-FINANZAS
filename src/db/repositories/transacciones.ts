/**
 * transacciones.ts — Repositorio de transacciones (RF-01, RF-02, RF-03).
 *
 * Implementa el patrón offline-first (§18):
 *  - insert/update/delete guardan localmente con estado_sync = 'pendiente'
 *  - también encolan en sync_queue para subir a Supabase cuando haya conexión
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { DEFAULT_ESPACIO_ID } from '../seed';

// ── Tipo local ────────────────────────────────────────────────────────────────

export interface TransaccionLocal {
  id_local: string;
  id_remoto: string | null;
  espacio_id: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoria_ingreso_id: string | null;
  categoria_egreso_id: string | null;
  concepto_detalle_id: string | null;
  monto_real: number;
  monto_presupuestado: number | null;
  nota: string | null;
  foto_uri: string | null;
  metodo_pago: 'virtual' | 'efectivo';
  estado_sync: string;
  fecha_modificacion: string;
  eliminado: number;
}

// ── Input para crear/editar ───────────────────────────────────────────────────

export interface NuevaTransaccion {
  tipo: 'ingreso' | 'egreso';
  fecha: string;
  categoria_ingreso_id?: string | null;
  categoria_egreso_id?: string | null;
  concepto_detalle_id?: string | null;
  monto_real: number;
  monto_presupuestado?: number | null;
  nota?: string | null;
  foto_uri?: string | null;
  metodo_pago?: 'virtual' | 'efectivo';
  espacio_id?: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Inserta una transacción y la encola para sync. Devuelve el id_local. */
export async function insertTransaccion(
  db: SQLiteDatabase,
  data: NuevaTransaccion,
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = new Date().toISOString();
  const espacioId = data.espacio_id ?? DEFAULT_ESPACIO_ID;

  await db.runAsync(
    `INSERT INTO transacciones
       (id_local, espacio_id, fecha, tipo,
        categoria_ingreso_id, categoria_egreso_id, concepto_detalle_id,
        monto_real, monto_presupuestado, nota, foto_uri, metodo_pago,
        estado_sync, fecha_modificacion, eliminado)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pendiente',?,0)`,
    [
      id,
      espacioId,
      data.fecha,
      data.tipo,
      data.categoria_ingreso_id ?? null,
      data.categoria_egreso_id ?? null,
      data.concepto_detalle_id ?? null,
      data.monto_real,
      data.monto_presupuestado ?? null,
      data.nota ?? null,
      data.foto_uri ?? null,
      data.metodo_pago ?? 'virtual',
      ts,
    ],
  );

  // Encolar para sync
  await _enqueue(db, 'transacciones', id, 'crear', data, ts);

  return id;
}

/** Soft-delete: marca eliminado=1 y encola para sync. */
export async function deleteTransaccion(
  db: SQLiteDatabase,
  idLocal: string,
): Promise<void> {
  const ts = new Date().toISOString();
  await db.runAsync(
    `UPDATE transacciones
        SET eliminado = 1, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [ts, idLocal],
  );
  await _enqueue(db, 'transacciones', idLocal, 'eliminar', {}, ts);
}

/** Transacciones de un mes (YYYY-MM-DD range), sin eliminados. */
export async function getTransaccionesByMes(
  db: SQLiteDatabase,
  mes: string,       // 'YYYY-MM-01'
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<TransaccionLocal[]> {
  // mes siguiente para el rango
  const [y, m] = mes.split('-').map(Number);
  const nextDate = new Date(y, m, 1); // auto-avanza al mes siguiente
  const nextMes  = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;

  return db.getAllAsync<TransaccionLocal>(
    `SELECT *
       FROM transacciones
      WHERE espacio_id = ?
        AND fecha >= ?
        AND fecha < ?
        AND eliminado = 0
      ORDER BY fecha DESC, rowid DESC`,
    [espacioId, mes, nextMes],
  );
}

/** Suma de montos por tipo en un mes. */
export async function getSumByTipoMes(
  db: SQLiteDatabase,
  mes: string,
  tipo: 'ingreso' | 'egreso',
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<number> {
  const [y, m] = mes.split('-').map(Number);
  const nextDate = new Date(y, m, 1);
  const nextMes  = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;

  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(monto_real), 0) AS total
       FROM transacciones
      WHERE espacio_id = ? AND tipo = ?
        AND fecha >= ? AND fecha < ?
        AND eliminado = 0`,
    [espacioId, tipo, mes, nextMes],
  );
  return row?.total ?? 0;
}

/** Suma de montos totales (históricos) por método de pago */
export async function getTotalesBilletera(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<{ virtual: number, efectivo: number }> {
  const rows = await db.getAllAsync<{ metodo_pago: string, total: number }>(
    `SELECT metodo_pago,
            SUM(CASE WHEN tipo = 'ingreso' THEN monto_real ELSE -monto_real END) AS total
       FROM transacciones
      WHERE espacio_id = ? AND eliminado = 0
      GROUP BY metodo_pago`,
    [espacioId],
  );
  
  let virtual = 0;
  let efectivo = 0;
  for (const r of rows) {
    if (r.metodo_pago === 'virtual') virtual = r.total;
    if (r.metodo_pago === 'efectivo') efectivo = r.total;
  }
  
  return { virtual, efectivo };
}

/** Obtiene el saldo acumulado de todos los meses anteriores hasta la fecha (exclusiva) */
export async function getSaldoHistoricoHasta(
  db: SQLiteDatabase,
  mes: string, // YYYY-MM-01
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(CASE WHEN tipo = 'ingreso' THEN monto_real ELSE -monto_real END) AS total
       FROM transacciones
      WHERE espacio_id = ? AND fecha < ? AND eliminado = 0`,
    [espacioId, mes],
  );
  return Math.max(row?.total ?? 0, 0);
}

/** Suma de montos por categoría de egreso en un mes (para barras de progreso). */
export async function getSumByCategoriaMes(
  db: SQLiteDatabase,
  mes: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<{ categoria_egreso_id: string; total: number }[]> {
  const [y, m] = mes.split('-').map(Number);
  const nextDate = new Date(y, m, 1);
  const nextMes  = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;

  return db.getAllAsync(
    `SELECT categoria_egreso_id, COALESCE(SUM(monto_real), 0) AS total
       FROM transacciones
      WHERE espacio_id = ? AND tipo = 'egreso'
        AND fecha >= ? AND fecha < ?
        AND eliminado = 0
        AND categoria_egreso_id IS NOT NULL
      GROUP BY categoria_egreso_id`,
    [espacioId, mes, nextMes],
  );
}

/** Obtiene una transacción por su ID (para edición) */
export async function getTransaccionById(
  db: SQLiteDatabase,
  idLocal: string,
): Promise<TransaccionLocal | null> {
  return db.getFirstAsync<TransaccionLocal>(
    `SELECT * FROM transacciones WHERE id_local = ?`,
    [idLocal]
  );
}

/** Actualiza una transacción y encola sync */
export async function updateTransaccion(
  db: SQLiteDatabase,
  idLocal: string,
  data: Partial<NuevaTransaccion>
): Promise<void> {
  const ts = new Date().toISOString();
  
  // Extraemos las keys y preparamos la query dinámicamente
  const keys = Object.keys(data).filter(k => k !== 'espacio_id');
  if (keys.length === 0) return;
  
  const setString = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (data as any)[k]);
  
  await db.runAsync(
    `UPDATE transacciones 
        SET ${setString}, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [...values, ts, idLocal]
  );
  
  await _enqueue(db, 'transacciones', idLocal, 'editar', data, ts);
}

/** Obtiene transacciones de un mes, filtrando opcionalmente por tipo y/o categoría */
export async function getTransaccionesDetalle(
  db: SQLiteDatabase,
  mes: string,
  tipo?: 'ingreso' | 'egreso',
  categoriaId?: string,
  espacioId = DEFAULT_ESPACIO_ID
): Promise<TransaccionLocal[]> {
  const [y, m] = mes.split('-').map(Number);
  const nextDate = new Date(y, m, 1);
  const nextMes  = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-01`;

  let query = `
    SELECT *
      FROM transacciones
     WHERE espacio_id = ?
       AND fecha >= ?
       AND fecha < ?
       AND eliminado = 0
  `;
  const params: any[] = [espacioId, mes, nextMes];

  if (tipo) {
    query += ` AND tipo = ?`;
    params.push(tipo);
  }
  if (categoriaId) {
    if (tipo === 'ingreso') {
      query += ` AND categoria_ingreso_id = ?`;
    } else {
      query += ` AND categoria_egreso_id = ?`;
    }
    params.push(categoriaId);
  }

  query += ` ORDER BY fecha DESC, rowid DESC`;

  return db.getAllAsync<TransaccionLocal>(query, params);
}

/** Obtiene el historial histórico de transacciones (ingresos por defecto) */
export async function getHistorial(
  db: SQLiteDatabase,
  tipo: 'ingreso' | 'egreso',
  espacioId = DEFAULT_ESPACIO_ID,
  limit = 50
): Promise<TransaccionLocal[]> {
  return db.getAllAsync<TransaccionLocal>(
    `SELECT *
       FROM transacciones
      WHERE espacio_id = ?
        AND tipo = ?
        AND eliminado = 0
      ORDER BY fecha DESC, rowid DESC
      LIMIT ?`,
    [espacioId, tipo, limit]
  );
}

// ── Helper privado: sync queue ────────────────────────────────────────────────

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
