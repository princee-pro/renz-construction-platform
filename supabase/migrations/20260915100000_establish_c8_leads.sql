-- C8 — Public leads + real Start-a-Project intake + Lead CRM.
--
-- Replaces the S2 lead skeleton (never populated, no intake path) with the
-- connected lead domain: public visitor → lead → qualification → client →
-- operational project. Public submission never touches tables directly:
-- the Next server validates, hashes the visitor identity, enforces anti-abuse
-- controls and calls the narrow `intake_*` facades with the server credential
-- (service_role). Anonymous and authenticated roles receive no execute on
-- them. Staff reads/writes follow the C4–C7 facade + permission pattern.

-- ---------------------------------------------------------------------
-- Retire the S2 skeleton (structurally empty by contract)
-- ---------------------------------------------------------------------

drop table if exists public.lead_stage_history cascade;
drop table if exists public.lead_notes cascade;
drop table if exists public.lead_attachments cascade;
drop table if exists public.contact_messages cascade;
drop table if exists public.lead_services cascade;
drop table if exists public.project_briefs cascade;
drop table if exists public.leads cascade;
drop table if exists public.lead_stages cascade;
drop function if exists private.enforce_lead_child_kind();
drop function if exists private.enforce_finalized_lead_subtype();

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------

insert into public.permissions (key, display_name, description, is_system)
values
  ('leads.read', 'Read leads', 'Read the lead register, Lead 360 and lead activity.', true),
  ('leads.write', 'Manage leads', 'Create manual leads, edit lead details, change status, log contact and add notes.', true),
  ('leads.assign', 'Assign leads', 'Assign leads to staff, including Assign to me.', true),
  ('leads.convert', 'Convert leads', 'Convert leads to clients, operational projects and material requirements.', true),
  ('leads.attachments.read', 'Read lead attachments', 'Open visitor-supplied attachments through the private signed route.', true)
on conflict (key) do update
set display_name = excluded.display_name, description = excluded.description, is_system = true;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'leads.read', 'leads.write', 'leads.assign', 'leads.convert', 'leads.attachments.read'
)
where roles.key in ('admin', 'super_admin')
on conflict do nothing;

-- Realtime vocabulary: one lead entity type plus lead-specific actions.
alter table public.realtime_events drop constraint if exists realtime_events_entity_type_check;
alter table public.realtime_events add constraint realtime_events_entity_type_check
  check (entity_type in (
    'client', 'operational_project', 'invoice',
    'trade_partner', 'contractor_assignment', 'material', 'material_requirement', 'purchase_order',
    'settings', 'lead'
  ));
alter table public.realtime_events drop constraint if exists realtime_events_action_check;
alter table public.realtime_events add constraint realtime_events_action_check
  check (action in (
    'created', 'updated', 'status_changed', 'phase_changed', 'priority_changed',
    'case_study_linked', 'case_study_unlinked', 'archived', 'note_created',
    'issued', 'voided', 'payment_recorded', 'payment_reversed', 'share_created', 'share_revoked',
    'capability_changed', 'adjusted', 'rated', 'approved', 'cancelled', 'closed',
    'receipt_recorded', 'receipt_reversed', 'published',
    'submitted', 'assigned', 'contact_logged', 'converted'
  ));

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.lead_reference_counters (
  year_key integer primary key,
  last_value integer not null default 0,
  constraint lead_reference_counters_year_check check (year_key between 2000 and 2999),
  constraint lead_reference_counters_value_check check (last_value >= 0)
);

-- Typed intake configuration (C7 architecture: singleton, versioned, audited).
create table public.intake_settings (
  id integer primary key default 1 check (id = 1),
  intake_enabled boolean not null default true,
  upload_policy text not null default 'images_only' check (upload_policy in ('disabled', 'images_only', 'images_and_pdf')),
  lead_uncontacted_hours integer not null default 24 check (lead_uncontacted_hours between 1 and 720),
  proposal_stale_days integer not null default 14 check (proposal_stale_days between 1 and 365),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.intake_settings (id) values (1) on conflict do nothing;
create index intake_settings_updated_by_idx on public.intake_settings (updated_by);

-- Temporary upload ownership: a visitor's files belong to one session whose
-- secret token never leaves the visitor's browser memory; only its hash is stored.
create table public.lead_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  identity_hash text check (identity_hash is null or identity_hash ~ '^[0-9a-f]{64}$'),
  file_count integer not null default 0 check (file_count >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  lead_id uuid
);
create index lead_upload_sessions_expiry_idx on public.lead_upload_sessions (expires_at) where consumed_at is null;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^RENZ-LEAD-[0-9]{4}-[0-9]{6}$'),
  lead_type text not null check (lead_type in ('general', 'project', 'service', 'material')),
  source_channel text not null check (source_channel in (
    'website_contact', 'start_a_project', 'service_page', 'material_enquiry', 'whatsapp', 'manual', 'referral', 'other'
  )),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'site_visit', 'proposal', 'won', 'lost')),
  priority text check (priority is null or priority in ('low', 'medium', 'high')),
  assigned_to uuid references public.profiles (id) on delete set null,
  full_name text not null check (btrim(full_name) <> '' and char_length(full_name) <= 200),
  email text check (email is null or char_length(email) <= 254),
  email_normalized text,
  phone_display text check (phone_display is null or char_length(phone_display) <= 40),
  phone_normalized text,
  company text check (company is null or char_length(company) <= 200),
  location_text text check (location_text is null or char_length(location_text) <= 400),
  preferred_contact text check (preferred_contact is null or preferred_contact in ('whatsapp', 'email', 'phone', 'none')),
  summary text not null check (btrim(summary) <> '' and char_length(summary) <= 200),
  message text check (message is null or char_length(message) <= 4000),
  service_key text check (service_key is null or service_key in (
    'design', 'executions', 'hybrid-service', 'supervision', 'consultations', 'not_sure', 'other'
  )),
  service_id uuid references public.services (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  operational_project_id uuid references public.operational_projects (id) on delete set null,
  lost_reason text check (lost_reason is null or lost_reason in (
    'not_ready', 'budget', 'timeline', 'not_a_fit', 'unreachable', 'chose_another_provider', 'duplicate', 'other'
  )),
  consent_revision integer check (consent_revision is null or consent_revision >= 0),
  consented_at timestamptz,
  idempotency_key text unique check (idempotency_key is null or idempotency_key ~ '^[0-9a-f]{32,64}$'),
  submitted_at timestamptz not null default now(),
  first_contact_at timestamptz,
  qualified_at timestamptz,
  site_visit_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint leads_contact_method_check check (email_normalized is not null or phone_normalized is not null),
  constraint leads_consent_pair_check check ((consent_revision is null) = (consented_at is null)),
  constraint leads_lost_shape_check check (status <> 'lost' or lost_reason is not null),
  constraint leads_operational_project_unique unique (operational_project_id)
);
create index leads_status_submitted_idx on public.leads (status, submitted_at desc, id desc);
create index leads_type_submitted_idx on public.leads (lead_type, submitted_at desc);
create index leads_assignee_status_updated_idx on public.leads (assigned_to, status, updated_at desc);
create index leads_submitted_idx on public.leads (submitted_at desc, id desc);
create index leads_email_normalized_idx on public.leads (email_normalized) where email_normalized is not null;
create index leads_phone_normalized_idx on public.leads (phone_normalized) where phone_normalized is not null;
create index leads_client_idx on public.leads (client_id) where client_id is not null;
create index leads_service_idx on public.leads (service_id) where service_id is not null;
create index leads_archived_idx on public.leads (archived_at);
create index leads_created_by_idx on public.leads (created_by);
create index leads_updated_by_idx on public.leads (updated_by);

alter table public.lead_upload_sessions
  add constraint lead_upload_sessions_lead_fkey foreign key (lead_id) references public.leads (id) on delete set null;
create index lead_upload_sessions_lead_idx on public.lead_upload_sessions (lead_id) where lead_id is not null;

