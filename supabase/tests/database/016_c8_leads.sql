-- C8 leads: public intake facades, reference numbering, idempotency, rate
-- limiting, upload ownership, Lead CRM facades, conversion, RBAC/RLS,
-- audit redaction, realtime pointers, launch readiness.
begin;
select plan(112);

-- Inventory ------------------------------------------------------------
select is((select count(*) from public.permissions where key like 'leads.%')::bigint, 5::bigint, 'five C8 lead permissions are seeded');
select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id
  where r.key = 'admin' and p.key = 'leads.convert'), 'admin holds leads.convert');
select is((select intake_enabled from public.intake_settings where id = 1), true, 'intake is enabled by default');
select is((select upload_policy from public.intake_settings where id = 1), 'images_only', 'images-only is the default upload policy');
select is(private.intake_setting('lead_uncontacted_hours'), 24, 'default uncontacted threshold is 24 hours');
select ok((select draft_body ilike '%enquiries and project submissions%' from public.legal_pages where slug = 'privacy'), 'privacy DRAFT describes enquiries and submissions');
select ok((select published_body is null from public.legal_pages where slug = 'privacy'), 'the privacy revision is not auto-published');
select is(public.public_site_configuration() #>> '{intake,enabled}', 'true', 'anon projection carries the intake flag');

-- Actors ---------------------------------------------------------------
insert into auth.users (id) values
  ('98000000-0000-4000-8000-0000000000a1'), ('98000000-0000-4000-8000-0000000000a2'),
  ('98000000-0000-4000-8000-0000000000a3'), ('98000000-0000-4000-8000-0000000000a4');
update public.profiles set account_status = 'active', display_name = 'SYNTHETIC Staff ' || right(id::text, 1), version = version + 1
where id in ('98000000-0000-4000-8000-0000000000a1', '98000000-0000-4000-8000-0000000000a2', '98000000-0000-4000-8000-0000000000a3');
update public.profiles set account_status = 'disabled', version = version + 1 where id = '98000000-0000-4000-8000-0000000000a4';
insert into public.user_roles (user_id, role_id) select '98000000-0000-4000-8000-0000000000a1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id) select unnest(array['98000000-0000-4000-8000-0000000000a2', '98000000-0000-4000-8000-0000000000a4']::uuid[]), id from public.roles where key = 'admin';
insert into public.roles (key, display_name) values ('c8-test-read-only', 'SYNTHETIC leads read only');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id from public.roles cross join public.permissions
where roles.key = 'c8-test-read-only' and permissions.key in ('leads.read');
insert into public.user_roles (user_id, role_id) select '98000000-0000-4000-8000-0000000000a3', id from public.roles where key = 'c8-test-read-only';

create temporary table c8 (key text primary key, value jsonb not null);
create function pg_temp.v(k text) returns jsonb language sql as $$ select value from c8 where key = k $$;
create function pg_temp.as_actor(actor uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated', 'aal', aal)::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;
create function pg_temp.as_service() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
$$;

-- Public submission (facade executed by the server credential) -----------
select pg_temp.as_service();
insert into c8 values ('project', public.intake_submit_lead(jsonb_build_object(
  'lead_type', 'project', 'source_channel', 'start_a_project', 'idempotency_key', repeat('1', 32),
  'full_name', 'SYNTHETIC C8 VISITOR', 'email', 'synthetic-c8-visitor@example.test', 'phone', '+250 780 000 111',
  'summary', 'Residential design', 'message', 'SYNTHETIC project description', 'service_key', 'design',
  'preferred_contact', 'whatsapp', 'consent_revision', 1,
  'details', jsonb_build_object('need_key', 'design', 'project_type', 'residential', 'floors', 2, 'scale_band', 'medium',
    'budget_preference', 'range', 'budget_currency', 'RWF', 'budget_min', 50000000, 'current_stage', 'idea'))));
select is(pg_temp.v('project') ->> 'ok', 'true', 'project intake succeeds');
select matches(pg_temp.v('project') ->> 'reference', '^RENZ-LEAD-[0-9]{4}-[0-9]{6}$', 'project intake returns a human-readable reference');
select is(pg_temp.v('project') ->> 'duplicate', 'false', 'first submission is not a duplicate');
select is(pg_temp.v('project') -> 'id', null, 'public result never exposes the internal lead id');
select is((select count(*) from public.leads where reference = pg_temp.v('project') ->> 'reference' and status = 'new')::bigint, 1::bigint, 'lead lands in status new');
select is((select project_type from public.lead_project_details d join public.leads l on l.id = d.lead_id where l.reference = pg_temp.v('project') ->> 'reference'), 'residential', 'project details are stored');
select is((select consent_revision from public.leads where reference = pg_temp.v('project') ->> 'reference'), 1, 'privacy revision is captured with the consent');
select is((select from_status is null and to_status = 'new' from public.lead_stage_history h join public.leads l on l.id = h.lead_id where l.reference = pg_temp.v('project') ->> 'reference'), true, 'initial stage history row is null → new');
select is((select count(*) from public.realtime_events where entity_type = 'lead' and action = 'submitted')::bigint, 1::bigint, 'submission emits a value-free lead pointer');
select is((select metadata ? 'email' or metadata ? 'message' or metadata ? 'full_name' from public.audit_logs where action = 'lead.public_submit' limit 1), false, 'public submit audit carries no contact data or message');

-- Idempotency: same key → same reference, one lead.
insert into c8 values ('project_again', public.intake_submit_lead(jsonb_build_object(
  'lead_type', 'project', 'source_channel', 'start_a_project', 'idempotency_key', repeat('1', 32),
  'full_name', 'SYNTHETIC C8 VISITOR', 'email', 'synthetic-c8-visitor@example.test', 'summary', 'Residential design', 'consent_revision', 1,
  'details', jsonb_build_object('need_key', 'design', 'project_type', 'residential'))));
select is(pg_temp.v('project_again') ->> 'reference', pg_temp.v('project') ->> 'reference', 'repeated idempotency key returns the same reference');
select is(pg_temp.v('project_again') ->> 'duplicate', 'true', 'repeat is flagged as duplicate');
select is((select count(*) from public.leads where email_normalized = 'synthetic-c8-visitor@example.test')::bigint, 1::bigint, 'exactly one lead exists for the visitor');

-- Validation.
select is(public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'website_contact', 'full_name', 'X', 'summary', 'S', 'consent_revision', 1)) -> 'reasons' -> 0 ->> 'code', 'missing_contact_method', 'contact requires email or phone');
select is(public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'website_contact', 'full_name', 'X', 'email', 'x@example.test', 'summary', 'S')) -> 'reasons' -> 0 ->> 'code', 'consent_required', 'privacy acknowledgement is required');
select is(public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'manual', 'full_name', 'X', 'email', 'x@example.test', 'summary', 'S', 'consent_revision', 1)) -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'public submission cannot claim a staff source');
select is(public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'website_contact', 'full_name', 'X', 'email', 'not-an-email', 'summary', 'S', 'consent_revision', 1)) -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'invalid email is rejected');

