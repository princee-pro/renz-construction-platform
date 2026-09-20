-- =====================================================================
-- C6 (part 2) — PROCUREMENT: MATERIAL CATALOG, PROJECT MATERIAL
-- REQUIREMENTS, PURCHASE ORDERS, GOODS RECEIVING, SUPPLIER SHARE LINKS,
-- DELIVERY OVERVIEW, and the C4/C5 facades extended for the delivery side.
--
-- Purchase orders follow the C5 invoice discipline exactly: draft → issued
-- (atomic official number RENZ-PO-YYYY-NNNNNN + frozen supplier/issuer
-- snapshots + frozen totals) → cancelled | closed; issued lines immutable;
-- receipts append-only with reversal. Received ≠ used: C6 tracks delivery
-- against orders only — no inventory, stock, or consumption.
-- =====================================================================

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  internal_code text,
  name text not null,
  category text,
  specification text,
  default_unit text not null,
  preferred_supplier_id uuid references public.trade_partners (id) on delete set null,
  active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  constraint materials_code_check check (internal_code is null or (btrim(internal_code) <> '' and char_length(internal_code) <= 60)),
  constraint materials_name_check check (btrim(name) <> '' and char_length(name) <= 200),
  constraint materials_category_check check (category is null or char_length(category) <= 80),
  constraint materials_specification_check check (specification is null or char_length(specification) <= 2000),
  constraint materials_unit_check check (btrim(default_unit) <> '' and char_length(default_unit) <= 40),
  constraint materials_version_check check (version > 0)
);

create unique index materials_code_unique_idx on public.materials (lower(internal_code)) where internal_code is not null;
create index materials_updated_idx on public.materials (updated_at desc, id desc);
create index materials_name_idx on public.materials (lower(name));
create index materials_supplier_idx on public.materials (preferred_supplier_id);
create index materials_created_by_idx on public.materials (created_by);
create index materials_updated_by_idx on public.materials (updated_by);

create table public.project_material_requirements (
  id uuid primary key default gen_random_uuid(),
  operational_project_id uuid not null references public.operational_projects (id) on delete restrict,
  material_id uuid references public.materials (id) on delete set null,
  item_name text not null,
  specification text,
  required_quantity numeric(14, 3) not null,
  unit_label text not null,
  required_by date,
  priority text not null default 'medium',
  approval_state text not null default 'draft',
  private_note text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  cancelled_at timestamptz,
  constraint requirements_item_check check (btrim(item_name) <> '' and char_length(item_name) <= 200),
  constraint requirements_specification_check check (specification is null or char_length(specification) <= 2000),
  constraint requirements_quantity_check check (required_quantity > 0),
  constraint requirements_unit_check check (btrim(unit_label) <> '' and char_length(unit_label) <= 40),
  constraint requirements_priority_check check (priority in ('low', 'medium', 'high')),
  constraint requirements_state_check check (approval_state in ('draft', 'approved', 'cancelled')),
  constraint requirements_cancel_shape_check check ((approval_state = 'cancelled') = (cancelled_at is not null)),
  constraint requirements_note_check check (private_note is null or char_length(private_note) <= 2000),
  constraint requirements_version_check check (version > 0),
  -- Lets purchase_order_line_items reference (requirement, project) together.
  constraint requirements_id_project_unique unique (id, operational_project_id)
);

create index requirements_project_idx on public.project_material_requirements (operational_project_id);
create index requirements_material_idx on public.project_material_requirements (material_id);
create index requirements_due_idx on public.project_material_requirements (required_by) where required_by is not null;
create index requirements_created_by_idx on public.project_material_requirements (created_by);
create index requirements_updated_by_idx on public.project_material_requirements (updated_by);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  operational_project_id uuid not null references public.operational_projects (id) on delete restrict,
  supplier_id uuid not null references public.trade_partners (id) on delete restrict,
  purchase_order_number text,
  reference text,
  lifecycle_state text not null default 'draft',
  currency text not null,
  tax_rate numeric(5, 2) not null default 0,
  issue_date date,
  expected_delivery_date date,
  notes text,
  terms text,
  issued_supplier_snapshot jsonb,
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
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  close_reason text,
  constraint purchase_orders_number_unique unique (purchase_order_number),
  constraint purchase_orders_number_format_check check (purchase_order_number is null or purchase_order_number ~ '^RENZ-PO-[0-9]{4}-[0-9]{6}$'),
  constraint purchase_orders_lifecycle_check check (lifecycle_state in ('draft', 'issued', 'cancelled', 'closed')),
  constraint purchase_orders_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint purchase_orders_tax_check check (tax_rate >= 0 and tax_rate <= 100),
  constraint purchase_orders_reference_check check (reference is null or char_length(reference) <= 120),
  constraint purchase_orders_notes_check check (notes is null or char_length(notes) <= 4000),
  constraint purchase_orders_terms_check check (terms is null or char_length(terms) <= 4000),
  constraint purchase_orders_cancel_reason_check check (cancel_reason is null or (btrim(cancel_reason) <> '' and char_length(cancel_reason) <= 1000)),
  constraint purchase_orders_close_reason_check check (close_reason is null or (btrim(close_reason) <> '' and char_length(close_reason) <= 1000)),
  constraint purchase_orders_version_check check (version > 0),
  constraint purchase_orders_issued_shape_check check (
    (lifecycle_state = 'draft' and purchase_order_number is null and issued_at is null and issued_supplier_snapshot is null and issued_total is null)
    or (lifecycle_state in ('issued', 'cancelled', 'closed') and purchase_order_number is not null and issue_date is not null
      and issued_at is not null and issued_supplier_snapshot is not null and issued_issuer_snapshot is not null
      and issued_subtotal is not null and issued_tax_amount is not null and issued_total is not null)
    -- A draft may also be cancelled (abandoned) without ever being issued:
    or (lifecycle_state = 'cancelled' and purchase_order_number is null and issued_at is null)
  ),
  constraint purchase_orders_cancel_shape_check check ((lifecycle_state = 'cancelled') = (cancelled_at is not null and cancel_reason is not null)),
  constraint purchase_orders_close_shape_check check ((lifecycle_state = 'closed') = (closed_at is not null and close_reason is not null))
);

create index purchase_orders_updated_idx on public.purchase_orders (updated_at desc, id desc);
create index purchase_orders_project_idx on public.purchase_orders (operational_project_id);
create index purchase_orders_supplier_idx on public.purchase_orders (supplier_id);
create index purchase_orders_lifecycle_idx on public.purchase_orders (lifecycle_state);
create index purchase_orders_expected_idx on public.purchase_orders (expected_delivery_date) where lifecycle_state = 'issued';
create index purchase_orders_created_by_idx on public.purchase_orders (created_by);
create index purchase_orders_updated_by_idx on public.purchase_orders (updated_by);
create index purchase_orders_issued_by_idx on public.purchase_orders (issued_by);
create index purchase_orders_cancelled_by_idx on public.purchase_orders (cancelled_by);
create index purchase_orders_closed_by_idx on public.purchase_orders (closed_by);

create table public.purchase_order_line_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  operational_project_id uuid not null,
  material_requirement_id uuid,
  material_id uuid references public.materials (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null,
  unit_label text not null,
  unit_price numeric(14, 2) not null,
  sort_order integer not null default 0,
  over_order_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint po_lines_description_check check (btrim(description) <> '' and char_length(description) <= 500),
  constraint po_lines_quantity_check check (quantity > 0),
  constraint po_lines_unit_check check (btrim(unit_label) <> '' and char_length(unit_label) <= 40),
  constraint po_lines_price_check check (unit_price >= 0),
  constraint po_lines_sort_check check (sort_order >= 0),
  -- A line's requirement must belong to the PO's own project (DB-enforced).
  constraint po_lines_requirement_project_match
    foreign key (material_requirement_id, operational_project_id)
    references public.project_material_requirements (id, operational_project_id)
);

create index po_lines_order_idx on public.purchase_order_line_items (purchase_order_id, sort_order);
create index po_lines_requirement_idx on public.purchase_order_line_items (material_requirement_id) where material_requirement_id is not null;
create index po_lines_material_idx on public.purchase_order_line_items (material_id);

create table public.purchase_order_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete restrict,
  received_at date not null,
  delivery_reference text,
  note text,
  received_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles (id) on delete set null,
  reversal_reason text,
  constraint po_receipts_reference_check check (delivery_reference is null or char_length(delivery_reference) <= 120),
  constraint po_receipts_note_check check (note is null or char_length(note) <= 2000),
  constraint po_receipts_reversal_shape_check check (
    (reversed_at is null and reversal_reason is null)
    or (reversed_at is not null and reversal_reason is not null and btrim(reversal_reason) <> '')
  )
);

create index po_receipts_order_idx on public.purchase_order_receipts (purchase_order_id, received_at desc);
create index po_receipts_received_by_idx on public.purchase_order_receipts (received_by);
create index po_receipts_reversed_by_idx on public.purchase_order_receipts (reversed_by);

create table public.purchase_order_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.purchase_order_receipts (id) on delete cascade,
  purchase_order_line_item_id uuid not null references public.purchase_order_line_items (id) on delete restrict,
  quantity_received numeric(14, 3) not null,
  constraint po_receipt_items_quantity_check check (quantity_received > 0)
);

create index po_receipt_items_receipt_idx on public.purchase_order_receipt_items (receipt_id);
create index po_receipt_items_line_idx on public.purchase_order_receipt_items (purchase_order_line_item_id);

create table public.purchase_order_share_links (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  constraint po_share_links_hash_check check (token_hash ~ '^[0-9a-f]{64}$')
);

create unique index po_share_links_one_active_idx on public.purchase_order_share_links (purchase_order_id) where revoked_at is null;
create index po_share_links_created_by_idx on public.purchase_order_share_links (created_by);
create index po_share_links_revoked_by_idx on public.purchase_order_share_links (revoked_by);

create table public.purchase_order_number_counters (
  year_key integer primary key,
  last_value integer not null default 0,
  constraint po_counters_year_check check (year_key between 2000 and 2999),
  constraint po_counters_value_check check (last_value >= 0)
);

-- ---------------------------------------------------------------------
-- RLS default deny
-- ---------------------------------------------------------------------

alter table public.materials enable row level security;
alter table public.project_material_requirements enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_line_items enable row level security;
alter table public.purchase_order_receipts enable row level security;
alter table public.purchase_order_receipt_items enable row level security;
alter table public.purchase_order_share_links enable row level security;
alter table public.purchase_order_number_counters enable row level security;
revoke all on public.materials from public, anon, authenticated;
revoke all on public.project_material_requirements from public, anon, authenticated;
revoke all on public.purchase_orders from public, anon, authenticated;
revoke all on public.purchase_order_line_items from public, anon, authenticated;
revoke all on public.purchase_order_receipts from public, anon, authenticated;
revoke all on public.purchase_order_receipt_items from public, anon, authenticated;
revoke all on public.purchase_order_share_links from public, anon, authenticated;
revoke all on public.purchase_order_number_counters from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------

