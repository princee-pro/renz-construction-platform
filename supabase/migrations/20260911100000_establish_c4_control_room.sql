-- RENZ Phase 1 / C4: Client CRM + Operational Project Management + Control
-- Room foundation.
--
-- This is the PRIVATE business domain. It is deliberately separate from the
-- public case-study domain established in S4/S5C (public.projects,
-- public.project_localizations, ...): no client identity, budget, or
-- internal scheduling is ever added to those tables, and no public
-- projection is created for anything in this migration. See
-- docs/CLAUDE_C4_OPERATIONAL_PROJECT_DOMAIN.md and
-- docs/CLAUDE_C3_PUBLIC_OPERATIONAL_PROJECT_BOUNDARY.md.
--
-- Security shape mirrors S5A/S5C exactly: default-deny RLS on every base
-- table, zero direct grants to anon/authenticated, and a narrow set of
-- SECURITY DEFINER RPCs as the only way in. private.has_permission(),
-- private.failure(), and private.s4_audit() are reused unchanged from S3/S4.

-- ---------------------------------------------------------------------
-- Normalization helpers
-- ---------------------------------------------------------------------

create or replace function private.normalize_email(target text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select nullif(lower(btrim(target)), '');
$$;

create or replace function private.normalize_phone(target text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  -- Keeps a leading + and digits only; a human-readable original is kept
  -- separately (phone_display) so this is safe to use purely for
  -- lookup/comparison, never for display.
  select nullif(
    regexp_replace(btrim(target), '(?!^\+)[^0-9]', '', 'g'),
    ''
  );
$$;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  email_normalized text,
  phone_display text,
  phone_normalized text,
  address text,
  company text,
  client_tier text not null default 'standard',
  referral_source text,
  external_reference text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint clients_full_name_check check (btrim(full_name) <> '' and char_length(full_name) <= 200),
  constraint clients_tier_check check (client_tier in ('standard', 'vip', 'premium')),
  constraint clients_contact_method_check check (email_normalized is not null or phone_normalized is not null),
  constraint clients_email_check check (email is null or char_length(email) <= 254),
  constraint clients_phone_check check (phone_display is null or char_length(phone_display) <= 40),
  constraint clients_address_check check (address is null or char_length(address) <= 400),
  constraint clients_company_check check (company is null or char_length(company) <= 200),
  constraint clients_referral_source_check check (referral_source is null or char_length(referral_source) <= 200),
  constraint clients_external_reference_check check (external_reference is null or char_length(external_reference) <= 120),
  constraint clients_version_check check (version > 0)
);

create index clients_updated_idx on public.clients (updated_at desc, id desc);
create index clients_email_normalized_idx on public.clients (email_normalized) where email_normalized is not null;
create index clients_phone_normalized_idx on public.clients (phone_normalized) where phone_normalized is not null;
create index clients_archived_idx on public.clients (archived_at);
create index clients_created_by_idx on public.clients (created_by);
create index clients_updated_by_idx on public.clients (updated_by);

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  body text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint client_notes_body_check check (btrim(body) <> '' and char_length(body) <= 4000),
  constraint client_notes_version_check check (version > 0)
);

create index client_notes_client_idx on public.client_notes (client_id, created_at desc);
create index client_notes_created_by_idx on public.client_notes (created_by);
create index client_notes_updated_by_idx on public.client_notes (updated_by);

create table public.operational_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'planning',
  current_phase text not null default 'design',
  priority text not null default 'medium',
  start_date date,
  end_date date,
  budget_amount numeric(14, 2),
  budget_currency text,
  public_case_study_id uuid references public.projects (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint operational_projects_title_check check (btrim(title) <> '' and char_length(title) <= 200),
  constraint operational_projects_description_check check (description is null or char_length(description) <= 4000),
  constraint operational_projects_status_check check (status in ('planning', 'in_progress', 'on_hold', 'completed')),
  constraint operational_projects_phase_check
    check (current_phase in ('design', 'planning', 'procurement', 'structural', 'execution', 'finishing', 'completed')),
  constraint operational_projects_priority_check check (priority in ('low', 'medium', 'high')),
  constraint operational_projects_dates_check check (start_date is null or end_date is null or end_date >= start_date),
  constraint operational_projects_budget_amount_check check (budget_amount is null or budget_amount >= 0),
  constraint operational_projects_budget_currency_pair_check
    check ((budget_amount is null) = (budget_currency is null)),
  constraint operational_projects_budget_currency_format_check
    check (budget_currency is null or budget_currency ~ '^[A-Z]{3}$'),
  constraint operational_projects_version_check check (version > 0),
  constraint operational_projects_case_study_unique unique (public_case_study_id)
);

create index operational_projects_updated_idx on public.operational_projects (updated_at desc, id desc);
create index operational_projects_client_idx on public.operational_projects (client_id);
create index operational_projects_status_idx on public.operational_projects (status);
create index operational_projects_phase_idx on public.operational_projects (current_phase);
create index operational_projects_priority_idx on public.operational_projects (priority);
create index operational_projects_archived_idx on public.operational_projects (archived_at);
create index operational_projects_end_date_idx on public.operational_projects (end_date) where end_date is not null;
create index operational_projects_created_by_idx on public.operational_projects (created_by);
create index operational_projects_updated_by_idx on public.operational_projects (updated_by);

create table public.operational_project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.operational_projects (id) on delete cascade,
  body text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint operational_project_notes_body_check check (btrim(body) <> '' and char_length(body) <= 4000),
  constraint operational_project_notes_version_check check (version > 0)
);

create index operational_project_notes_project_idx on public.operational_project_notes (project_id, created_at desc);
create index operational_project_notes_created_by_idx on public.operational_project_notes (created_by);
create index operational_project_notes_updated_by_idx on public.operational_project_notes (updated_by);