-- Service, material and general enquiries.
insert into c8 values ('service', public.intake_submit_lead(jsonb_build_object(
  'lead_type', 'service', 'source_channel', 'service_page', 'idempotency_key', repeat('2', 32),
  'full_name', 'SYNTHETIC SERVICE VISITOR', 'phone', '+44 7000 000 222', 'summary', 'Design enquiry', 'service_key', 'design', 'consent_revision', 1,
  'details', jsonb_build_object('requirement_text', 'SYNTHETIC requirement', 'preferred_timing', 'Q3'))));
select is(pg_temp.v('service') ->> 'ok', 'true', 'service enquiry succeeds');
select is((select d.service_key from public.lead_service_details d join public.leads l on l.id = d.lead_id where l.reference = pg_temp.v('service') ->> 'reference'), 'design', 'service enquiry keeps the preselected service');
insert into c8 values ('material', public.intake_submit_lead(jsonb_build_object(
  'lead_type', 'material', 'source_channel', 'material_enquiry', 'idempotency_key', repeat('3', 32),
  'full_name', 'SYNTHETIC MATERIAL VISITOR', 'email', 'synthetic-material@example.test', 'summary', 'Cement and steel', 'consent_revision', 1,
  'details', jsonb_build_object('items', jsonb_build_array(
    jsonb_build_object('description', 'SYNTHETIC cement 42.5', 'quantity', 200, 'unit', 'bag'),
    jsonb_build_object('description', 'SYNTHETIC rebar 12mm', 'quantity', 3, 'unit', 'tonne', 'specification', 'Grade 500'))))));
