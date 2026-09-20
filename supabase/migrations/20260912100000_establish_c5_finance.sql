-- =====================================================================
-- C5 — INVOICES + CLIENT FINANCE FOUNDATION
--
-- Private finance domain: invoices, invoice line items, client payments,
-- revocable client share links, and concurrency-safe official numbering.
-- Forward-only; nothing in S2..C4 history is rewritten. Every table is
-- default-deny RLS; the SECURITY DEFINER facades below are the only access
-- path. The single intentional non-staff read path is
-- public_invoice_by_share_token (token-scoped, hashed, revocable).
--
-- Money rule (docs/CLAUDE_C5_FINANCE_ARCHITECTURE.md):
--   line_total  = round(quantity * unit_price, 2)
--   subtotal    = sum(line_total)
--   tax_amount  = round(subtotal * tax_rate / 100, 2)
--   total       = subtotal + tax_amount
--   paid_amount = sum(amount) of non-reversed payments
--   balance_due = total - paid_amount
-- All amounts are numeric; nothing here is ever a float, and different
-- currencies are never summed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------

insert into public.permissions (key, display_name, description, is_system)
values
  ('finance.invoices.read', 'Read invoices', 'Read invoices, line items, payments, and finance summaries.', true),
  ('finance.invoices.write', 'Manage invoice drafts', 'Create, edit, duplicate, and archive draft invoices; manage client share links.', true),
  ('finance.invoices.issue', 'Issue invoices', 'Issue a draft invoice with an official number and frozen snapshots.', true),
  ('finance.payments.write', 'Record payments', 'Record and reverse client payments against issued invoices.', true),
  ('finance.invoices.void', 'Void invoices', 'Void an issued invoice with a recorded reason.', true)
on conflict (key) do update
set display_name = excluded.display_name,
    description = excluded.description,
    is_system = true;

-- Least privilege: admin handles day-to-day billing (draft/edit/issue/payments);
-- voiding an official document stays with super_admin.
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key in (
  'finance.invoices.read', 'finance.invoices.write', 'finance.invoices.issue', 'finance.payments.write'
)
where roles.key in ('admin', 'super_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.key = 'finance.invoices.void'
where roles.key = 'super_admin'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Client/project integrity: an invoice's project must belong to the
-- invoice's client. A composite FK needs (id, client_id) to be a key.
-- ---------------------------------------------------------------------

alter table public.operational_projects
  add constraint operational_projects_id_client_unique unique (id, client_id);

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  operational_project_id uuid references public.operational_projects (id) on delete restrict,
  invoice_number text,
  reference text,
  lifecycle_state text not null default 'draft',
  currency text not null,
  tax_rate numeric(5, 2) not null default 0,
  issue_date date,
  due_date date,
  notes text,
  payment_terms text,
  issued_client_snapshot jsonb,
  issued_project_snapshot jsonb,
  issued_issuer_snapshot jsonb,
  issued_subtotal numeric(14, 2),
  issued_tax_amount numeric(14, 2),
  issued_total numeric(14, 2),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  issued_at timestamptz,
  issued_by uuid references public.profiles (id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  void_reason text,
  archived_at timestamptz,
  constraint invoices_project_client_match
    foreign key (operational_project_id, client_id)
    references public.operational_projects (id, client_id),
  constraint invoices_number_unique unique (invoice_number),
  constraint invoices_lifecycle_check check (lifecycle_state in ('draft', 'issued', 'void')),
  constraint invoices_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint invoices_tax_rate_check check (tax_rate >= 0 and tax_rate <= 100),
  constraint invoices_dates_check check (issue_date is null or due_date is null or due_date >= issue_date),
  constraint invoices_reference_check check (reference is null or char_length(reference) <= 120),
  constraint invoices_notes_check check (notes is null or char_length(notes) <= 4000),
  constraint invoices_terms_check check (payment_terms is null or char_length(payment_terms) <= 4000),
  constraint invoices_void_reason_check check (void_reason is null or (btrim(void_reason) <> '' and char_length(void_reason) <= 1000)),
  constraint invoices_version_check check (version > 0),
  constraint invoices_number_format_check check (invoice_number is null or invoice_number ~ '^RENZ-[0-9]{4}-[0-9]{6}$'),
  -- A draft carries none of the official identity; anything issued/void carries all of it.
  constraint invoices_issued_shape_check check (
    (lifecycle_state = 'draft'
      and invoice_number is null and issued_at is null and issued_client_snapshot is null
      and issued_issuer_snapshot is null and issued_total is null and voided_at is null)
    or (lifecycle_state in ('issued', 'void')
      and invoice_number is not null and issue_date is not null and due_date is not null
      and issued_at is not null and issued_client_snapshot is not null
      and issued_issuer_snapshot is not null and issued_subtotal is not null
      and issued_tax_amount is not null and issued_total is not null)
  ),
  constraint invoices_void_shape_check check (
    (lifecycle_state = 'void') = (voided_at is not null and void_reason is not null)
  ),
  constraint invoices_archive_draft_only_check check (archived_at is null or lifecycle_state = 'draft')
);

create index invoices_updated_idx on public.invoices (updated_at desc, id desc);
create index invoices_client_idx on public.invoices (client_id);
create index invoices_project_idx on public.invoices (operational_project_id) where operational_project_id is not null;
create index invoices_lifecycle_idx on public.invoices (lifecycle_state);
create index invoices_due_idx on public.invoices (due_date) where lifecycle_state = 'issued';
create index invoices_created_by_idx on public.invoices (created_by);
create index invoices_updated_by_idx on public.invoices (updated_by);
create index invoices_issued_by_idx on public.invoices (issued_by);
create index invoices_voided_by_idx on public.invoices (voided_by);

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric(12, 3) not null,
  unit_label text,
  unit_price numeric(14, 2) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_line_items_description_check check (btrim(description) <> '' and char_length(description) <= 500),
  constraint invoice_line_items_quantity_check check (quantity > 0),
  constraint invoice_line_items_unit_price_check check (unit_price >= 0),
  constraint invoice_line_items_unit_label_check check (unit_label is null or (btrim(unit_label) <> '' and char_length(unit_label) <= 40)),
  constraint invoice_line_items_sort_check check (sort_order >= 0)
);

create index invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id, sort_order);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
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
  constraint invoice_payments_amount_check check (amount > 0),
  constraint invoice_payments_method_check
    check (payment_method in ('bank_transfer', 'cash', 'mobile_money', 'card', 'cheque', 'other')),
  constraint invoice_payments_reference_check check (reference is null or char_length(reference) <= 120),
  constraint invoice_payments_note_check check (note is null or char_length(note) <= 2000),
  constraint invoice_payments_reversal_shape_check check (
    (reversed_at is null and reversal_reason is null)
    or (reversed_at is not null and reversal_reason is not null and btrim(reversal_reason) <> '')
  )
);

create index invoice_payments_invoice_idx on public.invoice_payments (invoice_id, payment_date desc);
create index invoice_payments_created_by_idx on public.invoice_payments (created_by);
create index invoice_payments_reversed_by_idx on public.invoice_payments (reversed_by);

-- Only the SHA-256 hash of a share token is stored; the raw token exists
-- once, in the RPC result handed to the staff member who generated it.
create table public.invoice_share_links (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  constraint invoice_share_links_hash_check check (token_hash ~ '^[0-9a-f]{64}$')
);

create unique index invoice_share_links_one_active_idx
  on public.invoice_share_links (invoice_id) where revoked_at is null;
