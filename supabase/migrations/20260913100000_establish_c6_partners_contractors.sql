-- =====================================================================
-- C6 (part 1) — TRADE PARTNERS + CONTRACTOR ASSIGNMENTS + CONTRACTOR FINANCE
--
-- One external business identity (`trade_partners`) carries capabilities
-- (`contractor`, `supplier`, or both); the Admin presents Contractors and
-- Suppliers as filtered views of the same register. Contractor work on a
-- project is a `contractor_assignments` row (many-to-many); contractor
-- money is `contractor_payments` — append-only, reversal-flagged, exactly
-- the C5 client-payment discipline, but a separate domain: a contractor
-- payment is money RENZ pays out, never a client receivable.
--
-- Forward-only. Default-deny RLS; SECURITY DEFINER facades are the only
-- access path. Money is numeric; different currencies are never summed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permissions (narrow; admin holds day-to-day delivery operations)
-- ---------------------------------------------------------------------

insert into public.permissions (key, display_name, description, is_system)
values
  ('partners.read', 'Read trade partners', 'Read contractors, suppliers, assignments, and contractor finance.', true),
  ('partners.write', 'Manage trade partners', 'Create, update, archive trade partners and change capabilities.', true),
  ('contractors.assign', 'Assign contractors', 'Create and manage contractor assignments, status, rating, and agreed-amount adjustments.', true),
  ('contractors.payments.write', 'Record contractor payments', 'Record and reverse contractor payments.', true),
  ('procurement.materials.read', 'Read materials', 'Read the material catalog and project material requirements.', true),
  ('procurement.materials.write', 'Manage materials', 'Create and update materials and project material requirements.', true),
  ('procurement.orders.read', 'Read purchase orders', 'Read purchase orders, deliveries, and procurement summaries.', true),
  ('procurement.orders.write', 'Manage purchase orders', 'Create, edit, cancel, close, and share purchase orders.', true),
  ('procurement.orders.issue', 'Issue purchase orders', 'Issue a purchase order with an official number and frozen snapshots.', true),
  ('procurement.receipts.write', 'Record goods receipts', 'Record and reverse goods receipts against issued purchase orders.', true)
on conflict (key) do update
set display_name = excluded.display_name, description = excluded.description, is_system = true;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'partners.read', 'partners.write', 'contractors.assign', 'contractors.payments.write',
  'procurement.materials.read', 'procurement.materials.write', 'procurement.orders.read',
  'procurement.orders.write', 'procurement.orders.issue', 'procurement.receipts.write'
)
where roles.key in ('admin', 'super_admin')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.trade_partners (
  id uuid primary key default gen_random_uuid(),
  capabilities text[] not null,
  display_name text not null,
  company_name text,
  contact_name text,
  email text,
  email_normalized text,
  phone_display text,
  phone_normalized text,
  address text,
  notes text,
  specializations text[] not null default '{}',
  availability_status text not null default 'available',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint trade_partners_capabilities_check
    check (cardinality(capabilities) >= 1 and capabilities <@ array['contractor', 'supplier']::text[]),
  constraint trade_partners_display_name_check check (btrim(display_name) <> '' and char_length(display_name) <= 200),
  constraint trade_partners_company_check check (company_name is null or char_length(company_name) <= 200),
  constraint trade_partners_contact_check check (contact_name is null or char_length(contact_name) <= 200),
  constraint trade_partners_email_check check (email is null or char_length(email) <= 254),
  constraint trade_partners_phone_check check (phone_display is null or char_length(phone_display) <= 40),
  constraint trade_partners_address_check check (address is null or char_length(address) <= 400),
  constraint trade_partners_notes_check check (notes is null or char_length(notes) <= 4000),
  constraint trade_partners_specializations_check check (cardinality(specializations) <= 20),
  constraint trade_partners_availability_check check (availability_status in ('available', 'busy', 'unavailable')),
  constraint trade_partners_version_check check (version > 0)
);

create index trade_partners_updated_idx on public.trade_partners (updated_at desc, id desc);
create index trade_partners_capabilities_idx on public.trade_partners using gin (capabilities);
create index trade_partners_email_idx on public.trade_partners (email_normalized) where email_normalized is not null;
create index trade_partners_phone_idx on public.trade_partners (phone_normalized) where phone_normalized is not null;
create index trade_partners_created_by_idx on public.trade_partners (created_by);
create index trade_partners_updated_by_idx on public.trade_partners (updated_by);

