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

// ── Categoría especial de Transferencias y migración ─────────────────────────

export async function getOrCreateCategoriaTransferencias(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<{ egresoId: string; ingresoId: string }> {
  const ts = new Date().toISOString();

  // 1. Categoría de Egreso "Transferencias"
  let egresoRow = await db.getFirstAsync<{ id_local: string }>(
    `SELECT id_local FROM categorias_egreso
      WHERE espacio_id = ? AND LOWER(nombre) = 'transferencias' AND eliminado = 0`,
    [espacioId],
  );

  let egresoId = egresoRow?.id_local;
  if (!egresoId) {
    // Si estaba marcada como eliminada, reactivarla
    const deletedRow = await db.getFirstAsync<{ id_local: string }>(
      `SELECT id_local FROM categorias_egreso
        WHERE espacio_id = ? AND LOWER(nombre) = 'transferencias'`,
      [espacioId],
    );

    if (deletedRow) {
      egresoId = deletedRow.id_local;
      await db.runAsync(
        `UPDATE categorias_egreso SET eliminado = 0, estado_sync = 'pendiente', fecha_modificacion = ? WHERE id_local = ?`,
        [ts, egresoId],
      );
      await _enqueue(db, 'categorias_egreso', egresoId, 'editar', { eliminado: 0, nombre: 'Transferencias' }, ts);
    } else {
      egresoId = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO categorias_egreso
           (id_local, espacio_id, nombre, estado_sync, fecha_modificacion, eliminado)
         VALUES (?, ?, 'Transferencias', 'pendiente', ?, 0)`,
        [egresoId, espacioId, ts],
      );
      await _enqueue(db, 'categorias_egreso', egresoId, 'crear', { nombre: 'Transferencias', espacio_id: espacioId }, ts);
    }
  }

  // 2. Categoría de Ingreso "Transferencias"
  let ingresoRow = await db.getFirstAsync<{ id_local: string }>(
    `SELECT id_local FROM categorias_ingreso
      WHERE espacio_id = ? AND LOWER(nombre) = 'transferencias' AND eliminado = 0`,
    [espacioId],
  );

  let ingresoId = ingresoRow?.id_local;
  if (!ingresoId) {
    const deletedRow = await db.getFirstAsync<{ id_local: string }>(
      `SELECT id_local FROM categorias_ingreso
        WHERE espacio_id = ? AND LOWER(nombre) = 'transferencias'`,
      [espacioId],
    );

    if (deletedRow) {
      ingresoId = deletedRow.id_local;
      await db.runAsync(
        `UPDATE categorias_ingreso SET eliminado = 0, estado_sync = 'pendiente', fecha_modificacion = ? WHERE id_local = ?`,
        [ts, ingresoId],
      );
      await _enqueue(db, 'categorias_ingreso', ingresoId, 'editar', { eliminado: 0, nombre: 'Transferencias' }, ts);
    } else {
      ingresoId = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO categorias_ingreso
           (id_local, espacio_id, nombre, estado_sync, fecha_modificacion, eliminado)
         VALUES (?, ?, 'Transferencias', 'pendiente', ?, 0)`,
        [ingresoId, espacioId, ts],
      );
      await _enqueue(db, 'categorias_ingreso', ingresoId, 'crear', { nombre: 'Transferencias', espacio_id: espacioId }, ts);
    }
  }

  return { egresoId, ingresoId };
}

/**
 * Migra todas las transacciones sin categoría a la categoría "Transferencias",
 * asegurando que se sincronicen los cambios con Supabase.
 */
export async function migrarTransaccionesSinCategoriaATransferencias(
  db: SQLiteDatabase,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<{ egresosMigrados: number; ingresosMigrados: number }> {
  const { egresoId, ingresoId } = await getOrCreateCategoriaTransferencias(db, espacioId);
  const ts = new Date().toISOString();

  // Egresos sin categoría (típicamente transferencias o ajustes)
  const egresosSinCat = await db.getAllAsync<{ id_local: string }>(
    `SELECT id_local FROM transacciones
      WHERE espacio_id = ?
        AND tipo = 'egreso'
        AND (categoria_egreso_id IS NULL OR categoria_egreso_id = '')
        AND eliminado = 0`,
    [espacioId],
  );

  for (const row of egresosSinCat) {
    await db.runAsync(
      `UPDATE transacciones
          SET categoria_egreso_id = ?, estado_sync = 'pendiente', fecha_modificacion = ?
        WHERE id_local = ?`,
      [egresoId, ts, row.id_local],
    );
    await _enqueue(db, 'transacciones', row.id_local, 'editar', { categoria_egreso_id: egresoId }, ts);
  }

  // Ingresos sin categoría
  const ingresosSinCat = await db.getAllAsync<{ id_local: string }>(
    `SELECT id_local FROM transacciones
      WHERE espacio_id = ?
        AND tipo = 'ingreso'
        AND (categoria_ingreso_id IS NULL OR categoria_ingreso_id = '')
        AND eliminado = 0`,
    [espacioId],
  );

  for (const row of ingresosSinCat) {
    await db.runAsync(
      `UPDATE transacciones
          SET categoria_ingreso_id = ?, estado_sync = 'pendiente', fecha_modificacion = ?
        WHERE id_local = ?`,
      [ingresoId, ts, row.id_local],
    );
    await _enqueue(db, 'transacciones', row.id_local, 'editar', { categoria_ingreso_id: ingresoId }, ts);
  }

  if (egresosSinCat.length > 0 || ingresosSinCat.length > 0) {
    console.log(
      `[DB Migración] Se migraron ${egresosSinCat.length} egresos y ${ingresosSinCat.length} ingresos sin categoría a 'Transferencias'`,
    );
  }

  return {
    egresosMigrados: egresosSinCat.length,
    ingresosMigrados: ingresosSinCat.length,
  };
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