create index invoice_share_links_created_by_idx on public.invoice_share_links (created_by);
create index invoice_share_links_revoked_by_idx on public.invoice_share_links (revoked_by);

-- Per-year counter; the ON CONFLICT ... DO UPDATE row lock serializes
-- concurrent issuers, so two invoices can never receive the same number.
create table public.invoice_number_counters (
  year_key integer primary key,
  last_value integer not null default 0,
  constraint invoice_number_counters_year_check check (year_key between 2000 and 2999),
  constraint invoice_number_counters_value_check check (last_value >= 0)
);

-- ---------------------------------------------------------------------
-- Realtime pointer vocabulary
-- ---------------------------------------------------------------------

alter table public.realtime_events drop constraint realtime_events_entity_type_check;
alter table public.realtime_events
  add constraint realtime_events_entity_type_check
  check (entity_type in ('client', 'operational_project', 'invoice'));
alter table public.realtime_events drop constraint realtime_events_action_check;
alter table public.realtime_events
  add constraint realtime_events_action_check
  check (action in (
    'created', 'updated', 'status_changed', 'phase_changed', 'priority_changed',
    'case_study_linked', 'case_study_unlinked', 'archived', 'note_created',
    'issued', 'voided', 'payment_recorded', 'payment_reversed', 'share_created', 'share_revoked'
  ));

-- ---------------------------------------------------------------------
-- RLS: default deny on every finance table
-- ---------------------------------------------------------------------

alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_share_links enable row level security;
alter table public.invoice_number_counters enable row level security;

revoke all on public.invoices from public, anon, authenticated;
revoke all on public.invoice_line_items from public, anon, authenticated;
revoke all on public.invoice_payments from public, anon, authenticated;
revoke all on public.invoice_share_links from public, anon, authenticated;
revoke all on public.invoice_number_counters from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Immutability triggers (financial identity is frozen once issued)
-- ---------------------------------------------------------------------

create or replace function private.enforce_invoice_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.lifecycle_state = 'draft' then
    return new;
  end if;
  -- Issued or void: only the void transition and bookkeeping columns may move.
  if new.client_id is distinct from old.client_id
    or new.operational_project_id is distinct from old.operational_project_id
    or new.invoice_number is distinct from old.invoice_number
    or new.reference is distinct from old.reference
    or new.currency is distinct from old.currency
    or new.tax_rate is distinct from old.tax_rate
    or new.issue_date is distinct from old.issue_date
    or new.due_date is distinct from old.due_date
    or new.notes is distinct from old.notes
    or new.payment_terms is distinct from old.payment_terms
    or new.issued_client_snapshot is distinct from old.issued_client_snapshot
    or new.issued_project_snapshot is distinct from old.issued_project_snapshot
    or new.issued_issuer_snapshot is distinct from old.issued_issuer_snapshot
    or new.issued_subtotal is distinct from old.issued_subtotal
    or new.issued_tax_amount is distinct from old.issued_tax_amount
    or new.issued_total is distinct from old.issued_total
    or new.issued_at is distinct from old.issued_at
    or new.issued_by is distinct from old.issued_by
    or new.archived_at is distinct from old.archived_at
  then
    raise exception using errcode = '55000', message = 'issued invoice financial identity is immutable';
  end if;
  if old.lifecycle_state = 'void' and new.lifecycle_state <> 'void' then
    raise exception using errcode = '55000', message = 'a void invoice cannot be reopened';
  end if;
  if old.lifecycle_state = 'issued' and new.lifecycle_state = 'draft' then
    raise exception using errcode = '55000', message = 'an issued invoice cannot return to draft';
  end if;
  return new;
end;
$$;

create trigger invoices_enforce_immutability
before update on public.invoices
for each row execute function private.enforce_invoice_immutability();

create or replace function private.enforce_invoice_lines_draft_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  if exists (
    select 1 from public.invoices where id = target_invoice and lifecycle_state <> 'draft'
  ) then
    raise exception using errcode = '55000', message = 'line items of an issued invoice are immutable';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger invoice_line_items_draft_only
before insert or update or delete on public.invoice_line_items
for each row execute function private.enforce_invoice_lines_draft_only();

create or replace function private.enforce_invoice_payment_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'payments are never deleted; reverse them';
  end if;
  if new.invoice_id is distinct from old.invoice_id
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
    raise exception using errcode = '55000', message = 'recorded payments are immutable; only an unreversed payment may be reversed once';
  end if;
  return new;
end;
$$;

create trigger invoice_payments_history
before update or delete on public.invoice_payments
for each row execute function private.enforce_invoice_payment_history();

revoke all on function private.enforce_invoice_immutability() from public, anon, authenticated;
revoke all on function private.enforce_invoice_lines_draft_only() from public, anon, authenticated;
revoke all on function private.enforce_invoice_payment_history() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Canonical finance projection (one place for money/status logic)
-- ---------------------------------------------------------------------

create or replace function private.invoice_financials(target_invoice_id uuid)
returns table (
  subtotal numeric,
  tax_amount numeric,
  total numeric,
  paid_amount numeric,
  balance_due numeric,
  payment_state text,
  is_overdue boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with invoice as (
    select * from public.invoices where id = target_invoice_id
  ),
  lines as (
    select coalesce(sum(round(quantity * unit_price, 2)), 0)::numeric(14, 2) as subtotal
    from public.invoice_line_items where invoice_id = target_invoice_id
  ),
  money as (
    select
      case when invoice.lifecycle_state = 'draft' then lines.subtotal else invoice.issued_subtotal end as subtotal,
      case when invoice.lifecycle_state = 'draft'
        then round(lines.subtotal * invoice.tax_rate / 100, 2) else invoice.issued_tax_amount end as tax_amount,
      case when invoice.lifecycle_state = 'draft'
        then lines.subtotal + round(lines.subtotal * invoice.tax_rate / 100, 2) else invoice.issued_total end as total,
      coalesce((
        select sum(amount) from public.invoice_payments
        where invoice_id = target_invoice_id and reversed_at is null
      ), 0)::numeric(14, 2) as paid_amount,
      invoice.lifecycle_state,
      invoice.due_date
    from invoice cross join lines
  )
  select
    money.subtotal,
    money.tax_amount,
    money.total,
    money.paid_amount,
    (money.total - money.paid_amount)::numeric(14, 2) as balance_due,
    case
      when money.paid_amount <= 0 then 'unpaid'
      when money.paid_amount >= money.total then 'paid'
      else 'partially_paid'
    end as payment_state,
    (money.lifecycle_state = 'issued'
      and money.due_date < current_date
      and money.total - money.paid_amount > 0) as is_overdue
  from money;
$$;

revoke all on function private.invoice_financials(uuid) from public, anon, authenticated;

-- Shared document projection used by the admin print/PDF view AND the
-- token-scoped client share page — one issued-invoice model, never two.
-- Contains only what belongs on the document: snapshots, lines, money,
-- non-reversed payments (date/amount/method only), notes/terms.
create or replace function private.invoice_document(target_invoice_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', invoice.id,
    'invoice_number', invoice.invoice_number,
    'lifecycle_state', invoice.lifecycle_state,
    'currency', invoice.currency,
    'tax_rate', invoice.tax_rate,
    'issue_date', invoice.issue_date,
    'due_date', invoice.due_date,
    'reference', invoice.reference,
    'notes', invoice.notes,
    'payment_terms', invoice.payment_terms,
    'voided_at', invoice.voided_at,
    'issuer', invoice.issued_issuer_snapshot,
    'client', invoice.issued_client_snapshot,
    'project', invoice.issued_project_snapshot,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', line.description,
        'quantity', line.quantity,
        'unit_label', line.unit_label,
        'unit_price', line.unit_price,
        'line_total', round(line.quantity * line.unit_price, 2)
      ) order by line.sort_order, line.created_at)
      from public.invoice_line_items as line where line.invoice_id = invoice.id
    ), '[]'::jsonb),
    'subtotal', money.subtotal,
    'tax_amount', money.tax_amount,
    'total', money.total,
    'paid_amount', money.paid_amount,
    'balance_due', money.balance_due,
    'payment_state', money.payment_state,
    'is_overdue', money.is_overdue,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'payment_date', payment.payment_date,
        'amount', payment.amount,
        'payment_method', payment.payment_method
      ) order by payment.payment_date, payment.created_at)
      from public.invoice_payments as payment
      where payment.invoice_id = invoice.id and payment.reversed_at is null
    ), '[]'::jsonb)
  )
  from public.invoices as invoice
  cross join lateral private.invoice_financials(invoice.id) as money
  where invoice.id = target_invoice_id;
