/**
 * useInversiones — carga activos de inversión desde SQLite.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/database';
import {
  getActivosByEspacio,
  getTotalInvertido,
  insertActivo,
  updateActivoMonto,
  type ActivoLocal,
  type NuevoActivo,
} from '../db/repositories/inversiones';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

export interface UseInversiones {
  activos:        ActivoLocal[];
  totalInvertido: number;
  loading:        boolean;
  agregar:        (data: NuevoActivo) => Promise<void>;
  actualizarMonto:(id: string, monto: number) => Promise<void>;
  refetch:        () => void;
}

export function useInversiones(espacioId = DEFAULT_ESPACIO_ID): UseInversiones {
  const db = useDatabase();
  const [activos, setActivos]               = useState<ActivoLocal[]>([]);
  const [totalInvertido, setTotalInvertido] = useState(0);
  const [loading, setLoading]               = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lista, total] = await Promise.all([
        getActivosByEspacio(db, espacioId),
        getTotalInvertido(db, espacioId),
      ]);
      setActivos(lista);
      setTotalInvertido(total);
    } finally {
      setLoading(false);
    }
  }, [db, espacioId]);

  useEffect(() => { load(); }, [load]);

  const agregar = useCallback(async (data: NuevoActivo) => {
    await insertActivo(db, data);
    await load();
  }, [db, load]);

  const actualizarMonto = useCallback(async (id: string, monto: number) => {
    await updateActivoMonto(db, id, monto);
    await load();
  }, [db, load]);

  return { activos, totalInvertido, loading, agregar, actualizarMonto, refetch: load };
}
