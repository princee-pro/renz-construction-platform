-- C10 — owner-controlled staff access.
--
-- 1. Role templates as system roles: project_manager, finance, content_editor,
--    viewer (super_admin and admin already exist). The existing RBAC stays
--    authoritative: a template is simply a role with a permission set.
-- 2. Only the owner (super_admin) manages users: users.invite / users.disable
--    leave the admin template. Reading the staff list stays with staff.read.
-- 3. First-login password change: profiles.must_change_password. While it is
--    set, private.has_permission() and current_user_access() grant nothing,
--    so no protected facade can be reached by typing /admin — the only
--    allowed call is complete_password_change() for the current user.
-- 4. Facades for the owner: admin_prepare_staff_profile (after the server-only
--    Auth Admin createUser), admin_update_staff_profile, set_staff_role for
--    every approved role, admin_require_password_change (after a server-only
--    temporary-password reset). Every action is audited without secrets.
-- 5. admin_list_staff returns the role display names, the permission set of
--    each role (for plain-English capability summaries) and the
--    must-change-password state. Never a password, hash or token.

-- ---------------------------------------------------------------- roles
insert into public.roles (key, display_name, is_system)
values
  ('project_manager', 'Project Manager', true),
  ('finance', 'Finance', true),
  ('content_editor', 'Content Editor', true),
  ('viewer', 'View Only', true)
on conflict (key) do nothing;

create or replace function private.c10_grant_role(target_role text, permission_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.role_permissions (role_id, permission_id)
  select r.id, p.id
    from public.roles as r
    join public.permissions as p on p.key = any (permission_keys)
   where r.key = target_role
  on conflict do nothing;
end;
$$;

select private.c10_grant_role('project_manager', array[
  'leads.read', 'leads.write', 'leads.assign', 'leads.convert', 'leads.attachments.read',
  'clients.read', 'clients.write',
  'operations.projects.read', 'operations.projects.write',
  'partners.read', 'partners.write', 'contractors.assign',
  'procurement.materials.read', 'procurement.materials.write',
  'procurement.orders.read', 'procurement.orders.write', 'procurement.orders.issue', 'procurement.receipts.write',
  'finance.invoices.read',
  'content.read', 'media.read',
  'website.read',
  'analytics.read',
  'notifications.read', 'notifications.manage',
  'settings.business.read', 'audit.read'
]);

select private.c10_grant_role('finance', array[
  'finance.invoices.read', 'finance.invoices.write', 'finance.invoices.issue', 'finance.payments.write', 'finance.invoices.void',
  'contractors.payments.write',
  'clients.read', 'operations.projects.read', 'partners.read',
  'procurement.orders.read', 'procurement.materials.read',
  'analytics.read', 'analytics.finance.read',
  'notifications.read', 'notifications.manage',
  'settings.business.read', 'settings.system.read', 'audit.read'
]);

select private.c10_grant_role('content_editor', array[
  'content.read', 'content.write', 'content.publish', 'content.archive', 'claims.verify',
  'media.read', 'media.upload', 'media.manage',
  'website.read', 'website.manage', 'website.pages.write', 'website.layout.write', 'website.publish', 'website.navigation.write', 'website.seo.write',
  'settings.website.read', 'settings.legal.read',
  'analytics.read', 'analytics.website.read',
  'notifications.read', 'notifications.manage',
  'settings.business.read'
]);

select private.c10_grant_role('viewer', array[
  'leads.read', 'clients.read', 'operations.projects.read', 'partners.read',
  'procurement.materials.read', 'procurement.orders.read',
  'finance.invoices.read', 'content.read', 'media.read', 'website.read',
  'analytics.read', 'notifications.read',
  'settings.business.read', 'settings.website.read', 'settings.legal.read', 'settings.system.read'
]);

drop function private.c10_grant_role(text, text[]);

-- Only the owner manages users.
delete from public.role_permissions as rp
 using public.roles as r, public.permissions as p
 where rp.role_id = r.id and rp.permission_id = p.id
   and r.key = 'admin'
   and p.key in ('users.invite', 'users.disable');

-- ---------------------------------------------------------------- profiles
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'C10: set when the owner issues a temporary password; the first sign-in must replace it before any protected facade answers. Never holds the password.';

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
        and profiles.must_change_password = false
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
        and profiles.must_change_password = false
    )
    and private.has_aal2()
  order by roles.key, permissions.key;