$$;

revoke all on function private.invoice_document(uuid) from public, anon, authenticated;

-- Issuer identity frozen onto every issued invoice. Only verified,
-- authorized public identity is included; no tax/company registration,
-- office, or bank details are invented. C7 makes this Admin-managed;
-- snapshots taken now will not change when it does.
create or replace function private.invoice_issuer_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'name', 'RENZ Construction Services Ltd',
    'email', 'renzconstruuction@gmail.com',
    'whatsapp', '+44 7412 853143',
    'tax_label', 'Tax'
  );
$$;

revoke all on function private.invoice_issuer_snapshot() from public, anon, authenticated;

-- Shared line-item replacement for create/update (draft only; caller holds
-- the invoice row lock). Accepts a bounded JSON array and rejects anything
-- outside the admitted shape before touching the table.
create or replace function private.replace_invoice_lines(target_invoice_id uuid, lines jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  line jsonb;
  position integer := 0;
  quantity_value numeric;
  price_value numeric;
  description_value text;
  unit_value text;
begin
  if lines is null then
    lines := '[]'::jsonb;
  end if;
  if jsonb_typeof(lines) <> 'array' then
    return private.failure('invalid_input', 'lines', 'Line items must be a list.');
  end if;
  if jsonb_array_length(lines) > 100 then
    return private.failure('invalid_input', 'lines', 'An invoice may carry at most 100 line items.');
  end if;

  delete from public.invoice_line_items where invoice_id = target_invoice_id;

  for line in select * from jsonb_array_elements(lines) loop
    description_value := nullif(btrim(coalesce(line ->> 'description', '')), '');
    unit_value := nullif(btrim(coalesce(line ->> 'unit_label', '')), '');
    begin
      quantity_value := (line ->> 'quantity')::numeric;
      price_value := (line ->> 'unit_price')::numeric;
    exception when others then
      return private.failure('invalid_input', 'lines', 'Line ' || position + 1 || ': quantity and unit price must be numbers.');
    end;
    if description_value is null or char_length(description_value) > 500 then
      return private.failure('invalid_input', 'lines', 'Line ' || position + 1 || ': a description of at most 500 characters is required.');
    end if;
    if quantity_value is null or quantity_value <= 0 or quantity_value > 999999999 then
      return private.failure('invalid_input', 'lines', 'Line ' || position + 1 || ': quantity must be greater than zero.');
    end if;
    if price_value is null or price_value < 0 or price_value > 999999999999 then
      return private.failure('invalid_input', 'lines', 'Line ' || position + 1 || ': unit price cannot be negative.');
    end if;
    if unit_value is not null and char_length(unit_value) > 40 then
      return private.failure('invalid_input', 'lines', 'Line ' || position + 1 || ': unit label is too long.');
    end if;
    insert into public.invoice_line_items (invoice_id, description, quantity, unit_label, unit_price, sort_order)
    values (target_invoice_id, description_value, round(quantity_value, 3), unit_value, round(price_value, 2), position);
    position := position + 1;
  end loop;

  return null;
end;
$$;

revoke all on function private.replace_invoice_lines(uuid, jsonb) from public, anon, authenticated;

-- Common draft-field validation shared by create/update.
create or replace function private.validate_invoice_draft_fields(
  target_client_id uuid,
  target_project_id uuid,
  target_currency text,
  target_tax_rate numeric,
  target_reference text,
  target_notes text,
  target_payment_terms text,
  target_issue_date date,
  target_due_date date
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if target_client_id is null or not exists (
    select 1 from public.clients where id = target_client_id and archived_at is null
  ) then
    return private.failure('not_found', 'client_id', 'Select an active client.');
  end if;
  if target_project_id is not null and not exists (
    select 1 from public.operational_projects
    where id = target_project_id and client_id = target_client_id
  ) then
    return private.failure('invalid_relationship', 'operational_project_id', 'The selected project does not belong to this client.');
  end if;
  if target_currency is null or target_currency !~ '^[A-Z]{3}$' then
    return private.failure('invalid_input', 'currency', 'Use a 3-letter currency code.');
  end if;
  if target_tax_rate is null or target_tax_rate < 0 or target_tax_rate > 100 then
    return private.failure('invalid_input', 'tax_rate', 'Tax rate must be between 0 and 100.');
  end if;
  if target_reference is not null and char_length(target_reference) > 120 then
    return private.failure('invalid_input', 'reference', 'Reference is too long.');
  end if;
  if target_notes is not null and char_length(target_notes) > 4000 then
    return private.failure('invalid_input', 'notes', 'Notes are too long.');
  end if;
  if target_payment_terms is not null and char_length(target_payment_terms) > 4000 then
    return private.failure('invalid_input', 'payment_terms', 'Payment terms are too long.');
  end if;
  if target_issue_date is not null and target_due_date is not null and target_due_date < target_issue_date then
    return private.failure('invalid_input', 'due_date', 'Due date cannot precede the issue date.');
  end if;
  return null;
end;
$$;

revoke all on function private.validate_invoice_draft_fields(uuid, uuid, text, numeric, text, text, text, date, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Read facades
-- ---------------------------------------------------------------------

create or replace function public.admin_list_invoices(
  search_query text default null,
  client_id_filter uuid default null,
  project_id_filter uuid default null,
  lifecycle_filter text default null,
  payment_filter text default null,
  overdue_only boolean default false,
  currency_filter text default null,
  issued_from date default null,
  issued_to date default null,
  include_archived boolean default false,
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
  if not private.has_permission('finance.invoices.read') then
    raise exception using errcode = '42501', message = 'invoice list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'invoice page size is outside the admitted range';
  end if;
  if lifecycle_filter is not null and lifecycle_filter not in ('draft', 'issued', 'void') then
    raise exception using errcode = '22023', message = 'invoice lifecycle filter is not admitted';
  end if;
  if payment_filter is not null and payment_filter not in ('unpaid', 'partially_paid', 'paid') then
    raise exception using errcode = '22023', message = 'invoice payment filter is not admitted';
  end if;
  if currency_filter is not null and currency_filter !~ '^[A-Z]{3}$' then
    raise exception using errcode = '22023', message = 'invoice currency filter is not admitted';
  end if;
  if normalized_query is not null and char_length(normalized_query) > 100 then
    raise exception using errcode = '22023', message = 'invoice search query is too long';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'invoice cursor is incomplete';
  end if;

  for item in
    select
      invoice.id, invoice.invoice_number, invoice.reference, invoice.lifecycle_state,
      invoice.currency, invoice.issue_date, invoice.due_date, invoice.updated_at,
      invoice.version, invoice.archived_at,
      jsonb_build_object('id', client.id, 'full_name', client.full_name) as client,
      case when project.id is null then null
        else jsonb_build_object('id', project.id, 'title', project.title) end as project,
      money.total, money.paid_amount, money.balance_due, money.payment_state, money.is_overdue
    from public.invoices as invoice
    join public.clients as client on client.id = invoice.client_id
    left join public.operational_projects as project on project.id = invoice.operational_project_id
    cross join lateral private.invoice_financials(invoice.id) as money
    where (include_archived or invoice.archived_at is null)
      and (client_id_filter is null or invoice.client_id = client_id_filter)
      and (project_id_filter is null or invoice.operational_project_id = project_id_filter)
      and (lifecycle_filter is null or invoice.lifecycle_state = lifecycle_filter)
      and (payment_filter is null or (invoice.lifecycle_state = 'issued' and money.payment_state = payment_filter))
      and (not overdue_only or money.is_overdue)
      and (currency_filter is null or invoice.currency = currency_filter)
      and (issued_from is null or invoice.issue_date >= issued_from)
      and (issued_to is null or invoice.issue_date <= issued_to)
      and (
        normalized_query is null
        or invoice.invoice_number ilike '%' || normalized_query || '%'
        or invoice.reference ilike '%' || normalized_query || '%'
        or client.full_name ilike '%' || normalized_query || '%'
        or project.title ilike '%' || normalized_query || '%'
      )
      and (cursor_updated_at is null or (invoice.updated_at, invoice.id) < (cursor_updated_at, cursor_id))
    order by invoice.updated_at desc, invoice.id desc
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
      'invoice_number', item.invoice_number,
      'reference', item.reference,
      'lifecycle_state', item.lifecycle_state,
      'currency', item.currency,
      'issue_date', item.issue_date,
      'due_date', item.due_date,
      'updated_at', item.updated_at,
      'version', item.version,
      'archived_at', item.archived_at,
      'client', item.client,
      'project', item.project,
      'total', item.total,
      'paid_amount', item.paid_amount,
      'balance_due', item.balance_due,
      'payment_state', item.payment_state,
      'is_overdue', item.is_overdue
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

create or replace function public.admin_get_invoice(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('finance.invoices.read') then
    raise exception using errcode = '42501', message = 'invoice detail is not authorized';
  end if;

  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', invoice.id,
      'invoice_number', invoice.invoice_number,
      'reference', invoice.reference,
      'lifecycle_state', invoice.lifecycle_state,
      'currency', invoice.currency,
      'tax_rate', invoice.tax_rate,
      'issue_date', invoice.issue_date,
      'due_date', invoice.due_date,
      'notes', invoice.notes,
      'payment_terms', invoice.payment_terms,
      'version', invoice.version,
      'created_at', invoice.created_at,
      'updated_at', invoice.updated_at,
      'issued_at', invoice.issued_at,
      'voided_at', invoice.voided_at,
      'void_reason', invoice.void_reason,
      'archived_at', invoice.archived_at
    ),
    'client', jsonb_build_object(
      'id', client.id, 'full_name', client.full_name, 'company', client.company,
      'email', client.email, 'phone_display', client.phone_display, 'archived_at', client.archived_at
    ),
    'project', case when project.id is null then null else jsonb_build_object(
      'id', project.id, 'title', project.title, 'status', project.status, 'archived_at', project.archived_at
    ) end,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', line.id, 'description', line.description, 'quantity', line.quantity,
        'unit_label', line.unit_label, 'unit_price', line.unit_price,
        'line_total', round(line.quantity * line.unit_price, 2), 'sort_order', line.sort_order
      ) order by line.sort_order, line.created_at)
      from public.invoice_line_items as line where line.invoice_id = invoice.id
    ), '[]'::jsonb),
    'financials', jsonb_build_object(
      'subtotal', money.subtotal, 'tax_amount', money.tax_amount, 'total', money.total,
      'paid_amount', money.paid_amount, 'balance_due', money.balance_due,
      'payment_state', money.payment_state, 'is_overdue', money.is_overdue
    ),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', payment.id, 'amount', payment.amount, 'payment_date', payment.payment_date,
        'payment_method', payment.payment_method, 'reference', payment.reference, 'note', payment.note,
        'created_at', payment.created_at, 'recorded_by', recorder.display_name,
        'reversed_at', payment.reversed_at, 'reversal_reason', payment.reversal_reason,
        'reversed_by', reverser.display_name
      ) order by payment.payment_date desc, payment.created_at desc)
      from public.invoice_payments as payment
      left join public.profiles as recorder on recorder.id = payment.created_by
      left join public.profiles as reverser on reverser.id = payment.reversed_by
      where payment.invoice_id = invoice.id
    ), '[]'::jsonb),
    'share', (
      select jsonb_build_object('created_at', link.created_at, 'created_by', creator.display_name)
      from public.invoice_share_links as link
      left join public.profiles as creator on creator.id = link.created_by
      where link.invoice_id = invoice.id and link.revoked_at is null
      limit 1
    ),
    'document', case when invoice.lifecycle_state = 'draft' then null else private.invoice_document(invoice.id) end,
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action', log.action, 'outcome', log.outcome, 'occurred_at', log.occurred_at,
        'actor', profile.display_name, 'metadata', log.metadata
      ) order by log.occurred_at desc)
      from (
        select * from public.audit_logs
        where entity_type = 'invoice' and entity_id = target_id::text
        order by occurred_at desc
        limit 30
      ) as log
      left join public.profiles as profile on profile.id = log.actor_id
    ), '[]'::jsonb)
  ) into result
  from public.invoices as invoice
  join public.clients as client on client.id = invoice.client_id
  left join public.operational_projects as project on project.id = invoice.operational_project_id
  cross join lateral private.invoice_financials(invoice.id) as money
  where invoice.id = target_id;

  if result is null then
    raise exception using errcode = 'P0002', message = 'invoice does not exist';
  end if;
  return result;