create or replace function private.enforce_purchase_order_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.lifecycle_state = 'draft' then
    return new;
  end if;
  if new.operational_project_id is distinct from old.operational_project_id
    or new.supplier_id is distinct from old.supplier_id
    or new.purchase_order_number is distinct from old.purchase_order_number
    or new.reference is distinct from old.reference
    or new.currency is distinct from old.currency
    or new.tax_rate is distinct from old.tax_rate
    or new.issue_date is distinct from old.issue_date
    or new.expected_delivery_date is distinct from old.expected_delivery_date
    or new.notes is distinct from old.notes
    or new.terms is distinct from old.terms
    or new.issued_supplier_snapshot is distinct from old.issued_supplier_snapshot
    or new.issued_project_snapshot is distinct from old.issued_project_snapshot
    or new.issued_issuer_snapshot is distinct from old.issued_issuer_snapshot
    or new.issued_subtotal is distinct from old.issued_subtotal
    or new.issued_tax_amount is distinct from old.issued_tax_amount
    or new.issued_total is distinct from old.issued_total
    or new.issued_at is distinct from old.issued_at
    or new.issued_by is distinct from old.issued_by
  then
    raise exception using errcode = '55000', message = 'issued purchase order identity is immutable';
  end if;
  if old.lifecycle_state in ('cancelled', 'closed') and new.lifecycle_state <> old.lifecycle_state then
    raise exception using errcode = '55000', message = 'a cancelled or closed purchase order cannot change state';
  end if;
  if old.lifecycle_state = 'issued' and new.lifecycle_state = 'draft' then
    raise exception using errcode = '55000', message = 'an issued purchase order cannot return to draft';
  end if;
  return new;
end;
$$;

create trigger purchase_orders_enforce_immutability
before update on public.purchase_orders
for each row execute function private.enforce_purchase_order_immutability();

create or replace function private.enforce_po_lines_draft_only()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target uuid := coalesce(new.purchase_order_id, old.purchase_order_id);
begin
  if exists (select 1 from public.purchase_orders where id = target and lifecycle_state <> 'draft') then
    raise exception using errcode = '55000', message = 'line items of an issued purchase order are immutable';
  end if;
  if tg_op <> 'DELETE' and new.operational_project_id is distinct from
     (select operational_project_id from public.purchase_orders where id = new.purchase_order_id) then
    raise exception using errcode = '23503', message = 'purchase order line project must match the purchase order project';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger po_lines_draft_only
before insert or update or delete on public.purchase_order_line_items
for each row execute function private.enforce_po_lines_draft_only();

create or replace function private.enforce_po_receipt_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'goods receipts are never deleted; reverse them';
  end if;
  if new.purchase_order_id is distinct from old.purchase_order_id
    or new.received_at is distinct from old.received_at
    or new.delivery_reference is distinct from old.delivery_reference
    or new.note is distinct from old.note
    or new.received_by is distinct from old.received_by
    or (old.reversed_at is not null and (new.reversed_at is distinct from old.reversed_at
      or new.reversed_by is distinct from old.reversed_by or new.reversal_reason is distinct from old.reversal_reason))
  then
    raise exception using errcode = '55000', message = 'recorded goods receipts are immutable; only an unreversed receipt may be reversed once';
  end if;
  return new;
end;
$$;

create trigger po_receipts_history
before update or delete on public.purchase_order_receipts
for each row execute function private.enforce_po_receipt_history();

create or replace function private.enforce_po_receipt_items_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'goods receipt lines are immutable; reverse the receipt';
end;
$$;

create trigger po_receipt_items_immutable
before update or delete on public.purchase_order_receipt_items
for each row execute function private.enforce_po_receipt_items_immutable();

revoke all on function private.enforce_purchase_order_immutability() from public, anon, authenticated;
revoke all on function private.enforce_po_lines_draft_only() from public, anon, authenticated;
revoke all on function private.enforce_po_receipt_history() from public, anon, authenticated;
revoke all on function private.enforce_po_receipt_items_immutable() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Canonical projections
-- ---------------------------------------------------------------------

-- Effective received quantity for one PO line (non-reversed receipts only).
create or replace function private.po_line_received(target_line_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(item.quantity_received), 0)::numeric(14, 3)
  from public.purchase_order_receipt_items as item
  join public.purchase_order_receipts as receipt on receipt.id = item.receipt_id
  where item.purchase_order_line_item_id = target_line_id and receipt.reversed_at is null;
$$;

revoke all on function private.po_line_received(uuid) from public, anon, authenticated;

create or replace function private.purchase_order_financials(target_po_id uuid)
returns table (
  subtotal numeric, tax_amount numeric, total numeric,
  ordered_quantity numeric, received_quantity numeric, remaining_quantity numeric,
  delivery_state text, is_delayed boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with po as (select * from public.purchase_orders where id = target_po_id),
  lines as (
    select coalesce(sum(round(quantity * unit_price, 2)), 0)::numeric(14, 2) as subtotal,
      coalesce(sum(quantity), 0)::numeric(14, 3) as ordered,
      coalesce(sum(private.po_line_received(id)), 0)::numeric(14, 3) as received
    from public.purchase_order_line_items where purchase_order_id = target_po_id
  ),
  money as (
    select
      case when po.lifecycle_state = 'draft' then lines.subtotal else po.issued_subtotal end as subtotal,
      case when po.lifecycle_state = 'draft' then round(lines.subtotal * po.tax_rate / 100, 2) else po.issued_tax_amount end as tax_amount,
      case when po.lifecycle_state = 'draft' then lines.subtotal + round(lines.subtotal * po.tax_rate / 100, 2) else po.issued_total end as total,
      lines.ordered, lines.received, po.lifecycle_state, po.expected_delivery_date
    from po cross join lines
  )
  select money.subtotal, money.tax_amount, money.total, money.ordered, money.received,
    greatest(money.ordered - money.received, 0)::numeric(14, 3) as remaining_quantity,
    case
      when money.lifecycle_state = 'issued' and money.ordered - money.received > 0
        and money.expected_delivery_date is not null and money.expected_delivery_date < current_date then 'delayed'
      when money.received <= 0 then 'not_received'
      when money.received >= money.ordered then 'received'
      else 'partially_received'
    end as delivery_state,
    (money.lifecycle_state = 'issued' and money.ordered - money.received > 0
      and money.expected_delivery_date is not null and money.expected_delivery_date < current_date) as is_delayed
  from money;
$$;

revoke all on function private.purchase_order_financials(uuid) from public, anon, authenticated;

-- Required / ordered / received for one requirement. Ordered counts lines
-- on issued or closed POs (drafts and cancellations never count); received
-- counts non-reversed receipts of those lines.
create or replace function private.requirement_quantities(target_requirement_id uuid)
returns table (
  required_quantity numeric, ordered_quantity numeric, received_quantity numeric,
  remaining_to_order numeric, remaining_to_receive numeric, procurement_state text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with requirement as (select * from public.project_material_requirements where id = target_requirement_id),
  ordered as (
    select coalesce(sum(line.quantity), 0)::numeric(14, 3) as ordered,
      coalesce(sum(private.po_line_received(line.id)), 0)::numeric(14, 3) as received
    from public.purchase_order_line_items as line
    join public.purchase_orders as po on po.id = line.purchase_order_id
    where line.material_requirement_id = target_requirement_id and po.lifecycle_state in ('issued', 'closed')
  )
  select requirement.required_quantity, ordered.ordered, ordered.received,
    greatest(requirement.required_quantity - ordered.ordered, 0)::numeric(14, 3),
    greatest(ordered.ordered - ordered.received, 0)::numeric(14, 3),
    case
      when requirement.approval_state = 'cancelled' then 'cancelled'
      when ordered.ordered <= 0 then 'not_ordered'
      when ordered.received >= requirement.required_quantity then 'received'
      when ordered.received > 0 then 'partially_received'
      when ordered.ordered >= requirement.required_quantity then 'ordered'
      else 'partially_ordered'
    end
  from requirement cross join ordered;
$$;

revoke all on function private.requirement_quantities(uuid) from public, anon, authenticated;

-- Shared PO document model (admin print/PDF + supplier share page).
create or replace function private.purchase_order_document(target_po_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'id', po.id,
    'purchase_order_number', po.purchase_order_number,
    'lifecycle_state', po.lifecycle_state,
    'currency', po.currency,
    'tax_rate', po.tax_rate,
    'issue_date', po.issue_date,
    'expected_delivery_date', po.expected_delivery_date,
    'reference', po.reference,
    'notes', po.notes,
    'terms', po.terms,
    'cancelled_at', po.cancelled_at,
    'closed_at', po.closed_at,
    'issuer', po.issued_issuer_snapshot,
    'supplier', po.issued_supplier_snapshot,
    'project', po.issued_project_snapshot,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'description', line.description, 'quantity', line.quantity, 'unit_label', line.unit_label,
        'unit_price', line.unit_price, 'line_total', round(line.quantity * line.unit_price, 2),
        'received_quantity', private.po_line_received(line.id)
      ) order by line.sort_order, line.created_at)
      from public.purchase_order_line_items as line where line.purchase_order_id = po.id
    ), '[]'::jsonb),
    'subtotal', money.subtotal, 'tax_amount', money.tax_amount, 'total', money.total,
    'delivery_state', money.delivery_state
  )
  from public.purchase_orders as po
  cross join lateral private.purchase_order_financials(po.id) as money
  where po.id = target_po_id;
$$;

revoke all on function private.purchase_order_document(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Materials
-- ---------------------------------------------------------------------

create or replace function public.admin_list_materials(
  search_query text default null, category_filter text default null, status_scope text default 'active',
  cursor_updated_at timestamptz default null, cursor_id uuid default null, page_size integer default 25
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
  if not private.has_permission('procurement.materials.read') then
    raise exception using errcode = '42501', message = 'material list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'material page size is outside the admitted range';
  end if;
  if status_scope not in ('active', 'archived', 'all') then
    raise exception using errcode = '22023', message = 'material status scope is not admitted';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'material cursor is incomplete';
  end if;
  for item in
    select material.*, supplier.display_name as supplier_name
    from public.materials as material
    left join public.trade_partners as supplier on supplier.id = material.preferred_supplier_id
    where (status_scope = 'all' or (status_scope = 'active' and material.archived_at is null)
        or (status_scope = 'archived' and material.archived_at is not null))
      and (category_filter is null or material.category = category_filter)
      and (normalized_query is null or material.name ilike '%' || normalized_query || '%'
        or material.internal_code ilike '%' || normalized_query || '%' or material.category ilike '%' || normalized_query || '%')
      and (cursor_updated_at is null or (material.updated_at, material.id) < (cursor_updated_at, cursor_id))
    order by material.updated_at desc, material.id desc
    limit page_size + 1
  loop
    item_count := item_count + 1;
    if item_count > page_size then has_more := true; exit; end if;
    next_updated_at := item.updated_at; next_id := item.id;
    items := items || jsonb_build_array(jsonb_build_object(
      'id', item.id, 'internal_code', item.internal_code, 'name', item.name, 'category', item.category,
      'default_unit', item.default_unit, 'active', item.active, 'archived_at', item.archived_at,
      'updated_at', item.updated_at, 'version', item.version,
      'preferred_supplier', case when item.preferred_supplier_id is null then null
        else jsonb_build_object('id', item.preferred_supplier_id, 'display_name', item.supplier_name) end
    ));
  end loop;
  return jsonb_build_object('items', items, 'has_more', has_more,
    'next_cursor_updated_at', case when has_more then next_updated_at end,
    'next_cursor_id', case when has_more then next_id end);
end;
$$;

create or replace function public.admin_get_material(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('procurement.materials.read') then
    raise exception using errcode = '42501', message = 'material detail is not authorized';
  end if;
  select jsonb_build_object(
    'material', jsonb_build_object(
      'id', material.id, 'internal_code', material.internal_code, 'name', material.name, 'category', material.category,
      'specification', material.specification, 'default_unit', material.default_unit, 'active', material.active,
      'archived_at', material.archived_at, 'updated_at', material.updated_at, 'created_at', material.created_at,
      'version', material.version,
      'preferred_supplier', case when supplier.id is null then null
        else jsonb_build_object('id', supplier.id, 'display_name', supplier.display_name) end
    ),
    'recent_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'purchase_order_id', po.id, 'purchase_order_number', po.purchase_order_number, 'lifecycle_state', po.lifecycle_state,
        'quantity', line.quantity, 'unit_label', line.unit_label, 'unit_price', line.unit_price, 'currency', po.currency,
        'issue_date', po.issue_date, 'supplier', partner.display_name
      ) order by po.updated_at desc)
      from (select * from public.purchase_order_line_items where material_id = target_id order by created_at desc limit 20) as line
      join public.purchase_orders as po on po.id = line.purchase_order_id
      join public.trade_partners as partner on partner.id = po.supplier_id
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('action', log.action, 'outcome', log.outcome, 'occurred_at', log.occurred_at, 'actor', profile.display_name)
        order by log.occurred_at desc)
      from (select * from public.audit_logs where entity_type = 'material' and entity_id = target_id::text order by occurred_at desc limit 20) as log
      left join public.profiles as profile on profile.id = log.actor_id
    ), '[]'::jsonb)
  ) into result
  from public.materials as material
  left join public.trade_partners as supplier on supplier.id = material.preferred_supplier_id
  where material.id = target_id;
  if result is null then
    raise exception using errcode = 'P0002', message = 'material does not exist';
  end if;
  return result;
