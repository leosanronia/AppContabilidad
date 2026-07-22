-- ============================================================
-- Migracion 03 — Categorias y movimientos (Fase 2 y 3)
-- Ejecutar en: Supabase > SQL Editor > New query > Run
-- ============================================================
-- Por que: para anotar gastos desde el celular (HU-010) hace falta
-- la tabla movimientos, y cada gasto se asocia a una categoria del
-- presupuesto (HU-012). Ninguna de las dos existia: hasta ahora solo
-- se crearon las 5 tablas del MVP.
-- ============================================================

create table if not exists categorias (
  id            bigint generated always as identity primary key,
  nombre        text not null,                 -- "Mercado", "Cel", "Salud"...
  grupo         text,                          -- "fijos", "inversion", "otros"
  monto_default numeric(14,2) default 0,       -- plantilla del presupuesto
  orden         int default 0,
  activo        boolean not null default true
);

create table if not exists movimientos (
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

-- Consultas tipicas: los movimientos de una semana y los de una categoria.
create index if not exists idx_movimientos_semana    on movimientos(semana_id);
create index if not exists idx_movimientos_categoria on movimientos(categoria_id);