end;
$$;

-- Bounded per-relationship view + per-currency summary (Client 360 and the
-- Project Command Center Invoices tabs). Never sums across currencies.
create or replace function private.invoice_relationship_summary(
  target_client_id uuid,
  target_project_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    select invoice.*, money.total, money.paid_amount, money.balance_due, money.payment_state, money.is_overdue,
      project.title as project_title
    from public.invoices as invoice
    left join public.operational_projects as project on project.id = invoice.operational_project_id
    cross join lateral private.invoice_financials(invoice.id) as money
    where invoice.archived_at is null
      and (target_client_id is null or invoice.client_id = target_client_id)
      and (target_project_id is null or invoice.operational_project_id = target_project_id)
  )
  select jsonb_build_object(
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'invoice_number', invoice_number, 'lifecycle_state', lifecycle_state,
        'currency', currency, 'issue_date', issue_date, 'due_date', due_date,
        'total', total, 'paid_amount', paid_amount, 'balance_due', balance_due,
        'payment_state', payment_state, 'is_overdue', is_overdue,
        'project', case when operational_project_id is null then null
          else jsonb_build_object('id', operational_project_id, 'title', project_title) end
      ) order by updated_at desc)
      from (select * from scoped order by updated_at desc limit 50) as recent
    ), '[]'::jsonb),
    'summary_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object(
        'currency', currency,
        'invoiced', invoiced, 'paid', paid, 'outstanding', outstanding, 'invoice_count', invoice_count
      ) order by currency)
      from (
        select currency,
          sum(total)::numeric(14, 2) as invoiced,
          sum(paid_amount)::numeric(14, 2) as paid,
          sum(balance_due)::numeric(14, 2) as outstanding,
          count(*) as invoice_count
        from scoped where lifecycle_state = 'issued'
        group by currency
      ) as totals
    ), '[]'::jsonb)
  );