end;
$$;

create or replace function public.admin_list_materials_for_picker(search_query text default null, limit_count integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text := nullif(btrim(search_query), '');
begin
  if not private.has_permission('procurement.materials.read') then
    raise exception using errcode = '42501', message = 'material picker is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 25 then limit_count := 10; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'internal_code', internal_code, 'default_unit', default_unit,
      'category', category, 'preferred_supplier_id', preferred_supplier_id))
    from (
      select id, name, internal_code, default_unit, category, preferred_supplier_id from public.materials
      where archived_at is null and active
        and (normalized_query is null or name ilike '%' || normalized_query || '%' or internal_code ilike '%' || normalized_query || '%')
      order by name limit limit_count
    ) as material
  ), '[]'::jsonb);
end;
$$;

create or replace function public.find_possible_duplicate_materials(target_name text, target_code text default null, exclude_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_name text := nullif(lower(regexp_replace(coalesce(target_name, ''), '\s+', ' ', 'g')), '');
  normalized_code text := nullif(lower(btrim(target_code)), '');
begin
  if not private.has_permission('procurement.materials.read') then
    raise exception using errcode = '42501', message = 'material duplicate check is not authorized';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'internal_code', internal_code, 'category', category,
      'match', case when normalized_code is not null and lower(internal_code) = normalized_code then 'code' else 'name' end))
    from (
      select * from public.materials as material
      where (exclude_id is null or material.id <> exclude_id)
        and ((normalized_code is not null and lower(material.internal_code) = normalized_code)
          or (normalized_name is not null and char_length(normalized_name) >= 3
              and lower(regexp_replace(material.name, '\s+', ' ', 'g')) = normalized_name))
      order by material.updated_at desc limit 5
    ) as candidate
  ), '[]'::jsonb);
end;
$$;

create or replace function private.validate_material_fields(
  target_name text, target_code text, target_category text, target_specification text, target_unit text, target_supplier_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if target_name is null or btrim(target_name) = '' or char_length(target_name) > 200 then
    return private.failure('invalid_input', 'name', 'A material name is required.');
  end if;
  if target_code is not null and char_length(target_code) > 60 then
    return private.failure('invalid_input', 'internal_code', 'Internal code is too long.');
  end if;
  if target_category is not null and char_length(target_category) > 80 then
    return private.failure('invalid_input', 'category', 'Category is too long.');
  end if;
  if target_specification is not null and char_length(target_specification) > 2000 then
    return private.failure('invalid_input', 'specification', 'Specification is too long.');
  end if;
  if target_unit is null or btrim(target_unit) = '' or char_length(target_unit) > 40 then
    return private.failure('invalid_input', 'default_unit', 'A default unit is required.');
  end if;
  if target_supplier_id is not null and not exists (
    select 1 from public.trade_partners where id = target_supplier_id and archived_at is null and 'supplier' = any (capabilities)
  ) then
    return private.failure('capability_missing', 'preferred_supplier_id', 'The preferred supplier must be an active partner with the supplier capability.');
  end if;
  return null;
end;
$$;

revoke all on function private.validate_material_fields(text, text, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.create_admin_material(
  target_name text, target_unit text, target_code text default null, target_category text default null,
  target_specification text default null, target_supplier_id uuid default null
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
  if not private.has_permission('procurement.materials.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.materials.write is required.')));
  end if;
  problem := private.validate_material_fields(target_name, target_code, target_category, target_specification, target_unit, target_supplier_id);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  begin
    insert into public.materials (internal_code, name, category, specification, default_unit, preferred_supplier_id, created_by, updated_by)
    values (nullif(btrim(target_code), ''), btrim(target_name), nullif(btrim(target_category), ''), nullif(btrim(target_specification), ''),
      btrim(target_unit), target_supplier_id, auth.uid(), auth.uid())
    returning id into new_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('duplicate_code', 'internal_code', 'Another material already uses this internal code.')));
  end;
  perform private.s4_audit('material.create', 'material', new_id::text, 'success', jsonb_build_object('default_unit', btrim(target_unit)));
  perform private.emit_realtime_event('material', new_id, 'created');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

create or replace function public.update_admin_material(
  target_id uuid, expected_version integer, target_name text, target_unit text, target_code text default null,
  target_category text default null, target_specification text default null, target_supplier_id uuid default null,
  target_active boolean default true
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
  if not private.has_permission('procurement.materials.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.materials.write is required.')));
  end if;
  select * into current from public.materials where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'material', 'Material does not exist.')));
  end if;
  if current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'material', 'An archived material cannot be edited.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer material version is available.')));
  end if;
  problem := private.validate_material_fields(target_name, target_code, target_category, target_specification, target_unit, target_supplier_id);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  begin
    update public.materials
       set internal_code = nullif(btrim(target_code), ''), name = btrim(target_name), category = nullif(btrim(target_category), ''),
           specification = nullif(btrim(target_specification), ''), default_unit = btrim(target_unit),
           preferred_supplier_id = target_supplier_id, active = coalesce(target_active, true),
           updated_by = auth.uid(), updated_at = now(), version = version + 1
     where id = target_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('duplicate_code', 'internal_code', 'Another material already uses this internal code.')));
  end;
  perform private.s4_audit('material.update', 'material', target_id::text, 'success', jsonb_build_object('active', coalesce(target_active, true)));
  perform private.emit_realtime_event('material', target_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.archive_admin_material(target_id uuid, expected_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
begin
  if not private.has_permission('procurement.materials.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.materials.write is required.')));
  end if;
  select * into current from public.materials where id = target_id for update;
  if current.id is null or current.archived_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'material', 'The material is missing or already archived.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer material version is available.')));
  end if;
  update public.materials set archived_at = now(), active = false, updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('material.archive', 'material', target_id::text, 'success', '{}'::jsonb);
  perform private.emit_realtime_event('material', target_id, 'archived');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- ---------------------------------------------------------------------
-- Project material requirements + Project → Procurement tab
-- ---------------------------------------------------------------------

create or replace function public.admin_project_procurement(target_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  due_soon_days constant integer := 14;
begin
  if not private.has_permission('procurement.orders.read') and not private.has_permission('procurement.materials.read') then
    raise exception using errcode = '42501', message = 'project procurement is not authorized';
  end if;
  return jsonb_build_object(
    'due_soon_window_days', due_soon_days,
    'requirements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', requirement.id, 'item_name', requirement.item_name, 'specification', requirement.specification,
        'required_quantity', quantities.required_quantity, 'unit_label', requirement.unit_label,
        'required_by', requirement.required_by, 'priority', requirement.priority, 'approval_state', requirement.approval_state,
        'private_note', requirement.private_note, 'version', requirement.version, 'updated_at', requirement.updated_at,
        'material', case when material.id is null then null else jsonb_build_object('id', material.id, 'name', material.name, 'internal_code', material.internal_code) end,
        'ordered_quantity', quantities.ordered_quantity, 'received_quantity', quantities.received_quantity,
        'remaining_to_order', quantities.remaining_to_order, 'remaining_to_receive', quantities.remaining_to_receive,
        'procurement_state', quantities.procurement_state
      ) order by requirement.approval_state = 'cancelled', requirement.required_by nulls last, requirement.updated_at desc)
      from (select * from public.project_material_requirements where operational_project_id = target_project_id order by updated_at desc limit 200) as requirement
      left join public.materials as material on material.id = requirement.material_id
      cross join lateral private.requirement_quantities(requirement.id) as quantities
    ), '[]'::jsonb),
    'purchase_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', po.id, 'purchase_order_number', po.purchase_order_number, 'lifecycle_state', po.lifecycle_state,
        'currency', po.currency, 'total', money.total, 'delivery_state', money.delivery_state, 'is_delayed', money.is_delayed,
        'expected_delivery_date', po.expected_delivery_date, 'issue_date', po.issue_date, 'updated_at', po.updated_at,
        'ordered_quantity', money.ordered_quantity, 'received_quantity', money.received_quantity, 'remaining_quantity', money.remaining_quantity,
        'supplier', jsonb_build_object('id', supplier.id, 'display_name', supplier.display_name)
      ) order by po.updated_at desc)
      from (select * from public.purchase_orders where operational_project_id = target_project_id order by updated_at desc limit 100) as po
      join public.trade_partners as supplier on supplier.id = po.supplier_id
      cross join lateral private.purchase_order_financials(po.id) as money
    ), '[]'::jsonb),
    'ordered_value_by_currency', coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'order_count', order_count) order by currency)
      from (
        select po.currency, sum(money.total)::numeric(14, 2) as total, count(*) as order_count
        from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as money
        where po.operational_project_id = target_project_id and po.lifecycle_state in ('issued', 'closed')
        group by po.currency
      ) as t
    ), '[]'::jsonb),
    'summary', (
      select jsonb_build_object(
        'requirement_count', count(*) filter (where requirement.approval_state <> 'cancelled'),
        'open_order_count', (select count(*) from public.purchase_orders where operational_project_id = target_project_id and lifecycle_state = 'issued'),
        'delayed_order_count', (select count(*) from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m
          where po.operational_project_id = target_project_id and m.is_delayed),
        'received_requirement_count', count(*) filter (where quantities.procurement_state = 'received')
      )
      from public.project_material_requirements as requirement
      cross join lateral private.requirement_quantities(requirement.id) as quantities
      where requirement.operational_project_id = target_project_id
    )
  );
