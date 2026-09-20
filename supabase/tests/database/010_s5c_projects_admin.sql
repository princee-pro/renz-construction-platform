begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_project_overview', 'admin_list_projects', 'admin_get_project',
        'create_admin_project_draft', 'update_admin_project_draft',
        'mark_project_factually_reviewed', 'set_admin_project_services',
        'create_admin_project_stage', 'update_admin_project_stage', 'delete_admin_project_stage',
        'admin_attach_project_media', 'admin_update_project_media',
        'admin_reorder_project_media', 'admin_remove_project_media',
        'create_project_evidence', 'submit_project_evidence_for_review', 'review_project_evidence'
      )
      and pg_proc.prosecdef
      and pg_proc.proconfig = array['search_path=""']::text[]
  ),
  17::bigint,
  'all S5C project administration facades are SECURITY DEFINER with an empty search path'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_project_overview', 'admin_list_projects', 'admin_get_project',
        'create_admin_project_draft', 'update_admin_project_draft',
        'mark_project_factually_reviewed', 'set_admin_project_services',
        'create_admin_project_stage', 'update_admin_project_stage', 'delete_admin_project_stage',
        'admin_attach_project_media', 'admin_update_project_media',
        'admin_reorder_project_media', 'admin_remove_project_media',
        'create_project_evidence', 'submit_project_evidence_for_review', 'review_project_evidence'
      )
      and has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
  ),
  0::bigint,
  'anonymous callers cannot execute any S5C administration facade'
);

select is(
  public.resolve_project_media_path('00000000-0000-4000-8000-000000000000'::uuid),
  null,
  'the public media path resolver returns null for a non-existent or ineligible project_media row'
);

select ok(
  has_function_privilege('anon', 'public.resolve_project_media_path(uuid)', 'EXECUTE'),
  'anonymous callers may call the public media path resolver (it is gated inside the function body)'
);

select ok(
  has_table_privilege('anon', 'public.published_project_services', 'SELECT'),
  'anonymous callers may read the published_project_services projection'
);

insert into auth.users (id)
values ('96000000-0000-4000-8000-000000000001');

update public.profiles
set account_status = 'active', version = version + 1
where id = '96000000-0000-4000-8000-000000000001';

insert into public.user_roles (user_id, role_id)
select '96000000-0000-4000-8000-000000000001', roles.id
from public.roles
where roles.key = 'super_admin';

create temporary table s5c_state (
  key text primary key,
  value jsonb not null
);

select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into s5c_state (key, value)
values (
  'project',
  public.create_admin_project_draft('en', 'synthetic-s5c-project', 'SYNTHETIC S5C Project')
);

select is(
  (select value ->> 'ok' from s5c_state where key = 'project'),
  'true',
  'an active AAL2 super admin can create a bounded project draft'
);

select is(
  (
    select publication_status
    from public.projects
    where id = (select (value ->> 'id')::uuid from s5c_state where key = 'project')
  ),
  'draft',
  'project creation never implies publication'
);

select is(
  jsonb_array_length(
    public.admin_list_projects(search_query => 'synthetic-s5c-project') -> 'items'
  ),
  1,
  'the bounded project register returns the synthetic draft'
);

select is(
  public.admin_get_project(
    (select (value ->> 'id')::uuid from s5c_state where key = 'project'),
    'en'
  ) -> 'project' ->> 'publication_status',
  'draft',
  'the editor query returns the requested draft through an explicit payload'
);

select ok(
  (public.admin_project_overview() ->> 'draft')::integer >= 1,
  'the overview reports real project draft state'
);

select ok(
  not (
    public.admin_get_project(
      (select (value ->> 'id')::uuid from s5c_state where key = 'project'), 'en'
    ) -> 'readiness' ->> 'ready'
  )::boolean,
  'a freshly created project draft is not yet publication-ready'
);