-- id is a bigint identity (not a uuid) so that ordering by id is a reliable
-- chronological tiebreaker: created_at alone is not, because now() returns
-- the same value for every statement inside one transaction, and a single
-- status/phase-change RPC call can legitimately insert a creation-time row
-- and a transition row in the same transaction.
create table public.operational_project_status_history (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.operational_projects (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint operational_project_status_history_to_check
    check (to_status in ('planning', 'in_progress', 'on_hold', 'completed'))
);

create index operational_project_status_history_project_idx
  on public.operational_project_status_history (project_id, created_at desc, id desc);
create index operational_project_status_history_actor_idx
  on public.operational_project_status_history (actor_id);

create table public.operational_project_phase_history (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.operational_projects (id) on delete cascade,
  from_phase text,
  to_phase text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint operational_project_phase_history_to_check
    check (to_phase in ('design', 'planning', 'procurement', 'structural', 'execution', 'finishing', 'completed'))
);

create index operational_project_phase_history_project_idx
  on public.operational_project_phase_history (project_id, created_at desc, id desc);
create index operational_project_phase_history_actor_idx
  on public.operational_project_phase_history (actor_id);

-- Minimal, PII-free change pointers for the Control Room's realtime
-- invalidation channel (see docs/CLAUDE_C4_REALTIME.md). Never carries
-- client/project field values — only "this record changed" metadata, so a
-- subscriber with no read permission for the entity learns nothing beyond
-- the fact that some record of that type changed.
create table public.realtime_events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  created_at timestamptz not null default now(),
  constraint realtime_events_entity_type_check
    check (entity_type in ('client', 'operational_project')),
  constraint realtime_events_action_check
    check (action in (
      'created', 'updated', 'status_changed', 'phase_changed', 'priority_changed',
      'case_study_linked', 'case_study_unlinked', 'archived', 'note_created'
    ))
);

create index realtime_events_created_idx on public.realtime_events (created_at desc);

-- ---------------------------------------------------------------------
-- Row-level security: default deny. Every read/write goes through the
-- SECURITY DEFINER RPCs below.
-- ---------------------------------------------------------------------

alter table public.clients enable row level security;
alter table public.client_notes enable row level security;
alter table public.operational_projects enable row level security;
alter table public.operational_project_notes enable row level security;
alter table public.operational_project_status_history enable row level security;
alter table public.operational_project_phase_history enable row level security;
alter table public.realtime_events enable row level security;

revoke all on public.clients from public, anon, authenticated;
revoke all on public.client_notes from public, anon, authenticated;
revoke all on public.operational_projects from public, anon, authenticated;
revoke all on public.operational_project_notes from public, anon, authenticated;
revoke all on public.operational_project_status_history from public, anon, authenticated;
revoke all on public.operational_project_phase_history from public, anon, authenticated;
revoke all on public.realtime_events from public, anon, authenticated;

-- realtime_events carries no PII, so any authenticated, active, AAL2 staff
-- member may read the pointer stream (the actual record fetch re-applies
-- real clients.read/operations.projects.read checks through the RPCs
-- above). No anonymous policy exists at all.
create policy realtime_events_staff_select
  on public.realtime_events for select to authenticated
  using (
    auth.uid() is not null
    and private.has_aal2()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.account_status = 'active'
    )
  );
grant select on public.realtime_events to authenticated;

alter publication supabase_realtime add table public.realtime_events;

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------

insert into public.permissions (key, display_name, description, is_system)
values
  ('clients.read', 'Read clients', 'Read the private client CRM register, Client 360, and notes.', true),
  ('clients.write', 'Manage clients', 'Create, update, and archive client records and notes.', true),
  ('operations.projects.read', 'Read operational projects', 'Read the private operational project register and workspace.', true),
  ('operations.projects.write', 'Manage operational projects', 'Create, update, transition, and archive operational projects.', true)
on conflict (key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    is_system = true;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'clients.read', 'clients.write', 'operations.projects.read', 'operations.projects.write'
)
where roles.key in ('admin', 'super_admin')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Realtime event emission helper
-- ---------------------------------------------------------------------

create or replace function private.emit_realtime_event(
  target_entity_type text,
  target_entity_id uuid,
  target_action text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.realtime_events (entity_type, entity_id, action)
  values (target_entity_type, target_entity_id, target_action);
$$;

-- ---------------------------------------------------------------------
-- Client domain: read
-- ---------------------------------------------------------------------

create or replace function public.admin_clients_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('clients.read') then
    raise exception using errcode = '42501', message = 'client overview is not authorized';
  end if;
  select jsonb_build_object(
    'total', count(*),
    'active', count(*) filter (where archived_at is null),
    'archived', count(*) filter (where archived_at is not null),
    'standard', count(*) filter (where client_tier = 'standard' and archived_at is null),
    'vip', count(*) filter (where client_tier = 'vip' and archived_at is null),
    'premium', count(*) filter (where client_tier = 'premium' and archived_at is null)
  ) into result
  from public.clients;
  return result;
end;
$$;

create or replace function public.admin_list_clients(
  search_query text default null,
  tier_filter text default null,
  status_scope text default 'active',
  cursor_updated_at timestamptz default null,
  cursor_id uuid default null,
  page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item record;
  items jsonb := '[]'::jsonb;
  item_count integer := 0;
  has_more boolean := false;
  next_updated_at timestamptz := null;
  next_id uuid := null;
  normalized_query text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('clients.read') then
    raise exception using errcode = '42501', message = 'client list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'client page size is outside the admitted range';
  end if;
  if tier_filter is not null and tier_filter not in ('standard', 'vip', 'premium') then
    raise exception using errcode = '22023', message = 'client tier filter is not admitted';
  end if;
  if status_scope not in ('active', 'archived', 'all') then
    raise exception using errcode = '22023', message = 'client status scope is not admitted';
  end if;
  if normalized_query is not null and char_length(normalized_query) > 100 then
    raise exception using errcode = '22023', message = 'client search query is too long';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'client cursor is incomplete';
  end if;

  for item in
    select
      client.id,
      client.full_name,
      client.company,
      client.client_tier,
      client.email,
      client.phone_display,
      client.updated_at,
      client.version,
      client.archived_at,
      (select count(*) from public.operational_projects as project where project.client_id = client.id) as project_count,
      (
        select count(*) from public.operational_projects as project
        where project.client_id = client.id and project.archived_at is null
      ) as active_project_count
    from public.clients as client
    where (tier_filter is null or client.client_tier = tier_filter)
      and (
        status_scope = 'all'
        or (status_scope = 'active' and client.archived_at is null)
        or (status_scope = 'archived' and client.archived_at is not null)
      )
      and (
        normalized_query is null
        or client.full_name ilike '%' || normalized_query || '%'
        or client.company ilike '%' || normalized_query || '%'
        or client.email_normalized = private.normalize_email(normalized_query)
        or client.phone_normalized = private.normalize_phone(normalized_query)
      )
      and (
        cursor_updated_at is null
        or (client.updated_at, client.id) < (cursor_updated_at, cursor_id)
      )
    order by client.updated_at desc, client.id desc
    limit page_size + 1
  loop
    item_count := item_count + 1;
    if item_count > page_size then
      has_more := true;
      exit;
    end if;
    next_updated_at := item.updated_at;
    next_id := item.id;
    items := items || jsonb_build_array(jsonb_build_object(
      'id', item.id,
      'full_name', item.full_name,
      'company', item.company,
      'client_tier', item.client_tier,
      'email', item.email,
      'phone_display', item.phone_display,
      'updated_at', item.updated_at,
      'version', item.version,
      'archived_at', item.archived_at,
      'project_count', item.project_count,
      'active_project_count', item.active_project_count
    ));
  end loop;

  return jsonb_build_object(
    'items', items,
    'has_more', has_more,
    'next_cursor_updated_at', case when has_more then next_updated_at end,
    'next_cursor_id', case when has_more then next_id end
  );
end;
$$;

create or replace function public.admin_list_active_clients_for_picker(
  search_query text default null,
  limit_count integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
  result jsonb;
begin
  if not private.has_permission('operations.projects.write') then
    raise exception using errcode = '42501', message = 'client picker is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 50 then
    raise exception using errcode = '22023', message = 'client picker limit is outside the admitted range';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', client.id, 'full_name', client.full_name, 'company', client.company
  ) order by client.full_name), '[]'::jsonb)
  into result
  from (
    select id, full_name, company
    from public.clients
    where archived_at is null
      and (
        normalized_query is null
        or full_name ilike '%' || normalized_query || '%'
        or company ilike '%' || normalized_query || '%'
      )
    order by full_name
    limit limit_count
  ) as client;

  return result;
