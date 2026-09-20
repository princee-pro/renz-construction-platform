begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_service_overview', 'admin_list_services', 'admin_get_service',
        'create_admin_service_draft', 'update_admin_service_draft',
        'create_service_evidence', 'submit_service_evidence_for_review',
        'review_service_evidence'
      )
      and pg_proc.prosecdef
      and pg_proc.proconfig = array['search_path=""']::text[]
  ),
  8::bigint,
  'all S5A service administration facades are SECURITY DEFINER with an empty search path'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_service_overview', 'admin_list_services', 'admin_get_service',
        'create_admin_service_draft', 'update_admin_service_draft',
        'create_service_evidence', 'submit_service_evidence_for_review',
        'review_service_evidence'
      )
      and has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
  ),
  0::bigint,
  'anonymous callers cannot execute S5A administration facades'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_service_overview', 'admin_list_services', 'admin_get_service',
        'create_admin_service_draft', 'update_admin_service_draft',
        'create_service_evidence', 'submit_service_evidence_for_review',
        'review_service_evidence'
      )
      and has_function_privilege('authenticated', pg_proc.oid, 'EXECUTE')
  ),
  8::bigint,
  'authenticated callers receive only the eight bounded S5A administration facades'
);

insert into auth.users (id)
values
  ('95000000-0000-4000-8000-000000000001'),
  ('95000000-0000-4000-8000-000000000002');

update public.profiles
set account_status = 'active', version = version + 1
where id in (
  '95000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000002'
);

insert into public.user_roles (user_id, role_id)
select '95000000-0000-4000-8000-000000000001', roles.id
from public.roles
where roles.key = 'admin';

insert into public.user_roles (user_id, role_id)
select '95000000-0000-4000-8000-000000000002', roles.id
from public.roles
where roles.key = 'super_admin';

create temporary table s5a_state (
  key text primary key,
  value jsonb not null
);

select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

insert into s5a_state (key, value)
values (
  'service',
  public.create_admin_service_draft('en', 'synthetic-s5a-service', 'SYNTHETIC S5A Service')
);

select is(
  (select value ->> 'ok' from s5a_state where key = 'service'),
  'true',
  'an active AAL2 admin can create a bounded service draft'
);

select is(
  (
    select publication_status
    from public.services
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'service')
  ),
  'draft',
  'service creation never implies publication'
);

select is(
  jsonb_array_length(
    public.admin_list_services(search_query => 'synthetic-s5a-service') -> 'items'
  ),
  1,
  'the bounded service register returns the synthetic draft'
);

select is(
  public.admin_get_service(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    'en'
  ) -> 'service' ->> 'publication_status',
  'draft',
  'the editor query returns the requested draft through an explicit payload'
);

select ok(
  (public.admin_service_overview() ->> 'draft')::integer >= 1,
  'the overview reports real service draft state'
);

insert into s5a_state (key, value)
values (
  'update',
  public.update_admin_service_draft(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    1,
    1,
    'en',
    'synthetic-s5a-service',
    'SYNTHETIC S5A Service',
    'SYNTHETIC overview used only for the S5A database acceptance test.',
    '[{"type":"heading","level":2,"text":"SYNTHETIC section"},{"type":"paragraph","text":"SYNTHETIC bounded body copy"}]'::jsonb,
    'SYNTHETIC S5A Service | Test',
    'SYNTHETIC metadata description used only for the S5A acceptance test.',
    'SYNTHETIC bounded scope',
    'SYNTHETIC bounded deliverables',
    'SYNTHETIC bounded exclusions',
    '',
    'SYNTHETIC bounded delivery wording',
    '',
    10,
    false
  )
);

select is(
  (select value ->> 'ok' from s5a_state where key = 'update'),
  'true',
  'a valid expected-version draft update succeeds'
);

