-- C9 — Intelligence + Notification Center.
--
-- One intelligence layer over the C4–C8 operational data (never a second
-- data model): bounded analytics RPCs that return presentation-ready
-- aggregates grouped by currency, a privacy-safe first-party website
-- analytics aggregate (daily counters only — no event rows, no identifiers),
-- a staff Notification Center (event-driven triggers + one idempotent timed
-- sweep), per-staff notification preferences, and the C8 contact-log time
-- semantics fix. All day/week/month reporting respects the configured
-- business timezone (business_profile.timezone).

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------

insert into public.permissions (key, display_name, description, is_system)
values
  ('analytics.read', 'Read analytics', 'Open the Analytics Center: lead, project and delivery analytics over time.', true),
  ('analytics.finance.read', 'Read finance analytics', 'Read invoiced / collected / outstanding / aging analytics by currency.', true),
  ('analytics.website.read', 'Read website analytics', 'Read privacy-safe first-party website page view and interaction aggregates.', true),
  ('notifications.read', 'Read notifications', 'Read and manage your own in-app notifications and preferences.', true),
  ('notifications.manage', 'Manage notification system', 'Run the timed notification sweep manually and inspect sweep history.', true)
on conflict (key) do update
set display_name = excluded.display_name, description = excluded.description, is_system = true;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'analytics.read', 'analytics.finance.read', 'analytics.website.read', 'notifications.read'
)
where roles.key in ('admin', 'super_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in ('notifications.manage')
where roles.key = 'super_admin'
on conflict do nothing;

-- Realtime vocabulary: notification pointers (id only, never a payload).
alter table public.realtime_events drop constraint if exists realtime_events_entity_type_check;
alter table public.realtime_events add constraint realtime_events_entity_type_check
  check (entity_type in (
    'client', 'operational_project', 'invoice',
    'trade_partner', 'contractor_assignment', 'material', 'material_requirement', 'purchase_order',
    'settings', 'lead', 'notification'
  ));

-- ---------------------------------------------------------------------
-- Business timezone helpers (C7 business profile is the authority)
-- ---------------------------------------------------------------------

create or replace function private.business_timezone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.timezone from public.business_profile as p where p.id = 1), 'Africa/Kigali');
$$;
revoke all on function private.business_timezone() from public, anon, authenticated;

create or replace function private.business_today()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone private.business_timezone())::date;
$$;
revoke all on function private.business_today() from public, anon, authenticated;

-- Local calendar day of an instant in the business timezone.
create or replace function private.business_day(instant timestamptz)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (instant at time zone private.business_timezone())::date;
$$;
revoke all on function private.business_day(timestamptz) from public, anon, authenticated;

-- Any active AAL2 staff member may learn the business timezone (needed to
-- render instants and to convert staff-entered local times correctly).
create or replace function public.admin_business_timezone()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_active_aal2_staff() then
    raise exception using errcode = '42501', message = 'business timezone is not authorized';
  end if;
  return private.business_timezone();
end;
$$;
grant execute on function public.admin_business_timezone() to authenticated;

-- A validated, bounded analytics window: inclusive local calendar days in
-- the business timezone, returned as half-open instants plus the trend
-- bucket granularity (day for ≤ 31 days, otherwise ISO week).
create or replace function private.analytics_window(range_from date, range_to date)
returns table (start_at timestamptz, end_at timestamptz, day_count integer, bucket text, tz text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  zone text := private.business_timezone();
begin
  if range_from is null or range_to is null then
    raise exception using errcode = '22023', message = 'analytics range is required';
  end if;
  if range_to < range_from then
    raise exception using errcode = '22023', message = 'analytics range end precedes its start';
  end if;
  if range_to - range_from > 731 then
    raise exception using errcode = '22023', message = 'analytics range exceeds two years';
  end if;
  if range_to > private.business_today() + 1 then
    raise exception using errcode = '22023', message = 'analytics range ends in the future';
  end if;
  return query select
    (range_from::timestamp at time zone zone),
    ((range_to + 1)::timestamp at time zone zone),
    (range_to - range_from + 1)::integer,
    case when range_to - range_from + 1 <= 31 then 'day' else 'week' end,
    zone;
end;
$$;
revoke all on function private.analytics_window(date, date) from public, anon, authenticated;

-- Trend bucket start (local date) for an instant.
create or replace function private.analytics_bucket(instant timestamptz, bucket text)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case when bucket = 'week'
    then date_trunc('week', (instant at time zone private.business_timezone()))::date
    else (instant at time zone private.business_timezone())::date end;
$$;
revoke all on function private.analytics_bucket(timestamptz, text) from public, anon, authenticated;

create or replace function private.analytics_bucket_day(day date, bucket text)
returns date
language sql
immutable
set search_path = ''
as $$
  select case when bucket = 'week' then date_trunc('week', day::timestamp)::date else day end;
$$;
revoke all on function private.analytics_bucket_day(date, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Settings: website analytics configuration (C7 website_settings extended)
-- ---------------------------------------------------------------------

alter table public.website_settings
  add column if not exists first_party_analytics_enabled boolean not null default false,
  add column if not exists analytics_site_id text,
  add column if not exists analytics_retention_days integer not null default 400;
alter table public.website_settings drop constraint if exists website_settings_analytics_site_id_check;
alter table public.website_settings add constraint website_settings_analytics_site_id_check
  check (analytics_site_id is null or (analytics_site_id ~ '^[A-Za-z0-9._:/-]{1,200}$'));
alter table public.website_settings drop constraint if exists website_settings_analytics_retention_check;
alter table public.website_settings add constraint website_settings_analytics_retention_check
  check (analytics_retention_days between 30 and 1100);

-- Contractor assignments: real completion instant (analytics "completed in
-- period"). Existing completed rows are backfilled from updated_at — the
-- best evidence available; documented in CLAUDE_C9_ANALYTICS_ARCHITECTURE.
alter table public.contractor_assignments add column if not exists completed_at timestamptz;
update public.contractor_assignments set completed_at = updated_at where status = 'completed' and completed_at is null;

create or replace function private.stamp_assignment_completed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.completed_at := now();
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists contractor_assignments_stamp_completed on public.contractor_assignments;
create trigger contractor_assignments_stamp_completed before update of status on public.contractor_assignments
for each row execute function private.stamp_assignment_completed();

-- ---------------------------------------------------------------------
-- Website analytics: privacy-safe DAILY AGGREGATE only
-- ---------------------------------------------------------------------
-- No event rows, no visitor identifier, no IP, no user agent, no query
-- strings: a counter per (local day, event type, canonical route key,
-- bounded dimension, device class). Page views are site events, not
-- guaranteed unique humans (bots may be included).

create table public.website_analytics_daily (
  day date not null,
  event_type text not null check (event_type in (
    'page_view', 'cta_click', 'service_view', 'service_enquiry_start', 'service_enquiry_submit',
    'project_intake_start', 'project_intake_submit', 'contact_submit', 'material_enquiry_submit', 'case_study_view'
  )),
  path_key text not null check (path_key ~ '^/[a-z0-9/-]{0,120}$'),
  dimension text not null default '' check (dimension ~ '^[a-z0-9_-]{0,80}$'),
  device_class text not null default 'unknown' check (device_class in ('mobile', 'tablet', 'desktop', 'unknown')),
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, event_type, path_key, dimension, device_class)
);
create index website_analytics_daily_type_day_idx on public.website_analytics_daily (event_type, day);

alter table public.website_analytics_daily enable row level security;
alter table public.website_analytics_daily force row level security;
revoke all on public.website_analytics_daily from public, anon, authenticated;

-- Rate limiting reuses the C8 HMAC identity counters (short-lived, pruned
-- after two days, never joined to analytics data).
alter table public.intake_rate_limits drop constraint if exists intake_rate_limits_scope_check;
alter table public.intake_rate_limits add constraint intake_rate_limits_scope_check
  check (scope in ('contact', 'project', 'service', 'material', 'upload', 'analytics'));

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
  if target_identity_hash !~ '^[0-9a-f]{64}$' or target_scope not in ('contact', 'project', 'service', 'material', 'upload', 'analytics')
     or max_hits < 1 or window_seconds < 60 then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_request');
  end if;
  bucket_start := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.intake_rate_limits as limits (identity_hash, scope, window_start, hit_count)
  values (target_identity_hash, target_scope, bucket_start, 1)
  on conflict (identity_hash, scope, window_start) do update set hit_count = limits.hit_count + 1
  returning hit_count into hits;
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

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('leads', 'projects', 'finance', 'contractors', 'procurement', 'website', 'security', 'system')),
  severity text not null default 'info' check (severity in ('info', 'attention', 'urgent')),
  title text not null check (btrim(title) <> '' and char_length(title) <= 120),
  body_short text check (body_short is null or char_length(body_short) <= 240),
  entity_type text check (entity_type is null or entity_type in (
    'lead', 'client', 'operational_project', 'invoice', 'trade_partner', 'contractor_assignment',
    'material', 'material_requirement', 'purchase_order', 'settings', 'profile'
  )),
  entity_id uuid,
  href text check (href is null or (href ~ '^/admin(/[a-z0-9_-]+)*(\?[a-z0-9_=&-]+)?$' and char_length(href) <= 200)),
  dedupe_key text check (dedupe_key is null or (btrim(dedupe_key) <> '' and char_length(dedupe_key) <= 160)),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz
);
create unique index notifications_dedupe_idx on public.notifications (recipient_profile_id, dedupe_key) where dedupe_key is not null;
create index notifications_recipient_created_idx on public.notifications (recipient_profile_id, created_at desc, id desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_profile_id, created_at desc) where read_at is null and archived_at is null;
create index notifications_recipient_category_idx on public.notifications (recipient_profile_id, category, created_at desc);

create table public.notification_preferences (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('leads', 'projects', 'finance', 'contractors', 'procurement', 'website')),
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (profile_id, category)
);