end;
$$;

create or replace function public.admin_get_client(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('clients.read') then
    raise exception using errcode = '42501', message = 'client detail is not authorized';
  end if;

  select jsonb_build_object(
    'client', jsonb_build_object(
      'id', client.id,
      'full_name', client.full_name,
      'email', client.email,
      'phone_display', client.phone_display,
      'address', client.address,
      'company', client.company,
      'client_tier', client.client_tier,
      'referral_source', client.referral_source,
      'external_reference', client.external_reference,
      'version', client.version,
      'created_at', client.created_at,
      'updated_at', client.updated_at,
      'archived_at', client.archived_at
    ),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', project.id,
        'title', project.title,
        'status', project.status,
        'current_phase', project.current_phase,
        'priority', project.priority,
        'updated_at', project.updated_at,
        'archived_at', project.archived_at
      ) order by project.updated_at desc)
      from (
        select * from public.operational_projects
        where client_id = client.id
        order by updated_at desc
        limit 50
      ) as project
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', note.id,
        'body', note.body,
        'created_at', note.created_at,
        'version', note.version,
        'author', profile.display_name
      ) order by note.created_at desc)
      from (
        select * from public.client_notes
        where client_id = client.id and archived_at is null
        order by created_at desc
        limit 50
      ) as note
      left join public.profiles as profile on profile.id = note.created_by
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', log.action,
        'outcome', log.outcome,
        'occurred_at', log.occurred_at,
        'actor', profile.display_name
      ) order by log.occurred_at desc)
      from (
        select * from public.audit_logs
        where entity_type = 'client' and entity_id = target_id::text
        order by occurred_at desc
        limit 20
      ) as log
      left join public.profiles as profile on profile.id = log.actor_id
    ), '[]'::jsonb)
  ) into result
  from public.clients as client
  where client.id = target_id;

  if result is null then
    raise exception using errcode = 'P0002', message = 'client does not exist';
  end if;

  return result;
end;
$$;

create or replace function public.find_possible_duplicate_clients(
  candidate_full_name text default null,
  candidate_email text default null,
  candidate_phone text default null,
  exclude_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_email text := private.normalize_email(candidate_email);
  normalized_phone text := private.normalize_phone(candidate_phone);
  normalized_name text := nullif(btrim(candidate_full_name), '');
  result jsonb;
begin
  if not private.has_permission('clients.read') then
    raise exception using errcode = '42501', message = 'duplicate lookup is not authorized';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', match.id,
    'full_name', match.full_name,
    'company', match.company,
    'email', match.email,
    'phone_display', match.phone_display,
    'archived_at', match.archived_at,
    'match_reason', match.match_reason
  )), '[]'::jsonb)
  into result
  from (
    select distinct on (client.id)
      client.id, client.full_name, client.company, client.email, client.phone_display, client.archived_at,
      case
        when normalized_email is not null and client.email_normalized = normalized_email then 'email'
        when normalized_phone is not null and client.phone_normalized = normalized_phone then 'phone'
        else 'name'
      end as match_reason
    from public.clients as client
    where (exclude_id is null or client.id <> exclude_id)
      and (
        (normalized_email is not null and client.email_normalized = normalized_email)
        or (normalized_phone is not null and client.phone_normalized = normalized_phone)
        or (
          normalized_name is not null
          and char_length(normalized_name) >= 3
          and client.full_name ilike '%' || normalized_name || '%'
        )
      )
    limit 10
  ) as match;

  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Client domain: write
-- ---------------------------------------------------------------------

create or replace function public.create_admin_client(
  full_name text,
  target_email text default null,
  target_phone text default null,
  target_address text default null,
  target_company text default null,
  target_tier text default 'standard',
  target_referral_source text default null,
  target_external_reference text default null,
  initial_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  normalized_email text := private.normalize_email(target_email);
  normalized_phone text := private.normalize_phone(target_phone);
begin
  if not private.has_permission('clients.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'clients.write is required.')));
  end if;
  if full_name is null or btrim(full_name) = '' or char_length(full_name) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'full_name', 'A client full name is required.')));
  end if;
  if normalized_email is null and normalized_phone is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('missing_contact_method', null, 'At least one of email or phone is required.')));
  end if;
  if target_tier not in ('standard', 'vip', 'premium') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'client_tier', 'Client tier is not admitted.')));
  end if;
  if target_email is not null and char_length(target_email) > 254 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'email', 'Email is too long.')));
  end if;
  if initial_note is not null and (btrim(initial_note) = '' or char_length(initial_note) > 4000) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'initial_note', 'Initial note is invalid.')));
  end if;

  insert into public.clients (
    full_name, email, email_normalized, phone_display, phone_normalized,
    address, company, client_tier, referral_source, external_reference,
    created_by, updated_by
  ) values (
    btrim(full_name), nullif(btrim(target_email), ''), normalized_email,
    nullif(btrim(target_phone), ''), normalized_phone,
    nullif(btrim(target_address), ''), nullif(btrim(target_company), ''),
    target_tier, nullif(btrim(target_referral_source), ''), nullif(btrim(target_external_reference), ''),
    auth.uid(), auth.uid()
  ) returning id into new_id;

  if initial_note is not null then
    insert into public.client_notes (client_id, body, created_by, updated_by)
    values (new_id, btrim(initial_note), auth.uid(), auth.uid());
  end if;

  perform private.s4_audit('client.create', 'client', new_id::text, 'success', jsonb_build_object('client_tier', target_tier));
  perform private.emit_realtime_event('client', new_id, 'created');

  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

