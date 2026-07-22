-- ============================================================
-- Migracion 04 — Ingresos por semana (Fase 2)
-- Ejecutar en: Supabase > SQL Editor > New query > Run
-- ============================================================
-- Por que: para registrar los ingresos (INT, Prima, Arriendo...) que
-- caen en cada semana. Se ligan a la SEMANA (no solo al mes) porque la
-- reconciliacion del gasto (HU-008) usa los ingresos de la semana; el
-- total del mes se obtiene sumando las semanas de ese mes.
-- (Difiere del DDL original del brief, que usaba mes_id; ver la nota en
--  la tarjeta de la HU-011 del tablero.)
-- ============================================================

create table if not exists ingresos (
  id         bigint generated always as identity primary key,
  semana_id  bigint not null references semanas(id) on delete cascade,
  nombre     text not null,                 -- "INT", "Prima", "Arriendo"...
  monto      numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingresos_semana on ingresos(semana_id);
