/**
 * useCategorias — carga categorías de ingreso/egreso y conceptos de detalle
 * desde SQLite. Se re-ejecuta si cambia el espacioId.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/database';
import {
  getCatIngresoByEspacio,
  getCatEgresoByEspacio,
  getConceptosByCategoria,
  type CatIngreso,
  type CatEgreso,
  type ConceptoDetalle,
} from '../db/repositories/categorias';
import { DEFAULT_ESPACIO_ID } from '../db/seed';

export interface UseCategorias {
  catIngreso:  CatIngreso[];
  catEgreso:   CatEgreso[];
  conceptosPor: (catId: string) => Promise<ConceptoDetalle[]>;
  loading:     boolean;
  refetch:     () => void;
}

export function useCategorias(espacioId = DEFAULT_ESPACIO_ID): UseCategorias {
  const db = useDatabase();
  const [catIngreso, setCatIngreso]   = useState<CatIngreso[]>([]);
  const [catEgreso, setCatEgreso]     = useState<CatEgreso[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ing, egr] = await Promise.all([
        getCatIngresoByEspacio(db, espacioId),
        getCatEgresoByEspacio(db, espacioId),
      ]);
      setCatIngreso(ing);
      setCatEgreso(egr);
    } finally {
      setLoading(false);
    }
  }, [db, espacioId]);

  useEffect(() => { load(); }, [load]);

  const conceptosPor = useCallback(
    (catId: string) => getConceptosByCategoria(db, catId),
    [db],
  );

  return { catIngreso, catEgreso, conceptosPor, loading, refetch: load };
}