create table public.contractor_assignments (
  id uuid primary key default gen_random_uuid(),
  operational_project_id uuid not null references public.operational_projects (id) on delete restrict,
  trade_partner_id uuid not null references public.trade_partners (id) on delete restrict,
  scope text not null,
  specialization text,
  status text not null default 'planned',
  start_date date,
  end_date date,
  rate_type text,
  rate_amount numeric(14, 2),
  currency text,
  planned_units numeric(12, 3),
  agreed_amount numeric(14, 2),
  payment_terms text,
  performance_rating integer,
  performance_note text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint contractor_assignments_scope_check check (btrim(scope) <> '' and char_length(scope) <= 500),
  constraint contractor_assignments_specialization_check check (specialization is null or char_length(specialization) <= 80),
  constraint contractor_assignments_status_check check (status in ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
  constraint contractor_assignments_dates_check check (start_date is null or end_date is null or end_date >= start_date),
  constraint contractor_assignments_rate_type_check check (rate_type is null or rate_type in ('fixed_project', 'hourly', 'daily', 'monthly')),
  constraint contractor_assignments_rate_amount_check check (rate_amount is null or rate_amount >= 0),
  constraint contractor_assignments_rate_pair_check check (rate_amount is null or rate_type is not null),
  constraint contractor_assignments_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint contractor_assignments_currency_required_check
    check ((rate_amount is null and agreed_amount is null) or currency is not null),
  constraint contractor_assignments_planned_units_check check (planned_units is null or planned_units > 0),
  constraint contractor_assignments_agreed_check check (agreed_amount is null or agreed_amount >= 0),
  constraint contractor_assignments_terms_check check (payment_terms is null or char_length(payment_terms) <= 2000),
  constraint contractor_assignments_rating_check check (performance_rating is null or performance_rating between 1 and 5),
  constraint contractor_assignments_note_check check (performance_note is null or char_length(performance_note) <= 2000),
  constraint contractor_assignments_rating_completed_check check (performance_rating is null or status = 'completed'),
  constraint contractor_assignments_version_check check (version > 0)
);

create index contractor_assignments_project_idx on public.contractor_assignments (operational_project_id);
create index contractor_assignments_partner_idx on public.contractor_assignments (trade_partner_id);
create index contractor_assignments_status_idx on public.contractor_assignments (status);
create index contractor_assignments_updated_idx on public.contractor_assignments (updated_at desc, id desc);
create index contractor_assignments_end_idx on public.contractor_assignments (end_date) where end_date is not null;
create index contractor_assignments_created_by_idx on public.contractor_assignments (created_by);
create index contractor_assignments_updated_by_idx on public.contractor_assignments (updated_by);

create table public.contractor_payments (
  id uuid primary key default gen_random_uuid(),
  contractor_assignment_id uuid not null references public.contractor_assignments (id) on delete restrict,
  amount numeric(14, 2) not null,
  payment_date date not null,
  payment_method text not null,
  reference text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles (id) on delete set null,
  reversal_reason text,
  constraint contractor_payments_amount_check check (amount > 0),
  constraint contractor_payments_method_check
    check (payment_method in ('bank_transfer', 'cash', 'mobile_money', 'card', 'cheque', 'other')),
  constraint contractor_payments_reference_check check (reference is null or char_length(reference) <= 120),
  constraint contractor_payments_note_check check (note is null or char_length(note) <= 2000),
  constraint contractor_payments_reversal_shape_check check (
    (reversed_at is null and reversal_reason is null)
    or (reversed_at is not null and reversal_reason is not null and btrim(reversal_reason) <> '')
  )
);

create index contractor_payments_assignment_idx on public.contractor_payments (contractor_assignment_id, payment_date desc);
create index contractor_payments_created_by_idx on public.contractor_payments (created_by);
create index contractor_payments_reversed_by_idx on public.contractor_payments (reversed_by);

-- Explicit, audited history of agreed-amount changes after money has moved.
create table public.contractor_assignment_adjustments (
  id uuid primary key default gen_random_uuid(),
  contractor_assignment_id uuid not null references public.contractor_assignments (id) on delete restrict,
  previous_amount numeric(14, 2),
  new_amount numeric(14, 2) not null,
  reason text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contractor_assignment_adjustments_reason_check check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint contractor_assignment_adjustments_amount_check check (new_amount >= 0)
);

create index contractor_assignment_adjustments_assignment_idx
  on public.contractor_assignment_adjustments (contractor_assignment_id, created_at desc);
create index contractor_assignment_adjustments_created_by_idx on public.contractor_assignment_adjustments (created_by);

-- ---------------------------------------------------------------------
-- Realtime vocabulary
-- ---------------------------------------------------------------------

alter table public.realtime_events drop constraint realtime_events_entity_type_check;
alter table public.realtime_events
  add constraint realtime_events_entity_type_check
  check (entity_type in (
    'client', 'operational_project', 'invoice',
    'trade_partner', 'contractor_assignment', 'material', 'material_requirement', 'purchase_order'
  ));
alter table public.realtime_events drop constraint realtime_events_action_check;
alter table public.realtime_events
  add constraint realtime_events_action_check
  check (action in (
    'created', 'updated', 'status_changed', 'phase_changed', 'priority_changed',
    'case_study_linked', 'case_study_unlinked', 'archived', 'note_created',
    'issued', 'voided', 'payment_recorded', 'payment_reversed', 'share_created', 'share_revoked',
    'capability_changed', 'adjusted', 'rated', 'approved', 'cancelled', 'closed',
    'receipt_recorded', 'receipt_reversed'
  ));

-- ---------------------------------------------------------------------
-- RLS default deny
-- ---------------------------------------------------------------------

alter table public.trade_partners enable row level security;
alter table public.contractor_assignments enable row level security;
alter table public.contractor_payments enable row level security;
alter table public.contractor_assignment_adjustments enable row level security;
revoke all on public.trade_partners from public, anon, authenticated;
revoke all on public.contractor_assignments from public, anon, authenticated;
revoke all on public.contractor_payments from public, anon, authenticated;
revoke all on public.contractor_assignment_adjustments from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------

create or replace function private.enforce_contractor_payment_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'contractor payments are never deleted; reverse them';
  end if;
  if new.contractor_assignment_id is distinct from old.contractor_assignment_id
    or new.amount is distinct from old.amount
    or new.payment_date is distinct from old.payment_date
    or new.payment_method is distinct from old.payment_method
    or new.reference is distinct from old.reference
    or new.note is distinct from old.note
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or (old.reversed_at is not null and (
      new.reversed_at is distinct from old.reversed_at
      or new.reversed_by is distinct from old.reversed_by
      or new.reversal_reason is distinct from old.reversal_reason
    ))
  then
    raise exception using errcode = '55000', message = 'recorded contractor payments are immutable; only an unreversed payment may be reversed once';
  end if;
  return new;
end;
$$;

create trigger contractor_payments_history
before update or delete on public.contractor_payments
for each row execute function private.enforce_contractor_payment_history();

-- Financial identity (currency) is frozen once an effective payment exists;
-- the agreed amount may only move through the audited adjustment facade,
-- and never below what has already been paid.
create or replace function private.enforce_assignment_finance_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  effective_paid numeric;
begin
  select coalesce(sum(amount), 0) into effective_paid
  from public.contractor_payments
  where contractor_assignment_id = old.id and reversed_at is null;
  if effective_paid > 0 then
    if new.currency is distinct from old.currency then
      raise exception using errcode = '55000', message = 'assignment currency is frozen after a payment has been recorded';
    end if;
    if new.agreed_amount is null or new.agreed_amount < effective_paid then
      raise exception using errcode = '55000', message = 'agreed amount cannot drop below the effective paid amount';
    end if;
  end if;
  return new;
end;
$$;

create trigger contractor_assignments_finance_identity
before update on public.contractor_assignments
for each row execute function private.enforce_assignment_finance_identity();

revoke all on function private.enforce_contractor_payment_history() from public, anon, authenticated;
revoke all on function private.enforce_assignment_finance_identity() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Canonical projections
-- ---------------------------------------------------------------------

create or replace function private.assignment_financials(target_assignment_id uuid)
returns table (agreed_amount numeric, paid_amount numeric, remaining_amount numeric, payment_state text)
language sql
stable
security invoker
set search_path = ''
as $$
  with assignment as (
    select agreed_amount from public.contractor_assignments where id = target_assignment_id
  ),
  paid as (
    select coalesce(sum(amount), 0)::numeric(14, 2) as paid_amount
    from public.contractor_payments
    where contractor_assignment_id = target_assignment_id and reversed_at is null
  )
  select
    assignment.agreed_amount,
    paid.paid_amount,
    case when assignment.agreed_amount is null then null
      else (assignment.agreed_amount - paid.paid_amount)::numeric(14, 2) end as remaining_amount,
    case
      when paid.paid_amount <= 0 then 'unpaid'
      when assignment.agreed_amount is not null and paid.paid_amount >= assignment.agreed_amount then 'paid'
      else 'partially_paid'
    end as payment_state
  from assignment cross join paid;
$$;

revoke all on function private.assignment_financials(uuid) from public, anon, authenticated;

-- Contractor performance is DERIVED from rated completed assignments.
create or replace function private.partner_performance(target_partner_id uuid)
returns table (average_rating numeric, rated_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select round(avg(performance_rating)::numeric, 1), count(*)::integer
  from public.contractor_assignments
  where trade_partner_id = target_partner_id and status = 'completed' and performance_rating is not null;
$$;

revoke all on function private.partner_performance(uuid) from public, anon, authenticated;

-- Contractor outstanding grouped by currency (never summed across).
create or replace function private.partner_outstanding_by_currency(target_partner_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'currency', currency, 'agreed', agreed, 'paid', paid, 'remaining', remaining, 'assignment_count', assignment_count
  ) order by currency), '[]'::jsonb)
  from (
    select assignment.currency,
      sum(money.agreed_amount)::numeric(14, 2) as agreed,
      sum(money.paid_amount)::numeric(14, 2) as paid,
      sum(money.remaining_amount)::numeric(14, 2) as remaining,
      count(*) as assignment_count
    from public.contractor_assignments as assignment
    cross join lateral private.assignment_financials(assignment.id) as money
    where assignment.trade_partner_id = target_partner_id
      and assignment.status <> 'cancelled' and assignment.archived_at is null
      and assignment.currency is not null and assignment.agreed_amount is not null
    group by assignment.currency
  ) as totals;
$$;

revoke all on function private.partner_outstanding_by_currency(uuid) from public, anon, authenticated;

