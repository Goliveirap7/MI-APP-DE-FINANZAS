/**
 * Formatea un número como moneda (PEN por defecto).
 * Ej: 1250.5 → "S/ 1,250.50"
 */
export function formatCurrency(
  amount: number,
  currency = 'PEN',
  locale = 'es-PE',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un porcentaje decimal (0–1) como string legible.
 * Ej: 0.35 → "35%"
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Devuelve el nombre del mes en español para un string 'YYYY-MM-01'.
 * Ej: '2026-08-01' → 'Agosto 2026'
 */
export function formatMesLabel(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

/** Primer día del mes actual como 'YYYY-MM-01'. */
export function mesActualISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Añade o resta meses a un string 'YYYY-MM-01'. */
export function desplazarMes(mes: string, delta: number): string {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Clamp: mantiene un número entre min y max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Formatea una fecha YYYY-MM-DD a un texto mediano Ej: 24 Ago 2026 */
export function formatDateMedium(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
}