create table public.notification_sweep_runs (
  id bigint generated always as identity primary key,
  trigger_kind text not null check (trigger_kind in ('manual', 'scheduled', 'verification')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  produced_count integer not null default 0 check (produced_count >= 0),
  actor_id uuid references public.profiles (id) on delete set null
);
create index notification_sweep_runs_started_idx on public.notification_sweep_runs (started_at desc);
create index notification_sweep_runs_actor_idx on public.notification_sweep_runs (actor_id);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_sweep_runs enable row level security;
alter table public.notifications force row level security;
alter table public.notification_preferences force row level security;
alter table public.notification_sweep_runs force row level security;
revoke all on public.notifications, public.notification_preferences, public.notification_sweep_runs from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Notification engine (private)
-- ---------------------------------------------------------------------
-- Payloads are intentionally small and privacy-safe: a title, a short body
-- with document numbers / references / stage names only, and a link to the
-- authorized record. Never a lead message, address, note or amount that the
-- recipient is not entitled to (recipients are resolved by permission).

create or replace function private.notify(
  target_recipient uuid, target_category text, target_severity text, target_title text,
  target_body text, target_entity_type text, target_entity_id uuid, target_href text,
  target_dedupe_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if target_recipient is null then return false; end if;
  if not exists (select 1 from public.profiles where id = target_recipient and account_status = 'active') then
    return false;
  end if;
  -- Per-staff preferences (security and system are mandatory).
  if target_category not in ('security', 'system') and exists (
    select 1 from public.notification_preferences as p
    where p.profile_id = target_recipient and p.category = target_category and not p.in_app_enabled
  ) then
    return false;
  end if;
  insert into public.notifications (
    recipient_profile_id, category, severity, title, body_short, entity_type, entity_id, href, dedupe_key
  )
  values (
    target_recipient, target_category, target_severity, left(btrim(target_title), 120),
    nullif(left(btrim(coalesce(target_body, '')), 240), ''), target_entity_type, target_entity_id, target_href, target_dedupe_key
  )
  on conflict (recipient_profile_id, dedupe_key) where dedupe_key is not null do nothing
  returning id into new_id;
  if new_id is null then return false; end if;
  perform private.emit_realtime_event('notification', new_id, 'created');
  return true;
end;
$$;
revoke all on function private.notify(uuid, text, text, text, text, text, uuid, text, text) from public, anon, authenticated;

-- Active staff holding a permission (recipient resolution is permission-based
-- because no ownership concept exists for most records).
create or replace function private.permission_holders(requested_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct profiles.id
  from public.profiles
  join public.user_roles on user_roles.user_id = profiles.id
  join public.role_permissions on role_permissions.role_id = user_roles.role_id
  join public.permissions on permissions.id = role_permissions.permission_id
  where profiles.account_status = 'active' and permissions.key = requested_permission;
$$;
revoke all on function private.permission_holders(text) from public, anon, authenticated;

create or replace function private.super_admins()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct profiles.id
  from public.profiles
  join public.user_roles on user_roles.user_id = profiles.id
  join public.roles on roles.id = user_roles.role_id
  where profiles.account_status = 'active' and roles.key = 'super_admin';
$$;
revoke all on function private.super_admins() from public, anon, authenticated;

create or replace function private.notify_permission_holders(
  requested_permission text, exclude_actor uuid, target_category text, target_severity text, target_title text,
  target_body text, target_entity_type text, target_entity_id uuid, target_href text, target_dedupe_key text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  produced integer := 0;
begin
  for recipient in select * from private.permission_holders(requested_permission) loop
    if exclude_actor is not null and recipient = exclude_actor then continue; end if;
    if private.notify(recipient, target_category, target_severity, target_title, target_body,
                      target_entity_type, target_entity_id, target_href, target_dedupe_key) then
      produced := produced + 1;
    end if;
  end loop;
  return produced;
end;
$$;
revoke all on function private.notify_permission_holders(text, uuid, text, text, text, text, text, uuid, text, text) from public, anon, authenticated;

create or replace function private.notify_super_admins(
  exclude_actor uuid, target_category text, target_severity text, target_title text,
  target_body text, target_entity_type text, target_entity_id uuid, target_href text, target_dedupe_key text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  produced integer := 0;
begin
  for recipient in select * from private.super_admins() loop
    if exclude_actor is not null and recipient = exclude_actor then continue; end if;
    if private.notify(recipient, target_category, target_severity, target_title, target_body,
                      target_entity_type, target_entity_id, target_href, target_dedupe_key) then
      produced := produced + 1;
    end if;
  end loop;
  return produced;
end;
$$;
revoke all on function private.notify_super_admins(uuid, text, text, text, text, text, uuid, text, text) from public, anon, authenticated;

create or replace function private.lead_type_label(lead_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lead_type when 'project' then 'project' when 'service' then 'service' when 'material' then 'material' else 'general' end;
$$;
revoke all on function private.lead_type_label(text) from public, anon, authenticated;

create or replace function private.lead_stage_label(status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case status
    when 'new' then 'New' when 'contacted' then 'Contacted' when 'qualified' then 'Qualified'
    when 'site_visit' then 'Site visit' when 'proposal' then 'Proposal' when 'won' then 'Won' when 'lost' then 'Lost'
    else status end;
$$;
revoke all on function private.lead_stage_label(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Event-driven notifications (AFTER triggers on the real tables — no facade
-- body is duplicated; auth.uid() identifies the acting staff member, null
-- for the public intake path executed by the server credential).
-- ---------------------------------------------------------------------

create or replace function private.notify_lead_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_channel in ('website_contact', 'start_a_project', 'service_page', 'material_enquiry') then
    perform private.notify_permission_holders('leads.write', null, 'leads', 'attention',
      'New ' || private.lead_type_label(new.lead_type) || ' enquiry received',
      new.reference || ' · ' || case new.source_channel
        when 'website_contact' then 'Contact form' when 'start_a_project' then 'Start a Project'
        when 'service_page' then 'Service page' else 'Material enquiry' end,
      'lead', new.id, '/admin/operations/leads/' || new.id::text, 'lead:' || new.id::text || ':submitted');
  end if;
  return null;
end;
$$;
drop trigger if exists leads_notify_submitted on public.leads;
create trigger leads_notify_submitted after insert on public.leads
for each row execute function private.notify_lead_submitted();

create or replace function private.notify_lead_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to and new.assigned_to is distinct from actor then
    perform private.notify(new.assigned_to, 'leads', 'attention', 'Lead assigned to you',
      new.reference || ' · ' || private.lead_type_label(new.lead_type) || ' enquiry · ' || private.lead_stage_label(new.status),
      'lead', new.id, '/admin/operations/leads/' || new.id::text, 'lead:' || new.id::text || ':assigned:' || new.version::text);
  end if;
  if new.status is distinct from old.status then
    if new.assigned_to is not null and new.assigned_to is distinct from actor and new.assigned_to is not distinct from old.assigned_to then
      perform private.notify(new.assigned_to, 'leads', 'info', 'Lead moved to ' || private.lead_stage_label(new.status),
        new.reference, 'lead', new.id, '/admin/operations/leads/' || new.id::text,
        'lead:' || new.id::text || ':stage:' || new.version::text);
    end if;
    if new.status = 'won' then
      perform private.notify_permission_holders('leads.write', actor, 'leads', 'info', 'Lead won',
        new.reference || ' · ' || private.lead_type_label(new.lead_type) || ' enquiry',
        'lead', new.id, '/admin/operations/leads/' || new.id::text, 'lead:' || new.id::text || ':won:' || new.version::text);
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists leads_notify_changed on public.leads;
create trigger leads_notify_changed after update of assigned_to, status on public.leads
for each row execute function private.notify_lead_changed();

create or replace function private.notify_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  invoice public.invoices%rowtype;
  money record;
begin
  select * into invoice from public.invoices where id = new.invoice_id;
  select * into money from private.invoice_financials(new.invoice_id);
  if tg_op = 'INSERT' then
    perform private.notify_permission_holders('finance.invoices.read', actor, 'finance', 'info', 'Payment recorded',
      coalesce(invoice.invoice_number, 'Invoice') || ' · ' || invoice.currency || ' ' || to_char(new.amount, 'FM999G999G999G990D00'),
      'invoice', invoice.id, '/admin/finance/invoices/' || invoice.id::text, 'invoice:' || invoice.id::text || ':payment:' || new.id::text);
    if money.payment_state = 'paid' then
      perform private.notify_permission_holders('finance.invoices.read', actor, 'finance', 'info', 'Invoice paid in full',
        coalesce(invoice.invoice_number, 'Invoice') || ' · ' || invoice.currency,
        'invoice', invoice.id, '/admin/finance/invoices/' || invoice.id::text, 'invoice:' || invoice.id::text || ':paid:' || new.id::text);
    end if;
  elsif tg_op = 'UPDATE' and new.reversed_at is not null and old.reversed_at is null then
    perform private.notify_permission_holders('finance.invoices.read', actor, 'finance', 'attention', 'Payment reversed',
      coalesce(invoice.invoice_number, 'Invoice') || ' · ' || invoice.currency || ' ' || to_char(new.amount, 'FM999G999G999G990D00'),
      'invoice', invoice.id, '/admin/finance/invoices/' || invoice.id::text, 'invoice:' || invoice.id::text || ':reversal:' || new.id::text);
  end if;
  return null;
end;
$$;
drop trigger if exists invoice_payments_notify on public.invoice_payments;
create trigger invoice_payments_notify after insert or update of reversed_at on public.invoice_payments
for each row execute function private.notify_invoice_payment();

create or replace function private.notify_purchase_order_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if new.lifecycle_state = 'issued' and old.lifecycle_state is distinct from 'issued' then
    perform private.notify_permission_holders('procurement.orders.read', actor, 'procurement', 'info', 'Purchase order issued',
      coalesce(new.purchase_order_number, 'Purchase order') || ' · ' || new.currency,
      'purchase_order', new.id, '/admin/procurement/orders/' || new.id::text, 'po:' || new.id::text || ':issued');
  end if;
  return null;
end;
$$;
drop trigger if exists purchase_orders_notify_state on public.purchase_orders;
create trigger purchase_orders_notify_state after update of lifecycle_state on public.purchase_orders
for each row execute function private.notify_purchase_order_state();

create or replace function private.notify_goods_receipt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  po_number text;
begin
  select purchase_order_number into po_number from public.purchase_orders where id = new.purchase_order_id;
  perform private.notify_permission_holders('procurement.orders.read', actor, 'procurement', 'info', 'Goods receipt recorded',
    coalesce(po_number, 'Purchase order') || ' · received ' || to_char(new.received_at, 'YYYY-MM-DD'),
    'purchase_order', new.purchase_order_id, '/admin/procurement/orders/' || new.purchase_order_id::text,
    'po:' || new.purchase_order_id::text || ':receipt:' || new.id::text);
  return null;
end;
$$;
drop trigger if exists po_receipts_notify on public.purchase_order_receipts;
create trigger po_receipts_notify after insert on public.purchase_order_receipts
for each row execute function private.notify_goods_receipt();

create or replace function private.notify_project_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if new.status is distinct from old.status then
    perform private.notify_permission_holders('operations.projects.read', actor, 'projects', 'info',
      'Project ' || case new.status when 'in_progress' then 'in progress' when 'on_hold' then 'on hold' else new.status end,
      left(new.title, 80), 'operational_project', new.id, '/admin/operations/projects/' || new.id::text,
      'project:' || new.id::text || ':status:' || new.version::text);
  end if;
  return null;
end;
$$;
drop trigger if exists operational_projects_notify_status on public.operational_projects;
create trigger operational_projects_notify_status after update of status on public.operational_projects
for each row execute function private.notify_project_status();

create or replace function private.notify_assignment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  partner_name text;
begin
  if new.status is distinct from old.status and new.status in ('completed', 'cancelled') then
    select display_name into partner_name from public.trade_partners where id = new.trade_partner_id;
    perform private.notify_permission_holders('partners.read', actor, 'contractors', 'info',
      'Contractor assignment ' || new.status, coalesce(left(partner_name, 80), 'Contractor'),
      'contractor_assignment', new.id, '/admin/operations/assignments/' || new.id::text,
      'assignment:' || new.id::text || ':' || new.status || ':' || new.version::text);
  end if;
  return null;
end;
$$;
drop trigger if exists contractor_assignments_notify_status on public.contractor_assignments;
create trigger contractor_assignments_notify_status after update of status on public.contractor_assignments
for each row execute function private.notify_assignment_status();

create or replace function private.notify_configuration_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_permission_holders('settings.website.read', auth.uid(), 'website', 'info',
    'Public configuration published', coalesce(left(new.note, 120), 'A new public configuration snapshot is live.'),
    'settings', private.settings_entity_id('website'), '/admin/settings', 'settings:snapshot:' || new.id::text);
  return null;
end;
$$;
drop trigger if exists public_configuration_snapshots_notify on public.public_configuration_snapshots;
create trigger public_configuration_snapshots_notify after insert on public.public_configuration_snapshots
for each row execute function private.notify_configuration_published();

create or replace function private.notify_site_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.site_mode is distinct from old.site_mode then
    perform private.notify_permission_holders('settings.website.read', auth.uid(), 'system', 'attention',
      'Site mode changed to ' || new.site_mode, 'The public website is now in ' || new.site_mode || ' mode.',
      'settings', private.settings_entity_id('website'), '/admin/settings/launch-readiness',
      'settings:site_mode:' || new.site_mode || ':' || new.version::text);
  end if;
  return null;
end;
$$;
drop trigger if exists website_settings_notify_mode on public.website_settings;
create trigger website_settings_notify_mode after update of site_mode on public.website_settings
for each row execute function private.notify_site_mode();

create or replace function private.notify_staff_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.account_status is distinct from old.account_status and old.account_status is not null then
    perform private.notify_super_admins(auth.uid(), 'security', 'attention',
      'Staff account ' || coalesce(new.account_status, 'changed'), coalesce(left(new.display_name, 80), 'Staff member'),
      'profile', new.id, '/admin/settings/staff', 'security:status:' || new.id::text || ':' || new.version::text);
  end if;
  return null;
end;
$$;
drop trigger if exists profiles_notify_status on public.profiles;
create trigger profiles_notify_status after update of account_status on public.profiles
for each row execute function private.notify_staff_status();

create or replace function private.notify_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  target_role smallint := case when tg_op = 'DELETE' then old.role_id else new.role_id end;
  role_label text;
  staff_name text;
begin
  select display_name into staff_name from public.profiles where id = target;
  if staff_name is null and not exists (select 1 from public.profiles where id = target) then
    return null; -- profile already gone (account deletion cascade)
  end if;
  select roles.key into role_label from public.roles where roles.id = target_role;
  perform private.notify_super_admins(auth.uid(), 'security', 'attention', 'Staff role changed',
    coalesce(left(staff_name, 80), 'Staff member') || ' · ' || case when tg_op = 'INSERT' then 'granted ' else 'removed ' end || coalesce(role_label, 'role'),
    'profile', target, '/admin/settings/staff', 'security:role:' || target::text || ':' || to_char(now(), 'YYYYMMDDHH24MI'));
  return null;
end;
$$;
drop trigger if exists user_roles_notify_change on public.user_roles;
create trigger user_roles_notify_change after insert or delete on public.user_roles
for each row execute function private.notify_role_change();

-- ---------------------------------------------------------------------
-- Timed (deterministic) notifications: one idempotent sweep
-- ---------------------------------------------------------------------
-- Every rule uses a deterministic dedupe key with a date bucket, so running
-- the sweep twice (or hourly) never duplicates an active alert; recurring
-- conditions (overdue, behind schedule, delayed) re-alert at most weekly.

create or replace function private.generate_due_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := private.business_today();
  week_key text := to_char(today, 'IYYY-"W"IW');
  due_soon_days integer := coalesce(private.operational_setting('invoice_due_soon_days'), 7);
  project_days integer := coalesce(private.operational_setting('project_ending_soon_days'), 14);
  assignment_days integer := coalesce(private.operational_setting('assignment_ending_soon_days'), 14);
  material_days integer := coalesce(private.operational_setting('material_required_soon_days'), 14);
  po_days integer := coalesce(private.operational_setting('po_expected_soon_days'), 7);
  uncontacted_hours integer := coalesce(private.intake_setting('lead_uncontacted_hours'), 24);
  proposal_days integer := coalesce(private.intake_setting('proposal_stale_days'), 14);
  produced integer := 0;
  item record;
begin
  -- Invoices overdue (weekly bucket) and due soon (once per due date).
  for item in
    select invoice.id, invoice.invoice_number, invoice.currency, invoice.due_date, money.balance_due, money.is_overdue
    from public.invoices as invoice
    cross join lateral private.invoice_financials(invoice.id) as money
    where invoice.lifecycle_state = 'issued' and money.balance_due > 0
      and (money.is_overdue or invoice.due_date between today and today + due_soon_days)
  loop
    if item.is_overdue then
      produced := produced + private.notify_permission_holders('finance.invoices.read', null, 'finance',
        case when today - item.due_date > 30 then 'urgent' else 'attention' end,
        'Invoice overdue', item.invoice_number || ' · was due ' || to_char(item.due_date, 'YYYY-MM-DD') || ' · ' || item.currency || ' outstanding',
        'invoice', item.id, '/admin/finance/invoices/' || item.id::text, 'invoice:' || item.id::text || ':overdue:' || week_key);
    else
      produced := produced + private.notify_permission_holders('finance.invoices.read', null, 'finance', 'info',
        'Invoice due soon', item.invoice_number || ' · due ' || to_char(item.due_date, 'YYYY-MM-DD'),
        'invoice', item.id, '/admin/finance/invoices/' || item.id::text, 'invoice:' || item.id::text || ':due_soon:' || to_char(item.due_date, 'YYYY-MM-DD'));
    end if;
  end loop;

  -- Projects ending soon (once per planned end date) / behind planned end (weekly).
  for item in
    select id, title, end_date from public.operational_projects
    where archived_at is null and status <> 'completed' and end_date is not null and end_date <= today + project_days
  loop
    if item.end_date < today then
      produced := produced + private.notify_permission_holders('operations.projects.read', null, 'projects', 'attention',
        'Project behind planned end date', left(item.title, 80) || ' · planned end ' || to_char(item.end_date, 'YYYY-MM-DD'),
        'operational_project', item.id, '/admin/operations/projects/' || item.id::text, 'project:' || item.id::text || ':behind:' || week_key);
    else
      produced := produced + private.notify_permission_holders('operations.projects.read', null, 'projects', 'info',
        'Project ending soon', left(item.title, 80) || ' · planned end ' || to_char(item.end_date, 'YYYY-MM-DD'),
        'operational_project', item.id, '/admin/operations/projects/' || item.id::text, 'project:' || item.id::text || ':ending_soon:' || to_char(item.end_date, 'YYYY-MM-DD'));
    end if;
  end loop;

  -- Purchase orders delayed (weekly) / expected soon (once per expected date).
  for item in
    select po.id, po.purchase_order_number, po.expected_delivery_date, money.is_delayed, money.remaining_quantity
    from public.purchase_orders as po
    cross join lateral private.purchase_order_financials(po.id) as money
    where po.lifecycle_state = 'issued' and money.remaining_quantity > 0 and po.expected_delivery_date is not null
      and po.expected_delivery_date <= today + po_days
  loop
    if item.is_delayed then
      produced := produced + private.notify_permission_holders('procurement.orders.read', null, 'procurement', 'attention',
        'Purchase order delayed', item.purchase_order_number || ' · expected ' || to_char(item.expected_delivery_date, 'YYYY-MM-DD'),
        'purchase_order', item.id, '/admin/procurement/orders/' || item.id::text, 'po:' || item.id::text || ':delayed:' || week_key);
    else
      produced := produced + private.notify_permission_holders('procurement.orders.read', null, 'procurement', 'info',
        'Delivery expected soon', item.purchase_order_number || ' · expected ' || to_char(item.expected_delivery_date, 'YYYY-MM-DD'),
        'purchase_order', item.id, '/admin/procurement/orders/' || item.id::text, 'po:' || item.id::text || ':expected_soon:' || to_char(item.expected_delivery_date, 'YYYY-MM-DD'));
    end if;
  end loop;

  -- Material requirements due soon (once per required-by date).
  for item in
    select r.id, r.item_name, r.required_by, r.operational_project_id
    from public.project_material_requirements as r
    where r.approval_state = 'approved' and r.required_by is not null and r.required_by between today and today + material_days
  loop
    produced := produced + private.notify_permission_holders('procurement.orders.read', null, 'procurement', 'info',
      'Material required soon', left(item.item_name, 80) || ' · required by ' || to_char(item.required_by, 'YYYY-MM-DD'),
      'material_requirement', item.id, '/admin/operations/projects/' || item.operational_project_id::text || '?tab=procurement',
      'requirement:' || item.id::text || ':due_soon:' || to_char(item.required_by, 'YYYY-MM-DD'));
  end loop;

  -- Contractor assignments ending soon (once per end date).
  for item in
    select a.id, a.end_date, p.display_name
    from public.contractor_assignments as a
    join public.trade_partners as p on p.id = a.trade_partner_id
    where a.archived_at is null and a.status = 'active' and a.end_date is not null and a.end_date between today and today + assignment_days
  loop
    produced := produced + private.notify_permission_holders('partners.read', null, 'contractors', 'info',
      'Contractor assignment ending soon', left(item.display_name, 80) || ' · ends ' || to_char(item.end_date, 'YYYY-MM-DD'),
      'contractor_assignment', item.id, '/admin/operations/assignments/' || item.id::text,
      'assignment:' || item.id::text || ':ending_soon:' || to_char(item.end_date, 'YYYY-MM-DD'));
  end loop;

  -- Stale leads: uncontacted beyond the threshold (daily bucket) and stale
  -- proposals (weekly). The assignee is told; unassigned leads go to lead handlers.
  for item in
    select id, reference, assigned_to, status, submitted_at, updated_at from public.leads
    where archived_at is null and (
      (status = 'new' and first_contact_at is null and submitted_at < now() - make_interval(hours => uncontacted_hours))
      or (status = 'proposal' and updated_at < now() - make_interval(days => proposal_days))
    )
  loop
    if item.status = 'new' then
      if item.assigned_to is not null then
        if private.notify(item.assigned_to, 'leads', 'attention', 'Lead awaiting first contact',
          item.reference || ' · submitted ' || to_char(private.business_day(item.submitted_at), 'YYYY-MM-DD'),
          'lead', item.id, '/admin/operations/leads/' || item.id::text, 'lead:' || item.id::text || ':uncontacted:' || to_char(today, 'YYYY-MM-DD')) then
          produced := produced + 1;
        end if;
      else
        produced := produced + private.notify_permission_holders('leads.write', null, 'leads', 'attention', 'Lead awaiting first contact',
          item.reference || ' · unassigned · submitted ' || to_char(private.business_day(item.submitted_at), 'YYYY-MM-DD'),
          'lead', item.id, '/admin/operations/leads/' || item.id::text, 'lead:' || item.id::text || ':uncontacted:' || to_char(today, 'YYYY-MM-DD'));
      end if;
    else
      if item.assigned_to is not null then
        if private.notify(item.assigned_to, 'leads', 'attention', 'Proposal going stale',
          item.reference || ' · no change since ' || to_char(private.business_day(item.updated_at), 'YYYY-MM-DD'),
          'lead', item.id, '/admin/operations/leads/' || item.id::text, 'lead:' || item.id::text || ':proposal_stale:' || week_key) then
          produced := produced + 1;
        end if;
      else
        produced := produced + private.notify_permission_holders('leads.write', null, 'leads', 'attention', 'Proposal going stale',
          item.reference || ' · unassigned · no change since ' || to_char(private.business_day(item.updated_at), 'YYYY-MM-DD'),
          'lead', item.id, '/admin/operations/leads/' || item.id::text, 'lead:' || item.id::text || ':proposal_stale:' || week_key);
      end if;
    end if;
  end loop;

  return produced;
end;
$$;
revoke all on function private.generate_due_notifications() from public, anon, authenticated;

create or replace function private.record_sweep_run(trigger_kind text, actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id bigint;
  produced integer;
begin
  insert into public.notification_sweep_runs (trigger_kind, actor_id) values (trigger_kind, actor) returning id into run_id;
  produced := private.generate_due_notifications();
  update public.notification_sweep_runs set finished_at = now(), produced_count = produced where id = run_id;
  return jsonb_build_object('ok', true, 'run_id', run_id, 'produced', produced, 'finished_at', now());
end;
$$;
revoke all on function private.record_sweep_run(text, uuid) from public, anon, authenticated;

-- Server credential entry point (pnpm notifications:sweep / future scheduler).
create or replace function public.run_notification_sweep(trigger_kind text default 'scheduled')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if trigger_kind not in ('scheduled', 'verification') then
    raise exception using errcode = '22023', message = 'sweep trigger kind is not admitted';
  end if;
  return private.record_sweep_run(trigger_kind, null);
end;
$$;
revoke all on function public.run_notification_sweep(text) from public, anon, authenticated;
grant execute on function public.run_notification_sweep(text) to service_role;

-- Manual run from Settings (notifications.manage).
create or replace function public.admin_run_notification_sweep()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('notifications.manage') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'notifications.manage is required.')));
  end if;
  result := private.record_sweep_run('manual', auth.uid());
  perform private.s4_audit('notification.sweep_run', 'settings', 'notifications', 'success', jsonb_build_object('produced', result -> 'produced'));
  return result;
end;
$$;
grant execute on function public.admin_run_notification_sweep() to authenticated;

-- ---------------------------------------------------------------------
-- Notification facades (notifications.read; own rows only)
-- ---------------------------------------------------------------------

create or replace function private.notification_json(n public.notifications)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', n.id, 'category', n.category, 'severity', n.severity, 'title', n.title, 'body_short', n.body_short,
    'entity_type', n.entity_type, 'entity_id', n.entity_id, 'href', n.href,
    'created_at', n.created_at, 'read_at', n.read_at, 'archived_at', n.archived_at
  );
$$;
revoke all on function private.notification_json(public.notifications) from public, anon, authenticated;

create or replace function public.admin_notifications_summary(limit_count integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('notifications.read') then
    raise exception using errcode = '42501', message = 'notifications are not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 20 then
    raise exception using errcode = '22023', message = 'notification summary limit is outside the admitted range';
  end if;
  return jsonb_build_object(
    'unread_count', (select count(*) from public.notifications where recipient_profile_id = auth.uid() and read_at is null and archived_at is null),
    'latest', coalesce((
      select jsonb_agg(private.notification_json(n) order by n.created_at desc, n.id desc)
      from (select * from public.notifications where recipient_profile_id = auth.uid() and archived_at is null
            order by created_at desc, id desc limit limit_count) as n
    ), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.admin_notifications_summary(integer) to authenticated;

create or replace function public.admin_list_notifications(
  state_filter text default 'all', category_filter text default null, severity_filter text default null,
  date_from date default null, date_to date default null,
  cursor_created_at timestamptz default null, cursor_id uuid default null, page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  zone text := private.business_timezone();
  items jsonb;
  item_count integer;
begin
  if not private.has_permission('notifications.read') then
    raise exception using errcode = '42501', message = 'notifications are not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 100 then
    raise exception using errcode = '22023', message = 'notification page size is outside the admitted range';
  end if;
  if state_filter not in ('all', 'unread', 'archived') then
    raise exception using errcode = '22023', message = 'notification state filter is not admitted';
  end if;
  if category_filter is not null and category_filter not in ('leads', 'projects', 'finance', 'contractors', 'procurement', 'website', 'security', 'system') then
    raise exception using errcode = '22023', message = 'notification category filter is not admitted';
  end if;
  if severity_filter is not null and severity_filter not in ('info', 'attention', 'urgent') then
    raise exception using errcode = '22023', message = 'notification severity filter is not admitted';
  end if;
  select coalesce(jsonb_agg(private.notification_json(n) order by n.created_at desc, n.id desc), '[]'::jsonb), count(*)
  into items, item_count
  from (
    select * from public.notifications as n
    where n.recipient_profile_id = auth.uid()
      and (case state_filter when 'unread' then n.read_at is null and n.archived_at is null
                             when 'archived' then n.archived_at is not null
                             else n.archived_at is null end)
      and (category_filter is null or n.category = category_filter)
      and (severity_filter is null or n.severity = severity_filter)
      and (date_from is null or n.created_at >= (date_from::timestamp at time zone zone))
      and (date_to is null or n.created_at < ((date_to + 1)::timestamp at time zone zone))
      and (cursor_created_at is null or cursor_id is null or (n.created_at, n.id) < (cursor_created_at, cursor_id))
    order by n.created_at desc, n.id desc
    limit page_size + 1
  ) as n;
  return jsonb_build_object(
    'items', case when item_count > page_size then items - (page_size) else items end,
    'has_more', item_count > page_size,
    'unread_count', (select count(*) from public.notifications where recipient_profile_id = auth.uid() and read_at is null and archived_at is null),
    'category_counts', (
      select coalesce(jsonb_object_agg(category, total), '{}'::jsonb)
      from (select category, count(*) as total from public.notifications
            where recipient_profile_id = auth.uid() and read_at is null and archived_at is null group by category) as c
    ),
    'timezone', zone
  );
end;
$$;
grant execute on function public.admin_list_notifications(text, text, text, date, date, timestamptz, uuid, integer) to authenticated;

create or replace function public.mark_notification_read(target_id uuid, target_read boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched integer;
begin
  if not private.has_permission('notifications.read') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'notifications.read is required.')));
  end if;
  update public.notifications
     set read_at = case when target_read then coalesce(read_at, now()) else null end
   where id = target_id and recipient_profile_id = auth.uid();
  get diagnostics touched = row_count;
  if touched = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Notification not found.')));
  end if;
  return jsonb_build_object('ok', true, 'id', target_id,
    'unread_count', (select count(*) from public.notifications where recipient_profile_id = auth.uid() and read_at is null and archived_at is null));
end;
$$;
grant execute on function public.mark_notification_read(uuid, boolean) to authenticated;

create or replace function public.mark_all_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched integer;
begin
  if not private.has_permission('notifications.read') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'notifications.read is required.')));
  end if;
  update public.notifications set read_at = now()
   where recipient_profile_id = auth.uid() and read_at is null and archived_at is null;
  get diagnostics touched = row_count;
  perform private.s4_audit('notification.mark_all_read', 'profile', auth.uid()::text, 'success', jsonb_build_object('count', touched));
  return jsonb_build_object('ok', true, 'count', touched, 'unread_count', 0);
end;
$$;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.archive_notification(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched integer;
begin
  if not private.has_permission('notifications.read') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'notifications.read is required.')));
  end if;
  update public.notifications set archived_at = coalesce(archived_at, now()), read_at = coalesce(read_at, now())
   where id = target_id and recipient_profile_id = auth.uid();
  get diagnostics touched = row_count;
  if touched = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'id', 'Notification not found.')));
  end if;
  return jsonb_build_object('ok', true, 'id', target_id,
    'unread_count', (select count(*) from public.notifications where recipient_profile_id = auth.uid() and read_at is null and archived_at is null));