create or replace function private.partner_summary(partner public.trade_partners)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return jsonb_build_object(
    'id', partner.id,
    'capabilities', to_jsonb(partner.capabilities),
    'display_name', partner.display_name,
    'company_name', partner.company_name,
    'contact_name', partner.contact_name,
    'email', partner.email,
    'phone_display', partner.phone_display,
    'address', partner.address,
    'specializations', to_jsonb(partner.specializations),
    'availability_status', partner.availability_status,
    'version', partner.version,
    'updated_at', partner.updated_at,
    'created_at', partner.created_at,
    'archived_at', partner.archived_at,
    'active_assignment_count', (
      select count(*) from public.contractor_assignments
      where trade_partner_id = partner.id and status in ('planned', 'active', 'on_hold') and archived_at is null
    ),
    'open_order_count', (
      select count(*) from public.purchase_orders
      where supplier_id = partner.id and lifecycle_state = 'issued'
    ),
    'performance', (select jsonb_build_object('average_rating', average_rating, 'rated_count', rated_count)
      from private.partner_performance(partner.id)),
    'outstanding_by_currency', private.partner_outstanding_by_currency(partner.id)
  );
end;
$$;

revoke all on function private.partner_summary(public.trade_partners) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Trade partner facades
-- ---------------------------------------------------------------------

create or replace function public.admin_list_trade_partners(
  capability_filter text default null,
  search_query text default null,
  availability_filter text default null,
  specialization_filter text default null,
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
  if not private.has_permission('partners.read') then
    raise exception using errcode = '42501', message = 'trade partner list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'partner page size is outside the admitted range';
  end if;
  if capability_filter is not null and capability_filter not in ('contractor', 'supplier') then
    raise exception using errcode = '22023', message = 'partner capability filter is not admitted';
  end if;
  if availability_filter is not null and availability_filter not in ('available', 'busy', 'unavailable') then
    raise exception using errcode = '22023', message = 'partner availability filter is not admitted';
  end if;
  if status_scope not in ('active', 'archived', 'all') then
    raise exception using errcode = '22023', message = 'partner status scope is not admitted';
  end if;
  if normalized_query is not null and char_length(normalized_query) > 100 then
    raise exception using errcode = '22023', message = 'partner search query is too long';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'partner cursor is incomplete';
  end if;

  for item in
    select partner as row, partner.updated_at, partner.id
    from public.trade_partners as partner
    where (capability_filter is null or capability_filter = any (partner.capabilities))
      and (availability_filter is null or partner.availability_status = availability_filter)
      and (specialization_filter is null or specialization_filter = any (partner.specializations))
      and (status_scope = 'all'
        or (status_scope = 'active' and partner.archived_at is null)
        or (status_scope = 'archived' and partner.archived_at is not null))
      and (normalized_query is null
        or partner.display_name ilike '%' || normalized_query || '%'
        or partner.company_name ilike '%' || normalized_query || '%'
        or partner.contact_name ilike '%' || normalized_query || '%'
        or partner.email_normalized = private.normalize_email(normalized_query)
        or partner.phone_normalized = private.normalize_phone(normalized_query))
      and (cursor_updated_at is null or (partner.updated_at, partner.id) < (cursor_updated_at, cursor_id))
    order by partner.updated_at desc, partner.id desc
    limit page_size + 1
  loop
    item_count := item_count + 1;
    if item_count > page_size then
      has_more := true;
      exit;
    end if;
    next_updated_at := item.updated_at;
    next_id := item.id;
    items := items || jsonb_build_array(private.partner_summary(item.row));
  end loop;

  return jsonb_build_object(
    'items', items, 'has_more', has_more,
    'next_cursor_updated_at', case when has_more then next_updated_at end,
    'next_cursor_id', case when has_more then next_id end
  );
end;
$$;

create or replace function public.admin_list_partners_for_picker(
  capability text, search_query text default null, limit_count integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('partners.read') then
    raise exception using errcode = '42501', message = 'partner picker is not authorized';
  end if;
  if capability not in ('contractor', 'supplier') then
    raise exception using errcode = '22023', message = 'partner capability is not admitted';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 25 then
    limit_count := 10;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id, 'display_name', display_name, 'company_name', company_name,
      'availability_status', availability_status, 'specializations', to_jsonb(specializations)
    ))
    from (
      select id, display_name, company_name, availability_status, specializations
      from public.trade_partners
      where archived_at is null and capability = any (capabilities)
        and (normalized_query is null
          or display_name ilike '%' || normalized_query || '%'
          or company_name ilike '%' || normalized_query || '%')
      order by display_name
      limit limit_count
    ) as partner
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_trade_partner(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  partner public.trade_partners;
  result jsonb;
begin
  if not private.has_permission('partners.read') then
    raise exception using errcode = '42501', message = 'trade partner detail is not authorized';
  end if;
  select * into partner from public.trade_partners where id = target_id;
  if partner.id is null then
    raise exception using errcode = 'P0002', message = 'trade partner does not exist';
  end if;

  result := jsonb_build_object(
    'partner', private.partner_summary(partner) || jsonb_build_object('notes', partner.notes),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', assignment.id, 'scope', assignment.scope, 'specialization', assignment.specialization,
        'status', assignment.status, 'start_date', assignment.start_date, 'end_date', assignment.end_date,
        'currency', assignment.currency, 'agreed_amount', money.agreed_amount, 'paid_amount', money.paid_amount,
        'remaining_amount', money.remaining_amount, 'payment_state', money.payment_state,
        'performance_rating', assignment.performance_rating, 'updated_at', assignment.updated_at,
        'project', jsonb_build_object('id', project.id, 'title', project.title)
      ) order by assignment.updated_at desc)
      from (select * from public.contractor_assignments where trade_partner_id = target_id and archived_at is null
            order by updated_at desc limit 50) as assignment
      join public.operational_projects as project on project.id = assignment.operational_project_id
      cross join lateral private.assignment_financials(assignment.id) as money
    ), '[]'::jsonb),
    'purchase_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', po.id, 'purchase_order_number', po.purchase_order_number, 'lifecycle_state', po.lifecycle_state,
        'currency', po.currency, 'total', money.total, 'delivery_state', money.delivery_state,
        'expected_delivery_date', po.expected_delivery_date, 'issue_date', po.issue_date,
        'project', jsonb_build_object('id', project.id, 'title', project.title)
      ) order by po.updated_at desc)
      from (select * from public.purchase_orders where supplier_id = target_id order by updated_at desc limit 50) as po
      join public.operational_projects as project on project.id = po.operational_project_id
      cross join lateral private.purchase_order_financials(po.id) as money
    ), '[]'::jsonb),
    'rated_assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', assignment.id, 'scope', assignment.scope, 'performance_rating', assignment.performance_rating,
        'performance_note', assignment.performance_note, 'end_date', assignment.end_date,
        'project', jsonb_build_object('id', project.id, 'title', project.title)
      ) order by assignment.updated_at desc)
      from public.contractor_assignments as assignment
      join public.operational_projects as project on project.id = assignment.operational_project_id
      where assignment.trade_partner_id = target_id and assignment.performance_rating is not null
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', log.action, 'outcome', log.outcome, 'occurred_at', log.occurred_at,
        'actor', profile.display_name, 'metadata', log.metadata
      ) order by log.occurred_at desc)
      from (select * from public.audit_logs where entity_type = 'trade_partner' and entity_id = target_id::text
            order by occurred_at desc limit 30) as log
      left join public.profiles as profile on profile.id = log.actor_id
    ), '[]'::jsonb)
  );
  return result;
end;
$$;

