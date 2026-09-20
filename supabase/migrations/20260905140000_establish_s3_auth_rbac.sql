-- S3: invitation-only staff identity, mandatory AAL2, bounded RBAC, and audit.
-- No public signup, customer accounts, future product-domain grants, or broad
-- privileged client path is introduced here.

-- S2 profiles may already exist in a local/operator database without a status.
-- Backfill them before enforcing the S3 lifecycle default and NOT NULL contract.
update public.profiles
   set account_status = 'pending_mfa'
 where account_status is null;

alter table public.profiles
  alter column account_status set default 'pending_mfa',
  alter column account_status set not null;

alter table public.profiles
  add constraint profiles_account_status_values_check
  check (account_status in ('pending_mfa', 'active', 'disabled'));

create index user_roles_active_super_admin_idx
  on public.user_roles (role_id, user_id);

create or replace function private.has_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

comment on function private.has_aal2() is
  'Returns true only for the current session assurance level aal2.';

create or replace function private.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and private.has_aal2()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.account_status = 'active'
    )
    and exists (
      select 1
      from public.user_roles
      join public.role_permissions
        on role_permissions.role_id = user_roles.role_id
      join public.permissions
        on permissions.id = role_permissions.permission_id
      where user_roles.user_id = auth.uid()
        and permissions.key = requested_permission
    );
$$;

comment on function private.has_permission(text) is
  'Fresh, current-actor, AAL2-gated permission check. It accepts no user-id argument.';

create or replace function private.is_current_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where user_roles.user_id = auth.uid()
      and roles.key = 'super_admin'
  );
$$;

create or replace function private.prevent_last_super_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  super_admin_role_id smallint;
  active_super_admins integer;
begin
  select roles.id
    into super_admin_role_id
    from public.roles
   where roles.key = 'super_admin';

  if old.role_id = super_admin_role_id
     and exists (
       select 1
       from public.profiles
       where profiles.id = old.user_id
         and profiles.account_status = 'active'
     ) then
    select count(*)
      into active_super_admins
      from public.user_roles
      join public.profiles on profiles.id = user_roles.user_id
     where user_roles.role_id = super_admin_role_id
       and profiles.account_status = 'active';

    if active_super_admins <= 1 then
      raise exception using
        errcode = '23514',
        message = 'the last active super_admin cannot be removed';
    end if;
  end if;

  return old;
end;
$$;

create or replace function private.prevent_last_active_super_admin_disable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  super_admin_role_id smallint;
  active_super_admins integer;
begin
  if old.account_status = 'active' and new.account_status <> 'active' then
    select roles.id
      into super_admin_role_id
      from public.roles
     where roles.key = 'super_admin';

    if exists (
      select 1
      from public.user_roles
      where user_roles.user_id = old.id
        and user_roles.role_id = super_admin_role_id
    ) then
      select count(*)
        into active_super_admins
        from public.user_roles
        join public.profiles on profiles.id = user_roles.user_id
       where user_roles.role_id = super_admin_role_id
         and profiles.account_status = 'active';

      if active_super_admins <= 1 then
        raise exception using
          errcode = '23514',
          message = 'the last active super_admin cannot be disabled';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.prevent_last_active_super_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  super_admin_role_id smallint;
  active_super_admins integer;
begin
  if old.account_status = 'active' then
    select roles.id
      into super_admin_role_id
      from public.roles
     where roles.key = 'super_admin';

    if exists (
      select 1
      from public.user_roles
      where user_roles.user_id = old.id
        and user_roles.role_id = super_admin_role_id
    ) then
      select count(*)
        into active_super_admins
        from public.user_roles
        join public.profiles on profiles.id = user_roles.user_id
       where user_roles.role_id = super_admin_role_id
         and profiles.account_status = 'active';

      if active_super_admins <= 1 then
        raise exception using
          errcode = '23514',
          message = 'the last active super_admin profile cannot be deleted';
      end if;
    end if;
  end if;

  return old;
end;
$$;