end;
$$;
grant execute on function public.archive_notification(uuid) to authenticated;

create or replace function public.admin_get_notification_preferences()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('notifications.read') then
    raise exception using errcode = '42501', message = 'notification preferences are not authorized';
  end if;
  return jsonb_build_object(
    'categories', (
      select jsonb_agg(jsonb_build_object(
        'category', c.category, 'mandatory', c.category in ('security', 'system'),
        'in_app_enabled', c.category in ('security', 'system') or coalesce(p.in_app_enabled, true)
      ) order by c.ordinal)
      from (values ('leads', 1), ('projects', 2), ('finance', 3), ('contractors', 4), ('procurement', 5), ('website', 6), ('security', 7), ('system', 8)) as c (category, ordinal)
      left join public.notification_preferences as p on p.profile_id = auth.uid() and p.category = c.category
    ),
    'email', jsonb_build_object('configured', false, 'detail', 'Email delivery provider not configured. In-app notifications are the only channel.'),
    'last_sweep', (select jsonb_build_object('started_at', r.started_at, 'finished_at', r.finished_at, 'produced_count', r.produced_count, 'trigger_kind', r.trigger_kind)
                   from public.notification_sweep_runs as r order by r.started_at desc limit 1),
    'can_run_sweep', private.has_permission('notifications.manage')
  );
