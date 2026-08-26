# Extracción de Requisitos y Alcance
## App móvil de control de presupuesto personal (basada en CONTROL_PRESUPUESTO_2026.xlsx)

**Estado del documento:** versión final de la etapa de análisis (requisitos + alcance + modelado de datos),
lista para entregar a Antigravity como punto de partida del desarrollo. No incluye decisiones de
programación (lenguaje, framework, estructura de carpetas, etc.) — eso queda a criterio de la etapa de
implementación.

---

## 1. Resumen ejecutivo

El Excel actual es un sistema de control de presupuesto personal mensual/anual: ingresos y egresos por
categoría, presupuesto vs. gasto real, saldo total, deudas informales con terceros e inversiones. La app
mantiene esa misma lógica central — **saber en todo momento cuánto dinero hay y dónde está** (disponible,
prestado a terceros, invertido) — pero resuelve los problemas estructurales del Excel (fórmulas rotas,
catálogos inconsistentes) con un modelo de datos propio, pensado desde el inicio para:

- Uso individual al inicio, con posibilidad de compartirse con otras personas más adelante.
- Backend en Supabase (base de datos relacional/SQL, no NoSQL — ver sección 12).
- Autenticación sin depender de cuentas de Gmail.
- Funcionamiento offline-first: se guarda localmente primero y se sincroniza cuando hay internet.

---

## 2. Contexto: qué hace hoy el Excel

8 hojas: `ANUAL` (objetivos, % de presupuesto, resumen consolidado, tabla de inversiones), `ENERO`–`JUNIO`
(una hoja por mes con saldo, presupuesto vs. real, registro cronológico de movimientos) y `Listas Validadas`
(catálogos para listas desplegables).

**Hallazgo clave:** varias hojas tienen fórmulas rotas (`#REF!`, `#VALUE!`) por filas insertadas/eliminadas
con el tiempo, y catálogos de nombres inconsistentes entre hojas (detalle en sección 11). La app elimina
este riesgo de raíz al usar catálogos e identificadores únicos en vez de texto libre y posiciones de fila.

**Aclaración sobre las tablas "SALDO REAL" por banco (Alfin, Yape, Agora, Interbank, Scotiabank, Efectivo):**
confirmado con el usuario — son solo para control interno personal dentro del Excel y **no se modelan como
funcionalidad de la app**. La app trabaja con el saldo total disponible, sin necesidad de desglosarlo por
banco o billetera individual.

---

## 3. Objetivo del proyecto

Reemplazar el Excel por una app móvil que permita registrar ingresos/egresos, definir presupuesto por
categoría, ver el estado del mes y del año, y llevar deudas con terceros e inversiones — de forma más
simple, rápida y sin errores de fórmulas — con la posibilidad de compartirla más adelante con otras personas.

---

## 4. Alcance

### 4.1 Dentro del alcance — MVP

1. Registro de transacciones (ingresos y egresos) con fecha, categoría, concepto/detalle y monto.
2. Categorías de ingreso y egreso configurables (Salario, Negocio, Otros / Servicios, Gastos necesarios,
   Gastos sin culpa, Salud, Emergencia, Inversión).
3. Presupuesto mensual por categoría, definido como % del ingreso disponible (el % puede variar cada mes).
4. Comparación presupuesto vs. monto real por categoría y por mes, con la diferencia calculada.
5. Resumen mensual: saldo inicial, ingresos totales, egresos totales, disponible, diferencia global.
6. Resumen anual consolidado por categoría y por mes.
7. Traspaso automático del saldo sobrante de un mes al siguiente (sin intervención manual).
8. Registro de deudas/préstamos con terceros ("me deben" / "debo"): persona, monto, fecha, estado.
9. Registro de inversiones (activos como BTC, acciones, etc.) y su monto invertido.
10. Guardado local con sincronización a Supabase cuando haya internet (offline-first, ver sección 13).
11. Autenticación sin Gmail (email/contraseña o enlace mágico) y modelo de datos preparado para compartir
    un "espacio" de presupuesto con otras personas mediante invitación (ver sección 12).