select is(
  (
    select services.version::text || ':' || localizations.version::text
    from public.services
    join public.service_localizations as localizations
      on localizations.service_id = services.id and localizations.locale = 'en'
    where services.id = (select (value ->> 'id')::uuid from s5a_state where key = 'service')
  ),
  '2:2',
  'a meaningful draft save increments service and localization versions exactly once'
);

select is(
  public.update_admin_service_draft(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    1,
    1,
    'en',
    'synthetic-s5a-service',
    'SYNTHETIC stale overwrite attempt',
    'SYNTHETIC overview used only for the S5A database acceptance test.',
    '[{"type":"paragraph","text":"SYNTHETIC stale body"}]'::jsonb,
    'SYNTHETIC S5A Service | Test',
    'SYNTHETIC metadata description used only for the S5A acceptance test.',
    'SYNTHETIC bounded scope',
    'SYNTHETIC bounded deliverables',
    'SYNTHETIC bounded exclusions',
    '',
    'SYNTHETIC bounded delivery wording',
    '',
    10,
    false
  ) -> 'reasons' -> 0 ->> 'code',
  'version_conflict',
  'a stale service/localization version fails with an explicit optimistic conflict'
);

select ok(
  exists (
    select 1
    from public.audit_logs
    where action = 'service.update'
      and entity_id = (select value ->> 'id' from s5a_state where key = 'service')
      and metadata ? 'changed_keys'
      and metadata::text !~ 'bounded scope|metadata description|body copy'
  ),
  'draft audit metadata records changed keys without copying editorial field values'
);

insert into s5a_state (key, value)
values (
  'evidence',
  public.create_service_evidence(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    'SYNTHETIC evidence supports this test-only service record.',
    'internal_record',
    'SYNTHETIC S5A evidence reference',
    'private',
    false,
    true,
    'SYNTHETIC publication acceptance'
  )
);

select is(
  (select value ->> 'ok' from s5a_state where key = 'evidence'),
  'true',
  'an authorized draft editor can transactionally register and link service evidence'
);

select ok(
  exists (
    select 1
    from public.service_evidence
    where service_id = (select (value ->> 'id')::uuid from s5a_state where key = 'service')
      and evidence_id = (select (value ->> 'id')::uuid from s5a_state where key = 'evidence')
  ),
  'evidence creation leaves no unlinked intermediate record'
);

select is(
  public.submit_service_evidence_for_review(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    (select (value ->> 'id')::uuid from s5a_state where key = 'evidence'),
    null
  ) -> 'reasons' -> 0 ->> 'code',
  'invalid_input',
  'a null expected evidence version fails closed as invalid input'
);

select is(
  (
    select verification_state || ':' || version::text
    from public.evidence_records
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'evidence')
  ),
  'unverified:1',
  'a rejected null-version command leaves the evidence state and version unchanged'
);

select is(
  public.submit_service_evidence_for_review(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    (select (value ->> 'id')::uuid from s5a_state where key = 'evidence'),
    1
  ) ->> 'ok',
  'true',
  'an admin can submit linked evidence for review'
);

select is(
  (
    select verification_state
    from public.evidence_records
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'evidence')
  ),
  'in_review',
  'submitted evidence enters the exact In review state'
);

select is(
  public.review_service_evidence(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    (select (value ->> 'id')::uuid from s5a_state where key = 'evidence'),
    2,
    'verified',
    'SYNTHETIC approved wording',
    'not_required',
    null
  ) -> 'reasons' -> 0 ->> 'code',
  'not_authorized',
  'the admin role cannot verify claims by invoking the facade directly'
);

select is(
  public.publish_content(
    'service',
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    2
  ) -> 'reasons' -> 0 ->> 'code',
  'not_authorized',
  'the admin role cannot publish by invoking the S4 operation directly'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);

select is(
  public.review_service_evidence(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    (select (value ->> 'id')::uuid from s5a_state where key = 'evidence'),
    2,
    null,
    null,
    null,
    null
  ) -> 'reasons' -> 0 ->> 'code',
  'invalid_state',
  'a null review decision fails closed before reaching the evidence transition command'
);