create or replace function public.find_possible_duplicate_trade_partners(
  target_display_name text default null, target_email text default null, target_phone text default null,
  target_company text default null, exclude_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_email text := private.normalize_email(target_email);
  normalized_phone text := private.normalize_phone(target_phone);
  normalized_name text := nullif(lower(btrim(target_display_name)), '');
  normalized_company text := nullif(lower(btrim(target_company)), '');
begin
  if not private.has_permission('partners.read') then
    raise exception using errcode = '42501', message = 'partner duplicate check is not authorized';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id, 'display_name', display_name, 'company_name', company_name,
      'capabilities', to_jsonb(capabilities), 'email', email, 'phone_display', phone_display,
      'archived_at', archived_at,
      'match', case
        when normalized_email is not null and email_normalized = normalized_email then 'email'
        when normalized_phone is not null and phone_normalized = normalized_phone then 'phone'
        else 'name' end
    ))
    from (
      select * from public.trade_partners as partner
      where (exclude_id is null or partner.id <> exclude_id)
        and (
          (normalized_email is not null and partner.email_normalized = normalized_email)
          or (normalized_phone is not null and partner.phone_normalized = normalized_phone)
          or (normalized_name is not null and char_length(normalized_name) >= 3 and lower(partner.display_name) = normalized_name)
          or (normalized_company is not null and char_length(normalized_company) >= 3 and lower(partner.company_name) = normalized_company)
        )
      order by partner.updated_at desc
      limit 5
    ) as candidate
  ), '[]'::jsonb);
end;
$$;

create or replace function private.validate_trade_partner_fields(
  target_display_name text, target_email text, target_phone text, target_company text,
  target_contact text, target_address text, target_notes text, target_specializations text[],
  target_availability text, target_capabilities text[]
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  specialization text;
begin
  if target_display_name is null or btrim(target_display_name) = '' or char_length(target_display_name) > 200 then
    return private.failure('invalid_input', 'display_name', 'A display name is required.');
  end if;
  if target_capabilities is null or cardinality(target_capabilities) = 0
     or not (target_capabilities <@ array['contractor', 'supplier']::text[]) then
    return private.failure('invalid_input', 'capabilities', 'Choose at least one capability: contractor or supplier.');
  end if;
  if target_email is not null and char_length(target_email) > 254 then
    return private.failure('invalid_input', 'email', 'Email is too long.');
  end if;
  if target_phone is not null and char_length(target_phone) > 40 then
    return private.failure('invalid_input', 'phone', 'Phone is too long.');
  end if;
  if target_company is not null and char_length(target_company) > 200 then
    return private.failure('invalid_input', 'company_name', 'Company name is too long.');
  end if;
  if target_contact is not null and char_length(target_contact) > 200 then
    return private.failure('invalid_input', 'contact_name', 'Contact name is too long.');
  end if;
  if target_address is not null and char_length(target_address) > 400 then
    return private.failure('invalid_input', 'address', 'Address is too long.');
  end if;
  if target_notes is not null and char_length(target_notes) > 4000 then
    return private.failure('invalid_input', 'notes', 'Notes are too long.');
  end if;
  if target_availability not in ('available', 'busy', 'unavailable') then
    return private.failure('invalid_input', 'availability_status', 'Availability is not admitted.');
  end if;
  if target_specializations is not null then
    if cardinality(target_specializations) > 20 then
      return private.failure('invalid_input', 'specializations', 'At most 20 specializations.');
    end if;
    foreach specialization in array target_specializations loop
      if specialization is null or btrim(specialization) = '' or char_length(specialization) > 60 then
        return private.failure('invalid_input', 'specializations', 'Specializations must be 1–60 characters.');
      end if;
    end loop;
  end if;
  return null;
end;
$$;

revoke all on function private.validate_trade_partner_fields(text, text, text, text, text, text, text, text[], text, text[]) from public, anon, authenticated;

create or replace function public.create_admin_trade_partner(
  target_display_name text,
  target_capabilities text[],
  target_company text default null,
  target_contact text default null,
  target_email text default null,
  target_phone text default null,
  target_address text default null,
  target_notes text default null,
  target_specializations text[] default '{}',
  target_availability text default 'available'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  problem jsonb;
begin
  if not private.has_permission('partners.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'partners.write is required.')));
  end if;
  problem := private.validate_trade_partner_fields(target_display_name, target_email, target_phone, target_company,
    target_contact, target_address, target_notes, target_specializations, target_availability, target_capabilities);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  insert into public.trade_partners (
    capabilities, display_name, company_name, contact_name, email, email_normalized,
    phone_display, phone_normalized, address, notes, specializations, availability_status, created_by, updated_by
  ) values (
    (select array_agg(distinct c) from unnest(target_capabilities) as c),
    btrim(target_display_name), nullif(btrim(target_company), ''), nullif(btrim(target_contact), ''),
    nullif(btrim(target_email), ''), private.normalize_email(target_email),
    nullif(btrim(target_phone), ''), private.normalize_phone(target_phone),
    nullif(btrim(target_address), ''), nullif(btrim(target_notes), ''),
    coalesce((select array_agg(distinct btrim(s)) from unnest(target_specializations) as s where btrim(s) <> ''), '{}'),
    target_availability, auth.uid(), auth.uid()
  ) returning id into new_id;
  perform private.s4_audit('partner.create', 'trade_partner', new_id::text, 'success',
    jsonb_build_object('capabilities', to_jsonb(target_capabilities)));
  perform private.emit_realtime_event('trade_partner', new_id, 'created');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

create or replace function public.update_admin_trade_partner(
  target_id uuid,
  expected_version integer,
  target_display_name text,
  target_company text default null,
  target_contact text default null,
  target_email text default null,
  target_phone text default null,
  target_address text default null,
  target_notes text default null,
  target_specializations text[] default '{}',
  target_availability text default 'available'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  problem jsonb;
begin
  if not private.has_permission('partners.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'partners.write is required.')));
  end if;
  select * into current from public.trade_partners where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'partner', 'Trade partner does not exist.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'partner', 'An archived partner cannot be edited.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer partner version is available.')));
  end if;
  problem := private.validate_trade_partner_fields(target_display_name, target_email, target_phone, target_company,
    target_contact, target_address, target_notes, target_specializations, target_availability, current.capabilities);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  update public.trade_partners
     set display_name = btrim(target_display_name),
         company_name = nullif(btrim(target_company), ''),
         contact_name = nullif(btrim(target_contact), ''),
         email = nullif(btrim(target_email), ''), email_normalized = private.normalize_email(target_email),
         phone_display = nullif(btrim(target_phone), ''), phone_normalized = private.normalize_phone(target_phone),
         address = nullif(btrim(target_address), ''),
         notes = nullif(btrim(target_notes), ''),
         specializations = coalesce((select array_agg(distinct btrim(s)) from unnest(target_specializations) as s where btrim(s) <> ''), '{}'),
         availability_status = target_availability,
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('partner.update', 'trade_partner', target_id::text, 'success',
    jsonb_build_object('availability_status', target_availability));
  perform private.emit_realtime_event('trade_partner', target_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- Add a capability to an existing partner (e.g. a contractor that also supplies).
create or replace function public.add_trade_partner_capability(target_id uuid, expected_version integer, capability text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
begin
  if not private.has_permission('partners.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'partners.write is required.')));
  end if;
  if capability not in ('contractor', 'supplier') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'capability', 'Capability is not admitted.')));
  end if;
  select * into current from public.trade_partners where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'partner', 'Trade partner does not exist.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'partner', 'An archived partner cannot gain capabilities.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer partner version is available.')));
  end if;
  if capability = any (current.capabilities) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'capability', 'The partner already has this capability.')));
  end if;
  update public.trade_partners
     set capabilities = array_append(capabilities, capability),
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('partner.capability_change', 'trade_partner', target_id::text, 'success',
    jsonb_build_object('added', capability));
  perform private.emit_realtime_event('trade_partner', target_id, 'capability_changed');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.archive_admin_trade_partner(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
begin
  if not private.has_permission('partners.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'partners.write is required.')));
  end if;
  select * into current from public.trade_partners where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'partner', 'Trade partner does not exist.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'partner', 'The partner is already archived.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer partner version is available.')));
  end if;
  if exists (select 1 from public.contractor_assignments
             where trade_partner_id = target_id and status in ('planned', 'active', 'on_hold') and archived_at is null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'assignments', 'Complete or cancel the partner''s active assignments before archiving.')));
  end if;
  if exists (select 1 from public.purchase_orders where supplier_id = target_id and lifecycle_state in ('draft', 'issued')) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'purchase_orders', 'Close or cancel the partner''s open purchase orders before archiving.')));
  end if;
  update public.trade_partners
     set archived_at = now(), updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('partner.archive', 'trade_partner', target_id::text, 'success', '{}'::jsonb);
  perform private.emit_realtime_event('trade_partner', target_id, 'archived');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- ---------------------------------------------------------------------
