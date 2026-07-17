# Brief de proyecto — App de finanzas personales

> Documento de contexto para Claude Code. Resume el objetivo, el dominio, el
> stack, el modelo de datos y el primer entregable. Puede guardarse como
> `CLAUDE.md` en la raíz del repo para que Claude Code lo lea automáticamente.

---

## 0. REGLA OBLIGATORIA — Mantener el tablero de historias de usuario

El archivo `Historias_de_Usuario_AppContabilidad.html` (raíz del repo) es el
tablero de control del proyecto. **Al final de CUALQUIER tarea que se ejecute
en este repo**, verificar si el trabajo afectó alguna historia de usuario (HU)
y actualizar ese HTML en el mismo turno, sin que el usuario lo pida:

- **HU empezada** → estado "En curso" en: la tarjeta de la HU, el tablero
  (sección 5) y la tabla de fases (sección 4).
- **HU completada** → estado "Completada" + fecha en los tres lugares, y una
  línea corta en la tarjeta con qué se verificó. Solo se marca Completada si
  **todos** sus criterios funcionan en la app desplegada (no solo en local).
- **Alcance nuevo** (el usuario pide algo que no está en ninguna HU) → crear la
  HU con el siguiente ID libre (formato `HU-0XX`), en su fase, con historia
  ("Como usuario quiero…") y criterios de aceptación, y sumarla al tablero.
- **HU descartada o cambiada** → estado "Descartada" con el porqué (nunca
  borrarla).
- Siempre actualizar el **contador global** de la sección 5 (totales por
  estado) cuando cambie cualquier estado.


Una tarea NO está terminada hasta que este documento refleje su efecto.

---

## 1. Objetivo final (visión)

Construir una aplicación web personal que reemplace una hoja de Excel donde el
usuario lleva sus finanzas. La app debe replicar el sistema que ya funciona en
Excel, pero quitando la fricción manual y agregando validaciones automáticas.

Es una herramienta de **uso personal** (un solo usuario por ahora). Lo más
importante: el usuario registra gastos desde el **celular** durante la semana y
consolida desde el **computador**, así que los datos viven en la nube y se
acceden desde ambos dispositivos.

El sistema tiene cuatro grandes piezas, que se construirán de forma incremental:

1. Registro semanal de gastos (incluye un truco de reconciliación, ver §3).
2. Presupuesto mensual con saldos que se arrastran de un mes al siguiente.
3. Un balance patrimonial dividido en liquidez, patrimonio y deudas.
4. Dos validadores que mantienen todo consistente.

---

## 2. Primer entregable (MVP) — lo que construimos PRIMERO

No construir todo de una. El primer objetivo es validar el **mecanismo más
valioso y arriesgado** del sistema: el cálculo del gasto semanal por
reconciliación de patrimonio, desplegado de punta a punta.

### Qué hace el MVP
- Definir las cuentas del usuario: **agrupadores** (ej. "Tarjeta") y sus
  **ítems** (ej. "Débito Bancolombia", "CDT cajita"), cada agrupador con un
  tipo (liquidez / patrimonio / deuda).
- Registrar, por semana, el **saldo de cada ítem**.
- Calcular y mostrar el **patrimonio neto** de la semana.
- Calcular automáticamente el **gasto de la semana** como la diferencia de neto
  entre la semana actual y la anterior.
- Todos los campos de monto aceptan **operaciones aritméticas** (como en Excel:
  escribir `60000 + 20000` guarda `80000`).
- Estar **desplegado** y accesible en una URL pública.

### Criterio de aceptación
> "Puedo definir mis cuentas (agrupadores + ítems), ingresar los saldos de dos
> semanas seguidas, y la app me muestra mi patrimonio neto y calcula solo cuánto
> gasté en la semana como la diferencia — todo funcionando en una URL pública de
> Netlify, con los datos guardados en Supabase."

### Tablas necesarias para el MVP
`meses`, `semanas`, `agrupadores`, `items_balance`, `saldos_semana`.
(El resto del modelo se agrega después.)

### Fuera de alcance del MVP (para fases siguientes)
- Presupuesto mensual (`presupuesto`, `categorias`, `movimientos`, `ingresos`).
- Estacionamiento de gastos futuros (`me_debo`) y su promoción.
- Validadores automáticos formales (en el MVP el gasto solo se muestra calculado).
- Autenticación / multiusuario / Row Level Security.
- Importación masiva del CSV del Excel (en el MVP basta meter 2–3 semanas a mano
  para validar; el import completo viene después).