select is(
  (
    select verification_state || ':' || version::text
    from public.evidence_records
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'evidence')
  ),
  'in_review:2',
  'a rejected null-state review leaves evidence state and version unchanged'
);

insert into s5a_state (key, value)
values (
  'unsubmitted_evidence',
  public.create_service_evidence(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    'SYNTHETIC unsubmitted evidence used only for direct lifecycle rejection.',
    'internal_record',
    'SYNTHETIC S5A unsubmitted evidence reference',
    'private',
    false,
    false,
    'SYNTHETIC direct lifecycle rejection'
  )
);

select is(
  public.review_service_evidence(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    (select (value ->> 'id')::uuid from s5a_state where key = 'unsubmitted_evidence'),
    1,
    'verified',
    null,
    null,
    null
  ) -> 'reasons' -> 0 ->> 'code',
  'invalid_state',
  'a direct facade call cannot verify evidence that was never submitted for review'
);

select is(
  (
    select verification_state || ':' || version::text
    from public.evidence_records
    where id = (
      select (value ->> 'id')::uuid
      from s5a_state
      where key = 'unsubmitted_evidence'
    )
  ),
  'unverified:1',
  'a rejected direct verification leaves unsubmitted evidence unchanged'
);

select is(
  public.review_service_evidence(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    (select (value ->> 'id')::uuid from s5a_state where key = 'evidence'),
    2,
    'verified',
    'SYNTHETIC approved wording',
    'not_required',
    null
  ) ->> 'ok',
  'true',
  'the Super Admin can verify in-review evidence'
);

select is(
  (
    select verification_state
    from public.evidence_records
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'evidence')
  ),
  'verified',
  'verified evidence persists the reviewed state'
);

select is(
  private.service_publication_failures(
    (select (value ->> 'id')::uuid from s5a_state where key = 'service')
  ),
  '[]'::jsonb,
  'the S5A editor fields and verified evidence satisfy authoritative S4 readiness'
);

select is(
  public.publish_content(
    'service',
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    2
  ) ->> 'ok',
  'true',
  'the Super Admin can publish an eligible synthetic service'
);

select is(
  (
    select publication_status
    from public.services
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'service')
  ),
  'published',
  'publication records the guarded state before the transaction becomes publicly observable'
);

select is(
  public.unpublish_content(
    'service',
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    3
  ) ->> 'ok',
  'true',
  'the Super Admin can explicitly unpublish the service'
);

select is(
  (
    select count(*)
    from public.published_services
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'service')
  ),
  0::bigint,
  'unpublishing immediately removes the service from the public projection'
);

select is(
  public.archive_content(
    'service',
    (select (value ->> 'id')::uuid from s5a_state where key = 'service'),
    4
  ) ->> 'ok',
  'true',
  'the Super Admin can archive an unpublished service without deleting history'
);

select is(
  (
    select publication_status
    from public.services
    where id = (select (value ->> 'id')::uuid from s5a_state where key = 'service')
  ),
  'archived',
  'archive changes lifecycle state without deleting the service'
);

select throws_ok(
  $$select public.admin_list_services(page_size => 51)$$,
  '22023',
  null,
  'service pagination rejects an unbounded page size'
);

select throws_ok(
  $$select public.admin_list_services(page_size => null)$$,
  '22023',
  null,
  'service pagination rejects a null page size instead of removing its bound'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);

select throws_ok(
  $$select public.admin_list_services()$$,
  '42501',
  null,
  'a password-authenticated AAL1 actor cannot read the administration register'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);

update public.profiles
set account_status = 'disabled', version = version + 1
where id = '95000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.create_admin_service_draft('en', 'synthetic-disabled-attempt', 'SYNTHETIC Disabled Attempt')$$,
  '42501',
  null,
  'a disabled actor fails closed on the next protected mutation'
);

select * from finish();
rollback;