$$;

revoke all on function private.invoice_relationship_summary(uuid, uuid) from public, anon, authenticated;

create or replace function public.admin_client_invoices(target_client_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('finance.invoices.read') then
    raise exception using errcode = '42501', message = 'client invoices are not authorized';
  end if;
  return private.invoice_relationship_summary(target_client_id, null);
end;
$$;

create or replace function public.admin_project_invoices(target_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission('finance.invoices.read') then
    raise exception using errcode = '42501', message = 'project invoices are not authorized';
  end if;
  return private.invoice_relationship_summary(null, target_project_id);
end;
$$;

-- Finance overview (Control Room + /admin/finance). One bounded aggregate;
-- every monetary figure is grouped by currency. Windows are documented in
-- docs/CLAUDE_C5_FINANCE_ARCHITECTURE.md: due soon = due within 7 days with
-- a balance; paid recently = payments dated in the last 30 days.
create or replace function public.admin_finance_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  due_soon_days constant integer := 7;
  recent_days constant integer := 30;
  result jsonb;
begin
  if not private.has_permission('finance.invoices.read') then
    raise exception using errcode = '42501', message = 'finance overview is not authorized';
  end if;

  with issued as (
    select invoice.*, money.total, money.paid_amount, money.balance_due, money.payment_state, money.is_overdue
    from public.invoices as invoice
    cross join lateral private.invoice_financials(invoice.id) as money
    where invoice.lifecycle_state = 'issued'
  )
  select jsonb_build_object(
    'due_soon_window_days', due_soon_days,
    'recent_window_days', recent_days,
    'draft_count', (select count(*) from public.invoices where lifecycle_state = 'draft' and archived_at is null),
    'issued_count', (select count(*) from issued),
    'void_count', (select count(*) from public.invoices where lifecycle_state = 'void'),
    'overdue_count', (select count(*) from issued where is_overdue),
    'partially_paid_count', (select count(*) from issued where payment_state = 'partially_paid'),
    'due_soon_count', (
      select count(*) from issued
      where balance_due > 0 and due_date between current_date and current_date + due_soon_days
    ),
    'outstanding_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'invoice_count', invoice_count) order by currency)
      from (
        select currency, sum(balance_due)::numeric(14, 2) as total, count(*) as invoice_count
        from issued where balance_due > 0 group by currency
      ) as t
    ), '[]'::jsonb),
    'overdue_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'invoice_count', invoice_count) order by currency)
      from (
        select currency, sum(balance_due)::numeric(14, 2) as total, count(*) as invoice_count
        from issued where is_overdue group by currency
      ) as t
    ), '[]'::jsonb),
    'invoiced_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'invoice_count', invoice_count) order by currency)
      from (
        select currency, sum(total)::numeric(14, 2) as total, count(*) as invoice_count
        from issued group by currency
      ) as t
    ), '[]'::jsonb),
    'paid_recently_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'payment_count', payment_count) order by currency)
      from (
        select invoice.currency, sum(payment.amount)::numeric(14, 2) as total, count(*) as payment_count
        from public.invoice_payments as payment
        join public.invoices as invoice on invoice.id = payment.invoice_id
        where payment.reversed_at is null and payment.payment_date >= current_date - recent_days
        group by invoice.currency
      ) as t
    ), '[]'::jsonb),
    'due_soon', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'invoice_number', invoice_number, 'currency', currency,
        'balance_due', balance_due, 'due_date', due_date
      ) order by due_date)
      from (
        select * from issued
        where balance_due > 0 and due_date between current_date and current_date + due_soon_days
        order by due_date limit 10
      ) as t
    ), '[]'::jsonb),
    'recent_payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', payment.id, 'invoice_id', invoice.id, 'invoice_number', invoice.invoice_number,
        'currency', invoice.currency, 'amount', payment.amount,
        'payment_date', payment.payment_date, 'payment_method', payment.payment_method
      ) order by payment.payment_date desc, payment.created_at desc)
      from (
        select * from public.invoice_payments where reversed_at is null
        order by payment_date desc, created_at desc limit 10
      ) as payment
      join public.invoices as invoice on invoice.id = payment.invoice_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

-- Deterministic finance action queue (docs/CLAUDE_C5_FINANCE_ARCHITECTURE.md):
-- rank 0 overdue (partially paid overdue flagged separately), rank 1 due
-- within 7 days with a balance, rank 2 drafts untouched for 14+ days.
create or replace function public.admin_finance_action_queue(limit_count integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  due_soon_days constant integer := 7;
  stale_draft_days constant integer := 14;
  result jsonb;
begin
  if not private.has_permission('finance.invoices.read') then
    raise exception using errcode = '42501', message = 'finance action queue is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 100 then
    raise exception using errcode = '22023', message = 'finance action queue limit is outside the admitted range';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', item.kind, 'invoice_id', item.id, 'label', item.label,
    'detail', item.detail, 'currency', item.currency, 'amount', item.amount
  ) order by item.rank, item.due_date nulls last, item.updated_at desc), '[]'::jsonb)
  into result
  from (
    select invoice.id, invoice.invoice_number as label, invoice.currency, money.balance_due as amount,
      invoice.due_date, invoice.updated_at,
      case when money.payment_state = 'partially_paid' then 'overdue_partially_paid' else 'overdue' end as kind,
      0 as rank,
      'Was due ' || to_char(invoice.due_date, 'YYYY-MM-DD') as detail
    from public.invoices as invoice
    cross join lateral private.invoice_financials(invoice.id) as money
    where invoice.lifecycle_state = 'issued' and money.is_overdue

    union all
    select invoice.id, invoice.invoice_number, invoice.currency, money.balance_due,
      invoice.due_date, invoice.updated_at, 'due_soon', 1,
      'Due ' || to_char(invoice.due_date, 'YYYY-MM-DD')
    from public.invoices as invoice
    cross join lateral private.invoice_financials(invoice.id) as money
    where invoice.lifecycle_state = 'issued' and money.balance_due > 0
      and invoice.due_date between current_date and current_date + due_soon_days

    union all
    select invoice.id, 'Draft', invoice.currency, money.total,
      null::date, invoice.updated_at, 'stale_draft', 2,
      'Draft untouched since ' || to_char(invoice.updated_at, 'YYYY-MM-DD')
    from public.invoices as invoice
    cross join lateral private.invoice_financials(invoice.id) as money
    where invoice.lifecycle_state = 'draft' and invoice.archived_at is null
      and invoice.updated_at < now() - make_interval(days => stale_draft_days)
  ) as item
  limit limit_count;

  return result;
end;
$$;

