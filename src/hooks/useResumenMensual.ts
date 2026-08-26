/**
 * useResumenMensual — calcula el ResumenMensual para un mes dado
 * consultando directamente SQLite.
 *
 * Implementa las reglas de negocio §7:
 *  - Disponible = saldo_inicial + ingresos_totales
 *  - Diferencia  = presupuesto_total - egresos_totales
 *  - Saldo inicial = sobrante del mes anterior (ingresos - egresos del mes previo)
 *
 * Para el MVP, el saldo inicial se calcula recursivamente del mes anterior.
 * Si no hay datos de meses anteriores, saldo_inicial = 0.
 */
import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '../db/database';
import { getSumByTipoMes, getSumByCategoriaMes, getTotalesBilletera, getSaldoHistoricoHasta } from '../db/repositories/transacciones';
import { getTotalesDeuda } from '../db/repositories/deudas';
import { getTotalInvertido } from '../db/repositories/inversiones';
import { DEFAULT_ESPACIO_ID } from '../db/seed';
import type { ResumenMensual } from '../constants/types';

export interface CategoryReal {
  categoria_egreso_id: string;
  total: number;
}

export interface Patrimonio {
  disponible: number;
  disponible_virtual: number;
  disponible_efectivo: number;
  me_deben:   number;
  debo:       number;
  invertido:  number;
  total:      number;
}

export interface UseResumenMensual {
  resumen:      ResumenMensual | null;
  categoriasReal: CategoryReal[];
  patrimonio:   Patrimonio | null;
  loading:      boolean;
  refetch:      () => void;
}

export function useResumenMensual(
  mes: string,
  espacioId = DEFAULT_ESPACIO_ID,
): UseResumenMensual {
  const db = useDatabase();
  const [resumen, setResumen]               = useState<ResumenMensual | null>(null);
  const [categoriasReal, setCategoriasReal] = useState<CategoryReal[]>([]);
  const [patrimonio, setPatrimonio]         = useState<Patrimonio | null>(null);
  const [loading, setLoading]               = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Saldo histórico acumulado hasta antes de este mes
      const saldoInicial = await getSaldoHistoricoHasta(db, mes, espacioId);

      // Mes actual
      const ingresos  = await getSumByTipoMes(db, mes, 'ingreso',  espacioId);
      const egresos   = await getSumByTipoMes(db, mes, 'egreso',   espacioId);
      const catReales = await getSumByCategoriaMes(db, mes, espacioId);

      const disponible = saldoInicial + ingresos;

      setResumen({
        mes,
        espacio_id:       espacioId,
        saldo_inicial:    saldoInicial,
        ingresos_totales: ingresos,
        egresos_totales:  egresos,
        disponible,
        diferencia:       disponible - egresos,
      });

      setCategoriasReal(catReales);

      // Patrimonio
      const { me_deben, debo } = await getTotalesDeuda(db, espacioId);
      const invertido = await getTotalInvertido(db, espacioId);
      const { virtual, efectivo } = await getTotalesBilletera(db, espacioId);

      // El disponible total se puede tomar del cálculo mensual para consistencia del mes,
      // o del cálculo histórico (virtual + efectivo). Usaremos el histórico para las subcuentas
      // y el mensual para el flujo, pero idealmente deberían coincidir si no hay fugas.
      const efectivoDisponible = Math.max(virtual + efectivo, 0);

      setPatrimonio({
        disponible: efectivoDisponible,
        disponible_virtual: virtual,
        disponible_efectivo: efectivo,
        me_deben,
        debo,
        invertido,
        total: efectivoDisponible + me_deben - debo + invertido,
      });
    } catch (e) {
      console.error('[useResumenMensual]', e);
    } finally {
      setLoading(false);
    }
  }, [db, mes, espacioId]);

  useEffect(() => { load(); }, [load]);

  return { resumen, categoriasReal, patrimonio, loading, refetch: load };
}
