begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

-- =====================================================================
-- C4 security negative tests (brief §68) and database constraints (§69).
--
-- Every actor below is synthetic and the whole file rolls back. Each denial
-- is asserted through the same SECURITY DEFINER facades a signed-in browser
-- session calls, so a regression in private.has_permission / has_aal2 or in
-- a facade's guard clause is caught here, not in production.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Fixture: a fully authorized super_admin seeds one client + one project,
-- so the denied actors below have real records to be denied against.
-- ---------------------------------------------------------------------

insert into auth.users (id) values
  ('97000000-0000-4000-8000-0000000000a1'), -- super_admin (seeder)
  ('97000000-0000-4000-8000-0000000000a2'), -- admin, AAL1 only
  ('97000000-0000-4000-8000-0000000000a3'), -- admin, disabled
  ('97000000-0000-4000-8000-0000000000a4'), -- synthetic role: no clients.read
  ('97000000-0000-4000-8000-0000000000a5'), -- synthetic role: no clients.write
  ('97000000-0000-4000-8000-0000000000a6'), -- synthetic role: no operations.projects.read
  ('97000000-0000-4000-8000-0000000000a7'); -- synthetic role: no operations.projects.write

update public.profiles set account_status = 'active', version = version + 1
where id in (
  '97000000-0000-4000-8000-0000000000a1', '97000000-0000-4000-8000-0000000000a2',
  '97000000-0000-4000-8000-0000000000a4', '97000000-0000-4000-8000-0000000000a5',
  '97000000-0000-4000-8000-0000000000a6', '97000000-0000-4000-8000-0000000000a7'
);
update public.profiles set account_status = 'disabled', version = version + 1
where id = '97000000-0000-4000-8000-0000000000a3';

insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000a1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000a2', id from public.roles where key = 'admin';
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000a3', id from public.roles where key = 'admin';

-- Synthetic narrow roles. Each holds every C4 permission EXCEPT the one
-- under test, proving that specific permission is what gates the facade.
insert into public.roles (key, display_name) values
  ('c4-test-no-clients-read', 'SYNTHETIC no clients.read'),
  ('c4-test-no-clients-write', 'SYNTHETIC no clients.write'),
  ('c4-test-no-projects-read', 'SYNTHETIC no operations.projects.read'),
  ('c4-test-no-projects-write', 'SYNTHETIC no operations.projects.write');

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
cross join public.permissions
where permissions.key in ('clients.read', 'clients.write', 'operations.projects.read', 'operations.projects.write')
  and (
    (roles.key = 'c4-test-no-clients-read' and permissions.key <> 'clients.read')
    or (roles.key = 'c4-test-no-clients-write' and permissions.key <> 'clients.write')
    or (roles.key = 'c4-test-no-projects-read' and permissions.key <> 'operations.projects.read')
    or (roles.key = 'c4-test-no-projects-write' and permissions.key <> 'operations.projects.write')
  );

insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000a4', id from public.roles where key = 'c4-test-no-clients-read';
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000a5', id from public.roles where key = 'c4-test-no-clients-write';
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000a6', id from public.roles where key = 'c4-test-no-projects-read';
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000a7', id from public.roles where key = 'c4-test-no-projects-write';

create temporary table c4n_state (key text primary key, value jsonb not null);

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}',
  true
);

insert into c4n_state (key, value) values (
  'client',
  public.create_admin_client('SYNTHETIC C4N Client', 'synthetic-c4n@example.test', '+250780000099', null, 'SYNTHETIC C4N Co', 'premium')
);
select is((select value ->> 'ok' from c4n_state where key = 'client'), 'true', 'fixture client is created by the seeding super admin');

insert into c4n_state (key, value) values (
  'project',
  public.create_admin_operational_project(
    (select (value ->> 'id')::uuid from c4n_state where key = 'client'),
    'SYNTHETIC C4N Project', null, 'planning', 'design', 'medium', null, null, null, null
  )
);
select is((select value ->> 'ok' from c4n_state where key = 'project'), 'true', 'fixture project is created by the seeding super admin');

create function pg_temp.c4n_client_id() returns uuid language sql as $$
  select (value ->> 'id')::uuid from c4n_state where key = 'client';
