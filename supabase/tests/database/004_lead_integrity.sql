-- C8 lead domain: structural integrity of the leads tables (constraints,
-- privileges, reference format). Behaviour is covered by 016_c8_leads.sql.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

set constraints all immediate;

select throws_ok(
  $$insert into public.leads (reference, lead_type, source_channel, full_name, email, email_normalized, summary)
    values ('RENZ-LEAD-2026-999902', 'other', 'manual', 'SYNTHETIC', 'a@example.test', 'a@example.test', 'S')$$,
  '23514', null, 'unsupported lead type is rejected'
);

select throws_ok(
  $$insert into public.leads (reference, lead_type, source_channel, full_name, email, email_normalized, summary)
    values ('SYNTHETIC-BAD-REFERENCE', 'general', 'manual', 'SYNTHETIC', 'a@example.test', 'a@example.test', 'S')$$,
  '23514', null, 'reference must follow RENZ-LEAD-YYYY-NNNNNN'
);

select throws_ok(
  $$insert into public.leads (reference, lead_type, source_channel, full_name, summary)
    values ('RENZ-LEAD-2026-999903', 'general', 'manual', 'SYNTHETIC', 'S')$$,
  '23514', null, 'a lead needs an email or a phone'
);

select throws_ok(
  $$insert into public.leads (reference, lead_type, source_channel, full_name, email, email_normalized, summary, status)
    values ('RENZ-LEAD-2026-999904', 'general', 'manual', 'SYNTHETIC', 'a@example.test', 'a@example.test', 'S', 'lost')$$,
  '23514', null, 'lost requires a lost reason'
);

select throws_ok(
  $$insert into public.leads (reference, lead_type, source_channel, full_name, email, email_normalized, summary, consent_revision)
    values ('RENZ-LEAD-2026-999905', 'general', 'manual', 'SYNTHETIC', 'a@example.test', 'a@example.test', 'S', 1)$$,
  '23514', null, 'consent revision and timestamp travel together'
);

insert into public.leads (id, reference, lead_type, source_channel, full_name, email, email_normalized, summary)
values ('96000000-0000-4000-8000-000000000001', 'RENZ-LEAD-2026-999906', 'general', 'manual', 'SYNTHETIC', 'a@example.test', 'a@example.test', 'S');

select throws_ok(
  $$insert into public.leads (reference, lead_type, source_channel, full_name, email, email_normalized, summary)
    values ('RENZ-LEAD-2026-999906', 'general', 'manual', 'SYNTHETIC', 'a@example.test', 'a@example.test', 'S')$$,
  '23505', null, 'lead reference is unique'
);

select throws_ok(
  $$insert into public.lead_project_details (lead_id, need_key, project_type, budget_preference, budget_currency, budget_min)
    values ('96000000-0000-4000-8000-000000000001', 'design', 'residential', 'not_sure', 'RWF', 10)$$,
  '23514', null, 'budget amounts require the range preference'
);

select throws_ok(
  $$insert into public.lead_project_details (lead_id, need_key, project_type, budget_preference, budget_currency, budget_min, budget_max)
    values ('96000000-0000-4000-8000-000000000001', 'design', 'residential', 'range', 'RWF', 10, 5)$$,
  '23514', null, 'budget max must not be below min'
);

select throws_ok(
  $$insert into public.lead_material_items (lead_id, description, quantity)
    values ('96000000-0000-4000-8000-000000000001', 'SYNTHETIC cement', 0)$$,
  '23514', null, 'material quantity must be positive when given'
);

select throws_ok(
  $$insert into public.lead_attachments (lead_id, bucket_id, object_path, original_filename, detected_mime_type, byte_size, checksum_sha256)
    values ('96000000-0000-4000-8000-000000000001', 'lead-intake', 'evil/../x.jpg', 'x.jpg', 'image/jpeg', 4, repeat('a', 64))$$,
  '23514', null, 'attachment object path must be uuid/uuid.ext'
);

select throws_ok(
  $$insert into public.lead_attachments (lead_id, bucket_id, object_path, original_filename, detected_mime_type, byte_size, checksum_sha256)
    values ('96000000-0000-4000-8000-000000000001', 'lead-intake', '96000000-0000-4000-8000-000000000001/96000000-0000-4000-8000-000000000002.svg', 'x.svg', 'image/svg+xml', 4, repeat('a', 64))$$,
  '23514', null, 'attachment mime type is limited to jpeg/png/webp/pdf'
);

select throws_ok(
  $$insert into public.lead_attachments (lead_id, bucket_id, object_path, original_filename, detected_mime_type, byte_size, checksum_sha256)
    values ('96000000-0000-4000-8000-000000000001', 'editorial-originals', '96000000-0000-4000-8000-000000000001/96000000-0000-4000-8000-000000000002.jpg', 'x.jpg', 'image/jpeg', 4, repeat('a', 64))$$,
  '23514', null, 'attachments live only in the lead-intake bucket'
);

select throws_ok(
  $$insert into public.lead_attachments (lead_id, bucket_id, object_path, original_filename, detected_mime_type, byte_size, checksum_sha256)
    values ('96000000-0000-4000-8000-000000000001', 'lead-intake', '96000000-0000-4000-8000-000000000001/96000000-0000-4000-8000-000000000002.jpg', 'x.jpg', 'image/jpeg', 10485761, repeat('a', 64))$$,
  '23514', null, 'attachment size is bounded at 10 MB'
);

select throws_ok(
  $$insert into public.lead_stage_history (lead_id, from_status, to_status) values ('96000000-0000-4000-8000-000000000001', 'new', 'new')$$,
  '23514', null, 'stage history rejects a no-op transition'
);

select throws_ok(
  $$insert into public.intake_rate_limits (identity_hash, scope, window_start) values ('raw-ip-address', 'contact', now())$$,
  '23514', null, 'rate-limit identity must be a sha256 hash, never a raw address'
);

-- Privileges: default deny on every lead table; intake facades are service_role only.
select ok(not has_table_privilege('anon', 'public.leads', 'SELECT'), 'anon cannot select leads');
select ok(not has_table_privilege('anon', 'public.leads', 'INSERT'), 'anon cannot insert leads');
select ok(not has_table_privilege('authenticated', 'public.leads', 'SELECT'), 'authenticated cannot select leads directly');
select ok(not has_table_privilege('authenticated', 'public.lead_attachments', 'SELECT'), 'authenticated cannot select attachments directly');
select ok(not has_function_privilege('anon', 'public.intake_submit_lead(jsonb)', 'EXECUTE'), 'anon cannot execute intake_submit_lead');
select ok(not has_function_privilege('authenticated', 'public.intake_submit_lead(jsonb)', 'EXECUTE'), 'authenticated cannot execute intake_submit_lead');
select ok(has_function_privilege('service_role', 'public.intake_submit_lead(jsonb)', 'EXECUTE'), 'service_role executes intake_submit_lead');
select ok(not has_function_privilege('anon', 'public.intake_rate_limit_hit(text, text, integer, integer)', 'EXECUTE'), 'anon cannot execute the rate limiter');
select ok(not has_function_privilege('anon', 'public.admin_get_lead(uuid)', 'EXECUTE'), 'anon cannot execute admin_get_lead');

select * from finish();
rollback;
