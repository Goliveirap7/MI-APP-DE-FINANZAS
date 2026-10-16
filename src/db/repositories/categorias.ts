/**
 * categorias.ts — Repositorio de categorías de ingreso y egreso (RF-16).
 *
 * Todas las funciones reciben el objeto `db` (SQLiteDatabase) para ser
 * puras y fácilmente testeables sin depender del contexto React.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { DEFAULT_ESPACIO_ID } from '../seed';

// ── Tipos locales ─────────────────────────────────────────────────────────────

export interface CatIngreso {
  id_local: string;
  id_remoto: string | null;
  espacio_id: string;
  nombre: string;
}

export interface CatEgreso {
  id_local: string;
  id_remoto: string | null;
  espacio_id: string;
  nombre: string;
}

export interface ConceptoDetalle {
  id_local: string;
  categoria_egreso_id: string;
  nombre: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getCatIngresoByEspacio(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<CatIngreso[]> {
  return db.getAllAsync<CatIngreso>(
    `SELECT id_local, id_remoto, espacio_id, nombre
       FROM categorias_ingreso
      WHERE espacio_id = ? AND eliminado = 0
      ORDER BY rowid ASC`,
    [espacioId],
  );
}

export async function getCatEgresoByEspacio(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<CatEgreso[]> {
  return db.getAllAsync<CatEgreso>(
    `SELECT id_local, id_remoto, espacio_id, nombre
       FROM categorias_egreso
      WHERE espacio_id = ? AND eliminado = 0
      ORDER BY rowid ASC`,
    [espacioId],
  );
}

export async function getConceptosByCategoria(
  db: SQLiteDatabase,
  categoriaEgresoId: string,
): Promise<ConceptoDetalle[]> {
  return db.getAllAsync<ConceptoDetalle>(
    `SELECT id_local, categoria_egreso_id, nombre
       FROM conceptos_detalle
      WHERE categoria_egreso_id = ? AND eliminado = 0
      ORDER BY rowid ASC`,
    [categoriaEgresoId],
  );
}

// ── Mutaciones: Categorías de Egreso ──────────────────────────────────────────

export async function insertCatEgreso(
  db: SQLiteDatabase,
  nombre: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO categorias_egreso
       (id_local, espacio_id, nombre, estado_sync, fecha_modificacion, eliminado)
     VALUES (?, ?, ?, 'pendiente', ?, 0)`,
    [id, espacioId, nombre.trim(), ts],
  );

  await _enqueue(db, 'categorias_egreso', id, 'crear', { nombre: nombre.trim(), espacio_id: espacioId }, ts);
  return id;
}

export async function updateCatEgreso(
  db: SQLiteDatabase,
  idLocal: string,
  nombre: string,
): Promise<void> {
  const ts = new Date().toISOString();

  await db.runAsync(
    `UPDATE categorias_egreso
        SET nombre = ?, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [nombre.trim(), ts, idLocal],
  );

  await _enqueue(db, 'categorias_egreso', idLocal, 'editar', { nombre: nombre.trim() }, ts);
}

export async function deleteCatEgreso(
  db: SQLiteDatabase,
  idLocal: string,
): Promise<void> {
  const ts = new Date().toISOString();

  // Soft delete de la categoría
  await db.runAsync(
    `UPDATE categorias_egreso
        SET eliminado = 1, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [ts, idLocal],
  );

  // Soft delete de sus conceptos hijos
  await db.runAsync(
    `UPDATE conceptos_detalle
        SET eliminado = 1, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE categoria_egreso_id = ?`,
    [ts, idLocal],
  );

  await _enqueue(db, 'categorias_egreso', idLocal, 'editar', { eliminado: 1 }, ts);
}

// ── Mutaciones: Conceptos de Detalle (Subtipos) ───────────────────────────────

export async function insertConceptoDetalle(
  db: SQLiteDatabase,
  categoriaEgresoId: string,
  nombre: string,
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO conceptos_detalle
       (id_local, categoria_egreso_id, nombre, estado_sync, fecha_modificacion, eliminado)
     VALUES (?, ?, ?, 'pendiente', ?, 0)`,
    [id, categoriaEgresoId, nombre.trim(), ts],
  );

  await _enqueue(db, 'conceptos_detalle', id, 'crear', { categoria_egreso_id: categoriaEgresoId, nombre: nombre.trim() }, ts);
  return id;
}

export async function updateConceptoDetalle(
  db: SQLiteDatabase,
  idLocal: string,
  nombre: string,
): Promise<void> {
  const ts = new Date().toISOString();

  await db.runAsync(
    `UPDATE conceptos_detalle
        SET nombre = ?, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [nombre.trim(), ts, idLocal],
  );

  await _enqueue(db, 'conceptos_detalle', idLocal, 'editar', { nombre: nombre.trim() }, ts);
}

export async function deleteConceptoDetalle(
  db: SQLiteDatabase,
  idLocal: string,
): Promise<void> {
  const ts = new Date().toISOString();

  await db.runAsync(
    `UPDATE conceptos_detalle
        SET eliminado = 1, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [ts, idLocal],
  );

  await _enqueue(db, 'conceptos_detalle', idLocal, 'editar', { eliminado: 1 }, ts);
}

// ── Mutaciones: Categorías de Ingreso ─────────────────────────────────────────

export async function insertCatIngreso(
  db: SQLiteDatabase,
  nombre: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<string> {
  const id = Crypto.randomUUID();
  const ts = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO categorias_ingreso
       (id_local, espacio_id, nombre, estado_sync, fecha_modificacion, eliminado)
     VALUES (?, ?, ?, 'pendiente', ?, 0)`,
    [id, espacioId, nombre.trim(), ts],
  );

  await _enqueue(db, 'categorias_ingreso', id, 'crear', { nombre: nombre.trim(), espacio_id: espacioId }, ts);
  return id;
}

export async function updateCatIngreso(
  db: SQLiteDatabase,
  idLocal: string,
  nombre: string,
): Promise<void> {
  const ts = new Date().toISOString();

  await db.runAsync(
    `UPDATE categorias_ingreso
        SET nombre = ?, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [nombre.trim(), ts, idLocal],
  );

  await _enqueue(db, 'categorias_ingreso', idLocal, 'editar', { nombre: nombre.trim() }, ts);
}

export async function deleteCatIngreso(
  db: SQLiteDatabase,
  idLocal: string,
): Promise<void> {
  const ts = new Date().toISOString();

  await db.runAsync(
    `UPDATE categorias_ingreso
        SET eliminado = 1, estado_sync = 'pendiente', fecha_modificacion = ?
      WHERE id_local = ?`,
    [ts, idLocal],
  );

  await _enqueue(db, 'categorias_ingreso', idLocal, 'editar', { eliminado: 1 }, ts);
}

// ── Conteo de transacciones asociadas ─────────────────────────────────────────

export async function countTransaccionesByCatEgreso(
  db: SQLiteDatabase,
  catId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM transacciones WHERE categoria_egreso_id = ? AND eliminado = 0`,
    [catId],
  );
  return row?.cnt ?? 0;
}

export async function countTransaccionesByCatIngreso(
  db: SQLiteDatabase,
  catId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM transacciones WHERE categoria_ingreso_id = ? AND eliminado = 0`,
    [catId],
  );
  return row?.cnt ?? 0;
}

export async function countTransaccionesByConcepto(
  db: SQLiteDatabase,
  conceptoId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM transacciones WHERE concepto_detalle_id = ? AND eliminado = 0`,
    [conceptoId],
  );
  return row?.cnt ?? 0;
}

// ── Helper interno de cola de sincronización ──────────────────────────────────

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