-- Contractor assignment facades
-- ---------------------------------------------------------------------

create or replace function private.assignment_detail(target_assignment_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'assignment', jsonb_build_object(
      'id', assignment.id, 'scope', assignment.scope, 'specialization', assignment.specialization,
      'status', assignment.status, 'start_date', assignment.start_date, 'end_date', assignment.end_date,
      'rate_type', assignment.rate_type, 'rate_amount', assignment.rate_amount, 'currency', assignment.currency,
      'planned_units', assignment.planned_units, 'agreed_amount', assignment.agreed_amount,
      'payment_terms', assignment.payment_terms, 'performance_rating', assignment.performance_rating,
      'performance_note', assignment.performance_note, 'version', assignment.version,
      'created_at', assignment.created_at, 'updated_at', assignment.updated_at, 'archived_at', assignment.archived_at
    ),
    'project', jsonb_build_object('id', project.id, 'title', project.title, 'status', project.status, 'archived_at', project.archived_at),
    'partner', jsonb_build_object('id', partner.id, 'display_name', partner.display_name, 'company_name', partner.company_name,
      'availability_status', partner.availability_status, 'archived_at', partner.archived_at),
    'financials', jsonb_build_object('agreed_amount', money.agreed_amount, 'paid_amount', money.paid_amount,
      'remaining_amount', money.remaining_amount, 'payment_state', money.payment_state),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', payment.id, 'amount', payment.amount, 'payment_date', payment.payment_date,
        'payment_method', payment.payment_method, 'reference', payment.reference, 'note', payment.note,
        'created_at', payment.created_at, 'recorded_by', recorder.display_name,
        'reversed_at', payment.reversed_at, 'reversal_reason', payment.reversal_reason, 'reversed_by', reverser.display_name
      ) order by payment.payment_date desc, payment.created_at desc)
      from public.contractor_payments as payment
      left join public.profiles as recorder on recorder.id = payment.created_by
      left join public.profiles as reverser on reverser.id = payment.reversed_by
      where payment.contractor_assignment_id = assignment.id
    ), '[]'::jsonb),
    'adjustments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', adjustment.id, 'previous_amount', adjustment.previous_amount, 'new_amount', adjustment.new_amount,
        'reason', adjustment.reason, 'created_at', adjustment.created_at, 'actor', profile.display_name
      ) order by adjustment.created_at desc)
      from public.contractor_assignment_adjustments as adjustment
      left join public.profiles as profile on profile.id = adjustment.created_by
      where adjustment.contractor_assignment_id = assignment.id
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', log.action, 'outcome', log.outcome, 'occurred_at', log.occurred_at,
        'actor', profile.display_name, 'metadata', log.metadata
      ) order by log.occurred_at desc)
      from (select * from public.audit_logs where entity_type = 'contractor_assignment' and entity_id = assignment.id::text
            order by occurred_at desc limit 30) as log
      left join public.profiles as profile on profile.id = log.actor_id
    ), '[]'::jsonb)
  )
  from public.contractor_assignments as assignment
  join public.operational_projects as project on project.id = assignment.operational_project_id
  join public.trade_partners as partner on partner.id = assignment.trade_partner_id
  cross join lateral private.assignment_financials(assignment.id) as money
  where assignment.id = target_assignment_id;
$$;

revoke all on function private.assignment_detail(uuid) from public, anon, authenticated;

create or replace function public.admin_get_contractor_assignment(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('partners.read') then
    raise exception using errcode = '42501', message = 'assignment detail is not authorized';
  end if;
  result := private.assignment_detail(target_id);
  if result is null then
    raise exception using errcode = 'P0002', message = 'assignment does not exist';
  end if;
  return result;
end;
$$;

-- Project → Contractors tab + per-currency contractor position.
create or replace function public.admin_project_contractors(target_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('partners.read') then
    raise exception using errcode = '42501', message = 'project contractors are not authorized';
  end if;
  return jsonb_build_object(
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', assignment.id, 'scope', assignment.scope, 'specialization', assignment.specialization,
        'status', assignment.status, 'start_date', assignment.start_date, 'end_date', assignment.end_date,
        'rate_type', assignment.rate_type, 'rate_amount', assignment.rate_amount, 'currency', assignment.currency,
        'planned_units', assignment.planned_units, 'agreed_amount', money.agreed_amount,
        'paid_amount', money.paid_amount, 'remaining_amount', money.remaining_amount,
        'payment_state', money.payment_state, 'performance_rating', assignment.performance_rating,
        'version', assignment.version, 'updated_at', assignment.updated_at,
        'partner', jsonb_build_object('id', partner.id, 'display_name', partner.display_name,
          'company_name', partner.company_name, 'availability_status', partner.availability_status)
      ) order by assignment.updated_at desc)
      from (select * from public.contractor_assignments where operational_project_id = target_project_id
            and archived_at is null order by updated_at desc limit 100) as assignment
      join public.trade_partners as partner on partner.id = assignment.trade_partner_id
      cross join lateral private.assignment_financials(assignment.id) as money
    ), '[]'::jsonb),
    'summary_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'committed', committed, 'paid', paid, 'remaining', remaining,
        'assignment_count', assignment_count) order by currency)
      from (
        select assignment.currency, sum(money.agreed_amount)::numeric(14, 2) as committed,
          sum(money.paid_amount)::numeric(14, 2) as paid, sum(money.remaining_amount)::numeric(14, 2) as remaining,
          count(*) as assignment_count
        from public.contractor_assignments as assignment
        cross join lateral private.assignment_financials(assignment.id) as money
        where assignment.operational_project_id = target_project_id and assignment.archived_at is null
          and assignment.status <> 'cancelled' and assignment.currency is not null and assignment.agreed_amount is not null
        group by assignment.currency
      ) as totals
    ), '[]'::jsonb),
    'active_count', (select count(*) from public.contractor_assignments
      where operational_project_id = target_project_id and status = 'active' and archived_at is null)
  );
end;
$$;