$$;

-- The current user's own gate state (no permission needed; own row only).
create or replace function public.current_user_password_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object('must_change_password', p.must_change_password, 'account_status', p.account_status)
      from public.profiles as p
     where p.id = auth.uid()
  ), jsonb_build_object('must_change_password', false, 'account_status', null));
$$;
revoke all on function public.current_user_password_state() from public, anon;
grant execute on function public.current_user_password_state() to authenticated;

-- Called by the app right after supabase.auth.updateUser({ password }) succeeded.
create or replace function public.complete_password_change()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.has_aal2() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Sign in with your authenticator first.')));
  end if;
  update public.profiles
     set must_change_password = false, version = version + 1, updated_at = now()
   where id = auth.uid() and must_change_password = true;
  perform private.s4_audit('staff.password_changed', 'profile', auth.uid()::text, 'success', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

-- ---------------------------------------------------------------- owner facades
create or replace function private.c10_can_manage_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('staff.manage') and private.is_current_super_admin();
$$;
revoke all on function private.c10_can_manage_staff() from public, anon, authenticated;

-- After the server-only Auth Admin createUser: name, first-login gate, role.
create or replace function public.admin_prepare_staff_profile(
  target_user_id uuid,
  target_display_name text,
  requested_role_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_row record;
begin
  if not private.c10_can_manage_staff() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Only the owner (Super Admin) can create staff.')));
  end if;
  if target_display_name is null or btrim(target_display_name) = '' or char_length(btrim(target_display_name)) > 80 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'display_name', 'Enter the staff member''s name (up to 80 characters).')));
  end if;
  select * into role_row from public.roles where key = requested_role_key;
  if role_row.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'role', 'Choose an approved role.')));
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'user', 'The account was not created.')));
  end if;
  update public.profiles
     set display_name = btrim(target_display_name),
         account_status = 'pending_mfa',
         must_change_password = true,
         version = version + 1,
         updated_at = now()
   where id = target_user_id;
  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles (user_id, role_id, granted_by)
  values (target_user_id, role_row.id, auth.uid())
  on conflict do nothing;
  perform private.s4_audit('staff.create', 'profile', target_user_id::text, 'success', jsonb_build_object('role', requested_role_key));
  perform private.settings_touch('staff', 'updated');
  return jsonb_build_object('ok', true, 'id', target_user_id, 'role', requested_role_key);
end;
$$;
revoke all on function public.admin_prepare_staff_profile(uuid, text, text) from public, anon;
grant execute on function public.admin_prepare_staff_profile(uuid, text, text) to authenticated;

create or replace function public.admin_update_staff_profile(target_user_id uuid, target_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.c10_can_manage_staff() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Only the owner (Super Admin) can edit staff.')));
  end if;
  if target_display_name is null or btrim(target_display_name) = '' or char_length(btrim(target_display_name)) > 80 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'display_name', 'Enter a name (up to 80 characters).')));
  end if;
  update public.profiles set display_name = btrim(target_display_name), version = version + 1, updated_at = now() where id = target_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'user', 'Staff member not found.')));
  end if;
  perform private.s4_audit('staff.profile_update', 'profile', target_user_id::text, 'success', '{}'::jsonb);
  perform private.settings_touch('staff', 'updated');
  return jsonb_build_object('ok', true, 'id', target_user_id);
end;
$$;
revoke all on function public.admin_update_staff_profile(uuid, text) from public, anon;
grant execute on function public.admin_update_staff_profile(uuid, text) to authenticated;

-- After the server-only Auth Admin password reset: gate the next sign-in.
create or replace function public.admin_require_password_change(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.c10_can_manage_staff() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Only the owner (Super Admin) can reset a password.')));
  end if;
  if target_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'user', 'Change your own password from Security, not from the staff list.')));
  end if;
  update public.profiles set must_change_password = true, version = version + 1, updated_at = now() where id = target_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'user', 'Staff member not found.')));
  end if;
  perform private.s4_audit('staff.password_reset', 'profile', target_user_id::text, 'success', '{}'::jsonb);
  perform private.settings_touch('staff', 'updated');
  return jsonb_build_object('ok', true, 'id', target_user_id);