insert into s5c_state (key, value)
values (
  'update',
  public.update_admin_project_draft(
    (select (value ->> 'id')::uuid from s5c_state where key = 'project'),
    1, 1, 'en', 'synthetic-s5c-project', 'SYNTHETIC S5C Project',
    'SYNTHETIC summary used only for the S5C database acceptance test.',
    'SYNTHETIC challenge', 'SYNTHETIC approach', 'SYNTHETIC solution', 'SYNTHETIC outcomes',
    'SYNTHETIC S5C Project | Test',
    'SYNTHETIC metadata description used only for the S5C acceptance test.',
    'Synthetic City', 'city', 'synthetic-type', 'SYNTHETIC bounded scope',
    'SYNTHETIC bounded RENZ role', 'completed', 2024, 2025, 5, false, null
  )
);

select is(
  (select value ->> 'ok' from s5c_state where key = 'update'),
  'true',
  'a valid expected-version draft update succeeds'
);

select is(
  (
    select projects.version::text || ':' || localizations.version::text
    from public.projects
    join public.project_localizations as localizations
      on localizations.project_id = projects.id and localizations.locale = 'en'
    where projects.id = (select (value ->> 'id')::uuid from s5c_state where key = 'project')
  ),
  '2:2',
  'a meaningful draft save increments project and localization versions exactly once'
);

insert into s5c_state (key, value)
values (
  'stale_update',
  public.update_admin_project_draft(
    (select (value ->> 'id')::uuid from s5c_state where key = 'project'),
    1, 1, 'en', 'synthetic-s5c-project', 'SYNTHETIC S5C Project (stale)',
    'SYNTHETIC summary', 'SYNTHETIC challenge', 'SYNTHETIC approach', 'SYNTHETIC solution',
    'SYNTHETIC outcomes', 'SYNTHETIC S5C Project (stale) | Test',
    'SYNTHETIC metadata description used only for the S5C acceptance test.',
    'Synthetic City', 'city', 'synthetic-type', 'SYNTHETIC bounded scope',
    'SYNTHETIC bounded RENZ role', 'completed', 2024, 2025, 5, false, null
  )
);

select is(
  (select value ->> 'ok' from s5c_state where key = 'stale_update'),
  'false',
  'a stale expected-version draft update is rejected'
);

select is(
  (select value ->> 'code' from jsonb_array_elements(
    (select value -> 'reasons' from s5c_state where key = 'stale_update')
  ) limit 1),
  'version_conflict',
  'the stale update reports a version_conflict reason code'
);

insert into s5c_state (key, value)
values (
  'stage',
  public.create_admin_project_stage(
    (select (value ->> 'id')::uuid from s5c_state where key = 'project'),
    2, 'Brief', 'SYNTHETIC chapter body used only for the S5C acceptance test.', 0
  )
);

select is(
  (select value ->> 'ok' from s5c_state where key = 'stage'),
  'true',
  'a story chapter can be created on the draft project'
);

select is(
  (
    select count(*)
    from public.project_stages
    where project_id = (select (value ->> 'id')::uuid from s5c_state where key = 'project')
  ),
  1::bigint,
  'the created story chapter is persisted against the project'
);

insert into s5c_state (key, value)
values (
  'delete_stage',
  public.delete_admin_project_stage(
    (select (value ->> 'id')::uuid from s5c_state where key = 'stage'),
    (select (value ->> 'id')::uuid from s5c_state where key = 'project'),
    1
  )
);

select is(
  (select value ->> 'ok' from s5c_state where key = 'delete_stage'),
  'true',
  'an unattached story chapter can be deleted'
);

insert into s5c_state (key, value)
values (
  'services',
  public.set_admin_project_services(
    (select (value ->> 'id')::uuid from s5c_state where key = 'project'),
    3,
    jsonb_build_array(jsonb_build_object('service_id', '00000000-0000-4000-8000-000000000000'))
  )
);

select is(
  (select value ->> 'ok' from s5c_state where key = 'services'),
  'false',
  'linking a non-existent service is rejected'
);

select is(
  (select value -> 'reasons' -> 0 ->> 'code' from s5c_state where key = 'services'),
  'not_found',
  'the rejected service relationship reports a not_found reason code'
);

select * from finish();

rollback;
