/**
 * inversiones.ts — Repositorio de activos de inversión (RF-13, RF-14, RF-15).
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { DEFAULT_ESPACIO_ID } from '../seed';

export interface ActivoLocal {
  id_local: string;
  id_remoto: string | null;
  espacio_id: string;
  nombre: string;
  monto_invertido: number;
  nota: string | null;
  estado_sync: string;
  fecha_modificacion: string;
}

export interface NuevoActivo {
  nombre: string;
  monto_invertido: number;
  nota?: string | null;
  espacio_id?: string;
}

export async function insertActivo(
  db: SQLiteDatabase,
  data: NuevoActivo,
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = new Date().toISOString();
  const espacioId = data.espacio_id ?? DEFAULT_ESPACIO_ID;

  await db.runAsync(
    `INSERT INTO activos_inversion
       (id_local, espacio_id, nombre, monto_invertido, nota,
        estado_sync, fecha_modificacion, eliminado)
     VALUES (?,?,?,?,?, 'pendiente',?,0)`,
    [id, espacioId, data.nombre, data.monto_invertido, data.nota ?? null, ts],
  );
  return id;
}

export async function updateActivoMonto(
  db: SQLiteDatabase,
  idLocal: string,
  nuevoMonto: number,
): Promise<void> {
  const ts = new Date().toISOString();
  await db.runAsync(
    `UPDATE activos_inversion
        SET monto_invertido = ?, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [nuevoMonto, ts, idLocal],
  );
}

export async function getActivosByEspacio(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<ActivoLocal[]> {
  return db.getAllAsync<ActivoLocal>(
    `SELECT * FROM activos_inversion
      WHERE espacio_id = ? AND eliminado = 0
      ORDER BY nombre ASC`,
    [espacioId],
  );
}

/** Total invertido. */
export async function getTotalInvertido(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(monto_invertido), 0) AS total
       FROM activos_inversion
      WHERE espacio_id = ? AND eliminado = 0`,
    [espacioId],
  );
  return row?.total ?? 0;
}
