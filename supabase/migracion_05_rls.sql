-- ============================================================
-- Migracion 05 — Row Level Security (candado de acceso)
-- ============================================================
-- CORRER SOLO AL FINAL, despues de:
--   1. crear tu cuenta en Supabase (Authentication > Users),
--   2. desplegar la pantalla de login,
--   3. confirmar que inicias sesion bien.
-- Si se corre antes, la app deja de funcionar hasta poder iniciar sesion.
--
-- Que hace: activa RLS en todas las tablas y solo permite el acceso a
-- usuarios AUTENTICADOS. Sin sesion iniciada, la anon key deja de poder
-- leer o escribir. App de un solo usuario: el registro publico se
-- desactiva desde el panel (Authentication > Sign In / Providers).
-- ============================================================

alter table meses          enable row level security;
alter table semanas        enable row level security;
alter table agrupadores    enable row level security;
alter table items_balance  enable row level security;
alter table saldos_semana  enable row level security;
alter table categorias     enable row level security;
alter table movimientos    enable row level security;
alter table ingresos       enable row level security;

-- Un solo usuario autenticado puede hacer todo. (Idempotente: primero
-- elimina la politica si ya existia.)
do $$
declare t text;
begin
  foreach t in array array[
    'meses','semanas','agrupadores','items_balance',
    'saldos_semana','categorias','movimientos','ingresos'
  ]
  loop
    execute format('drop policy if exists "solo_autenticados" on %I', t);
    execute format(
      'create policy "solo_autenticados" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
