begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- ---------------------------------------------------------------------
-- C10 owner-controlled staff access: role templates, first-login password
-- gate, owner-only facades, privilege-escalation and lockout protection.
-- ---------------------------------------------------------------------

select is(
  (select array_agg(key order by key) from public.roles where is_system),
  array['admin', 'content_editor', 'finance', 'project_manager', 'super_admin', 'viewer']::text[],
  'C10 role templates are system roles beside super_admin and admin'
);

select is(
  (select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.key = 'admin' and p.key in ('users.invite', 'users.disable', 'staff.manage', 'roles.manage')),
  0::bigint,
  'admin cannot invite, disable or manage staff — only the owner does'
);

select is(
  (select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.key = 'viewer' and p.key not like '%.read'),
  0::bigint,
  'viewer holds read permissions only'
);

select is(
  (select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.key = 'finance' and p.key in ('staff.manage', 'content.write', 'website.publish', 'clients.write')),
  0::bigint,
  'finance cannot manage staff, content, website or clients'
);

select is(
  (select count(*) from public.role_permissions rp join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
   where r.key = 'content_editor' and p.key like 'finance.%'),
  0::bigint,
  'content_editor has no finance permission'
);

select has_column('public', 'profiles', 'must_change_password', 'profiles carry the first-login password gate');

-- Actors -----------------------------------------------------------------
insert into auth.users (id, email) values
  ('98000000-0000-4000-8000-0000000000a1', 'c10-owner@example.test'),      -- super_admin (owner)
  ('98000000-0000-4000-8000-0000000000a2', 'c10-admin@example.test'),      -- admin (not owner)
  ('98000000-0000-4000-8000-0000000000a3', 'c10-new@example.test'),        -- newly created staff (temporary password)
  ('98000000-0000-4000-8000-0000000000a4', 'c10-finance@example.test');    -- finance template

update public.profiles set account_status = 'active', version = version + 1
where id in ('98000000-0000-4000-8000-0000000000a1', '98000000-0000-4000-8000-0000000000a2', '98000000-0000-4000-8000-0000000000a4');

insert into public.user_roles (user_id, role_id)
select '98000000-0000-4000-8000-0000000000a1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id)
select '98000000-0000-4000-8000-0000000000a2', id from public.roles where key = 'admin';
insert into public.user_roles (user_id, role_id)
select '98000000-0000-4000-8000-0000000000a4', id from public.roles where key = 'finance';

-- The owner prepares the new staff profile (after the server-only createUser).
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;

select is(
  (public.admin_prepare_staff_profile('98000000-0000-4000-8000-0000000000a3', 'SYNTHETIC New Staff', 'project_manager')) ->> 'ok',
  'true',
  'the owner prepares a new staff profile with a role template'
);
select is(
  (select must_change_password from public.profiles where id = '98000000-0000-4000-8000-0000000000a3'),
  true,
  'a prepared staff profile must change its temporary password'
);
select is(
  (select account_status from public.profiles where id = '98000000-0000-4000-8000-0000000000a3'),
  'pending_mfa',
  'a prepared staff profile waits for MFA enrolment'
);
select is(
  (select r.key from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = '98000000-0000-4000-8000-0000000000a3'),
  'project_manager',
  'the template role is assigned'
);
select is(
  (public.admin_prepare_staff_profile('98000000-0000-4000-8000-0000000000a3', '', 'viewer')) ->> 'ok',
  'false',
  'an empty name is refused'
);
select is(
  (public.admin_prepare_staff_profile('98000000-0000-4000-8000-0000000000a3', 'X', 'not-a-role')) ->> 'ok',
  'false',
  'an unknown role is refused'
);
select is(
  (public.set_staff_role('98000000-0000-4000-8000-0000000000a4', 'content_editor')) ->> 'ok',
  'true',
  'the owner may move a staff member to another template'
);
select is(
  (public.set_staff_role('98000000-0000-4000-8000-0000000000a1', 'admin')) ->> 'ok',
  'false',
  'the owner cannot change their own role'
);
select is(
  (public.admin_require_password_change('98000000-0000-4000-8000-0000000000a4')) ->> 'ok',
  'true',
  'the owner can require a password change (after the server-only reset)'
);
select is(
  (public.admin_require_password_change('98000000-0000-4000-8000-0000000000a1')) ->> 'ok',
  'false',
  'the owner cannot reset their own password from the staff list'
);
select is(
  (public.admin_update_staff_profile('98000000-0000-4000-8000-0000000000a4', 'SYNTHETIC Renamed')) ->> 'ok',
  'true',
  'the owner can rename a staff member'
);
select is(
  (select (public.admin_list_staff() -> 'roles') @> '[{"key":"viewer"}]'::jsonb),
  true,
  'the staff register lists the role templates with their permission sets'
);
select is(
  (select jsonb_typeof(public.admin_list_staff() -> 'active_super_admins')),
  'number',
  'the register reports how many owners are active (lockout guard hint)'
);
select is(
  (select count(*) from public.audit_logs where action in ('staff.create', 'staff.role_change', 'staff.password_reset', 'staff.profile_update')),
  4::bigint,
  'every owner action is audited'
);
select is(
  (select count(*) from public.audit_logs where metadata::text ilike '%password%' and action = 'staff.password_reset' and metadata <> '{}'::jsonb),
  0::bigint,
  'the password reset audit carries no password material'
);

-- Password gate: the new staff member has no permission while the flag is set.
reset role;
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-0000000000a4","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select is(public.current_user_has_permission('content.read'), false, 'a staff member who must change their password holds no permission, even at AAL2');
select is((select count(*) from public.current_user_access()), 0::bigint, 'current_user_access grants nothing while the password change is pending');
select is((public.current_user_password_state() ->> 'must_change_password'), 'true', 'the current user can read their own gate state');
select is((public.complete_password_change()) ->> 'ok', 'true', 'the current user clears their own gate after changing the password');
select is(public.current_user_has_permission('content.read'), true, 'permissions return once the password is changed');

-- Non-owner admin cannot manage staff.
reset role;
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-0000000000a2","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select is((public.admin_prepare_staff_profile('98000000-0000-4000-8000-0000000000a3', 'X', 'super_admin')) ->> 'ok', 'false', 'an admin cannot create staff (nor a super admin)');
select is((public.set_staff_role('98000000-0000-4000-8000-0000000000a4', 'super_admin')) ->> 'ok', 'false', 'an admin cannot promote anyone to super admin');
select is((public.admin_require_password_change('98000000-0000-4000-8000-0000000000a4')) ->> 'ok', 'false', 'an admin cannot reset another staff password');
select throws_ok(
  $$ select public.disable_user('98000000-0000-4000-8000-0000000000a1') $$,
  '42501',
  'user disablement is not authorized',
  'an admin cannot disable the owner'
);

reset role;
select * from finish();
rollback;