end;
$$;

create or replace function private.validate_requirement_fields(
  target_item_name text, target_specification text, target_quantity numeric, target_unit text,
  target_priority text, target_note text, target_material_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if target_item_name is null or btrim(target_item_name) = '' or char_length(target_item_name) > 200 then
    return private.failure('invalid_input', 'item_name', 'An item name is required.');
  end if;
  if target_specification is not null and char_length(target_specification) > 2000 then
    return private.failure('invalid_input', 'specification', 'Specification is too long.');
  end if;
  if target_quantity is null or target_quantity <= 0 then
    return private.failure('invalid_input', 'required_quantity', 'Required quantity must be greater than zero.');
  end if;
  if target_unit is null or btrim(target_unit) = '' or char_length(target_unit) > 40 then
    return private.failure('invalid_input', 'unit_label', 'A unit is required.');
  end if;
  if target_priority not in ('low', 'medium', 'high') then
    return private.failure('invalid_input', 'priority', 'Priority is not admitted.');
  end if;
  if target_note is not null and char_length(target_note) > 2000 then
    return private.failure('invalid_input', 'private_note', 'Note is too long.');
  end if;
  if target_material_id is not null and not exists (select 1 from public.materials where id = target_material_id and archived_at is null) then
    return private.failure('not_found', 'material_id', 'Select an active catalog material or leave it blank.');
  end if;
  return null;
end;
$$;

revoke all on function private.validate_requirement_fields(text, text, numeric, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.create_material_requirement(
  target_project_id uuid, target_item_name text, target_quantity numeric, target_unit text,
  target_material_id uuid default null, target_specification text default null, target_required_by date default null,
  target_priority text default 'medium', target_note text default null, target_state text default 'approved'
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
  if not private.has_permission('procurement.materials.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.materials.write is required.')));
  end if;
  if not exists (select 1 from public.operational_projects where id = target_project_id and archived_at is null) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'operational_project_id', 'Select an active operational project.')));
  end if;
  if target_state not in ('draft', 'approved') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'approval_state', 'A new requirement is draft or approved.')));
  end if;
  problem := private.validate_requirement_fields(target_item_name, target_specification, target_quantity, target_unit, target_priority, target_note, target_material_id);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  insert into public.project_material_requirements (
    operational_project_id, material_id, item_name, specification, required_quantity, unit_label, required_by, priority, approval_state, private_note, created_by, updated_by
  ) values (
    target_project_id, target_material_id, btrim(target_item_name), nullif(btrim(target_specification), ''), round(target_quantity, 3),
    btrim(target_unit), target_required_by, target_priority, target_state, nullif(btrim(target_note), ''), auth.uid(), auth.uid()
  ) returning id into new_id;
  perform private.s4_audit('material_requirement.create', 'material_requirement', new_id::text, 'success',
    jsonb_build_object('project_id', target_project_id, 'quantity', round(target_quantity, 3), 'unit', btrim(target_unit)));
  perform private.s4_audit('material_requirement.create', 'operational_project', target_project_id::text, 'success',
    jsonb_build_object('requirement_id', new_id, 'item_name', btrim(target_item_name)));
  perform private.emit_realtime_event('material_requirement', new_id, 'created');
  perform private.emit_realtime_event('operational_project', target_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

create or replace function public.update_material_requirement(
  target_id uuid, expected_version integer, target_item_name text, target_quantity numeric, target_unit text,
  target_material_id uuid default null, target_specification text default null, target_required_by date default null,
  target_priority text default 'medium', target_note text default null, target_state text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  problem jsonb;
  next_state text;
begin
  if not private.has_permission('procurement.materials.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.materials.write is required.')));
  end if;
  select * into current from public.project_material_requirements where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'requirement', 'Requirement does not exist.')));
  end if;
  if current.approval_state = 'cancelled' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'approval_state', 'A cancelled requirement cannot be edited.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer requirement version is available.')));
  end if;
  next_state := coalesce(target_state, current.approval_state);
  if next_state not in ('draft', 'approved', 'cancelled') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'approval_state', 'Approval state is not admitted.')));
  end if;
  if next_state = 'cancelled' and exists (
    select 1 from public.purchase_order_line_items as line join public.purchase_orders as po on po.id = line.purchase_order_id
    where line.material_requirement_id = target_id and po.lifecycle_state = 'issued'
  ) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'approval_state', 'This requirement is on an issued purchase order and cannot be cancelled.')));
  end if;
  problem := private.validate_requirement_fields(target_item_name, target_specification, target_quantity, target_unit, target_priority, target_note, target_material_id);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  update public.project_material_requirements
     set material_id = target_material_id, item_name = btrim(target_item_name), specification = nullif(btrim(target_specification), ''),
         required_quantity = round(target_quantity, 3), unit_label = btrim(target_unit), required_by = target_required_by,
         priority = target_priority, approval_state = next_state,
         cancelled_at = case when next_state = 'cancelled' then now() else null end,
         private_note = nullif(btrim(target_note), ''), updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('material_requirement.update', 'material_requirement', target_id::text, 'success',
    jsonb_build_object('approval_state', next_state, 'quantity', round(target_quantity, 3)));
  perform private.emit_realtime_event('material_requirement', target_id, case when next_state = 'cancelled' then 'cancelled' when next_state = 'approved' and current.approval_state <> 'approved' then 'approved' else 'updated' end);
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

-- ---------------------------------------------------------------------
-- Purchase orders
-- ---------------------------------------------------------------------

-- Replace PO lines (draft only, PO row locked by caller). Requirement lines
-- are validated for project match and over-order (which must be confirmed).
create or replace function private.replace_purchase_order_lines(target_po_id uuid, target_project_id uuid, lines jsonb)
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
  requirement_id uuid;
  material_id uuid;
  requirement record;
  over_confirmed boolean;
  already_ordered numeric;
begin
  if lines is null then lines := '[]'::jsonb; end if;
  if jsonb_typeof(lines) <> 'array' then
    return private.failure('invalid_input', 'lines', 'Line items must be a list.');
  end if;
  if jsonb_array_length(lines) > 100 then
    return private.failure('invalid_input', 'lines', 'A purchase order may carry at most 100 lines.');
  end if;
  delete from public.purchase_order_line_items where purchase_order_id = target_po_id;
  for line in select * from jsonb_array_elements(lines) loop
    description_value := nullif(btrim(coalesce(line ->> 'description', '')), '');
    unit_value := nullif(btrim(coalesce(line ->> 'unit_label', '')), '');
    over_confirmed := coalesce((line ->> 'over_order_confirmed')::boolean, false);
    begin
      quantity_value := (line ->> 'quantity')::numeric;
      price_value := (line ->> 'unit_price')::numeric;
      requirement_id := nullif(line ->> 'material_requirement_id', '')::uuid;
      material_id := nullif(line ->> 'material_id', '')::uuid;
    exception when others then
      return private.failure('invalid_input', 'lines', 'Line ' || position + 1 || ': quantity, price and references must be valid.');
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
    if unit_value is null or char_length(unit_value) > 40 then
      return private.failure('invalid_input', 'lines', 'Line ' || position + 1 || ': a unit of at most 40 characters is required.');
    end if;
    if requirement_id is not null then
      select r.*, q.remaining_to_order into requirement
      from public.project_material_requirements as r cross join lateral private.requirement_quantities(r.id) as q
      where r.id = requirement_id;
      if requirement.id is null then
        return private.failure('not_found', 'lines', 'Line ' || position + 1 || ': the material requirement does not exist.');
      end if;
      if requirement.operational_project_id <> target_project_id then
        return private.failure('invalid_relationship', 'lines', 'Line ' || position + 1 || ': the requirement belongs to a different project.');
      end if;
      if requirement.approval_state <> 'approved' then
        return private.failure('invalid_state', 'lines', 'Line ' || position + 1 || ': only approved requirements can be ordered.');
      end if;
      -- Over-order guard counts quantity already on other issued/closed POs.
      already_ordered := requirement.required_quantity - requirement.remaining_to_order;
      if already_ordered + quantity_value > requirement.required_quantity and not over_confirmed then
        return private.failure('over_order', 'lines', 'Line ' || position + 1 || ': ordering ' || quantity_value::text || ' exceeds the remaining requirement of ' || requirement.remaining_to_order::text || ' ' || requirement.unit_label || '. Confirm the over-order to proceed.');
      end if;
      if material_id is null then material_id := requirement.material_id; end if;
    end if;
    insert into public.purchase_order_line_items (
      purchase_order_id, operational_project_id, material_requirement_id, material_id, description, quantity, unit_label, unit_price, sort_order, over_order_confirmed
    ) values (
      target_po_id, target_project_id, requirement_id, material_id, description_value, round(quantity_value, 3), unit_value, round(price_value, 2), position, over_confirmed
    );
    position := position + 1;
  end loop;
  return null;
end;
$$;

revoke all on function private.replace_purchase_order_lines(uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function private.validate_purchase_order_fields(
  target_project_id uuid, target_supplier_id uuid, target_currency text, target_tax_rate numeric,
  target_reference text, target_notes text, target_terms text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  supplier record;
begin
  if not exists (select 1 from public.operational_projects where id = target_project_id and archived_at is null) then
    return private.failure('not_found', 'operational_project_id', 'Select an active operational project.');
  end if;
  select * into supplier from public.trade_partners where id = target_supplier_id;
  if supplier.id is null or supplier.archived_at is not null then
    return private.failure('not_found', 'supplier_id', 'Select an active supplier.');
  end if;
  if not ('supplier' = any (supplier.capabilities)) then
    return private.failure('capability_missing', 'supplier_id', 'This partner is not a supplier. Add the supplier capability first.');
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
  if target_terms is not null and char_length(target_terms) > 4000 then
    return private.failure('invalid_input', 'terms', 'Terms are too long.');
  end if;
  return null;
end;
$$;

revoke all on function private.validate_purchase_order_fields(uuid, uuid, text, numeric, text, text, text) from public, anon, authenticated;

create or replace function public.create_admin_purchase_order(
  target_project_id uuid, target_supplier_id uuid, target_currency text, target_tax_rate numeric default 0,
  target_reference text default null, target_expected_delivery_date date default null,
  target_notes text default null, target_terms text default null, lines jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  problem jsonb;
  failure_code text;
  normalized_currency text := upper(nullif(btrim(target_currency), ''));
begin
  if not private.has_permission('procurement.orders.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.write is required.')));
  end if;
  problem := private.validate_purchase_order_fields(target_project_id, target_supplier_id, normalized_currency, target_tax_rate, target_reference, target_notes, target_terms);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  insert into public.purchase_orders (operational_project_id, supplier_id, currency, tax_rate, reference, expected_delivery_date, notes, terms, created_by, updated_by)
  values (target_project_id, target_supplier_id, normalized_currency, round(target_tax_rate, 2), nullif(btrim(target_reference), ''),
    target_expected_delivery_date, nullif(btrim(target_notes), ''), nullif(btrim(target_terms), ''), auth.uid(), auth.uid())
  returning id into new_id;
  problem := private.replace_purchase_order_lines(new_id, target_project_id, lines);
  if problem is not null then
    raise exception using errcode = 'P0001', message = coalesce(problem ->> 'detail', 'Lines are invalid.'), hint = coalesce(problem ->> 'code', 'invalid_input');
  end if;
  perform private.s4_audit('purchase_order.create', 'purchase_order', new_id::text, 'success',
    jsonb_build_object('project_id', target_project_id, 'supplier_id', target_supplier_id, 'currency', normalized_currency));
  perform private.emit_realtime_event('purchase_order', new_id, 'created');
  perform private.emit_realtime_event('operational_project', target_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
exception when sqlstate 'P0001' then
  get stacked diagnostics failure_code = pg_exception_hint;
  return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure(coalesce(nullif(failure_code, ''), 'invalid_input'), 'lines', sqlerrm)));
