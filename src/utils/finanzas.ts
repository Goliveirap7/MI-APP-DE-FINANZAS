/**
 * Cálculos financieros puros (sin side-effects, fáciles de testear).
 * Implementa las reglas de negocio §7 del documento de requisitos.
 */

import type { Transaccion, PresupuestoCategoria, ResumenMensual } from '../constants/types';

/**
 * RN-1: Disponible del mes = saldo_inicial + ingresos_totales_del_mes.
 * (El saldo sobrante del mes anterior ya viene como ingreso de categoría "Otros".)
 */
export function calcularDisponible(
  saldoInicial: number,
  ingresosTotales: number,
): number {
  return saldoInicial + ingresosTotales;
}

/**
 * RN-2: Presupuesto de una categoría = porcentaje × disponible.
 * Los porcentajes deben sumar 1.00 (100%).
 */
export function calcularMontoCategoría(
  porcentajeAsignado: number,
  disponible: number,
): number {
  return porcentajeAsignado * disponible;
}

/**
 * RN-3: Diferencia = presupuesto_categoria − monto_real.
 * Positivo → hay margen; negativo → sobregasto.
 */
export function calcularDiferencia(
  presupuesto: number,
  montoReal: number,
): number {
  return presupuesto - montoReal;
}

/** Valida que los porcentajes asignados a las categorías del mes sumen exactamente 1. */
export function validarPorcentajes(items: Pick<PresupuestoCategoria, 'porcentaje_asignado'>[]): boolean {
  const total = items.reduce((acc, i) => acc + i.porcentaje_asignado, 0);
  // Tolerancia de ±0.001 por redondeo de punto flotante
  return Math.abs(total - 1) < 0.001;
}

/**
 * Filtra transacciones de un mes (año-mes) dado.
 * @param mes  — formato 'YYYY-MM'
 */
export function transaccionesDeMes(
  transacciones: Transaccion[],
  mes: string,
): Transaccion[] {
  return transacciones.filter(
    (t) => !t.eliminado && t.fecha.startsWith(mes),
  );
}

/** Suma de montos de un tipo dado. Devuelve valor absoluto (los egresos ya son positivos). */
export function sumarPorTipo(
  transacciones: Transaccion[],
  tipo: 'ingreso' | 'egreso',
): number {
  return transacciones
    .filter((t) => t.tipo === tipo)
    .reduce((acc, t) => acc + t.monto_real, 0);
}

/**
 * RN-4: Saldo inicial del mes siguiente = Ingresos − Egresos del mes actual.
 * Este valor se traslada automáticamente como ingreso "Otros" del nuevo mes.
 */
export function calcularSaldoSobrante(
  ingresosTotales: number,
  egresosTotales: number,
): number {
  return ingresosTotales - egresosTotales;
}

/** Construye el ResumenMensual a partir de transacciones y saldo inicial. */
export function construirResumenMensual(
  mes: string,
  espacioId: string,
  saldoInicial: number,
  transacciones: Transaccion[],
  presupuestos: PresupuestoCategoria[],
): ResumenMensual {
  const del_mes = transaccionesDeMes(transacciones, mes.slice(0, 7));
  const ingresos = sumarPorTipo(del_mes, 'ingreso');
  const egresos  = sumarPorTipo(del_mes, 'egreso');
  const disponible = calcularDisponible(saldoInicial, ingresos);

  const presupuestoTotal = presupuestos.reduce(
    (acc, p) => acc + calcularMontoCategoría(p.porcentaje_asignado, disponible),
    0,
  );

  return {
    mes,
    espacio_id: espacioId,
    saldo_inicial: saldoInicial,
    ingresos_totales: ingresos,
    egresos_totales: egresos,
    disponible,
    diferencia: presupuestoTotal - egresos,
  };
}
