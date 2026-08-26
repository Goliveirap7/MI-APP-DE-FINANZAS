/**
 * useDeudas — carga deudas desde SQLite y expone acciones de CRUD.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/database';
import {
  getDeudasByEspacio,
  getTotalesDeuda,
  insertDeuda,
  marcarDeudaPagada,
  type DeudaLocal,
  type NuevaDeuda,
} from '../db/repositories/deudas';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

export type FiltroDeuda = 'todas' | 'pendiente' | 'pagada';

export interface UseDeudas {
  deudas:       DeudaLocal[];
  totales:      { me_deben: number; debo: number };
  loading:      boolean;
  filtro:       FiltroDeuda;
  setFiltro:    (f: FiltroDeuda) => void;
  agregar:      (data: NuevaDeuda) => Promise<void>;
  marcarPagada: (id: string) => Promise<void>;
  refetch:      () => void;
}

export function useDeudas(espacioId = DEFAULT_ESPACIO_ID): UseDeudas {
  const db = useDatabase();
  const [deudas, setDeudas]   = useState<DeudaLocal[]>([]);
  const [totales, setTotales] = useState({ me_deben: 0, debo: 0 });
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState<FiltroDeuda>('pendiente');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const soloPendientes = filtro === 'pendiente';
      const [lista, tots]  = await Promise.all([
        getDeudasByEspacio(db, espacioId, soloPendientes),
        getTotalesDeuda(db, espacioId),
      ]);
      // Filtro "pagada" requiere filtrar del lado JS
      const filtradas = filtro === 'pagada'
        ? lista.filter((d) => d.estado === 'pagada')
        : filtro === 'todas'
        ? lista
        : lista; // soloPendientes ya filtró en SQL
      setDeudas(filtradas);
      setTotales(tots);
    } finally {
      setLoading(false);
    }
  }, [db, espacioId, filtro]);

  useEffect(() => { load(); }, [load]);

  const agregar = useCallback(async (data: NuevaDeuda) => {
    await insertDeuda(db, data);
    await load();
  }, [db, load]);

  const marcarPagada = useCallback(async (id: string) => {
    await marcarDeudaPagada(db, id);
    await load();
  }, [db, load]);

  return { deudas, totales, loading, filtro, setFiltro, agregar, marcarPagada, refetch: load };
}