create table public.lead_project_details (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  need_key text not null check (need_key in (
    'design', 'executions', 'hybrid-service', 'supervision', 'consultations', 'not_sure', 'other'
  )),
  project_type text not null check (project_type in (
    'residential', 'commercial', 'hospitality', 'community', 'industrial', 'renovation', 'other'
  )),
  site_state text check (site_state is null or char_length(site_state) <= 400),
  floor_area_m2 numeric(12, 2) check (floor_area_m2 is null or (floor_area_m2 > 0 and floor_area_m2 <= 10000000)),
  floors integer check (floors is null or floors between 1 and 200),
  units integer check (units is null or units between 1 and 100000),
  site_area_m2 numeric(14, 2) check (site_area_m2 is null or (site_area_m2 > 0 and site_area_m2 <= 1000000000)),
  scale_band text check (scale_band is null or scale_band in ('small', 'medium', 'large', 'not_sure')),
  start_timing text check (start_timing is null or char_length(start_timing) <= 120),
  completion_timing text check (completion_timing is null or char_length(completion_timing) <= 120),
  budget_preference text not null default 'not_sure' check (budget_preference in ('range', 'prefer_not', 'not_sure')),
  budget_currency text check (budget_currency is null or budget_currency ~ '^[A-Z]{3}$'),
  budget_min numeric(14, 2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(14, 2) check (budget_max is null or budget_max >= 0),
  current_stage text check (current_stage is null or current_stage in (
    'idea', 'site_identified', 'design_started', 'drawings_available', 'ready_for_execution',
    'construction_underway', 'renovation', 'not_sure'
  )),
  special_requirements text check (special_requirements is null or char_length(special_requirements) <= 2000),
  source_context text check (source_context is null or char_length(source_context) <= 200),
  constraint lead_project_budget_shape_check check (
    (budget_preference <> 'range' and budget_currency is null and budget_min is null and budget_max is null)
    or (budget_preference = 'range' and budget_currency is not null and (budget_min is not null or budget_max is not null))
  ),
  constraint lead_project_budget_order_check check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create table public.lead_service_details (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  service_key text not null check (service_key in (
    'design', 'executions', 'hybrid-service', 'supervision', 'consultations', 'not_sure', 'other'
  )),
  context_text text check (context_text is null or char_length(context_text) <= 1000),
  requirement_text text not null check (btrim(requirement_text) <> '' and char_length(requirement_text) <= 2000),
  preferred_timing text check (preferred_timing is null or char_length(preferred_timing) <= 120)
);

create table public.lead_material_items (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  sort_order integer not null default 0 check (sort_order between 0 and 100),
  description text not null check (btrim(description) <> '' and char_length(description) <= 300),
  quantity numeric(14, 3) check (quantity is null or quantity > 0),
  unit text check (unit is null or char_length(unit) <= 40),
  specification text check (specification is null or char_length(specification) <= 1000)
);
create index lead_material_items_lead_idx on public.lead_material_items (lead_id, sort_order);

-- Private quarantine metadata. Object names are UUID-based; the original
-- filename is private metadata and never part of a storage path.
create table public.lead_attachments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete restrict,
  upload_session_id uuid references public.lead_upload_sessions (id) on delete set null,
  bucket_id text not null check (bucket_id = 'lead-intake'),
  object_path text not null check (object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'),
  original_filename text not null check (btrim(original_filename) <> '' and char_length(original_filename) <= 255),
  detected_mime_type text not null check (detected_mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  scan_status text not null default 'pending_review' check (scan_status in ('pending_review', 'safe', 'rejected')),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 200),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now(),
  constraint lead_attachments_bucket_object_key unique (bucket_id, object_path),
  constraint lead_attachments_review_shape_check check ((scan_status = 'pending_review') = (reviewed_at is null))
);
create index lead_attachments_lead_scan_idx on public.lead_attachments (lead_id, scan_status);
create index lead_attachments_session_idx on public.lead_attachments (upload_session_id) where lead_id is null;
create index lead_attachments_reviewed_by_idx on public.lead_attachments (reviewed_by);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null check (btrim(body) <> '' and char_length(body) <= 4000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create index lead_notes_lead_created_idx on public.lead_notes (lead_id, created_at desc);
create index lead_notes_created_by_idx on public.lead_notes (created_by);
create index lead_notes_updated_by_idx on public.lead_notes (updated_by);

create table public.lead_contact_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  contact_type text not null check (contact_type in ('phone_call', 'whatsapp', 'email', 'meeting', 'site_visit', 'other')),
  occurred_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 1000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index lead_contact_logs_lead_idx on public.lead_contact_logs (lead_id, occurred_at desc);
create index lead_contact_logs_created_by_idx on public.lead_contact_logs (created_by);

-- Authoritative stage transitions (C9 derives pipeline timings from here).
create table public.lead_stage_history (
  id bigint generated by default as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  from_status text check (from_status is null or from_status in ('new', 'contacted', 'qualified', 'site_visit', 'proposal', 'won', 'lost')),
  to_status text not null check (to_status in ('new', 'contacted', 'qualified', 'site_visit', 'proposal', 'won', 'lost')),
  reason_code text check (reason_code is null or char_length(reason_code) <= 40),
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  constraint lead_stage_history_change_check check (from_status is distinct from to_status)
);
create index lead_stage_history_lead_changed_idx on public.lead_stage_history (lead_id, changed_at desc);
create index lead_stage_history_changed_by_idx on public.lead_stage_history (changed_by);

-- Bounded activity timeline (no message bodies, no attachment contents).
create table public.lead_events (
  id bigint generated by default as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  event_type text not null check (event_type in (
    'submitted', 'created_manual', 'updated', 'assigned', 'unassigned', 'contact_logged', 'note_created',
    'status_changed', 'converted_client', 'project_created', 'requirements_created', 'attachment_reviewed', 'archived'
  )),
  actor_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 2048),
  created_at timestamptz not null default now()
);
create index lead_events_lead_created_idx on public.lead_events (lead_id, created_at desc);
create index lead_events_actor_idx on public.lead_events (actor_id);

-- Anti-abuse counters keyed by an HMAC identity (never a raw address).
create table public.intake_rate_limits (
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  scope text not null check (scope in ('contact', 'project', 'service', 'material', 'upload')),
  window_start timestamptz not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  primary key (identity_hash, scope, window_start)
);
create index intake_rate_limits_window_idx on public.intake_rate_limits (window_start);

-- Default deny everywhere; facades are the only path.
alter table public.lead_reference_counters enable row level security;
alter table public.intake_settings enable row level security;
alter table public.lead_upload_sessions enable row level security;
alter table public.leads enable row level security;
alter table public.lead_project_details enable row level security;
alter table public.lead_service_details enable row level security;
alter table public.lead_material_items enable row level security;
alter table public.lead_attachments enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_contact_logs enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.lead_events enable row level security;
alter table public.intake_rate_limits enable row level security;
alter table public.lead_reference_counters force row level security;
alter table public.intake_settings force row level security;
alter table public.lead_upload_sessions force row level security;
alter table public.leads force row level security;
alter table public.lead_project_details force row level security;
alter table public.lead_service_details force row level security;
alter table public.lead_material_items force row level security;
alter table public.lead_attachments force row level security;
alter table public.lead_notes force row level security;
alter table public.lead_contact_logs force row level security;
alter table public.lead_stage_history force row level security;
alter table public.lead_events force row level security;
alter table public.intake_rate_limits force row level security;
revoke all on public.lead_reference_counters, public.intake_settings, public.lead_upload_sessions, public.leads,
  public.lead_project_details, public.lead_service_details, public.lead_material_items, public.lead_attachments,
  public.lead_notes, public.lead_contact_logs, public.lead_stage_history, public.lead_events, public.intake_rate_limits
  from public, anon, authenticated;

create trigger intake_settings_touch_mutable_row before update on public.intake_settings
for each row execute function private.touch_mutable_row();
create trigger leads_touch_mutable_row before update on public.leads
for each row execute function private.touch_mutable_row();
create trigger lead_notes_touch_mutable_row before update on public.lead_notes
for each row execute function private.touch_mutable_row();

-- ---------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------

create or replace function private.next_lead_reference()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  year_value integer := extract(year from now())::integer;
  sequence_value integer;
begin
  insert into public.lead_reference_counters as counter (year_key, last_value)
  values (year_value, 1)
  on conflict (year_key) do update set last_value = counter.last_value + 1
  returning counter.last_value into sequence_value;
  return 'RENZ-LEAD-' || year_value::text || '-' || lpad(sequence_value::text, 6, '0');
end;
$$;
revoke all on function private.next_lead_reference() from public, anon, authenticated;

create or replace function private.lead_event(target_lead_id uuid, target_event_type text, target_metadata jsonb default '{}'::jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.lead_events (lead_id, event_type, actor_id, metadata)
  values (target_lead_id, target_event_type, auth.uid(), coalesce(target_metadata, '{}'::jsonb));
$$;
revoke all on function private.lead_event(uuid, text, jsonb) from public, anon, authenticated;

create or replace function private.intake_setting(setting_key text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case setting_key
    when 'lead_uncontacted_hours' then s.lead_uncontacted_hours
    when 'proposal_stale_days' then s.proposal_stale_days
    else null end
  from public.intake_settings as s where s.id = 1;
$$;
revoke all on function private.intake_setting(text) from public, anon, authenticated;

-- Bounded duplicate awareness: other leads and clients sharing a normalized
-- email or phone. Never merges; the staff decide.
create or replace function private.lead_possible_matches(target_lead_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with target as (
    select id, email_normalized, phone_normalized from public.leads where id = target_lead_id
  ),
  lead_matches as (
    select other.id, other.reference, other.full_name, other.status, other.lead_type, other.submitted_at,
      case when target.email_normalized is not null and other.email_normalized = target.email_normalized then 'email' else 'phone' end as match_reason
    from public.leads as other
    cross join target
    where other.id <> target.id and other.archived_at is null
      and ((target.email_normalized is not null and other.email_normalized = target.email_normalized)
        or (target.phone_normalized is not null and other.phone_normalized = target.phone_normalized))
    order by other.submitted_at desc
    limit 5
  ),
  client_matches as (
    select client.id, client.full_name, client.company, client.email, client.phone_display, client.archived_at,
      case when target.email_normalized is not null and client.email_normalized = target.email_normalized then 'email' else 'phone' end as match_reason
    from public.clients as client
    cross join target
    where (target.email_normalized is not null and client.email_normalized = target.email_normalized)
      or (target.phone_normalized is not null and client.phone_normalized = target.phone_normalized)
    order by client.updated_at desc
    limit 5
  )
  select jsonb_build_object(
    'leads', coalesce((select jsonb_agg(to_jsonb(lead_matches) order by submitted_at desc) from lead_matches), '[]'::jsonb),
    'clients', coalesce((select jsonb_agg(to_jsonb(client_matches) order by full_name) from client_matches), '[]'::jsonb)
  );
$$;
revoke all on function private.lead_possible_matches(uuid) from public, anon, authenticated;

create or replace function private.lead_timeline(target_lead_id uuid, limit_count integer default 60)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(entry order by at desc), '[]'::jsonb)
  from (
    select h.changed_at as at, jsonb_build_object('kind', 'status', 'at', h.changed_at, 'from_status', h.from_status, 'to_status', h.to_status,
      'reason_code', h.reason_code, 'actor', actor.display_name) as entry
    from public.lead_stage_history as h left join public.profiles as actor on actor.id = h.changed_by
    where h.lead_id = target_lead_id
    union all
    select e.created_at, jsonb_build_object('kind', 'event', 'at', e.created_at, 'event_type', e.event_type, 'metadata', e.metadata,
      'actor', actor.display_name)
    from public.lead_events as e left join public.profiles as actor on actor.id = e.actor_id
    where e.lead_id = target_lead_id and e.event_type not in ('status_changed', 'contact_logged')
    union all
    select c.occurred_at, jsonb_build_object('kind', 'contact', 'at', c.occurred_at, 'contact_type', c.contact_type, 'note', c.note,
      'actor', actor.display_name)
    from public.lead_contact_logs as c left join public.profiles as actor on actor.id = c.created_by
    where c.lead_id = target_lead_id
    order by 1 desc
    limit limit_count
  ) as timeline;
$$;
revoke all on function private.lead_timeline(uuid, integer) from public, anon, authenticated;

create or replace function private.lead_summary_json(lead public.leads)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', lead.id, 'reference', lead.reference, 'lead_type', lead.lead_type, 'source_channel', lead.source_channel,
    'status', lead.status, 'priority', lead.priority, 'full_name', lead.full_name, 'company', lead.company,
    'email', lead.email, 'phone_display', lead.phone_display, 'summary', lead.summary, 'service_key', lead.service_key,
    'location_text', lead.location_text, 'assigned_to', lead.assigned_to,
    'assigned_to_name', (select display_name from public.profiles where id = lead.assigned_to),
    'client_id', lead.client_id, 'operational_project_id', lead.operational_project_id,
    'submitted_at', lead.submitted_at, 'updated_at', lead.updated_at,
    'last_activity_at', greatest(lead.updated_at, (select max(created_at) from public.lead_events where lead_id = lead.id)),
    'archived_at', lead.archived_at, 'version', lead.version,
    'attachment_count', (select count(*) from public.lead_attachments where lead_id = lead.id)
  );
$$;
revoke all on function private.lead_summary_json(public.leads) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Intake facades (service_role only — the Next server is the caller)
-- ---------------------------------------------------------------------

create or replace function public.intake_rate_limit_hit(
  target_identity_hash text, target_scope text, max_hits integer, window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket_start timestamptz;
  hits integer;
begin
  if target_identity_hash !~ '^[0-9a-f]{64}$' or target_scope not in ('contact', 'project', 'service', 'material', 'upload')
     or max_hits < 1 or window_seconds < 60 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_request');
  end if;
  bucket_start := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.intake_rate_limits as limits (identity_hash, scope, window_start, hit_count)
  values (target_identity_hash, target_scope, bucket_start, 1)
  on conflict (identity_hash, scope, window_start) do update set hit_count = limits.hit_count + 1
  returning hit_count into hits;
  -- Opportunistic pruning keeps the table bounded without a scheduler.
  delete from public.intake_rate_limits where window_start < now() - interval '2 days';
  return jsonb_build_object(
    'allowed', hits <= max_hits,
    'remaining', greatest(max_hits - hits, 0),
    'retry_after_seconds', case when hits <= max_hits then 0
      else greatest(extract(epoch from (bucket_start + make_interval(secs => window_seconds) - now()))::integer, 1) end
  );
end;
$$;
revoke all on function public.intake_rate_limit_hit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.intake_rate_limit_hit(text, text, integer, integer) to service_role;

create or replace function public.intake_create_upload_session(target_token_hash text, target_identity_hash text, ttl_seconds integer default 7200)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if target_token_hash !~ '^[0-9a-f]{64}$' or ttl_seconds < 60 or ttl_seconds > 86400 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'token', 'Upload session request is invalid.')));
  end if;
  insert into public.lead_upload_sessions (token_hash, identity_hash, expires_at)
  values (target_token_hash, nullif(target_identity_hash, ''), now() + make_interval(secs => ttl_seconds))
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.intake_create_upload_session(text, text, integer) from public, anon, authenticated;
grant execute on function public.intake_create_upload_session(text, text, integer) to service_role;

create or replace function public.intake_register_attachment(
  target_session_id uuid, target_token_hash text, target_object_path text, target_original_filename text,
  target_mime_type text, target_byte_size bigint, target_checksum text, max_files integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session public.lead_upload_sessions%rowtype;
  new_id uuid;
begin
  select * into session from public.lead_upload_sessions where id = target_session_id for update;
  if not found or session.token_hash <> target_token_hash then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', 'session', 'This upload session is not yours.')));
  end if;
  if session.consumed_at is not null or session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('expired_session', 'session', 'The upload session has expired. Reload the page and add the files again.')));
  end if;
  if session.file_count >= max_files then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('too_many_files', 'files', 'The maximum number of supporting files has been reached.')));
  end if;
  if target_object_path !~ ('^' || session.id::text || '/') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'object_path', 'Object path must belong to the session.')));
  end if;
  insert into public.lead_attachments (upload_session_id, bucket_id, object_path, original_filename, detected_mime_type, byte_size, checksum_sha256)
  values (session.id, 'lead-intake', target_object_path, left(btrim(target_original_filename), 255), target_mime_type, target_byte_size, target_checksum)
  returning id into new_id;
  update public.lead_upload_sessions set file_count = file_count + 1 where id = session.id;
  return jsonb_build_object('ok', true, 'id', new_id, 'file_count', session.file_count + 1);