---

## 3. Contexto del dominio (cómo funciona hoy en Excel)

Esta sección explica el *porqué*, para que las decisiones de implementación
tengan sentido.

### 3.1. Registro semanal (lo más importante del sistema)
Durante la semana, el usuario anota en el celular **solo los gastos que tienen un
ítem del presupuesto** (ej. mercado, Claude, salud). Los gastos sin ítem
(transporte, comidas, salidas) **no se anotan** uno por uno, porque sería
desgastante.

En su lugar, al final de la semana calcula su patrimonio (**lo que tengo menos lo
que debo**) y lo compara con el de la semana anterior. **Esa diferencia es el
gasto de la semana**, sin tener que registrar recibo por recibo. Ese número se
guarda como la línea "Semana XXX".

> Este truco de reconciliación es el corazón del sistema y el foco del MVP.

### 3.2. Presupuesto mensual
A fin de mes, el usuario:
- Pasa los gastos anotados en el celular al registro de egresos.
- Arma el presupuesto: un monto **Plan** por categoría. La suma de todos los
  planes debe igualar los **ingresos** del mes.
- Compara **Plan** vs **Gasto** real para obtener **Por pagar**.
- Las categorías suelen ser fijas, pero se pueden ajustar cada mes; por eso debe
  existir un **presupuesto por defecto** editable (no arrancar de cero).
- Si entra un ingreso nuevo, debe poder modificarlo y redistribuir.

### 3.3. Saldos que se arrastran
`Por pagar` y `Me debo` fluyen de un mes al siguiente (la columna
"Plan + mes anterior" del Excel).

### 3.4. Los dos "Me debo" (¡son distintos!)
- **Me debo (egresos / estacionamiento):** algo que ya compró pero aún no
  presupuesta para pagar, o que pagará otro mes (ej. comprar hoy una entrada
  para una fiesta de noviembre porque sale más barata). Queda "parqueado".
- **Me debo (presupuesto):** una línea *opcional* que aparece solo el mes en que
  decide pagar algo de ese estacionamiento. Es la acción de "sacar" un ítem
  parqueado y pagarlo → en el modelo, **promover** un `me_debo` a una línea de
  `presupuesto`.

### 3.5. Balance: tres grupos
El balance no es una sola bolsa. Cada cuenta es un **agrupador** que contiene
varios **ítems**, y cada agrupador es de un tipo:
- **Liquidez:** Tarjeta (incluye varias tarjetas + CDT), Efectivo/Nequi, Me debo,
  Me deben.
- **Patrimonio:** Apto, Inversión BNB, Fondo libertad, Carlos/OTH.
- **Deudas:** Rappi, Occidente, Debo.

El usuario ve el agrupador (es lo que le interesa); la app guarda el detalle por
ítem. El neto = Σ liquidez + Σ patrimonio − Σ deudas.

### 3.6. Los dos validadores
- **Validador (consistencia semanal):** verifica que la diferencia de neto entre
  semanas sea igual al gasto registrado de la semana. Si no cuadra → hubo un
  error anotando.
- **Disponible (solvencia mensual):** verifica que lo que tengo + lo que me va a
  llegar ese mes alcance para pagar el presupuesto. Si queda en negativo, es una
  señal **deseada**: indica que hay que cuadrar/reasignar el presupuesto.

### 3.7. Cálculo dentro de las celdas
En Excel el usuario escribe operaciones dentro de las celdas. La app debe
replicarlo: **todos los campos de monto aceptan expresiones aritméticas** y se
evalúan al confirmar.

---

## 4. Stack tecnológico

Todo en planes gratuitos. Stack muy estándar, bien soportado por Claude Code.

| Capa            | Tecnología                              |
|-----------------|-----------------------------------------|
| Frontend        | React + Vite + TypeScript               |
| Estilos         | (a elección — Tailwind recomendado)     |
| Datos + Auth    | Supabase (Postgres gestionado)          |
| Repositorio     | GitHub                                  |
| Hosting / deploy| Netlify (deploy automático desde GitHub)|
| Import / backup | CSV (carga directa a Supabase)          |

### Notas de los planes gratuitos
- **Netlify free:** 100 GB de ancho de banda/mes, dominios con SSL, CDN, $0 para
  siempre. Sobra para uso personal.