end;
$$;
revoke all on function public.admin_require_password_change(uuid) from public, anon;
grant execute on function public.admin_require_password_change(uuid) to authenticated;

-- Roles: every approved role, still owner-only, still never your own.
create or replace function public.set_staff_role(target_user_id uuid, requested_role_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing text;
begin
  if not private.c10_can_manage_staff() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'Only the owner (Super Admin) can change roles.')));
  end if;
  if not exists (select 1 from public.roles where key = requested_role_key) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'role', 'Role is not admitted.')));
  end if;
  if target_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'role', 'Ask another Super Admin to change your own role.')));
  end if;
  for existing in select r.key from public.user_roles as ur join public.roles as r on r.id = ur.role_id where ur.user_id = target_user_id loop
    if existing <> requested_role_key then
      perform public.remove_user_role(target_user_id, existing);
    end if;
  end loop;
  if not exists (select 1 from public.user_roles as ur join public.roles as r on r.id = ur.role_id where ur.user_id = target_user_id and r.key = requested_role_key) then
    perform public.assign_user_role(target_user_id, requested_role_key);
  end if;
  perform private.s4_audit('staff.role_change', 'profile', target_user_id::text, 'success', jsonb_build_object('role', requested_role_key));
  perform private.settings_touch('staff', 'updated');
  return jsonb_build_object('ok', true, 'id', target_user_id, 'role', requested_role_key);
end;
$$;

-- ---------------------------------------------------------------- register
create or replace function public.admin_list_staff()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('staff.read') then
    raise exception using errcode = '42501', message = 'staff register is not authorized';
  end if;
  return jsonb_build_object(
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'display_name', p.display_name, 'email', u.email, 'account_status', p.account_status,
        'must_change_password', p.must_change_password,
        'roles', coalesce((select jsonb_agg(r.key order by r.key) from public.user_roles as ur join public.roles as r on r.id = ur.role_id where ur.user_id = p.id), '[]'::jsonb),
        'mfa_enrolled', exists (select 1 from auth.mfa_factors as f where f.user_id = p.id and f.status = 'verified'),
        'last_sign_in_at', u.last_sign_in_at, 'created_at', p.created_at,
        'last_activity_at', (select max(occurred_at) from public.audit_logs as a where a.actor_id = p.id),
        'is_self', p.id = auth.uid()
      ) order by p.display_name, u.email)
      from public.profiles as p join auth.users as u on u.id = p.id), '[]'::jsonb),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', r.key, 'display_name', r.display_name, 'is_system', r.is_system,
        'permissions', coalesce((select jsonb_agg(p.key order by p.key) from public.role_permissions as rp join public.permissions as p on p.id = rp.permission_id where rp.role_id = r.id), '[]'::jsonb)
      ) order by r.key)
      from public.roles as r), '[]'::jsonb),
    'active_super_admins', (
      select count(*) from public.user_roles as ur
        join public.roles as r on r.id = ur.role_id
        join public.profiles as p on p.id = ur.user_id
       where r.key = 'super_admin' and p.account_status = 'active'
    ),
    'can_manage', private.c10_can_manage_staff()
  );
end;
$$;

-- ---------------------------------------------------------------- MFA enrolment audit
-- Enrolment used to ask the browser to call record_audit_event (audit.write),
-- which a role template without audit.write — or an account still holding a
-- temporary password — cannot do. The activation facade records the event
-- itself, server-side, exactly once per transition.
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
    perform private.s4_audit('mfa.enroll', 'profile', auth.uid()::text, 'success', '{}'::jsonb);
    return true;
  end if;

  return exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.account_status = 'active'
  );
end;
$$;

-- ---------------------------------------------------------------- session audit
-- Sign-in verification and sign-out are audited by every staff member,
-- including roles without audit.write and accounts still holding a
-- temporary password; the action vocabulary is closed.
create or replace function public.record_session_event(event_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'session audit requires a signed-in user';
  end if;
  if event_action not in ('mfa.verify', 'auth.sign_out') then
    raise exception using errcode = '22023', message = 'session event is not admitted';
  end if;
  perform private.s4_audit(event_action, 'auth_session', 'current', 'success', '{}'::jsonb);
end;
$$;
revoke all on function public.record_session_event(text) from public, anon;
grant execute on function public.record_session_event(text) to authenticated;