end;
$$;
revoke all on function public.intake_register_attachment(uuid, text, text, text, text, bigint, text, integer) from public, anon, authenticated;
grant execute on function public.intake_register_attachment(uuid, text, text, text, text, bigint, text, integer) to service_role;

create or replace function public.intake_remove_attachment(target_session_id uuid, target_token_hash text, target_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_path text;
begin
  if not exists (
    select 1 from public.lead_upload_sessions
    where id = target_session_id and token_hash = target_token_hash and consumed_at is null
  ) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', 'session', 'This upload session is not yours.')));
  end if;
  delete from public.lead_attachments
  where id = target_attachment_id and upload_session_id = target_session_id and lead_id is null
  returning object_path into removed_path;
  if removed_path is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'attachment', 'The file was not found in this session.')));
  end if;
  update public.lead_upload_sessions set file_count = greatest(file_count - 1, 0) where id = target_session_id;
  return jsonb_build_object('ok', true, 'object_path', removed_path);
end;
$$;
revoke all on function public.intake_remove_attachment(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.intake_remove_attachment(uuid, text, uuid) to service_role;

-- The single authoritative public submission. Validates every field again,
-- verifies upload ownership, creates the lead + detail rows + attachments,
-- generates the reference, records history/audit and emits the pointer —
-- all in one transaction. Idempotency: a repeated key returns the same
-- reference and creates nothing.
create or replace function public.intake_submit_lead(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.intake_settings%rowtype;
  lead_type_value text := payload ->> 'lead_type';
  source_value text := payload ->> 'source_channel';
  idempotency text := nullif(payload ->> 'idempotency_key', '');
  full_name_value text := nullif(btrim(payload ->> 'full_name'), '');
  email_value text := nullif(btrim(payload ->> 'email'), '');
  phone_value text := nullif(btrim(payload ->> 'phone'), '');
  company_value text := nullif(btrim(payload ->> 'company'), '');
  location_value text := nullif(btrim(payload ->> 'location_text'), '');
  preferred_value text := nullif(payload ->> 'preferred_contact', '');
  summary_value text := nullif(btrim(payload ->> 'summary'), '');
  message_value text := nullif(btrim(payload ->> 'message'), '');
  service_value text := nullif(payload ->> 'service_key', '');
  consent_revision_value integer := nullif(payload ->> 'consent_revision', '')::integer;
  session_id_value uuid := nullif(payload ->> 'upload_session_id', '')::uuid;
  session_token_value text := nullif(payload ->> 'upload_session_token_hash', '');
  session public.lead_upload_sessions%rowtype;
  existing public.leads%rowtype;
  new_id uuid;
  reference_value text;
  details jsonb := coalesce(payload -> 'details', '{}'::jsonb);
  item jsonb;
  item_index integer := 0;
  attachment_count integer := 0;
begin
  select * into settings from public.intake_settings where id = 1;
  if not settings.intake_enabled then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('intake_disabled', null, 'Online enquiries are paused at the moment.')));
  end if;
  if idempotency is not null then
    select * into existing from public.leads where idempotency_key = idempotency;
    if found then
      return jsonb_build_object('ok', true, 'reference', existing.reference, 'lead_type', existing.lead_type, 'duplicate', true);
    end if;
  end if;
  if lead_type_value not in ('general', 'project', 'service', 'material') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'lead_type', 'Enquiry type is not admitted.')));
  end if;
  if source_value not in ('website_contact', 'start_a_project', 'service_page', 'material_enquiry') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'source_channel', 'Source is not admitted for public submission.')));
  end if;
  if full_name_value is null or char_length(full_name_value) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'full_name', 'Enter your full name.')));
  end if;
  if private.normalize_email(email_value) is null and private.normalize_phone(phone_value) is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('missing_contact_method', 'email', 'Enter an email address or a phone / WhatsApp number.')));
  end if;
  if email_value is not null and (char_length(email_value) > 254 or email_value !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'email', 'Enter a valid email address.')));
  end if;
  if phone_value is not null and (char_length(phone_value) > 40 or char_length(private.normalize_phone(phone_value)) < 6) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'phone', 'Enter a valid phone or WhatsApp number.')));
  end if;
  if summary_value is null or char_length(summary_value) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'summary', 'Add a short subject.')));
  end if;
  if message_value is not null and char_length(message_value) > 4000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'message', 'Keep the message under 4000 characters.')));
  end if;
  if consent_revision_value is null or consent_revision_value < 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('consent_required', 'privacy', 'Please acknowledge the privacy notice.')));
  end if;
  if preferred_value is not null and preferred_value not in ('whatsapp', 'email', 'phone', 'none') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'preferred_contact', 'Preferred contact is not admitted.')));
  end if;
  if service_value is not null and service_value not in ('design', 'executions', 'hybrid-service', 'supervision', 'consultations', 'not_sure', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'service_key', 'Service is not admitted.')));
  end if;
  if session_id_value is not null then
    select * into session from public.lead_upload_sessions where id = session_id_value for update;
    if not found or session.token_hash is distinct from session_token_value then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', 'files', 'The supporting files do not belong to this submission.')));
    end if;
    if session.consumed_at is not null or session.expires_at <= now() then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('expired_session', 'files', 'The upload session has expired. Add the files again.')));
    end if;
    if settings.upload_policy = 'disabled' and session.file_count > 0 then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('uploads_disabled', 'files', 'Supporting files are not accepted at the moment.')));
    end if;
  end if;

  reference_value := private.next_lead_reference();
  begin
    insert into public.leads (
      reference, lead_type, source_channel, full_name, email, email_normalized, phone_display, phone_normalized,
      company, location_text, preferred_contact, summary, message, service_key,
      consent_revision, consented_at, idempotency_key
    ) values (
      reference_value, lead_type_value, source_value, full_name_value, email_value, private.normalize_email(email_value),
      phone_value, private.normalize_phone(phone_value), company_value, location_value, preferred_value,
      summary_value, message_value, service_value, consent_revision_value, now(), idempotency
    ) returning id into new_id;
  exception when unique_violation then
    -- A concurrent submit with the same idempotency key won the race.
    select * into existing from public.leads where idempotency_key = idempotency;
    if found then
      return jsonb_build_object('ok', true, 'reference', existing.reference, 'lead_type', existing.lead_type, 'duplicate', true);
    end if;
    raise;
  end;

  if lead_type_value = 'project' then
    insert into public.lead_project_details (
      lead_id, need_key, project_type, site_state, floor_area_m2, floors, units, site_area_m2, scale_band,
      start_timing, completion_timing, budget_preference, budget_currency, budget_min, budget_max,
      current_stage, special_requirements, source_context
    ) values (
      new_id, coalesce(details ->> 'need_key', 'not_sure'), coalesce(details ->> 'project_type', 'other'),
      nullif(btrim(details ->> 'site_state'), ''), nullif(details ->> 'floor_area_m2', '')::numeric,
      nullif(details ->> 'floors', '')::integer, nullif(details ->> 'units', '')::integer,
      nullif(details ->> 'site_area_m2', '')::numeric, nullif(details ->> 'scale_band', ''),
      nullif(btrim(details ->> 'start_timing'), ''), nullif(btrim(details ->> 'completion_timing'), ''),
      coalesce(nullif(details ->> 'budget_preference', ''), 'not_sure'), nullif(details ->> 'budget_currency', ''),
      nullif(details ->> 'budget_min', '')::numeric, nullif(details ->> 'budget_max', '')::numeric,
      nullif(details ->> 'current_stage', ''), nullif(btrim(details ->> 'special_requirements'), ''),
      nullif(btrim(details ->> 'source_context'), '')
    );
  elsif lead_type_value = 'service' then
    if service_value is null then
      raise exception using errcode = '23514', message = 'A service enquiry needs a service.';
    end if;
    insert into public.lead_service_details (lead_id, service_key, context_text, requirement_text, preferred_timing)
    values (new_id, service_value, nullif(btrim(details ->> 'context_text'), ''),
      coalesce(nullif(btrim(details ->> 'requirement_text'), ''), message_value, summary_value),
      nullif(btrim(details ->> 'preferred_timing'), ''));
  elsif lead_type_value = 'material' then
    if jsonb_typeof(details -> 'items') <> 'array' or jsonb_array_length(details -> 'items') = 0 then
      raise exception using errcode = '23514', message = 'A material enquiry needs at least one item.';
    end if;
    for item in select * from jsonb_array_elements(details -> 'items') loop
      item_index := item_index + 1;
      if item_index > 20 then exit; end if;
      insert into public.lead_material_items (lead_id, sort_order, description, quantity, unit, specification)
      values (new_id, item_index, btrim(item ->> 'description'), nullif(item ->> 'quantity', '')::numeric,
        nullif(btrim(item ->> 'unit'), ''), nullif(btrim(item ->> 'specification'), ''));
    end loop;
  end if;

  if session_id_value is not null then
    update public.lead_attachments set lead_id = new_id where upload_session_id = session.id and lead_id is null;
    get diagnostics attachment_count = row_count;
    update public.lead_upload_sessions set consumed_at = now(), lead_id = new_id where id = session.id;
  end if;

  insert into public.lead_stage_history (lead_id, from_status, to_status) values (new_id, null, 'new');
  perform private.lead_event(new_id, 'submitted', jsonb_build_object('lead_type', lead_type_value, 'source_channel', source_value, 'attachments', attachment_count));
  perform private.s4_audit('lead.public_submit', 'lead', new_id::text, 'success',
    jsonb_build_object('lead_type', lead_type_value, 'source_channel', source_value, 'attachments', attachment_count));
  perform private.emit_realtime_event('lead', new_id, 'submitted');
  return jsonb_build_object('ok', true, 'reference', reference_value, 'lead_type', lead_type_value, 'duplicate', false);
