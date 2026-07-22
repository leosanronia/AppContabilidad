-- ============================================================
-- Migracion 07 — Categorias de ingreso (HU-024)
-- Ejecutar en: Supabase > SQL Editor > New query > Run
-- ============================================================
-- Por que: hoy el nombre del ingreso es texto libre, asi que el mismo
-- ingreso puede quedar como "INT", "Inteia" o "int" y despues no se
-- puede analizar. Con una lista fija, cada ingreso queda clasificado.
--
-- Tabla propia (no se reusa "categorias") porque esas son las del
-- presupuesto de gastos: mezclarlas ensuciaria el presupuesto.
--
-- Los ingresos ya registrados NO se pierden: sus nombres actuales se
-- convierten en categorias y quedan enlazados automaticamente.
-- ============================================================

create table if not exists categorias_ingreso (
  id     bigint generated always as identity primary key,
  nombre text not null unique,
  orden  int default 0,
  activo boolean not null default true
);

alter table ingresos
  add column if not exists categoria_ingreso_id bigint
    references categorias_ingreso(id) on delete set null;

-- Migra los nombres que ya existen a categorias...
insert into categorias_ingreso (nombre)
select distinct trim(nombre)
from ingresos
where nombre is not null and trim(nombre) <> ''
on conflict (nombre) do nothing;

-- ...y enlaza cada ingreso con la suya.
update ingresos i
set categoria_ingreso_id = c.id
from categorias_ingreso c
where trim(i.nombre) = c.nombre
  and i.categoria_ingreso_id is null;

create index if not exists idx_ingresos_categoria
  on ingresos(categoria_ingreso_id);

-- Mismo candado que el resto de tablas (HU-022).
alter table categorias_ingreso enable row level security;
drop policy if exists "solo_autenticados" on categorias_ingreso;
create policy "solo_autenticados" on categorias_ingreso
  for all to authenticated using (true) with check (true);