create or replace function private.validate_assignment_fields(
  target_scope text, target_specialization text, target_status text, target_start date, target_end date,
  target_rate_type text, target_rate_amount numeric, target_currency text, target_planned_units numeric,
  target_agreed_amount numeric, target_terms text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if target_scope is null or btrim(target_scope) = '' or char_length(target_scope) > 500 then
    return private.failure('invalid_input', 'scope', 'A scope of at most 500 characters is required.');
  end if;
  if target_specialization is not null and char_length(target_specialization) > 80 then
    return private.failure('invalid_input', 'specialization', 'Specialization is too long.');
  end if;
  if target_status not in ('planned', 'active', 'on_hold', 'completed', 'cancelled') then
    return private.failure('invalid_input', 'status', 'Assignment status is not admitted.');
  end if;
  if target_start is not null and target_end is not null and target_end < target_start then
    return private.failure('invalid_input', 'end_date', 'End date cannot precede the start date.');
  end if;
  if target_rate_type is not null and target_rate_type not in ('fixed_project', 'hourly', 'daily', 'monthly') then
    return private.failure('invalid_input', 'rate_type', 'Rate type is not admitted.');
  end if;
  if target_rate_amount is not null and (target_rate_amount < 0 or target_rate_type is null) then
    return private.failure('invalid_input', 'rate_amount', 'A rate needs a rate type and cannot be negative.');
  end if;
  if (target_rate_amount is not null or target_agreed_amount is not null)
     and (target_currency is null or target_currency !~ '^[A-Z]{3}$') then
    return private.failure('invalid_input', 'currency', 'A 3-letter currency is required when a rate or agreed amount is set.');
  end if;
  if target_currency is not null and target_currency !~ '^[A-Z]{3}$' then
    return private.failure('invalid_input', 'currency', 'Use a 3-letter currency code.');
  end if;
  if target_planned_units is not null and target_planned_units <= 0 then
    return private.failure('invalid_input', 'planned_units', 'Planned units must be greater than zero.');
  end if;
  if target_agreed_amount is not null and target_agreed_amount < 0 then
    return private.failure('invalid_input', 'agreed_amount', 'Agreed amount cannot be negative.');
  end if;
  if target_terms is not null and char_length(target_terms) > 2000 then
    return private.failure('invalid_input', 'payment_terms', 'Payment terms are too long.');
  end if;
  return null;
end;
$$;

revoke all on function private.validate_assignment_fields(text, text, text, date, date, text, numeric, text, numeric, numeric, text) from public, anon, authenticated;

create or replace function public.create_contractor_assignment(
  target_project_id uuid,
  target_partner_id uuid,
  target_scope text,
  target_specialization text default null,
  target_status text default 'planned',
  target_start_date date default null,
  target_end_date date default null,
  target_rate_type text default null,
  target_rate_amount numeric default null,
  target_currency text default null,
  target_planned_units numeric default null,
  target_agreed_amount numeric default null,
  target_payment_terms text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  problem jsonb;
  partner record;
  normalized_currency text := upper(nullif(btrim(target_currency), ''));
begin
  if not private.has_permission('contractors.assign') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'contractors.assign is required.')));
  end if;
  if not exists (select 1 from public.operational_projects where id = target_project_id and archived_at is null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'operational_project_id', 'Select an active operational project.')));
  end if;
  select * into partner from public.trade_partners where id = target_partner_id;
  if partner.id is null or partner.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'trade_partner_id', 'Select an active trade partner.')));
  end if;
  if not ('contractor' = any (partner.capabilities)) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('capability_missing', 'trade_partner_id', 'This partner is not a contractor. Add the contractor capability first.')));
  end if;
  problem := private.validate_assignment_fields(target_scope, target_specialization, target_status, target_start_date, target_end_date,
    target_rate_type, target_rate_amount, normalized_currency, target_planned_units, target_agreed_amount, target_payment_terms);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  insert into public.contractor_assignments (
    operational_project_id, trade_partner_id, scope, specialization, status, start_date, end_date,
    rate_type, rate_amount, currency, planned_units, agreed_amount, payment_terms, created_by, updated_by
  ) values (
    target_project_id, target_partner_id, btrim(target_scope), nullif(btrim(target_specialization), ''), target_status,
    target_start_date, target_end_date, target_rate_type, round(target_rate_amount, 2), normalized_currency,
    round(target_planned_units, 3), round(target_agreed_amount, 2), nullif(btrim(target_payment_terms), ''), auth.uid(), auth.uid()
  ) returning id into new_id;
  perform private.s4_audit('assignment.create', 'contractor_assignment', new_id::text, 'success',
    jsonb_build_object('project_id', target_project_id, 'partner_id', target_partner_id, 'status', target_status, 'currency', normalized_currency));
  perform private.s4_audit('assignment.create', 'operational_project', target_project_id::text, 'success',
    jsonb_build_object('assignment_id', new_id, 'partner_name', partner.display_name));
  perform private.s4_audit('assignment.create', 'trade_partner', target_partner_id::text, 'success',
    jsonb_build_object('assignment_id', new_id, 'project_id', target_project_id));
  perform private.emit_realtime_event('contractor_assignment', new_id, 'created');
  perform private.emit_realtime_event('operational_project', target_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

create or replace function public.update_contractor_assignment(
  target_id uuid,
  expected_version integer,
  target_scope text,
  target_specialization text default null,
  target_start_date date default null,
  target_end_date date default null,
  target_rate_type text default null,
  target_rate_amount numeric default null,
  target_currency text default null,
  target_planned_units numeric default null,
  target_agreed_amount numeric default null,
  target_payment_terms text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  problem jsonb;
  effective_paid numeric;
  normalized_currency text := upper(nullif(btrim(target_currency), ''));
begin
  if not private.has_permission('contractors.assign') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'contractors.assign is required.')));
  end if;
  select * into current from public.contractor_assignments where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'assignment', 'Assignment does not exist.')));
  end if;
  if current.status = 'cancelled' or current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'A cancelled assignment cannot be edited.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer assignment version is available.')));
  end if;
  problem := private.validate_assignment_fields(target_scope, target_specialization, current.status, target_start_date, target_end_date,
    target_rate_type, target_rate_amount, normalized_currency, target_planned_units, target_agreed_amount, target_payment_terms);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  select coalesce(sum(amount), 0) into effective_paid
  from public.contractor_payments where contractor_assignment_id = target_id and reversed_at is null;
  if effective_paid > 0 and (normalized_currency is distinct from current.currency
      or round(target_agreed_amount, 2) is distinct from current.agreed_amount) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('finance_locked', 'agreed_amount',
      'Payments have been recorded: currency is frozen and the agreed amount changes only through Adjust Agreed Amount.')));
  end if;
  update public.contractor_assignments
     set scope = btrim(target_scope), specialization = nullif(btrim(target_specialization), ''),
         start_date = target_start_date, end_date = target_end_date,
         rate_type = target_rate_type, rate_amount = round(target_rate_amount, 2), currency = normalized_currency,
         planned_units = round(target_planned_units, 3), agreed_amount = round(target_agreed_amount, 2),
         payment_terms = nullif(btrim(target_payment_terms), ''),
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('assignment.update', 'contractor_assignment', target_id::text, 'success',
    jsonb_build_object('currency', normalized_currency, 'agreed_amount', round(target_agreed_amount, 2)));
  perform private.emit_realtime_event('contractor_assignment', target_id, 'updated');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.change_contractor_assignment_status(target_id uuid, expected_version integer, next_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
begin
  if not private.has_permission('contractors.assign') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'contractors.assign is required.')));
  end if;
  if next_status not in ('planned', 'active', 'on_hold', 'completed', 'cancelled') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'status', 'Assignment status is not admitted.')));
  end if;
  select * into current from public.contractor_assignments where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'assignment', 'Assignment does not exist.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer assignment version is available.')));
  end if;
  if current.status = next_status then
    return jsonb_build_object('ok', true, 'id', target_id, 'version', current.version);
  end if;
  if current.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'A cancelled assignment cannot change status.')));
  end if;
  if next_status = 'cancelled' and exists (select 1 from public.contractor_payments where contractor_assignment_id = target_id and reversed_at is null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'payments', 'Reverse the recorded payments before cancelling this assignment.')));
  end if;
  update public.contractor_assignments
     set status = next_status,
         performance_rating = case when next_status = 'completed' then performance_rating else null end,
         performance_note = case when next_status = 'completed' then performance_note else null end,
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('assignment.status_change', 'contractor_assignment', target_id::text, 'success',
    jsonb_build_object('from', current.status, 'to', next_status));
  perform private.s4_audit('assignment.status_change', 'trade_partner', current.trade_partner_id::text, 'success',
    jsonb_build_object('assignment_id', target_id, 'from', current.status, 'to', next_status));
  if next_status = 'completed' then
    perform private.s4_audit('assignment.completed', 'operational_project', current.operational_project_id::text, 'success',
      jsonb_build_object('assignment_id', target_id));
  end if;
  perform private.emit_realtime_event('contractor_assignment', target_id, 'status_changed');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  perform private.emit_realtime_event('trade_partner', current.trade_partner_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.adjust_contractor_assignment_amount(
  target_id uuid, expected_version integer, new_amount numeric, reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  effective_paid numeric;
begin
  if not private.has_permission('contractors.assign') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'contractors.assign is required.')));
  end if;
  if new_amount is null or new_amount < 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'agreed_amount', 'Enter a non-negative agreed amount.')));
  end if;
  if reason is null or btrim(reason) = '' or char_length(reason) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'A reason is required.')));
  end if;
  select * into current from public.contractor_assignments where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'assignment', 'Assignment does not exist.')));
  end if;
  if current.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'A cancelled assignment cannot be adjusted.')));
  end if;
  if current.currency is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'currency', 'Set the assignment currency before adjusting the agreed amount.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer assignment version is available.')));
  end if;
  select coalesce(sum(amount), 0) into effective_paid
  from public.contractor_payments where contractor_assignment_id = target_id and reversed_at is null;
  if round(new_amount, 2) < effective_paid then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'agreed_amount',
      'The agreed amount cannot drop below the ' || current.currency || ' ' || effective_paid::text || ' already paid.')));
  end if;
  insert into public.contractor_assignment_adjustments (contractor_assignment_id, previous_amount, new_amount, reason, created_by)
  values (target_id, current.agreed_amount, round(new_amount, 2), btrim(reason), auth.uid());
  update public.contractor_assignments
     set agreed_amount = round(new_amount, 2), updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('assignment.finance_adjustment', 'contractor_assignment', target_id::text, 'success',
    jsonb_build_object('previous_amount', current.agreed_amount, 'new_amount', round(new_amount, 2), 'currency', current.currency));
  perform private.emit_realtime_event('contractor_assignment', target_id, 'adjusted');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.rate_contractor_assignment(
  target_id uuid, expected_version integer, rating integer, note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
begin
  if not private.has_permission('contractors.assign') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'contractors.assign is required.')));
  end if;
  if rating is null or rating < 1 or rating > 5 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'rating', 'Choose a rating from 1 to 5.')));
  end if;
  if note is not null and char_length(note) > 2000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'note', 'Note is too long.')));
  end if;
  select * into current from public.contractor_assignments where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'assignment', 'Assignment does not exist.')));
  end if;
  if current.status <> 'completed' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'Only completed assignments can be rated.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer assignment version is available.')));
  end if;
  update public.contractor_assignments
     set performance_rating = rating, performance_note = nullif(btrim(note), ''),
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('assignment.performance_rate', 'contractor_assignment', target_id::text, 'success',
    jsonb_build_object('rating', rating));
  perform private.s4_audit('assignment.performance_rate', 'trade_partner', current.trade_partner_id::text, 'success',
    jsonb_build_object('assignment_id', target_id, 'rating', rating));
  perform private.emit_realtime_event('contractor_assignment', target_id, 'rated');
  perform private.emit_realtime_event('trade_partner', current.trade_partner_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- RECORD CONTRACTOR PAYMENT: assignment row locked; remaining read under
-- the lock; overpayment refused → two simultaneous payments serialize.
create or replace function public.record_contractor_payment(
  target_assignment_id uuid, amount numeric, target_payment_date date, target_method text,
  target_reference text default null, target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  money record;
  new_id uuid;
begin
  if not private.has_permission('contractors.payments.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'contractors.payments.write is required.')));
  end if;
  if amount is null or amount <= 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'amount', 'Payment amount must be greater than zero.')));
  end if;
  if target_payment_date is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'payment_date', 'A payment date is required.')));
  end if;
  if target_method is null or target_method not in ('bank_transfer', 'cash', 'mobile_money', 'card', 'cheque', 'other') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'payment_method', 'Choose a payment method.')));
  end if;
  if target_reference is not null and char_length(target_reference) > 120 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reference', 'Reference is too long.')));
  end if;
  if target_note is not null and char_length(target_note) > 2000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'note', 'Note is too long.')));
  end if;
  select * into current from public.contractor_assignments where id = target_assignment_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'assignment', 'Assignment does not exist.')));
  end if;
  if current.status = 'cancelled' or current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'status', 'Payments cannot be recorded against a cancelled assignment.')));
  end if;
  if current.currency is null or current.agreed_amount is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'agreed_amount', 'Set the currency and agreed amount before recording payments.')));
  end if;
  select * into money from private.assignment_financials(target_assignment_id);
  if round(amount, 2) > money.remaining_amount then
    return jsonb_build_object('ok', false, 'remaining_amount', money.remaining_amount,
      'reasons', jsonb_build_array(private.failure('exceeds_remaining', 'amount',
        'Payment exceeds the remaining ' || current.currency || ' ' || money.remaining_amount::text || '.')));
  end if;
  insert into public.contractor_payments (contractor_assignment_id, amount, payment_date, payment_method, reference, note, created_by)
  values (target_assignment_id, round(amount, 2), target_payment_date, target_method,
    nullif(btrim(target_reference), ''), nullif(btrim(target_note), ''), auth.uid())
  returning id into new_id;
  update public.contractor_assignments set updated_at = now(), updated_by = auth.uid(), version = version + 1
   where id = target_assignment_id;
  perform private.s4_audit('contractor.payment_record', 'contractor_assignment', target_assignment_id::text, 'success',
    jsonb_build_object('payment_id', new_id, 'amount', round(amount, 2), 'currency', current.currency, 'method', target_method));
  perform private.s4_audit('contractor.payment_record', 'trade_partner', current.trade_partner_id::text, 'success',
    jsonb_build_object('assignment_id', target_assignment_id, 'amount', round(amount, 2), 'currency', current.currency));
  perform private.s4_audit('contractor.payment_record', 'operational_project', current.operational_project_id::text, 'success',
    jsonb_build_object('assignment_id', target_assignment_id, 'amount', round(amount, 2), 'currency', current.currency));
  perform private.emit_realtime_event('contractor_assignment', target_assignment_id, 'payment_recorded');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  perform private.emit_realtime_event('trade_partner', current.trade_partner_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_assignment_id, 'payment_id', new_id,
    'version', current.version + 1, 'remaining_amount', money.remaining_amount - round(amount, 2));