create or replace function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, account_status)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    'pending_mfa'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_auth_user_created();

create trigger user_roles_prevent_last_super_admin
before delete on public.user_roles
for each row execute function private.prevent_last_super_admin();

create trigger profiles_prevent_last_super_admin_disable
before update of account_status on public.profiles
for each row execute function private.prevent_last_active_super_admin_disable();

create trigger profiles_prevent_last_super_admin_delete
before delete on public.profiles
for each row execute function private.prevent_last_active_super_admin_delete();

insert into public.roles (key, display_name, is_system)
values
  ('super_admin', 'Super Administrator', true),
  ('admin', 'Administrator', true)
on conflict (key) do update
set display_name = excluded.display_name,
    is_system = excluded.is_system;

insert into public.permissions (key, display_name, description, is_system)
values
  ('users.read', 'View administrators', 'View safe administrator profile state.', true),
  ('users.invite', 'Invite administrators', 'Invite a staff administrator.', true),
  ('users.disable', 'Disable administrators', 'Disable or re-enable an administrator.', true),
  ('roles.read', 'View roles', 'View the approved S3 role and capability registry.', true),
  ('roles.manage', 'Manage roles', 'Assign or remove approved S3 roles and capabilities.', true),
  ('audit.read', 'View audit log', 'Read redacted security audit events.', true),
  ('audit.write', 'Write audit events', 'Write redacted security audit events through trusted helpers.', true),
  ('security.manage', 'Manage security', 'View and manage the current staff security state.', true)
on conflict (key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    is_system = excluded.is_system;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'users.read', 'users.invite', 'users.disable', 'roles.read',
  'audit.read', 'audit.write', 'security.manage'
)
where roles.key = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
cross join public.permissions
where roles.key = 'super_admin'
on conflict do nothing;

create or replace function private.record_audit_event(
  event_action text,
  event_entity_type text,
  event_entity_id text,
  event_outcome text,
  event_metadata jsonb default '{}'::jsonb,
  event_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_permission('audit.write') then
    raise exception using errcode = '42501', message = 'audit writer is not authorized';
  end if;

  if event_metadata ?| array[
    'password', 'code', 'totp_secret', 'secret', 'token',
    'access_token', 'refresh_token', 'authorization', 'raw_payload'
  ] then
    raise exception using errcode = '22023', message = 'audit metadata contains a prohibited field';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, outcome, metadata, request_id
  )
  values (
    auth.uid(),
    btrim(event_action),
    btrim(event_entity_type),
    btrim(event_entity_id),
    btrim(event_outcome),
    event_metadata,
    event_request_id
  );
end;
$$;

create or replace function private.bootstrap_super_admin(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  super_admin_role_id smallint;
begin
  -- Serialize bootstrap attempts. The operation is deliberately available only
  -- to the operator's service-role CLI adapter, never to browser sessions.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('renz:s3:bootstrap-super-admin', 0)
  );

  if exists (
    select 1
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    where roles.key = 'super_admin'
  ) then
    raise exception using
      errcode = '42501',
      message = 'super_admin bootstrap is no longer available';
  end if;

  select roles.id
    into super_admin_role_id
    from public.roles
   where roles.key = 'super_admin';

  if super_admin_role_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = target_user_id
      and profiles.account_status = 'pending_mfa'
  ) then
    raise exception using
      errcode = '22023',
      message = 'bootstrap target must be an invited pending-MFA profile';
  end if;

  insert into public.user_roles (user_id, role_id, granted_by)
  values (target_user_id, super_admin_role_id, null);

  -- Bootstrap has no authenticated actor yet. Store only the target and a
  -- bounded source marker; the operator identity belongs in deployment logs.
  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, outcome, metadata
  )
  values (
    null,
    'super_admin.bootstrap',
    'user_role',
    target_user_id::text,
    'success',
    jsonb_build_object('source', 'operator-bootstrap')
  );

  return true;
end;
$$;

create or replace function public.current_user_has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission(requested_permission);
$$;