end;
$$;
grant execute on function public.admin_get_notification_preferences() to authenticated;

create or replace function public.update_notification_preferences(preferences jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry record;
  changed jsonb := '{}'::jsonb;
begin
  if not private.has_permission('notifications.read') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'notifications.read is required.')));
  end if;
  if preferences is null or jsonb_typeof(preferences) <> 'object' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'preferences', 'Preferences must be an object of category → boolean.')));
  end if;
  for entry in select key, value from jsonb_each(preferences) loop
    if entry.key not in ('leads', 'projects', 'finance', 'contractors', 'procurement', 'website') then
      continue; -- security/system are mandatory and cannot be disabled
    end if;
    if jsonb_typeof(entry.value) <> 'boolean' then
      return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', entry.key, 'Preference values must be true or false.')));
    end if;
    insert into public.notification_preferences (profile_id, category, in_app_enabled)
    values (auth.uid(), entry.key, (entry.value)::boolean)
    on conflict (profile_id, category) do update set in_app_enabled = excluded.in_app_enabled, updated_at = now();
    changed := changed || jsonb_build_object(entry.key, (entry.value)::boolean);
  end loop;
  perform private.s4_audit('notification.preference_update', 'profile', auth.uid()::text, 'success', changed);
  return jsonb_build_object('ok', true, 'preferences', changed);
end;
$$;
grant execute on function public.update_notification_preferences(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Analytics: bounded aggregate RPCs (presentation-ready, by currency)
-- ---------------------------------------------------------------------
-- Every monetary figure is grouped by currency and never summed across
-- currencies. Terminology: invoiced / collected / outstanding / overdue /
-- committed / paid / remaining / ordered value / budget — never revenue,
-- profit or margin (the accounting model does not support them).

create or replace function private.analytics_leads(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  uncontacted_hours integer := coalesce(private.intake_setting('lead_uncontacted_hours'), 24);
  result jsonb;
begin
  select * into w from private.analytics_window(range_from, range_to);
  with period_leads as (
    select l.* from public.leads as l
    where l.archived_at is null and l.submitted_at >= w.start_at and l.submitted_at < w.end_at
  ),
  closed_in_period as (
    select l.* from public.leads as l
    where l.archived_at is null and (
      (l.status = 'won' and l.won_at >= w.start_at and l.won_at < w.end_at)
      or (l.status = 'lost' and l.lost_at >= w.start_at and l.lost_at < w.end_at))
  ),
  contact_durations as (
    select extract(epoch from (first_contact_at - submitted_at)) / 3600 as hours
    from period_leads where first_contact_at is not null and first_contact_at >= submitted_at
  ),
  qualification_durations as (
    select extract(epoch from (qualified_at - submitted_at)) / 3600 as hours
    from period_leads where qualified_at is not null and qualified_at >= submitted_at
  ),
  won_durations as (
    select extract(epoch from (won_at - submitted_at)) / 86400 as days from closed_in_period where status = 'won' and won_at >= submitted_at
  ),
  lost_durations as (
    select extract(epoch from (lost_at - submitted_at)) / 86400 as days from closed_in_period where status = 'lost' and lost_at >= submitted_at
  )
  select jsonb_build_object(
    'new_leads', (select count(*) from period_leads),
    'open_leads', (select count(*) from public.leads where archived_at is null and status not in ('won', 'lost')),
    'unassigned_leads', (select count(*) from public.leads where archived_at is null and status not in ('won', 'lost') and assigned_to is null),
    'awaiting_first_contact', (select count(*) from public.leads where archived_at is null and status = 'new' and first_contact_at is null),
    'status_counts', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb)
      from (select status, count(*) as total from period_leads group by status) as s),
    'funnel', jsonb_build_array(
      jsonb_build_object('stage', 'submitted', 'count', (select count(*) from period_leads)),
      jsonb_build_object('stage', 'contacted', 'count', (select count(*) from period_leads where first_contact_at is not null)),
      jsonb_build_object('stage', 'qualified', 'count', (select count(*) from period_leads where qualified_at is not null)),
      jsonb_build_object('stage', 'site_visit', 'count', (select count(*) from period_leads where site_visit_at is not null)),
      jsonb_build_object('stage', 'proposal', 'count', (select count(*) from period_leads as p
        where p.status in ('proposal', 'won') or exists (select 1 from public.lead_stage_history as h where h.lead_id = p.id and h.to_status = 'proposal'))),
      jsonb_build_object('stage', 'won', 'count', (select count(*) from period_leads where won_at is not null))
    ),
    'type_counts', (select coalesce(jsonb_object_agg(lead_type, total), '{}'::jsonb)
      from (select lead_type, count(*) as total from period_leads group by lead_type) as t),
    'source_counts', (select coalesce(jsonb_object_agg(source_channel, total), '{}'::jsonb)
      from (select source_channel, count(*) as total from period_leads group by source_channel) as t),
    'service_interest', coalesce((
      select jsonb_agg(jsonb_build_object('service_key', service_key, 'enquiries', enquiries, 'qualified', qualified, 'won', won) order by enquiries desc, service_key)
      from (select coalesce(service_key, 'unspecified') as service_key, count(*) as enquiries,
              count(*) filter (where qualified_at is not null) as qualified, count(*) filter (where won_at is not null) as won
            from period_leads group by coalesce(service_key, 'unspecified')) as s
    ), '[]'::jsonb),
    'response', jsonb_build_object(
      'contacted_count', (select count(*) from contact_durations),
      'median_hours', (select round((percentile_cont(0.5) within group (order by hours))::numeric, 1) from contact_durations),
      'average_hours', (select round(avg(hours)::numeric, 1) from contact_durations),
      'awaiting_first_contact', (select count(*) from period_leads where first_contact_at is null and status = 'new'),
      'target_hours', uncontacted_hours,
      'within_target_count', (select count(*) from contact_durations where hours <= uncontacted_hours)
    ),
    'qualification', jsonb_build_object(
      'qualified_count', (select count(*) from qualification_durations),
      'median_hours', (select round((percentile_cont(0.5) within group (order by hours))::numeric, 1) from qualification_durations),
      'average_hours', (select round(avg(hours)::numeric, 1) from qualification_durations)
    ),
    'outcome', jsonb_build_object(
      'won_count', (select count(*) from closed_in_period where status = 'won'),
      'lost_count', (select count(*) from closed_in_period where status = 'lost'),
      'win_rate', (select case when count(*) = 0 then null
        else round(100.0 * count(*) filter (where status = 'won') / count(*), 1) end from closed_in_period),
      'won_median_days', (select round((percentile_cont(0.5) within group (order by days))::numeric, 1) from won_durations),
      'lost_median_days', (select round((percentile_cont(0.5) within group (order by days))::numeric, 1) from lost_durations)
    ),
    'lost_reasons', coalesce((
      select jsonb_agg(jsonb_build_object('reason', lost_reason, 'count', total) order by total desc, lost_reason)
      from (select lost_reason, count(*) as total from closed_in_period where status = 'lost' group by lost_reason) as r
    ), '[]'::jsonb),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'submitted', submitted, 'won', won) order by bucket)
      from (
        select bucket, sum(submitted) as submitted, sum(won) as won from (
          select private.analytics_bucket(submitted_at, w.bucket) as bucket, 1 as submitted, 0 as won from period_leads
          union all
          select private.analytics_bucket(won_at, w.bucket), 0, 1 from closed_in_period where status = 'won'
        ) as entries group by bucket
      ) as t
    ), '[]'::jsonb)
  ) into result;
  return result || jsonb_build_object('range', jsonb_build_object('from', range_from, 'to', range_to, 'days', w.day_count, 'bucket', w.bucket, 'timezone', w.tz));
end;
$$;
revoke all on function private.analytics_leads(date, date) from public, anon, authenticated;