create or replace function public.update_admin_client(
  target_id uuid,
  expected_version integer,
  target_full_name text,
  target_email text default null,
  target_phone text default null,
  target_address text default null,
  target_company text default null,
  target_tier text default 'standard',
  target_referral_source text default null,
  target_external_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  normalized_email text := private.normalize_email(target_email);
  normalized_phone text := private.normalize_phone(target_phone);
begin
  if not private.has_permission('clients.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'clients.write is required.')));
  end if;
  if target_full_name is null or btrim(target_full_name) = '' or char_length(target_full_name) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'full_name', 'A client full name is required.')));
  end if;
  if normalized_email is null and normalized_phone is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('missing_contact_method', null, 'At least one of email or phone is required.')));
  end if;
  if target_tier not in ('standard', 'vip', 'premium') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'client_tier', 'Client tier is not admitted.')));
  end if;

  select version into current_version from public.clients where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'client', 'Client does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Client changed before this command completed.'))
    );
  end if;

  update public.clients set
    full_name = btrim(target_full_name),
    email = nullif(btrim(target_email), ''),
    email_normalized = normalized_email,
    phone_display = nullif(btrim(target_phone), ''),
    phone_normalized = normalized_phone,
    address = nullif(btrim(target_address), ''),
    company = nullif(btrim(target_company), ''),
    client_tier = target_tier,
    referral_source = nullif(btrim(target_referral_source), ''),
    external_reference = nullif(btrim(target_external_reference), ''),
    updated_by = auth.uid(),
    updated_at = now(),
    version = version + 1
  where id = target_id;

  perform private.s4_audit('client.update', 'client', target_id::text, 'success', jsonb_build_object('version', expected_version + 1));
  perform private.emit_realtime_event('client', target_id, 'updated');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.archive_admin_client(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  currently_archived timestamptz;
begin
  if not private.has_permission('clients.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'clients.write is required.')));
  end if;

  select version, archived_at into current_version, currently_archived from public.clients where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'client', 'Client does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Client changed before this command completed.'))
    );
  end if;
  if currently_archived is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'Client is already archived.')));
  end if;

  update public.clients
     set archived_at = now(), updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;

  perform private.s4_audit('client.archive', 'client', target_id::text, 'success', '{}'::jsonb);
  perform private.emit_realtime_event('client', target_id, 'archived');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.create_client_note(target_client_id uuid, body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.has_permission('clients.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'clients.write is required.')));
  end if;
  if body is null or btrim(body) = '' or char_length(body) > 4000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'body', 'Note body is invalid.')));
  end if;
  if not exists (select 1 from public.clients where id = target_client_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'client', 'Client does not exist.')));
  end if;

  insert into public.client_notes (client_id, body, created_by, updated_by)
  values (target_client_id, btrim(body), auth.uid(), auth.uid())
  returning id into new_id;

  perform private.s4_audit('client.note_create', 'client', target_client_id::text, 'success', jsonb_build_object('note_id', new_id));
  perform private.emit_realtime_event('client', target_client_id, 'note_created');

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Operational project domain: read
-- ---------------------------------------------------------------------

create or replace function public.admin_operations_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ending_soon_days constant integer := 14;
  result jsonb;
begin
  if not private.has_permission('operations.projects.read') then
    raise exception using errcode = '42501', message = 'operations overview is not authorized';
  end if;

  select jsonb_build_object(
    'active_count', count(*) filter (where archived_at is null),
    'archived_count', count(*) filter (where archived_at is not null),
    'client_count', (select count(distinct client_id) from public.operational_projects where archived_at is null),
    'status_counts', jsonb_build_object(
      'planning', count(*) filter (where status = 'planning' and archived_at is null),
      'in_progress', count(*) filter (where status = 'in_progress' and archived_at is null),
      'on_hold', count(*) filter (where status = 'on_hold' and archived_at is null),
      'completed', count(*) filter (where status = 'completed' and archived_at is null)
    ),
    'phase_counts', jsonb_build_object(
      'design', count(*) filter (where current_phase = 'design' and archived_at is null),
      'planning', count(*) filter (where current_phase = 'planning' and archived_at is null),
      'procurement', count(*) filter (where current_phase = 'procurement' and archived_at is null),
      'structural', count(*) filter (where current_phase = 'structural' and archived_at is null),
      'execution', count(*) filter (where current_phase = 'execution' and archived_at is null),
      'finishing', count(*) filter (where current_phase = 'finishing' and archived_at is null),
      'completed', count(*) filter (where current_phase = 'completed' and archived_at is null)
    ),
    'priority_counts', jsonb_build_object(
      'low', count(*) filter (where priority = 'low' and archived_at is null),
      'medium', count(*) filter (where priority = 'medium' and archived_at is null),
      'high', count(*) filter (where priority = 'high' and archived_at is null)
    ),
    'ending_soon_count', count(*) filter (
      where archived_at is null and status <> 'completed'
        and end_date is not null and end_date between current_date and current_date + ending_soon_days
    ),
    'past_due_count', count(*) filter (
      where archived_at is null and status <> 'completed'
        and end_date is not null and end_date < current_date
    ),
    'without_case_study_count', count(*) filter (
      where archived_at is null and status = 'completed' and public_case_study_id is null
    ),
    'ending_soon_window_days', ending_soon_days
  ) into result
  from public.operational_projects;

  select result || jsonb_build_object(
    'budget_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total) order by currency)
      from (
        select budget_currency as currency, sum(budget_amount) as total
        from public.operational_projects
        where archived_at is null and budget_amount is not null
        group by budget_currency
      ) as grouped
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

create or replace function public.admin_action_queue(limit_count integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ending_soon_days constant integer := 14;
  result jsonb;
begin
  if not private.has_permission('operations.projects.read') then
    raise exception using errcode = '42501', message = 'action queue is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 100 then
    raise exception using errcode = '22023', message = 'action queue limit is outside the admitted range';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', queue_item.kind,
    'project_id', queue_item.id,
    'title', queue_item.title,
    'detail', queue_item.detail
  ) order by queue_item.rank, queue_item.updated_at desc), '[]'::jsonb)
  into result
  from (
    select project.id, project.title, project.updated_at, 1 as rank,
      'high_priority_active' as kind,
      'High priority, currently ' || project.status as detail
    from public.operational_projects as project
    where project.archived_at is null and project.priority = 'high' and project.status in ('planning', 'in_progress')

    union all
    select project.id, project.title, project.updated_at, 2,
      'ending_soon',
      'Ends ' || to_char(project.end_date, 'YYYY-MM-DD')
    from public.operational_projects as project
    where project.archived_at is null and project.status <> 'completed'
      and project.end_date is not null
      and project.end_date between current_date and current_date + ending_soon_days

    union all
    select project.id, project.title, project.updated_at, 0,
      'past_due',
      'Was due ' || to_char(project.end_date, 'YYYY-MM-DD')
    from public.operational_projects as project
    where project.archived_at is null and project.status <> 'completed'
      and project.end_date is not null and project.end_date < current_date

    union all
    select project.id, project.title, project.updated_at, 3,
      'completed_without_case_study',
      'Completed with no linked public case study'
    from public.operational_projects as project
    where project.archived_at is null and project.status = 'completed' and project.public_case_study_id is null

    union all
    select project.id, project.title, project.updated_at, 4,
      'draft_case_study_unpublished',
      'Linked case study is not yet published'
    from public.operational_projects as project
    join public.projects as case_study on case_study.id = project.public_case_study_id
    where project.archived_at is null and case_study.publication_status = 'draft'
  ) as queue_item
  limit limit_count;

  return result;
