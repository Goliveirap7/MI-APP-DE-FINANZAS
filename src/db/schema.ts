/**
 * schema.ts — Definición de tablas SQLite locales.
 *
 * Espeja el modelo de Supabase (§17) más los campos de sincronización
 * offline-first (§6.2 y §18.1):
 *   id_local, id_remoto, estado_sync, fecha_modificacion, eliminado
 *
 * Convención: todas las fechas se guardan como TEXT en formato ISO 8601.
 */

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Espacios de presupuesto ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS espacios (
  id_local          TEXT PRIMARY KEY,
  id_remoto         TEXT,
  nombre            TEXT NOT NULL,
  codigo_invitacion TEXT NOT NULL,
  creado_por        TEXT,
  creado_en         TEXT NOT NULL,
  estado_sync       TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion TEXT NOT NULL,
  eliminado         INTEGER NOT NULL DEFAULT 0
);

-- ── Categorías de ingreso ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias_ingreso (
  id_local          TEXT PRIMARY KEY,
  id_remoto         TEXT,
  espacio_id        TEXT NOT NULL REFERENCES espacios(id_local) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  estado_sync       TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion TEXT NOT NULL,
  eliminado         INTEGER NOT NULL DEFAULT 0
);

-- ── Categorías de egreso ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias_egreso (
  id_local          TEXT PRIMARY KEY,
  id_remoto         TEXT,
  espacio_id        TEXT NOT NULL REFERENCES espacios(id_local) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  estado_sync       TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion TEXT NOT NULL,
  eliminado         INTEGER NOT NULL DEFAULT 0
);

-- ── Conceptos de detalle ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conceptos_detalle (
  id_local              TEXT PRIMARY KEY,
  id_remoto             TEXT,
  categoria_egreso_id   TEXT NOT NULL REFERENCES categorias_egreso(id_local) ON DELETE CASCADE,
  nombre                TEXT NOT NULL,
  estado_sync           TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion    TEXT NOT NULL,
  eliminado             INTEGER NOT NULL DEFAULT 0
);

-- ── Presupuesto mensual por categoría ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS presupuesto_categoria (
  id_local              TEXT PRIMARY KEY,
  id_remoto             TEXT,
  espacio_id            TEXT NOT NULL REFERENCES espacios(id_local) ON DELETE CASCADE,
  mes                   TEXT NOT NULL,   -- 'YYYY-MM-01'
  categoria_egreso_id   TEXT NOT NULL REFERENCES categorias_egreso(id_local),
  porcentaje_asignado   REAL NOT NULL,   -- 0.00–1.00 (opcional visualmente si se basa en monto)
  monto_asignado        REAL NOT NULL DEFAULT 0,
  estado_sync           TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion    TEXT NOT NULL,
  eliminado             INTEGER NOT NULL DEFAULT 0,
  UNIQUE (espacio_id, mes, categoria_egreso_id)
);

-- ── Transacciones ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transacciones (
  id_local              TEXT PRIMARY KEY,
  id_remoto             TEXT,
  espacio_id            TEXT NOT NULL REFERENCES espacios(id_local) ON DELETE CASCADE,
  fecha                 TEXT NOT NULL,   -- 'YYYY-MM-DD'
  tipo                  TEXT NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  categoria_ingreso_id  TEXT REFERENCES categorias_ingreso(id_local),
  categoria_egreso_id   TEXT REFERENCES categorias_egreso(id_local),
  concepto_detalle_id   TEXT REFERENCES conceptos_detalle(id_local),
  monto_real            REAL NOT NULL,
  monto_presupuestado   REAL,
  creado_por            TEXT,
  nota                  TEXT,
  foto_uri              TEXT,
  metodo_pago           TEXT NOT NULL DEFAULT 'virtual',
  estado_sync           TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion    TEXT NOT NULL,
  eliminado             INTEGER NOT NULL DEFAULT 0
);

-- ── Deudas con terceros ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deudas (
  id_local          TEXT PRIMARY KEY,
  id_remoto         TEXT,
  espacio_id        TEXT NOT NULL REFERENCES espacios(id_local) ON DELETE CASCADE,
  persona           TEXT NOT NULL,
  monto             REAL NOT NULL,
  direccion         TEXT NOT NULL CHECK (direccion IN ('me_deben','debo')),
  fecha             TEXT NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'pendiente',
  nota              TEXT,
  estado_sync       TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion TEXT NOT NULL,
  eliminado         INTEGER NOT NULL DEFAULT 0
);

-- ── Activos de inversión ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activos_inversion (
  id_local          TEXT PRIMARY KEY,
  id_remoto         TEXT,
  espacio_id        TEXT NOT NULL REFERENCES espacios(id_local) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  monto_invertido   REAL NOT NULL,
  nota              TEXT,
  estado_sync       TEXT NOT NULL DEFAULT 'pendiente',
  fecha_modificacion TEXT NOT NULL,
  eliminado         INTEGER NOT NULL DEFAULT 0
);

-- ── Cola de sincronización ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id                TEXT PRIMARY KEY,
  tabla             TEXT NOT NULL,
  id_local          TEXT NOT NULL,
  tipo_operacion    TEXT NOT NULL CHECK (tipo_operacion IN ('crear','editar','eliminar')),
  datos             TEXT NOT NULL,   -- JSON
  intentos          INTEGER NOT NULL DEFAULT 0,
  creado_en         TEXT NOT NULL
);

-- ── Índices de rendimiento ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tx_espacio_fecha   ON transacciones (espacio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_tx_eliminado        ON transacciones (eliminado);
CREATE INDEX IF NOT EXISTS idx_deudas_estado       ON deudas (espacio_id, estado);
CREATE INDEX IF NOT EXISTS idx_presup_espacio_mes  ON presupuesto_categoria (espacio_id, mes);
CREATE INDEX IF NOT EXISTS idx_sync_queue_creado   ON sync_queue (creado_en);
`;