end;
$$;
revoke all on function public.intake_submit_lead(jsonb) from public, anon, authenticated;
grant execute on function public.intake_submit_lead(jsonb) to service_role;

-- Cleanup support: expired, never-submitted upload sessions and their objects.
create or replace function public.intake_expired_upload_sessions(limit_count integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', session.id, 'expires_at', session.expires_at, 'file_count', session.file_count,
    'object_paths', coalesce((select jsonb_agg(object_path) from public.lead_attachments where upload_session_id = session.id and lead_id is null), '[]'::jsonb))
    order by session.expires_at), '[]'::jsonb)
  from (
    select * from public.lead_upload_sessions
    where consumed_at is null and expires_at < now()
    order by expires_at limit greatest(least(limit_count, 500), 1)
  ) as session;
$$;
revoke all on function public.intake_expired_upload_sessions(integer) from public, anon, authenticated;
grant execute on function public.intake_expired_upload_sessions(integer) to service_role;

create or replace function public.intake_purge_upload_session(target_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  if exists (select 1 from public.lead_upload_sessions where id = target_session_id and (consumed_at is not null or expires_at >= now())) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'session', 'Only expired, unsubmitted sessions can be purged.')));
  end if;
  delete from public.lead_attachments where upload_session_id = target_session_id and lead_id is null;
  get diagnostics removed = row_count;
  delete from public.lead_upload_sessions where id = target_session_id and consumed_at is null;
  return jsonb_build_object('ok', true, 'removed_attachments', removed);
end;
$$;
revoke all on function public.intake_purge_upload_session(uuid) from public, anon, authenticated;
grant execute on function public.intake_purge_upload_session(uuid) to service_role;

-- Public projection: intake flags travel with the anonymous site configuration.
create or replace function public.public_site_configuration()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_public_configuration()
    || jsonb_build_object(
      'site_mode', (select site_mode from public.website_settings where id = 1),
      'legal', (select coalesce(jsonb_object_agg(slug, jsonb_build_object('published', published_body is not null, 'title', published_title, 'updated_at', published_at)), '{}'::jsonb)
                from public.legal_pages),
      'intake', (select jsonb_build_object('enabled', intake_enabled, 'upload_policy', upload_policy) from public.intake_settings where id = 1)
    );
$$;
grant execute on function public.public_site_configuration() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Admin facades: read (leads.read)
-- ---------------------------------------------------------------------

create or replace function public.admin_leads_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('leads.read') then
    raise exception using errcode = '42501', message = 'lead overview is not authorized';
  end if;
  select jsonb_build_object(
    'status_counts', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb)
      from (select status, count(*) as total from public.leads where archived_at is null group by status) as s),
    'type_counts', (select coalesce(jsonb_object_agg(lead_type, total), '{}'::jsonb)
      from (select lead_type, count(*) as total from public.leads where archived_at is null group by lead_type) as t),
    'unassigned_count', (select count(*) from public.leads where archived_at is null and assigned_to is null and status not in ('won', 'lost')),
    'new_today_count', (select count(*) from public.leads where archived_at is null and submitted_at >= date_trunc('day', now())),
    'my_open_count', (select count(*) from public.leads where archived_at is null and assigned_to = auth.uid() and status not in ('won', 'lost')),
    'won_30d_count', (select count(*) from public.leads where won_at >= now() - interval '30 days'),
    'lost_30d_count', (select count(*) from public.leads where lost_at >= now() - interval '30 days'),
    'uncontacted_hours', private.intake_setting('lead_uncontacted_hours'),
    'proposal_stale_days', private.intake_setting('proposal_stale_days'),
    'recent', coalesce((select jsonb_agg(private.lead_summary_json(lead) order by lead.submitted_at desc)
      from (select * from public.leads where archived_at is null order by submitted_at desc limit 8) as lead), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
grant execute on function public.admin_leads_overview() to authenticated;

create or replace function public.admin_list_leads(
  page_size integer default 25,
  search_query text default null,
  type_filter text default null,
  status_filter text default null,
  service_filter text default null,
  assigned_filter text default null,
  source_filter text default null,
  status_scope text default 'active',
  submitted_from date default null,
  submitted_to date default null,
  cursor_submitted_at timestamptz default null,
  cursor_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
  effective_size integer := least(greatest(coalesce(page_size, 25), 1), 100);
  assignee uuid := case when assigned_filter ~ '^[0-9a-f-]{36}$' then assigned_filter::uuid when assigned_filter = 'me' then auth.uid() else null end;
  items jsonb;
  total integer;
begin
  if not private.has_permission('leads.read') then
    raise exception using errcode = '42501', message = 'lead register is not authorized';
  end if;
  select coalesce(jsonb_agg(private.lead_summary_json(lead) order by lead.submitted_at desc, lead.id desc), '[]'::jsonb), count(*)
  into items, total
  from (
    select * from public.leads as lead
    where (status_scope = 'all' or (status_scope = 'archived' and archived_at is not null) or (coalesce(status_scope, 'active') = 'active' and archived_at is null))
      and (type_filter is null or lead_type = type_filter)
      and (status_filter is null or status = status_filter)
      and (service_filter is null or service_key = service_filter)
      and (source_filter is null or source_channel = source_filter)
      and (assigned_filter is null or (assigned_filter = 'unassigned' and assigned_to is null) or (assignee is not null and assigned_to = assignee))
      and (submitted_from is null or submitted_at >= submitted_from::timestamptz)
      and (submitted_to is null or submitted_at < (submitted_to + 1)::timestamptz)
      and (normalized_query is null
        or reference ilike '%' || normalized_query || '%'
        or full_name ilike '%' || normalized_query || '%'
        or company ilike '%' || normalized_query || '%'
        or summary ilike '%' || normalized_query || '%'
        or email_normalized = private.normalize_email(normalized_query)
        or phone_normalized = private.normalize_phone(normalized_query))
      and (cursor_submitted_at is null or cursor_id is null
        or (submitted_at, id) < (cursor_submitted_at, cursor_id))
    order by submitted_at desc, id desc
    limit effective_size + 1
  ) as lead;
  return jsonb_build_object(
    'items', case when total > effective_size then (select jsonb_agg(value) from (select value from jsonb_array_elements(items) with ordinality as t(value, n) where n <= effective_size) as trimmed) else items end,
    'has_more', total > effective_size,
    'status_counts', (select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) from (select status, count(*) as c from public.leads where archived_at is null group by status) as sc)
  );
end;
$$;
grant execute on function public.admin_list_leads(integer, text, text, text, text, text, text, text, date, date, timestamptz, uuid) to authenticated;

create or replace function public.admin_get_lead(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lead public.leads%rowtype;
begin
  if not private.has_permission('leads.read') then
    raise exception using errcode = '42501', message = 'lead detail is not authorized';
  end if;
  select * into lead from public.leads where id = target_id;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'lead', private.lead_summary_json(lead) || jsonb_build_object(
      'message', lead.message, 'preferred_contact', lead.preferred_contact, 'service_id', lead.service_id,
      'service_name', (select l.name from public.service_localizations as l where l.service_id = lead.service_id order by (l.locale = 'en') desc limit 1),
      'lost_reason', lead.lost_reason, 'consent_revision', lead.consent_revision, 'consented_at', lead.consented_at,
      'first_contact_at', lead.first_contact_at, 'qualified_at', lead.qualified_at, 'site_visit_at', lead.site_visit_at,
      'won_at', lead.won_at, 'lost_at', lead.lost_at, 'created_at', lead.created_at,
      'created_by_name', (select display_name from public.profiles where id = lead.created_by),
      'whatsapp_digits', case when lead.phone_normalized ~ '^\+?[0-9]{6,}$' then regexp_replace(lead.phone_normalized, '[^0-9]', '', 'g') end,
      'tel_href', case when lead.phone_normalized is not null then 'tel:' || lead.phone_normalized end
    ),
    'project_details', (select to_jsonb(d) - 'lead_id' from public.lead_project_details as d where d.lead_id = lead.id),
    'service_details', (select to_jsonb(d) - 'lead_id' from public.lead_service_details as d where d.lead_id = lead.id),
    'material_items', coalesce((select jsonb_agg(to_jsonb(i) - 'lead_id' order by i.sort_order) from public.lead_material_items as i where i.lead_id = lead.id), '[]'::jsonb),
    'attachments', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'original_filename', a.original_filename, 'detected_mime_type', a.detected_mime_type,
        'byte_size', a.byte_size, 'scan_status', a.scan_status, 'rejection_reason', a.rejection_reason, 'uploaded_at', a.uploaded_at,
        'reviewed_at', a.reviewed_at, 'reviewed_by_name', (select display_name from public.profiles where id = a.reviewed_by))
        order by a.uploaded_at) from public.lead_attachments as a where a.lead_id = lead.id), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'created_at', n.created_at,
        'author', (select display_name from public.profiles where id = n.created_by)) order by n.created_at desc)
        from public.lead_notes as n where n.lead_id = lead.id), '[]'::jsonb),
    'contact_logs', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'contact_type', c.contact_type, 'occurred_at', c.occurred_at, 'note', c.note,
        'actor', (select display_name from public.profiles where id = c.created_by)) order by c.occurred_at desc)
        from public.lead_contact_logs as c where c.lead_id = lead.id), '[]'::jsonb),
    'timeline', private.lead_timeline(lead.id, 60),
    'possible_matches', private.lead_possible_matches(lead.id),
    'client', (select jsonb_build_object('id', c.id, 'full_name', c.full_name, 'company', c.company, 'archived_at', c.archived_at)
      from public.clients as c where c.id = lead.client_id),
    'operational_project', (select jsonb_build_object('id', p.id, 'title', p.title, 'status', p.status, 'current_phase', p.current_phase, 'archived_at', p.archived_at)
      from public.operational_projects as p where p.id = lead.operational_project_id),
    'requirements_created', (select count(*) from public.project_material_requirements as r where r.operational_project_id = lead.operational_project_id
      and lead.operational_project_id is not null and r.private_note like 'Lead ' || lead.reference || '%'),
    'permissions', jsonb_build_object(
      'write', private.has_permission('leads.write'), 'assign', private.has_permission('leads.assign'),
      'convert', private.has_permission('leads.convert'), 'attachments', private.has_permission('leads.attachments.read'),
      'clients_write', private.has_permission('clients.write'), 'projects_write', private.has_permission('operations.projects.write'),
      'materials_write', private.has_permission('procurement.materials.write')
    )
  );
