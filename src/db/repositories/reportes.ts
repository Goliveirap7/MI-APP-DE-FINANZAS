/**
 * reportes.ts — Repositorio para consultas analíticas y reportes (RF-08).
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_ESPACIO_ID } from '../seed';

export interface MesReporte {
  mes: string; // 'YYYY-MM'
  ingresos: number;
  egresos: number;
}

/**
 * Obtiene el total de ingresos y egresos agrupados por mes para un año dado.
 * @param year Año en formato 'YYYY'
 */
export async function getResumenAnual(
  db: SQLiteDatabase,
  year: string,
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<MesReporte[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${parseInt(year) + 1}-01-01`;

  const rows = await db.getAllAsync<{ mes: string; tipo: string; total: number }>(
    `SELECT 
       strftime('%Y-%m', fecha) as mes,
       tipo,
       COALESCE(SUM(monto_real), 0) as total
     FROM transacciones
     WHERE espacio_id = ? 
       AND fecha >= ? 
       AND fecha < ? 
       AND eliminado = 0
     GROUP BY mes, tipo
     ORDER BY mes ASC`,
    [espacioId, startDate, endDate],
  );

  // Transformar de formato tabular a formato por mes
  const map = new Map<string, MesReporte>();
  
  // Inicializar todos los meses del año en 0
  for (let i = 1; i <= 12; i++) {
    const m = `${year}-${String(i).padStart(2, '0')}`;
    map.set(m, { mes: m, ingresos: 0, egresos: 0 });
  }

  for (const row of rows) {
    const entry = map.get(row.mes);
    if (entry) {
      if (row.tipo === 'ingreso') entry.ingresos = row.total;
      if (row.tipo === 'egreso') entry.egresos = row.total;
    }
  }

  return Array.from(map.values());
}