-- Token-scoped client projection: the ONLY non-staff finance read path.
-- Resolves a raw token by hash to one issued (or void) invoice with an
-- unrevoked link; returns the shared document model or null. Constant
-- shape on every miss; nothing enumerable.
create or replace function public.public_invoice_by_share_token(raw_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if raw_token is null or raw_token !~ '^[A-Za-z0-9_-]{40,64}$' then
    return null;
  end if;
  select link.invoice_id into target
  from public.invoice_share_links as link
  join public.invoices as invoice on invoice.id = link.invoice_id
  where link.token_hash = encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex')
    and link.revoked_at is null
    and invoice.lifecycle_state in ('issued', 'void');
  if target is null then
    return null;
  end if;
  return private.invoice_document(target);
end;
$$;

-- ---------------------------------------------------------------------
-- Write facades
-- ---------------------------------------------------------------------

create or replace function public.create_admin_invoice(
  target_client_id uuid,
  target_project_id uuid default null,
  target_currency text default null,
  target_tax_rate numeric default 0,
  target_reference text default null,
  target_notes text default null,
  target_payment_terms text default null,
  target_issue_date date default null,
  target_due_date date default null,
  lines jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  problem jsonb;
  normalized_currency text := upper(nullif(btrim(target_currency), ''));
begin
  if not private.has_permission('finance.invoices.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.write is required.')));
  end if;
  problem := private.validate_invoice_draft_fields(
    target_client_id, target_project_id, normalized_currency, target_tax_rate,
    target_reference, target_notes, target_payment_terms, target_issue_date, target_due_date
  );
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;

  insert into public.invoices (
    client_id, operational_project_id, currency, tax_rate, reference, notes, payment_terms,
    issue_date, due_date, created_by, updated_by
  ) values (
    target_client_id, target_project_id, normalized_currency, round(target_tax_rate, 2),
    nullif(btrim(target_reference), ''), nullif(btrim(target_notes), ''), nullif(btrim(target_payment_terms), ''),
    target_issue_date, target_due_date, auth.uid(), auth.uid()
  ) returning id into new_id;

  problem := private.replace_invoice_lines(new_id, lines);
  if problem is not null then
    raise exception using errcode = 'P0001', message = coalesce(problem ->> 'detail', 'Line items are invalid.');
  end if;

  perform private.s4_audit('invoice.create', 'invoice', new_id::text, 'success',
    jsonb_build_object('currency', normalized_currency, 'client_id', target_client_id, 'project_id', target_project_id));
  perform private.emit_realtime_event('invoice', new_id, 'created');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
exception when sqlstate 'P0001' then
  return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'lines', sqlerrm)));
end;
$$;

create or replace function public.update_admin_invoice(
  target_id uuid,
  expected_version integer,
  target_client_id uuid,
  target_currency text,
  target_tax_rate numeric,
  lines jsonb,
  target_project_id uuid default null,
  target_reference text default null,
  target_notes text default null,
  target_payment_terms text default null,
  target_issue_date date default null,
  target_due_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  problem jsonb;
  normalized_currency text := upper(nullif(btrim(target_currency), ''));
begin
  if not private.has_permission('finance.invoices.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.write is required.')));
  end if;
  select * into current from public.invoices where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  if current.lifecycle_state <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only draft invoices can be edited. Void and reissue an issued invoice instead.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer invoice version is available.')));
  end if;
  problem := private.validate_invoice_draft_fields(
    target_client_id, target_project_id, normalized_currency, target_tax_rate,
    target_reference, target_notes, target_payment_terms, target_issue_date, target_due_date
  );
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;

  update public.invoices
     set client_id = target_client_id,
         operational_project_id = target_project_id,
         currency = normalized_currency,
         tax_rate = round(target_tax_rate, 2),
         reference = nullif(btrim(target_reference), ''),
         notes = nullif(btrim(target_notes), ''),
         payment_terms = nullif(btrim(target_payment_terms), ''),
         issue_date = target_issue_date,
         due_date = target_due_date,
         updated_by = auth.uid(),
         updated_at = now(),
         version = version + 1
   where id = target_id;

  problem := private.replace_invoice_lines(target_id, lines);
  if problem is not null then
    raise exception using errcode = 'P0001', message = coalesce(problem ->> 'detail', 'Line items are invalid.');
  end if;

  perform private.s4_audit('invoice.update', 'invoice', target_id::text, 'success',
    jsonb_build_object('currency', normalized_currency, 'line_count', coalesce(jsonb_array_length(lines), 0)));
  perform private.emit_realtime_event('invoice', target_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
exception when sqlstate 'P0001' then
  return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'lines', sqlerrm)));
end;
$$;

-- ISSUE: one atomic transaction — lock, validate, freeze snapshots + totals,
-- take the next number, flip state. A second concurrent issuer of the same
-- draft waits on the row lock and then sees version_conflict/invalid_state;
-- a failure anywhere rolls the whole thing (number included) back.
create or replace function public.issue_admin_invoice(
  target_id uuid,
  expected_version integer,
  target_issue_date date,
  target_due_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  client_row record;
  project_snapshot jsonb := null;
  money record;
  line_count integer;
  issue_year integer;
  sequence_value integer;
  number_value text;
begin
  if not private.has_permission('finance.invoices.issue') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.issue is required.')));
  end if;
  select * into current from public.invoices where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  if current.lifecycle_state <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'This invoice has already been issued.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'An archived draft cannot be issued.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer invoice version is available.')));
  end if;
  if target_issue_date is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'issue_date', 'An issue date is required.')));
  end if;
  if target_due_date is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'due_date', 'A due date is required.')));
  end if;
  if target_due_date < target_issue_date then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'due_date', 'Due date cannot precede the issue date.')));
  end if;
  select count(*) into line_count from public.invoice_line_items where invoice_id = target_id;
  if line_count = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'lines', 'Add at least one line item before issuing.')));
  end if;

  select * into client_row from public.clients where id = current.client_id;
  if current.operational_project_id is not null then
    select jsonb_build_object('title', project.title, 'id', project.id) into project_snapshot
    from public.operational_projects as project where project.id = current.operational_project_id;
  end if;
  select * into money from private.invoice_financials(target_id);

  issue_year := extract(year from target_issue_date)::integer;
  insert into public.invoice_number_counters as counter (year_key, last_value)
  values (issue_year, 1)
  on conflict (year_key) do update set last_value = counter.last_value + 1
  returning counter.last_value into sequence_value;
  number_value := 'RENZ-' || issue_year::text || '-' || lpad(sequence_value::text, 6, '0');

  update public.invoices
     set lifecycle_state = 'issued',
         invoice_number = number_value,
         issue_date = target_issue_date,
         due_date = target_due_date,
         issued_client_snapshot = jsonb_strip_nulls(jsonb_build_object(
           'full_name', client_row.full_name,
           'company', client_row.company,
           'address', client_row.address,
           'email', client_row.email,
           'phone', client_row.phone_display
         )),
         issued_project_snapshot = project_snapshot,
         issued_issuer_snapshot = private.invoice_issuer_snapshot(),
         issued_subtotal = money.subtotal,
         issued_tax_amount = money.tax_amount,
         issued_total = money.total,
         issued_at = now(),
         issued_by = auth.uid(),
         updated_by = auth.uid(),
         updated_at = now(),
         version = version + 1
   where id = target_id;

  perform private.s4_audit('invoice.issue', 'invoice', target_id::text, 'success',
    jsonb_build_object('invoice_number', number_value, 'currency', current.currency, 'total', money.total,
      'transition', 'draft->issued'));
  perform private.s4_audit('invoice.issue', 'client', current.client_id::text, 'success',
    jsonb_build_object('invoice_id', target_id, 'invoice_number', number_value));
  if current.operational_project_id is not null then
    perform private.s4_audit('invoice.issue', 'operational_project', current.operational_project_id::text, 'success',
      jsonb_build_object('invoice_id', target_id, 'invoice_number', number_value));
  end if;
  perform private.emit_realtime_event('invoice', target_id, 'issued');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'invoice_number', number_value);
end;
$$;