end;
$$;
grant execute on function public.admin_get_lead(uuid) to authenticated;

create or replace function public.admin_lead_assignees()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_permission('leads.assign') then coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name) order by p.display_name)
    from public.profiles as p where p.account_status = 'active'), '[]'::jsonb) else '[]'::jsonb end;
$$;
grant execute on function public.admin_lead_assignees() to authenticated;

create or replace function public.admin_lead_action_queue(limit_count integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uncontacted_hours integer := coalesce(private.intake_setting('lead_uncontacted_hours'), 24);
  stale_days integer := coalesce(private.intake_setting('proposal_stale_days'), 14);
begin
  if not private.has_permission('leads.read') then
    raise exception using errcode = '42501', message = 'lead action queue is not authorized';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('kind', kind, 'lead_id', id, 'reference', reference, 'title', full_name, 'detail', detail) order by rank, submitted_at)
    from (
      select 1 as rank, 'new_unassigned' as kind, id, reference, full_name, submitted_at, 'New lead, nobody assigned' as detail
      from public.leads where archived_at is null and status = 'new' and assigned_to is null
      union all
      select 2, 'new_uncontacted', id, reference, full_name, submitted_at,
        'Not contacted for over ' || uncontacted_hours::text || ' hours'
      from public.leads where archived_at is null and status = 'new' and assigned_to is not null
        and submitted_at < now() - make_interval(hours => uncontacted_hours)
      union all
      select 3, 'qualified_without_client', id, reference, full_name, submitted_at, 'Qualified but not yet linked to a client'
      from public.leads where archived_at is null and status in ('qualified', 'site_visit', 'proposal') and client_id is null
      union all
      select 4, 'project_without_project', id, reference, full_name, submitted_at, 'Qualified project lead without an operational project'
      from public.leads where archived_at is null and lead_type = 'project' and status in ('qualified', 'site_visit', 'proposal')
        and client_id is not null and operational_project_id is null
      union all
      select 5, 'proposal_stale', id, reference, full_name, submitted_at,
        'In proposal for over ' || stale_days::text || ' days'
      from public.leads as lead where archived_at is null and status = 'proposal'
        and greatest(updated_at, (select max(created_at) from public.lead_events where lead_id = lead.id)) < now() - make_interval(days => stale_days)
      order by rank, submitted_at
      limit least(greatest(coalesce(limit_count, 12), 1), 50)
    ) as queue
  ), '[]'::jsonb);
end;
$$;
grant execute on function public.admin_lead_action_queue(integer) to authenticated;

create or replace function public.admin_lead_attachment_path(target_attachment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_permission('leads.attachments.read') then (
    select jsonb_build_object('bucket_id', a.bucket_id, 'object_path', a.object_path, 'detected_mime_type', a.detected_mime_type,
      'original_filename', a.original_filename, 'scan_status', a.scan_status)
    from public.lead_attachments as a where a.id = target_attachment_id and a.lead_id is not null and a.scan_status <> 'rejected'
  ) else null end;
$$;
grant execute on function public.admin_lead_attachment_path(uuid) to authenticated;

create or replace function public.admin_client_leads(target_client_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_permission('leads.read') then coalesce((
    select jsonb_agg(private.lead_summary_json(lead) order by lead.submitted_at desc)
    from public.leads as lead where lead.client_id = target_client_id), '[]'::jsonb) else '[]'::jsonb end;
$$;
grant execute on function public.admin_client_leads(uuid) to authenticated;

create or replace function public.admin_project_originating_lead(target_project_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_permission('leads.read') then (
    select private.lead_summary_json(lead) from public.leads as lead where lead.operational_project_id = target_project_id
  ) else null end;
$$;
grant execute on function public.admin_project_originating_lead(uuid) to authenticated;

create or replace function public.admin_get_intake_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_permission('settings.system.read') or private.has_permission('leads.read') then (
    select jsonb_build_object('intake_enabled', s.intake_enabled, 'upload_policy', s.upload_policy,
      'lead_uncontacted_hours', s.lead_uncontacted_hours, 'proposal_stale_days', s.proposal_stale_days,
      'version', s.version, 'updated_at', s.updated_at)
    from public.intake_settings as s where s.id = 1
  ) else null end;
$$;
grant execute on function public.admin_get_intake_settings() to authenticated;

-- ---------------------------------------------------------------------
-- Admin facades: write
-- ---------------------------------------------------------------------

create or replace function public.update_intake_settings(
  expected_version integer, target_intake_enabled boolean, target_upload_policy text,
  target_lead_uncontacted_hours integer, target_proposal_stale_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.intake_settings%rowtype;
begin
  if not private.has_permission('settings.system.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.system.write is required.')));
  end if;
  select * into current from public.intake_settings where id = 1 for update;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed intake settings first.')));
  end if;
  if target_upload_policy not in ('disabled', 'images_only', 'images_and_pdf') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'upload_policy', 'Upload policy is not admitted.')));
  end if;
  if target_lead_uncontacted_hours not between 1 and 720 or target_proposal_stale_days not between 1 and 365 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'thresholds', 'Thresholds are out of range.')));
  end if;
  update public.intake_settings
     set intake_enabled = target_intake_enabled, upload_policy = target_upload_policy,
         lead_uncontacted_hours = target_lead_uncontacted_hours, proposal_stale_days = target_proposal_stale_days,
         version = version + 1, updated_by = auth.uid()
   where id = 1;
  perform private.s4_audit('intake_settings.update', 'settings', private.settings_entity_id('intake')::text, 'success',
    jsonb_build_object('intake_enabled', target_intake_enabled, 'upload_policy', target_upload_policy));
  perform private.emit_realtime_event('settings', private.settings_entity_id('intake'), 'updated');
  return jsonb_build_object('ok', true, 'version', current.version + 1);
end;
$$;
grant execute on function public.update_intake_settings(integer, boolean, text, integer, integer) to authenticated;

create or replace function public.create_lead_manual(
  target_lead_type text, target_source_channel text, target_full_name text, target_summary text,
  target_email text default null, target_phone text default null, target_company text default null,
  target_location_text text default null, target_message text default null, target_service_key text default null,
  target_priority text default null, assign_to_me boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  reference_value text;
begin
  if not private.has_permission('leads.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.write is required.')));
  end if;
  if target_lead_type not in ('general', 'project', 'service', 'material') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'lead_type', 'Lead type is not admitted.')));
  end if;
  if target_source_channel not in ('whatsapp', 'manual', 'referral', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'source_channel', 'Choose a staff-created source (WhatsApp, manual, referral, other).')));
  end if;
  if target_full_name is null or btrim(target_full_name) = '' or char_length(target_full_name) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'full_name', 'A full name is required.')));
  end if;
  if target_summary is null or btrim(target_summary) = '' or char_length(target_summary) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'summary', 'A short summary is required.')));
  end if;
  if private.normalize_email(target_email) is null and private.normalize_phone(target_phone) is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('missing_contact_method', 'email', 'At least one of email or phone is required.')));
  end if;
  if target_priority is not null and target_priority not in ('low', 'medium', 'high') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'priority', 'Priority is not admitted.')));
  end if;
  if target_service_key is not null and target_service_key not in ('design', 'executions', 'hybrid-service', 'supervision', 'consultations', 'not_sure', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'service_key', 'Service is not admitted.')));
  end if;
  reference_value := private.next_lead_reference();
  insert into public.leads (
    reference, lead_type, source_channel, full_name, email, email_normalized, phone_display, phone_normalized,
    company, location_text, summary, message, service_key, priority, assigned_to, created_by, updated_by
  ) values (
    reference_value, target_lead_type, target_source_channel, btrim(target_full_name), nullif(btrim(target_email), ''),
    private.normalize_email(target_email), nullif(btrim(target_phone), ''), private.normalize_phone(target_phone),
    nullif(btrim(target_company), ''), nullif(btrim(target_location_text), ''), btrim(target_summary),
    nullif(btrim(target_message), ''), target_service_key, target_priority,
    case when assign_to_me then auth.uid() end, auth.uid(), auth.uid()
  ) returning id into new_id;
  if target_lead_type = 'service' then
    insert into public.lead_service_details (lead_id, service_key, requirement_text)
    values (new_id, coalesce(target_service_key, 'not_sure'), coalesce(nullif(btrim(target_message), ''), btrim(target_summary)));
  elsif target_lead_type = 'project' then
    insert into public.lead_project_details (lead_id, need_key, project_type)
    values (new_id, coalesce(target_service_key, 'not_sure'), 'other');
  end if;
  insert into public.lead_stage_history (lead_id, from_status, to_status, changed_by) values (new_id, null, 'new', auth.uid());
  perform private.lead_event(new_id, 'created_manual', jsonb_build_object('lead_type', target_lead_type, 'source_channel', target_source_channel));
  if assign_to_me then
    perform private.lead_event(new_id, 'assigned', jsonb_build_object('assignee', auth.uid()));
  end if;
  perform private.s4_audit('lead.create_manual', 'lead', new_id::text, 'success', jsonb_build_object('lead_type', target_lead_type, 'source_channel', target_source_channel));
  perform private.emit_realtime_event('lead', new_id, 'created');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1, 'reference', reference_value);
end;
$$;
grant execute on function public.create_lead_manual(text, text, text, text, text, text, text, text, text, text, text, boolean) to authenticated;

create or replace function public.update_lead(
  target_id uuid, expected_version integer, target_full_name text, target_summary text,
  target_email text default null, target_phone text default null, target_company text default null,
  target_location_text text default null, target_preferred_contact text default null,
  target_service_key text default null, target_service_id uuid default null, target_priority text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.leads%rowtype;
begin
  if not private.has_permission('leads.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.write is required.')));
  end if;
  select * into current from public.leads where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this lead first.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'Archived leads are read-only.')));
  end if;
  if target_full_name is null or btrim(target_full_name) = '' or char_length(target_full_name) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'full_name', 'A full name is required.')));
  end if;
  if target_summary is null or btrim(target_summary) = '' or char_length(target_summary) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'summary', 'A short summary is required.')));
  end if;
  if private.normalize_email(target_email) is null and private.normalize_phone(target_phone) is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('missing_contact_method', 'email', 'At least one of email or phone is required.')));
  end if;
  if target_preferred_contact is not null and target_preferred_contact not in ('whatsapp', 'email', 'phone', 'none') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'preferred_contact', 'Preferred contact is not admitted.')));
  end if;
  if target_priority is not null and target_priority not in ('low', 'medium', 'high') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'priority', 'Priority is not admitted.')));
  end if;
  if target_service_key is not null and target_service_key not in ('design', 'executions', 'hybrid-service', 'supervision', 'consultations', 'not_sure', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'service_key', 'Service is not admitted.')));
  end if;
  if target_service_id is not null and not exists (select 1 from public.services where id = target_service_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'service_id', 'Service not found.')));
  end if;
  update public.leads
     set full_name = btrim(target_full_name), summary = btrim(target_summary),
         email = nullif(btrim(target_email), ''), email_normalized = private.normalize_email(target_email),
         phone_display = nullif(btrim(target_phone), ''), phone_normalized = private.normalize_phone(target_phone),
         company = nullif(btrim(target_company), ''), location_text = nullif(btrim(target_location_text), ''),
         preferred_contact = target_preferred_contact, service_key = target_service_key, service_id = target_service_id,
         priority = target_priority, version = version + 1, updated_by = auth.uid()
   where id = target_id;
  perform private.lead_event(target_id, 'updated', '{}'::jsonb);
  perform private.s4_audit('lead.update', 'lead', target_id::text, 'success', jsonb_build_object('version', expected_version + 1));
  perform private.emit_realtime_event('lead', target_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;
grant execute on function public.update_lead(uuid, integer, text, text, text, text, text, text, text, text, uuid, text) to authenticated;

create or replace function public.assign_lead(target_id uuid, expected_version integer, target_assignee uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.leads%rowtype;
begin
  if not private.has_permission('leads.assign') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.assign is required.')));
  end if;
  select * into current from public.leads where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this lead first.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'Archived leads are read-only.')));
  end if;
  if target_assignee is not null and not exists (select 1 from public.profiles where id = target_assignee and account_status = 'active') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'assignee', 'Choose an active staff member.')));
  end if;
  update public.leads set assigned_to = target_assignee, version = version + 1, updated_by = auth.uid() where id = target_id;
  perform private.lead_event(target_id, case when target_assignee is null then 'unassigned' else 'assigned' end,
    case when target_assignee is null then '{}'::jsonb else jsonb_build_object('assignee', target_assignee,
      'assignee_name', (select display_name from public.profiles where id = target_assignee), 'self', target_assignee = auth.uid()) end);
  perform private.s4_audit('lead.assign', 'lead', target_id::text, 'success', jsonb_build_object('assignee', target_assignee, 'self', target_assignee = auth.uid()));
  perform private.emit_realtime_event('lead', target_id, 'assigned');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;
