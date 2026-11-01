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

export interface DiaReporte {
  dia: number; // 1..31
  fecha: string; // 'YYYY-MM-DD'
  ingresos: number;
  egresos: number;
}

/**
 * Obtiene el total de ingresos y egresos agrupados por mes para un año dado,
 * excluyendo transferencias internas y reconciliaciones de saldo.
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
       AND (categoria_egreso_id IS NULL OR categoria_egreso_id NOT IN (
         SELECT id_local FROM categorias_egreso WHERE LOWER(TRIM(nombre)) = 'transferencias'
       ))
       AND (categoria_ingreso_id IS NULL OR categoria_ingreso_id NOT IN (
         SELECT id_local FROM categorias_ingreso WHERE LOWER(TRIM(nombre)) = 'transferencias'
       ))
       AND (nota IS NULL OR (nota NOT LIKE '%Reconciliación%' AND nota NOT LIKE '%Corrección de saldo%'))
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

/**
 * Obtiene el detalle día por día de ingresos y egresos para un mes dado ('YYYY-MM'),
 * excluyendo transferencias internas y reconciliaciones de saldo.
 */
export async function getDetalleDiarioMes(
  db: SQLiteDatabase,
  mes: string, // 'YYYY-MM'
  espacioId = DEFAULT_ESPACIO_ID,
): Promise<{ dias: DiaReporte[]; totalIngresos: number; totalEgresos: number }> {
  const [yearStr, monthStr] = mes.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startDate = `${mes}-01`;
  const nextMonthDate = new Date(year, month, 1);
  const endDate = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

  // Cantidad de días en este mes
  const daysInMonth = new Date(year, month, 0).getDate();

  const rows = await db.getAllAsync<{ fecha: string; tipo: string; total: number }>(
    `SELECT 
       fecha,
       tipo,
       COALESCE(SUM(monto_real), 0) as total
     FROM transacciones
     WHERE espacio_id = ? 
       AND fecha >= ? 
       AND fecha < ? 
       AND eliminado = 0
       AND (categoria_egreso_id IS NULL OR categoria_egreso_id NOT IN (
         SELECT id_local FROM categorias_egreso WHERE LOWER(TRIM(nombre)) = 'transferencias'
       ))
       AND (categoria_ingreso_id IS NULL OR categoria_ingreso_id NOT IN (
         SELECT id_local FROM categorias_ingreso WHERE LOWER(TRIM(nombre)) = 'transferencias'
       ))
       AND (nota IS NULL OR (nota NOT LIKE '%Reconciliación%' AND nota NOT LIKE '%Corrección de saldo%'))
     GROUP BY fecha, tipo
     ORDER BY fecha ASC`,
    [espacioId, startDate, endDate],
  );

  const diasMap = new Map<number, DiaReporte>();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    diasMap.set(d, {
      dia: d,
      fecha: `${mes}-${dayStr}`,
      ingresos: 0,
      egresos: 0,
    });
  }

  let totalIngresos = 0;
  let totalEgresos = 0;

  for (const row of rows) {
    const dayNum = parseInt(row.fecha.split('-')[2], 10);
    const entry = diasMap.get(dayNum);
    if (entry) {
      if (row.tipo === 'ingreso') {
        entry.ingresos = row.total;
        totalIngresos += row.total;
      }
      if (row.tipo === 'egreso') {
        entry.egresos = row.total;
        totalEgresos += row.total;
      }
    }
  }

  return {
    dias: Array.from(diasMap.values()),
    totalIngresos,
    totalEgresos,
  };
}