create or replace function public.record_audit_event(
  event_action text,
  event_entity_type text,
  event_entity_id text,
  event_outcome text,
  event_metadata jsonb default '{}'::jsonb,
  event_request_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.record_audit_event(
    event_action,
    event_entity_type,
    event_entity_id,
    event_outcome,
    event_metadata,
    event_request_id
  );
$$;

create or replace function public.current_user_access()
returns table (role_key text, permission_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select roles.key, permissions.key
  from public.user_roles
  join public.roles on roles.id = user_roles.role_id
  join public.role_permissions on role_permissions.role_id = roles.id
  join public.permissions on permissions.id = role_permissions.permission_id
  where user_roles.user_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.account_status = 'active'
    )
    and private.has_aal2()
  order by roles.key, permissions.key;
$$;

create or replace function public.activate_current_profile()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_aal2() then
    return false;
  end if;

  update public.profiles
     set account_status = 'active',
         version = version + 1
   where profiles.id = auth.uid()
     and profiles.account_status = 'pending_mfa';

  if found then
    return true;
  end if;

  -- A retried request may arrive after the profile was activated but before
  -- its caller observed the response. Keep this transition idempotent.
  return exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.account_status = 'active'
  );
end;
$$;

create or replace function public.assign_invited_admin(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_role_id smallint;
begin
  if not private.has_permission('users.invite') then
    raise exception using errcode = '42501', message = 'administrator invitation is not authorized';
  end if;

  select roles.id
    into admin_role_id
    from public.roles
   where roles.key = 'admin';

  if admin_role_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = target_user_id
      and profiles.account_status = 'pending_mfa'
  ) then
    raise exception using
      errcode = '22023',
      message = 'invited administrator target is not a pending-MFA profile';
  end if;

  insert into public.user_roles (user_id, role_id, granted_by)
  values (target_user_id, admin_role_id, auth.uid())
  on conflict do nothing;

  perform private.record_audit_event(
    'admin.invite', 'auth_user', target_user_id::text, 'success', '{}'::jsonb, null
  );

  return true;
end;
$$;

create or replace function public.disable_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('users.disable') then
    raise exception using errcode = '42501', message = 'user disablement is not authorized';
  end if;

  update public.profiles
     set account_status = 'disabled',
         version = version + 1
   where profiles.id = target_user_id
     and profiles.account_status <> 'disabled';

  perform private.record_audit_event(
    'user.disable', 'profile', target_user_id::text, 'success', '{}'::jsonb, null
  );
  return found;
end;
$$;