grant execute on function public.assign_lead(uuid, integer, uuid) to authenticated;

create or replace function public.change_lead_status(
  target_id uuid, expected_version integer, target_status text, target_reason_code text default null, target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.leads%rowtype;
begin
  if not private.has_permission('leads.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.write is required.')));
  end if;
  select * into current from public.leads where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this lead first.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'Archived leads are read-only.')));
  end if;
  if target_status not in ('new', 'contacted', 'qualified', 'site_visit', 'proposal', 'won', 'lost') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'status', 'Status is not admitted.')));
  end if;
  if target_status = current.status then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'The lead is already in that stage.')));
  end if;
  if target_status = 'lost' and (target_reason_code is null or target_reason_code not in ('not_ready', 'budget', 'timeline', 'not_a_fit', 'unreachable', 'chose_another_provider', 'duplicate', 'other')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason_code', 'Choose a reason for marking this lead lost.')));
  end if;
  if target_status = 'won' then
    if current.client_id is null then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'client_id', 'Convert the lead to a client before marking it won.')));
    end if;
    if current.lead_type = 'project' and current.operational_project_id is null then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'operational_project_id', 'Create the operational project before marking a project lead won.')));
    end if;
  end if;
  if target_note is not null and (btrim(target_note) = '' or char_length(target_note) > 4000) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'note', 'Note is invalid.')));
  end if;
  update public.leads
     set status = target_status,
         lost_reason = case when target_status = 'lost' then target_reason_code else null end,
         first_contact_at = case when target_status <> 'new' then coalesce(first_contact_at, now()) else first_contact_at end,
         qualified_at = case when target_status = 'qualified' then coalesce(qualified_at, now()) else qualified_at end,
         site_visit_at = case when target_status = 'site_visit' then now() else site_visit_at end,
         won_at = case when target_status = 'won' then now() else null end,
         lost_at = case when target_status = 'lost' then now() else null end,
         version = version + 1, updated_by = auth.uid()
   where id = target_id;
  insert into public.lead_stage_history (lead_id, from_status, to_status, reason_code, changed_by)
  values (target_id, current.status, target_status, case when target_status = 'lost' then target_reason_code end, auth.uid());
  if target_note is not null then
    insert into public.lead_notes (lead_id, body, created_by, updated_by) values (target_id, btrim(target_note), auth.uid(), auth.uid());
  end if;
  perform private.lead_event(target_id, 'status_changed', jsonb_build_object('from', current.status, 'to', target_status));
  perform private.s4_audit('lead.status_change', 'lead', target_id::text, 'success',
    jsonb_build_object('from', current.status, 'to', target_status, 'reason_code', case when target_status = 'lost' then target_reason_code end));
  perform private.emit_realtime_event('lead', target_id, 'status_changed');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;
grant execute on function public.change_lead_status(uuid, integer, text, text, text) to authenticated;

create or replace function public.log_lead_contact(target_id uuid, target_contact_type text, target_occurred_at timestamptz default now(), target_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.has_permission('leads.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.write is required.')));
  end if;
  if not exists (select 1 from public.leads where id = target_id and archived_at is null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found or archived.')));
  end if;
  if target_contact_type not in ('phone_call', 'whatsapp', 'email', 'meeting', 'site_visit', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'contact_type', 'Contact type is not admitted.')));
  end if;
  if target_occurred_at is null or target_occurred_at > now() + interval '1 hour' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'occurred_at', 'Contact time must not be in the future.')));
  end if;
  if target_note is not null and char_length(target_note) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'note', 'Keep the note under 1000 characters.')));
  end if;
  insert into public.lead_contact_logs (lead_id, contact_type, occurred_at, note, created_by)
  values (target_id, target_contact_type, target_occurred_at, nullif(btrim(target_note), ''), auth.uid())
  returning id into new_id;
  update public.leads
     set first_contact_at = coalesce(first_contact_at, target_occurred_at),
         site_visit_at = case when target_contact_type = 'site_visit' then target_occurred_at else site_visit_at end,
         version = version + 1, updated_by = auth.uid()
   where id = target_id;
  perform private.lead_event(target_id, 'contact_logged', jsonb_build_object('contact_type', target_contact_type, 'log_id', new_id));
  perform private.s4_audit('lead.contact_log', 'lead', target_id::text, 'success', jsonb_build_object('contact_type', target_contact_type, 'log_id', new_id));
  perform private.emit_realtime_event('lead', target_id, 'contact_logged');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', (select version from public.leads where id = target_id));
end;
$$;
grant execute on function public.log_lead_contact(uuid, text, timestamptz, text) to authenticated;

create or replace function public.create_lead_note(target_id uuid, body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.has_permission('leads.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.write is required.')));
  end if;
  if body is null or btrim(body) = '' or char_length(body) > 4000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'body', 'Write a note of up to 4000 characters.')));
  end if;
  if not exists (select 1 from public.leads where id = target_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  insert into public.lead_notes (lead_id, body, created_by, updated_by) values (target_id, btrim(body), auth.uid(), auth.uid()) returning id into new_id;
  perform private.lead_event(target_id, 'note_created', jsonb_build_object('note_id', new_id));
  perform private.s4_audit('lead.note_create', 'lead', target_id::text, 'success', jsonb_build_object('note_id', new_id));
  perform private.emit_realtime_event('lead', target_id, 'note_created');
  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;
grant execute on function public.create_lead_note(uuid, text) to authenticated;

-- Idempotent, race-safe conversion: the lead row is locked; once client_id is
-- set every later call returns the same client without creating another.
create or replace function public.convert_lead_to_client(
  target_id uuid, expected_version integer, existing_client_id uuid default null,
  target_full_name text default null, target_email text default null, target_phone text default null,
  target_company text default null, target_address text default null, target_tier text default 'standard'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.leads%rowtype;
  client_row public.clients%rowtype;
  new_client_id uuid;
  chosen_name text;
  chosen_email text;
  chosen_phone text;
begin
  if not private.has_permission('leads.convert') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.convert is required.')));
  end if;
  select * into current from public.leads where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'Archived leads are read-only.')));
  end if;
  if current.client_id is not null then
    return jsonb_build_object('ok', true, 'id', target_id, 'client_id', current.client_id, 'version', current.version, 'already_linked', true);
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this lead first.')));
  end if;
  if existing_client_id is not null then
    select * into client_row from public.clients where id = existing_client_id;
    if not found or client_row.archived_at is not null then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'client_id', 'Choose an active client to link.')));
    end if;
    new_client_id := existing_client_id;
  else
    if not private.has_permission('clients.write') then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', 'client', 'clients.write is required to create a client from this lead.')));
    end if;
    chosen_name := coalesce(nullif(btrim(target_full_name), ''), current.full_name);
    chosen_email := coalesce(nullif(btrim(target_email), ''), current.email);
    chosen_phone := coalesce(nullif(btrim(target_phone), ''), current.phone_display);
    if char_length(chosen_name) > 200 then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'full_name', 'Name is too long.')));
    end if;
    if private.normalize_email(chosen_email) is null and private.normalize_phone(chosen_phone) is null then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('missing_contact_method', 'email', 'At least one of email or phone is required.')));
    end if;
    if target_tier not in ('standard', 'vip', 'premium') then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'client_tier', 'Client tier is not admitted.')));
    end if;
    insert into public.clients (full_name, email, email_normalized, phone_display, phone_normalized, address, company, client_tier, referral_source, created_by, updated_by)
    values (chosen_name, chosen_email, private.normalize_email(chosen_email), chosen_phone, private.normalize_phone(chosen_phone),
      nullif(btrim(coalesce(target_address, current.location_text)), ''), nullif(btrim(coalesce(target_company, current.company)), ''),
      target_tier, 'Lead ' || current.reference, auth.uid(), auth.uid())
    returning id into new_client_id;
    perform private.s4_audit('client.create', 'client', new_client_id::text, 'success', jsonb_build_object('client_tier', target_tier, 'from_lead', current.reference));
    perform private.emit_realtime_event('client', new_client_id, 'created');
  end if;
  update public.leads set client_id = new_client_id, version = version + 1, updated_by = auth.uid() where id = target_id;
  perform private.lead_event(target_id, 'converted_client', jsonb_build_object('client_id', new_client_id, 'created', existing_client_id is null));
  perform private.s4_audit('lead.convert_client', 'lead', target_id::text, 'success', jsonb_build_object('client_id', new_client_id, 'created', existing_client_id is null));
  perform private.emit_realtime_event('lead', target_id, 'converted');
  return jsonb_build_object('ok', true, 'id', target_id, 'client_id', new_client_id, 'version', expected_version + 1, 'already_linked', false, 'created', existing_client_id is null);
end;
$$;
grant execute on function public.convert_lead_to_client(uuid, integer, uuid, text, text, text, text, text, text) to authenticated;