end;
$$;

create or replace function public.admin_recent_activity(limit_count integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  can_read_clients boolean := private.has_permission('clients.read');
  can_read_projects boolean := private.has_permission('operations.projects.read');
begin
  if not can_read_clients and not can_read_projects then
    raise exception using errcode = '42501', message = 'recent activity is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 50 then
    raise exception using errcode = '22023', message = 'recent activity limit is outside the admitted range';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'action', log.action,
    'entity_type', log.entity_type,
    'entity_id', log.entity_id,
    'outcome', log.outcome,
    'occurred_at', log.occurred_at,
    'actor', profile.display_name
  ) order by log.occurred_at desc), '[]'::jsonb)
  into result
  from (
    select * from public.audit_logs
    where (entity_type = 'client' and can_read_clients)
       or (entity_type = 'operational_project' and can_read_projects)
    order by occurred_at desc
    limit limit_count
  ) as log
  left join public.profiles as profile on profile.id = log.actor_id;

  return result;
end;
$$;

create or replace function public.admin_list_operational_projects(
  search_query text default null,
  client_id_filter uuid default null,
  status_filter text default null,
  phase_filter text default null,
  priority_filter text default null,
  status_scope text default 'active',
  case_study_filter text default null,
  cursor_updated_at timestamptz default null,
  cursor_id uuid default null,
  page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  item record;
  items jsonb := '[]'::jsonb;
  item_count integer := 0;
  has_more boolean := false;
  next_updated_at timestamptz := null;
  next_id uuid := null;
  normalized_query text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('operations.projects.read') then
    raise exception using errcode = '42501', message = 'project list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'project page size is outside the admitted range';
  end if;
  if status_filter is not null and status_filter not in ('planning', 'in_progress', 'on_hold', 'completed') then
    raise exception using errcode = '22023', message = 'project status filter is not admitted';
  end if;
  if phase_filter is not null
     and phase_filter not in ('design', 'planning', 'procurement', 'structural', 'execution', 'finishing', 'completed') then
    raise exception using errcode = '22023', message = 'project phase filter is not admitted';
  end if;
  if priority_filter is not null and priority_filter not in ('low', 'medium', 'high') then
    raise exception using errcode = '22023', message = 'project priority filter is not admitted';
  end if;
  if status_scope not in ('active', 'archived', 'all') then
    raise exception using errcode = '22023', message = 'project status scope is not admitted';
  end if;
  if case_study_filter is not null and case_study_filter not in ('linked', 'unlinked') then
    raise exception using errcode = '22023', message = 'project case-study filter is not admitted';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'project cursor is incomplete';
  end if;

  for item in
    select
      project.id, project.title, project.status, project.current_phase, project.priority,
      project.start_date, project.end_date, project.budget_amount, project.budget_currency,
      project.updated_at, project.version, project.archived_at,
      project.public_case_study_id,
      client.id as client_id, client.full_name as client_full_name,
      case_study.publication_status as case_study_status
    from public.operational_projects as project
    join public.clients as client on client.id = project.client_id
    left join public.projects as case_study on case_study.id = project.public_case_study_id
    where (client_id_filter is null or project.client_id = client_id_filter)
      and (status_filter is null or project.status = status_filter)
      and (phase_filter is null or project.current_phase = phase_filter)
      and (priority_filter is null or project.priority = priority_filter)
      and (
        status_scope = 'all'
        or (status_scope = 'active' and project.archived_at is null)
        or (status_scope = 'archived' and project.archived_at is not null)
      )
      and (
        case_study_filter is null
        or (case_study_filter = 'linked' and project.public_case_study_id is not null)
        or (case_study_filter = 'unlinked' and project.public_case_study_id is null)
      )
      and (
        normalized_query is null
        or project.title ilike '%' || normalized_query || '%'
        or client.full_name ilike '%' || normalized_query || '%'
      )
      and (
        cursor_updated_at is null
        or (project.updated_at, project.id) < (cursor_updated_at, cursor_id)
      )
    order by project.updated_at desc, project.id desc
    limit page_size + 1
  loop
    item_count := item_count + 1;
    if item_count > page_size then
      has_more := true;
      exit;
    end if;
    next_updated_at := item.updated_at;
    next_id := item.id;
    items := items || jsonb_build_array(jsonb_build_object(
      'id', item.id,
      'title', item.title,
      'status', item.status,
      'current_phase', item.current_phase,
      'priority', item.priority,
      'start_date', item.start_date,
      'end_date', item.end_date,
      'budget_amount', item.budget_amount,
      'budget_currency', item.budget_currency,
      'updated_at', item.updated_at,
      'version', item.version,
      'archived_at', item.archived_at,
      'client', jsonb_build_object('id', item.client_id, 'full_name', item.client_full_name),
      'case_study', case when item.public_case_study_id is null then null
        else jsonb_build_object('id', item.public_case_study_id, 'publication_status', item.case_study_status) end
    ));
  end loop;

  return jsonb_build_object(
    'items', items,
    'has_more', has_more,
    'next_cursor_updated_at', case when has_more then next_updated_at end,
    'next_cursor_id', case when has_more then next_id end
  );
end;
$$;

create or replace function public.admin_get_operational_project(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('operations.projects.read') then
    raise exception using errcode = '42501', message = 'project detail is not authorized';
  end if;

  select jsonb_build_object(
    'project', jsonb_build_object(
      'id', project.id,
      'title', project.title,
      'description', project.description,
      'status', project.status,
      'current_phase', project.current_phase,
      'priority', project.priority,
      'start_date', project.start_date,
      'end_date', project.end_date,
      'budget_amount', project.budget_amount,
      'budget_currency', project.budget_currency,
      'version', project.version,
      'created_at', project.created_at,
      'updated_at', project.updated_at,
      'archived_at', project.archived_at
    ),
    'client', jsonb_build_object(
      'id', client.id, 'full_name', client.full_name, 'company', client.company,
      'client_tier', client.client_tier, 'archived_at', client.archived_at
    ),
    'case_study', case when case_study.id is null then null else jsonb_build_object(
      'id', case_study.id,
      'publication_status', case_study.publication_status,
      'slug', case_study_localization.slug,
      'title', case_study_localization.title
    ) end,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', note.id, 'body', note.body, 'created_at', note.created_at,
        'version', note.version, 'author', profile.display_name
      ) order by note.created_at desc)
      from (
        select * from public.operational_project_notes
        where project_id = project.id and archived_at is null
        order by created_at desc
        limit 50
      ) as note
      left join public.profiles as profile on profile.id = note.created_by
    ), '[]'::jsonb),
    'status_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from_status', history.from_status, 'to_status', history.to_status,
        'created_at', history.created_at, 'actor', profile.display_name
      ) order by history.id desc)
      from (
        select * from public.operational_project_status_history
        where project_id = project.id
        order by id desc
        limit 30
      ) as history
      left join public.profiles as profile on profile.id = history.actor_id
    ), '[]'::jsonb),
    'phase_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from_phase', history.from_phase, 'to_phase', history.to_phase,
        'created_at', history.created_at, 'actor', profile.display_name
      ) order by history.id desc)
      from (
        select * from public.operational_project_phase_history
        where project_id = project.id
        order by id desc
        limit 30
      ) as history
      left join public.profiles as profile on profile.id = history.actor_id
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', log.action, 'outcome', log.outcome,
        'occurred_at', log.occurred_at, 'actor', profile.display_name
      ) order by log.occurred_at desc)
      from (
        select * from public.audit_logs
        where entity_type = 'operational_project' and entity_id = target_id::text
        order by occurred_at desc
        limit 20
      ) as log
      left join public.profiles as profile on profile.id = log.actor_id
    ), '[]'::jsonb)
  ) into result
  from public.operational_projects as project
  join public.clients as client on client.id = project.client_id
  left join public.projects as case_study on case_study.id = project.public_case_study_id
  left join public.project_localizations as case_study_localization
    on case_study_localization.project_id = case_study.id and case_study_localization.locale = 'en'
  where project.id = target_id;

  if result is null then
    raise exception using errcode = 'P0002', message = 'operational project does not exist';
  end if;

  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Operational project domain: write
