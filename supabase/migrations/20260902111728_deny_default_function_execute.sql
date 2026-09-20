-- PostgreSQL grants EXECUTE on newly created functions to PUBLIC by default.
-- A schema-scoped default-privilege revoke cannot remove that global default,
-- so establish the fail-closed function baseline at the migration-owner level.
alter default privileges
  revoke all privileges on functions from public, anon, authenticated;