create or replace function public.void_admin_invoice(
  target_id uuid,
  expected_version integer,
  reason text
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
  if not private.has_permission('finance.invoices.void') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.void is required.')));
  end if;
  if reason is null or btrim(reason) = '' or char_length(reason) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'A void reason is required.')));
  end if;
  select * into current from public.invoices where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  if current.lifecycle_state <> 'issued' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only issued invoices can be voided.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer invoice version is available.')));
  end if;
  select coalesce(sum(amount), 0) into effective_paid
  from public.invoice_payments where invoice_id = target_id and reversed_at is null;
  if effective_paid > 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'payments', 'Reverse the recorded payments before voiding this invoice.')));
  end if;

  update public.invoices
     set lifecycle_state = 'void',
         voided_at = now(),
         voided_by = auth.uid(),
         void_reason = btrim(reason),
         updated_by = auth.uid(),
         updated_at = now(),
         version = version + 1
   where id = target_id;

  perform private.s4_audit('invoice.void', 'invoice', target_id::text, 'success',
    jsonb_build_object('invoice_number', current.invoice_number, 'transition', 'issued->void'));
  perform private.s4_audit('invoice.void', 'client', current.client_id::text, 'success',
    jsonb_build_object('invoice_id', target_id, 'invoice_number', current.invoice_number));
  if current.operational_project_id is not null then
    perform private.s4_audit('invoice.void', 'operational_project', current.operational_project_id::text, 'success',
      jsonb_build_object('invoice_id', target_id, 'invoice_number', current.invoice_number));
  end if;
  perform private.emit_realtime_event('invoice', target_id, 'voided');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.archive_admin_invoice(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
begin
  if not private.has_permission('finance.invoices.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.write is required.')));
  end if;
  select * into current from public.invoices where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  if current.lifecycle_state <> 'draft' or current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only an active draft can be archived.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer invoice version is available.')));
  end if;
  update public.invoices
     set archived_at = now(), updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('invoice.archive', 'invoice', target_id::text, 'success', '{}'::jsonb);
  perform private.emit_realtime_event('invoice', target_id, 'archived');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- Duplicate to a new draft: starter values only (client, project, currency,
-- tax rate, lines, notes/terms, reference). Never the number, dates,
-- payments, share link, or snapshots.
create or replace function public.duplicate_admin_invoice(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source record;
  new_id uuid;
begin
  if not private.has_permission('finance.invoices.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.write is required.')));
  end if;
  select * into source from public.invoices where id = target_id;
  if source.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  if exists (select 1 from public.clients where id = source.client_id and archived_at is not null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'client_id', 'The client is archived; create the invoice from an active client.')));
  end if;

  insert into public.invoices (
    client_id, operational_project_id, currency, tax_rate, reference, notes, payment_terms, created_by, updated_by
  ) values (
    source.client_id, source.operational_project_id, source.currency, source.tax_rate,
    source.reference, source.notes, source.payment_terms, auth.uid(), auth.uid()
  ) returning id into new_id;

  insert into public.invoice_line_items (invoice_id, description, quantity, unit_label, unit_price, sort_order)
  select new_id, description, quantity, unit_label, unit_price, sort_order
  from public.invoice_line_items where invoice_id = target_id;

  perform private.s4_audit('invoice.create', 'invoice', new_id::text, 'success',
    jsonb_build_object('duplicated_from', target_id, 'currency', source.currency));
  perform private.emit_realtime_event('invoice', new_id, 'created');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

-- RECORD PAYMENT: the invoice row is locked before the effective balance is
-- read, so two simultaneous payments serialize and the second is validated
-- against the balance the first left behind — never an overpayment.
create or replace function public.record_invoice_payment(
  target_invoice_id uuid,
  amount numeric,
  target_payment_date date,
  target_method text,
  target_reference text default null,
  target_note text default null
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
  became_paid boolean;
begin
  if not private.has_permission('finance.payments.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.payments.write is required.')));
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

  select * into current from public.invoices where id = target_invoice_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  if current.lifecycle_state <> 'issued' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Payments can only be recorded against issued invoices.')));
  end if;
  select * into money from private.invoice_financials(target_invoice_id);
  if round(amount, 2) > money.balance_due then
    return jsonb_build_object('ok', false, 'balance_due', money.balance_due,
      'reasons', jsonb_build_array(private.failure('exceeds_balance', 'amount', 'Payment exceeds the outstanding balance of ' || current.currency || ' ' || money.balance_due::text || '.')));
  end if;

  insert into public.invoice_payments (invoice_id, amount, payment_date, payment_method, reference, note, created_by)
  values (target_invoice_id, round(amount, 2), target_payment_date, target_method,
    nullif(btrim(target_reference), ''), nullif(btrim(target_note), ''), auth.uid())
  returning id into new_id;

  became_paid := money.balance_due - round(amount, 2) <= 0;
  update public.invoices set updated_at = now(), updated_by = auth.uid(), version = version + 1
   where id = target_invoice_id;

  perform private.s4_audit('invoice.payment_record', 'invoice', target_invoice_id::text, 'success',
    jsonb_build_object('payment_id', new_id, 'amount', round(amount, 2), 'currency', current.currency,
      'method', target_method, 'invoice_number', current.invoice_number,
      'payment_state', case when became_paid then 'paid' else 'partially_paid' end));
  perform private.s4_audit('invoice.payment_record', 'client', current.client_id::text, 'success',
    jsonb_build_object('invoice_id', target_invoice_id, 'invoice_number', current.invoice_number));
  if became_paid then
    perform private.s4_audit('invoice.paid', 'invoice', target_invoice_id::text, 'success',
      jsonb_build_object('invoice_number', current.invoice_number));
    perform private.s4_audit('invoice.paid', 'client', current.client_id::text, 'success',
      jsonb_build_object('invoice_id', target_invoice_id, 'invoice_number', current.invoice_number));
    if current.operational_project_id is not null then
      perform private.s4_audit('invoice.paid', 'operational_project', current.operational_project_id::text, 'success',
        jsonb_build_object('invoice_id', target_invoice_id, 'invoice_number', current.invoice_number));
    end if;
  end if;
  perform private.emit_realtime_event('invoice', target_invoice_id, 'payment_recorded');
  return jsonb_build_object('ok', true, 'id', target_invoice_id, 'payment_id', new_id,
    'version', current.version + 1, 'balance_due', money.balance_due - round(amount, 2));
end;
$$;

create or replace function public.reverse_invoice_payment(target_payment_id uuid, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment record;
  current record;
begin
  if not private.has_permission('finance.payments.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.payments.write is required.')));
  end if;
  if reason is null or btrim(reason) = '' or char_length(reason) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'A reversal reason is required.')));
  end if;
  select * into payment from public.invoice_payments where id = target_payment_id;
  if payment.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'payment', 'Payment does not exist.')));
  end if;
  select * into current from public.invoices where id = payment.invoice_id for update;
  if payment.reversed_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'payment', 'This payment has already been reversed.')));
  end if;

  update public.invoice_payments
     set reversed_at = now(), reversed_by = auth.uid(), reversal_reason = btrim(reason)
   where id = target_payment_id;
  update public.invoices set updated_at = now(), updated_by = auth.uid(), version = version + 1
   where id = payment.invoice_id;

  perform private.s4_audit('invoice.payment_reverse', 'invoice', payment.invoice_id::text, 'success',
    jsonb_build_object('payment_id', target_payment_id, 'amount', payment.amount, 'currency', current.currency,
      'invoice_number', current.invoice_number));
  perform private.s4_audit('invoice.payment_reverse', 'client', current.client_id::text, 'success',
    jsonb_build_object('invoice_id', payment.invoice_id, 'invoice_number', current.invoice_number));
  perform private.emit_realtime_event('invoice', payment.invoice_id, 'payment_reversed');
  return jsonb_build_object('ok', true, 'id', payment.invoice_id, 'version', current.version + 1);