select is(pg_temp.v('material') ->> 'ok', 'true', 'material enquiry succeeds');
select is((select count(*) from public.lead_material_items i join public.leads l on l.id = i.lead_id where l.reference = pg_temp.v('material') ->> 'reference')::bigint, 2::bigint, 'two material items are stored');
select is((select count(*) from public.purchase_orders)::bigint, 0::bigint, 'a material enquiry creates no purchase order');
select throws_ok($$select public.intake_submit_lead(jsonb_build_object('lead_type', 'material', 'source_channel', 'material_enquiry', 'full_name', 'X', 'email', 'x@example.test', 'summary', 'S', 'consent_revision', 1, 'details', jsonb_build_object('items', '[]'::jsonb)))$$, '23514', null, 'material enquiry without items is rejected and rolled back');
insert into c8 values ('general', public.intake_submit_lead(jsonb_build_object(
  'lead_type', 'general', 'source_channel', 'website_contact', 'idempotency_key', repeat('4', 32),
  'full_name', 'SYNTHETIC CONTACT VISITOR', 'email', 'synthetic-contact@example.test', 'summary', 'Hello', 'message', 'SYNTHETIC message body', 'consent_revision', 1)));
select is(pg_temp.v('general') ->> 'ok', 'true', 'general contact succeeds');
select is((select count(*) from public.lead_project_details d join public.leads l on l.id = d.lead_id where l.reference = pg_temp.v('general') ->> 'reference')::bigint, 0::bigint, 'general contact fabricates no project details');

-- Rate limiting (hash identity only).
select is((public.intake_rate_limit_hit(repeat('a', 64), 'contact', 2, 3600) ->> 'allowed'), 'true', 'first hit allowed');
select is((public.intake_rate_limit_hit(repeat('a', 64), 'contact', 2, 3600) ->> 'allowed'), 'true', 'second hit allowed');
select is((public.intake_rate_limit_hit(repeat('a', 64), 'contact', 2, 3600) ->> 'allowed'), 'false', 'third hit over the limit is refused');
select ok((public.intake_rate_limit_hit(repeat('a', 64), 'contact', 2, 3600) ->> 'retry_after_seconds')::integer > 0, 'refusal reports a retry window');
select is((public.intake_rate_limit_hit(repeat('b', 64), 'contact', 2, 3600) ->> 'allowed'), 'true', 'another identity is unaffected');
select is((public.intake_rate_limit_hit('192.0.2.1', 'contact', 2, 3600) ->> 'allowed'), 'false', 'raw addresses are refused as identities');

-- Upload sessions: ownership and expiry.
insert into c8 values ('session_a', public.intake_create_upload_session(repeat('c', 64), repeat('a', 64), 7200));
insert into c8 values ('session_b', public.intake_create_upload_session(repeat('d', 64), repeat('b', 64), 7200));
select is(pg_temp.v('session_a') ->> 'ok', 'true', 'upload session created');
insert into c8 values ('attach_a', public.intake_register_attachment((pg_temp.v('session_a') ->> 'id')::uuid, repeat('c', 64),
  (pg_temp.v('session_a') ->> 'id') || '/98000000-0000-4000-8000-0000000000f1.jpg', 'site.jpg', 'image/jpeg', 1234, repeat('e', 64), 5));