### 4.2 Fuera del alcance del MVP — Fase 2 / mejoras futuras

1. Objetivos/metas personales con seguimiento de avance.
2. Notificaciones/recordatorios de pagos recurrentes (alquiler, internet, servicios).
3. Gráficos avanzados de tendencia.
4. Exportar reportes (PDF/Excel) o backup/restauración manual de datos.
5. Reconocimiento de recibos por foto (OCR).
6. Valorización automática de inversiones (cotización en tiempo real vía API de precios).

### 4.3 Explícitamente fuera de alcance (no se va a construir)

- Desglose de saldo por banco/billetera individual (Alfin, Yape, Agora, Interbank, Scotiabank, Efectivo) —
  confirmado que es solo control interno del usuario en el Excel, no una necesidad de la app.

---

## 5. Actores

| Actor | Descripción |
|---|---|
| Usuario | Persona que registra sus movimientos financieros y consulta sus resúmenes. Puede pertenecer a uno o más espacios de presupuesto. |

---

## 6. Modelo de datos

### 6.1 Diccionario de entidades y atributos

**Usuario**
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | Generado por Supabase Auth |
| nombre | texto | Nombre del usuario |
| email | texto | Usado para autenticación (no necesariamente Gmail) |

**Espacio** (grupo de presupuesto — propio o compartido)
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| nombre | texto | Ej. "Mi presupuesto", "Presupuesto familiar" |
| usuario_creador | referencia a Usuario | Quien lo creó |
| código_invitación | texto | Código para que otros usuarios se unan sin OAuth de terceros |

**MiembroEspacio** (relación usuario ↔ espacio)
| Campo | Tipo | Descripción |
|---|---|---|
| usuario | referencia a Usuario | |
| espacio | referencia a Espacio | |
| rol | texto | Ej. "dueño", "miembro" |

**CategoríaIngreso**
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| espacio | referencia a Espacio | |
| nombre | texto | Salario, Negocio, Otros (catálogo editable) |

**CategoríaEgreso**
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| espacio | referencia a Espacio | |
| nombre | texto | Servicios, Gastos necesarios, Gastos sin culpa, Salud, Emergencia, Inversión |

**PresupuestoCategoria**
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| mes | fecha (año-mes) | |
| categoría_egreso | referencia a CategoríaEgreso | |
| porcentaje_asignado | decimal | Debe sumar 100% entre todas las categorías del mes |
| monto_presupuesto | decimal (calculado) | = porcentaje_asignado × disponible del mes |

**Transacción**
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| espacio | referencia a Espacio | |
| fecha | fecha | |
| tipo | texto | "ingreso" o "egreso" |
| categoría | referencia a CategoríaIngreso o CategoríaEgreso | |
| concepto | texto | Detalle libre (ej. "Almuerzo", "Pago Internet") |
| monto_presupuestado | decimal (opcional) | Presupuesto del concepto de detalle, si aplica |
| monto_real | decimal | Monto efectivamente movido; negativo = devolución/reembolso |

**ResumenMensual** (calculado, no se captura a mano)
| Campo | Tipo | Descripción |
|---|---|---|
| mes | fecha (año-mes) | |
| espacio | referencia a Espacio | |
| saldo_inicial | decimal | Sobrante del mes anterior |
| ingresos_totales | decimal | |
| egresos_totales | decimal | |
| disponible | decimal | |
| diferencia | decimal | Presupuesto − real |

**Deuda**
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| espacio | referencia a Espacio | |
| persona | texto | Con quién es la deuda |
| monto | decimal | |
| dirección | texto | "me deben" o "debo" |
| fecha | fecha | |
| estado | texto | Ej. "pendiente", "pagada" |

**ActivoInversión**
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| espacio | referencia a Espacio | |
| nombre | texto | Ej. BTC, SPYG, Factoring |
| monto_invertido | decimal | Registrado manualmente (sin cotización automática en el MVP) |

**Objetivo** (Fase 2)
| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| espacio | referencia a Espacio | |
| descripción | texto | |
| estado | texto | Pendiente / logrado |

