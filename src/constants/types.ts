/**
 * Tipos de dominio que espeja el modelo de datos del documento de requisitos §6.
 *
 * Convención:
 *  - Los tipos que terminan en `Local` representan el registro SQLite (offline-first).
 *  - Los tipos que terminan en `Remote` representan la fila de Supabase.
 *  - Los tipos sin sufijo son los que usa la UI (unión de ambos).
 */

// ────────────────────────────────────────────────────────────────────────────
// Sincronización (§6.2)
// ────────────────────────────────────────────────────────────────────────────

export type EstadoSync = 'pendiente' | 'sincronizado' | 'con_error' | 'con_conflicto';

export interface CamposSync {
  id_local: string;           // UUID generado en el dispositivo
  id_remoto: string | null;   // UUID asignado por Supabase (null hasta sincronizar)
  estado_sync: EstadoSync;
  fecha_modificacion: string; // ISO 8601
  eliminado: boolean;         // soft delete
}

// ────────────────────────────────────────────────────────────────────────────
// Espacio y membresía (§6.1)
// ────────────────────────────────────────────────────────────────────────────

export interface Espacio {
  id: string;
  nombre: string;
  codigo_invitacion: string;
  creado_por: string;         // user id
  creado_en: string;
}

export type RolMiembro = 'dueño' | 'miembro';

export interface MiembroEspacio {
  usuario_id: string;
  espacio_id: string;
  rol: RolMiembro;
}

// ────────────────────────────────────────────────────────────────────────────
// Catálogos (§6.1)
// ────────────────────────────────────────────────────────────────────────────

export interface CategoriaIngreso extends CamposSync {
  espacio_id: string;
  nombre: string;
}

export interface CategoriaEgreso extends CamposSync {
  espacio_id: string;
  nombre: string;
}

export interface ConceptoDetalle extends CamposSync {
  categoria_egreso_id: string;
  nombre: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Presupuesto mensual (§6.1)
// ────────────────────────────────────────────────────────────────────────────

export interface PresupuestoCategoria extends CamposSync {
  espacio_id: string;
  mes: string;                // 'YYYY-MM-01'
  categoria_egreso_id: string;
  porcentaje_asignado: number; // 0.00–1.00; la suma de todas debe ser 1
}

// ────────────────────────────────────────────────────────────────────────────
// Transacciones (§6.1)
// ────────────────────────────────────────────────────────────────────────────

export type TipoTransaccion = 'ingreso' | 'egreso';

export interface Transaccion extends CamposSync {
  espacio_id: string;
  fecha: string;               // 'YYYY-MM-DD'
  tipo: TipoTransaccion;
  categoria_ingreso_id: string | null;
  categoria_egreso_id: string | null;
  concepto_detalle_id: string | null;
  monto_real: number;          // negativo = devolución/reembolso
  monto_presupuestado: number | null;
  creado_por: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Resumen mensual — calculado, no persiste (§6.1)
// ────────────────────────────────────────────────────────────────────────────

export interface ResumenMensual {
  mes: string;                 // 'YYYY-MM-01'
  espacio_id: string;
  saldo_inicial: number;
  ingresos_totales: number;
  egresos_totales: number;
  disponible: number;          // = saldo_inicial + ingresos_totales
  diferencia: number;          // = presupuesto_total − egresos_totales
}

// ────────────────────────────────────────────────────────────────────────────
// Deudas (§6.1)
// ────────────────────────────────────────────────────────────────────────────

export type DireccionDeuda = 'me_deben' | 'debo';
export type EstadoDeuda = 'pendiente' | 'pagada';

export interface Deuda extends CamposSync {
  espacio_id: string;
  persona: string;
  monto: number;
  direccion: DireccionDeuda;
  fecha: string;               // 'YYYY-MM-DD'
  estado: EstadoDeuda;
}

// ────────────────────────────────────────────────────────────────────────────
// Inversiones (§6.1)
// ────────────────────────────────────────────────────────────────────────────

export interface ActivoInversion extends CamposSync {
  espacio_id: string;
  nombre: string;
  monto_invertido: number;
}
