/**
 * Datos mock para HomeScreen.
 *
 * Simula un mes de agosto 2026 con datos realistas tomados del estilo del Excel.
 * Se elimina cuando se conecte la capa de DB (src/db/) y los hooks reales.
 */
import type { ResumenMensual } from '../../constants/types';
import type { CategoryProgressData } from '../../components/ui/CategoryProgressRow';

export const MOCK_RESUMEN: ResumenMensual = {
  mes:              '2026-08-01',
  espacio_id:       'mock-espacio-1',
  saldo_inicial:    320.00,   // sobrante de julio
  ingresos_totales: 3500.00,  // salario
  egresos_totales:  2180.50,
  disponible:       3820.00,  // saldo_inicial + ingresos_totales
  diferencia:       -40.50,   // ligeramente negativo en este mes
};

export const MOCK_CATEGORIAS: CategoryProgressData[] = [
  { nombre: 'Servicios',        emoji: '🏠', presupuesto: 535.00,  real: 535.00  },
  { nombre: 'Gastos necesarios',emoji: '🛒', presupuesto: 763.00,  real: 820.40  }, // sobrepasado
  { nombre: 'Gastos sin culpa', emoji: '🎉', presupuesto: 382.00,  real: 295.00  },
  { nombre: 'Salud',            emoji: '💊', presupuesto: 191.00,  real: 80.00   },
  { nombre: 'Emergencia',       emoji: '🚨', presupuesto: 191.00,  real: 150.10  },
  { nombre: 'Inversión',        emoji: '📈', presupuesto: 764.00,  real: 300.00  },
];

// Patrimonio calculado: disponible + me_deben - debo + invertido
export const MOCK_PATRIMONIO = {
  disponible:  1639.50,   // disponible - egresos
  me_deben:    450.00,
  debo:        200.00,
  invertido:   1250.00,
  total:       3139.50,   // suma de los tres
};
