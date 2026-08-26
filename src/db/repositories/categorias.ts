/**
 * categorias.ts — Repositorio de categorías de ingreso y egreso.
 *
 * Todas las funciones reciben el objeto `db` (SQLiteDatabase) para ser
 * puras y fácilmente testeables sin depender del contexto React.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
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