### 6.2 Campos técnicos de sincronización (offline-first)

Se agregan a **Transacción, Deuda, ActivoInversión, PresupuestoCategoria, CategoríaIngreso, CategoríaEgreso**
— cualquier entidad que el usuario cree o edite desde el teléfono:

| Campo | Para qué sirve |
|---|---|
| id_local | Identificador generado en el teléfono, sin depender de internet |
| id_remoto | Id asignado por Supabase una vez sincronizado (vacío mientras no hay conexión) |
| estado_sincronización | pendiente / sincronizado / con_error |
| fecha_modificación | Para resolver conflictos si el mismo dato se edita en dos dispositivos |

### 6.3 Relaciones

- Un **Usuario** pertenece a uno o más **Espacio** a través de **MiembroEspacio**.
- Un **Espacio** agrupa sus propias **CategoríaIngreso**, **CategoríaEgreso**, **Transacción**, **Deuda** y
  **ActivoInversión** — así, si comparte el espacio con alguien, ambos ven los mismos datos.
- Una **CategoríaIngreso** o **CategoríaEgreso** tiene muchas **Transacciones**.
- Una **CategoríaEgreso** tiene un **PresupuestoCategoria** por cada mes.
- Un **Mes** agrupa muchas **Transacciones** y produce un **ResumenMensual** calculado.
- El **ResumenMensual** de un mes alimenta el saldo inicial del **ResumenMensual** del mes siguiente.

*(Ver diagrama entidad-relación en la respuesta del chat.)*

---

## 7. Reglas de negocio

1. **Disponible del mes** = Ingresos totales reales del mes (incluye el saldo sobrante del mes anterior
   como ingreso de categoría "Otros").
2. **Presupuesto por categoría** = % asignado a esa categoría × Disponible del mes. Los % de las 6
   categorías de egreso deben sumar 100% — la app debe validar esto al configurarlos.
3. **Diferencia** = Presupuesto − Monto real, a nivel de ingresos, egresos y por categoría.
4. **Saldo inicial del mes siguiente** = sobrante del mes actual (Ingresos − Egresos), se traslada
   automáticamente como ingreso de la categoría "Otros" del mes nuevo.
5. **Montos negativos** representan devoluciones/reembolsos y deben restar del total de la categoría, no
   sumar como gasto nuevo.
6. Cada categoría de egreso principal puede tener conceptos de detalle (ej. dentro de "Gastos necesarios":
   Desayuno, Almuerzo, Cena, Limpieza…), cada uno con presupuesto y monto real opcional.
7. Los catálogos de categorías (antes en `Listas Validadas`) son editables por el usuario, no fijos en el
   código.
8. Una **Deuda** con dirección "me deben" suma al patrimonio total del usuario; una con dirección "debo"
   resta — aunque el dinero no esté físicamente disponible.
9. El monto de un **ActivoInversión** se registra y actualiza manualmente; no se recalcula solo.

---

## 8. Requisitos funcionales (RF)

**Módulo: Transacciones**
- RF-01 Registrar una transacción (tipo, fecha, categoría, concepto, monto) en pocos pasos (ideal: 2-3 toques).
- RF-02 Editar y eliminar transacciones ya registradas.
- RF-03 Listar transacciones del mes, filtrables por categoría o tipo.

**Módulo: Presupuesto**
- RF-04 Definir el % de asignación de cada categoría de egreso para un mes, con validación de que sumen 100%.
- RF-05 Calcular automáticamente el presupuesto en monto de cada categoría según el disponible del mes.
- RF-06 Mostrar presupuesto vs. monto real vs. diferencia por categoría, con indicador visual de sobregasto.

**Módulo: Resúmenes**
- RF-07 Mostrar resumen del mes actual (saldo, ingresos, egresos, disponible, diferencia global).
- RF-08 Mostrar resumen anual consolidado (ingresos y egresos por categoría, mes a mes).
- RF-09 Trasladar automáticamente el saldo sobrante al mes siguiente.