create or replace function public.create_project_from_lead(
  target_id uuid, expected_version integer, target_title text, target_phase text default 'planning',
  target_description text default null, target_priority text default 'medium', target_start_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.leads%rowtype;
  new_project_id uuid;
begin
  if not private.has_permission('leads.convert') or not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.convert and operations.projects.write are required.')));
  end if;
  select * into current from public.leads where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'Archived leads are read-only.')));
  end if;
  if current.operational_project_id is not null then
    return jsonb_build_object('ok', true, 'id', target_id, 'project_id', current.operational_project_id, 'version', current.version, 'already_linked', true);
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this lead first.')));
  end if;
  if current.client_id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'client_id', 'Convert the lead to a client first.')));
  end if;
  if exists (select 1 from public.clients where id = current.client_id and archived_at is not null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'client_id', 'The linked client is archived.')));
  end if;
  if target_title is null or btrim(target_title) = '' or char_length(target_title) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'title', 'A project title is required.')));
  end if;
  if target_phase not in ('design', 'planning', 'procurement', 'structural', 'execution', 'finishing') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'current_phase', 'Choose the phase the project actually starts in.')));
  end if;
  if target_priority not in ('low', 'medium', 'high') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'priority', 'Priority is not admitted.')));
  end if;
  if target_description is not null and char_length(target_description) > 4000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'description', 'Description is too long.')));
  end if;
  insert into public.operational_projects (client_id, title, description, status, current_phase, priority, start_date, created_by, updated_by)
  values (current.client_id, btrim(target_title), nullif(btrim(target_description), ''), 'planning', target_phase, target_priority, target_start_date, auth.uid(), auth.uid())
  returning id into new_project_id;
  update public.leads set operational_project_id = new_project_id, version = version + 1, updated_by = auth.uid() where id = target_id;
  perform private.s4_audit('operational_project.create', 'operational_project', new_project_id::text, 'success', jsonb_build_object('from_lead', current.reference, 'current_phase', target_phase));
  perform private.emit_realtime_event('operational_project', new_project_id, 'created');
  perform private.lead_event(target_id, 'project_created', jsonb_build_object('project_id', new_project_id));
  perform private.s4_audit('lead.convert_project', 'lead', target_id::text, 'success', jsonb_build_object('project_id', new_project_id));
  perform private.emit_realtime_event('lead', target_id, 'converted');
  return jsonb_build_object('ok', true, 'id', target_id, 'project_id', new_project_id, 'version', expected_version + 1, 'already_linked', false);
end;
$$;
grant execute on function public.create_project_from_lead(uuid, integer, text, text, text, text, date) to authenticated;

-- Deliberate bridge: selected enquiry items become C6 project material
-- requirements through the existing facade (no purchase orders, no supplier
-- orders, no inventory movement).
create or replace function public.create_material_requirements_from_lead(target_id uuid, expected_version integer, items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.leads%rowtype;
  item jsonb;
  outcome jsonb;
  created integer := 0;
  created_ids jsonb := '[]'::jsonb;
begin
  if not private.has_permission('leads.convert') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.convert is required.')));
  end if;
  select * into current from public.leads where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this lead first.')));
  end if;
  if current.operational_project_id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'operational_project_id', 'Create or link the operational project first.')));
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 or jsonb_array_length(items) > 20 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'items', 'Select between one and twenty items.')));
  end if;
  for item in select * from jsonb_array_elements(items) loop
    outcome := public.create_material_requirement(
      current.operational_project_id, item ->> 'item_name', (item ->> 'quantity')::numeric, item ->> 'unit',
      null, nullif(item ->> 'specification', ''), nullif(item ->> 'required_by', '')::date,
      coalesce(nullif(item ->> 'priority', ''), 'medium'), 'Lead ' || current.reference || ' enquiry item', 'draft'
    );
    if outcome ->> 'ok' <> 'true' then
      raise exception using errcode = 'P0001', message = coalesce(outcome #>> '{reasons,0,detail}', 'Requirement could not be created.');
    end if;
    created := created + 1;
    created_ids := created_ids || jsonb_build_array(outcome -> 'id');
  end loop;
  update public.leads set version = version + 1, updated_by = auth.uid() where id = target_id;
  perform private.lead_event(target_id, 'requirements_created', jsonb_build_object('count', created, 'project_id', current.operational_project_id));
  perform private.s4_audit('lead.material_requirements_create', 'lead', target_id::text, 'success', jsonb_build_object('count', created, 'project_id', current.operational_project_id));
  perform private.emit_realtime_event('lead', target_id, 'converted');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'created', created, 'requirement_ids', created_ids);
exception when others then
  if sqlstate = 'P0001' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'items', sqlerrm)));
  end if;
  raise;
end;
$$;
grant execute on function public.create_material_requirements_from_lead(uuid, integer, jsonb) to authenticated;

create or replace function public.review_lead_attachment(target_attachment_id uuid, target_state text, target_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attachment public.lead_attachments%rowtype;
begin
  if not private.has_permission('leads.write') or not private.has_permission('leads.attachments.read') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.write and leads.attachments.read are required.')));
  end if;
  select * into attachment from public.lead_attachments where id = target_attachment_id and lead_id is not null for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Attachment not found.')));
  end if;
  if target_state not in ('safe', 'rejected') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'state', 'Choose safe or rejected.')));
  end if;
  if target_state = 'rejected' and (target_reason is null or btrim(target_reason) = '' or char_length(target_reason) > 200) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'Give a short reason for rejecting the file.')));
  end if;
  update public.lead_attachments
     set scan_status = target_state, rejection_reason = case when target_state = 'rejected' then btrim(target_reason) end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = target_attachment_id;
  perform private.lead_event(attachment.lead_id, 'attachment_reviewed', jsonb_build_object('attachment_id', attachment.id, 'state', target_state));
  perform private.s4_audit('lead.attachment_review', 'lead', attachment.lead_id::text, 'success', jsonb_build_object('attachment_id', attachment.id, 'state', target_state));
  perform private.emit_realtime_event('lead', attachment.lead_id, 'updated');
  return jsonb_build_object('ok', true, 'id', attachment.id);
end;
$$;
grant execute on function public.review_lead_attachment(uuid, text, text) to authenticated;

create or replace function public.archive_lead(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.leads%rowtype;
begin
  if not private.has_permission('leads.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'leads.write is required.')));
  end if;
  select * into current from public.leads where id = target_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Lead not found.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed this lead first.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'This lead is already archived.')));
  end if;
  update public.leads set archived_at = now(), version = version + 1, updated_by = auth.uid() where id = target_id;
  perform private.lead_event(target_id, 'archived', '{}'::jsonb);
  perform private.s4_audit('lead.archive', 'lead', target_id::text, 'success', '{}'::jsonb);
  perform private.emit_realtime_event('lead', target_id, 'archived');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;
grant execute on function public.archive_lead(uuid, integer) to authenticated;

-- Quick Find: LEAD kind by reference, name, company (leads.read).
create or replace function private.lead_quick_find(normalized_query text, limit_count integer default 8)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case when private.has_permission('leads.read') then coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'lead', 'id', id, 'label', reference || ' · ' || full_name, 'detail', coalesce(company, status)))
    from (select id, reference, full_name, company, status from public.leads where archived_at is null
          and (reference ilike '%' || normalized_query || '%' or full_name ilike '%' || normalized_query || '%' or company ilike '%' || normalized_query || '%')
          order by submitted_at desc limit limit_count) as lead), '[]'::jsonb) else '[]'::jsonb end;
$$;
revoke all on function private.lead_quick_find(text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Quick Find + Launch Readiness re-created with lead awareness
-- ---------------------------------------------------------------------

create or replace function public.admin_global_quick_find(search_query text, limit_count integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
  result jsonb := '[]'::jsonb;
begin
  if normalized_query is null or char_length(normalized_query) < 2 then
    return '[]'::jsonb;
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 20 then
    limit_count := 8;
  end if;
  if private.has_permission('clients.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'client', 'id', id, 'label', full_name, 'detail', company))
      from (select id, full_name, company from public.clients where archived_at is null
            and (full_name ilike '%' || normalized_query || '%' or company ilike '%' || normalized_query || '%')
            order by full_name limit limit_count) as client), '[]'::jsonb);
  end if;
  if private.has_permission('operations.projects.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'project', 'id', id, 'label', title, 'detail', status))
      from (select id, title, status from public.operational_projects where archived_at is null and title ilike '%' || normalized_query || '%'
            order by updated_at desc limit limit_count) as project), '[]'::jsonb);
  end if;
  if private.has_permission('finance.invoices.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'invoice', 'id', id, 'label', label, 'detail', detail))
      from (select invoice.id, coalesce(invoice.invoice_number, 'Draft') as label, client.full_name || ' · ' || invoice.lifecycle_state as detail
            from public.invoices as invoice join public.clients as client on client.id = invoice.client_id
            left join public.operational_projects as project on project.id = invoice.operational_project_id
            where invoice.archived_at is null and (invoice.invoice_number ilike '%' || normalized_query || '%'
              or invoice.reference ilike '%' || normalized_query || '%' or client.full_name ilike '%' || normalized_query || '%'
              or project.title ilike '%' || normalized_query || '%')
            order by invoice.updated_at desc limit limit_count) as invoice), '[]'::jsonb);
  end if;
  if private.has_permission('partners.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', case when 'contractor' = any (capabilities) then 'contractor' else 'supplier' end,
        'id', id, 'label', display_name, 'detail', coalesce(company_name, array_to_string(capabilities, ' + '))))
      from (select id, display_name, company_name, capabilities from public.trade_partners where archived_at is null
            and (display_name ilike '%' || normalized_query || '%' or company_name ilike '%' || normalized_query || '%')
            order by display_name limit limit_count) as partner), '[]'::jsonb);
  end if;
  if private.has_permission('procurement.materials.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'material', 'id', id, 'label', name, 'detail', coalesce(internal_code, category)))
      from (select id, name, internal_code, category from public.materials where archived_at is null
            and (name ilike '%' || normalized_query || '%' or internal_code ilike '%' || normalized_query || '%')
            order by name limit limit_count) as material), '[]'::jsonb);
  end if;
  if private.has_permission('procurement.orders.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'purchase_order', 'id', id, 'label', label, 'detail', detail))
      from (select po.id, coalesce(po.purchase_order_number, 'Draft PO') as label, supplier.display_name || ' · ' || po.lifecycle_state as detail
            from public.purchase_orders as po join public.trade_partners as supplier on supplier.id = po.supplier_id
            where po.purchase_order_number ilike '%' || normalized_query || '%' or po.reference ilike '%' || normalized_query || '%'
              or supplier.display_name ilike '%' || normalized_query || '%'
            order by po.updated_at desc limit limit_count) as po), '[]'::jsonb);
  end if;
  if private.has_permission('content.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'case_study', 'id', id, 'label', title, 'detail', publication_status))
      from (select project.id, localization.title, project.publication_status from public.projects as project
            join public.project_localizations as localization on localization.project_id = project.id and localization.locale = 'en'
            where localization.title ilike '%' || normalized_query || '%' order by project.updated_at desc limit limit_count) as case_study), '[]'::jsonb);
  end if;
  result := result || private.lead_quick_find(normalized_query, limit_count);
  result := result || private.settings_quick_find(normalized_query);
  return result;
end;
$$;
grant execute on function public.admin_global_quick_find(text, integer) to authenticated;

create or replace function private.launch_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  profile public.business_profile%rowtype;
  location public.business_location%rowtype;
  site public.website_settings%rowtype;
  brand public.brand_media_settings%rowtype;
  seo public.seo_settings%rowtype;
  cfg jsonb := private.current_public_configuration();
  checks jsonb := '[]'::jsonb;
  has_whatsapp boolean;
  privacy_published boolean;
  terms_published boolean;
  unpublished_drafts boolean;
  intake public.intake_settings%rowtype;
  privacy_covers_intake boolean;