create or replace function private.analytics_projects(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  today date := private.business_today();
  ending_soon_days integer := coalesce(private.operational_setting('project_ending_soon_days'), 14);
  result jsonb;
begin
  select * into w from private.analytics_window(range_from, range_to);
  with live as (
    select * from public.operational_projects where archived_at is null
  ),
  active as (
    select * from live where status <> 'completed'
  ),
  phase_age as (
    select p.id, p.current_phase, (today - private.business_day(coalesce(
      (select max(h.created_at) from public.operational_project_phase_history as h where h.project_id = p.id), p.created_at))) as days_in_phase
    from active as p
  ),
  completed_in_period as (
    select distinct h.project_id from public.operational_project_status_history as h
    join live on live.id = h.project_id
    where h.to_status = 'completed' and h.created_at >= w.start_at and h.created_at < w.end_at
  ),
  created_in_period as (
    select * from live where created_at >= w.start_at and created_at < w.end_at
  )
  select jsonb_build_object(
    'active_projects', (select count(*) from active),
    'status_counts', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) from (select status, count(*) as total from live group by status) as s),
    'phase_counts', (select coalesce(jsonb_object_agg(current_phase, total), '{}'::jsonb) from (select current_phase, count(*) as total from live group by current_phase) as s),
    'priority_counts', (select coalesce(jsonb_object_agg(priority, total), '{}'::jsonb) from (select priority, count(*) as total from live group by priority) as s),
    'active_high_priority', (select count(*) from active where priority = 'high'),
    'schedule', jsonb_build_object(
      'ending_soon_window_days', ending_soon_days,
      'ending_soon', (select count(*) from active where end_date between today and today + ending_soon_days),
      'behind_planned_end', (select count(*) from active where end_date < today),
      'no_end_date', (select count(*) from active where end_date is null),
      'completed_in_period', (select count(*) from completed_in_period),
      'created_in_period', (select count(*) from created_in_period)
    ),
    'budget_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'project_count', project_count) order by currency)
      from (select budget_currency as currency, sum(budget_amount)::numeric(14, 2) as total, count(*) as project_count
            from active where budget_amount is not null group by budget_currency) as b
    ), '[]'::jsonb),
    'origin', jsonb_build_object(
      'from_leads', (select count(*) from created_in_period as p where exists (select 1 from public.leads as l where l.operational_project_id = p.id)),
      'manual', (select count(*) from created_in_period as p where not exists (select 1 from public.leads as l where l.operational_project_id = p.id)),
      'all_time_from_leads', (select count(*) from live as p where exists (select 1 from public.leads as l where l.operational_project_id = p.id)),
      'all_time_total', (select count(*) from live)
    ),
    'phase_aging', coalesce((
      select jsonb_agg(jsonb_build_object('phase', current_phase, 'count', total, 'average_days', average_days, 'max_days', max_days) order by ordinal)
      from (select current_phase, count(*) as total, round(avg(days_in_phase)::numeric, 1) as average_days, max(days_in_phase) as max_days,
              array_position(array['design', 'planning', 'procurement', 'structural', 'execution', 'finishing', 'completed'], current_phase) as ordinal
            from phase_age group by current_phase) as a
    ), '[]'::jsonb),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'created', created, 'completed', completed) order by bucket)
      from (
        select bucket, sum(created) as created, sum(completed) as completed from (
          select private.analytics_bucket(created_at, w.bucket) as bucket, 1 as created, 0 as completed from created_in_period
          union all
          select private.analytics_bucket(h.created_at, w.bucket), 0, 1
          from public.operational_project_status_history as h join live on live.id = h.project_id
          where h.to_status = 'completed' and h.created_at >= w.start_at and h.created_at < w.end_at
        ) as entries group by bucket
      ) as t
    ), '[]'::jsonb)
  ) into result;
  return result || jsonb_build_object('range', jsonb_build_object('from', range_from, 'to', range_to, 'days', w.day_count, 'bucket', w.bucket, 'timezone', w.tz));
end;
$$;
revoke all on function private.analytics_projects(date, date) from public, anon, authenticated;

create or replace function private.analytics_finance(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  today date := private.business_today();
  result jsonb;
begin
  select * into w from private.analytics_window(range_from, range_to);
  with issued as (
    select invoice.id, invoice.invoice_number, invoice.currency, invoice.issued_at, invoice.due_date,
      money.total, money.paid_amount, money.balance_due, money.payment_state, money.is_overdue
    from public.invoices as invoice
    cross join lateral private.invoice_financials(invoice.id) as money
    where invoice.lifecycle_state = 'issued'
  ),
  issued_in_period as (
    select * from issued where issued_at >= w.start_at and issued_at < w.end_at
  ),
  payments as (
    select payment.id, payment.amount, payment.payment_date, invoice.currency, invoice.id as invoice_id, invoice.issued_at
    from public.invoice_payments as payment
    join public.invoices as invoice on invoice.id = payment.invoice_id
    where payment.reversed_at is null and invoice.lifecycle_state = 'issued'
  ),
  currencies as (
    select distinct currency from issued
    union select distinct currency from payments where payment_date between range_from and range_to
  )
  select jsonb_build_object(
    'by_currency', coalesce((
      select jsonb_agg(jsonb_build_object(
        'currency', c.currency,
        'issued_count', (select count(*) from issued_in_period as i where i.currency = c.currency),
        'invoiced_amount', (select coalesce(sum(total), 0)::numeric(14, 2) from issued_in_period as i where i.currency = c.currency),
        'collected_amount', (select coalesce(sum(amount), 0)::numeric(14, 2) from payments as p where p.currency = c.currency and p.payment_date between range_from and range_to),
        'collected_on_period_invoices', (select coalesce(sum(p.amount), 0)::numeric(14, 2) from payments as p join issued_in_period as i on i.id = p.invoice_id where i.currency = c.currency),
        'collection_rate', (select case when coalesce(sum(i.total), 0) = 0 then null
            else round(100.0 * coalesce((select sum(p.amount) from payments as p join issued_in_period as i2 on i2.id = p.invoice_id where i2.currency = c.currency), 0) / sum(i.total), 1) end
          from issued_in_period as i where i.currency = c.currency),
        'outstanding_amount', (select coalesce(sum(balance_due), 0)::numeric(14, 2) from issued as i where i.currency = c.currency and i.balance_due > 0),
        'outstanding_count', (select count(*) from issued as i where i.currency = c.currency and i.balance_due > 0),
        'overdue_amount', (select coalesce(sum(balance_due), 0)::numeric(14, 2) from issued as i where i.currency = c.currency and i.is_overdue),
        'overdue_count', (select count(*) from issued as i where i.currency = c.currency and i.is_overdue),
        'paid_count', (select count(*) from issued as i where i.currency = c.currency and i.payment_state = 'paid'),
        'partially_paid_count', (select count(*) from issued as i where i.currency = c.currency and i.payment_state = 'partially_paid'),
        'unpaid_count', (select count(*) from issued as i where i.currency = c.currency and i.payment_state = 'unpaid'),
        'payment_count', (select count(*) from payments as p where p.currency = c.currency and p.payment_date between range_from and range_to),
        'aging', (
          select jsonb_agg(jsonb_build_object('bucket', bucket, 'amount', amount, 'invoice_count', invoice_count) order by ordinal)
          from (
            select bucket, ordinal, coalesce(sum(balance_due), 0)::numeric(14, 2) as amount, count(i.id) as invoice_count
            from (values ('not_due', 0), ('1_30', 1), ('31_60', 2), ('61_90', 3), ('90_plus', 4)) as b (bucket, ordinal)
            left join issued as i on i.currency = c.currency and i.balance_due > 0 and b.bucket = case
              when i.due_date is null or i.due_date >= today then 'not_due'
              when today - i.due_date <= 30 then '1_30'
              when today - i.due_date <= 60 then '31_60'
              when today - i.due_date <= 90 then '61_90'
              else '90_plus' end
            group by bucket, ordinal
          ) as a
        ),
        'payment_trend', coalesce((
          select jsonb_agg(jsonb_build_object('bucket', bucket, 'amount', amount, 'payment_count', payment_count) order by bucket)
          from (select private.analytics_bucket_day(payment_date, w.bucket) as bucket, sum(amount)::numeric(14, 2) as amount, count(*) as payment_count
                from payments as p where p.currency = c.currency and p.payment_date between range_from and range_to group by 1) as t
        ), '[]'::jsonb),
        'invoice_trend', coalesce((
          select jsonb_agg(jsonb_build_object('bucket', bucket, 'amount', amount, 'invoice_count', invoice_count) order by bucket)
          from (select private.analytics_bucket(issued_at, w.bucket) as bucket, sum(total)::numeric(14, 2) as amount, count(*) as invoice_count
                from issued_in_period as i where i.currency = c.currency group by 1) as t
        ), '[]'::jsonb)
      ) order by c.currency)
      from currencies as c
    ), '[]'::jsonb),
    'issued_count', (select count(*) from issued_in_period),
    'draft_count', (select count(*) from public.invoices where lifecycle_state = 'draft' and archived_at is null),
    'void_count_in_period', (select count(*) from public.invoices where lifecycle_state = 'void' and voided_at >= w.start_at and voided_at < w.end_at)
  ) into result;
  return result || jsonb_build_object('range', jsonb_build_object('from', range_from, 'to', range_to, 'days', w.day_count, 'bucket', w.bucket, 'timezone', w.tz));
end;
$$;
revoke all on function private.analytics_finance(date, date) from public, anon, authenticated;

create or replace function private.analytics_contractors(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  today date := private.business_today();
  ending_days integer := coalesce(private.operational_setting('assignment_ending_soon_days'), 14);
  result jsonb;
begin
  select * into w from private.analytics_window(range_from, range_to);
  with assignments as (
    select a.*, money.paid_amount, money.remaining_amount
    from public.contractor_assignments as a
    cross join lateral private.assignment_financials(a.id) as money
    where a.archived_at is null
  ),
  committed as (
    select * from assignments where status <> 'cancelled' and agreed_amount is not null
  )
  select jsonb_build_object(
    'active_contractors', (select count(distinct trade_partner_id) from assignments where status = 'active'),
    'contractor_partners', (select count(*) from public.trade_partners where archived_at is null and 'contractor' = any (capabilities)),
    'status_counts', (select coalesce(jsonb_object_agg(status, total), '{}'::jsonb) from (select status, count(*) as total from assignments group by status) as s),
    'active_assignments', (select count(*) from assignments where status = 'active'),
    'completed_in_period', (select count(*) from assignments where completed_at >= w.start_at and completed_at < w.end_at),
    'created_in_period', (select count(*) from assignments where created_at >= w.start_at and created_at < w.end_at),
    'ending_soon_window_days', ending_days,
    'ending_soon', (select count(*) from assignments where status = 'active' and end_date between today and today + ending_days),
    'finance_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'committed', committed, 'paid', paid, 'remaining', remaining,
        'assignment_count', assignment_count, 'paid_in_period', paid_in_period) order by currency)
      from (
        select c.currency, sum(c.agreed_amount)::numeric(14, 2) as committed, sum(c.paid_amount)::numeric(14, 2) as paid,
          sum(c.remaining_amount)::numeric(14, 2) as remaining, count(*) as assignment_count,
          coalesce((select sum(p.amount) from public.contractor_payments as p join public.contractor_assignments as a2 on a2.id = p.contractor_assignment_id
                    where a2.currency = c.currency and p.reversed_at is null and p.payment_date between range_from and range_to), 0)::numeric(14, 2) as paid_in_period
        from committed as c group by c.currency
      ) as f
    ), '[]'::jsonb),
    'performance', jsonb_build_object(
      'rated_count', (select count(*) from assignments where status = 'completed' and performance_rating is not null),
      'average_rating', (select round(avg(performance_rating)::numeric, 1) from assignments where status = 'completed' and performance_rating is not null),
      'awaiting_rating', (select count(*) from assignments where status = 'completed' and performance_rating is null),
      'top_rated', coalesce((
        select jsonb_agg(jsonb_build_object('partner_id', partner_id, 'display_name', display_name, 'average_rating', average_rating, 'rated_count', rated_count)
          order by average_rating desc, rated_count desc, display_name)
        from (
          select p.id as partner_id, p.display_name, round(avg(a.performance_rating)::numeric, 1) as average_rating, count(*) as rated_count
          from assignments as a join public.trade_partners as p on p.id = a.trade_partner_id
          where a.status = 'completed' and a.performance_rating is not null
          group by p.id, p.display_name order by 3 desc, 4 desc limit 5
        ) as t
      ), '[]'::jsonb)
    )
  ) into result;
  return result;
end;
$$;
revoke all on function private.analytics_contractors(date, date) from public, anon, authenticated;

create or replace function private.analytics_procurement(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  today date := private.business_today();
  po_days integer := coalesce(private.operational_setting('po_expected_soon_days'), 7);
  material_days integer := coalesce(private.operational_setting('material_required_soon_days'), 14);
  result jsonb;
begin
  select * into w from private.analytics_window(range_from, range_to);
  with orders as (
    select po.*, money.total, money.delivery_state, money.is_delayed, money.remaining_quantity
    from public.purchase_orders as po
    cross join lateral private.purchase_order_financials(po.id) as money
  ),
  issued as (select * from orders where lifecycle_state = 'issued'),
  issued_in_period as (select * from orders where lifecycle_state in ('issued', 'closed') and issued_at >= w.start_at and issued_at < w.end_at)
  select jsonb_build_object(
    'open_orders', (select count(*) from issued where remaining_quantity > 0),
    'delayed_orders', (select count(*) from issued where is_delayed),
    'expected_soon_window_days', po_days,
    'expected_soon', (select count(*) from issued where remaining_quantity > 0 and not is_delayed and expected_delivery_date between today and today + po_days),
    'issued_in_period', (select count(*) from issued_in_period),
    'closed_in_period', (select count(*) from orders where lifecycle_state = 'closed' and closed_at >= w.start_at and closed_at < w.end_at),
    'cancelled_in_period', (select count(*) from orders where lifecycle_state = 'cancelled' and cancelled_at >= w.start_at and cancelled_at < w.end_at),
    'receipts_in_period', (select count(*) from public.purchase_order_receipts where reversed_at is null and received_at between range_from and range_to),
    'receiving_states', (select coalesce(jsonb_object_agg(delivery_state, total), '{}'::jsonb) from (select delivery_state, count(*) as total from issued group by delivery_state) as s),
    'material_required_soon_window_days', material_days,
    'requirements_due_soon', (select count(*) from public.project_material_requirements where approval_state = 'approved' and required_by between today and today + material_days),
    'requirements_past_due', (select count(*) from public.project_material_requirements where approval_state = 'approved' and required_by < today),
    'value_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'ordered_value', ordered_value, 'order_count', order_count,
        'open_ordered_value', open_ordered_value, 'open_order_count', open_order_count) order by currency)
      from (
        select c.currency,
          (select coalesce(sum(total), 0)::numeric(14, 2) from issued_in_period as i where i.currency = c.currency) as ordered_value,
          (select count(*) from issued_in_period as i where i.currency = c.currency) as order_count,
          (select coalesce(sum(total), 0)::numeric(14, 2) from issued as i where i.currency = c.currency and i.remaining_quantity > 0) as open_ordered_value,
          (select count(*) from issued as i where i.currency = c.currency and i.remaining_quantity > 0) as open_order_count
        from (select distinct currency from issued union select distinct currency from issued_in_period) as c
      ) as v
    ), '[]'::jsonb),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'issued', issued, 'receipts', receipts) order by bucket)
      from (
        select bucket, sum(issued) as issued, sum(receipts) as receipts from (
          select private.analytics_bucket(issued_at, w.bucket) as bucket, 1 as issued, 0 as receipts from issued_in_period
          union all
          select private.analytics_bucket_day(received_at, w.bucket), 0, 1 from public.purchase_order_receipts
          where reversed_at is null and received_at between range_from and range_to
        ) as entries group by bucket
      ) as t
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function private.analytics_procurement(date, date) from public, anon, authenticated;

