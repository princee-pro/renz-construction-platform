-- PostgreSQL implements foreign-key SET NULL actions as nested UPDATE
-- statements. Preserve those referential actions without weakening the
-- explicit-version contract for direct application mutations.

create or replace function private.touch_mutable_row()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.version is not distinct from old.version then
    if pg_trigger_depth() > 1
      and to_jsonb(new) is distinct from to_jsonb(old)
      and (
        to_jsonb(new) - array[
          'actor_id',
          'assigned_to',
          'author_id',
          'changed_by',
          'created_by',
          'granted_by',
          'updated_by',
          'verified_by'
        ]
      ) = (
        to_jsonb(old) - array[
          'actor_id',
          'assigned_to',
          'author_id',
          'changed_by',
          'created_by',
          'granted_by',
          'updated_by',
          'verified_by'
        ]
      ) then
      new.version := old.version + 1;
    else
      raise check_violation using
        message = 'Mutable records must increment version explicitly by one.';
    end if;
  elsif new.version is distinct from old.version + 1 then
    raise check_violation using
      message = 'Mutable records must increment version explicitly by one.';
  end if;

  new.updated_at := statement_timestamp();
  return new;
end;
$$;

comment on function private.touch_mutable_row() is
  'Maintains updated_at, requires direct mutations to increment version explicitly, and advances version only for nested attribution-FK maintenance updates.';