create or replace function public.assign_user_role(target_user_id uuid, requested_role_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role_id smallint;
begin
  if not private.has_permission('roles.manage') then
    raise exception using errcode = '42501', message = 'role assignment is not authorized';
  end if;

  select roles.id
    into requested_role_id
    from public.roles
   where roles.key = requested_role_key;

  if requested_role_id is null then
    raise exception using errcode = '22023', message = 'requested role is not approved';
  end if;

  if requested_role_key = 'super_admin' and not private.is_current_super_admin() then
    raise exception using errcode = '42501', message = 'only a super_admin may assign super_admin';
  end if;

  insert into public.user_roles (user_id, role_id, granted_by)
  values (target_user_id, requested_role_id, auth.uid())
  on conflict do nothing;

  perform private.record_audit_event(
    'role.assign', 'user_role', target_user_id::text, 'success',
    jsonb_build_object('role_key', requested_role_key), null
  );
  return true;
end;
$$;

create or replace function public.remove_user_role(target_user_id uuid, requested_role_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role_id smallint;
begin
  if not private.has_permission('roles.manage') then
    raise exception using errcode = '42501', message = 'role removal is not authorized';
  end if;

  select roles.id
    into requested_role_id
    from public.roles
   where roles.key = requested_role_key;

  if requested_role_id is null then
    raise exception using errcode = '22023', message = 'requested role is not approved';
  end if;

  if requested_role_key = 'super_admin' and not private.is_current_super_admin() then
    raise exception using errcode = '42501', message = 'only a super_admin may remove super_admin';
  end if;

  delete from public.user_roles
   where user_roles.user_id = target_user_id
     and user_roles.role_id = requested_role_id;

  perform private.record_audit_event(
    'role.remove', 'user_role', target_user_id::text, 'success',
    jsonb_build_object('role_key', requested_role_key), null
  );
  return found;
end;
$$;

-- Browser/API roles may only call these narrow, current-actor functions.
revoke all on function private.has_aal2() from public, anon, authenticated;
revoke all on function private.has_permission(text) from public, anon, authenticated;
revoke all on function private.is_current_super_admin() from public, anon, authenticated;
revoke all on function private.prevent_last_super_admin() from public, anon, authenticated;
revoke all on function private.prevent_last_active_super_admin_disable() from public, anon, authenticated;
revoke all on function private.prevent_last_active_super_admin_delete() from public, anon, authenticated;
revoke all on function private.handle_auth_user_created() from public, anon, authenticated;
revoke all on function private.record_audit_event(text, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function private.bootstrap_super_admin(uuid) from public, anon, authenticated;

-- RLS policies invoke this current-actor helper as the authenticated role. The
-- grant is limited to this one function; the private schema itself remains
-- inaccessible and every call still requires AAL2 plus an active profile.
grant execute on function private.has_permission(text) to authenticated;

revoke all on function public.current_user_has_permission(text) from public, anon, authenticated;
revoke all on function public.record_audit_event(text, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.current_user_access() from public, anon, authenticated;
revoke all on function public.activate_current_profile() from public, anon, authenticated;
revoke all on function public.assign_invited_admin(uuid) from public, anon, authenticated;
revoke all on function public.disable_user(uuid) from public, anon, authenticated;
revoke all on function public.assign_user_role(uuid, text) from public, anon, authenticated;
revoke all on function public.remove_user_role(uuid, text) from public, anon, authenticated;

grant execute on function public.current_user_has_permission(text) to authenticated;
grant execute on function public.record_audit_event(text, text, text, text, jsonb, uuid) to authenticated;
grant execute on function public.current_user_access() to authenticated;
grant execute on function public.activate_current_profile() to authenticated;
grant execute on function public.assign_invited_admin(uuid) to authenticated;
grant execute on function public.disable_user(uuid) to authenticated;
grant execute on function public.assign_user_role(uuid, text) to authenticated;
grant execute on function public.remove_user_role(uuid, text) to authenticated;

-- The bootstrap function is intentionally not exposed through PostgREST. The
-- operator CLI invokes it over the local database connection as postgres after
-- creating the invitation; browser roles receive no execute privilege.

grant select on public.profiles, public.roles, public.permissions,
  public.role_permissions, public.user_roles, public.audit_logs
to authenticated;

create policy profiles_select_self_or_users_read
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or private.has_permission('users.read'));

create policy roles_select_with_permission
  on public.roles
  for select
  to authenticated
  using (private.has_permission('roles.read'));

create policy permissions_select_with_permission
  on public.permissions
  for select
  to authenticated
  using (private.has_permission('roles.read'));

create policy role_permissions_select_with_permission
  on public.role_permissions
  for select
  to authenticated
  using (private.has_permission('roles.read'));

create policy user_roles_select_self_or_users_read
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid() or private.has_permission('users.read'));

create policy audit_logs_select_with_permission
  on public.audit_logs
  for select
  to authenticated
  using (private.has_permission('audit.read'));

comment on function public.current_user_has_permission(text) is
  'Narrow RLS/API facade for fresh current-actor permission checks; never accepts a user id.';

comment on function public.current_user_access() is
  'Returns only the current AAL2 actor role/capability pairs.';

comment on function public.activate_current_profile() is
  'Promotes only the current pending profile after AAL2 MFA verification.';

comment on function public.assign_invited_admin(uuid) is
  'Assigns only the approved admin role to a pending invited profile after a fresh users.invite check.';
