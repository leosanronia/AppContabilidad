-- ============================================================
-- Esquema MVP — App de finanzas personales (Postgres / Supabase)
-- Montos en COP: numeric(14,2). MVP de un solo usuario (sin RLS aun).
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run.
-- Es idempotente-ish: si ya corriste antes, borra las tablas primero
-- (ver bloque opcional al final) o ignora el error de "already exists".
-- ============================================================

-- 1) Meses: contenedor temporal de nivel superior.
create table meses (
  id         bigint generated always as identity primary key,
  nombre     text not null,                 -- "Enero", "Febrero"...
  anio       int  not null,
  created_at timestamptz not null default now(),
  unique (nombre, anio)
);

-- 2) Semanas: cada semana pertenece a un mes. Guarda el gasto no rastreado.
create table semanas (
  id           bigint generated always as identity primary key,
  mes_id       bigint not null references meses(id) on delete cascade,
  rango        text   not null,             -- "27 abr - 3 may" (etiqueta visible)
  numero       int,                          -- orden dentro del mes
  gasto_semana numeric(14,2) default 0,      -- gasto no rastreado (el "plug")
  fecha_inicio date,                          -- fechas reales: permiten ordenar y
  fecha_fin    date,                          -- saber cual es la semana anterior
  created_at   timestamptz not null default now()
);

-- Evita semanas duplicadas (dos semanas que empiecen el mismo dia).
create unique index uq_semanas_fecha_inicio on semanas(fecha_inicio);

-- 3) Agrupadores: las "cuentas" que ve el usuario, con su tipo.
create table agrupadores (
  id     bigint generated always as identity primary key,
  nombre text not null,                      -- "Tarjeta", "Apto", "Rappi"...
  tipo   text not null
         check (tipo in ('liquidez','patrimonio','deuda')),
  orden  int default 0
);

-- 4) Items del balance: el detalle dentro de cada agrupador.
create table items_balance (
  id           bigint generated always as identity primary key,
  agrupador_id bigint not null references agrupadores(id) on delete cascade,
  nombre       text not null,                -- "Debito Bancolombia", "CDT cajita"
  orden        int default 0
);

-- 5) Saldos por semana: el monto de cada item en cada semana.
create table saldos_semana (
  id        bigint generated always as identity primary key,
  item_id   bigint not null references items_balance(id) on delete cascade,
  semana_id bigint not null references semanas(id)      on delete cascade,
  monto     numeric(14,2) not null default 0,
  unique (item_id, semana_id)
);

-- Indices utiles para las consultas del balance.
create index idx_semanas_mes    on semanas(mes_id);
create index idx_items_agrup    on items_balance(agrupador_id);
create index idx_saldos_semana  on saldos_semana(semana_id);
create index idx_saldos_item    on saldos_semana(item_id);

-- ============================================================
-- OPCIONAL — descomentar SOLO si necesitas empezar de cero y
-- borrar las tablas existentes antes de recrearlas:
-- ============================================================
-- drop table if exists saldos_semana cascade;
-- drop table if exists items_balance cascade;
-- drop table if exists agrupadores   cascade;
-- drop table if exists semanas       cascade;
-- drop table if exists meses         cascade;