create or replace function private.analytics_website(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  site public.website_settings%rowtype;
  result jsonb;
begin
  select * into w from private.analytics_window(range_from, range_to);
  select * into site from public.website_settings where id = 1;
  with rows as (
    select * from public.website_analytics_daily where day between range_from and range_to
  )
  select jsonb_build_object(
    'first_party_enabled', site.first_party_analytics_enabled,
    'third_party_enabled', site.analytics_enabled,
    'third_party_provider', site.analytics_provider,
    'retention_days', site.analytics_retention_days,
    'page_views', (select coalesce(sum(hit_count), 0) from rows where event_type = 'page_view'),
    'interactions', (select coalesce(sum(hit_count), 0) from rows where event_type <> 'page_view'),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', bucket, 'page_views', page_views, 'interactions', interactions) order by bucket)
      from (select private.analytics_bucket_day(day, w.bucket) as bucket,
              sum(hit_count) filter (where event_type = 'page_view') as page_views,
              sum(hit_count) filter (where event_type <> 'page_view') as interactions
            from rows group by 1) as t
    ), '[]'::jsonb),
    'top_pages', coalesce((
      select jsonb_agg(jsonb_build_object('path_key', path_key, 'page_views', total) order by total desc, path_key)
      from (select path_key, sum(hit_count) as total from rows where event_type = 'page_view' group by path_key order by 2 desc limit 12) as t
    ), '[]'::jsonb),
    'service_views', coalesce((
      select jsonb_agg(jsonb_build_object('service_slug', dimension, 'views', views, 'enquiries', enquiries, 'qualified', qualified, 'won', won) order by views desc, dimension)
      from (
        select v.dimension, v.views,
          (select count(*) from public.leads as l where l.archived_at is null and l.service_key = v.dimension and l.submitted_at >= w.start_at and l.submitted_at < w.end_at) as enquiries,
          (select count(*) from public.leads as l where l.archived_at is null and l.service_key = v.dimension and l.submitted_at >= w.start_at and l.submitted_at < w.end_at and l.qualified_at is not null) as qualified,
          (select count(*) from public.leads as l where l.archived_at is null and l.service_key = v.dimension and l.submitted_at >= w.start_at and l.submitted_at < w.end_at and l.won_at is not null) as won
        from (select dimension, sum(hit_count) as views from rows where event_type = 'service_view' and dimension <> '' group by dimension) as v
      ) as s
    ), '[]'::jsonb),
    'case_study_views', coalesce((
      select jsonb_agg(jsonb_build_object('case_study_slug', dimension, 'views', total) order by total desc, dimension)
      from (select dimension, sum(hit_count) as total from rows where event_type = 'case_study_view' and dimension <> '' group by dimension order by 2 desc limit 12) as t
    ), '[]'::jsonb),
    'cta_clicks', coalesce((
      select jsonb_agg(jsonb_build_object('cta_key', dimension, 'clicks', total) order by total desc, dimension)
      from (select dimension, sum(hit_count) as total from rows where event_type = 'cta_click' group by dimension) as t
    ), '[]'::jsonb),
    'intake', jsonb_build_object(
      'project_intake_start', (select coalesce(sum(hit_count), 0) from rows where event_type = 'project_intake_start'),
      'project_intake_submit', (select coalesce(sum(hit_count), 0) from rows where event_type = 'project_intake_submit'),
      'service_enquiry_start', (select coalesce(sum(hit_count), 0) from rows where event_type = 'service_enquiry_start'),
      'service_enquiry_submit', (select coalesce(sum(hit_count), 0) from rows where event_type = 'service_enquiry_submit'),
      'contact_submit', (select coalesce(sum(hit_count), 0) from rows where event_type = 'contact_submit'),
      'material_enquiry_submit', (select coalesce(sum(hit_count), 0) from rows where event_type = 'material_enquiry_submit')
    ),
    'device_classes', (select coalesce(jsonb_object_agg(device_class, total), '{}'::jsonb)
      from (select device_class, sum(hit_count) as total from rows where event_type = 'page_view' group by device_class) as d)
  ) into result;
  return result || jsonb_build_object('range', jsonb_build_object('from', range_from, 'to', range_to, 'days', w.day_count, 'bucket', w.bucket, 'timezone', w.tz));
end;
$$;
revoke all on function private.analytics_website(date, date) from public, anon, authenticated;