begin
  select * into intake from public.intake_settings where id = 1;
  select * into profile from public.business_profile where id = 1;
  select * into location from public.business_location where id = 1;
  select * into site from public.website_settings where id = 1;
  select * into brand from public.brand_media_settings where id = 1;
  select * into seo from public.seo_settings where id = 1;
  has_whatsapp := exists (select 1 from public.contact_channels where channel_type = 'whatsapp' and is_public and active and private.whatsapp_digits(value) is not null);
  privacy_published := exists (select 1 from public.legal_pages where slug = 'privacy' and published_body is not null);
  privacy_covers_intake := exists (select 1 from public.legal_pages where slug = 'privacy' and published_body ilike '%enquiries and project submissions%');
  terms_published := exists (select 1 from public.legal_pages where slug = 'terms' and published_body is not null);
  unpublished_drafts := cfg = '{}'::jsonb or private.build_public_configuration() is distinct from (cfg - 'published_at' - 'snapshot_id');

  checks := checks
    || jsonb_build_object('key', 'business_identity', 'label', 'Business identity configured', 'classification', 'required',
         'state', case when btrim(profile.display_name) <> '' and profile.primary_email is not null then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'public_email', 'label', 'Public email published', 'classification', 'required',
         'state', case when cfg #>> '{contact,primary_email}' is not null then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'whatsapp', 'label', 'WhatsApp channel configured', 'classification', 'required',
         'state', case when has_whatsapp then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'location', 'label', 'Location published', 'classification', 'optional',
         'state', case when location.publish_location then 'ready' else 'warning' end,
         'detail', case when location.publish_location then null else 'Location is omitted from the public site until configured and published.' end)
    || jsonb_build_object('key', 'seo_title', 'label', 'SEO site name and title template', 'classification', 'required',
         'state', case when btrim(seo.site_name) <> '' and seo.title_template like '%\%s%' then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'seo_description', 'label', 'Default meta description', 'classification', 'required',
         'state', case when coalesce(char_length(seo.meta_description), 0) between 40 and 320 then 'ready' when seo.meta_description is null then 'blocked' else 'warning' end)
    || jsonb_build_object('key', 'canonical_url', 'label', 'Canonical site URL', 'classification', 'required',
         'state', case when site.canonical_base_url ~ '^https://' then 'ready' when site.canonical_base_url is not null then 'warning' else 'blocked' end)
    || jsonb_build_object('key', 'og_image', 'label', 'Default social/OG image', 'classification', 'recommended',
         'state', case when private.brand_media_public(coalesce(brand.default_og_media_id, brand.default_share_media_id)) then 'ready' else 'warning' end)
    || jsonb_build_object('key', 'logo', 'label', 'Primary logo media', 'classification', 'recommended',
         'state', case when private.brand_media_public(brand.primary_logo_media_id) then 'ready' else 'warning' end,
         'detail', case when private.brand_media_public(brand.primary_logo_media_id) then null else 'The working RENZ mark renders until a logo asset is selected.' end)
    || jsonb_build_object('key', 'privacy_published', 'label', 'Privacy notice published', 'classification', 'required',
         'state', case when privacy_published then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'terms_published', 'label', 'Terms of use published', 'classification', 'required',
         'state', case when terms_published then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'configuration_published', 'label', 'Public configuration published (no unpublished changes)', 'classification', 'required',
         'state', case when cfg = '{}'::jsonb then 'blocked' when unpublished_drafts then 'warning' else 'ready' end)
    || jsonb_build_object('key', 'site_mode', 'label', 'Site mode', 'classification', 'info',
         'state', case when site.site_mode = 'live' then 'ready' else 'warning' end, 'detail', 'Currently ' || site.site_mode || '.')
    || jsonb_build_object('key', 'start_project', 'label', 'Start-a-Project intake', 'classification', 'recommended',
         'state', case when intake.intake_enabled then 'ready' else 'warning' end,
         'detail', case when intake.intake_enabled then 'Real intake (contact, service, project and material enquiries) is live and lands in Leads.' else 'Online intake is paused in Settings; the public forms show the WhatsApp and email fallback.' end)
    || jsonb_build_object('key', 'intake_enabled', 'label', 'Online intake enabled', 'classification', 'info',
         'state', case when intake.intake_enabled then 'ready' else 'warning' end, 'detail', 'Currently ' || case when intake.intake_enabled then 'enabled' else 'paused' end || '.')
    || jsonb_build_object('key', 'privacy_covers_intake', 'label', 'Published privacy notice covers online enquiries', 'classification', case when intake.intake_enabled then 'required' else 'recommended' end,
         'state', case when privacy_covers_intake then 'ready' when intake.intake_enabled then 'blocked' else 'warning' end,
         'detail', case when privacy_covers_intake then null else 'Publish the C8 privacy revision (section "Enquiries and project submissions") before accepting enquiries on the live site.' end)
    || jsonb_build_object('key', 'upload_policy', 'label', 'Supporting-file policy', 'classification', 'required',
         'state', case when intake.upload_policy in ('disabled', 'images_only') then 'ready' else 'warning' end,
         'detail', case when intake.upload_policy = 'images_and_pdf' then 'PDF uploads are accepted but no malware scanner is integrated (C10); images-only is the safe launch policy.' when intake.upload_policy = 'disabled' then 'Uploads are disabled.' else 'Images only: JPEG, PNG and WebP validated by signature, stored in private quarantine.' end)
    || jsonb_build_object('key', 'public_contact', 'label', 'Public contact route available', 'classification', 'required',
         'state', case when cfg #>> '{contact,primary_email}' is not null or has_whatsapp then 'ready' else 'blocked' end)
    || jsonb_build_object('key', 'analytics', 'label', 'Analytics', 'classification', 'optional',
         'state', case when site.analytics_enabled then 'warning' else 'ready' end,
         'detail', case when site.analytics_enabled then 'Analytics is flagged on but the provider integration arrives in C9; consent_required = ' || site.consent_required::text else 'No visitor analytics run; no consent prompt is needed.' end);
  return jsonb_build_object(
    'checks', checks,
    'overall', case
      when exists (select 1 from jsonb_array_elements(checks) as c where c ->> 'state' = 'blocked' and c ->> 'classification' = 'required') then 'blocked'
      when exists (select 1 from jsonb_array_elements(checks) as c where c ->> 'state' in ('warning', 'blocked')) then 'warning'
      else 'ready' end,
    'evidence', jsonb_build_array(
      jsonb_build_object('key', 'real_project_evidence', 'label', 'Real project evidence (photos, scope, client permission)', 'classification', 'required',
        'state', case when exists (select 1 from public.projects where private.is_public_content('project', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'testimonials', 'label', 'Approved client testimonials', 'classification', 'recommended',
        'state', case when exists (select 1 from public.testimonials where private.is_public_content('testimonial', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'team_profiles', 'label', 'Team profiles', 'classification', 'optional',
        'state', case when exists (select 1 from public.team_members where private.is_public_content('team_member', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'credentials', 'label', 'Verified credentials / certifications', 'classification', 'recommended',
        'state', case when exists (select 1 from public.credentials where private.is_public_content('credential', id)) then 'ready' else 'warning' end),
      jsonb_build_object('key', 'office_location', 'label', 'Office address / location', 'classification', 'optional',
        'state', case when location.publish_location then 'ready' else 'warning' end),
      jsonb_build_object('key', 'registration_details', 'label', 'Business registration details (legal name, country)', 'classification', 'recommended',
        'state', case when profile.legal_name is not null and profile.country is not null then 'ready' else 'warning' end),
      jsonb_build_object('key', 'tax_details', 'label', 'Tax label / rate confirmed by the owner', 'classification', 'recommended',
        'state', case when (select d.version from public.document_defaults as d where d.id = 1) > 1 then 'ready' else 'warning' end),
      jsonb_build_object('key', 'payment_instructions', 'label', 'Bank / payment instructions for invoices', 'classification', 'recommended',
        'state', case when (select d.invoice_payment_terms from public.document_defaults as d where d.id = 1) is not null then 'ready' else 'warning' end),
      jsonb_build_object('key', 'social_profiles', 'label', 'Social profiles', 'classification', 'optional',
        'state', case when exists (select 1 from public.social_links where active) then 'ready' else 'warning' end)
    )
  );
end;
$$;
revoke all on function private.launch_readiness() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Privacy DRAFT revision describing real intake (never auto-published)
-- ---------------------------------------------------------------------

update public.legal_pages
   set draft_body = E'DRAFT — starter text prepared from the actual behaviour of this application. It is not legal advice and must be reviewed and published by the RENZ owner before it appears publicly.\n\n## What this website collects\n\n- Public pages can be read without an account. No visitor analytics or session replay run at present.\n- Contact happens by email or WhatsApp on the visitor''s own device; the website itself does not send messages.\n\n## Enquiries and project submissions\n\nThe Contact form, Service enquiries, the Start-a-Project intake and Material enquiries are stored so RENZ staff can respond. RENZ keeps the details you enter (your name, email address and/or phone or WhatsApp number, company, location and the description of what you need), the time of submission, the reference number shown to you and the version of this notice you acknowledged. Supporting files you attach (photos, sketches, drawings or PDF briefs) are stored privately, reviewed by RENZ staff before use and are never published on the website. Submissions are used only to review, respond to and, if you engage RENZ, deliver the work; they may be linked to a client record and a project record inside RENZ''s private operating system. Staff access is restricted and logged.\n\n## Protecting the forms\n\nTo limit abuse the forms apply rate limits and automated-submission checks. For that purpose a one-way hash derived from your network address is kept for a short period; your address itself is not stored with your enquiry. If an optional bot-protection service is enabled it is named on the form.\n\n## Secure document links\n\nRENZ may send clients a private invoice link and suppliers a private purchase order link. Anyone holding a link can view that one document; links can be revoked by RENZ.\n\n## Staff access\n\nStaff sign in with a password and a second factor. Security-relevant staff actions are logged.\n\n## Cookies and local storage\n\nThe public website sets no tracking cookies. The staff area uses session cookies required to stay signed in. If visitor analytics are introduced later, this notice and any consent prompt will be updated first.\n\n## Contact\n\nQuestions about this notice, or requests to review or remove an enquiry you sent, can be sent to the public RENZ email address shown on the Contact page.',
       version = version + 1
 where slug = 'privacy' and draft_is_starter;

update public.legal_pages
   set draft_body = draft_body || E'\n\n## Enquiries and project submissions (C8 draft addendum — review before publishing)\n\nThe Contact form, Service enquiries, the Start-a-Project intake and Material enquiries are stored so RENZ staff can respond. RENZ keeps the details you enter (name, email and/or phone or WhatsApp number, company, location and the description of what you need), the time of submission, the reference number shown to you and the version of this notice you acknowledged. Supporting files you attach are stored privately, reviewed by staff before use and never published. Submissions are used only to review, respond to and, if you engage RENZ, deliver the work; they may be linked to a client and project record inside RENZ''s private operating system. To limit abuse the forms apply rate limits and automated-submission checks using a short-lived one-way hash derived from your network address; the address itself is not stored with your enquiry.',
       version = version + 1
 where slug = 'privacy' and not draft_is_starter
   and draft_body not ilike '%enquiries and project submissions%';