end;
$$;

create or replace function public.reverse_contractor_payment(target_payment_id uuid, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment record;
  current record;
begin
  if not private.has_permission('contractors.payments.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'contractors.payments.write is required.')));
  end if;
  if reason is null or btrim(reason) = '' or char_length(reason) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'A reversal reason is required.')));
  end if;
  select * into payment from public.contractor_payments where id = target_payment_id;
  if payment.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'payment', 'Payment does not exist.')));
  end if;
  select * into current from public.contractor_assignments where id = payment.contractor_assignment_id for update;
  if payment.reversed_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'payment', 'This payment has already been reversed.')));
  end if;
  update public.contractor_payments
     set reversed_at = now(), reversed_by = auth.uid(), reversal_reason = btrim(reason)
   where id = target_payment_id;
  update public.contractor_assignments set updated_at = now(), updated_by = auth.uid(), version = version + 1
   where id = payment.contractor_assignment_id;
  perform private.s4_audit('contractor.payment_reverse', 'contractor_assignment', payment.contractor_assignment_id::text, 'success',
    jsonb_build_object('payment_id', target_payment_id, 'amount', payment.amount, 'currency', current.currency));
  perform private.s4_audit('contractor.payment_reverse', 'trade_partner', current.trade_partner_id::text, 'success',
    jsonb_build_object('assignment_id', payment.contractor_assignment_id, 'amount', payment.amount, 'currency', current.currency));
  perform private.emit_realtime_event('contractor_assignment', payment.contractor_assignment_id, 'payment_reversed');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  perform private.emit_realtime_event('trade_partner', current.trade_partner_id, 'updated');
  return jsonb_build_object('ok', true, 'id', payment.contractor_assignment_id, 'version', current.version + 1);