- **Supabase free:** 500 MB de base de datos Postgres, Auth incluido, $0 para
  siempre. Detalle: los proyectos gratuitos **se pausan tras 1 semana sin uso**
  (los datos se conservan; se reactiva con un clic). Como se usa cada semana, en
  la práctica no pausa.

### Reglas de seguridad (importante: son datos financieros)
- **Nunca** subir CSV con datos reales ni credenciales al repo.
- La `anon key` y la URL de Supabase van en variables de entorno del frontend
  (`.env`), no hardcodeadas. Incluir `.env` en `.gitignore`.
- El historial del Excel se importa **directo a Supabase**, no por el repo.
- Al agregar autenticación: activar **Row Level Security**, columna `user_id` en
  las tablas y políticas por usuario.

---

## 5. Modelo de datos (10 tablas)

Postgres / Supabase. Montos en COP con `numeric(14,2)`. El MVP solo usa las
primeras 5 tablas; el resto se crea en fases siguientes.

### Relaciones (resumen)
- `meses` 1—N `ingresos`, `presupuesto`, `semanas`
- `categorias` 1—N `presupuesto`, `movimientos`
- `semanas` 1—N `movimientos`, `saldos_semana`
- `agrupadores` 1—N `items_balance` 1—N `saldos_semana`
- `me_debo` 0..1 `presupuesto` (cuando se promueve)

### DDL completo

```sql
-- ============================================================
-- Esquema — App de finanzas personales (Postgres / Supabase)
-- Montos en COP: numeric(14,2). MVP de un solo usuario (sin RLS aún).
-- ============================================================

-- ---------- TABLAS DEL MVP ----------

create table meses (
  id         bigint generated always as identity primary key,
  nombre     text not null,                 -- "Enero", "Febrero"...
  anio       int  not null,
  created_at timestamptz not null default now(),
  unique (nombre, anio)
);

create table semanas (
  id           bigint generated always as identity primary key,
  mes_id       bigint not null references meses(id) on delete cascade,
  rango        text   not null,             -- "27 abr - 3 may"
  numero       int,                          -- orden dentro del mes
  gasto_semana numeric(14,2) default 0,      -- gasto no rastreado (el "plug")
  created_at   timestamptz not null default now()
);

create table agrupadores (
  id     bigint generated always as identity primary key,
  nombre text not null,                      -- "Tarjeta", "Apto", "Rappi"...
  tipo   text not null
         check (tipo in ('liquidez','patrimonio','deuda')),
  orden  int default 0
);

create table items_balance (
  id           bigint generated always as identity primary key,
  agrupador_id bigint not null references agrupadores(id) on delete cascade,
  nombre       text not null,                -- "Débito Bancolombia", "CDT cajita"
  orden        int default 0
);

create table saldos_semana (
  id        bigint generated always as identity primary key,
  item_id   bigint not null references items_balance(id) on delete cascade,
  semana_id bigint not null references semanas(id)      on delete cascade,
  monto     numeric(14,2) not null default 0,
  unique (item_id, semana_id)
);

-- ---------- TABLAS DE FASES SIGUIENTES ----------

create table categorias (
  id            bigint generated always as identity primary key,
  nombre        text not null,               -- "Mercado", "Cel", "Salud"...
  grupo         text,                          -- "fijos", "inversión", "otros"
  monto_default numeric(14,2) default 0,       -- plantilla del presupuesto
  orden         int default 0,
  activo        boolean not null default true
);

create table ingresos (
  id     bigint generated always as identity primary key,
  mes_id bigint not null references meses(id) on delete cascade,
  nombre text not null,                       -- "INTEIA", "Arriendo", "Cesantías"
  monto  numeric(14,2) not null default 0
);

create table presupuesto (
  id           bigint generated always as identity primary key,
  mes_id       bigint not null references meses(id)      on delete cascade,
  categoria_id bigint not null references categorias(id) on delete restrict,
  plan         numeric(14,2) not null default 0,  -- lo presupuestado este mes
  -- gasto y por_pagar son DERIVADOS (ver §6), no se almacenan
  unique (mes_id, categoria_id)
);

create table movimientos (
  id           bigint generated always as identity primary key,
  semana_id    bigint not null references semanas(id)    on delete cascade,
  categoria_id bigint references categorias(id)          on delete set null,
  monto        numeric(14,2) not null,
  tipo         text not null
               check (tipo in ('gasto','ingreso')) default 'gasto',
  descripcion  text,
  fecha        date,
  created_at   timestamptz not null default now()
);

create table me_debo (
  id             bigint generated always as identity primary key,
  nombre         text not null,              -- "Entrada fiesta noviembre"
  monto          numeric(14,2) not null,
  fecha_compra   date,
  mes_objetivo   bigint references meses(id) on delete set null,
  estado         text not null
                 check (estado in ('parqueado','promovido','pagado'))
                 default 'parqueado',
  presupuesto_id bigint references presupuesto(id) on delete set null
);
```