**Módulo: Deudas**
- RF-10 Registrar una deuda (persona, monto, dirección, fecha, estado).
- RF-11 Editar el estado de una deuda (ej. marcarla como pagada).
- RF-12 Ver el total de dinero prestado vs. debido, como parte del patrimonio total.

**Módulo: Inversiones**
- RF-13 Registrar un activo de inversión (nombre, monto invertido).
- RF-14 Editar/actualizar manualmente el monto de un activo.
- RF-15 Ver el total invertido como parte del patrimonio total.

**Módulo: Categorías y catálogos**
- RF-16 Administrar (crear/editar/desactivar) categorías de ingreso, egreso y conceptos de detalle.

**Módulo: Cuenta y espacios compartidos**
- RF-17 Registrar e iniciar sesión sin necesidad de una cuenta de Gmail (email/contraseña o enlace mágico).
- RF-18 Crear un espacio de presupuesto e invitar a otras personas mediante un código/enlace.
- RF-19 Los datos de un espacio compartido (transacciones, presupuesto, deudas, inversiones) son visibles
  para todos sus miembros.

**Módulo: Sincronización**
- RF-20 Registrar y editar datos sin conexión a internet.
- RF-21 Sincronizar automáticamente los cambios pendientes cuando se detecta conexión.
- RF-22 Indicar visualmente qué datos están pendientes de sincronizar.

**Fase 2**
- RF-23 Registrar y hacer seguimiento de objetivos personales con estado.
- RF-24 Recordatorios configurables para pagos recurrentes.

---

## 9. Requisitos no funcionales (RNF)

- **RNF-01 Usabilidad:** registrar un gasto debe tomar segundos — es el uso más frecuente de la app.
- **RNF-02 Confiabilidad de cálculos:** todos los totales, porcentajes y diferencias se calculan en la
  lógica de la app, nunca dependen de que el usuario "arregle una fórmula".
- **RNF-03 Disponibilidad offline:** la app debe funcionar sin conexión a internet, guardando localmente y
  sincronizando después (ver sección 13).
- **RNF-04 Privacidad:** información financiera personal — considerar bloqueo de acceso (PIN/huella).
- **RNF-05 Rendimiento:** respuesta fluida incluso con varios años de historial acumulado.
- **RNF-06 Consistencia de datos compartidos:** cuando un espacio tiene más de un miembro, los cambios de
  uno deben reflejarse para el otro sin duplicar ni perder información al sincronizar.

---

## 10. Historias de usuario priorizadas

1. Como usuario, quiero registrar un gasto en segundos indicando categoría, concepto y monto.
2. Como usuario, quiero ver cuánto me queda disponible en cada categoría del mes.
3. Como usuario, quiero ver el resumen del mes apenas abro la app.
4. Como usuario, quiero que el saldo sobrante de un mes pase automáticamente al siguiente.
5. Como usuario, quiero ver cuánto me deben y cuánto debo, y que cuente como parte de mi dinero total.
6. Como usuario, quiero ver cuánto tengo invertido, junto con el resto de mi presupuesto.
7. Como usuario, quiero registrar y consultar mis datos aunque no tenga internet en ese momento.
8. Como usuario, quiero poder invitar a alguien a mi espacio de presupuesto sin que tenga que usar Gmail.
9. Como usuario, quiero ver un resumen anual para saber cómo voy respecto a mis presupuestos por categoría.
10. Como usuario, quiero poder ajustar el % de cada categoría cada mes, porque en la práctica varía.

---

## 11. Inconsistencias detectadas en el Excel (para catálogo limpio, no para corregir el Excel)

**1. Etiquetas de categoría abreviadas y en mayúsculas, solo en la hoja `ANUAL`** (filas 30-35, usadas en
gráficos), distintas a como se llaman en las hojas mensuales:

| En `ANUAL` (abreviado) | Nombre real (usar este en la app) |
|---|---|
| SERVICIOS | Servicios |
| GASTOS NECES | Gastos necesarios |
| GASTOS SIN C | Gastos sin culpa |
| SALUD | Salud |
| EMERGENCIA | Emergencia |
| INVERSION | Inversión |