-- ---------------------------------------------------------------------

create or replace function public.create_admin_operational_project(
  target_client_id uuid,
  title text,
  description text default null,
  target_status text default 'planning',
  target_phase text default 'design',
  target_priority text default 'medium',
  target_start_date date default null,
  target_end_date date default null,
  target_budget_amount numeric default null,
  target_budget_currency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  client_archived timestamptz;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if title is null or btrim(title) = '' or char_length(title) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'title', 'A project title is required.')));
  end if;
  if target_status not in ('planning', 'in_progress', 'on_hold', 'completed') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'status', 'Status is not admitted.')));
  end if;
  if target_phase not in ('design', 'planning', 'procurement', 'structural', 'execution', 'finishing', 'completed') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'current_phase', 'Phase is not admitted.')));
  end if;
  if target_priority not in ('low', 'medium', 'high') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'priority', 'Priority is not admitted.')));
  end if;
  if target_start_date is not null and target_end_date is not null and target_end_date < target_start_date then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'end_date', 'End date cannot precede the start date.')));
  end if;
  if (target_budget_amount is null) <> (target_budget_currency is null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'budget_currency', 'A budget amount requires a currency, and a currency requires an amount.')));
  end if;
  if target_budget_amount is not null and target_budget_amount < 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'budget_amount', 'Budget amount cannot be negative.')));
  end if;
  if target_budget_currency is not null and target_budget_currency !~ '^[A-Za-z]{3}$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'budget_currency', 'Currency must be a 3-letter code.')));
  end if;

  select archived_at into client_archived from public.clients where id = target_client_id;
  if not found then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'client_id', 'Client does not exist.')));
  end if;
  if client_archived is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'client_id', 'An archived client cannot receive a new project.')));
  end if;

  insert into public.operational_projects (
    client_id, title, description, status, current_phase, priority,
    start_date, end_date, budget_amount, budget_currency, created_by, updated_by
  ) values (
    target_client_id, btrim(title), nullif(btrim(description), ''), target_status, target_phase, target_priority,
    target_start_date, target_end_date, target_budget_amount, upper(target_budget_currency),
    auth.uid(), auth.uid()
  ) returning id into new_id;

  insert into public.operational_project_status_history (project_id, from_status, to_status, actor_id)
  values (new_id, null, target_status, auth.uid());
  insert into public.operational_project_phase_history (project_id, from_phase, to_phase, actor_id)
  values (new_id, null, target_phase, auth.uid());

  perform private.s4_audit('operational_project.create', 'operational_project', new_id::text, 'success', jsonb_build_object('client_id', target_client_id, 'status', target_status));
  perform private.emit_realtime_event('operational_project', new_id, 'created');

  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