select is(pg_temp.v('attach_a') ->> 'ok', 'true', 'attachment registered against its own session');
select is(public.intake_register_attachment((pg_temp.v('session_a') ->> 'id')::uuid, repeat('d', 64),
  (pg_temp.v('session_a') ->> 'id') || '/98000000-0000-4000-8000-0000000000f2.jpg', 'x.jpg', 'image/jpeg', 10, repeat('e', 64), 5) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'visitor B token cannot attach to visitor A session');
select is(public.intake_register_attachment((pg_temp.v('session_a') ->> 'id')::uuid, repeat('c', 64),
  (pg_temp.v('session_b') ->> 'id') || '/98000000-0000-4000-8000-0000000000f3.jpg', 'x.jpg', 'image/jpeg', 10, repeat('e', 64), 5) -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'object path outside the session is rejected');
select is(public.intake_register_attachment((pg_temp.v('session_a') ->> 'id')::uuid, repeat('c', 64),
  (pg_temp.v('session_a') ->> 'id') || '/98000000-0000-4000-8000-0000000000f4.jpg', 'x.jpg', 'image/jpeg', 10, repeat('e', 64), 1) -> 'reasons' -> 0 ->> 'code', 'too_many_files', 'file limit is enforced');
select is(public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'website_contact', 'full_name', 'X', 'email', 'x2@example.test', 'summary', 'S', 'consent_revision', 1,
  'upload_session_id', pg_temp.v('session_a') ->> 'id', 'upload_session_token_hash', repeat('d', 64))) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'submission with a foreign session token is refused');
insert into c8 values ('with_files', public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'website_contact', 'idempotency_key', repeat('5', 32),
  'full_name', 'SYNTHETIC FILE VISITOR', 'email', 'synthetic-files@example.test', 'summary', 'With files', 'consent_revision', 1,
  'upload_session_id', pg_temp.v('session_a') ->> 'id', 'upload_session_token_hash', repeat('c', 64))));
select is(pg_temp.v('with_files') ->> 'ok', 'true', 'submission with owned session succeeds');
select is((select count(*) from public.lead_attachments a join public.leads l on l.id = a.lead_id where l.reference = pg_temp.v('with_files') ->> 'reference')::bigint, 1::bigint, 'attachment is bound to the new lead');
select is((select scan_status from public.lead_attachments a join public.leads l on l.id = a.lead_id where l.reference = pg_temp.v('with_files') ->> 'reference'), 'pending_review', 'attachment starts in quarantine (pending_review)');
select is((select consumed_at is not null from public.lead_upload_sessions where id = (pg_temp.v('session_a') ->> 'id')::uuid), true, 'session is consumed');
select is(public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'website_contact', 'full_name', 'X', 'email', 'x3@example.test', 'summary', 'S', 'consent_revision', 1,
  'upload_session_id', pg_temp.v('session_a') ->> 'id', 'upload_session_token_hash', repeat('c', 64))) -> 'reasons' -> 0 ->> 'code', 'expired_session', 'a consumed session cannot be reused');
update public.lead_upload_sessions set expires_at = now() - interval '1 hour' where id = (pg_temp.v('session_b') ->> 'id')::uuid;
select is(public.intake_register_attachment((pg_temp.v('session_b') ->> 'id')::uuid, repeat('d', 64),
  (pg_temp.v('session_b') ->> 'id') || '/98000000-0000-4000-8000-0000000000f5.jpg', 'x.jpg', 'image/jpeg', 10, repeat('e', 64), 5) -> 'reasons' -> 0 ->> 'code', 'expired_session', 'expired session refuses new files');
select is(jsonb_array_length(public.intake_expired_upload_sessions(10)), 1, 'expired unsubmitted session is listed for cleanup');
select is(public.intake_purge_upload_session((pg_temp.v('session_a') ->> 'id')::uuid) -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'a consumed session cannot be purged');
select is(public.intake_purge_upload_session((pg_temp.v('session_b') ->> 'id')::uuid) ->> 'ok', 'true', 'expired session purged');

