begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- ---------------------------------------------------------------------
-- Function security shape
-- ---------------------------------------------------------------------

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_clients_overview', 'admin_list_clients', 'admin_list_active_clients_for_picker',
        'admin_get_client', 'find_possible_duplicate_clients', 'create_admin_client',
        'update_admin_client', 'archive_admin_client', 'create_client_note',
        'admin_operations_overview', 'admin_action_queue', 'admin_recent_activity',
        'admin_list_operational_projects', 'admin_get_operational_project',
        'create_admin_operational_project', 'update_admin_operational_project',
        'change_operational_project_status', 'change_operational_project_phase',
        'change_operational_project_priority', 'archive_admin_operational_project',
        'create_operational_project_note', 'link_operational_project_case_study',
        'unlink_operational_project_case_study', 'create_case_study_draft_from_operational_project',
        'admin_global_quick_find'
      )
      and pg_proc.prosecdef
      and pg_proc.proconfig = array['search_path=""']::text[]
  ),
  25::bigint,
  'all C4 administration facades are SECURITY DEFINER with an empty search path'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_clients_overview', 'admin_list_clients', 'admin_list_active_clients_for_picker',
        'admin_get_client', 'find_possible_duplicate_clients', 'create_admin_client',
        'update_admin_client', 'archive_admin_client', 'create_client_note',
        'admin_operations_overview', 'admin_action_queue', 'admin_recent_activity',
        'admin_list_operational_projects', 'admin_get_operational_project',
        'create_admin_operational_project', 'update_admin_operational_project',
        'change_operational_project_status', 'change_operational_project_phase',
        'change_operational_project_priority', 'archive_admin_operational_project',
        'create_operational_project_note', 'link_operational_project_case_study',
        'unlink_operational_project_case_study', 'create_case_study_draft_from_operational_project',
        'admin_global_quick_find'
      )
      and has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
  ),
  0::bigint,
  'anonymous callers cannot execute any C4 administration facade'
);

select ok(
  not has_table_privilege('anon', 'public.clients', 'SELECT'),
  'anonymous callers cannot select public.clients'
);
select ok(
  not has_table_privilege('anon', 'public.operational_projects', 'SELECT'),
  'anonymous callers cannot select public.operational_projects'
);
select ok(
  not has_table_privilege('anon', 'public.client_notes', 'SELECT'),
  'anonymous callers cannot select public.client_notes'
);
select ok(
  not has_table_privilege('anon', 'public.operational_project_notes', 'SELECT'),
  'anonymous callers cannot select public.operational_project_notes'
);
select ok(
  not has_table_privilege('anon', 'public.realtime_events', 'SELECT'),
  'anonymous callers cannot select public.realtime_events'
);
select ok(
  has_table_privilege('authenticated', 'public.realtime_events', 'SELECT'),
  'authenticated callers may attempt to select public.realtime_events (RLS still gates rows to active AAL2 staff)'
);

-- ---------------------------------------------------------------------
-- Synthetic active AAL2 super_admin actor
-- ---------------------------------------------------------------------

insert into auth.users (id)
values ('97000000-0000-4000-8000-000000000001');

update public.profiles
set account_status = 'active', version = version + 1
where id = '97000000-0000-4000-8000-000000000001';

insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-000000000001', roles.id
from public.roles
where roles.key = 'super_admin';

create temporary table c4_state (
  key text primary key,
  value jsonb not null
);

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

-- ---------------------------------------------------------------------
-- Client domain
-- ---------------------------------------------------------------------

insert into c4_state (key, value)
values ('client_missing_contact', public.create_admin_client('SYNTHETIC C4 Client No Contact'));

select is(
  (select value ->> 'ok' from c4_state where key = 'client_missing_contact'),
  'false',
  'a client with neither email nor phone is rejected'
);
select is(
  (select value -> 'reasons' -> 0 ->> 'code' from c4_state where key = 'client_missing_contact'),
  'missing_contact_method',
  'the rejected client reports a missing_contact_method reason code'
);

insert into c4_state (key, value)
values (
  'client',
  public.create_admin_client(
    'SYNTHETIC C4 Client Person', 'synthetic.c4.client@example.test', '+44 7000 000001',
    'Synthetic address', 'SYNTHETIC Company Ltd', 'vip', 'Synthetic referral', 'SYNTH-C4-001', null
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'client'),
  'true',
  'an active AAL2 super admin can create a client with a valid contact method'
);

select is(
  (
    select client_tier from public.clients
    where id = (select (value ->> 'id')::uuid from c4_state where key = 'client')
  ),
  'vip',
  'the created client persists the requested tier'
);

insert into c4_state (key, value)
values (
  'duplicates',
  public.find_possible_duplicate_clients('SYNTHETIC C4 Client Person', 'synthetic.c4.client@example.test', null)
);

select ok(
  jsonb_array_length((select value from c4_state where key = 'duplicates')) >= 1,
  'duplicate detection finds the just-created client by normalized email'
);

-- This consumes version 1 -> 2; the later 'client_update_conflict' call below
-- reuses version 1 and is thereby provably stale.
insert into c4_state (key, value)
values (
  'client_update',
  public.update_admin_client(
    (select (value ->> 'id')::uuid from c4_state where key = 'client'),
    1, 'SYNTHETIC C4 Client Person (renamed)', 'synthetic.c4.client@example.test', '+44 7000 000001',
    'Synthetic address', 'SYNTHETIC Company Ltd', 'premium', null, null
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'client_update'),
  'true',
  'a valid expected-version client update succeeds'
);