create or replace function public.update_admin_operational_project(
  target_id uuid,
  expected_version integer,
  target_title text,
  target_description text default null,
  target_start_date date default null,
  target_end_date date default null,
  target_budget_amount numeric default null,
  target_budget_currency text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if target_title is null or btrim(target_title) = '' or char_length(target_title) > 200 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'title', 'A project title is required.')));
  end if;
  if target_start_date is not null and target_end_date is not null and target_end_date < target_start_date then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'end_date', 'End date cannot precede the start date.')));
  end if;
  if (target_budget_amount is null) <> (target_budget_currency is null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'budget_currency', 'A budget amount requires a currency, and a currency requires an amount.')));
  end if;
  if target_budget_amount is not null and target_budget_amount < 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'budget_amount', 'Budget amount cannot be negative.')));
  end if;
  if target_budget_currency is not null and target_budget_currency !~ '^[A-Za-z]{3}$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'budget_currency', 'Currency must be a 3-letter code.')));
  end if;

  select version into current_version from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

  update public.operational_projects set
    title = btrim(target_title),
    description = nullif(btrim(target_description), ''),
    start_date = target_start_date,
    end_date = target_end_date,
    budget_amount = target_budget_amount,
    budget_currency = upper(target_budget_currency),
    updated_by = auth.uid(),
    updated_at = now(),
    version = version + 1
  where id = target_id;

  perform private.s4_audit('operational_project.update', 'operational_project', target_id::text, 'success', jsonb_build_object('version', expected_version + 1));
  perform private.emit_realtime_event('operational_project', target_id, 'updated');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.change_operational_project_status(
  target_id uuid, expected_version integer, next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  prior_status text;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if next_status not in ('planning', 'in_progress', 'on_hold', 'completed') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'status', 'Status is not admitted.')));
  end if;

  select version, status into current_version, prior_status from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;
  if prior_status = next_status then
    return jsonb_build_object('ok', true, 'id', target_id, 'version', current_version);
  end if;

  update public.operational_projects
     set status = next_status, updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  insert into public.operational_project_status_history (project_id, from_status, to_status, actor_id)
  values (target_id, prior_status, next_status, auth.uid());

  perform private.s4_audit('operational_project.status_change', 'operational_project', target_id::text, 'success', jsonb_build_object('from', prior_status, 'to', next_status));
  perform private.emit_realtime_event('operational_project', target_id, 'status_changed');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.change_operational_project_phase(
  target_id uuid, expected_version integer, next_phase text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  prior_phase text;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if next_phase not in ('design', 'planning', 'procurement', 'structural', 'execution', 'finishing', 'completed') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'current_phase', 'Phase is not admitted.')));
  end if;

  select version, current_phase into current_version, prior_phase from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;
  if prior_phase = next_phase then
    return jsonb_build_object('ok', true, 'id', target_id, 'version', current_version);
  end if;

  update public.operational_projects
     set current_phase = next_phase, updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  insert into public.operational_project_phase_history (project_id, from_phase, to_phase, actor_id)
  values (target_id, prior_phase, next_phase, auth.uid());

  perform private.s4_audit('operational_project.phase_change', 'operational_project', target_id::text, 'success', jsonb_build_object('from', prior_phase, 'to', next_phase));
  perform private.emit_realtime_event('operational_project', target_id, 'phase_changed');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.change_operational_project_priority(
  target_id uuid, expected_version integer, next_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  prior_priority text;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if next_priority not in ('low', 'medium', 'high') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'priority', 'Priority is not admitted.')));
  end if;

  select version, priority into current_version, prior_priority from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;
  if prior_priority = next_priority then
    return jsonb_build_object('ok', true, 'id', target_id, 'version', current_version);
  end if;

  update public.operational_projects
     set priority = next_priority, updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;

  perform private.s4_audit('operational_project.priority_change', 'operational_project', target_id::text, 'success', jsonb_build_object('from', prior_priority, 'to', next_priority));
  perform private.emit_realtime_event('operational_project', target_id, 'priority_changed');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.archive_admin_operational_project(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  currently_archived timestamptz;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;

  select version, archived_at into current_version, currently_archived from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;
  if currently_archived is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'archived_at', 'Project is already archived.')));
  end if;

  update public.operational_projects
     set archived_at = now(), updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;

  perform private.s4_audit('operational_project.archive', 'operational_project', target_id::text, 'success', '{}'::jsonb);
  perform private.emit_realtime_event('operational_project', target_id, 'archived');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.create_operational_project_note(target_project_id uuid, body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if body is null or btrim(body) = '' or char_length(body) > 4000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'body', 'Note body is invalid.')));
  end if;
  if not exists (select 1 from public.operational_projects where id = target_project_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;

  insert into public.operational_project_notes (project_id, body, created_by, updated_by)
  values (target_project_id, btrim(body), auth.uid(), auth.uid())
  returning id into new_id;

  perform private.s4_audit('operational_project.note_create', 'operational_project', target_project_id::text, 'success', jsonb_build_object('note_id', new_id));
  perform private.emit_realtime_event('operational_project', target_project_id, 'note_created');

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Public case-study bridge (named FK only; no entity_type/entity_id
-- polymorphism — see docs/CLAUDE_C4_CASE_STUDY_BRIDGE.md)
-- ---------------------------------------------------------------------

create or replace function public.link_operational_project_case_study(
  target_id uuid, expected_version integer, target_case_study_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  already_linked uuid;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if not exists (select 1 from public.projects where id = target_case_study_id) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'case_study_id', 'Public case study does not exist.')));
  end if;

  select version, public_case_study_id into current_version, already_linked
  from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;
  if already_linked is not null and already_linked <> target_case_study_id then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'case_study_id', 'This project is already linked to a different case study; unlink first.')));
  end if;

  begin
    update public.operational_projects
       set public_case_study_id = target_case_study_id, updated_by = auth.uid(), updated_at = now(), version = version + 1
     where id = target_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('already_linked', 'case_study_id', 'This case study is already linked to a different operational project.')));
  end;

  perform private.s4_audit('operational_project.case_study_link', 'operational_project', target_id::text, 'success', jsonb_build_object('case_study_id', target_case_study_id));
  perform private.emit_realtime_event('operational_project', target_id, 'case_study_linked');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.unlink_operational_project_case_study(
  target_id uuid, expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;

  select version into current_version from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;

  update public.operational_projects
     set public_case_study_id = null, updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;

  perform private.s4_audit('operational_project.case_study_unlink', 'operational_project', target_id::text, 'success', '{}'::jsonb);
  perform private.emit_realtime_event('operational_project', target_id, 'case_study_unlinked');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- Creates a new PUBLIC case-study draft (the existing S5C project draft
-- kernel) and links it to this operational project in one step. Only
-- public-safe fields are ever passed to create_admin_project_draft — the
-- client's name, contact details, address, budget, notes, and activity are
-- never read by this function, let alone copied. See
-- docs/CLAUDE_C4_CASE_STUDY_BRIDGE.md and the C3.privacy pgTAP coverage.
create or replace function public.create_case_study_draft_from_operational_project(
  target_id uuid,
  expected_version integer,
  target_locale text,
  target_slug text,
  target_title text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  already_linked uuid;
  draft_result jsonb;
  new_case_study_id uuid;
begin
  if not private.has_permission('operations.projects.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'operations.projects.write is required.')));
  end if;
  if not private.has_permission('content.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'content.write is required.')));
  end if;

  select version, public_case_study_id into current_version, already_linked
  from public.operational_projects where id = target_id for update;
  if current_version is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'project', 'Operational project does not exist.')));
  end if;
  if current_version <> expected_version then
    return jsonb_build_object(
      'ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer project version is available.'))
    );
  end if;
  if already_linked is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'case_study_id', 'This project is already linked to a case study.')));
  end if;

  draft_result := public.create_admin_project_draft(target_locale, target_slug, target_title);
  if coalesce((draft_result ->> 'ok')::boolean, false) is not true then
    return draft_result;
  end if;
  new_case_study_id := (draft_result ->> 'id')::uuid;

  update public.operational_projects
     set public_case_study_id = new_case_study_id, updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;

  perform private.s4_audit('operational_project.case_study_link', 'operational_project', target_id::text, 'success', jsonb_build_object('case_study_id', new_case_study_id, 'created_draft', true));
  perform private.emit_realtime_event('operational_project', target_id, 'case_study_linked');

  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'case_study_id', new_case_study_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Global quick find (§55) — each domain is silently omitted (not denied)
