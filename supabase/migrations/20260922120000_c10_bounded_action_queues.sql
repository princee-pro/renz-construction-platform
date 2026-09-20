-- C10 §88, §111, §182 — bounded action queues.
--
-- Found by the C10 scale test (2500 invoices, 1000 projects): the three
-- attention queues validated `limit_count` but applied `limit` to the
-- aggregated row (always one), not to the items, so the Overview and the
-- Finance / Operations / Delivery hubs rendered EVERY matching item
-- (~830 overdue invoices → 1.1 MB HTML). The lead queue already bounded
-- its items. Each queue now orders and limits the items before aggregating;
-- the ordering, permissions, settings and JSON shape are unchanged.

create or replace function public.admin_action_queue(limit_count integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ending_soon_days constant integer := coalesce(private.operational_setting('project_ending_soon_days'), 14);
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
    select * from (
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
    ) as candidate
    order by candidate.rank, candidate.updated_at desc
    limit limit_count
  ) as queue_item;

  return result;
end;
$$;

create or replace function public.admin_finance_action_queue(limit_count integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  due_soon_days constant integer := coalesce(private.operational_setting('invoice_due_soon_days'), 7);
  stale_draft_days constant integer := coalesce(private.operational_setting('stale_draft_invoice_days'), 14);
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
    select * from (
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
    ) as candidate
    order by candidate.rank, candidate.due_date nulls last, candidate.updated_at desc
    limit limit_count
  ) as item;

  return result;
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
    select * from (
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
    ) as candidate
    order by candidate.rank, candidate.due nulls last, candidate.updated_at desc
    limit limit_count
  ) as item;
  return result;
end;
$$;