end;
$$;

create or replace function public.update_admin_purchase_order(
  target_id uuid, expected_version integer, target_supplier_id uuid, target_currency text, target_tax_rate numeric, lines jsonb,
  target_reference text default null, target_expected_delivery_date date default null, target_notes text default null, target_terms text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  problem jsonb;
  failure_code text;
  normalized_currency text := upper(nullif(btrim(target_currency), ''));
begin
  if not private.has_permission('procurement.orders.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.write is required.')));
  end if;
  select * into current from public.purchase_orders where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  if current.lifecycle_state <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only draft purchase orders can be edited. Cancel and duplicate an issued order instead.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer purchase order version is available.')));
  end if;
  problem := private.validate_purchase_order_fields(current.operational_project_id, target_supplier_id, normalized_currency, target_tax_rate, target_reference, target_notes, target_terms);
  if problem is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(problem));
  end if;
  update public.purchase_orders
     set supplier_id = target_supplier_id, currency = normalized_currency, tax_rate = round(target_tax_rate, 2),
         reference = nullif(btrim(target_reference), ''), expected_delivery_date = target_expected_delivery_date,
         notes = nullif(btrim(target_notes), ''), terms = nullif(btrim(target_terms), ''),
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  problem := private.replace_purchase_order_lines(target_id, current.operational_project_id, lines);
  if problem is not null then
    raise exception using errcode = 'P0001', message = coalesce(problem ->> 'detail', 'Lines are invalid.'), hint = coalesce(problem ->> 'code', 'invalid_input');
  end if;
  perform private.s4_audit('purchase_order.update', 'purchase_order', target_id::text, 'success',
    jsonb_build_object('currency', normalized_currency, 'line_count', coalesce(jsonb_array_length(lines), 0)));
  perform private.emit_realtime_event('purchase_order', target_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
exception when sqlstate 'P0001' then
  get stacked diagnostics failure_code = pg_exception_hint;
  return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure(coalesce(nullif(failure_code, ''), 'invalid_input'), 'lines', sqlerrm)));
end;
$$;

-- ISSUE: atomic number + snapshots + frozen totals under the PO row lock.
create or replace function public.issue_admin_purchase_order(
  target_id uuid, expected_version integer, target_issue_date date, target_expected_delivery_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  supplier record;
  money record;
  line_count integer;
  issue_year integer;
  sequence_value integer;
  number_value text;
  project_snapshot jsonb;
begin
  if not private.has_permission('procurement.orders.issue') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.issue is required.')));
  end if;
  select * into current from public.purchase_orders where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  if current.lifecycle_state <> 'draft' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'This purchase order has already been issued.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer purchase order version is available.')));
  end if;
  if target_issue_date is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'issue_date', 'An issue date is required.')));
  end if;
  if target_expected_delivery_date is not null and target_expected_delivery_date < target_issue_date then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'expected_delivery_date', 'Expected delivery cannot precede the issue date.')));
  end if;
  select count(*) into line_count from public.purchase_order_line_items where purchase_order_id = target_id;
  if line_count = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'lines', 'Add at least one line before issuing.')));
  end if;
  select * into supplier from public.trade_partners where id = current.supplier_id;
  if supplier.archived_at is not null or not ('supplier' = any (supplier.capabilities)) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('capability_missing', 'supplier_id', 'The supplier is archived or no longer has the supplier capability.')));
  end if;
  select jsonb_build_object('title', project.title, 'id', project.id) into project_snapshot
  from public.operational_projects as project where project.id = current.operational_project_id;
  select * into money from private.purchase_order_financials(target_id);

  issue_year := extract(year from target_issue_date)::integer;
  insert into public.purchase_order_number_counters as counter (year_key, last_value)
  values (issue_year, 1)
  on conflict (year_key) do update set last_value = counter.last_value + 1
  returning counter.last_value into sequence_value;
  number_value := 'RENZ-PO-' || issue_year::text || '-' || lpad(sequence_value::text, 6, '0');

  update public.purchase_orders
     set lifecycle_state = 'issued', purchase_order_number = number_value, issue_date = target_issue_date,
         expected_delivery_date = coalesce(target_expected_delivery_date, expected_delivery_date),
         issued_supplier_snapshot = jsonb_strip_nulls(jsonb_build_object(
           'display_name', supplier.display_name, 'company_name', supplier.company_name, 'contact_name', supplier.contact_name,
           'email', supplier.email, 'phone', supplier.phone_display, 'address', supplier.address)),
         issued_project_snapshot = project_snapshot,
         issued_issuer_snapshot = private.invoice_issuer_snapshot(),
         issued_subtotal = money.subtotal, issued_tax_amount = money.tax_amount, issued_total = money.total,
         issued_at = now(), issued_by = auth.uid(), updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;

  perform private.s4_audit('purchase_order.issue', 'purchase_order', target_id::text, 'success',
    jsonb_build_object('purchase_order_number', number_value, 'currency', current.currency, 'total', money.total, 'transition', 'draft->issued'));
  perform private.s4_audit('purchase_order.issue', 'operational_project', current.operational_project_id::text, 'success',
    jsonb_build_object('purchase_order_id', target_id, 'purchase_order_number', number_value));
  perform private.s4_audit('purchase_order.issue', 'trade_partner', current.supplier_id::text, 'success',
    jsonb_build_object('purchase_order_id', target_id, 'purchase_order_number', number_value));
  perform private.emit_realtime_event('purchase_order', target_id, 'issued');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  perform private.emit_realtime_event('trade_partner', current.supplier_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1, 'purchase_order_number', number_value);
end;
$$;

create or replace function public.cancel_admin_purchase_order(target_id uuid, expected_version integer, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  money record;
begin
  if not private.has_permission('procurement.orders.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.write is required.')));
  end if;
  if reason is null or btrim(reason) = '' or char_length(reason) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'A cancellation reason is required.')));
  end if;
  select * into current from public.purchase_orders where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  if current.lifecycle_state not in ('draft', 'issued') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only draft or issued purchase orders can be cancelled.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer purchase order version is available.')));
  end if;
  select * into money from private.purchase_order_financials(target_id);
  if money.received_quantity > 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'receipts', 'Goods have been received against this order. Close it instead, or reverse the receipts first.')));
  end if;
  update public.purchase_orders
     set lifecycle_state = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = btrim(reason),
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('purchase_order.cancel', 'purchase_order', target_id::text, 'success',
    jsonb_build_object('purchase_order_number', current.purchase_order_number, 'transition', current.lifecycle_state || '->cancelled'));
  perform private.s4_audit('purchase_order.cancel', 'trade_partner', current.supplier_id::text, 'success',
    jsonb_build_object('purchase_order_id', target_id, 'purchase_order_number', current.purchase_order_number));
  perform private.emit_realtime_event('purchase_order', target_id, 'cancelled');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.close_admin_purchase_order(target_id uuid, expected_version integer, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
begin
  if not private.has_permission('procurement.orders.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.write is required.')));
  end if;
  if reason is null or btrim(reason) = '' or char_length(reason) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'A close reason is required.')));
  end if;
  select * into current from public.purchase_orders where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  if current.lifecycle_state <> 'issued' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only issued purchase orders can be closed.')));
  end if;
  if current.version <> expected_version then
    return jsonb_build_object('ok', false, 'current_version', current.version,
      'reasons', jsonb_build_array(private.failure('version_conflict', 'version', 'A newer purchase order version is available.')));
  end if;
  update public.purchase_orders
     set lifecycle_state = 'closed', closed_at = now(), closed_by = auth.uid(), close_reason = btrim(reason),
         updated_by = auth.uid(), updated_at = now(), version = version + 1
   where id = target_id;
  perform private.s4_audit('purchase_order.close', 'purchase_order', target_id::text, 'success',
    jsonb_build_object('purchase_order_number', current.purchase_order_number, 'transition', 'issued->closed'));
  perform private.s4_audit('purchase_order.close', 'trade_partner', current.supplier_id::text, 'success',
    jsonb_build_object('purchase_order_id', target_id, 'purchase_order_number', current.purchase_order_number));
  perform private.s4_audit('purchase_order.close', 'operational_project', current.operational_project_id::text, 'success',
    jsonb_build_object('purchase_order_id', target_id, 'purchase_order_number', current.purchase_order_number));
  perform private.emit_realtime_event('purchase_order', target_id, 'closed');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', expected_version + 1);
end;
$$;

create or replace function public.duplicate_admin_purchase_order(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source record;
  new_id uuid;
begin
  if not private.has_permission('procurement.orders.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.write is required.')));
  end if;
  select * into source from public.purchase_orders where id = target_id;
  if source.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  if exists (select 1 from public.trade_partners where id = source.supplier_id and (archived_at is not null or not ('supplier' = any (capabilities)))) then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('capability_missing', 'supplier_id', 'The supplier is archived or no longer a supplier.')));
  end if;
  insert into public.purchase_orders (operational_project_id, supplier_id, currency, tax_rate, reference, notes, terms, created_by, updated_by)
  values (source.operational_project_id, source.supplier_id, source.currency, source.tax_rate, source.reference, source.notes, source.terms, auth.uid(), auth.uid())
  returning id into new_id;
  -- Lines are copied without requirement links (quantities would otherwise double-count against the requirement).
  insert into public.purchase_order_line_items (purchase_order_id, operational_project_id, material_id, description, quantity, unit_label, unit_price, sort_order)
  select new_id, source.operational_project_id, material_id, description, quantity, unit_label, unit_price, sort_order
  from public.purchase_order_line_items where purchase_order_id = target_id;
  perform private.s4_audit('purchase_order.create', 'purchase_order', new_id::text, 'success', jsonb_build_object('duplicated_from', target_id));
  perform private.emit_realtime_event('purchase_order', new_id, 'created');
  return jsonb_build_object('ok', true, 'id', new_id, 'version', 1);
end;
$$;