-- when the caller lacks its read permission, so one search box works for
-- whichever combination of C4/C3 capabilities the current staff member has.
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
      from (
        select id, full_name, company from public.clients
        where archived_at is null
          and (full_name ilike '%' || normalized_query || '%' or company ilike '%' || normalized_query || '%')
        order by full_name
        limit limit_count
      ) as client
    ), '[]'::jsonb);
  end if;

  if private.has_permission('operations.projects.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'project', 'id', id, 'label', title, 'detail', status))
      from (
        select id, title, status from public.operational_projects
        where archived_at is null and title ilike '%' || normalized_query || '%'
        order by updated_at desc
        limit limit_count
      ) as project
    ), '[]'::jsonb);
  end if;

  if private.has_permission('content.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'case_study', 'id', id, 'label', title, 'detail', publication_status))
      from (
        select project.id, localization.title, project.publication_status
        from public.projects as project
        join public.project_localizations as localization
          on localization.project_id = project.id and localization.locale = 'en'
        where localization.title ilike '%' || normalized_query || '%'
        order by project.updated_at desc
        limit limit_count
      ) as case_study
    ), '[]'::jsonb);
  end if;

  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants: revoke default execute, then grant only to authenticated. None
-- of these are ever granted to anon — Clients, Operational Projects,
-- their notes, and their histories have no public projection.
-- ---------------------------------------------------------------------

revoke all on function public.admin_clients_overview() from public, anon, authenticated;
revoke all on function public.admin_list_clients(text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_list_active_clients_for_picker(text, integer) from public, anon, authenticated;
revoke all on function public.admin_get_client(uuid) from public, anon, authenticated;
revoke all on function public.find_possible_duplicate_clients(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.create_admin_client(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_admin_client(uuid, integer, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.archive_admin_client(uuid, integer) from public, anon, authenticated;
revoke all on function public.create_client_note(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_operations_overview() from public, anon, authenticated;
revoke all on function public.admin_action_queue(integer) from public, anon, authenticated;
revoke all on function public.admin_recent_activity(integer) from public, anon, authenticated;
revoke all on function public.admin_list_operational_projects(text, uuid, text, text, text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_get_operational_project(uuid) from public, anon, authenticated;
revoke all on function public.create_admin_operational_project(uuid, text, text, text, text, text, date, date, numeric, text) from public, anon, authenticated;
revoke all on function public.update_admin_operational_project(uuid, integer, text, text, date, date, numeric, text) from public, anon, authenticated;
revoke all on function public.change_operational_project_status(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.change_operational_project_phase(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.change_operational_project_priority(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.archive_admin_operational_project(uuid, integer) from public, anon, authenticated;
revoke all on function public.create_operational_project_note(uuid, text) from public, anon, authenticated;
revoke all on function public.link_operational_project_case_study(uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.unlink_operational_project_case_study(uuid, integer) from public, anon, authenticated;
revoke all on function public.create_case_study_draft_from_operational_project(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_global_quick_find(text, integer) from public, anon, authenticated;

grant execute on function public.admin_clients_overview() to authenticated;
grant execute on function public.admin_list_clients(text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_list_active_clients_for_picker(text, integer) to authenticated;
grant execute on function public.admin_get_client(uuid) to authenticated;
grant execute on function public.find_possible_duplicate_clients(text, text, text, uuid) to authenticated;
grant execute on function public.create_admin_client(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_admin_client(uuid, integer, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.archive_admin_client(uuid, integer) to authenticated;
grant execute on function public.create_client_note(uuid, text) to authenticated;
grant execute on function public.admin_operations_overview() to authenticated;
grant execute on function public.admin_action_queue(integer) to authenticated;
grant execute on function public.admin_recent_activity(integer) to authenticated;
grant execute on function public.admin_list_operational_projects(text, uuid, text, text, text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_get_operational_project(uuid) to authenticated;
grant execute on function public.create_admin_operational_project(uuid, text, text, text, text, text, date, date, numeric, text) to authenticated;
grant execute on function public.update_admin_operational_project(uuid, integer, text, text, date, date, numeric, text) to authenticated;
grant execute on function public.change_operational_project_status(uuid, integer, text) to authenticated;
grant execute on function public.change_operational_project_phase(uuid, integer, text) to authenticated;
grant execute on function public.change_operational_project_priority(uuid, integer, text) to authenticated;
grant execute on function public.archive_admin_operational_project(uuid, integer) to authenticated;
grant execute on function public.create_operational_project_note(uuid, text) to authenticated;
grant execute on function public.link_operational_project_case_study(uuid, integer, uuid) to authenticated;
grant execute on function public.unlink_operational_project_case_study(uuid, integer) to authenticated;
grant execute on function public.create_case_study_draft_from_operational_project(uuid, integer, text, text, text) to authenticated;
grant execute on function public.admin_global_quick_find(text, integer) to authenticated;

comment on table public.clients is
  'C4 PRIVATE client CRM. No RLS policy grants any access; every read/write is a narrow SECURITY DEFINER RPC. Never exposed publicly.';
comment on table public.operational_projects is
  'C4 PRIVATE operational project. Distinct from public.projects (the C3 public case study). public_case_study_id is the only, optional, named link between the two domains — never a polymorphic entity_type/entity_id pair.';
comment on table public.realtime_events is
  'PII-free change pointers (entity_type/entity_id/action only) for the Control Room realtime channel. A subscriber still needs the matching clients.read/operations.projects.read permission to resolve a pointer into real data via the RPCs above.';
comment on function public.create_case_study_draft_from_operational_project(uuid, integer, text, text, text) is
  'Creates a public case-study draft via the unchanged S5C kernel and links it. Reads only target_locale/target_slug/target_title from the caller — never touches client identity, contact details, budget, notes, or activity.';