-- Compact headline numbers for the executive period comparison.
create or replace function private.analytics_headline(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
begin
  select * into w from private.analytics_window(range_from, range_to);
  return jsonb_build_object(
    'new_leads', (select count(*) from public.leads where archived_at is null and submitted_at >= w.start_at and submitted_at < w.end_at),
    'won_leads', (select count(*) from public.leads where archived_at is null and status = 'won' and won_at >= w.start_at and won_at < w.end_at),
    'lost_leads', (select count(*) from public.leads where archived_at is null and status = 'lost' and lost_at >= w.start_at and lost_at < w.end_at),
    'projects_created', (select count(*) from public.operational_projects where archived_at is null and created_at >= w.start_at and created_at < w.end_at),
    'projects_completed', (select count(distinct h.project_id) from public.operational_project_status_history as h
      join public.operational_projects as p on p.id = h.project_id and p.archived_at is null
      where h.to_status = 'completed' and h.created_at >= w.start_at and h.created_at < w.end_at),
    'invoices_issued', (select count(*) from public.invoices where lifecycle_state = 'issued' and issued_at >= w.start_at and issued_at < w.end_at),
    'invoiced_by_currency', coalesce((select jsonb_object_agg(currency, total) from (
      select currency, sum(issued_total)::numeric(14, 2) as total from public.invoices
      where lifecycle_state = 'issued' and issued_at >= w.start_at and issued_at < w.end_at group by currency) as t), '{}'::jsonb),
    'collected_by_currency', coalesce((select jsonb_object_agg(currency, total) from (
      select invoice.currency, sum(payment.amount)::numeric(14, 2) as total
      from public.invoice_payments as payment join public.invoices as invoice on invoice.id = payment.invoice_id
      where payment.reversed_at is null and invoice.lifecycle_state = 'issued' and payment.payment_date between range_from and range_to
      group by invoice.currency) as t), '{}'::jsonb),
    'orders_issued', (select count(*) from public.purchase_orders where lifecycle_state in ('issued', 'closed') and issued_at >= w.start_at and issued_at < w.end_at),
    'page_views', (select coalesce(sum(hit_count), 0) from public.website_analytics_daily where event_type = 'page_view' and day between range_from and range_to)
  );
end;
$$;
revoke all on function private.analytics_headline(date, date) from public, anon, authenticated;

-- Removes only TOP-LEVEL null keys (jsonb_strip_nulls is recursive and would
-- erase legitimate nulls such as an undefined median inside a domain object).
create or replace function private.jsonb_strip_top_nulls(value jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce((select jsonb_object_agg(key, val) from jsonb_each(value) as e (key, val) where val <> 'null'::jsonb), '{}'::jsonb);
$$;
revoke all on function private.jsonb_strip_top_nulls(jsonb) from public, anon, authenticated;

-- Public facades: exact permission per domain; the server response omits
-- domains the actor may not read (never "fetch then hide").

create or replace function public.admin_analytics_leads(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('analytics.read') and private.has_permission('leads.read')) then
    raise exception using errcode = '42501', message = 'lead analytics are not authorized';
  end if;
  return private.analytics_leads(range_from, range_to);
end;
$$;
grant execute on function public.admin_analytics_leads(date, date) to authenticated;

create or replace function public.admin_analytics_projects(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('analytics.read') and private.has_permission('operations.projects.read')) then
    raise exception using errcode = '42501', message = 'project analytics are not authorized';
  end if;
  return private.analytics_projects(range_from, range_to);
end;
$$;
grant execute on function public.admin_analytics_projects(date, date) to authenticated;

create or replace function public.admin_analytics_finance(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('analytics.read') and private.has_permission('analytics.finance.read')) then
    raise exception using errcode = '42501', message = 'finance analytics are not authorized';
  end if;
  return private.analytics_finance(range_from, range_to);
end;
$$;
grant execute on function public.admin_analytics_finance(date, date) to authenticated;

create or replace function public.admin_analytics_delivery(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  can_contractors boolean := private.has_permission('partners.read');
  can_procurement boolean := private.has_permission('procurement.orders.read');
  w record;
begin
  if not private.has_permission('analytics.read') or not (can_contractors or can_procurement) then
    raise exception using errcode = '42501', message = 'delivery analytics are not authorized';
  end if;
  select * into w from private.analytics_window(range_from, range_to);
  return private.jsonb_strip_top_nulls(jsonb_build_object(
    'contractors', case when can_contractors then private.analytics_contractors(range_from, range_to) end,
    'procurement', case when can_procurement then private.analytics_procurement(range_from, range_to) end,
    'range', jsonb_build_object('from', range_from, 'to', range_to, 'days', w.day_count, 'bucket', w.bucket, 'timezone', w.tz)
  ));
end;
$$;
grant execute on function public.admin_analytics_delivery(date, date) to authenticated;

create or replace function public.admin_analytics_website(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('analytics.read') and private.has_permission('analytics.website.read')) then
    raise exception using errcode = '42501', message = 'website analytics are not authorized';
  end if;
  return private.analytics_website(range_from, range_to);
end;
$$;
grant execute on function public.admin_analytics_website(date, date) to authenticated;

create or replace function public.admin_analytics_overview(range_from date, range_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w record;
  previous_from date;
  previous_to date;
  can_leads boolean := private.has_permission('leads.read');
  can_projects boolean := private.has_permission('operations.projects.read');
  can_finance boolean := private.has_permission('analytics.finance.read');
  can_contractors boolean := private.has_permission('partners.read');
  can_procurement boolean := private.has_permission('procurement.orders.read');
  can_website boolean := private.has_permission('analytics.website.read');
  current_headline jsonb;
  previous_headline jsonb;
begin
  if not private.has_permission('analytics.read') then
    raise exception using errcode = '42501', message = 'analytics are not authorized';
  end if;
  select * into w from private.analytics_window(range_from, range_to);
  previous_to := range_from - 1;
  previous_from := previous_to - (range_to - range_from);
  current_headline := private.analytics_headline(range_from, range_to);
  previous_headline := private.analytics_headline(previous_from, previous_to);
  -- Comparison keys are pruned to the actor's domains.
  if not can_leads then
    current_headline := current_headline - 'new_leads' - 'won_leads' - 'lost_leads';
    previous_headline := previous_headline - 'new_leads' - 'won_leads' - 'lost_leads';
  end if;
  if not can_projects then
    current_headline := current_headline - 'projects_created' - 'projects_completed';
    previous_headline := previous_headline - 'projects_created' - 'projects_completed';
  end if;
  if not can_finance then
    current_headline := current_headline - 'invoices_issued' - 'invoiced_by_currency' - 'collected_by_currency';
    previous_headline := previous_headline - 'invoices_issued' - 'invoiced_by_currency' - 'collected_by_currency';
  end if;
  if not can_procurement then
    current_headline := current_headline - 'orders_issued';
    previous_headline := previous_headline - 'orders_issued';
  end if;
  if not can_website then
    current_headline := current_headline - 'page_views';
    previous_headline := previous_headline - 'page_views';
  end if;
  return private.jsonb_strip_top_nulls(jsonb_build_object(
    'range', jsonb_build_object('from', range_from, 'to', range_to, 'days', w.day_count, 'bucket', w.bucket, 'timezone', w.tz),
    'previous_range', jsonb_build_object('from', previous_from, 'to', previous_to),
    'headline', current_headline,
    'previous_headline', previous_headline,
    'leads', case when can_leads then private.analytics_leads(range_from, range_to) end,
    'projects', case when can_projects then private.analytics_projects(range_from, range_to) end,
    'finance', case when can_finance then private.analytics_finance(range_from, range_to) end,
    'contractors', case when can_contractors then private.analytics_contractors(range_from, range_to) end,
    'procurement', case when can_procurement then private.analytics_procurement(range_from, range_to) end,
    'website', case when can_website then private.analytics_website(range_from, range_to) end,
    'domains', jsonb_build_object('leads', can_leads, 'projects', can_projects, 'finance', can_finance,
      'contractors', can_contractors, 'procurement', can_procurement, 'website', can_website)
  ));
end;
$$;
grant execute on function public.admin_analytics_overview(date, date) to authenticated;

-- Supporting indexes for the analytics date ranges and stage history.
create index if not exists leads_first_contact_idx on public.leads (first_contact_at) where first_contact_at is not null;
create index if not exists leads_won_at_idx on public.leads (won_at) where won_at is not null;
create index if not exists leads_lost_at_idx on public.leads (lost_at) where lost_at is not null;
create index if not exists leads_operational_project_idx on public.leads (operational_project_id) where operational_project_id is not null;
create index if not exists lead_stage_history_to_status_idx on public.lead_stage_history (to_status, lead_id);
create index if not exists invoices_issued_at_idx on public.invoices (issued_at) where lifecycle_state = 'issued';
create index if not exists invoice_payments_date_idx on public.invoice_payments (payment_date) where reversed_at is null;
create index if not exists contractor_payments_date_idx on public.contractor_payments (payment_date) where reversed_at is null;
create index if not exists contractor_assignments_completed_idx on public.contractor_assignments (completed_at) where completed_at is not null;
create index if not exists purchase_orders_issued_at_idx on public.purchase_orders (issued_at) where issued_at is not null;
create index if not exists po_receipts_received_idx on public.purchase_order_receipts (received_at) where reversed_at is null;
create index if not exists operational_projects_created_idx on public.operational_projects (created_at);
create index if not exists operational_project_status_history_completed_idx on public.operational_project_status_history (created_at) where to_status = 'completed';
create index if not exists operational_project_phase_history_created_idx on public.operational_project_phase_history (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- Website analytics: recording (server credential only)
-- ---------------------------------------------------------------------

-- Canonical public route keys only. Query strings and fragments are dropped,
-- private/admin/document/API paths are rejected, slugs are bounded. Returns
-- null for anything else (the event is discarded, never stored).
create or replace function private.website_path_key(raw_path text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  path text;
begin
  if raw_path is null then return null; end if;
  path := lower(split_part(split_part(raw_path, '?', 1), '#', 1));
  if path = '' then return null; end if;
  if length(path) > 1 and right(path, 1) = '/' then path := left(path, -1); end if;
  if path = '/' then return '/'; end if;
  if path ~ '^/(admin|api|i|po|_next|auth)(/|$)' then return null; end if;
  if path in ('/services', '/projects', '/about', '/contact', '/start-a-project', '/start-a-project/success',
              '/enquire/service', '/enquire/materials', '/insights', '/expertise', '/privacy', '/terms', '/cookies') then
    return path;
  end if;
  if path ~ '^/(services|projects|insights|expertise)/[a-z0-9-]{1,80}$' then
    return path;
  end if;
  return null;
end;
$$;
revoke all on function private.website_path_key(text) from public, anon, authenticated;

create or replace function private.website_analytics_increment(
  target_day date, target_event text, target_path text, target_dimension text, target_device text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.website_analytics_daily as d (day, event_type, path_key, dimension, device_class, hit_count)
  values (target_day, target_event, target_path, coalesce(target_dimension, ''), coalesce(target_device, 'unknown'), 1)
  on conflict (day, event_type, path_key, dimension, device_class)
  do update set hit_count = d.hit_count + 1, updated_at = now();
$$;
revoke all on function private.website_analytics_increment(date, text, text, text, text) from public, anon, authenticated;

create or replace function private.purge_website_analytics()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  retention integer := coalesce((select analytics_retention_days from public.website_settings where id = 1), 400);
  removed integer;
begin
  delete from public.website_analytics_daily where day < private.business_today() - retention;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function private.purge_website_analytics() from public, anon, authenticated;

-- Fixed vocabulary, bounded dimensions, at most 20 events per call. Anything
-- outside the vocabulary is counted as rejected and dropped.
create or replace function public.website_analytics_record(events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  site public.website_settings%rowtype;
  today date := private.business_today();
  entry jsonb;
  event_type text;
  path_key text;
  dimension text;
  device text;
  accepted integer := 0;
  rejected integer := 0;
begin
  select * into site from public.website_settings where id = 1;
  if not site.first_party_analytics_enabled then
    return jsonb_build_object('ok', true, 'accepted', 0, 'rejected', 0, 'disabled', true);
  end if;
  if events is null or jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 20 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_request');
  end if;
  for entry in select * from jsonb_array_elements(events) loop
    event_type := entry ->> 't';
    path_key := private.website_path_key(entry ->> 'p');
    dimension := coalesce(entry ->> 'd', '');
    device := coalesce(entry ->> 'dc', 'unknown');
    if event_type is null or event_type not in (
      'page_view', 'cta_click', 'service_view', 'service_enquiry_start', 'project_intake_start', 'case_study_view'
    ) or path_key is null or dimension !~ '^[a-z0-9_-]{0,80}$' or device not in ('mobile', 'tablet', 'desktop', 'unknown') then
      rejected := rejected + 1;
      continue;
    end if;
    -- Dimension rules: cta keys are a fixed set; service/case study slugs must match the path.
    if event_type = 'cta_click' and dimension not in ('start_project', 'whatsapp', 'email', 'service_enquiry', 'view_project', 'contact', 'material_enquiry') then
      rejected := rejected + 1; continue;
    end if;
    if event_type = 'service_view' and (path_key !~ '^/services/' or dimension <> split_part(path_key, '/', 3)) then
      rejected := rejected + 1; continue;
    end if;
    if event_type = 'case_study_view' and (path_key !~ '^/projects/' or dimension <> split_part(path_key, '/', 3)) then
      rejected := rejected + 1; continue;
    end if;
    if event_type in ('page_view', 'project_intake_start', 'service_enquiry_start') and dimension <> ''
       and not (event_type = 'service_enquiry_start' and dimension ~ '^[a-z0-9_-]{1,40}$') then
      dimension := '';
    end if;
    perform private.website_analytics_increment(today, event_type, path_key, dimension, device);
    accepted := accepted + 1;
  end loop;
  perform private.purge_website_analytics();
  return jsonb_build_object('ok', true, 'accepted', accepted, 'rejected', rejected);
end;
$$;
revoke all on function public.website_analytics_record(jsonb) from public, anon, authenticated;
grant execute on function public.website_analytics_record(jsonb) to service_role;

-- Submission events are tied to the real C8 lead insert (never double counted
-- from the browser). Counted only while first-party analytics is enabled.
create or replace function private.record_lead_submission_analytics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((select first_party_analytics_enabled from public.website_settings where id = 1), false) then
    return null;
  end if;
  if new.source_channel = 'website_contact' then
    perform private.website_analytics_increment(private.business_today(), 'contact_submit', '/contact', '', 'unknown');
  elsif new.source_channel = 'start_a_project' then
    perform private.website_analytics_increment(private.business_today(), 'project_intake_submit', '/start-a-project', coalesce(new.service_key, ''), 'unknown');
  elsif new.source_channel = 'service_page' then
    perform private.website_analytics_increment(private.business_today(), 'service_enquiry_submit', '/enquire/service', coalesce(new.service_key, ''), 'unknown');
  elsif new.source_channel = 'material_enquiry' then
    perform private.website_analytics_increment(private.business_today(), 'material_enquiry_submit', '/enquire/materials', '', 'unknown');
  end if;
  return null;
end;
$$;
drop trigger if exists leads_record_submission_analytics on public.leads;
create trigger leads_record_submission_analytics after insert on public.leads
for each row execute function private.record_lead_submission_analytics();

-- ---------------------------------------------------------------------
-- Settings: website analytics configuration (extends the C7 facade)
-- ---------------------------------------------------------------------

drop function if exists public.update_website_settings(integer, text, text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean);

create or replace function public.update_website_settings(
  expected_version integer, target_homepage_cta_label text, target_homepage_cta_route text,
  target_canonical_base_url text default null, target_secondary_cta_label text default null, target_secondary_cta_route text default null,
  target_footer_statement text default null, target_contact_intro text default null, target_service_area_wording text default null,
  target_company_summary text default null, target_announcement_text text default null, target_announcement_active boolean default false,
  target_analytics_enabled boolean default false, target_analytics_provider text default null, target_consent_required boolean default false,
  target_first_party_analytics_enabled boolean default false, target_analytics_site_id text default null, target_analytics_retention_days integer default 400
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_version integer;
  previous public.website_settings%rowtype;
  provider text := nullif(btrim(coalesce(target_analytics_provider, '')), '');
  site_id text := nullif(btrim(coalesce(target_analytics_site_id, '')), '');
begin
  if not private.has_permission('settings.website.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'settings.website.write is required.')));
  end if;
  select * into previous from public.website_settings where id = 1 for update;
  current_version := previous.version;
  if current_version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current_version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'Another staff member changed the website settings first.')));
  end if;
  if target_homepage_cta_route not in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')
     or (target_secondary_cta_route is not null and target_secondary_cta_route not in ('services', 'projects', 'about', 'insights', 'contact', 'start-a-project')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'homepage_cta_route', 'Choose an approved destination.')));
  end if;
  if target_canonical_base_url is not null and btrim(target_canonical_base_url) <> '' and btrim(target_canonical_base_url) !~ '^https?://[^/\s]+$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'canonical_base_url', 'Use an origin like https://www.example.com (no path).')));
  end if;
  if provider is not null and provider not in ('none', 'plausible', 'umami', 'ga4', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_provider', 'Choose an admitted provider.')));
  end if;
  if target_analytics_enabled and (provider is null or provider = 'none') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_provider', 'Choose a third-party provider before enabling it, or leave third-party analytics off.')));
  end if;
  if site_id is not null and site_id !~ '^[A-Za-z0-9._:/-]{1,200}$' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_site_id', 'The provider site id may only contain letters, digits, dots, colons, slashes, underscores and hyphens.')));
  end if;
  if target_analytics_retention_days is null or target_analytics_retention_days not between 30 and 1100 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'analytics_retention_days', 'Retention must be between 30 and 1100 days.')));
  end if;
  begin
    update public.website_settings
       set canonical_base_url = nullif(btrim(target_canonical_base_url), ''), homepage_cta_label = btrim(target_homepage_cta_label),
           homepage_cta_route = target_homepage_cta_route, secondary_cta_label = nullif(btrim(target_secondary_cta_label), ''),
           secondary_cta_route = target_secondary_cta_route, footer_statement = nullif(btrim(target_footer_statement), ''),
           contact_intro = nullif(btrim(target_contact_intro), ''), service_area_wording = nullif(btrim(target_service_area_wording), ''),
           company_summary = nullif(btrim(target_company_summary), ''), announcement_text = nullif(btrim(target_announcement_text), ''),
           announcement_active = target_announcement_active and nullif(btrim(target_announcement_text), '') is not null,
           analytics_enabled = target_analytics_enabled, analytics_provider = provider,
           -- A cookie-setting provider (GA4 / unknown "other") always requires consent; the owner may require it for any provider.
           consent_required = target_consent_required or (target_analytics_enabled and provider in ('ga4', 'other')),
           first_party_analytics_enabled = target_first_party_analytics_enabled,
           analytics_site_id = site_id, analytics_retention_days = target_analytics_retention_days,
           updated_by = auth.uid(), version = version + 1
     where id = 1;
  exception when check_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'website', 'A website field is not admitted: ' || sqlerrm)));
  end;
  perform private.s4_audit('website_settings.update', 'settings', 'website_settings', 'success',
    jsonb_build_object('version', expected_version + 1, 'analytics_enabled', target_analytics_enabled,
      'first_party_analytics_enabled', target_first_party_analytics_enabled, 'analytics_provider', provider));
  if previous.first_party_analytics_enabled is distinct from target_first_party_analytics_enabled
     or previous.analytics_enabled is distinct from target_analytics_enabled
     or previous.analytics_provider is distinct from provider
     or previous.analytics_site_id is distinct from site_id
     or previous.analytics_retention_days is distinct from target_analytics_retention_days
     or previous.consent_required is distinct from (target_consent_required or (target_analytics_enabled and provider in ('ga4', 'other'))) then
    perform private.s4_audit('analytics.settings_update', 'settings', 'website_settings', 'success',
      jsonb_build_object('first_party', target_first_party_analytics_enabled, 'third_party', target_analytics_enabled,
        'provider', provider, 'consent_required', target_consent_required or (target_analytics_enabled and provider in ('ga4', 'other')),
        'retention_days', target_analytics_retention_days));
  end if;
  perform private.settings_touch('website', 'updated');
  return jsonb_build_object('ok', true, 'version', expected_version + 1);
end;
$$;
grant execute on function public.update_website_settings(integer, text, text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean, boolean, text, integer) to authenticated;

-- Public projection now carries the analytics mode (public values only).
create or replace function private.build_public_configuration()
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
  whatsapp_value text;
