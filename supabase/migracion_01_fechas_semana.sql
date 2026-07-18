-- ============================================================
-- Migracion 01 — Fechas reales en las semanas
-- Ejecutar en: Supabase > SQL Editor > New query > Run
-- ============================================================
-- Por que: la tabla "semanas" guardaba el rango solo como texto
-- ("27 abr - 3 may"). Para que la app pueda sugerir sola la semana
-- siguiente y saber con certeza cual es la semana ANTERIOR (base del
-- calculo automatico del gasto, HU-008), necesita fechas reales.
-- ============================================================

alter table semanas add column if not exists fecha_inicio date;
alter table semanas add column if not exists fecha_fin    date;

-- Evita semanas duplicadas: no pueden existir dos semanas que
-- empiecen el mismo dia.
create unique index if not exists uq_semanas_fecha_inicio
  on semanas(fecha_inicio);

-- Para ordenar el historial por fecha de forma eficiente.
create index if not exists idx_semanas_fecha_fin
  on semanas(fecha_fin);
