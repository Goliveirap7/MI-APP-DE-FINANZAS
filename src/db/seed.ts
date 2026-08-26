/**
 * seed.ts — datos iniciales para un espacio nuevo.
 *
 * Se ejecuta UNA SOLA VEZ cuando la app arranca con la DB vacía.
 * Crea:
 *   1. Un Espacio local por defecto ("Mi presupuesto")
 *   2. Las 3 categorías de ingreso del catálogo oficial (§11)
 *   3. Las 6 categorías de egreso del catálogo oficial (§11)
 *   4. Los conceptos de detalle predefinidos (§14)
 *
 * El id_local del espacio por defecto se guarda en la tabla espacios.
 * El resto de la app lo obtiene con EspaciosRepo.getDefault().
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

const now = () => new Date().toISOString();

export const DEFAULT_ESPACIO_ID = 'local-default-espacio';

export async function seedIfEmpty(db: SQLiteDatabase): Promise<void> {
  // Solo sembrar si no hay espacios
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM espacios WHERE eliminado = 0',
  );
  if (row && row.cnt > 0) return;

  console.log('[DB seed] Sembrando catálogo inicial…');

  const ts = now();

  // ── 1. Espacio por defecto ───────────────────────────────────────────────
  await db.runAsync(
    `INSERT INTO espacios
       (id_local, nombre, codigo_invitacion, creado_en, estado_sync, fecha_modificacion)
     VALUES (?, ?, ?, ?, 'pendiente', ?)`,
    [DEFAULT_ESPACIO_ID, 'Mi presupuesto', 'LOCAL-0000', ts, ts],
  );

  // ── 2. Categorías de ingreso ─────────────────────────────────────────────
  const catIngreso = [
    { id: 'ci-salario',  nombre: 'Salario'  },
    { id: 'ci-negocio',  nombre: 'Negocio'  },
    { id: 'ci-otros',    nombre: 'Otros'    },
  ];
  for (const c of catIngreso) {
    await db.runAsync(
      `INSERT INTO categorias_ingreso
         (id_local, espacio_id, nombre, estado_sync, fecha_modificacion)
       VALUES (?, ?, ?, 'pendiente', ?)`,
      [c.id, DEFAULT_ESPACIO_ID, c.nombre, ts],
    );
  }

  // ── 3. Categorías de egreso ──────────────────────────────────────────────
  const catEgreso = [
    { id: 'ce-servicios',    nombre: 'Servicios'         },
    { id: 'ce-necesarios',   nombre: 'Gastos necesarios' },
    { id: 'ce-sinculpa',     nombre: 'Gastos sin culpa'  },
    { id: 'ce-salud',        nombre: 'Salud'             },
    { id: 'ce-emergencia',   nombre: 'Emergencia'        },
    { id: 'ce-inversion',    nombre: 'Inversión'         },
  ];
  for (const c of catEgreso) {
    await db.runAsync(
      `INSERT INTO categorias_egreso
         (id_local, espacio_id, nombre, estado_sync, fecha_modificacion)
       VALUES (?, ?, ?, 'pendiente', ?)`,
      [c.id, DEFAULT_ESPACIO_ID, c.nombre, ts],
    );
  }

  // ── 4. Conceptos de detalle (§14) ────────────────────────────────────────
  const conceptos: { catId: string; nombre: string }[] = [
    // Servicios
    { catId: 'ce-servicios',  nombre: 'Internet'           },
    { catId: 'ce-servicios',  nombre: 'Alquiler + gas'     },
    { catId: 'ce-servicios',  nombre: 'Teléfono/plan móvil'},
    // Gastos necesarios
    { catId: 'ce-necesarios', nombre: 'Desayuno'           },
    { catId: 'ce-necesarios', nombre: 'Almuerzo'           },
    { catId: 'ce-necesarios', nombre: 'Cena'               },
    { catId: 'ce-necesarios', nombre: 'Limpieza depa/ropa' },
    { catId: 'ce-necesarios', nombre: 'Limpieza personal'  },
    { catId: 'ce-necesarios', nombre: 'Otros'              },
    // Resto: catálogo abierto, sin conceptos predefinidos
  ];
  for (const c of conceptos) {
    await db.runAsync(
      `INSERT INTO conceptos_detalle
         (id_local, categoria_egreso_id, nombre, estado_sync, fecha_modificacion)
       VALUES (?, ?, ?, 'pendiente', ?)`,
      [Crypto.randomUUID(), c.catId, c.nombre, ts],
    );
  }

  console.log('[DB seed] ✅ Catálogo inicial creado.');
}
