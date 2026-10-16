/**
 * deudas.ts — Repositorio de deudas con terceros (RF-10, RF-11, RF-12).
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { DEFAULT_ESPACIO_ID } from '../seed';

export interface DeudaLocal {
  id_local: string;
  id_remoto: string | null;
  espacio_id: string;
  persona: string;
  monto: number;
  direccion: 'me_deben' | 'debo';
  fecha: string;
  estado: 'pendiente' | 'pagada';
  nota: string | null;
  estado_sync: string;
  fecha_modificacion: string;
}

export interface NuevaDeuda {
  persona: string;
  monto: number;
  direccion: 'me_deben' | 'debo';
  fecha: string;
  nota?: string | null;
  espacio_id?: string;
}

export async function insertDeuda(
  db: SQLiteDatabase,
  data: NuevaDeuda,
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = new Date().toISOString();
  const espacioId = data.espacio_id ?? DEFAULT_ESPACIO_ID;

  await db.runAsync(
    `INSERT INTO deudas
       (id_local, espacio_id, persona, monto, direccion, fecha, estado, nota,
        estado_sync, fecha_modificacion, eliminado)
     VALUES (?,?,?,?,?,?,'pendiente',?, 'pendiente',?,0)`,
    [id, espacioId, data.persona, data.monto, data.direccion, data.fecha,
     data.nota ?? null, ts],
  );

  await _enqueue(db, 'deudas', id, 'crear', data, ts);
  return id;
}

/** Actualiza los datos de una deuda existente. */
export async function updateDeuda(
  db: SQLiteDatabase,
  idLocal: string,
  data: Partial<NuevaDeuda>,
): Promise<void> {
  const ts = new Date().toISOString();
  const keys = Object.keys(data).filter(k => k !== 'espacio_id');
  if (keys.length === 0) return;

  const setString = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => (data as any)[k]);

  await db.runAsync(
    `UPDATE deudas
        SET ${setString}, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [...values, ts, idLocal],
  );

  await _enqueue(db, 'deudas', idLocal, 'editar', data, ts);
}

/** Elimina lógicamente una deuda. */
export async function deleteDeuda(
  db: SQLiteDatabase,
  idLocal: string,
): Promise<void> {
  const ts = new Date().toISOString();
  await db.runAsync(
    `UPDATE deudas
        SET eliminado = 1, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [ts, idLocal],
  );
  await _enqueue(db, 'deudas', idLocal, 'eliminar', {}, ts);
}

/** Marca una deuda como pagada. */
export async function marcarDeudaPagada(
  db: SQLiteDatabase,
  idLocal: string,
): Promise<void> {
  const ts = new Date().toISOString();
  await db.runAsync(
    `UPDATE deudas
        SET estado = 'pagada', estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [ts, idLocal],
  );
  await _enqueue(db, 'deudas', idLocal, 'editar', { estado: 'pagada' }, ts);
}

export async function getDeudasByEspacio(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
  soloPendientes = false,
): Promise<DeudaLocal[]> {
  const whereEstado = soloPendientes ? `AND estado = 'pendiente'` : '';
  return db.getAllAsync<DeudaLocal>(
    `SELECT * FROM deudas
      WHERE espacio_id = ? AND eliminado = 0 ${whereEstado}
      ORDER BY fecha DESC`,
    [espacioId],
  );
}

/** Total me_deben - debo (solo pendientes). */
export async function getTotalesDeuda(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<{ me_deben: number; debo: number }> {
  const rows = await db.getAllAsync<{ direccion: string; total: number }>(
    `SELECT direccion, COALESCE(SUM(monto), 0) AS total
       FROM deudas
      WHERE espacio_id = ? AND estado = 'pendiente' AND eliminado = 0
      GROUP BY direccion`,
    [espacioId],
  );
  const me_deben = rows.find((r) => r.direccion === 'me_deben')?.total ?? 0;
  const debo     = rows.find((r) => r.direccion === 'debo')?.total ?? 0;
  return { me_deben, debo };
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
