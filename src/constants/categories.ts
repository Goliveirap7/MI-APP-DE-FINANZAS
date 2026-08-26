/**
 * Catálogo inicial de categorías y conceptos de detalle.
 * Fuente: secciones 11 y 14 del documento de requisitos.
 *
 * Estos datos se usan como semilla cuando el usuario crea un nuevo Espacio.
 * El usuario puede editar/agregar más desde Configuración (RF-16).
 */

export const SEED_CATEGORIAS_INGRESO = [
  { nombre: 'Salario' },
  { nombre: 'Negocio' },
  { nombre: 'Otros' },
] as const;

export type NombreCategoriaIngreso = typeof SEED_CATEGORIAS_INGRESO[number]['nombre'];

export const SEED_CATEGORIAS_EGRESO = [
  { nombre: 'Servicios' },
  { nombre: 'Gastos necesarios' },
  { nombre: 'Gastos sin culpa' },
  { nombre: 'Salud' },
  { nombre: 'Emergencia' },
  { nombre: 'Inversión' },
] as const;

export type NombreCategoriaEgreso = typeof SEED_CATEGORIAS_EGRESO[number]['nombre'];

/** Conceptos de detalle por categoría de egreso (§14). */
export const SEED_CONCEPTOS_DETALLE: Record<string, string[]> = {
  'Servicios': ['Internet', 'Alquiler + gas', 'Teléfono/plan móvil'],
  'Gastos necesarios': [
    'Desayuno',
    'Almuerzo',
    'Cena',
    'Limpieza depa/ropa',
    'Limpieza personal',
    'Otros',
  ],
  // 'Gastos sin culpa' queda como catálogo abierto (el usuario define sus propios)
  'Salud':       [],
  'Emergencia':  [],
  'Inversión':   [],
};
