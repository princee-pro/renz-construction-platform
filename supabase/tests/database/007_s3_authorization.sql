begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

select is(
  (select array_agg(key order by key) from public.roles),
  array['admin', 'content_editor', 'finance', 'project_manager', 'super_admin', 'viewer']::text[],
  'S3 role vocabulary is admin and super_admin plus the C10 role templates'
);

select is(
  (select array_agg(key order by key) from public.permissions),
  array[
    'analytics.finance.read', 'analytics.read', 'analytics.website.read',
    'audit.read', 'audit.write', 'claims.verify', 'clients.read', 'clients.write',
    'content.archive', 'content.publish', 'content.read', 'content.write',
    'contractors.assign', 'contractors.payments.write',
    'finance.invoices.issue', 'finance.invoices.read', 'finance.invoices.void',
    'finance.invoices.write', 'finance.payments.write',
    'leads.assign', 'leads.attachments.read', 'leads.convert', 'leads.read', 'leads.write',
    'media.manage', 'media.read', 'media.upload', 'notifications.manage', 'notifications.read', 'operations.projects.read',
    'operations.projects.write', 'partners.read', 'partners.write',
    'procurement.materials.read', 'procurement.materials.write', 'procurement.orders.issue',
    'procurement.orders.read', 'procurement.orders.write', 'procurement.receipts.write',
    'roles.manage', 'roles.read',
    'security.manage', 'settings.business.read', 'settings.business.write', 'settings.legal.publish',
    'settings.legal.read', 'settings.legal.write', 'settings.system.read', 'settings.system.write',
    'settings.website.read', 'settings.website.write', 'staff.manage', 'staff.read',
    'users.disable', 'users.invite', 'users.read',
    'website.layout.write', 'website.manage', 'website.navigation.write', 'website.pages.write',
    'website.publish', 'website.read', 'website.seo.write'
  ]::text[],
  'S3+S4+C4+C5+C6 permission vocabulary is bounded to identity, editorial, media, CRM, finance, and delivery operations'
);

select is(
  (
    select count(*)
    from public.role_permissions
    join public.roles on roles.id = role_permissions.role_id
    where roles.key = 'super_admin'
  ),
  63::bigint,
  'super_admin receives every approved S3+S4+C4+C5+C6+C9 permission'
);

select is(
  (
    select count(*)
    from public.role_permissions
    join public.roles on roles.id = role_permissions.role_id
    join public.permissions on permissions.id = role_permissions.permission_id
    where roles.key = 'admin'
      and permissions.key <> 'roles.manage'
  ),
  49::bigint,
  'admin receives only conservative S3+S4+C4+C5+C6 draft/media/CRM/billing/delivery permissions (never finance.invoices.void; C10: never users.invite / users.disable)'
);

select is(
  (
    select count(*)
    from public.role_permissions
    join public.roles on roles.id = role_permissions.role_id
    join public.permissions on permissions.id = role_permissions.permission_id
    where permissions.key in ('orders.manage', 'invoices.manage')
  ),
  0::bigint,
  'future product capabilities remain absent while S4 editorial capabilities are explicit'
);

select ok(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'roles', 'permissions', 'role_permissions', 'user_roles', 'audit_logs')
  ) >= 6,
  'S3 identity policies remain present alongside S4 projection policies'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'current_user_has_permission', 'current_user_access',
        'activate_current_profile', 'assign_invited_admin', 'disable_user',
        'assign_user_role', 'remove_user_role'
      )
      and pg_proc.prosecdef
  ),
  7::bigint,
  'all public S3 facades are reviewed SECURITY DEFINER functions'
);

select ok(
  not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'current_user_has_permission', 'current_user_access',
        'activate_current_profile', 'assign_invited_admin', 'disable_user',
        'assign_user_role', 'remove_user_role'
      )
      and has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
  ),
  'anon cannot execute any S3 authorization facade'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'current_user_has_permission', 'current_user_access',
        'activate_current_profile', 'assign_invited_admin', 'disable_user',
        'assign_user_role', 'remove_user_role'
      )
      and has_function_privilege('authenticated', pg_proc.oid, 'EXECUTE')
  ),
  7::bigint,
  'authenticated can execute only the seven narrow S3 authorization facades'
);