begin
  select * into profile from public.business_profile where id = 1;
  select * into location from public.business_location where id = 1;
  select * into site from public.website_settings where id = 1;
  select * into brand from public.brand_media_settings where id = 1;
  select * into seo from public.seo_settings where id = 1;
  select value into whatsapp_value from public.contact_channels
   where channel_type = 'whatsapp' and is_public and active order by sort_order, created_at limit 1;
  return jsonb_strip_nulls(jsonb_build_object(
    'business', jsonb_build_object(
      'display_name', profile.display_name, 'legal_name', profile.legal_name, 'short_name', profile.short_name,
      'description', profile.public_description, 'tagline', profile.tagline, 'primary_email', profile.primary_email,
      'website_url', profile.website_url, 'timezone', profile.timezone, 'default_locale', profile.default_locale,
      'country', profile.country, 'region', profile.region, 'mission', profile.mission_text,
      'approach', profile.approach_text, 'service_area', profile.service_area_text,
      'credentials', profile.public_credentials_text
    ),
    'contact', jsonb_build_object(
      'primary_email', profile.primary_email,
      'whatsapp_digits', private.whatsapp_digits(whatsapp_value),
      'channels', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id, 'type', c.channel_type, 'label', c.label, 'value', c.value,
          'href', private.contact_channel_href(c.channel_type, c.value, c.calling_enabled),
          'calling_enabled', c.channel_type in ('whatsapp', 'phone') and c.calling_enabled,
          'sort_order', c.sort_order
        ) order by c.sort_order, c.created_at)
        from public.contact_channels as c where c.is_public and c.active
      ), '[]'::jsonb)
    ),
    'location', case when location.publish_location and (location.street_address is not null or location.city is not null or location.maps_url is not null) then
      jsonb_build_object(
        'name', location.public_name, 'street', location.street_address, 'city', location.city, 'region', location.region,
        'country', location.country, 'postal_code', location.postal_code, 'latitude', location.latitude, 'longitude', location.longitude,
        'maps_url', location.maps_url, 'directions_url', location.directions_url, 'service_area', location.service_area_text
      ) else null end,
    'hours', case when exists (select 1 from public.business_hours where is_open) then (
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'is_open', h.is_open,
        'opens_at', to_char(h.opens_at, 'HH24:MI'), 'closes_at', to_char(h.closes_at, 'HH24:MI')) order by h.weekday)
      from public.business_hours as h) else null end,
    'social', coalesce((
      select jsonb_agg(jsonb_build_object('platform', s.platform, 'label', s.label, 'url', s.url, 'sort_order', s.sort_order) order by s.sort_order, s.created_at)
      from public.social_links as s where s.active), '[]'::jsonb),
    'website', jsonb_build_object(
      'canonical_base_url', site.canonical_base_url,
      'homepage_cta_label', site.homepage_cta_label, 'homepage_cta_route', site.homepage_cta_route,
      'secondary_cta_label', site.secondary_cta_label, 'secondary_cta_route', site.secondary_cta_route,
      'footer_statement', site.footer_statement, 'contact_intro', site.contact_intro,
      'service_area_wording', site.service_area_wording, 'company_summary', site.company_summary,
      'announcement', case when site.announcement_active then site.announcement_text end,
      'analytics_enabled', site.analytics_enabled, 'analytics_provider', site.analytics_provider,
      'consent_required', site.consent_required,
      'first_party_analytics_enabled', site.first_party_analytics_enabled,
      'analytics_site_id', case when site.analytics_enabled then site.analytics_site_id end
    ),
    'navigation', coalesce((
      select jsonb_agg(jsonb_build_object('route_key', n.route_key, 'label', n.label_override, 'visible', n.visible, 'sort_order', n.sort_order) order by n.sort_order, n.route_key)
      from public.navigation_settings as n), '[]'::jsonb),
    'brand', jsonb_build_object(
      'primary_logo', private.brand_media_public(brand.primary_logo_media_id),
      'reversed_logo', private.brand_media_public(brand.reversed_logo_media_id),
      'favicon', private.brand_media_public(brand.favicon_media_id),
      'default_og', private.brand_media_public(brand.default_og_media_id),
      'default_share', private.brand_media_public(brand.default_share_media_id),
      'default_hero', private.brand_media_public(brand.default_hero_media_id),
      'document_logo', private.brand_media_public(brand.document_logo_media_id)
    ),
    'seo', jsonb_build_object(
      'site_name', seo.site_name, 'title_template', seo.title_template, 'meta_description', seo.meta_description,
      'organization_name', coalesce(seo.organization_name, profile.display_name),
      'organization_url', coalesce(seo.organization_url, site.canonical_base_url)
    )
  ));
end;
$$;
revoke all on function private.build_public_configuration() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Launch readiness: analytics configuration, privacy sync, consent mode,
-- notification sweep scheduler status (C8 body retained).
-- ---------------------------------------------------------------------

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
  privacy_covers_analytics boolean;
  cookies_cover_analytics boolean;
  any_analytics boolean;
  last_sweep timestamptz;
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
  privacy_covers_analytics := exists (select 1 from public.legal_pages where slug = 'privacy' and published_body ilike '%website analytics%');
  cookies_cover_analytics := exists (select 1 from public.legal_pages where slug = 'cookies' and published_body ilike '%analytics%' and published_body not ilike '%sets no analytics%');
  terms_published := exists (select 1 from public.legal_pages where slug = 'terms' and published_body is not null);
  unpublished_drafts := cfg = '{}'::jsonb or private.build_public_configuration() is distinct from (cfg - 'published_at' - 'snapshot_id');
  any_analytics := site.first_party_analytics_enabled or site.analytics_enabled;
  select max(finished_at) into last_sweep from public.notification_sweep_runs where finished_at is not null;

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
    || jsonb_build_object('key', 'analytics_configuration', 'label', 'Website analytics configuration', 'classification', case when any_analytics then 'required' else 'optional' end,
         'state', case
           when not any_analytics then 'ready'
           when site.analytics_enabled and (site.analytics_provider is null or site.analytics_provider = 'none') then 'blocked'
           when site.analytics_enabled and site.analytics_site_id is null then 'warning'
           when site.analytics_enabled and site.analytics_provider = 'other' then 'warning'
           else 'ready' end,
         'detail', case
           when not any_analytics then 'No visitor analytics run; nothing is collected and no consent prompt is shown.'
           when site.analytics_enabled and (site.analytics_provider is null or site.analytics_provider = 'none') then 'Third-party analytics is enabled without a provider.'
           when site.analytics_enabled and site.analytics_site_id is null then 'Third-party analytics is enabled but no provider site id is configured; the provider script will not load.'
           when site.analytics_enabled and site.analytics_provider = 'other' then 'Provider "other" has no adapter; only first-party aggregates run.'
           when site.first_party_analytics_enabled and not site.analytics_enabled then 'First-party aggregate analytics only (daily counters, no identifiers, no cookies).'
           else 'First-party aggregates' || case when site.first_party_analytics_enabled then ' and ' else ' off; ' end || site.analytics_provider || ' provider configured.' end)
    || jsonb_build_object('key', 'analytics_privacy', 'label', 'Published privacy notice describes website analytics', 'classification', case when any_analytics then 'required' else 'info' end,
         'state', case when not any_analytics then 'ready' when privacy_covers_analytics then 'ready' else 'blocked' end,
         'detail', case when not any_analytics then null when privacy_covers_analytics then null
           else 'Analytics is enabled but the published privacy notice does not describe it. Review and publish the C9 privacy DRAFT (section "Website analytics").' end)
    || jsonb_build_object('key', 'consent_mode', 'label', 'Consent mode', 'classification', case when site.analytics_enabled then 'required' else 'info' end,
         'state', case
           when site.analytics_enabled and site.analytics_provider in ('ga4', 'other') and not site.consent_required then 'blocked'
           when site.analytics_enabled and site.consent_required and not cookies_cover_analytics then 'warning'
           else 'ready' end,
         'detail', case
           when site.analytics_enabled and site.analytics_provider in ('ga4', 'other') and not site.consent_required then 'A cookie-setting provider requires consent before it loads.'
           when site.analytics_enabled and site.consent_required and not cookies_cover_analytics then 'Consent is required but the published cookie notice does not describe the analytics cookies. Publish the C9 cookie DRAFT.'
           when site.analytics_enabled and site.consent_required then 'The provider loads only after the visitor accepts analytics; Accept and Reject are equally prominent.'
           when site.analytics_enabled then 'Cookieless provider; no consent prompt is shown.'
           else 'No third-party analytics; no consent prompt is shown.' end)
    || jsonb_build_object('key', 'notification_sweep', 'label', 'Timed notification sweep scheduler', 'classification', 'recommended',
         'state', case when last_sweep >= now() - interval '26 hours' then 'ready' else 'warning' end,
         'detail', case when last_sweep >= now() - interval '26 hours' then 'Last sweep finished ' || to_char(last_sweep at time zone private.business_timezone(), 'YYYY-MM-DD HH24:MI') || ' (' || private.business_timezone() || ').'
           else 'Timed notification sweep scheduler not configured: overdue, due-soon, delayed and stale alerts only appear when pnpm notifications:sweep (or the task endpoint) runs. Wired in C10/Release.' end);
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
-- Privacy / cookie DRAFT revisions describing the analytics actually
-- implemented (never auto-published).
-- ---------------------------------------------------------------------

update public.legal_pages
   set draft_body = E'DRAFT — starter text prepared from the actual behaviour of this application. It is not legal advice and must be reviewed and published by the RENZ owner before it appears publicly.\n\n## What this website collects\n\n- Public pages can be read without an account. No session replay runs.\n- Contact happens by email or WhatsApp on the visitor''s own device; the website itself does not send messages.\n\n## Website analytics\n\nWhen RENZ turns on first-party website analytics, the website counts page views and a few interactions (for example a click on "Start a Project" or opening a service page) as daily totals. These counters contain no name, email address, phone number, IP address, device identifier or browsing history; the website sets no analytics cookie and does not build a profile of you. Page views are site events, not a count of individual people. Daily totals are kept for a bounded period and then deleted.\n\nIf RENZ additionally enables a third-party analytics provider, that provider is named in the Cookie Notice and, where it sets cookies or identifiers, it loads only after you accept analytics in the consent prompt. Rejecting analytics never limits the website.\n\n## Enquiries and project submissions\n\nThe Contact form, Service enquiries, the Start-a-Project intake and Material enquiries are stored so RENZ staff can respond. RENZ keeps the details you enter (your name, email address and/or phone or WhatsApp number, company, location and the description of what you need), the time of submission, the reference number shown to you and the version of this notice you acknowledged. Supporting files you attach (photos, sketches, drawings or PDF briefs) are stored privately, reviewed by RENZ staff before use and are never published on the website. Submissions are used only to review, respond to and, if you engage RENZ, deliver the work; they may be linked to a client record and a project record inside RENZ''s private operating system. Staff access is restricted and logged.\n\n## Protecting the forms\n\nTo limit abuse the forms and the analytics endpoint apply rate limits and automated-submission checks. For that purpose a one-way hash derived from your network address is kept for a short period; your address itself is not stored with your enquiry or with any analytics total.\n\n## Secure document links\n\nRENZ may send clients a private invoice link and suppliers a private purchase order link. Anyone holding a link can view that one document; links can be revoked by RENZ.\n\n## Staff access\n\nStaff sign in with a password and a second factor. Security-relevant staff actions are logged.\n\n## Cookies and local storage\n\nThe public website sets no tracking cookies. If a consent prompt is shown, your choice is remembered in your browser''s local storage so you are not asked again. The staff area uses session cookies required to stay signed in.\n\n## Contact\n\nQuestions about this notice, or requests to review or remove an enquiry you sent, can be sent to the public RENZ email address shown on the Contact page.',
       version = version + 1
 where slug = 'privacy' and draft_is_starter;

update public.legal_pages
   set draft_body = draft_body || E'\n\n## Website analytics (C9 draft addendum — review before publishing)\n\nWhen first-party website analytics is on, the website counts page views and a few interactions as daily totals with no name, email, phone, IP address, device identifier or cookie; page views are site events, not individual people, and totals are deleted after a bounded period. If a third-party analytics provider is enabled it is named in the Cookie Notice and, where it sets cookies, loads only after you accept analytics; rejecting never limits the website.',
       version = version + 1
 where slug = 'privacy' and not draft_is_starter
   and draft_body not ilike '%website analytics%';

update public.legal_pages
   set draft_body = E'DRAFT — starter text. The public website sets no advertising cookies and no analytics cookie of its own. First-party analytics, when enabled, counts page views as daily totals without cookies or identifiers. If a third-party analytics provider that uses cookies is enabled, it is named here, it loads only after you choose "Accept analytics" in the consent prompt, and your choice (accept or reject) is stored in your browser''s local storage so you are not asked again; you can change it from the Cookie Notice at any time. The staff area uses strictly necessary session cookies.',
       version = version + 1
 where slug = 'cookies' and draft_is_starter;