end;
$$;

-- Contractor Payables register (FINANCE): one row per assignment with money.
create or replace function public.admin_list_contractor_payables(
  search_query text default null,
  partner_id_filter uuid default null,
  project_id_filter uuid default null,
  status_filter text default null,
  currency_filter text default null,
  payment_filter text default null,
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
  if not private.has_permission('partners.read') then
    raise exception using errcode = '42501', message = 'contractor payables are not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'payables page size is outside the admitted range';
  end if;
  if status_filter is not null and status_filter not in ('planned', 'active', 'on_hold', 'completed', 'cancelled') then
    raise exception using errcode = '22023', message = 'payables status filter is not admitted';
  end if;
  if payment_filter is not null and payment_filter not in ('unpaid', 'partially_paid', 'paid') then
    raise exception using errcode = '22023', message = 'payables payment filter is not admitted';
  end if;
  if currency_filter is not null and currency_filter !~ '^[A-Z]{3}$' then
    raise exception using errcode = '22023', message = 'payables currency filter is not admitted';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'payables cursor is incomplete';
  end if;
  for item in
    select assignment.id, assignment.scope, assignment.status, assignment.currency, assignment.updated_at, assignment.version,
      money.agreed_amount, money.paid_amount, money.remaining_amount, money.payment_state,
      jsonb_build_object('id', partner.id, 'display_name', partner.display_name) as partner,
      jsonb_build_object('id', project.id, 'title', project.title) as project,
      (select max(payment_date) from public.contractor_payments where contractor_assignment_id = assignment.id and reversed_at is null) as last_payment_date
    from public.contractor_assignments as assignment
    join public.trade_partners as partner on partner.id = assignment.trade_partner_id
    join public.operational_projects as project on project.id = assignment.operational_project_id
    cross join lateral private.assignment_financials(assignment.id) as money
    where assignment.archived_at is null
      and assignment.agreed_amount is not null
      and (partner_id_filter is null or assignment.trade_partner_id = partner_id_filter)
      and (project_id_filter is null or assignment.operational_project_id = project_id_filter)
      and (status_filter is null or assignment.status = status_filter)
      and (currency_filter is null or assignment.currency = currency_filter)
      and (payment_filter is null or money.payment_state = payment_filter)
      and (normalized_query is null or partner.display_name ilike '%' || normalized_query || '%'
        or project.title ilike '%' || normalized_query || '%' or assignment.scope ilike '%' || normalized_query || '%')
      and (cursor_updated_at is null or (assignment.updated_at, assignment.id) < (cursor_updated_at, cursor_id))
    order by assignment.updated_at desc, assignment.id desc
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
      'id', item.id, 'scope', item.scope, 'status', item.status, 'currency', item.currency,
      'updated_at', item.updated_at, 'version', item.version, 'agreed_amount', item.agreed_amount,
      'paid_amount', item.paid_amount, 'remaining_amount', item.remaining_amount, 'payment_state', item.payment_state,
      'partner', item.partner, 'project', item.project, 'last_payment_date', item.last_payment_date
    ));
  end loop;
  return jsonb_build_object('items', items, 'has_more', has_more,
    'next_cursor_updated_at', case when has_more then next_updated_at end,
    'next_cursor_id', case when has_more then next_id end);
end;
$$;

-- ---------------------------------------------------------------------
-- Grants (contractor side; procurement facades are granted in part 2)
-- ---------------------------------------------------------------------

revoke all on function public.admin_list_trade_partners(text, text, text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_list_partners_for_picker(text, text, integer) from public, anon, authenticated;
revoke all on function public.admin_get_trade_partner(uuid) from public, anon, authenticated;
revoke all on function public.find_possible_duplicate_trade_partners(text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.create_admin_trade_partner(text, text[], text, text, text, text, text, text, text[], text) from public, anon, authenticated;
revoke all on function public.update_admin_trade_partner(uuid, integer, text, text, text, text, text, text, text, text[], text) from public, anon, authenticated;
revoke all on function public.add_trade_partner_capability(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.archive_admin_trade_partner(uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_get_contractor_assignment(uuid) from public, anon, authenticated;
revoke all on function public.admin_project_contractors(uuid) from public, anon, authenticated;
revoke all on function public.create_contractor_assignment(uuid, uuid, text, text, text, date, date, text, numeric, text, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.update_contractor_assignment(uuid, integer, text, text, date, date, text, numeric, text, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.change_contractor_assignment_status(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.adjust_contractor_assignment_amount(uuid, integer, numeric, text) from public, anon, authenticated;
revoke all on function public.rate_contractor_assignment(uuid, integer, integer, text) from public, anon, authenticated;
revoke all on function public.record_contractor_payment(uuid, numeric, date, text, text, text) from public, anon, authenticated;
revoke all on function public.reverse_contractor_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_list_contractor_payables(text, uuid, uuid, text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;

grant execute on function public.admin_list_trade_partners(text, text, text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_list_partners_for_picker(text, text, integer) to authenticated;
grant execute on function public.admin_get_trade_partner(uuid) to authenticated;
grant execute on function public.find_possible_duplicate_trade_partners(text, text, text, text, uuid) to authenticated;
grant execute on function public.create_admin_trade_partner(text, text[], text, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.update_admin_trade_partner(uuid, integer, text, text, text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.add_trade_partner_capability(uuid, integer, text) to authenticated;
grant execute on function public.archive_admin_trade_partner(uuid, integer) to authenticated;
grant execute on function public.admin_get_contractor_assignment(uuid) to authenticated;
grant execute on function public.admin_project_contractors(uuid) to authenticated;
grant execute on function public.create_contractor_assignment(uuid, uuid, text, text, text, date, date, text, numeric, text, numeric, numeric, text) to authenticated;
grant execute on function public.update_contractor_assignment(uuid, integer, text, text, date, date, text, numeric, text, numeric, numeric, text) to authenticated;
grant execute on function public.change_contractor_assignment_status(uuid, integer, text) to authenticated;
grant execute on function public.adjust_contractor_assignment_amount(uuid, integer, numeric, text) to authenticated;
grant execute on function public.rate_contractor_assignment(uuid, integer, integer, text) to authenticated;
grant execute on function public.record_contractor_payment(uuid, numeric, date, text, text, text) to authenticated;
grant execute on function public.reverse_contractor_payment(uuid, text) to authenticated;
grant execute on function public.admin_list_contractor_payables(text, uuid, uuid, text, text, text, timestamptz, uuid, integer) to authenticated;