**2. Estructura desalineada entre `ENERO` y el resto de meses.** En `ENERO`, la fila 10 tiene directamente
"Categoria / Presupuesto / Monto Actual"; en `FEBRERO`–`JUNIO`, esa fila dice "Resumen Ingresos / Resumen
Egresos" y el encabezado baja a la fila 11. Es la causa más probable de los `#REF!` en `ANUAL`: una fórmula
que apunta a "la fila 15 de cada mes" deja de tener sentido si esa fila significa algo distinto en cada hoja.

**Catálogo oficial de categorías a usar en la app** (nombre único, sin abreviar):

- Ingreso: Salario, Negocio, Otros
- Egreso: Servicios, Gastos necesarios, Gastos sin culpa, Salud, Emergencia, Inversión

En la app esto no puede volver a pasar porque cada categoría es un registro único con id, no texto libre
repetido en cada hoja.

---

## 12. Autenticación y espacios compartidos sin Gmail

Supabase **no es NoSQL — es SQL/relacional** (PostgreSQL, con autenticación, almacenamiento y tiempo real
encima). El modelo de entidades de la sección 6 se traduce casi directo a tablas de Supabase.

Opciones de autenticación sin depender de Gmail (Supabase Auth):

- **Email + contraseña propios de la app** — cualquier correo, no necesariamente Gmail.
- **Enlace mágico (magic link)** — solo el correo, sin contraseña que recordar.
- **Código de invitación a un Espacio** — el dueño genera un código/enlace; la otra persona se registra
  (email+contraseña o magic link) y lo usa para unirse. Esto es lo que modelan `Espacio` y `MiembroEspacio`.

---

## 13. Arquitectura de datos: guardado local + sincronización (offline-first)

Patrón usado por apps como ColorNote:

1. El usuario registra un dato → se guarda de inmediato en el almacenamiento local del teléfono, sin
   esperar a Supabase. La app se siente instantánea, haya o no internet.
2. La app mantiene una cola de pendientes por subir (todo en estado `pendiente`, ver campos técnicos en 6.2).
3. Al detectar conexión, sube la cola a Supabase en segundo plano.
4. **Conflictos de sincronización: decisión confirmada — la app NO decide sola.** Si dos dispositivos
   editaron el mismo registro estando ambos offline, al reconectar la app detecta la diferencia (comparando
   `fecha_modificación`) y muestra una pantalla de resolución con ambas versiones lado a lado ("esto se
   editó en otro dispositivo mientras estabas sin conexión") para que el usuario elija cuál conservar. El
   registro queda en estado `con_conflicto` hasta que el usuario decide — nunca se sobrescribe en silencio.
   Esto aplica sobre todo en espacios compartidos, donde dos personas pueden editar al mismo tiempo.

Este requisito se incluye desde el modelo inicial (no como mejora posterior) porque agregarlo después
obligaría a rediseñar cada tabla para sumarle estos campos.

---

## 14. Decisiones confirmadas (antes preguntas abiertas)

1. **Conceptos de detalle por categoría** (Desayuno, Almuerzo, Limpieza, etc.): van como **catálogo fijo**,
   no texto libre. Se agrega la entidad `ConceptoDetalle` al modelo (ver sección 6.1) — cada categoría de
   egreso tiene su propia lista de conceptos predefinidos, administrable desde RF-16.
2. **Conflictos de sincronización:** resuelto en la sección 13, punto 4 — la app siempre avisa al usuario
   en vez de decidir sola.

### ConceptoDetalle (catálogo fijo, agregado al modelo de datos)

| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| categoría_egreso | referencia a CategoríaEgreso | A qué categoría principal pertenece |
| nombre | texto | Ej. "Desayuno", "Almuerzo", "Limpieza personal" |

El campo `concepto` de **Transacción** (sección 6.1) pasa a ser una referencia a `ConceptoDetalle` en vez de
texto libre, cuando el tipo es "egreso". Catálogo inicial sugerido, tomado de tu Excel:

- **Servicios:** Internet, Alquiler + gas, Teléfono/plan móvil
- **Gastos necesarios:** Desayuno, Almuerzo, Cena, Limpieza depa/ropa, Limpieza personal, Otros
- **Gastos sin culpa:** (queda como catálogo abierto a definir tú, ya que en el Excel varía mucho mes a mes)
- **Salud, Emergencia, Inversión:** sin conceptos de detalle fijos por ahora — se registran directo a nivel
  de categoría, igual que hoy

---

## 15. Stack tecnológico sugerido

- **App móvil:** React Native + Expo. Un solo código para iOS y Android, buena integración con Supabase
  (`@supabase/supabase-js`) y curva de entrada baja para empezar rápido con Antigravity.
  - Comando de desarrollo: `npx expo start` (no `npm run dev`, que es propio de proyectos web).
  - Almacenamiento local: `expo-sqlite` (base de datos SQLite embebida en el teléfono).
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security), ya con cuenta creada.