insert into c4_state (key, value)
values (
  'client_update_conflict',
  public.update_admin_client(
    (select (value ->> 'id')::uuid from c4_state where key = 'client'),
    1, 'SYNTHETIC C4 Client Person (stale)', 'synthetic.c4.client@example.test', '+44 7000 000001',
    'Synthetic address', 'SYNTHETIC Company Ltd', 'standard', null, null
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'client_update_conflict'),
  'false',
  'a stale expected-version client update is rejected'
);
select is(
  (select value -> 'reasons' -> 0 ->> 'code' from c4_state where key = 'client_update_conflict'),
  'version_conflict',
  'the stale client update reports a version_conflict reason code'
);

-- ---------------------------------------------------------------------
-- Operational project domain
-- ---------------------------------------------------------------------

insert into c4_state (key, value)
values (
  'project_bad_client',
  public.create_admin_operational_project(
    '00000000-0000-4000-8000-000000000000', 'SYNTHETIC C4 Project (bad client)'
  )
);

select is(
  (select value -> 'reasons' -> 0 ->> 'code' from c4_state where key = 'project_bad_client'),
  'not_found',
  'creating a project for a non-existent client is rejected'
);

insert into c4_state (key, value)
values (
  'project',
  public.create_admin_operational_project(
    (select (value ->> 'id')::uuid from c4_state where key = 'client'),
    'SYNTHETIC C4 Project', 'SYNTHETIC description', 'planning', 'design', 'high',
    '2025-01-01'::date, '2025-06-01'::date, 5000000::numeric, 'rwf'
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'project'),
  'true',
  'an active AAL2 super admin can create an operational project for an active client'
);

select is(
  (
    select budget_currency from public.operational_projects
    where id = (select (value ->> 'id')::uuid from c4_state where key = 'project')
  ),
  'RWF',
  'the operational project normalizes currency to uppercase'
);

insert into c4_state (key, value)
values (
  'project_bad_budget',
  public.create_admin_operational_project(
    (select (value ->> 'id')::uuid from c4_state where key = 'client'),
    'SYNTHETIC C4 Project (bad budget)', null, 'planning', 'design', 'medium',
    null, null, 1000::numeric, null
  )
);

select is(
  (select value -> 'reasons' -> 0 ->> 'code' from c4_state where key = 'project_bad_budget'),
  'invalid_input',
  'a budget amount without a currency is rejected'
);

select is(
  jsonb_array_length(
    public.admin_list_operational_projects(search_query => 'SYNTHETIC C4 Project') -> 'items'
  ),
  1,
  'the bounded project register returns exactly the one fully-created synthetic project'
);

insert into c4_state (key, value)
values (
  'status_change',
  public.change_operational_project_status(
    (select (value ->> 'id')::uuid from c4_state where key = 'project'), 1, 'in_progress'
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'status_change'),
  'true',
  'a valid status transition succeeds'
);

select is(
  (
    select to_status from public.operational_project_status_history
    where project_id = (select (value ->> 'id')::uuid from c4_state where key = 'project')
    order by id desc limit 1
  ),
  'in_progress',
  'the status transition is recorded in status history'
);

insert into c4_state (key, value)
values (
  'phase_change',
  public.change_operational_project_phase(
    (select (value ->> 'id')::uuid from c4_state where key = 'project'), 2, 'planning'
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'phase_change'),
  'true',
  'a valid phase transition succeeds'
);

select is(
  (
    select count(*) from public.operational_project_phase_history
    where project_id = (select (value ->> 'id')::uuid from c4_state where key = 'project')
  ),
  2::bigint,
  'the phase history records both the creation phase and the transition'
);

insert into c4_state (key, value)
values (
  'note',
  public.create_operational_project_note(
    (select (value ->> 'id')::uuid from c4_state where key = 'project'),
    'SYNTHETIC project note body used only for the C4 acceptance test.'
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'note'),
  'true',
  'a project note can be created'
);

insert into c4_state (key, value)
values (
  'link_missing',
  public.link_operational_project_case_study(
    (select (value ->> 'id')::uuid from c4_state where key = 'project'), 3,
    '00000000-0000-4000-8000-000000000000'
  )
);

select is(
  (select value -> 'reasons' -> 0 ->> 'code' from c4_state where key = 'link_missing'),
  'not_found',
  'linking a non-existent public case study is rejected'
);

-- ---------------------------------------------------------------------
-- Archive semantics
-- ---------------------------------------------------------------------

insert into c4_state (key, value)
values (
  'archive_project',
  public.archive_admin_operational_project(
    (select (value ->> 'id')::uuid from c4_state where key = 'project'), 3
  )
);

select is(
  (select value ->> 'ok' from c4_state where key = 'archive_project'),
  'true',
  'an operational project can be archived'
);

select ok(
  (
    select count(*) from public.operational_projects
    where id = (select (value ->> 'id')::uuid from c4_state where key = 'project')
      and archived_at is not null
      and client_id is not null
  ) = 1,
  'archiving a project keeps its client relationship and history intact'
);

insert into c4_state (key, value)
values (
  'archive_client',
  public.archive_admin_client((select (value ->> 'id')::uuid from c4_state where key = 'client'), 2)
);

select is(
  (select value ->> 'ok' from c4_state where key = 'archive_client'),
  'true',
  'a client can be archived'
);

select ok(
  not exists (
    select 1 from jsonb_array_elements(
      public.admin_list_active_clients_for_picker(search_query => 'SYNTHETIC C4 Client Person')
    ) as picker_row
    where picker_row ->> 'id' = (select (value ->> 'id')::text from c4_state where key = 'client')
  ),
  'an archived client never appears in the active client picker'
);

select * from finish();

rollback;