-- GOODS RECEIPT: PO row locked; each line's remaining read under the lock;
-- over-receipt refused → simultaneous receipts serialize.
create or replace function public.record_goods_receipt(
  target_po_id uuid, target_received_at date, items jsonb, target_reference text default null, target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  item jsonb;
  line record;
  quantity_value numeric;
  line_id uuid;
  new_id uuid;
  received_total numeric := 0;
  money record;
  failure_code text;
begin
  if not private.has_permission('procurement.receipts.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.receipts.write is required.')));
  end if;
  if target_received_at is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'received_at', 'A delivery date is required.')));
  end if;
  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'items', 'Enter at least one received quantity.')));
  end if;
  if target_reference is not null and char_length(target_reference) > 120 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'delivery_reference', 'Reference is too long.')));
  end if;
  if target_note is not null and char_length(target_note) > 2000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'note', 'Note is too long.')));
  end if;
  select * into current from public.purchase_orders where id = target_po_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  if current.lifecycle_state <> 'issued' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Goods can only be received against an issued purchase order.')));
  end if;
  insert into public.purchase_order_receipts (purchase_order_id, received_at, delivery_reference, note, received_by)
  values (target_po_id, target_received_at, nullif(btrim(target_reference), ''), nullif(btrim(target_note), ''), auth.uid())
  returning id into new_id;
  for item in select * from jsonb_array_elements(items) loop
    begin
      line_id := (item ->> 'line_item_id')::uuid;
      quantity_value := (item ->> 'quantity_received')::numeric;
    exception when others then
      raise exception using errcode = 'P0001', message = 'Received quantities must be valid numbers.';
    end;
    if quantity_value is null or quantity_value <= 0 then
      continue;
    end if;
    select l.*, private.po_line_received(l.id) as already_received into line
    from public.purchase_order_line_items as l where l.id = line_id and l.purchase_order_id = target_po_id;
    if line.id is null then
      raise exception using errcode = 'P0001', message = 'A received line does not belong to this purchase order.';
    end if;
    if line.already_received + round(quantity_value, 3) > line.quantity then
      raise exception using errcode = 'P0001', hint = 'over_receipt',
        message = 'Receiving ' || round(quantity_value, 3)::text || ' ' || line.unit_label || ' of "' || line.description || '" exceeds the remaining ' || (line.quantity - line.already_received)::text || '.';
    end if;
    insert into public.purchase_order_receipt_items (receipt_id, purchase_order_line_item_id, quantity_received)
    values (new_id, line_id, round(quantity_value, 3));
    received_total := received_total + round(quantity_value, 3);
  end loop;
  if received_total <= 0 then
    raise exception using errcode = 'P0001', message = 'Enter at least one received quantity.';
  end if;
  update public.purchase_orders set updated_at = now(), updated_by = auth.uid(), version = version + 1 where id = target_po_id;
  select * into money from private.purchase_order_financials(target_po_id);
  perform private.s4_audit('goods_receipt.record', 'purchase_order', target_po_id::text, 'success',
    jsonb_build_object('receipt_id', new_id, 'quantity', received_total, 'purchase_order_number', current.purchase_order_number, 'delivery_state', money.delivery_state));
  perform private.s4_audit('goods_receipt.record', 'operational_project', current.operational_project_id::text, 'success',
    jsonb_build_object('purchase_order_id', target_po_id, 'purchase_order_number', current.purchase_order_number, 'quantity', received_total));
  perform private.s4_audit('goods_receipt.record', 'trade_partner', current.supplier_id::text, 'success',
    jsonb_build_object('purchase_order_id', target_po_id, 'purchase_order_number', current.purchase_order_number));
  perform private.emit_realtime_event('purchase_order', target_po_id, 'receipt_recorded');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', target_po_id, 'receipt_id', new_id, 'version', current.version + 1,
    'delivery_state', money.delivery_state, 'remaining_quantity', money.remaining_quantity);
exception when sqlstate 'P0001' then
  get stacked diagnostics failure_code = pg_exception_hint;
  return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure(coalesce(nullif(failure_code, ''), 'invalid_input'), 'items', sqlerrm)));
end;
$$;

create or replace function public.reverse_goods_receipt(target_receipt_id uuid, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt record;
  current record;
begin
  if not private.has_permission('procurement.receipts.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.receipts.write is required.')));
  end if;
  if reason is null or btrim(reason) = '' or char_length(reason) > 1000 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_input', 'reason', 'A reversal reason is required.')));
  end if;
  select * into receipt from public.purchase_order_receipts where id = target_receipt_id;
  if receipt.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'receipt', 'Goods receipt does not exist.')));
  end if;
  select * into current from public.purchase_orders where id = receipt.purchase_order_id for update;
  if receipt.reversed_at is not null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'receipt', 'This receipt has already been reversed.')));
  end if;
  update public.purchase_order_receipts set reversed_at = now(), reversed_by = auth.uid(), reversal_reason = btrim(reason)
   where id = target_receipt_id;
  update public.purchase_orders set updated_at = now(), updated_by = auth.uid(), version = version + 1 where id = receipt.purchase_order_id;
  perform private.s4_audit('goods_receipt.reverse', 'purchase_order', receipt.purchase_order_id::text, 'success',
    jsonb_build_object('receipt_id', target_receipt_id, 'purchase_order_number', current.purchase_order_number));
  perform private.emit_realtime_event('purchase_order', receipt.purchase_order_id, 'receipt_reversed');
  perform private.emit_realtime_event('operational_project', current.operational_project_id, 'updated');
  return jsonb_build_object('ok', true, 'id', receipt.purchase_order_id, 'version', current.version + 1);
end;
$$;

-- Supplier share links (C5 pattern: hash only, one active, regenerate = revoke + create).
create or replace function public.create_purchase_order_share_link(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  raw_token text;
begin
  if not private.has_permission('procurement.orders.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.write is required.')));
  end if;
  select * into current from public.purchase_orders where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  if current.lifecycle_state <> 'issued' then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'lifecycle_state', 'Only issued purchase orders can be shared with the supplier.')));
  end if;
  update public.purchase_order_share_links set revoked_at = now(), revoked_by = auth.uid() where purchase_order_id = target_id and revoked_at is null;
  raw_token := regexp_replace(translate(encode(extensions.gen_random_bytes(36), 'base64'), '+/=', '-_'), '[^A-Za-z0-9_-]', '', 'g');
  insert into public.purchase_order_share_links (purchase_order_id, token_hash, created_by)
  values (target_id, encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex'), auth.uid());
  perform private.s4_audit('purchase_order.share_create', 'purchase_order', target_id::text, 'success',
    jsonb_build_object('purchase_order_number', current.purchase_order_number));
  perform private.emit_realtime_event('purchase_order', target_id, 'share_created');
  return jsonb_build_object('ok', true, 'id', target_id, 'token', raw_token, 'version', current.version);
end;
$$;

create or replace function public.revoke_purchase_order_share_link(target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current record;
  revoked integer;
begin
  if not private.has_permission('procurement.orders.write') then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_authorized', null, 'procurement.orders.write is required.')));
  end if;
  select * into current from public.purchase_orders where id = target_id for update;
  if current.id is null then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('not_found', 'purchase_order', 'Purchase order does not exist.')));
  end if;
  update public.purchase_order_share_links set revoked_at = now(), revoked_by = auth.uid() where purchase_order_id = target_id and revoked_at is null;
  get diagnostics revoked = row_count;
  if revoked = 0 then
    return jsonb_build_object('ok', false, 'reasons', jsonb_build_array(private.failure('invalid_state', 'share', 'There is no active supplier link to revoke.')));
  end if;
  perform private.s4_audit('purchase_order.share_revoke', 'purchase_order', target_id::text, 'success',
    jsonb_build_object('purchase_order_number', current.purchase_order_number));
  perform private.emit_realtime_event('purchase_order', target_id, 'share_revoked');
  return jsonb_build_object('ok', true, 'id', target_id, 'version', current.version);
end;
$$;

-- The only anonymous procurement read path: token-scoped PO document.
create or replace function public.public_purchase_order_by_share_token(raw_token text)
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
  select link.purchase_order_id into target
  from public.purchase_order_share_links as link
  join public.purchase_orders as po on po.id = link.purchase_order_id
  where link.token_hash = encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex')
    and link.revoked_at is null and po.lifecycle_state in ('issued', 'cancelled', 'closed');
  if target is null then
    return null;
  end if;
  return private.purchase_order_document(target);
end;
$$;

-- ---------------------------------------------------------------------
-- Purchase order reads
-- ---------------------------------------------------------------------

