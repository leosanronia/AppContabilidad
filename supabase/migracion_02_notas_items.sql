-- ============================================================
-- Migracion 02 — Notas por item
-- Ejecutar en: Supabase > SQL Editor > New query > Run
-- ============================================================
-- Por que: en el Excel el usuario deja notas en algunas celdas para
-- recordar cosas. La app necesita guardar una nota por item, que no se
-- vea siempre sino cuando se abre (HU-023).
-- ============================================================

alter table items_balance add column if not exists nota text;