select ok(
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'record_audit_event'
      and has_function_privilege('authenticated', pg_proc.oid, 'EXECUTE')
      and not has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
  ),
  'only authenticated callers receive the narrow redacted audit writer facade'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'private'
      and pg_proc.prosecdef
      and pg_proc.proconfig = array['search_path=""']::text[]
  ),
  88::bigint,
  'S3+S4+C4+C9 authorization, integrity, analytics, notification and trigger helpers use SECURITY DEFINER with an empty search_path'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles retains RLS'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.roles'::regclass),
  'roles retains RLS'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.permissions'::regclass),
  'permissions retains RLS'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass),
  'audit logs retain RLS'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ),
  'new Auth users receive a structural profile through the reviewed trigger'
);

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_account_status_values_check'
  ),
  'profile status is constrained to the reviewed lifecycle states'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'user_roles_prevent_last_super_admin'
  )
  and exists (
    select 1
    from pg_trigger
    where tgname = 'profiles_prevent_last_super_admin_disable'
  )
  and exists (
    select 1
    from pg_trigger
    where tgname = 'profiles_prevent_last_super_admin_delete'
  ),
  'last active super_admin safeguards cover role removal, disablement, and profile deletion'
);

select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'INSERT')
    and not has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.audit_logs', 'DELETE'),
  'authenticated cannot directly mutate audit rows'
);

select is(
  public.current_user_has_permission('users.read'),
  false,
  'permission helper fails closed without an authenticated actor'
);

select is(
  (select count(*) from public.current_user_access()),
  0::bigint,
  'current access facade returns no access without a verified actor'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'leads', 'lead_project_details', 'lead_service_details', 'lead_material_items',
        'lead_attachments', 'lead_notes', 'lead_stage_history', 'lead_events', 'lead_contact_logs',
        'lead_upload_sessions', 'intake_rate_limits', 'lead_reference_counters', 'intake_settings'
      )
  ),
  0::bigint,
  'future lead/product domains remain default-deny after S4'
);

select ok(
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'private'
      and pg_proc.proname = 'bootstrap_super_admin'
      and pg_proc.prosecdef
      and pg_proc.proconfig = array['search_path=""']::text[]
      and not has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', pg_proc.oid, 'EXECUTE')
  ),
  'bootstrap helper is an unexposed SECURITY DEFINER operation with no browser execution grant'
);

insert into auth.users (id)
values ('97000000-0000-4000-8000-000000000003');

select lives_ok(
  $$select private.bootstrap_super_admin('97000000-0000-4000-8000-000000000003'::uuid)$$,
  'operator bootstrap assigns the first Super Admin through the reviewed transaction'
);

select is(
  (
    select count(*)
    from public.user_roles
    join public.roles on roles.id = user_roles.role_id
    join public.profiles on profiles.id = user_roles.user_id
    where roles.key = 'super_admin'
      and user_roles.user_id = '97000000-0000-4000-8000-000000000003'
      and profiles.account_status = 'pending_mfa'
  ),
  1::bigint,
  'bootstrap creates one pending-MFA Super Admin assignment'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where action = 'super_admin.bootstrap'
      and entity_type = 'user_role'
      and entity_id = '97000000-0000-4000-8000-000000000003'
      and outcome = 'success'
      and actor_id is null
      and metadata = '{"source":"operator-bootstrap"}'::jsonb
  ),
  'bootstrap writes only a bounded redacted audit marker'
);

select throws_ok(
  $$select private.bootstrap_super_admin('97000000-0000-4000-8000-000000000003'::uuid)$$,
  '42501',
  null,
  'bootstrap refuses a second Super Admin assignment'
);

select lives_ok(
  $$delete from public.user_roles
    where user_id = '97000000-0000-4000-8000-000000000003'$$,
  'a pending-MFA Super Admin assignment may be removed before activation'
);

insert into auth.users (id)
values
  ('97000000-0000-4000-8000-000000000001'),
  ('97000000-0000-4000-8000-000000000002');

update public.profiles
   set account_status = 'active', version = version + 1
 where id in (
   '97000000-0000-4000-8000-000000000001',
   '97000000-0000-4000-8000-000000000002'
 );

insert into public.user_roles (user_id, role_id)
select user_id, roles.id
from (values
  ('97000000-0000-4000-8000-000000000001'::uuid),
  ('97000000-0000-4000-8000-000000000002'::uuid)
) as actors(user_id)
cross join public.roles
where roles.key = 'super_admin';

select lives_ok(
  $$delete from public.user_roles
    where user_id = '97000000-0000-4000-8000-000000000001'$$,
  'one of two active super_admin assignments may be removed'
);

select throws_ok(
  $$delete from public.user_roles
    where user_id = '97000000-0000-4000-8000-000000000002'$$,
  '23514',
  null,
  'the last active super_admin assignment cannot be removed'
);

select throws_ok(
  $$update public.profiles
      set account_status = 'disabled', version = version + 1
    where id = '97000000-0000-4000-8000-000000000002'$$,
  '23514',
  null,
  'the last active super_admin cannot be disabled'
);

select throws_ok(
  $$delete from public.profiles
    where id = '97000000-0000-4000-8000-000000000002'$$,
  '23514',
  null,
  'the last active super_admin profile cannot be deleted'
);

select * from finish();
rollback;