-- Intake paused.
update public.intake_settings set intake_enabled = false, version = version + 1 where id = 1;
select is(public.intake_submit_lead(jsonb_build_object('lead_type', 'general', 'source_channel', 'website_contact', 'full_name', 'X', 'email', 'x4@example.test', 'summary', 'S', 'consent_revision', 1)) -> 'reasons' -> 0 ->> 'code', 'intake_disabled', 'paused intake refuses submissions');
update public.intake_settings set intake_enabled = true, version = version + 1 where id = 1;

-- Boundaries -----------------------------------------------------------
select pg_temp.as_anon();
select throws_ok('select public.admin_list_leads()', '42501', null, 'anon cannot list leads');
select throws_ok('select public.admin_get_lead(''98000000-0000-4000-8000-0000000000a1'')', '42501', null, 'anon cannot read a lead');
select is(public.assign_lead('98000000-0000-4000-8000-0000000000a1', 1, null) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'anon cannot assign');
select is(public.convert_lead_to_client('98000000-0000-4000-8000-0000000000a1', 1) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'anon cannot convert');
select is(public.admin_lead_attachment_path('98000000-0000-4000-8000-0000000000a1'), null, 'anon cannot resolve attachment paths');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a2', 'aal1');
select throws_ok('select public.admin_list_leads()', '42501', null, 'AAL1 admin cannot list leads');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a4', 'aal2');
select throws_ok('select public.admin_list_leads()', '42501', null, 'disabled admin cannot list leads');
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a3', 'aal2');
select is(jsonb_typeof(public.admin_list_leads() -> 'items'), 'array', 'read-only role lists leads');
select is(public.change_lead_status((select id from public.leads where reference = pg_temp.v('project') ->> 'reference'), 1, 'contacted') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'leads.read alone cannot change status');
select is(public.assign_lead((select id from public.leads where reference = pg_temp.v('project') ->> 'reference'), 1, '98000000-0000-4000-8000-0000000000a3') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'leads.read alone cannot assign');
select is(public.convert_lead_to_client((select id from public.leads where reference = pg_temp.v('project') ->> 'reference'), 1) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'leads.read alone cannot convert');
select is(public.admin_lead_attachment_path((select id from public.lead_attachments limit 1)), null, 'leads.read alone cannot resolve attachment paths');
select throws_ok('select public.admin_get_lead(''not-a-uuid'')', '22P02', null, 'malformed uuid is a typed error, not SQL leakage');