---

## 16. Wireframes de las pantallas principales

Basado en los requisitos funcionales de la sección 8, las pantallas núcleo del MVP son:

1. **Inicio / Resumen del mes** — saldo, ingresos, egresos, disponible y estado del presupuesto por
   categoría de un vistazo (RF-07).
2. **Registrar transacción** — formulario rápido: tipo, categoría, concepto (catálogo fijo), monto, fecha
   (RF-01).
3. **Presupuesto del mes** — % asignado, presupuesto vs. real y diferencia por categoría (RF-04 a RF-06).
4. **Deudas** — lista de "me deben" / "debo", con estado (RF-10 a RF-12).
5. **Inversiones** — lista de activos y monto invertido (RF-13 a RF-15).
6. **Resumen anual** — consolidado por categoría y por mes (RF-08).
7. **Unirse/crear espacio** — login sin Gmail + código de invitación (RF-17 a RF-19).

A continuación, wireframes de las dos pantallas de uso más frecuente (Inicio y Registrar transacción) —
el resto sigue el mismo lenguaje visual y se puede maquetar en el mismo estilo durante el diseño detallado.

*(Los wireframes visuales de "Inicio" y "Registrar transacción" se muestran en la respuesta del chat.)*

---

## 17. Esquema técnico de tablas en Supabase

Definición de tablas (PostgreSQL), lista para crear directamente en el editor SQL de Supabase. Usa `auth.users`
(ya provisto por Supabase Auth) para identificar usuarios — así RF-17 (login sin Gmail) queda cubierto por
Supabase Auth configurado con email/contraseña o magic link, sin tocar estas tablas.

```sql
-- Espacios de presupuesto (propio o compartido) y membresía
create table espacios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo_invitacion text unique not null,
  creado_por uuid references auth.users(id),
  creado_en timestamptz default now()
);

create table miembros_espacio (
  usuario_id uuid references auth.users(id),
  espacio_id uuid references espacios(id) on delete cascade,
  rol text not null default 'miembro',
  primary key (usuario_id, espacio_id)
);

-- Catálogos
create table categorias_ingreso (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references espacios(id) on delete cascade,
  nombre text not null
);

create table categorias_egreso (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references espacios(id) on delete cascade,
  nombre text not null
);

create table conceptos_detalle (
  id uuid primary key default gen_random_uuid(),
  categoria_egreso_id uuid references categorias_egreso(id) on delete cascade,
  nombre text not null
);

-- Presupuesto mensual por categoría
create table presupuesto_categoria (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references espacios(id) on delete cascade,
  mes date not null, -- se guarda como primer día del mes, ej. 2026-01-01
  categoria_egreso_id uuid references categorias_egreso(id),
  porcentaje_asignado numeric(5,4) not null,
  unique (espacio_id, mes, categoria_egreso_id)
);

-- Transacciones
create table transacciones (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references espacios(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('ingreso','egreso')),
  categoria_ingreso_id uuid references categorias_ingreso(id),
  categoria_egreso_id uuid references categorias_egreso(id),
  concepto_detalle_id uuid references conceptos_detalle(id),
  monto_real numeric(12,2) not null,
  monto_presupuestado numeric(12,2),
  creado_por uuid references auth.users(id),
  actualizado_en timestamptz default now(),
  check (
    (tipo = 'ingreso' and categoria_ingreso_id is not null and categoria_egreso_id is null) or
    (tipo = 'egreso' and categoria_egreso_id is not null and categoria_ingreso_id is null)
  )
);

-- Deudas con terceros
create table deudas (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references espacios(id) on delete cascade,
  persona text not null,
  monto numeric(12,2) not null,
  direccion text not null check (direccion in ('me_deben','debo')),
  fecha date not null,
  estado text not null default 'pendiente',
  actualizado_en timestamptz default now()
);

-- Inversiones
create table activos_inversion (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references espacios(id) on delete cascade,
  nombre text not null,
  monto_invertido numeric(12,2) not null,
  actualizado_en timestamptz default now()
);

-- Índices para las consultas más frecuentes (resumen mensual, listados por mes)
create index idx_transacciones_espacio_fecha on transacciones (espacio_id, fecha);
create index idx_deudas_espacio_estado on deudas (espacio_id, estado);
create index idx_presupuesto_espacio_mes on presupuesto_categoria (espacio_id, mes);
```

