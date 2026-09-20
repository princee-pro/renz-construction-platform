-- C10 — operational health support.
--
-- The health endpoint and the owner's System Health panel need to know
-- whether the database has the migrations this build expects. The
-- supabase_migrations schema is not exposed to PostgREST, so this small
-- SECURITY DEFINER helper reports only the latest applied version and the
-- count — never a migration body, name or connection detail. Callable by the
-- service role only (the health probe runs server-side with no user).

create or replace function public.ops_migration_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'latest', (select max(version) from supabase_migrations.schema_migrations),
    'count', (select count(*) from supabase_migrations.schema_migrations)
  );
$$;

revoke all on function public.ops_migration_state() from public, anon, authenticated;
grant execute on function public.ops_migration_state() to service_role;