-- Lead CRM -------------------------------------------------------------
select pg_temp.as_actor('98000000-0000-4000-8000-0000000000a2', 'aal2');
insert into c8 values ('lead_id', to_jsonb((select id from public.leads where reference = pg_temp.v('project') ->> 'reference')));
select is(public.admin_get_lead((pg_temp.v('lead_id') #>> '{}')::uuid) #>> '{lead,status}', 'new', 'admin reads the Lead 360');
select is(jsonb_array_length(public.admin_get_lead((pg_temp.v('lead_id') #>> '{}')::uuid) -> 'timeline'), 2, 'timeline starts with the submission event and the initial stage row');
select is(public.admin_get_lead((pg_temp.v('lead_id') #>> '{}')::uuid) #>> '{project_details,project_type}', 'residential', 'Lead 360 carries requirements');
select is((public.admin_list_leads(25, null, null, 'new') ->> 'has_more')::boolean, false, 'register pages without overflow');
select is(jsonb_array_length(public.admin_list_leads(25, 'SYNTHETIC C8 VISITOR') -> 'items'), 1, 'register search by name finds the visitor');
select is(jsonb_array_length(public.admin_list_leads(25, null, null, null, null, 'unassigned') -> 'items'), 5, 'unassigned quick filter lists every open lead');
select is(public.assign_lead((pg_temp.v('lead_id') #>> '{}')::uuid, 1, '98000000-0000-4000-8000-0000000000a2') ->> 'ok', 'true', 'assign to me succeeds');
select is(public.assign_lead((pg_temp.v('lead_id') #>> '{}')::uuid, 1, null) -> 'reasons' -> 0 ->> 'code', 'version_conflict', 'stale assignment is rejected');
select is(jsonb_array_length(public.admin_list_leads(25, null, null, null, null, 'me') -> 'items'), 1, 'my leads quick filter works');
select is(public.log_lead_contact((pg_temp.v('lead_id') #>> '{}')::uuid, 'whatsapp', now(), 'SYNTHETIC first message') ->> 'ok', 'true', 'contact logged');
select is((select first_contact_at is not null from public.leads where id = (pg_temp.v('lead_id') #>> '{}')::uuid), true, 'first contact timestamp recorded');
select is((select status from public.leads where id = (pg_temp.v('lead_id') #>> '{}')::uuid), 'new', 'logging contact does not move the stage automatically');
select is(public.change_lead_status((pg_temp.v('lead_id') #>> '{}')::uuid, 3, 'contacted') ->> 'ok', 'true', 'new → contacted');
select is(public.change_lead_status((pg_temp.v('lead_id') #>> '{}')::uuid, 4, 'qualified') ->> 'ok', 'true', 'contacted → qualified');
select is(public.change_lead_status((pg_temp.v('lead_id') #>> '{}')::uuid, 5, 'won') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'won requires a client');
select is(public.change_lead_status((pg_temp.v('lead_id') #>> '{}')::uuid, 5, 'lost') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'lost requires a reason');
select is(public.create_lead_note((pg_temp.v('lead_id') #>> '{}')::uuid, 'SYNTHETIC private note') ->> 'ok', 'true', 'note created');
select is((select metadata ? 'body' from public.audit_logs where action = 'lead.note_create' limit 1), false, 'note body never enters the audit trail');
select ok(jsonb_array_length(public.admin_lead_action_queue(20)) >= 1, 'action queue lists deterministic lead actions');
select ok(public.admin_lead_action_queue(20) @> jsonb_build_array(jsonb_build_object('kind', 'qualified_without_client', 'lead_id', (pg_temp.v('lead_id') #>> '{}')::uuid)) or true, 'queue probe runs');
select ok((select count(*) from jsonb_array_elements(public.admin_lead_action_queue(20)) as q where q ->> 'kind' = 'qualified_without_client' and q ->> 'lead_id' = pg_temp.v('lead_id') #>> '{}') = 1, 'qualified lead without client is queued');

-- Conversion (idempotent, race-safe) ------------------------------------
insert into c8 values ('convert', public.convert_lead_to_client((pg_temp.v('lead_id') #>> '{}')::uuid, 5));
select is(pg_temp.v('convert') ->> 'ok', 'true', 'lead converted to a new client');
select is(pg_temp.v('convert') ->> 'created', 'true', 'a client was created from the lead');
select is((select full_name from public.clients where id = (pg_temp.v('convert') ->> 'client_id')::uuid), 'SYNTHETIC C8 VISITOR', 'client carries the visitor name');
select is((select count(*) from public.clients where email_normalized = 'synthetic-c8-visitor@example.test')::bigint, 1::bigint, 'exactly one client');
insert into c8 values ('convert_again', public.convert_lead_to_client((pg_temp.v('lead_id') #>> '{}')::uuid, 99));
select is(pg_temp.v('convert_again') ->> 'already_linked', 'true', 'second conversion returns the existing link');
select is((select count(*) from public.clients where email_normalized = 'synthetic-c8-visitor@example.test')::bigint, 1::bigint, 'no duplicate client after repeat conversion');
select is(public.change_lead_status((pg_temp.v('lead_id') #>> '{}')::uuid, 6, 'won') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'project lead won requires an operational project');
insert into c8 values ('project_create', public.create_project_from_lead((pg_temp.v('lead_id') #>> '{}')::uuid, 6, 'SYNTHETIC C8 residence', 'design'));
select is(pg_temp.v('project_create') ->> 'ok', 'true', 'operational project created from the lead');
select is((select current_phase from public.operational_projects where id = (pg_temp.v('project_create') ->> 'project_id')::uuid), 'design', 'staff-chosen phase is applied');
select is(public.admin_project_originating_lead((pg_temp.v('project_create') ->> 'project_id')::uuid) ->> 'reference', pg_temp.v('project') ->> 'reference', 'project resolves its originating lead');
select is(jsonb_array_length(public.admin_client_leads((pg_temp.v('convert') ->> 'client_id')::uuid)), 1, 'client 360 lists the originating lead');
select is(public.change_lead_status((pg_temp.v('lead_id') #>> '{}')::uuid, 7, 'won') ->> 'ok', 'true', 'won after client + project');
select is((select count(*) from public.lead_stage_history where lead_id = (pg_temp.v('lead_id') #>> '{}')::uuid)::bigint, 4::bigint, 'four stage transitions preserved');

-- Material bridge: deliberate, no purchase orders.
insert into c8 values ('material_id', to_jsonb((select id from public.leads where reference = pg_temp.v('material') ->> 'reference')));
insert into c8 values ('m_convert', public.convert_lead_to_client((pg_temp.v('material_id') #>> '{}')::uuid, 1));
insert into c8 values ('m_project', public.create_project_from_lead((pg_temp.v('material_id') #>> '{}')::uuid, 2, 'SYNTHETIC material project', 'procurement'));
insert into c8 values ('m_reqs', public.create_material_requirements_from_lead((pg_temp.v('material_id') #>> '{}')::uuid, 3,
  jsonb_build_array(jsonb_build_object('item_name', 'SYNTHETIC cement 42.5', 'quantity', 200, 'unit', 'bag', 'priority', 'medium'))));
select is(pg_temp.v('m_reqs') ->> 'ok', 'true', 'selected enquiry item becomes a project material requirement');
select is((select count(*) from public.project_material_requirements where operational_project_id = (pg_temp.v('m_project') ->> 'project_id')::uuid)::bigint, 1::bigint, 'one requirement created');
select is((select count(*) from public.purchase_orders)::bigint, 0::bigint, 'still no purchase order');

-- Lost, archive, quick find ---------------------------------------------
insert into c8 values ('general_id', to_jsonb((select id from public.leads where reference = pg_temp.v('general') ->> 'reference')));
select is(public.change_lead_status((pg_temp.v('general_id') #>> '{}')::uuid, 1, 'lost', 'not_ready', 'SYNTHETIC lost note') ->> 'ok', 'true', 'lost with reason');
select is((select lost_reason from public.leads where id = (pg_temp.v('general_id') #>> '{}')::uuid), 'not_ready', 'lost reason stored');
select is(public.archive_lead((pg_temp.v('general_id') #>> '{}')::uuid, 2) ->> 'ok', 'true', 'lost lead can be archived separately');
select ok(public.admin_global_quick_find(pg_temp.v('project') ->> 'reference') @> jsonb_build_array(jsonb_build_object('kind', 'lead')), 'quick find resolves a lead by reference');
select is(public.admin_leads_overview() ->> 'won_30d_count', '1', 'overview counts the won lead');

-- Readiness reflects real intake ----------------------------------------
select ok((select count(*) from jsonb_array_elements(private.launch_readiness() -> 'checks') as c where c ->> 'key' = 'privacy_covers_intake' and c ->> 'state' = 'blocked') = 1, 'live intake without a covering privacy revision blocks readiness');
select ok((select count(*) from jsonb_array_elements(private.launch_readiness() -> 'checks') as c where c ->> 'key' = 'upload_policy' and c ->> 'state' = 'ready') = 1, 'images-only upload policy is launch-safe');

select * from finish();
rollback;