### Row Level Security (RLS) — un usuario solo ve los espacios a los que pertenece

```sql
alter table espacios enable row level security;
alter table miembros_espacio enable row level security;
alter table categorias_ingreso enable row level security;
alter table categorias_egreso enable row level security;
alter table conceptos_detalle enable row level security;
alter table presupuesto_categoria enable row level security;
alter table transacciones enable row level security;
alter table deudas enable row level security;
alter table activos_inversion enable row level security;

-- Función auxiliar: espacios a los que pertenece el usuario autenticado
create or replace function espacios_del_usuario()
returns setof uuid
language sql stable
as $$
  select espacio_id from miembros_espacio where usuario_id = auth.uid();
$$;

-- Política repetible para cada tabla con espacio_id directo
-- (transacciones, deudas, activos_inversion, presupuesto_categoria, categorias_ingreso, categorias_egreso, miembros_espacio)
create policy "acceso por espacio - select" on transacciones for select
  using (espacio_id in (select espacios_del_usuario()));
create policy "acceso por espacio - insert" on transacciones for insert
  with check (espacio_id in (select espacios_del_usuario()));
create policy "acceso por espacio - update" on transacciones for update
  using (espacio_id in (select espacios_del_usuario()));
create policy "acceso por espacio - delete" on transacciones for delete
  using (espacio_id in (select espacios_del_usuario()));

-- Repetir el mismo patrón (select/insert/update/delete) en:
-- deudas, activos_inversion, presupuesto_categoria, categorias_ingreso, categorias_egreso

-- conceptos_detalle no tiene espacio_id directo: se valida vía su categoría_egreso_id
create policy "acceso por espacio - select" on conceptos_detalle for select
  using (categoria_egreso_id in (
    select id from categorias_egreso where espacio_id in (select espacios_del_usuario())
  ));

-- espacios: solo lo ven sus miembros
create policy "ver mis espacios" on espacios for select
  using (id in (select espacios_del_usuario()));

-- miembros_espacio: un usuario ve la membresía de sus propios espacios
create policy "ver miembros de mis espacios" on miembros_espacio for select
  using (espacio_id in (select espacios_del_usuario()));
```

> Nota para Antigravity: el patrón de RLS es el mismo en las 5 tablas restantes (`deudas`,
> `activos_inversion`, `presupuesto_categoria`, `categorias_ingreso`, `categorias_egreso`) — repetir las
> 4 políticas (`select`/`insert`/`update`/`delete`) usando `espacios_del_usuario()` tal como en `transacciones`.

---

## 18. Almacenamiento local y cola de sincronización (offline-first, detallado)

### 18.1 Base de datos local