$$;
create function pg_temp.c4n_project_id() returns uuid language sql as $$
  select (value ->> 'id')::uuid from c4n_state where key = 'project';
$$;

-- Reusable denial probes: every read facade raises 42501, every write facade
-- returns {ok:false, reasons:[{code:not_authorized}]}.
create function pg_temp.c4n_reads_denied() returns boolean language plpgsql as $$
declare
  probe jsonb;
begin
  begin
    probe := public.admin_get_client(pg_temp.c4n_client_id());
    return false;
  exception when insufficient_privilege then null;
  end;
  begin
    probe := public.admin_list_clients();
    return false;
  exception when insufficient_privilege then null;
  end;
  begin
    probe := public.admin_get_operational_project(pg_temp.c4n_project_id());
    return false;
  exception when insufficient_privilege then null;
  end;
  begin
    probe := public.admin_list_operational_projects();
    return false;
  exception when insufficient_privilege then null;
  end;
  begin
    probe := public.admin_operations_overview();
    return false;
  exception when insufficient_privilege then null;
  end;
  return true;
end;
$$;

create function pg_temp.c4n_writes_denied() returns boolean language sql as $$
  select
    (public.create_admin_client('SYNTHETIC C4N Denied', 'denied-c4n@example.test') -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.update_admin_client(pg_temp.c4n_client_id(), 1, 'SYNTHETIC C4N Renamed', null, null, null, null, 'standard', null, null) -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.archive_admin_client(pg_temp.c4n_client_id(), 1) -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.create_client_note(pg_temp.c4n_client_id(), 'SYNTHETIC denied note') -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.create_admin_operational_project(pg_temp.c4n_client_id(), 'SYNTHETIC C4N Denied Project') -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.change_operational_project_status(pg_temp.c4n_project_id(), 1, 'in_progress') -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.change_operational_project_phase(pg_temp.c4n_project_id(), 1, 'planning') -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.create_operational_project_note(pg_temp.c4n_project_id(), 'SYNTHETIC denied note') -> 'reasons' -> 0 ->> 'code') = 'not_authorized'
    and (public.archive_admin_operational_project(pg_temp.c4n_project_id(), 1) -> 'reasons' -> 0 ->> 'code') = 'not_authorized';
$$;

-- ---------------------------------------------------------------------
-- AAL1 denied (an active admin who has not completed MFA step-up)
-- ---------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a2","role":"authenticated","aal":"aal1"}',
  true
);
select ok(pg_temp.c4n_reads_denied(), 'AAL1: every C4 read facade is denied');
select ok(pg_temp.c4n_writes_denied(), 'AAL1: every C4 write facade returns not_authorized');
set local role authenticated;
select is(
  (select count(*) from public.realtime_events)::bigint, 0::bigint,
  'AAL1: realtime_events rows are invisible under RLS'
);
reset role;

-- ---------------------------------------------------------------------
-- Disabled staff denied (admin role, AAL2, but account_status = disabled)
-- ---------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a3","role":"authenticated","aal":"aal2"}',
  true
);
select ok(pg_temp.c4n_reads_denied(), 'disabled staff: every C4 read facade is denied');
select ok(pg_temp.c4n_writes_denied(), 'disabled staff: every C4 write facade returns not_authorized');
set local role authenticated;
select is(
  (select count(*) from public.realtime_events)::bigint, 0::bigint,
  'disabled staff: realtime_events rows are invisible under RLS'
);
reset role;

-- Control: an active AAL2 actor DOES see the fixture's realtime pointers,
-- proving the two zero-row results above are RLS decisions, not an empty table.
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;
select cmp_ok(
  (select count(*) from public.realtime_events)::bigint, '>=', 2::bigint,
  'control: an active AAL2 staff member sees the realtime pointers the fixture emitted'
);
reset role;

