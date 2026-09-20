begin;

create extension if not exists pgtap with schema extensions;

select plan(117);

-- =====================================================================
-- C6 delivery: trade partners, assignments, contractor finance, materials,
-- requirements, purchase orders, receipts, sharing, negatives. Rolls back.
-- =====================================================================

select is(
  (select count(*) from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where pg_namespace.nspname = 'public' and pg_proc.proname in (
     'admin_list_trade_partners', 'admin_list_partners_for_picker', 'admin_get_trade_partner', 'find_possible_duplicate_trade_partners',
     'create_admin_trade_partner', 'update_admin_trade_partner', 'add_trade_partner_capability', 'archive_admin_trade_partner',
     'admin_get_contractor_assignment', 'admin_project_contractors', 'create_contractor_assignment', 'update_contractor_assignment',
     'change_contractor_assignment_status', 'adjust_contractor_assignment_amount', 'rate_contractor_assignment',
     'record_contractor_payment', 'reverse_contractor_payment', 'admin_list_contractor_payables',
     'admin_list_materials', 'admin_get_material', 'admin_list_materials_for_picker', 'find_possible_duplicate_materials',
     'create_admin_material', 'update_admin_material', 'archive_admin_material', 'admin_project_procurement',
     'create_material_requirement', 'update_material_requirement', 'create_admin_purchase_order', 'update_admin_purchase_order',
     'issue_admin_purchase_order', 'cancel_admin_purchase_order', 'close_admin_purchase_order', 'duplicate_admin_purchase_order',
     'record_goods_receipt', 'reverse_goods_receipt', 'create_purchase_order_share_link', 'revoke_purchase_order_share_link',
     'public_purchase_order_by_share_token', 'admin_list_purchase_orders', 'admin_get_purchase_order',
     'admin_delivery_overview', 'admin_delivery_action_queue', 'admin_project_delivery_summary')
   and pg_proc.prosecdef and pg_proc.proconfig = array['search_path=""']::text[]),
  44::bigint, 'all C6 facades are SECURITY DEFINER with an empty search path');

select is(
  (select count(*) from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where pg_namespace.nspname = 'public' and pg_proc.proname like any (array['%trade_partner%', '%contractor%', '%material%', '%purchase_order%', '%goods_receipt%', '%delivery%'])
     and pg_proc.proname <> 'public_purchase_order_by_share_token' and has_function_privilege('anon', pg_proc.oid, 'EXECUTE')),
  0::bigint, 'anonymous callers cannot execute any staff delivery facade');
select ok(has_function_privilege('anon', 'public.public_purchase_order_by_share_token(text)', 'EXECUTE'),
  'the token-scoped supplier projection is the only anonymous procurement facade');

select ok(not has_table_privilege('anon', 'public.trade_partners', 'SELECT'), 'anon cannot select trade_partners');
select ok(not has_table_privilege('anon', 'public.contractor_assignments', 'SELECT'), 'anon cannot select contractor_assignments');
select ok(not has_table_privilege('anon', 'public.contractor_payments', 'SELECT'), 'anon cannot select contractor_payments');
select ok(not has_table_privilege('anon', 'public.materials', 'SELECT'), 'anon cannot select materials');
select ok(not has_table_privilege('anon', 'public.project_material_requirements', 'SELECT'), 'anon cannot select requirements');
select ok(not has_table_privilege('anon', 'public.purchase_orders', 'SELECT'), 'anon cannot select purchase_orders');
select ok(not has_table_privilege('anon', 'public.purchase_order_receipts', 'SELECT'), 'anon cannot select receipts');
select ok(not has_table_privilege('authenticated', 'public.purchase_order_share_links', 'SELECT'), 'authenticated cannot select PO share links directly');

-- Actors ---------------------------------------------------------------
insert into auth.users (id) values
  ('97000000-0000-4000-8000-0000000000d1'), ('97000000-0000-4000-8000-0000000000d2'),
  ('97000000-0000-4000-8000-0000000000d3'), ('97000000-0000-4000-8000-0000000000d4'),
  ('97000000-0000-4000-8000-0000000000d5');