En el teléfono, usando `expo-sqlite`, se crea una réplica simplificada de las mismas tablas de Supabase
(`transacciones`, `deudas`, `activos_inversion`, `presupuesto_categoria`, `categorias_ingreso`,
`categorias_egreso`, `conceptos_detalle`), agregando a cada una los campos técnicos ya definidos en la
sección 6.2 (`id_local`, `id_remoto`, `estado_sincronización`, `fecha_modificación`) más un campo
`eliminado` (booleano) para poder sincronizar borrados sin perder el rastro (soft delete).

### 18.2 Tabla de cola de sincronización

Además de las tablas de datos, se crea una tabla local exclusiva para la cola:

| Campo | Tipo | Descripción |
|---|---|---|
| id | identificador | |
| tabla | texto | A qué tabla pertenece el cambio (ej. "transacciones") |
| id_local | identificador | Registro afectado |
| tipo_operación | texto | "crear", "editar" o "eliminar" |
| datos | json | Copia de los datos a enviar a Supabase |
| intentos | número | Cuántas veces se intentó subir (para detectar fallos repetidos) |
| creado_en | fecha/hora | Para procesar la cola en orden |

### 18.3 Flujo de sincronización, paso a paso

1. **Escritura local inmediata:** cualquier acción del usuario (crear/editar/eliminar transacción, deuda,
   inversión, etc.) se guarda de inmediato en SQLite local, con `estado_sincronización = pendiente`, y se
   agrega un registro a la cola. La app nunca espera a Supabase para responder al usuario.
2. **Disparo de sincronización:** un proceso en segundo plano escucha cambios de conectividad (con
   `@react-native-community/netinfo`) y también sincroniza al abrir la app o volver a primer plano.
3. **Procesamiento de la cola (orden FIFO):** por cada elemento pendiente, se intenta subir a Supabase.
   - Si Supabase confirma el cambio → se actualiza el registro local con el `id_remoto`, se marca
     `estado_sincronización = sincronizado` y se elimina de la cola.
   - Si falla por red → se reintenta más adelante, incrementando `intentos`.
   - Si falla porque el registro remoto tiene una `fecha_modificación` más reciente que la última que la
     app conocía → **conflicto** (ver 18.4).
4. **Reintentos con backoff:** si un elemento acumula varios intentos fallidos seguidos, se espera cada vez
   más entre reintentos, para no saturar la red ni la batería.

### 18.4 Resolución de conflictos (decisión confirmada: el usuario elige)

Cuando se detecta un conflicto:

1. El registro local se marca `estado_sincronización = con_conflicto` y **no se sube ni se sobrescribe**.
2. La app muestra al usuario una pantalla/aviso: "Este [gasto/deuda/inversión] fue editado en otro
   dispositivo mientras estabas sin conexión", con ambas versiones visibles lado a lado (valores y fecha de
   cada una).
3. El usuario elige "usar la versión de este dispositivo" o "usar la versión del otro dispositivo".
4. Con la elección, se resuelve el conflicto: se sube la versión ganadora a Supabase y se actualiza el
   registro local, volviendo a `estado_sincronización = sincronizado`.

Este flujo aplica sobre todo en espacios compartidos (dos personas editando mientras ambas están sin
conexión); en un espacio de un solo usuario con un solo dispositivo, los conflictos prácticamente no ocurren.

---

## 19. Próximos pasos sugeridos

Con las secciones 15 a 18 ya cubiertas, los siguientes pasos son:

1. Maquetar en detalle el resto de pantallas listadas en la sección 16 (Presupuesto del mes, Deudas,
   Inversiones, Resumen anual, Unirse/crear espacio), siguiendo el mismo lenguaje visual de los dos
   wireframes ya mostrados.
2. Ejecutar el script SQL de la sección 17 en el proyecto de Supabase ya creado, y cargar el catálogo
   inicial de categorías y conceptos de detalle (sección 14) como datos semilla.
3. Iniciar el proyecto React Native + Expo y conectar el cliente de Supabase.
4. Implementar la capa de almacenamiento local y la cola de sincronización descrita en la sección 18.
5. A partir de ahí, construir pantalla por pantalla siguiendo los requisitos funcionales de la sección 8.