create or replace function public.admin_list_purchase_orders(
  search_query text default null, supplier_id_filter uuid default null, project_id_filter uuid default null,
  lifecycle_filter text default null, delivery_filter text default null, currency_filter text default null,
  delayed_only boolean default false, issued_from date default null, issued_to date default null,
  cursor_updated_at timestamptz default null, cursor_id uuid default null, page_size integer default 25
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
  if not private.has_permission('procurement.orders.read') then
    raise exception using errcode = '42501', message = 'purchase order list is not authorized';
  end if;
  if page_size is null or page_size < 1 or page_size > 50 then
    raise exception using errcode = '22023', message = 'purchase order page size is outside the admitted range';
  end if;
  if lifecycle_filter is not null and lifecycle_filter not in ('draft', 'issued', 'cancelled', 'closed') then
    raise exception using errcode = '22023', message = 'purchase order lifecycle filter is not admitted';
  end if;
  if delivery_filter is not null and delivery_filter not in ('not_received', 'partially_received', 'received', 'delayed') then
    raise exception using errcode = '22023', message = 'purchase order delivery filter is not admitted';
  end if;
  if currency_filter is not null and currency_filter !~ '^[A-Z]{3}$' then
    raise exception using errcode = '22023', message = 'purchase order currency filter is not admitted';
  end if;
  if (cursor_updated_at is null) <> (cursor_id is null) then
    raise exception using errcode = '22023', message = 'purchase order cursor is incomplete';
  end if;
  for item in
    select po.id, po.purchase_order_number, po.reference, po.lifecycle_state, po.currency, po.issue_date, po.expected_delivery_date,
      po.updated_at, po.version,
      jsonb_build_object('id', supplier.id, 'display_name', supplier.display_name) as supplier,
      jsonb_build_object('id', project.id, 'title', project.title) as project,
      money.total, money.delivery_state, money.is_delayed, money.ordered_quantity, money.received_quantity
    from public.purchase_orders as po
    join public.trade_partners as supplier on supplier.id = po.supplier_id
    join public.operational_projects as project on project.id = po.operational_project_id
    cross join lateral private.purchase_order_financials(po.id) as money
    where (supplier_id_filter is null or po.supplier_id = supplier_id_filter)
      and (project_id_filter is null or po.operational_project_id = project_id_filter)
      and (lifecycle_filter is null or po.lifecycle_state = lifecycle_filter)
      and (delivery_filter is null or money.delivery_state = delivery_filter)
      and (not delayed_only or money.is_delayed)
      and (currency_filter is null or po.currency = currency_filter)
      and (issued_from is null or po.issue_date >= issued_from)
      and (issued_to is null or po.issue_date <= issued_to)
      and (normalized_query is null or po.purchase_order_number ilike '%' || normalized_query || '%'
        or po.reference ilike '%' || normalized_query || '%' or supplier.display_name ilike '%' || normalized_query || '%'
        or project.title ilike '%' || normalized_query || '%')
      and (cursor_updated_at is null or (po.updated_at, po.id) < (cursor_updated_at, cursor_id))
    order by po.updated_at desc, po.id desc
    limit page_size + 1
  loop
    item_count := item_count + 1;
    if item_count > page_size then has_more := true; exit; end if;
    next_updated_at := item.updated_at; next_id := item.id;
    items := items || jsonb_build_array(jsonb_build_object(
      'id', item.id, 'purchase_order_number', item.purchase_order_number, 'reference', item.reference,
      'lifecycle_state', item.lifecycle_state, 'currency', item.currency, 'issue_date', item.issue_date,
      'expected_delivery_date', item.expected_delivery_date, 'updated_at', item.updated_at, 'version', item.version,
      'supplier', item.supplier, 'project', item.project, 'total', item.total, 'delivery_state', item.delivery_state,
      'is_delayed', item.is_delayed, 'ordered_quantity', item.ordered_quantity, 'received_quantity', item.received_quantity
    ));
  end loop;
  return jsonb_build_object('items', items, 'has_more', has_more,
    'next_cursor_updated_at', case when has_more then next_updated_at end,
    'next_cursor_id', case when has_more then next_id end);
end;
$$;

create or replace function public.admin_get_purchase_order(target_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not private.has_permission('procurement.orders.read') then
    raise exception using errcode = '42501', message = 'purchase order detail is not authorized';
  end if;
  select jsonb_build_object(
    'purchase_order', jsonb_build_object(
      'id', po.id, 'purchase_order_number', po.purchase_order_number, 'reference', po.reference,
      'lifecycle_state', po.lifecycle_state, 'currency', po.currency, 'tax_rate', po.tax_rate,
      'issue_date', po.issue_date, 'expected_delivery_date', po.expected_delivery_date, 'notes', po.notes, 'terms', po.terms,
      'version', po.version, 'created_at', po.created_at, 'updated_at', po.updated_at, 'issued_at', po.issued_at,
      'cancelled_at', po.cancelled_at, 'cancel_reason', po.cancel_reason, 'closed_at', po.closed_at, 'close_reason', po.close_reason
    ),
    'supplier', jsonb_build_object('id', supplier.id, 'display_name', supplier.display_name, 'company_name', supplier.company_name,
      'email', supplier.email, 'phone_display', supplier.phone_display, 'archived_at', supplier.archived_at,
      'capabilities', to_jsonb(supplier.capabilities)),
    'project', jsonb_build_object('id', project.id, 'title', project.title, 'status', project.status, 'archived_at', project.archived_at,
      'client', jsonb_build_object('id', client.id, 'full_name', client.full_name)),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', line.id, 'description', line.description, 'quantity', line.quantity, 'unit_label', line.unit_label,
        'unit_price', line.unit_price, 'line_total', round(line.quantity * line.unit_price, 2), 'sort_order', line.sort_order,
        'material_requirement_id', line.material_requirement_id, 'material_id', line.material_id,
        'over_order_confirmed', line.over_order_confirmed,
        'received_quantity', private.po_line_received(line.id),
        'remaining_quantity', greatest(line.quantity - private.po_line_received(line.id), 0),
        'requirement', case when requirement.id is null then null else jsonb_build_object('id', requirement.id, 'item_name', requirement.item_name,
          'required_quantity', requirement.required_quantity, 'unit_label', requirement.unit_label) end
      ) order by line.sort_order, line.created_at)
      from public.purchase_order_line_items as line
      left join public.project_material_requirements as requirement on requirement.id = line.material_requirement_id
      where line.purchase_order_id = po.id
    ), '[]'::jsonb),
    'financials', jsonb_build_object('subtotal', money.subtotal, 'tax_amount', money.tax_amount, 'total', money.total,
      'ordered_quantity', money.ordered_quantity, 'received_quantity', money.received_quantity, 'remaining_quantity', money.remaining_quantity,
      'delivery_state', money.delivery_state, 'is_delayed', money.is_delayed),
    'receipts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', receipt.id, 'received_at', receipt.received_at, 'delivery_reference', receipt.delivery_reference, 'note', receipt.note,
        'created_at', receipt.created_at, 'received_by', recorder.display_name, 'reversed_at', receipt.reversed_at,
        'reversal_reason', receipt.reversal_reason, 'reversed_by', reverser.display_name,
        'items', coalesce((select jsonb_agg(jsonb_build_object('line_item_id', item.purchase_order_line_item_id, 'quantity_received', item.quantity_received,
          'description', line.description, 'unit_label', line.unit_label))
          from public.purchase_order_receipt_items as item join public.purchase_order_line_items as line on line.id = item.purchase_order_line_item_id
          where item.receipt_id = receipt.id), '[]'::jsonb)
      ) order by receipt.received_at desc, receipt.created_at desc)
      from public.purchase_order_receipts as receipt
      left join public.profiles as recorder on recorder.id = receipt.received_by
      left join public.profiles as reverser on reverser.id = receipt.reversed_by
      where receipt.purchase_order_id = po.id
    ), '[]'::jsonb),
    'share', (select jsonb_build_object('created_at', link.created_at, 'created_by', creator.display_name)
      from public.purchase_order_share_links as link left join public.profiles as creator on creator.id = link.created_by
      where link.purchase_order_id = po.id and link.revoked_at is null limit 1),
    'document', case when po.lifecycle_state = 'draft' then null else private.purchase_order_document(po.id) end,
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('action', log.action, 'outcome', log.outcome, 'occurred_at', log.occurred_at,
        'actor', profile.display_name, 'metadata', log.metadata) order by log.occurred_at desc)
      from (select * from public.audit_logs where entity_type = 'purchase_order' and entity_id = target_id::text order by occurred_at desc limit 30) as log
      left join public.profiles as profile on profile.id = log.actor_id
    ), '[]'::jsonb)
  ) into result
  from public.purchase_orders as po
  join public.trade_partners as supplier on supplier.id = po.supplier_id
  join public.operational_projects as project on project.id = po.operational_project_id
  join public.clients as client on client.id = project.client_id
  cross join lateral private.purchase_order_financials(po.id) as money
  where po.id = target_id;
  if result is null then
    raise exception using errcode = 'P0002', message = 'purchase order does not exist';
  end if;
  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Delivery overview (Control Room), action queue, project delivery summary
-- ---------------------------------------------------------------------

create or replace function public.admin_delivery_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  po_soon_days constant integer := 7;
  material_soon_days constant integer := 14;
  assignment_soon_days constant integer := 14;
  can_partners boolean := private.has_permission('partners.read');
  can_orders boolean := private.has_permission('procurement.orders.read');
  can_materials boolean := private.has_permission('procurement.materials.read');
begin
  if not can_partners and not can_orders and not can_materials then
    raise exception using errcode = '42501', message = 'delivery overview is not authorized';
  end if;
  return jsonb_build_object(
    'po_soon_window_days', po_soon_days, 'material_soon_window_days', material_soon_days, 'assignment_soon_window_days', assignment_soon_days,
    'active_contractor_count', case when can_partners then (select count(distinct trade_partner_id) from public.contractor_assignments where status = 'active' and archived_at is null) end,
    'active_assignment_count', case when can_partners then (select count(*) from public.contractor_assignments where status = 'active' and archived_at is null) end,
    'assignments_ending_soon', case when can_partners then (select count(*) from public.contractor_assignments
      where status = 'active' and archived_at is null and end_date between current_date and current_date + assignment_soon_days) end,
    'contractor_outstanding_by_currency', case when can_partners then coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'assignment_count', assignment_count) order by currency)
      from (select a.currency, sum(m.remaining_amount)::numeric(14, 2) as total, count(*) as assignment_count
            from public.contractor_assignments as a cross join lateral private.assignment_financials(a.id) as m
            where a.archived_at is null and a.status <> 'cancelled' and a.agreed_amount is not null and m.remaining_amount > 0
            group by a.currency) as t), '[]'::jsonb) end,
    'open_order_count', case when can_orders then (select count(*) from public.purchase_orders where lifecycle_state = 'issued') end,
    'delayed_order_count', case when can_orders then (select count(*) from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m where m.is_delayed) end,
    'orders_expected_soon', case when can_orders then (select count(*) from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m
      where po.lifecycle_state = 'issued' and m.remaining_quantity > 0 and po.expected_delivery_date between current_date and current_date + po_soon_days) end,
    'open_order_value_by_currency', case when can_orders then coalesce((
      select jsonb_agg(jsonb_build_object('currency', currency, 'total', total, 'order_count', order_count) order by currency)
      from (select po.currency, sum(m.total)::numeric(14, 2) as total, count(*) as order_count
            from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m
            where po.lifecycle_state = 'issued' group by po.currency) as t), '[]'::jsonb) end,
    'requirements_due_soon', case when can_materials then (select count(*) from public.project_material_requirements as r cross join lateral private.requirement_quantities(r.id) as q
      where r.approval_state = 'approved' and q.remaining_to_order > 0 and r.required_by between current_date and current_date + material_soon_days) end,
    'recent_receipts', case when can_orders then coalesce((
      select jsonb_agg(jsonb_build_object('id', receipt.id, 'purchase_order_id', po.id, 'purchase_order_number', po.purchase_order_number,
        'received_at', receipt.received_at, 'supplier', supplier.display_name, 'project', project.title) order by receipt.received_at desc, receipt.created_at desc)
      from (select * from public.purchase_order_receipts where reversed_at is null order by received_at desc, created_at desc limit 8) as receipt
      join public.purchase_orders as po on po.id = receipt.purchase_order_id
      join public.trade_partners as supplier on supplier.id = po.supplier_id
      join public.operational_projects as project on project.id = po.operational_project_id), '[]'::jsonb) end
  );
end;
$$;

create or replace function public.admin_delivery_action_queue(limit_count integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  po_soon_days constant integer := 7;
  material_soon_days constant integer := 14;
  assignment_soon_days constant integer := 14;
  can_partners boolean := private.has_permission('partners.read');
  can_orders boolean := private.has_permission('procurement.orders.read');
  can_materials boolean := private.has_permission('procurement.materials.read');
  result jsonb;
begin
  if not can_partners and not can_orders and not can_materials then
    raise exception using errcode = '42501', message = 'delivery action queue is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 100 then
    raise exception using errcode = '22023', message = 'delivery action queue limit is outside the admitted range';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind', item.kind, 'entity', item.entity, 'id', item.id, 'label', item.label, 'detail', item.detail)
    order by item.rank, item.due nulls last, item.updated_at desc), '[]'::jsonb)
  into result
  from (
    select 'po_delayed' as kind, 'purchase_order' as entity, po.id, po.purchase_order_number as label,
      'Expected ' || to_char(po.expected_delivery_date, 'YYYY-MM-DD') || ' · ' || m.remaining_quantity::text || ' outstanding' as detail,
      0 as rank, po.expected_delivery_date as due, po.updated_at
    from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m
    where can_orders and m.is_delayed
    union all
    select 'po_expected_soon', 'purchase_order', po.id, po.purchase_order_number,
      'Expected ' || to_char(po.expected_delivery_date, 'YYYY-MM-DD'), 1, po.expected_delivery_date, po.updated_at
    from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m
    where can_orders and po.lifecycle_state = 'issued' and m.remaining_quantity > 0
      and po.expected_delivery_date between current_date and current_date + po_soon_days
    union all
    select 'material_due_soon', 'operational_project', r.operational_project_id, r.item_name,
      'Required ' || to_char(r.required_by, 'YYYY-MM-DD') || ' · ' || q.remaining_to_order::text || ' ' || r.unit_label || ' not yet ordered',
      1, r.required_by, r.updated_at
    from public.project_material_requirements as r cross join lateral private.requirement_quantities(r.id) as q
    where can_materials and r.approval_state = 'approved' and q.remaining_to_order > 0
      and r.required_by between current_date and current_date + material_soon_days
    union all
    select 'assignment_ending_soon', 'contractor_assignment', a.id, partner.display_name,
      'Assignment ends ' || to_char(a.end_date, 'YYYY-MM-DD'), 2, a.end_date, a.updated_at
    from public.contractor_assignments as a join public.trade_partners as partner on partner.id = a.trade_partner_id
    where can_partners and a.status = 'active' and a.archived_at is null and a.end_date between current_date and current_date + assignment_soon_days
    union all
    select 'assignment_unrated', 'contractor_assignment', a.id, partner.display_name,
      'Completed without a performance rating', 3, null::date, a.updated_at
    from public.contractor_assignments as a join public.trade_partners as partner on partner.id = a.trade_partner_id
    where can_partners and a.status = 'completed' and a.archived_at is null and a.performance_rating is null
    union all
    select 'assignment_balance_remaining', 'contractor_assignment', a.id, partner.display_name,
      'Completed with ' || a.currency || ' ' || m.remaining_amount::text || ' remaining (no due date rule — informational)', 4, null::date, a.updated_at
    from public.contractor_assignments as a join public.trade_partners as partner on partner.id = a.trade_partner_id
    cross join lateral private.assignment_financials(a.id) as m
    where can_partners and a.status = 'completed' and a.archived_at is null and m.remaining_amount > 0
  ) as item
  limit limit_count;
  return result;