update public.profiles set account_status = 'active', version = version + 1
where id in ('97000000-0000-4000-8000-0000000000d1', '97000000-0000-4000-8000-0000000000d2', '97000000-0000-4000-8000-0000000000d3', '97000000-0000-4000-8000-0000000000d5');
update public.profiles set account_status = 'disabled', version = version + 1 where id = '97000000-0000-4000-8000-0000000000d4';
insert into public.user_roles (user_id, role_id) select '97000000-0000-4000-8000-0000000000d1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id) select unnest(array['97000000-0000-4000-8000-0000000000d2', '97000000-0000-4000-8000-0000000000d3', '97000000-0000-4000-8000-0000000000d4']::uuid[]), id from public.roles where key = 'admin';
insert into public.roles (key, display_name) values ('c6-test-read-only', 'SYNTHETIC delivery read only');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id from public.roles cross join public.permissions
where roles.key = 'c6-test-read-only' and permissions.key in ('partners.read', 'procurement.materials.read', 'procurement.orders.read');
insert into public.user_roles (user_id, role_id) select '97000000-0000-4000-8000-0000000000d5', id from public.roles where key = 'c6-test-read-only';

create temporary table c6 (key text primary key, value jsonb not null);
create function pg_temp.v(k text) returns jsonb language sql as $$ select value from c6 where key = k $$;
create function pg_temp.id_of(k text) returns uuid language sql as $$ select (value ->> 'id')::uuid from c6 where key = k $$;
create function pg_temp.as_actor(actor uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated', 'aal', aal)::text, true);
$$;
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000d1', 'aal2');

-- Fixtures: client, project A, project B
insert into c6 values ('client', public.create_admin_client('SYNTHETIC C6 CLIENT', 'synthetic-c6@example.test'));
insert into c6 values ('project_a', public.create_admin_operational_project(pg_temp.id_of('client'), 'SYNTHETIC C6 PROJECT A', null, 'in_progress', 'execution', 'medium', null, null, 5000000, 'RWF'));
insert into c6 values ('project_b', public.create_admin_operational_project(pg_temp.id_of('client'), 'SYNTHETIC C6 PROJECT B'));
select is(pg_temp.v('project_b') ->> 'ok', 'true', 'fixtures created');

-- Trade partners ------------------------------------------------------
insert into c6 values ('contractor', public.create_admin_trade_partner('SYNTHETIC C6 CONTRACTOR', array['contractor'], 'SYNTHETIC BUILD LTD', 'Synthetic Person',
  'synthetic-c6-contractor@example.test', '+250780000701', 'SYNTHETIC ROAD 1', 'private partner note', array['Synthetic General Works', 'Masonry'], 'available'));
select is(pg_temp.v('contractor') ->> 'ok', 'true', 'a contractor-only partner is created');
insert into c6 values ('supplier', public.create_admin_trade_partner('SYNTHETIC C6 SUPPLIER', array['supplier'], null, null, 'synthetic-c6-supplier@example.test', '+250780000702'));
select is(pg_temp.v('supplier') ->> 'ok', 'true', 'a supplier-only partner is created');
insert into c6 values ('bad_capability', public.create_admin_trade_partner('SYNTHETIC BAD', array['warehouse'], null, null, 'x@example.test'));
select is(pg_temp.v('bad_capability') -> 'reasons' -> 0 ->> 'field', 'capabilities', 'unknown capabilities are rejected');
select throws_ok('insert into public.trade_partners (capabilities, display_name) values (array[]::text[], ''SYNTHETIC'')', '23514', null,
  'the database rejects a partner with no capability');
select is(
  (select count(*) from jsonb_array_elements(public.find_possible_duplicate_trade_partners('Someone', 'synthetic-c6-contractor@example.test')))::bigint,
  1::bigint, 'duplicate awareness finds the existing partner by email');
select is(
  (public.find_possible_duplicate_trade_partners('Someone', 'synthetic-c6-contractor@example.test') -> 0 ->> 'match'), 'email',
  'the duplicate match reports the matching field');
select is(jsonb_array_length(public.admin_list_trade_partners('supplier') -> 'items'), 1, 'the supplier register shows only supplier-capable partners');
select is(jsonb_array_length(public.admin_list_trade_partners('contractor') -> 'items'), 1, 'the contractor register shows only contractor-capable partners');

-- Capability enforcement ---------------------------------------------
insert into c6 values ('assign_supplier', public.create_contractor_assignment(pg_temp.id_of('project_a'), pg_temp.id_of('supplier'), 'SYNTHETIC scope'));
select is(pg_temp.v('assign_supplier') -> 'reasons' -> 0 ->> 'code', 'capability_missing', 'a supplier-only partner cannot be assigned as a contractor');
insert into c6 values ('po_contractor', public.create_admin_purchase_order(pg_temp.id_of('project_a'), pg_temp.id_of('contractor'), 'RWF'));
select is(pg_temp.v('po_contractor') -> 'reasons' -> 0 ->> 'code', 'capability_missing', 'a contractor-only partner cannot receive a purchase order');
insert into c6 values ('add_cap', public.add_trade_partner_capability(pg_temp.id_of('contractor'), 1, 'supplier'));
select is(pg_temp.v('add_cap') ->> 'ok', 'true', 'the contractor gains the supplier capability');
insert into c6 values ('po_both', public.create_admin_purchase_order(pg_temp.id_of('project_a'), pg_temp.id_of('contractor'), 'RWF'));
select is(pg_temp.v('po_both') ->> 'ok', 'true', 'after adding the capability the same partner can receive a purchase order');
select is(jsonb_array_length(public.admin_list_trade_partners('supplier') -> 'items'), 2, 'the partner now appears under Suppliers as well');
insert into c6 values ('add_cap_again', public.add_trade_partner_capability(pg_temp.id_of('contractor'), 2, 'supplier'));
select is(pg_temp.v('add_cap_again') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'a capability cannot be added twice');

-- Assignment + contractor finance ------------------------------------
insert into c6 values ('assignment', public.create_contractor_assignment(pg_temp.id_of('project_a'), pg_temp.id_of('contractor'), 'SYNTHETIC masonry works',
  'Synthetic General Works', 'active', current_date, current_date + 30, 'daily', 100000, 'rwf', 10, 950000, 'Weekly'));
select is(pg_temp.v('assignment') ->> 'ok', 'true', 'an active daily-rate assignment is created');
select is(public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'assignment' ->> 'currency', 'RWF', 'currency is normalized');
select is((public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'financials' ->> 'remaining_amount')::numeric, 950000::numeric, 'remaining equals the agreed amount before payment');
insert into c6 values ('no_currency', public.create_contractor_assignment(pg_temp.id_of('project_a'), pg_temp.id_of('contractor'), 'x', null, 'planned', null, null, 'daily', 100, null, null, null));
select is(pg_temp.v('no_currency') -> 'reasons' -> 0 ->> 'field', 'currency', 'a rate without a currency is rejected');
insert into c6 values ('unfunded', public.create_contractor_assignment(pg_temp.id_of('project_a'), pg_temp.id_of('contractor'), 'SYNTHETIC unfunded'));
insert into c6 values ('pay_unfunded', public.record_contractor_payment(pg_temp.id_of('unfunded'), 1, current_date, 'cash'));
select is(pg_temp.v('pay_unfunded') -> 'reasons' -> 0 ->> 'field', 'agreed_amount', 'payments require a currency and agreed amount');

insert into c6 values ('pay1', public.record_contractor_payment(pg_temp.id_of('assignment'), 350000, current_date, 'bank_transfer', 'SYN-1', 'private payment note'));
select is(pg_temp.v('pay1') ->> 'ok', 'true', 'a partial contractor payment is recorded');
select is((pg_temp.v('pay1') ->> 'remaining_amount')::numeric, 600000::numeric, 'remaining after 350000 is 600000');
select is(public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'financials' ->> 'payment_state', 'partially_paid', 'state is partially_paid');
insert into c6 values ('overpay', public.record_contractor_payment(pg_temp.id_of('assignment'), 600000.01, current_date, 'cash'));
select is(pg_temp.v('overpay') -> 'reasons' -> 0 ->> 'code', 'exceeds_remaining', 'overpayment is rejected');
insert into c6 values ('edit_locked', public.update_contractor_assignment(pg_temp.id_of('assignment'), 2, 'SYNTHETIC masonry works', null, null, null, 'daily', 100000, 'USD', 10, 950000, null));
select is(pg_temp.v('edit_locked') -> 'reasons' -> 0 ->> 'code', 'finance_locked', 'currency/agreed amount are locked by the edit facade after a payment');
select throws_ok('update public.contractor_assignments set currency = ''USD'' where id = pg_temp.id_of(''assignment'')', '55000', null,
  'the trigger freezes the currency after a payment even on a direct update');
insert into c6 values ('adjust_low', public.adjust_contractor_assignment_amount(pg_temp.id_of('assignment'), 2, 300000, 'SYNTHETIC'));
select is(pg_temp.v('adjust_low') -> 'reasons' -> 0 ->> 'field', 'agreed_amount', 'an adjustment below the paid amount is rejected');
insert into c6 values ('adjust', public.adjust_contractor_assignment_amount(pg_temp.id_of('assignment'), 2, 1000000, 'SYNTHETIC extra scope agreed'));
select is(pg_temp.v('adjust') ->> 'ok', 'true', 'an audited adjustment raises the agreed amount');
select is((public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'financials' ->> 'remaining_amount')::numeric, 650000::numeric, 'remaining reflects the adjusted amount');
select is(jsonb_array_length(public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'adjustments'), 1, 'the adjustment history is recorded');
insert into c6 values ('pay2', public.record_contractor_payment(pg_temp.id_of('assignment'), 650000, current_date, 'mobile_money'));
select is(public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'financials' ->> 'payment_state', 'paid', 'state is paid at zero remaining');
insert into c6 values ('reverse2', public.reverse_contractor_payment((pg_temp.v('pay2') ->> 'payment_id')::uuid, 'SYNTHETIC duplicate'));
select is(pg_temp.v('reverse2') ->> 'ok', 'true', 'a contractor payment is reversed with a reason');
select is((public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'financials' ->> 'remaining_amount')::numeric, 650000::numeric, 'remaining is restored after reversal');
select throws_ok('delete from public.contractor_payments where id = (pg_temp.v(''pay1'') ->> ''payment_id'')::uuid', '55000', null, 'contractor payments are never deleted');
insert into c6 values ('rate_active', public.rate_contractor_assignment(pg_temp.id_of('assignment'), (public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'assignment' ->> 'version')::integer, 5));
select is(pg_temp.v('rate_active') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'only completed assignments can be rated');
insert into c6 values ('archive_active', public.archive_admin_trade_partner(pg_temp.id_of('contractor'), 2));
select is(pg_temp.v('archive_active') -> 'reasons' -> 0 ->> 'field', 'assignments', 'a partner with active assignments cannot be archived');
insert into c6 values ('complete', public.change_contractor_assignment_status(pg_temp.id_of('assignment'), (public.admin_get_contractor_assignment(pg_temp.id_of('assignment')) -> 'assignment' ->> 'version')::integer, 'completed'));
select is(pg_temp.v('complete') ->> 'ok', 'true', 'the assignment is completed');
insert into c6 values ('rate', public.rate_contractor_assignment(pg_temp.id_of('assignment'), (pg_temp.v('complete') ->> 'version')::integer, 5, 'SYNTHETIC excellent'));
select is(pg_temp.v('rate') ->> 'ok', 'true', 'a completed assignment is rated');
select is((public.admin_get_trade_partner(pg_temp.id_of('contractor')) -> 'partner' -> 'performance' ->> 'average_rating')::numeric, 5.0::numeric, 'contractor performance is derived from rated assignments');
select is((public.admin_get_trade_partner(pg_temp.id_of('contractor')) -> 'partner' -> 'performance' ->> 'rated_count')::integer, 1, 'rated count is derived');
select is((public.admin_project_contractors(pg_temp.id_of('project_a')) -> 'summary_by_currency' -> 0 ->> 'remaining')::numeric, 650000::numeric, 'project contractor summary is grouped by currency');
select is(jsonb_array_length(public.admin_list_contractor_payables() -> 'items'), 1, 'contractor payables lists funded assignments only');

-- Materials, requirements, purchase orders ---------------------------
insert into c6 values ('material', public.create_admin_material('SYNTHETIC C6 MATERIAL A', 'bag', 'SYN-CEM-01', 'Cement', 'SYNTHETIC 50 kg bag', pg_temp.id_of('supplier')));
select is(pg_temp.v('material') ->> 'ok', 'true', 'a catalog material is created');
insert into c6 values ('material_dup', public.create_admin_material('SYNTHETIC OTHER', 'bag', 'syn-cem-01'));
select is(pg_temp.v('material_dup') -> 'reasons' -> 0 ->> 'code', 'duplicate_code', 'internal codes are unique case-insensitively');
select is((public.find_possible_duplicate_materials('synthetic c6 material a') -> 0 ->> 'match'), 'name', 'material duplicate awareness matches on normalized name');
insert into c6 values ('material_bad_supplier', public.create_admin_material('SYNTHETIC X', 'bag', null, null, null, pg_temp.id_of('supplier')));
select is(pg_temp.v('material_bad_supplier') ->> 'ok', 'true', 'preferred supplier accepted for a supplier-capable partner');

insert into c6 values ('requirement', public.create_material_requirement(pg_temp.id_of('project_a'), 'SYNTHETIC C6 MATERIAL A', 100, 'bag', pg_temp.id_of('material'), null, current_date + 10, 'high'));
select is(pg_temp.v('requirement') ->> 'ok', 'true', 'an approved requirement is created');
select is(public.admin_project_procurement(pg_temp.id_of('project_a')) -> 'requirements' -> 0 ->> 'procurement_state', 'not_ordered', 'requirement starts not ordered');
insert into c6 values ('requirement_b', public.create_material_requirement(pg_temp.id_of('project_b'), 'SYNTHETIC B ITEM', 5, 'piece'));

-- Mismatch: requirement of project B on a PO of project A
insert into c6 values ('po_mismatch', public.create_admin_purchase_order(pg_temp.id_of('project_a'), pg_temp.id_of('supplier'), 'RWF', 0, null, null, null, null,
  jsonb_build_array(jsonb_build_object('description', 'x', 'quantity', '1', 'unit_label', 'piece', 'unit_price', '1', 'material_requirement_id', pg_temp.id_of('requirement_b')))));
select is(pg_temp.v('po_mismatch') -> 'reasons' -> 0 ->> 'code', 'invalid_relationship', 'a requirement from another project is rejected by the facade');
select throws_ok(
  format('insert into public.purchase_order_line_items (purchase_order_id, operational_project_id, material_requirement_id, description, quantity, unit_label, unit_price) values (%L, %L, %L, ''x'', 1, ''piece'', 1)',
    pg_temp.id_of('po_both'), pg_temp.id_of('project_a'), pg_temp.id_of('requirement_b')),
  '23503', null, 'the composite foreign key rejects a cross-project requirement even on a direct insert');

-- Over-order guard
insert into c6 values ('po_over', public.create_admin_purchase_order(pg_temp.id_of('project_a'), pg_temp.id_of('supplier'), 'RWF', 0, null, null, null, null,
  jsonb_build_array(jsonb_build_object('description', 'Cement', 'quantity', '150', 'unit_label', 'bag', 'unit_price', '10000', 'material_requirement_id', pg_temp.id_of('requirement')))));
select is(pg_temp.v('po_over') -> 'reasons' -> 0 ->> 'code', 'over_order', 'ordering above the requirement is refused unless confirmed');

-- PO draft: 100 × 10000 at synthetic 10% tax
insert into c6 values ('po', public.create_admin_purchase_order(pg_temp.id_of('project_a'), pg_temp.id_of('supplier'), 'rwf', 10, 'SYN-PO-REF', current_date + 7, 'SYNTHETIC notes', 'SYNTHETIC terms',
  jsonb_build_array(jsonb_build_object('description', 'SYNTHETIC C6 MATERIAL A', 'quantity', '100', 'unit_label', 'bag', 'unit_price', '10000', 'material_requirement_id', pg_temp.id_of('requirement')))));
select is(pg_temp.v('po') ->> 'ok', 'true', 'a draft purchase order is created from the requirement');
select is((public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'financials' ->> 'subtotal')::numeric, 1000000::numeric, 'PO subtotal is 1,000,000');
select is((public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'financials' ->> 'tax_amount')::numeric, 100000::numeric, 'PO tax at the synthetic 10% is 100,000');
select is((public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'financials' ->> 'total')::numeric, 1100000::numeric, 'PO total is 1,100,000');
select is(public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'purchase_order' ->> 'purchase_order_number', null, 'a draft PO has no number');
select is(public.admin_project_procurement(pg_temp.id_of('project_a')) -> 'requirements' -> 0 ->> 'procurement_state', 'not_ordered', 'a draft PO does not count as ordered');

insert into c6 values ('receipt_draft', public.record_goods_receipt(pg_temp.id_of('po'), current_date, jsonb_build_array(jsonb_build_object('line_item_id', public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'lines' -> 0 ->> 'id', 'quantity_received', '1'))));
select is(pg_temp.v('receipt_draft') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'goods cannot be received against a draft');

insert into c6 values ('issued', public.issue_admin_purchase_order(pg_temp.id_of('po'), 1, current_date, current_date + 7));
select is(pg_temp.v('issued') ->> 'ok', 'true', 'the PO is issued');
select matches(pg_temp.v('issued') ->> 'purchase_order_number', '^RENZ-PO-[0-9]{4}-000001$', 'the first PO number of the year is RENZ-PO-YYYY-000001');
insert into c6 values ('reissue', public.issue_admin_purchase_order(pg_temp.id_of('po'), 2, current_date));
select is(pg_temp.v('reissue') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'issuing twice is rejected');
insert into c6 values ('po_detail', public.admin_get_purchase_order(pg_temp.id_of('po')));
select is(pg_temp.v('po_detail') -> 'document' -> 'supplier' ->> 'display_name', 'SYNTHETIC C6 SUPPLIER', 'the supplier snapshot is frozen');
select is(pg_temp.v('po_detail') -> 'document' -> 'project' ->> 'title', 'SYNTHETIC C6 PROJECT A', 'the project snapshot is frozen');
select is(pg_temp.v('po_detail') -> 'document' -> 'issuer' ->> 'name', 'RENZ Construction Services Ltd', 'the issuer snapshot reuses the C5 identity');
select throws_ok('update public.purchase_orders set tax_rate = 0 where id = pg_temp.id_of(''po'')', '55000', null, 'issued PO identity is immutable');
select throws_ok('delete from public.purchase_order_line_items where purchase_order_id = pg_temp.id_of(''po'')', '55000', null, 'issued PO lines are immutable');
insert into c6 values ('edit_issued', public.update_admin_purchase_order(pg_temp.id_of('po'), 2, pg_temp.id_of('supplier'), 'RWF', 0, '[]'::jsonb));
select is(pg_temp.v('edit_issued') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'the edit facade refuses an issued PO');
select is(public.admin_project_procurement(pg_temp.id_of('project_a')) -> 'requirements' -> 0 ->> 'procurement_state', 'ordered', 'the requirement is now ordered');
select is((public.admin_project_procurement(pg_temp.id_of('project_a')) -> 'requirements' -> 0 ->> 'ordered_quantity')::numeric, 100::numeric, 'ordered quantity is 100');

-- Supplier edit does not alter the issued document
insert into c6 values ('supplier_edit', public.update_admin_trade_partner(pg_temp.id_of('supplier'), 1, 'SYNTHETIC C6 SUPPLIER RENAMED'));
select is(public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'document' -> 'supplier' ->> 'display_name', 'SYNTHETIC C6 SUPPLIER', 'the issued PO keeps the supplier snapshot');

-- Receipts
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000d1', 'aal2');
insert into c6 values ('line', (public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'lines' -> 0));
insert into c6 values ('receipt1', public.record_goods_receipt(pg_temp.id_of('po'), current_date, jsonb_build_array(jsonb_build_object('line_item_id', pg_temp.id_of('line'), 'quantity_received', '40')), 'DN-1', 'private receipt note'));
select is(pg_temp.v('receipt1') ->> 'ok', 'true', 'a partial delivery of 40 is recorded');
select is(pg_temp.v('receipt1') ->> 'delivery_state', 'partially_received', 'delivery state is partially received');
select is((pg_temp.v('receipt1') ->> 'remaining_quantity')::numeric, 60::numeric, 'remaining is 60');
select is(public.admin_project_procurement(pg_temp.id_of('project_a')) -> 'requirements' -> 0 ->> 'procurement_state', 'partially_received', 'the requirement reflects the partial delivery');
insert into c6 values ('over_receipt', public.record_goods_receipt(pg_temp.id_of('po'), current_date, jsonb_build_array(jsonb_build_object('line_item_id', pg_temp.id_of('line'), 'quantity_received', '61'))));
select is(pg_temp.v('over_receipt') -> 'reasons' -> 0 ->> 'code', 'over_receipt', 'receiving above the remaining quantity is refused');
insert into c6 values ('cancel_received', public.cancel_admin_purchase_order(pg_temp.id_of('po'), (public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'purchase_order' ->> 'version')::integer, 'SYNTHETIC'));
select is(pg_temp.v('cancel_received') -> 'reasons' -> 0 ->> 'field', 'receipts', 'a PO with effective receipts cannot be cancelled');
insert into c6 values ('receipt2', public.record_goods_receipt(pg_temp.id_of('po'), current_date, jsonb_build_array(jsonb_build_object('line_item_id', pg_temp.id_of('line'), 'quantity_received', '60'))));
select is(pg_temp.v('receipt2') ->> 'delivery_state', 'received', 'the full remaining delivery completes the order');
select is(public.admin_project_procurement(pg_temp.id_of('project_a')) -> 'requirements' -> 0 ->> 'procurement_state', 'received', 'the requirement is received');
insert into c6 values ('reverse_receipt', public.reverse_goods_receipt((pg_temp.v('receipt2') ->> 'receipt_id')::uuid, 'SYNTHETIC wrong count'));
select is(pg_temp.v('reverse_receipt') ->> 'ok', 'true', 'a receipt is reversed with a reason');
select is((public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'financials' ->> 'received_quantity')::numeric, 40::numeric, 'received quantity recalculates after reversal');
select throws_ok('delete from public.purchase_order_receipts where id = (pg_temp.v(''receipt1'') ->> ''receipt_id'')::uuid', '55000', null, 'receipts are never deleted');
select throws_ok('update public.purchase_order_receipt_items set quantity_received = 1', '55000', null, 'receipt lines are immutable');

-- Share link
insert into c6 values ('share', public.create_purchase_order_share_link(pg_temp.id_of('po')));
select is(pg_temp.v('share') ->> 'ok', 'true', 'a supplier link is generated');
select is(public.public_purchase_order_by_share_token(pg_temp.v('share') ->> 'token') ->> 'purchase_order_number', pg_temp.v('issued') ->> 'purchase_order_number', 'the token resolves the PO document');
select ok(not (public.public_purchase_order_by_share_token(pg_temp.v('share') ->> 'token')::text ilike '%private receipt note%'), 'the shared document carries no private notes');
select ok(not (public.public_purchase_order_by_share_token(pg_temp.v('share') ->> 'token') ? 'client'), 'the shared document carries no client data');
select is((select count(*) from public.purchase_order_share_links where token_hash = pg_temp.v('share') ->> 'token')::bigint, 0::bigint, 'the raw token is never stored');
insert into c6 values ('revoke', public.revoke_purchase_order_share_link(pg_temp.id_of('po')));
select is(public.public_purchase_order_by_share_token(pg_temp.v('share') ->> 'token'), null, 'a revoked token resolves to nothing');

-- Close
insert into c6 values ('close', public.close_admin_purchase_order(pg_temp.id_of('po'), (public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'purchase_order' ->> 'version')::integer, 'SYNTHETIC supplier cannot deliver the rest'));
select is(pg_temp.v('close') ->> 'ok', 'true', 'an issued PO with a shortfall can be closed with a reason');
insert into c6 values ('receipt_closed', public.record_goods_receipt(pg_temp.id_of('po'), current_date, jsonb_build_array(jsonb_build_object('line_item_id', pg_temp.id_of('line'), 'quantity_received', '1'))));
select is(pg_temp.v('receipt_closed') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'no further receipts after close');
select is((public.admin_get_purchase_order(pg_temp.id_of('po')) -> 'financials' ->> 'received_quantity')::numeric, 40::numeric, 'delivered history survives close');
select is(public.admin_project_procurement(pg_temp.id_of('project_a')) -> 'requirements' -> 0 ->> 'procurement_state', 'partially_received', 'closed orders still count as ordered/received for the requirement');

-- Delivery summary groups by currency, never a combined figure
insert into c6 values ('usd_assignment', public.create_contractor_assignment(pg_temp.id_of('project_a'), pg_temp.id_of('contractor'), 'SYNTHETIC USD works', null, 'planned', null, null, 'fixed_project', 500, 'USD', null, 500));
select is(jsonb_array_length(public.admin_project_delivery_summary(pg_temp.id_of('project_a')) -> 'by_currency'), 2, 'the project delivery summary has one row per currency');
select ok(not (public.admin_project_delivery_summary(pg_temp.id_of('project_a')) ? 'total'), 'the delivery summary never emits a combined total');
select ok(not (public.admin_delivery_overview() ?| array['total_outstanding', 'profit', 'margin']), 'the delivery overview never emits profit, margin, or a combined total');

-- Negatives -------------------------------------------------------------
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000d3', 'aal1');
select throws_ok('select public.admin_get_trade_partner(pg_temp.id_of(''contractor''))', '42501', null, 'AAL1: partner detail is denied');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000d4', 'aal2');
select throws_ok('select public.admin_list_purchase_orders()', '42501', null, 'disabled staff: purchase orders are denied');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000d5', 'aal2');
select isnt(public.admin_get_trade_partner(pg_temp.id_of('contractor')), null, 'read-only delivery staff can read a partner');
select is(public.create_admin_trade_partner('SYNTHETIC', array['supplier'], null, null, 'x@example.test') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing partners.write: creation denied');
select is(public.create_contractor_assignment(pg_temp.id_of('project_a'), pg_temp.id_of('contractor'), 'x') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing contractors.assign: assignment denied');
select is(public.record_contractor_payment(pg_temp.id_of('assignment'), 1, current_date, 'cash') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing contractors.payments.write: payment denied');
select is(public.create_admin_material('x', 'bag') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing procurement.materials.write: material denied');
select is(public.create_admin_purchase_order(pg_temp.id_of('project_a'), pg_temp.id_of('supplier'), 'RWF') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing procurement.orders.write: PO denied');
select is(public.issue_admin_purchase_order(pg_temp.id_of('po_both'), 1, current_date) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing procurement.orders.issue: issue denied');
select is(public.record_goods_receipt(pg_temp.id_of('po'), current_date, '[]'::jsonb) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing procurement.receipts.write: receipt denied');
select pg_temp.as_actor('97000000-0000-4000-8000-0000000000d1', 'aal2');
select throws_ok('select public.admin_get_purchase_order(''not-a-uuid''::text::uuid)', '22P02', null, 'a malformed id is rejected as a cast error before any query runs');

select * from finish();

rollback;