end;
$$;

-- Share links: the raw token is generated here, returned once, and only
-- its SHA-256 hash is stored. Creating a link revokes any previous active
-- link (regenerate == create).
create or replace function public.create_invoice_share_link(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  raw_token text;
begin
  if not private.has_permission('finance.invoices.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.write is required.')));
  end if;
  select * into current from public.invoices where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  if current.lifecycle_state <> 'issued' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only issued invoices can be shared with the client.')));
  end if;

  update public.invoice_share_links
     set revoked_at = now(), revoked_by = auth.uid()
   where invoice_id = target_id and revoked_at is null;

  raw_token := translate(encode(extensions.gen_random_bytes(36), 'base64'), '+/=', '-_');
  raw_token := regexp_replace(raw_token, '[^A-Za-z0-9_-]', '', 'g');
  insert into public.invoice_share_links (invoice_id, token_hash, created_by)
  values (target_id, encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex'), auth.uid());

  perform private.s4_audit('invoice.share_create', 'invoice', target_id::text, 'success',
    jsonb_build_object('invoice_number', current.invoice_number));
  perform private.emit_realtime_event('invoice', target_id, 'share_created');
  return jsonb_build_object('ok', true, 'id', target_id, 'token', raw_token, 'version', current.version);
end;
$$;

create or replace function public.revoke_invoice_share_link(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  revoked integer;
begin
  if not private.has_permission('finance.invoices.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'finance.invoices.write is required.')));
  end if;
  select * into current from public.invoices where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'invoice', 'Invoice does not exist.')));
  end if;
  update public.invoice_share_links
     set revoked_at = now(), revoked_by = auth.uid()
   where invoice_id = target_id and revoked_at is null;
  get diagnostics revoked = row_count;
  if revoked = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'share', 'There is no active client link to revoke.')));
  end if;
  perform private.s4_audit('invoice.share_revoke', 'invoice', target_id::text, 'success',
    jsonb_build_object('invoice_number', current.invoice_number));
  perform private.emit_realtime_event('invoice', target_id, 'share_revoked');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', current.version);
end;
$$;

-- ---------------------------------------------------------------------
-- C4 facades extended for finance (recreated, bodies otherwise unchanged)
-- ---------------------------------------------------------------------

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
  can_read_finance boolean := private.has_permission('finance.invoices.read');
begin
  if not can_read_clients and not can_read_projects and not can_read_finance then
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
    'actor', profile.display_name,
    'label', log.metadata ->> 'invoice_number'
  ) order by log.occurred_at desc), '[]'::jsonb)
  into result
  from (
    select * from public.audit_logs
    where (entity_type = 'client' and can_read_clients)
       or (entity_type = 'operational_project' and can_read_projects)
       or (entity_type = 'invoice' and can_read_finance)
    order by occurred_at desc
    limit limit_count
  ) as log
  left join public.profiles as profile on profile.id = log.actor_id;

  return result;
end;
$$;

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

  if private.has_permission('finance.invoices.read') then
    result := result || coalesce((
      select jsonb_agg(jsonb_build_object('kind', 'invoice', 'id', id, 'label', label, 'detail', detail))
      from (
        select invoice.id,
          coalesce(invoice.invoice_number, 'Draft') as label,
          client.full_name || ' · ' || invoice.lifecycle_state as detail
        from public.invoices as invoice
        join public.clients as client on client.id = invoice.client_id
        left join public.operational_projects as project on project.id = invoice.operational_project_id
        where invoice.archived_at is null and (
          invoice.invoice_number ilike '%' || normalized_query || '%'
          or invoice.reference ilike '%' || normalized_query || '%'
          or client.full_name ilike '%' || normalized_query || '%'
          or project.title ilike '%' || normalized_query || '%'
        )
        order by invoice.updated_at desc
        limit limit_count
      ) as invoice
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
-- Grants
-- ---------------------------------------------------------------------

revoke all on function public.admin_list_invoices(text, uuid, uuid, text, text, boolean, text, date, date, boolean, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_get_invoice(uuid) from public, anon, authenticated;
revoke all on function public.admin_client_invoices(uuid) from public, anon, authenticated;
revoke all on function public.admin_project_invoices(uuid) from public, anon, authenticated;
revoke all on function public.admin_finance_overview() from public, anon, authenticated;
revoke all on function public.admin_finance_action_queue(integer) from public, anon, authenticated;
revoke all on function public.public_invoice_by_share_token(text) from public, anon, authenticated;
revoke all on function public.create_admin_invoice(uuid, uuid, text, numeric, text, text, text, date, date, jsonb) from public, anon, authenticated;
revoke all on function public.update_admin_invoice(uuid, integer, uuid, text, numeric, jsonb, uuid, text, text, text, date, date) from public, anon, authenticated;
revoke all on function public.issue_admin_invoice(uuid, integer, date, date) from public, anon, authenticated;
revoke all on function public.void_admin_invoice(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.archive_admin_invoice(uuid, integer) from public, anon, authenticated;
revoke all on function public.duplicate_admin_invoice(uuid) from public, anon, authenticated;
revoke all on function public.record_invoice_payment(uuid, numeric, date, text, text, text) from public, anon, authenticated;
revoke all on function public.reverse_invoice_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.create_invoice_share_link(uuid) from public, anon, authenticated;
revoke all on function public.revoke_invoice_share_link(uuid) from public, anon, authenticated;
revoke all on function public.admin_recent_activity(integer) from public, anon, authenticated;
revoke all on function public.admin_global_quick_find(text, integer) from public, anon, authenticated;

grant execute on function public.admin_list_invoices(text, uuid, uuid, text, text, boolean, text, date, date, boolean, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_get_invoice(uuid) to authenticated;
grant execute on function public.admin_client_invoices(uuid) to authenticated;
grant execute on function public.admin_project_invoices(uuid) to authenticated;
grant execute on function public.admin_finance_overview() to authenticated;
grant execute on function public.admin_finance_action_queue(integer) to authenticated;
grant execute on function public.create_admin_invoice(uuid, uuid, text, numeric, text, text, text, date, date, jsonb) to authenticated;
grant execute on function public.update_admin_invoice(uuid, integer, uuid, text, numeric, jsonb, uuid, text, text, text, date, date) to authenticated;
grant execute on function public.issue_admin_invoice(uuid, integer, date, date) to authenticated;
grant execute on function public.void_admin_invoice(uuid, integer, text) to authenticated;
grant execute on function public.archive_admin_invoice(uuid, integer) to authenticated;
grant execute on function public.duplicate_admin_invoice(uuid) to authenticated;
grant execute on function public.record_invoice_payment(uuid, numeric, date, text, text, text) to authenticated;
grant execute on function public.reverse_invoice_payment(uuid, text) to authenticated;
grant execute on function public.create_invoice_share_link(uuid) to authenticated;
grant execute on function public.revoke_invoice_share_link(uuid) to authenticated;
grant execute on function public.admin_recent_activity(integer) to authenticated;
grant execute on function public.admin_global_quick_find(text, integer) to authenticated;

-- The one intentional anonymous read path: token-scoped, hash-verified.
grant execute on function public.public_invoice_by_share_token(text) to anon, authenticated;
