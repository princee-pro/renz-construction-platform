-- C7 — settings effects: the C4/C5/C6 overview and action-queue facades now
-- read their thresholds from operational_settings (defaults match the
-- previous constants exactly), and Quick Find gains SETTING entries.
-- Bodies are the verified C4/C5/C6 definitions with only the declarations
-- changed; behaviour at default settings is identical.


create or replace function public.admin_operations_overview()
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

create or replace function public.admin_finance_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  due_soon_days constant integer := coalesce(private.operational_setting('invoice_due_soon_days'), 7);
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

create or replace function public.admin_project_procurement(target_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  due_soon_days constant integer := coalesce(private.operational_setting('material_required_soon_days'), 14);
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

create or replace function public.admin_delivery_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  po_soon_days constant integer := coalesce(private.operational_setting('po_expected_soon_days'), 7);
  material_soon_days constant integer := coalesce(private.operational_setting('material_required_soon_days'), 14);
  assignment_soon_days constant integer := coalesce(private.operational_setting('assignment_ending_soon_days'), 14);
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
  po_soon_days constant integer := coalesce(private.operational_setting('po_expected_soon_days'), 7);
  material_soon_days constant integer := coalesce(private.operational_setting('material_required_soon_days'), 14);
  assignment_soon_days constant integer := coalesce(private.operational_setting('assignment_ending_soon_days'), 14);
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
  result := result || private.settings_quick_find(normalized_query);
  return result;
end;
$$;

-- Document defaults for NEW drafts only: readable by anyone who can create
-- an invoice or purchase order draft (form defaults, never a snapshot rewrite).
create or replace function public.admin_document_defaults()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('finance.invoices.write') or private.has_permission('procurement.orders.write') or private.has_permission('settings.system.read')) then
    raise exception using errcode = '42501', message = 'document defaults are not authorized';
  end if;
  return (select to_jsonb(d) - 'updated_by' - 'version' - 'updated_at' from public.document_defaults as d where d.id = 1);
end;
$$;

-- Execute grants: staff facades to authenticated (default privileges revoke
-- execute from public); the anonymous projection facades were granted above.
grant execute on function public.admin_settings_overview() to authenticated;
grant execute on function public.admin_get_business_settings() to authenticated;
grant execute on function public.admin_get_website_settings() to authenticated;
grant execute on function public.admin_list_brand_media_candidates(text, integer) to authenticated;
grant execute on function public.admin_get_legal_pages() to authenticated;
grant execute on function public.admin_get_system_settings() to authenticated;
grant execute on function public.admin_launch_readiness() to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_list_configuration_snapshots(integer) to authenticated;
grant execute on function public.admin_document_defaults() to authenticated;
grant execute on function public.admin_setting_href(uuid) to authenticated;
grant execute on function public.update_business_profile(integer, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.upsert_contact_channel(integer, text, text, text, uuid, text, boolean, boolean, boolean, integer) to authenticated;
grant execute on function public.update_business_location(integer, boolean, text, text, text, text, text, text, numeric, numeric, text, text, text) to authenticated;
grant execute on function public.update_business_hours(integer, jsonb) to authenticated;
grant execute on function public.upsert_social_link(integer, text, text, uuid, text, boolean, integer) to authenticated;
grant execute on function public.update_website_settings(integer, text, text, text, text, text, text, text, text, text, text, boolean, boolean, text, boolean) to authenticated;
grant execute on function public.update_navigation_settings(integer, jsonb) to authenticated;
grant execute on function public.update_brand_media_settings(integer, uuid, uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.update_seo_settings(integer, text, text, text, text, text) to authenticated;
grant execute on function public.update_legal_page_draft(text, integer, text, text) to authenticated;
grant execute on function public.publish_legal_page(text, integer) to authenticated;
grant execute on function public.update_document_defaults(integer, text, text[], text, numeric, integer, text, numeric, integer, text, text) to authenticated;
grant execute on function public.update_operational_settings(integer, integer, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.publish_public_configuration(text) to authenticated;
grant execute on function public.change_site_mode(integer, text) to authenticated;
grant execute on function public.reactivate_user(uuid) to authenticated;
grant execute on function public.set_staff_role(uuid, text) to authenticated;