---

## 6. Reglas de negocio y fórmulas

Fuente única de verdad: los datos crudos se guardan; los totales se calculan.

### Balance / patrimonio (por semana)
```
neto(semana) =   Σ saldos de ítems de agrupadores tipo 'liquidez'
               + Σ saldos de ítems de agrupadores tipo 'patrimonio'
               − Σ saldos de ítems de agrupadores tipo 'deuda'
```
El total de un agrupador es la suma de los saldos de sus ítems en esa semana.

### Gasto de la semana (reconciliación — núcleo del MVP)
```
gasto_semana = neto(semana_anterior) + ingresos_de_la_semana − neto(semana_actual)
```
Para el MVP (sin ingresos todavía):
```
gasto_semana = neto(semana_anterior) − neto(semana_actual)
```
La app calcula este número automáticamente; el usuario ya no lo cuadra a mano.

### Presupuesto (fases siguientes)
```
gasto(categoría, mes)      = Σ movimientos.monto de esa categoría y mes, tipo 'gasto'
saldo_mes_anterior         = por_pagar de la misma categoría en el mes anterior
por_pagar(categoría, mes)  = plan + saldo_mes_anterior − gasto
```

### Validadores (fases siguientes)
```
Validador (semanal):  gasto_semana_registrado  ==  (neto_ant + ingresos_sem − neto_act)
Disponible (mensual): (liquidez_actual + Σ ingresos_del_mes) − Σ plan(presupuesto)  >= 0
```
El descuadre de "Disponible" es una señal deseada (hay que reasignar), no un bug.

### Campos de monto con cálculo (todos los inputs de dinero)
- El input acepta una expresión: `60000 + 20000`, `540000 - 18300`, `150000 * 2`.
- Sanitizar a solo `0-9 + - * / ( ) . ` y espacios antes de evaluar.
- Evaluar de forma segura (no usar eval directo sobre entrada sin sanitizar).
- Guardar el **resultado numérico**; mostrar error si la expresión es inválida.
- Redondear al mostrar (formato COP, separador de miles).

---

## 7. Plan de construcción sugerido (orden para Claude Code)

1. Crear proyecto **Vite + React + TypeScript**; inicializar repo en GitHub.
2. Crear proyecto en **Supabase**; correr el DDL (solo tablas del MVP). Guardar
   URL y `anon key` en `.env` (con `.env` en `.gitignore`).
3. Configurar el cliente de Supabase en el frontend.
4. **Pantalla de configuración:** crear/editar agrupadores y sus ítems (con tipo).
5. **Pantalla de semana:** seleccionar/crear semana, ingresar saldo de cada ítem
   con el input-calculadora; mostrar el **neto** y el **gasto de la semana**.
6. **Historial:** lista de semanas con su neto y su gasto calculado.
7. **Deploy a Netlify:** conectar el repo, configurar variables de entorno.
8. **Probar end-to-end** con 2 semanas reales y verificar el cálculo del gasto.

---

## 8. Decisiones tomadas y supuestos

- MVP de **un solo usuario**, sin auth ni RLS todavía (se agregan después).
- `ingresos` es **tabla propia** (no un movimiento más), porque se planean por
  adelantado para cuadrar el presupuesto y alimentan el validador "Disponible".
- `gasto` y `por_pagar` del presupuesto **no se almacenan**, se calculan.
- `gasto_semana` vive en `semanas` (no es un movimiento; no tiene categoría).
- El balance tiene tres niveles: **tipo → agrupador → ítem**; los saldos se
  registran por ítem y el usuario ve el agrupador.
- El CSV del Excel se usa para **import inicial y backups**, nunca como base de
  datos viva (el hosting estático no puede escribir de vuelta en él).

### Preguntas abiertas (confirmar durante el build)
- Manejo exacto de los ingresos que entran *dentro* de una semana al calcular el
  gasto semanal (afecta la fórmula de reconciliación).
- Formato/origen del CSV de importación cuando se haga la migración completa.