end;
$$;

-- Project cost/delivery position: every figure grouped by currency; no profit/margin.
create or replace function public.admin_project_delivery_summary(target_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  can_finance boolean := private.has_permission('finance.invoices.read');
  can_partners boolean := private.has_permission('partners.read');
  can_orders boolean := private.has_permission('procurement.orders.read');
  can_materials boolean := private.has_permission('procurement.materials.read');
  project record;
begin
  if not private.has_permission('operations.projects.read') then
    raise exception using errcode = '42501', message = 'project delivery summary is not authorized';
  end if;
  select * into project from public.operational_projects where id = target_project_id;
  if project.id is null then
    raise exception using errcode = 'P0002', message = 'operational project does not exist';
  end if;
  return jsonb_build_object(
    'by_currency', coalesce((
      select jsonb_agg(jsonb_build_object(
        'currency', currency,
        'budget', case when project.budget_currency = currency then project.budget_amount end,
        'client_invoiced', case when can_finance then (select sum(m.total)::numeric(14, 2) from public.invoices as i cross join lateral private.invoice_financials(i.id) as m
          where i.operational_project_id = target_project_id and i.lifecycle_state = 'issued' and i.currency = currency) end,
        'client_paid', case when can_finance then (select sum(m.paid_amount)::numeric(14, 2) from public.invoices as i cross join lateral private.invoice_financials(i.id) as m
          where i.operational_project_id = target_project_id and i.lifecycle_state = 'issued' and i.currency = currency) end,
        'contractor_committed', case when can_partners then (select sum(m.agreed_amount)::numeric(14, 2) from public.contractor_assignments as a cross join lateral private.assignment_financials(a.id) as m
          where a.operational_project_id = target_project_id and a.archived_at is null and a.status <> 'cancelled' and a.currency = currency) end,
        'contractor_paid', case when can_partners then (select sum(m.paid_amount)::numeric(14, 2) from public.contractor_assignments as a cross join lateral private.assignment_financials(a.id) as m
          where a.operational_project_id = target_project_id and a.archived_at is null and a.status <> 'cancelled' and a.currency = currency) end,
        'material_ordered', case when can_orders then (select sum(m.total)::numeric(14, 2) from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m
          where po.operational_project_id = target_project_id and po.lifecycle_state in ('issued', 'closed') and po.currency = currency) end
      ) order by currency)
      from (
        select project.budget_currency as currency where project.budget_currency is not null
        union select currency from public.invoices where operational_project_id = target_project_id and lifecycle_state = 'issued' and can_finance
        union select currency from public.contractor_assignments where operational_project_id = target_project_id and archived_at is null and status <> 'cancelled' and currency is not null and can_partners
        union select currency from public.purchase_orders where operational_project_id = target_project_id and lifecycle_state in ('issued', 'closed') and can_orders
      ) as currencies
    ), '[]'::jsonb),
    'active_contractor_count', case when can_partners then (select count(*) from public.contractor_assignments where operational_project_id = target_project_id and status = 'active' and archived_at is null) end,
    'requirement_count', case when can_materials then (select count(*) from public.project_material_requirements where operational_project_id = target_project_id and approval_state <> 'cancelled') end,
    'open_order_count', case when can_orders then (select count(*) from public.purchase_orders where operational_project_id = target_project_id and lifecycle_state = 'issued') end,
    'delayed_order_count', case when can_orders then (select count(*) from public.purchase_orders as po cross join lateral private.purchase_order_financials(po.id) as m where po.operational_project_id = target_project_id and m.is_delayed) end,
    'received_requirement_count', case when can_materials then (select count(*) from public.project_material_requirements as r cross join lateral private.requirement_quantities(r.id) as q where r.operational_project_id = target_project_id and q.procurement_state = 'received') end
  );
end;
$$;

-- ---------------------------------------------------------------------
-- C4/C5 facades re-created for the delivery side
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
  can_read_partners boolean := private.has_permission('partners.read');
  can_read_orders boolean := private.has_permission('procurement.orders.read');
  can_read_materials boolean := private.has_permission('procurement.materials.read');
begin
  if not (can_read_clients or can_read_projects or can_read_finance or can_read_partners or can_read_orders or can_read_materials) then
    raise exception using errcode = '42501', message = 'recent activity is not authorized';
  end if;
  if limit_count is null or limit_count < 1 or limit_count > 50 then
    raise exception using errcode = '22023', message = 'recent activity limit is outside the admitted range';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'action', log.action, 'entity_type', log.entity_type, 'entity_id', log.entity_id, 'outcome', log.outcome,
    'occurred_at', log.occurred_at, 'actor', profile.display_name,
    'label', coalesce(log.metadata ->> 'invoice_number', log.metadata ->> 'purchase_order_number')
  ) order by log.occurred_at desc), '[]'::jsonb)
  into result
  from (
    select * from public.audit_logs
    where (entity_type = 'client' and can_read_clients)
       or (entity_type = 'operational_project' and can_read_projects)
       or (entity_type = 'invoice' and can_read_finance)
       or (entity_type in ('trade_partner', 'contractor_assignment') and can_read_partners)
       or (entity_type = 'purchase_order' and can_read_orders)
       or (entity_type in ('material', 'material_requirement') and can_read_materials)
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
  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------

revoke all on function public.admin_list_materials(text, text, text, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_get_material(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_materials_for_picker(text, integer) from public, anon, authenticated;
revoke all on function public.find_possible_duplicate_materials(text, text, uuid) from public, anon, authenticated;
revoke all on function public.create_admin_material(text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.update_admin_material(uuid, integer, text, text, text, text, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.archive_admin_material(uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_project_procurement(uuid) from public, anon, authenticated;
revoke all on function public.create_material_requirement(uuid, text, numeric, text, uuid, text, date, text, text, text) from public, anon, authenticated;
revoke all on function public.update_material_requirement(uuid, integer, text, numeric, text, uuid, text, date, text, text, text) from public, anon, authenticated;
revoke all on function public.create_admin_purchase_order(uuid, uuid, text, numeric, text, date, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.update_admin_purchase_order(uuid, integer, uuid, text, numeric, jsonb, text, date, text, text) from public, anon, authenticated;
revoke all on function public.issue_admin_purchase_order(uuid, integer, date, date) from public, anon, authenticated;
revoke all on function public.cancel_admin_purchase_order(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.close_admin_purchase_order(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.duplicate_admin_purchase_order(uuid) from public, anon, authenticated;
revoke all on function public.record_goods_receipt(uuid, date, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.reverse_goods_receipt(uuid, text) from public, anon, authenticated;
revoke all on function public.create_purchase_order_share_link(uuid) from public, anon, authenticated;
revoke all on function public.revoke_purchase_order_share_link(uuid) from public, anon, authenticated;
revoke all on function public.public_purchase_order_by_share_token(text) from public, anon, authenticated;
revoke all on function public.admin_list_purchase_orders(text, uuid, uuid, text, text, text, boolean, date, date, timestamptz, uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_get_purchase_order(uuid) from public, anon, authenticated;
revoke all on function public.admin_delivery_overview() from public, anon, authenticated;
revoke all on function public.admin_delivery_action_queue(integer) from public, anon, authenticated;
revoke all on function public.admin_project_delivery_summary(uuid) from public, anon, authenticated;
revoke all on function public.admin_recent_activity(integer) from public, anon, authenticated;
revoke all on function public.admin_global_quick_find(text, integer) from public, anon, authenticated;

grant execute on function public.admin_list_materials(text, text, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_get_material(uuid) to authenticated;
grant execute on function public.admin_list_materials_for_picker(text, integer) to authenticated;
grant execute on function public.find_possible_duplicate_materials(text, text, uuid) to authenticated;
grant execute on function public.create_admin_material(text, text, text, text, text, uuid) to authenticated;
grant execute on function public.update_admin_material(uuid, integer, text, text, text, text, text, uuid, boolean) to authenticated;
grant execute on function public.archive_admin_material(uuid, integer) to authenticated;
grant execute on function public.admin_project_procurement(uuid) to authenticated;
grant execute on function public.create_material_requirement(uuid, text, numeric, text, uuid, text, date, text, text, text) to authenticated;
grant execute on function public.update_material_requirement(uuid, integer, text, numeric, text, uuid, text, date, text, text, text) to authenticated;
grant execute on function public.create_admin_purchase_order(uuid, uuid, text, numeric, text, date, text, text, jsonb) to authenticated;
grant execute on function public.update_admin_purchase_order(uuid, integer, uuid, text, numeric, jsonb, text, date, text, text) to authenticated;
grant execute on function public.issue_admin_purchase_order(uuid, integer, date, date) to authenticated;
grant execute on function public.cancel_admin_purchase_order(uuid, integer, text) to authenticated;
grant execute on function public.close_admin_purchase_order(uuid, integer, text) to authenticated;
grant execute on function public.duplicate_admin_purchase_order(uuid) to authenticated;
grant execute on function public.record_goods_receipt(uuid, date, jsonb, text, text) to authenticated;
grant execute on function public.reverse_goods_receipt(uuid, text) to authenticated;
grant execute on function public.create_purchase_order_share_link(uuid) to authenticated;
grant execute on function public.revoke_purchase_order_share_link(uuid) to authenticated;
grant execute on function public.admin_list_purchase_orders(text, uuid, uuid, text, text, text, boolean, date, date, timestamptz, uuid, integer) to authenticated;
grant execute on function public.admin_get_purchase_order(uuid) to authenticated;
grant execute on function public.admin_delivery_overview() to authenticated;
grant execute on function public.admin_delivery_action_queue(integer) to authenticated;
grant execute on function public.admin_project_delivery_summary(uuid) to authenticated;
grant execute on function public.admin_recent_activity(integer) to authenticated;
grant execute on function public.admin_global_quick_find(text, integer) to authenticated;
grant execute on function public.public_purchase_order_by_share_token(text) to anon, authenticated;
