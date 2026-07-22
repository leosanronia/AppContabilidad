-- ============================================================
-- Migracion 06 — Presupuesto mensual (HU-013 y HU-014)
-- Ejecutar en: Supabase > SQL Editor > New query > Run
-- ============================================================
-- 1) Tabla presupuesto: el Plan de cada categoria en cada mes.
--    gasto y por_pagar NO se guardan: son derivados (ver §6 del brief).
-- 2) Columna usa_reconciliacion en categorias: marca la linea "Semanas",
--    cuyo Gasto no viene de movimientos anotados sino de la
--    reconciliacion semanal (decision acordada en la HU-013).
-- ============================================================

create table if not exists presupuesto (
  id           bigint generated always as identity primary key,
  mes_id       bigint not null references meses(id)      on delete cascade,
  categoria_id bigint not null references categorias(id) on delete cascade,
  plan         numeric(14,2) not null default 0,
  unique (mes_id, categoria_id)
);

create index if not exists idx_presupuesto_mes on presupuesto(mes_id);

alter table categorias
  add column if not exists usa_reconciliacion boolean not null default false;

-- El presupuesto queda bajo el mismo candado que el resto (HU-022).
alter table presupuesto enable row level security;
drop policy if exists "solo_autenticados" on presupuesto;
create policy "solo_autenticados" on presupuesto
  for all to authenticated using (true) with check (true);
