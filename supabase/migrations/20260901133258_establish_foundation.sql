create schema if not exists private;

comment on schema private is
  'Unexposed helpers for database integrity. No application data belongs here.';

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create function private.touch_mutable_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  new.version := old.version + 1;
  return new;
end;
$$;

comment on function private.touch_mutable_row() is
  'Maintains updated_at and monotonic row version on mutable application records.';

revoke all on function private.touch_mutable_row() from public;
revoke all on function private.touch_mutable_row() from anon;
revoke all on function private.touch_mutable_row() from authenticated;
