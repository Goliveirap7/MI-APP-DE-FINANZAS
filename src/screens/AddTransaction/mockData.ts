/**
 * Datos mock para AddTransactionScreen.
 *
 * Refleja el catálogo semilla de src/constants/categories.ts pero con IDs
 * locales para poder simular la selección antes de conectar la DB.
 */
import type { CategoryOption } from '../../components/ui/CategoryPicker';

// ── Categorías de ingreso ────────────────────────────────────────────────────
export const MOCK_CATS_INGRESO: CategoryOption[] = [
  { id: 'ing-1', nombre: 'Salario',  emoji: '💼' },
  { id: 'ing-2', nombre: 'Negocio',  emoji: '🏪' },
  { id: 'ing-3', nombre: 'Otros',    emoji: '💰' },
];

// ── Categorías de egreso ─────────────────────────────────────────────────────
export const MOCK_CATS_EGRESO: CategoryOption[] = [
  { id: 'egr-1', nombre: 'Servicios',         emoji: '🏠' },
  { id: 'egr-2', nombre: 'Gastos necesarios', emoji: '🛒' },
  { id: 'egr-3', nombre: 'Gastos sin culpa',  emoji: '🎉' },
  { id: 'egr-4', nombre: 'Salud',             emoji: '💊' },
  { id: 'egr-5', nombre: 'Emergencia',        emoji: '🚨' },
  { id: 'egr-6', nombre: 'Inversión',         emoji: '📈' },
];

// ── Conceptos de detalle por categoría de egreso ─────────────────────────────
export const MOCK_CONCEPTOS: Record<string, { id: string; nombre: string }[]> = {
  'egr-1': [
    { id: 'c-1-1', nombre: 'Internet' },
    { id: 'c-1-2', nombre: 'Alquiler + gas' },
    { id: 'c-1-3', nombre: 'Teléfono/plan móvil' },
  ],
  'egr-2': [
    { id: 'c-2-1', nombre: 'Desayuno' },
    { id: 'c-2-2', nombre: 'Almuerzo' },
    { id: 'c-2-3', nombre: 'Cena' },
    { id: 'c-2-4', nombre: 'Limpieza depa/ropa' },
    { id: 'c-2-5', nombre: 'Limpieza personal' },
    { id: 'c-2-6', nombre: 'Otros' },
  ],
  'egr-3': [],   // catálogo abierto — el usuario añade los suyos
  'egr-4': [],
  'egr-5': [],
  'egr-6': [],
};