-- ---------------------------------------------------------------------
-- Missing clients.read
-- ---------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a4","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  'select public.admin_get_client(pg_temp.c4n_client_id())',
  '42501', null, 'missing clients.read: admin_get_client is denied'
);
select throws_ok(
  'select public.admin_list_clients()',
  '42501', null, 'missing clients.read: admin_list_clients is denied'
);
select throws_ok(
  'select public.admin_clients_overview()',
  '42501', null, 'missing clients.read: admin_clients_overview is denied'
);
select is(
  (select count(*) from jsonb_array_elements(public.admin_global_quick_find('SYNTHETIC C4N', 8)) as hit where hit ->> 'kind' = 'client')::bigint,
  0::bigint,
  'missing clients.read: quick find silently omits CLIENT hits'
);
select is(
  (select count(*) from jsonb_array_elements(public.admin_global_quick_find('SYNTHETIC C4N', 8)) as hit where hit ->> 'kind' = 'project')::bigint,
  1::bigint,
  'missing clients.read: quick find still returns PROJECT hits the caller may read'
);

-- ---------------------------------------------------------------------
-- Missing clients.write (clients.read still held)
-- ---------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a5","role":"authenticated","aal":"aal2"}',
  true
);
select is(
  (public.admin_get_client(pg_temp.c4n_client_id()) -> 'client' ->> 'full_name'),
  'SYNTHETIC C4N Client',
  'missing clients.write: reading the client still works with clients.read'
);
select is(
  (public.create_admin_client('SYNTHETIC C4N Denied', 'denied-c4n@example.test') -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing clients.write: create_admin_client is denied'
);
select is(
  (public.update_admin_client(pg_temp.c4n_client_id(), 1, 'SYNTHETIC C4N Renamed', null, null, null, null, 'standard', null, null) -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing clients.write: update_admin_client is denied'
);
select is(
  (public.archive_admin_client(pg_temp.c4n_client_id(), 1) -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing clients.write: archive_admin_client is denied'
);
select is(
  (public.create_client_note(pg_temp.c4n_client_id(), 'SYNTHETIC denied note') -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing clients.write: create_client_note is denied'
);

-- ---------------------------------------------------------------------
-- Missing operations.projects.read
-- ---------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a6","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  'select public.admin_get_operational_project(pg_temp.c4n_project_id())',
  '42501', null, 'missing operations.projects.read: admin_get_operational_project is denied'
);
select throws_ok(
  'select public.admin_list_operational_projects()',
  '42501', null, 'missing operations.projects.read: admin_list_operational_projects is denied'
);
select throws_ok(
  'select public.admin_operations_overview()',
  '42501', null, 'missing operations.projects.read: admin_operations_overview is denied'
);
select throws_ok(
  'select public.admin_action_queue(10)',
  '42501', null, 'missing operations.projects.read: admin_action_queue is denied'
);
select is(
  public.admin_get_operational_project_for_case_study(gen_random_uuid()),
  null,
  'missing operations.projects.read: case-study reverse lookup yields null, never an operational record'
);

-- ---------------------------------------------------------------------
-- Missing operations.projects.write (read still held)
-- ---------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a7","role":"authenticated","aal":"aal2"}',
  true
);
select is(
  (public.admin_get_operational_project(pg_temp.c4n_project_id()) -> 'project' ->> 'title'),
  'SYNTHETIC C4N Project',
  'missing operations.projects.write: reading the project still works with operations.projects.read'
);
select is(
  (public.create_admin_operational_project(pg_temp.c4n_client_id(), 'SYNTHETIC C4N Denied Project') -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing operations.projects.write: create_admin_operational_project is denied'
);
select is(
  (public.change_operational_project_status(pg_temp.c4n_project_id(), 1, 'in_progress') -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing operations.projects.write: change_operational_project_status is denied'
);
select is(
  (public.change_operational_project_phase(pg_temp.c4n_project_id(), 1, 'planning') -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing operations.projects.write: change_operational_project_phase is denied'
);
select is(
  (public.change_operational_project_priority(pg_temp.c4n_project_id(), 1, 'high') -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing operations.projects.write: change_operational_project_priority is denied'
);
select is(
  (public.link_operational_project_case_study(pg_temp.c4n_project_id(), 1, gen_random_uuid()) -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing operations.projects.write: link_operational_project_case_study is denied'
);
select is(
  (public.create_case_study_draft_from_operational_project(pg_temp.c4n_project_id(), 1, 'en', 'synthetic-c4n-denied', 'SYNTHETIC C4N Denied') -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing operations.projects.write: create_case_study_draft_from_operational_project is denied'
);
select is(
  (public.archive_admin_operational_project(pg_temp.c4n_project_id(), 1) -> 'reasons' -> 0 ->> 'code'),
  'not_authorized', 'missing operations.projects.write: archive_admin_operational_project is denied'
);

-- ---------------------------------------------------------------------
-- Malformed UUID never reaches a query plan (typed parameters reject it
-- as a 22P02 cast error; nothing about the SQL text is exposed).
-- ---------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  'select public.admin_get_client(''not-a-uuid'''' or 1=1 --''::text::uuid)',
  '22P02', null,
  'a malformed client id is rejected as a uuid cast error before any query runs'
);
select throws_ok(
  'select public.admin_get_operational_project(''00000000-0000-4000-8000-00000000000g''::text::uuid)',
  '22P02', null,
  'a malformed project id is rejected as a uuid cast error before any query runs'
);
select throws_ok(
  'select public.admin_get_operational_project(''00000000-0000-4000-8000-000000000000'')',
  'P0002', null,
  'a well-formed but unknown project id raises a typed no-data error, never a SQL error'
);
select throws_ok(
  'select public.admin_get_client(''00000000-0000-4000-8000-000000000000'')',
  'P0002', null,
  'a well-formed but unknown client id raises a typed no-data error, never a SQL error'
);

-- The Case Studies editor contract requires project_scope/renz_role on the
-- S5C read facade (re-created by the C4 hardening migration).
insert into c4n_state (key, value) values (
  'draft',
  public.create_admin_project_draft('en', 'synthetic-c4n-draft', 'SYNTHETIC C4N Draft')
);
select ok(
  (public.admin_get_project((select (value ->> 'id')::uuid from c4n_state where key = 'draft'), 'en') -> 'project') ?& array['project_scope', 'renz_role'],
  'admin_get_project emits project_scope and renz_role for the editor contract'
);

-- ---------------------------------------------------------------------
-- Database constraints (§69) — direct writes as the migration owner, so
-- the check constraints themselves are what reject the row.
-- ---------------------------------------------------------------------
select throws_ok(
  'insert into public.clients (full_name, email, email_normalized, client_tier) values (''SYNTHETIC'', ''x@example.test'', ''x@example.test'', ''gold'')',
  '23514', null, 'clients.client_tier rejects a value outside standard/vip/premium'
);
select throws_ok(
  'insert into public.clients (full_name, client_tier) values (''SYNTHETIC'', ''standard'')',
  '23514', null, 'clients rejects a row with neither normalized email nor normalized phone'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, status) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', ''cancelled'')',
  '23514', null, 'operational_projects.status rejects a value outside the canonical set'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, current_phase) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', ''handover'')',
  '23514', null, 'operational_projects.current_phase rejects a value outside the canonical set'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, priority) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', ''urgent'')',
  '23514', null, 'operational_projects.priority rejects a value outside low/medium/high'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, budget_amount, budget_currency) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', -1, ''RWF'')',
  '23514', null, 'operational_projects rejects a negative budget'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, budget_amount) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', 100)',
  '23514', null, 'operational_projects rejects a budget amount without a currency'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, budget_amount, budget_currency) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', 100, ''rwf'')',
  '23514', null, 'operational_projects rejects a currency that is not three uppercase letters'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, start_date, end_date) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', ''2026-02-01'', ''2026-01-01'')',
  '23514', null, 'operational_projects rejects an end date before its start date'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title) values (''00000000-0000-4000-8000-000000000000'', ''SYNTHETIC'')',
  '23503', null, 'operational_projects.client_id must reference a real client'
);
select throws_ok(
  'insert into public.operational_projects (client_id, title, public_case_study_id) values (pg_temp.c4n_client_id(), ''SYNTHETIC'', ''00000000-0000-4000-8000-000000000000'')',
  '23503', null, 'operational_projects.public_case_study_id must reference a real public case study'
);
select throws_ok(
  'update public.operational_projects set version = 0 where id = pg_temp.c4n_project_id()',
  '23514', null, 'operational_projects.version can never drop to zero'
);
select throws_ok(
  'insert into public.realtime_events (entity_type, entity_id, action) values (''contractor'', gen_random_uuid(), ''created'')',
  '23514', null, 'realtime_events rejects entity types outside the C4/C5 domain'
);

select * from finish();

rollback;
