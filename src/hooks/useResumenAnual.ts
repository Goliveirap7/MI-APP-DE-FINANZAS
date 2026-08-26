/**
 * useResumenAnual — carga los agregados mensuales de un año desde SQLite.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/database';
import { getResumenAnual, type MesReporte } from '../db/repositories/reportes';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

export interface UseResumenAnual {
  meses:        MesReporte[];
  totalIngresos: number;
  totalEgresos:  number;
  balance:      number;
  loading:      boolean;
  refetch:      () => void;
}

export function useResumenAnual(
  year: string,
  espacioId = DEFAULT_ESPACIO_ID,
): UseResumenAnual {
  const db = useDatabase();
  const [meses, setMeses]                 = useState<MesReporte[]>([]);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalEgresos, setTotalEgresos]   = useState(0);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getResumenAnual(db, year, espacioId);
      setMeses(data);
      
      const ingresos = data.reduce((acc, m) => acc + m.ingresos, 0);
      const egresos  = data.reduce((acc, m) => acc + m.egresos, 0);
      
      setTotalIngresos(ingresos);
      setTotalEgresos(egresos);
    } finally {
      setLoading(false);
    }
  }, [db, year, espacioId]);

  useEffect(() => { load(); }, [load]);

  return { 
    meses, 
    totalIngresos, 
    totalEgresos, 
    balance: totalIngresos - totalEgresos,
    loading, 
    refetch: load 
  };
}
