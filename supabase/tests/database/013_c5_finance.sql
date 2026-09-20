begin;

create extension if not exists pgtap with schema extensions;

select plan(100);

-- =====================================================================
-- C5 finance: shape, lifecycle, money, numbering, immutability, integrity,
-- payments, sharing, and security negatives. Everything rolls back.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function security shape
-- ---------------------------------------------------------------------

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_list_invoices', 'admin_get_invoice', 'admin_client_invoices', 'admin_project_invoices',
        'admin_finance_overview', 'admin_finance_action_queue', 'public_invoice_by_share_token',
        'create_admin_invoice', 'update_admin_invoice', 'issue_admin_invoice', 'void_admin_invoice',
        'archive_admin_invoice', 'duplicate_admin_invoice', 'record_invoice_payment',
        'reverse_invoice_payment', 'create_invoice_share_link', 'revoke_invoice_share_link'
      )
      and pg_proc.prosecdef
      and pg_proc.proconfig = array['search_path=""']::text[]
  ),
  17::bigint,
  'all C5 finance facades are SECURITY DEFINER with an empty search path'
);

select is(
  (
    select count(*)
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_list_invoices', 'admin_get_invoice', 'admin_client_invoices', 'admin_project_invoices',
        'admin_finance_overview', 'admin_finance_action_queue',
        'create_admin_invoice', 'update_admin_invoice', 'issue_admin_invoice', 'void_admin_invoice',
        'archive_admin_invoice', 'duplicate_admin_invoice', 'record_invoice_payment',
        'reverse_invoice_payment', 'create_invoice_share_link', 'revoke_invoice_share_link'
      )
      and has_function_privilege('anon', pg_proc.oid, 'EXECUTE')
  ),
  0::bigint,
  'anonymous callers cannot execute any staff finance facade'
);

select ok(
  (select has_function_privilege('anon', 'public.public_invoice_by_share_token(text)', 'EXECUTE')),
  'the token-scoped client projection is the only anonymous finance facade'
);

select ok(not has_table_privilege('anon', 'public.invoices', 'SELECT'), 'anon cannot select invoices');
select ok(not has_table_privilege('anon', 'public.invoice_line_items', 'SELECT'), 'anon cannot select invoice_line_items');
select ok(not has_table_privilege('anon', 'public.invoice_payments', 'SELECT'), 'anon cannot select invoice_payments');
select ok(not has_table_privilege('anon', 'public.invoice_share_links', 'SELECT'), 'anon cannot select invoice_share_links');
select ok(not has_table_privilege('authenticated', 'public.invoice_share_links', 'SELECT'), 'authenticated cannot select invoice_share_links directly');
select ok(not has_table_privilege('authenticated', 'public.invoices', 'SELECT'), 'authenticated cannot select invoices directly');

-- ---------------------------------------------------------------------
-- Actors
-- ---------------------------------------------------------------------

insert into auth.users (id) values
  ('97000000-0000-4000-8000-0000000000c1'), -- super_admin
  ('97000000-0000-4000-8000-0000000000c2'), -- admin (no void)
  ('97000000-0000-4000-8000-0000000000c3'), -- admin, AAL1
  ('97000000-0000-4000-8000-0000000000c4'), -- admin, disabled
  ('97000000-0000-4000-8000-0000000000c5'), -- synthetic: read only
  ('97000000-0000-4000-8000-0000000000c6'), -- synthetic: read+write, no issue/payments/void
  ('97000000-0000-4000-8000-0000000000c7'); -- synthetic: no finance read

update public.profiles set account_status = 'active', version = version + 1
where id in (
  '97000000-0000-4000-8000-0000000000c1', '97000000-0000-4000-8000-0000000000c2',
  '97000000-0000-4000-8000-0000000000c3', '97000000-0000-4000-8000-0000000000c5',
  '97000000-0000-4000-8000-0000000000c6', '97000000-0000-4000-8000-0000000000c7'
);
update public.profiles set account_status = 'disabled', version = version + 1
where id = '97000000-0000-4000-8000-0000000000c4';

insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000c1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id)
select unnest(array['97000000-0000-4000-8000-0000000000c2', '97000000-0000-4000-8000-0000000000c3', '97000000-0000-4000-8000-0000000000c4']::uuid[]), id
from public.roles where key = 'admin';

insert into public.roles (key, display_name) values
  ('c5-test-read-only', 'SYNTHETIC finance read only'),
  ('c5-test-read-write', 'SYNTHETIC finance read+write'),
  ('c5-test-no-finance', 'SYNTHETIC no finance');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id from public.roles cross join public.permissions
where (roles.key = 'c5-test-read-only' and permissions.key = 'finance.invoices.read')
   or (roles.key = 'c5-test-read-write' and permissions.key in ('finance.invoices.read', 'finance.invoices.write'))
   or (roles.key = 'c5-test-no-finance' and permissions.key in ('clients.read', 'operations.projects.read'));
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000c5', id from public.roles where key = 'c5-test-read-only';
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000c6', id from public.roles where key = 'c5-test-read-write';
insert into public.user_roles (user_id, role_id)
select '97000000-0000-4000-8000-0000000000c7', id from public.roles where key = 'c5-test-no-finance';

create temporary table c5 (key text primary key, value jsonb not null);
create function pg_temp.v(k text) returns jsonb language sql as $$ select value from c5 where key = k $$;
create function pg_temp.id_of(k text) returns uuid language sql as $$ select (value ->> 'id')::uuid from c5 where key = k $$;
create function pg_temp.as_actor(actor uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated', 'aal', aal)::text, true);
$$;

select pg_temp.as_actor('97000000-0000-4000-8000-0000000000c1', 'aal2');

-- Fixtures: client A (+ project A), client B (+ project B)
insert into c5 values ('client_a', public.create_admin_client('SYNTHETIC C5 CLIENT A', 'synthetic-c5-a@example.test', '+250780000501', 'SYNTHETIC Street 1', 'SYNTHETIC A Ltd', 'vip'));
insert into c5 values ('client_b', public.create_admin_client('SYNTHETIC C5 CLIENT B', 'synthetic-c5-b@example.test', null, null, null, 'standard'));
insert into c5 values ('project_a', public.create_admin_operational_project(pg_temp.id_of('client_a'), 'SYNTHETIC C5 PROJECT A'));
insert into c5 values ('project_b', public.create_admin_operational_project(pg_temp.id_of('client_b'), 'SYNTHETIC C5 PROJECT B'));
select is(pg_temp.v('project_b') ->> 'ok', 'true', 'fixture clients and projects created');

-- ---------------------------------------------------------------------
-- Client/project integrity (§94)
-- ---------------------------------------------------------------------

insert into c5 values ('mismatch', public.create_admin_invoice(pg_temp.id_of('client_a'), pg_temp.id_of('project_b'), 'RWF', 0));
select is(pg_temp.v('mismatch') ->> 'ok', 'false', 'an invoice for client A cannot reference a project of client B (facade)');
select is(pg_temp.v('mismatch') -> 'reasons' -> 0 ->> 'code', 'invalid_relationship', 'the mismatch reports invalid_relationship');
select throws_ok(
  'insert into public.invoices (client_id, operational_project_id, currency) values (pg_temp.id_of(''client_a''), pg_temp.id_of(''project_b''), ''RWF'')',
  '23503', null,
  'the composite foreign key rejects a client/project mismatch even on a direct insert'
);

-- ---------------------------------------------------------------------
-- Draft lifecycle and money (§93 fixture: 2×100000 + 3×50000, 10% test tax)
-- ---------------------------------------------------------------------

insert into c5 values ('draft', public.create_admin_invoice(
  pg_temp.id_of('client_a'), pg_temp.id_of('project_a'), 'rwf', 10, 'SYNTHETIC-REF-1',
  'SYNTHETIC notes', 'SYNTHETIC terms', null, null,
  '[{"description":"Design coordination","quantity":"2","unit_label":"service","unit_price":"100000"},
    {"description":"Site supervision","quantity":"3","unit_label":"day","unit_price":"50000"}]'::jsonb
));
select is(pg_temp.v('draft') ->> 'ok', 'true', 'a draft invoice with two line items is created');
select is(
  (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'invoice' ->> 'currency'), 'RWF',
  'currency is normalized to uppercase'
);
select is(
  (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'invoice' ->> 'invoice_number'), null,
  'a draft has no official invoice number'
);
select is(
  (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'subtotal')::numeric, 350000::numeric,
  'subtotal is 350000'
);
select is(
  (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'tax_amount')::numeric, 35000::numeric,
  'tax at the synthetic 10% test rate is 35000'
);
select is(
  (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'total')::numeric, 385000::numeric,
  'total is 385000'
);
select is(
  (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'payment_state'), 'unpaid',
  'a draft reports unpaid with the full balance'
);

-- Rounding rule: 3 × 33.333 at 7.5% → line 99.999 → rounds 100.00; tax 7.50
insert into c5 values ('rounding', public.create_admin_invoice(
  pg_temp.id_of('client_b'), null, 'USD', 7.5, null, null, null, null, null,
  '[{"description":"Fractional","quantity":"3","unit_price":"33.333"}]'::jsonb
));
select is(
  (public.admin_get_invoice(pg_temp.id_of('rounding')) -> 'lines' -> 0 ->> 'unit_price')::numeric, 33.33::numeric,
  'unit prices are stored to two decimals'
);
select is(
  (public.admin_get_invoice(pg_temp.id_of('rounding')) -> 'financials' ->> 'tax_amount')::numeric, 7.50::numeric,
  'tax is rounded half-up to two decimals from the rounded subtotal'
);

-- Draft edit with versioning
insert into c5 values ('draft_update', public.update_admin_invoice(
  pg_temp.id_of('draft'), 1, pg_temp.id_of('client_a'), 'RWF', 10,
  '[{"description":"Design coordination","quantity":"2","unit_label":"service","unit_price":"100000"},
    {"description":"Site supervision","quantity":"3","unit_label":"day","unit_price":"50000"}]'::jsonb,
  pg_temp.id_of('project_a'), 'SYNTHETIC-REF-2', 'SYNTHETIC notes v2', 'SYNTHETIC terms', null, null
));
select is(pg_temp.v('draft_update') ->> 'ok', 'true', 'a draft can be edited with the expected version');
insert into c5 values ('draft_stale', public.update_admin_invoice(
  pg_temp.id_of('draft'), 1, pg_temp.id_of('client_a'), 'RWF', 10, '[]'::jsonb
));
select is(pg_temp.v('draft_stale') -> 'reasons' -> 0 ->> 'code', 'version_conflict', 'a stale draft save is rejected as version_conflict');
select is(
  (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'invoice' ->> 'reference'), 'SYNTHETIC-REF-2',
  'the stale save did not overwrite the accepted edit'
);

-- Issue validation
insert into c5 values ('empty_draft', public.create_admin_invoice(pg_temp.id_of('client_b'), null, 'GBP', 0));
insert into c5 values ('issue_empty', public.issue_admin_invoice(pg_temp.id_of('empty_draft'), 1, current_date, current_date));
select is(pg_temp.v('issue_empty') -> 'reasons' -> 0 ->> 'code', 'invalid_input', 'an empty draft cannot be issued');
insert into c5 values ('issue_bad_due', public.issue_admin_invoice(pg_temp.id_of('draft'), 2, current_date, current_date - 1));
select is(pg_temp.v('issue_bad_due') -> 'reasons' -> 0 ->> 'field', 'due_date', 'a due date before the issue date is rejected');

-- ---------------------------------------------------------------------
-- Issue: atomic numbering + frozen snapshots + immutability
-- ---------------------------------------------------------------------

insert into c5 values ('issued', public.issue_admin_invoice(pg_temp.id_of('draft'), 2, current_date, current_date + 14));
select is(pg_temp.v('issued') ->> 'ok', 'true', 'a complete draft is issued');
select matches(pg_temp.v('issued') ->> 'invoice_number', '^RENZ-[0-9]{4}-000001$', 'the first official number of the year is RENZ-YYYY-000001');
insert into c5 values ('reissue', public.issue_admin_invoice(pg_temp.id_of('draft'), 3, current_date, current_date + 14));
select is(pg_temp.v('reissue') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'issuing the same invoice twice is rejected');

insert into c5 values ('issued_detail', public.admin_get_invoice(pg_temp.id_of('draft')));
select is(pg_temp.v('issued_detail') -> 'invoice' ->> 'lifecycle_state', 'issued', 'lifecycle is issued');
select is(pg_temp.v('issued_detail') -> 'document' -> 'client' ->> 'full_name', 'SYNTHETIC C5 CLIENT A', 'the billing snapshot captured the client name');
select is(pg_temp.v('issued_detail') -> 'document' -> 'client' ->> 'company', 'SYNTHETIC A Ltd', 'the billing snapshot captured the company');
select is(pg_temp.v('issued_detail') -> 'document' -> 'project' ->> 'title', 'SYNTHETIC C5 PROJECT A', 'the project snapshot captured the title only');
select is(pg_temp.v('issued_detail') -> 'document' -> 'issuer' ->> 'name', 'RENZ Construction Services Ltd', 'the issuer snapshot carries the authorized business name');
select is(pg_temp.v('issued_detail') -> 'document' -> 'issuer' ->> 'tax_label', 'Tax', 'the tax label is neutral, never VAT by default');
select ok(
  not (pg_temp.v('issued_detail') -> 'document' -> 'issuer' ?| array['vat_number', 'registration_number', 'bank_account']),
  'no legal identifiers are fabricated on the issuer snapshot'
);
select is((pg_temp.v('issued_detail') -> 'financials' ->> 'total')::numeric, 385000::numeric, 'the frozen issued total is 385000');

-- Snapshot survives a client edit
insert into c5 values ('client_edit', public.update_admin_client(pg_temp.id_of('client_a'), 1, 'SYNTHETIC C5 CLIENT A RENAMED', 'synthetic-c5-a@example.test', null, null, null, 'vip', null, null));
select is(pg_temp.v('client_edit') ->> 'ok', 'true', 'the client record was edited after issue');
select is(
  public.admin_get_invoice(pg_temp.id_of('draft')) -> 'document' -> 'client' ->> 'full_name', 'SYNTHETIC C5 CLIENT A',
  'the issued invoice still renders the billing snapshot, not the edited client row'
);

-- Immutability
insert into c5 values ('issued_edit', public.update_admin_invoice(
  pg_temp.id_of('draft'), 3, pg_temp.id_of('client_a'), 'USD', 0, '[]'::jsonb
));
select is(pg_temp.v('issued_edit') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'the edit facade refuses an issued invoice');
select throws_ok(
  'update public.invoices set tax_rate = 0 where id = pg_temp.id_of(''draft'')',
  '55000', null, 'a direct update of issued financial identity is blocked by trigger'
);
select throws_ok(
  'insert into public.invoice_line_items (invoice_id, description, quantity, unit_price) values (pg_temp.id_of(''draft''), ''late line'', 1, 1)',
  '55000', null, 'line items of an issued invoice are immutable'
);
select throws_ok(
  'delete from public.invoice_line_items where invoice_id = pg_temp.id_of(''draft'')',
  '55000', null, 'line items of an issued invoice cannot be deleted'
);

-- Second issue in the same year takes the next number
insert into c5 values ('draft2', public.create_admin_invoice(pg_temp.id_of('client_b'), null, 'USD', 0, null, null, null, null, null,
  '[{"description":"Consulting","quantity":"1","unit_price":"100"}]'::jsonb));
insert into c5 values ('issued2', public.issue_admin_invoice(pg_temp.id_of('draft2'), 1, current_date, current_date - 1 + 1));
select matches(pg_temp.v('issued2') ->> 'invoice_number', '^RENZ-[0-9]{4}-000002$', 'the second issued invoice takes the next number');

-- ---------------------------------------------------------------------
-- Payments: partial, paid, overpayment, reversal, void rules
-- ---------------------------------------------------------------------

insert into c5 values ('pay1', public.record_invoice_payment(pg_temp.id_of('draft'), 100000, current_date, 'bank_transfer', 'SYN-TX-1', 'SYNTHETIC private note'));
select is(pg_temp.v('pay1') ->> 'ok', 'true', 'a first payment is recorded');
select is((pg_temp.v('pay1') ->> 'balance_due')::numeric, 285000::numeric, 'the balance after 100000 is 285000');
select is(public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'payment_state', 'partially_paid', 'payment state is partially_paid');

insert into c5 values ('overpay', public.record_invoice_payment(pg_temp.id_of('draft'), 285000.01, current_date, 'cash'));
select is(pg_temp.v('overpay') -> 'reasons' -> 0 ->> 'code', 'exceeds_balance', 'a payment exceeding the balance is rejected');
insert into c5 values ('zero_pay', public.record_invoice_payment(pg_temp.id_of('draft'), 0, current_date, 'cash'));
select is(pg_temp.v('zero_pay') ->> 'ok', 'false', 'a zero payment is rejected');

insert into c5 values ('pay2', public.record_invoice_payment(pg_temp.id_of('draft'), 285000, current_date, 'mobile_money'));
select is(pg_temp.v('pay2') ->> 'ok', 'true', 'the remaining balance is paid');
select is(public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'payment_state', 'paid', 'payment state is paid');
select is((public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'balance_due')::numeric, 0::numeric, 'balance is zero');

-- Void with effective payments is refused
insert into c5 values ('void_paid', public.void_admin_invoice(pg_temp.id_of('draft'), (public.admin_get_invoice(pg_temp.id_of('draft')) -> 'invoice' ->> 'version')::integer, 'SYNTHETIC reason'));
select is(pg_temp.v('void_paid') -> 'reasons' -> 0 ->> 'field', 'payments', 'an invoice with effective payments cannot be voided');

-- Reversal
insert into c5 values ('reverse2', public.reverse_invoice_payment((pg_temp.v('pay2') ->> 'payment_id')::uuid, 'SYNTHETIC duplicate entry'));
select is(pg_temp.v('reverse2') ->> 'ok', 'true', 'a payment is reversed with a reason');
select is(public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'payment_state', 'partially_paid', 'state returns to partially_paid after reversal');
select is((public.admin_get_invoice(pg_temp.id_of('draft')) -> 'financials' ->> 'balance_due')::numeric, 285000::numeric, 'balance returns to 285000');
select is(
  (select count(*) from public.invoice_payments where invoice_id = pg_temp.id_of('draft'))::bigint, 2::bigint,
  'the reversed payment is preserved, not deleted'
);
insert into c5 values ('reverse_again', public.reverse_invoice_payment((pg_temp.v('pay2') ->> 'payment_id')::uuid, 'SYNTHETIC again'));
select is(pg_temp.v('reverse_again') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'a payment cannot be reversed twice');
select throws_ok(
  'delete from public.invoice_payments where id = (pg_temp.v(''pay1'') ->> ''payment_id'')::uuid',
  '55000', null, 'payments can never be deleted'
);
select throws_ok(
  'update public.invoice_payments set amount = 1 where id = (pg_temp.v(''pay1'') ->> ''payment_id'')::uuid',
  '55000', null, 'a recorded payment amount can never be edited'
);

-- ---------------------------------------------------------------------
-- Share links
-- ---------------------------------------------------------------------

insert into c5 values ('share', public.create_invoice_share_link(pg_temp.id_of('draft')));
select is(pg_temp.v('share') ->> 'ok', 'true', 'a client share link is generated for an issued invoice');
select matches(pg_temp.v('share') ->> 'token', '^[A-Za-z0-9_-]{40,64}$', 'the raw token is high-entropy url-safe text');
select is(
  (select count(*) from public.invoice_share_links where token_hash = pg_temp.v('share') ->> 'token')::bigint, 0::bigint,
  'the raw token is never stored'
);
select is(
  public.public_invoice_by_share_token(pg_temp.v('share') ->> 'token') ->> 'invoice_number',
  pg_temp.v('issued') ->> 'invoice_number',
  'the token resolves to that invoice document'
);
select ok(
  not (public.public_invoice_by_share_token(pg_temp.v('share') ->> 'token') ? 'notes_internal')
  and not (public.public_invoice_by_share_token(pg_temp.v('share') ->> 'token') -> 'payments' -> 0 ? 'note'),
  'the shared document carries no private payment notes'
);
select is(public.public_invoice_by_share_token('not-a-real-token-not-a-real-token-not-a-real'), null, 'an unknown token resolves to nothing');
select is(public.public_invoice_by_share_token('short'), null, 'a malformed token resolves to nothing');
insert into c5 values ('share2', public.create_invoice_share_link(pg_temp.id_of('draft')));
select is(public.public_invoice_by_share_token(pg_temp.v('share') ->> 'token'), null, 'regenerating a link revokes the previous token');
select isnt(public.public_invoice_by_share_token(pg_temp.v('share2') ->> 'token'), null, 'the regenerated token resolves');
insert into c5 values ('revoke', public.revoke_invoice_share_link(pg_temp.id_of('draft')));
select is(pg_temp.v('revoke') ->> 'ok', 'true', 'the link is revoked');
select is(public.public_invoice_by_share_token(pg_temp.v('share2') ->> 'token'), null, 'a revoked token resolves to nothing');
insert into c5 values ('share_draft', public.create_invoice_share_link(pg_temp.id_of('empty_draft')));
select is(pg_temp.v('share_draft') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'a draft cannot be shared with a client');

-- ---------------------------------------------------------------------
-- Overdue derivation and void
-- ---------------------------------------------------------------------

insert into c5 values ('late_draft', public.create_admin_invoice(pg_temp.id_of('client_b'), null, 'GBP', 0, null, null, null, null, null,
  '[{"description":"Old work","quantity":"1","unit_price":"100"}]'::jsonb));
insert into c5 values ('late_issued', public.issue_admin_invoice(pg_temp.id_of('late_draft'), 1, current_date - 30, current_date - 1));
select is(public.admin_get_invoice(pg_temp.id_of('late_draft')) -> 'financials' ->> 'is_overdue', 'true', 'an issued invoice past due with a balance is overdue');
select is(
  (select count(*) from jsonb_array_elements(public.admin_finance_action_queue(20)) as item where item ->> 'kind' = 'overdue' and item ->> 'invoice_id' = pg_temp.id_of('late_draft')::text)::bigint,
  1::bigint, 'the overdue invoice appears in the finance action queue'
);
select is(
  (select count(*) from jsonb_array_elements(public.admin_finance_overview() -> 'overdue_by_currency') as row where row ->> 'currency' = 'GBP')::bigint,
  1::bigint, 'the finance overview groups overdue balances by currency'
);
select ok(
  not (public.admin_finance_overview() ? 'total_outstanding'),
  'the finance overview never emits a cross-currency total'
);

insert into c5 values ('void', public.void_admin_invoice(pg_temp.id_of('late_draft'), 2, 'SYNTHETIC issued in error'));
select is(pg_temp.v('void') ->> 'ok', 'true', 'an issued invoice with no effective payments can be voided by super_admin');
select is(public.admin_get_invoice(pg_temp.id_of('late_draft')) -> 'financials' ->> 'is_overdue', 'false', 'a void invoice is never overdue');
select is(public.admin_get_invoice(pg_temp.id_of('late_draft')) -> 'invoice' ->> 'invoice_number', pg_temp.v('late_issued') ->> 'invoice_number', 'a void invoice keeps its number in history');
insert into c5 values ('void_share', public.create_invoice_share_link(pg_temp.id_of('late_draft')));
select is(pg_temp.v('void_share') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'a void invoice cannot receive a new share link');
insert into c5 values ('pay_void', public.record_invoice_payment(pg_temp.id_of('late_draft'), 1, current_date, 'cash'));
select is(pg_temp.v('pay_void') -> 'reasons' -> 0 ->> 'code', 'invalid_state', 'payments cannot be recorded against a void invoice');

-- Duplicate to draft copies starter values only
insert into c5 values ('dup', public.duplicate_admin_invoice(pg_temp.id_of('draft')));
select is(pg_temp.v('dup') ->> 'ok', 'true', 'an issued invoice can be duplicated to a new draft');
select is(public.admin_get_invoice(pg_temp.id_of('dup')) -> 'invoice' ->> 'invoice_number', null, 'the duplicate has no number');
select is((public.admin_get_invoice(pg_temp.id_of('dup')) -> 'financials' ->> 'total')::numeric, 385000::numeric, 'the duplicate carries the line items');
select is(jsonb_array_length(public.admin_get_invoice(pg_temp.id_of('dup')) -> 'payments'), 0, 'the duplicate carries no payments');

-- Client 360 / project summaries are per currency
select is(
  (select count(*) from jsonb_array_elements(public.admin_client_invoices(pg_temp.id_of('client_a')) -> 'summary_by_currency'))::bigint,
  1::bigint, 'client A has one currency group'
);
select is(
  (public.admin_project_invoices(pg_temp.id_of('project_a')) -> 'summary_by_currency' -> 0 ->> 'outstanding')::numeric, 285000::numeric,
  'project A outstanding is 285000'
);

-- ---------------------------------------------------------------------
-- Security negatives (§97)
-- ---------------------------------------------------------------------

select pg_temp.as_actor('97000000-0000-4000-8000-0000000000c3', 'aal1');
select throws_ok('select public.admin_get_invoice(pg_temp.id_of(''draft''))', '42501', null, 'AAL1: invoice detail is denied');
select is(public.create_admin_invoice(pg_temp.id_of('client_a'), null, 'RWF', 0) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'AAL1: invoice creation is denied');

select pg_temp.as_actor('97000000-0000-4000-8000-0000000000c4', 'aal2');
select throws_ok('select public.admin_list_invoices()', '42501', null, 'disabled staff: invoice list is denied');
select is(public.record_invoice_payment(pg_temp.id_of('draft'), 1, current_date, 'cash') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'disabled staff: payments are denied');

select pg_temp.as_actor('97000000-0000-4000-8000-0000000000c7', 'aal2');
select throws_ok('select public.admin_finance_overview()', '42501', null, 'missing finance.invoices.read: overview is denied');
select is(
  (select count(*) from jsonb_array_elements(public.admin_global_quick_find('RENZ-', 8)) as hit where hit ->> 'kind' = 'invoice')::bigint,
  0::bigint, 'missing finance.invoices.read: quick find omits invoices'
);

select pg_temp.as_actor('97000000-0000-4000-8000-0000000000c5', 'aal2');
select isnt(public.admin_get_invoice(pg_temp.id_of('draft')), null, 'read-only finance staff can read an invoice');
select is(public.create_admin_invoice(pg_temp.id_of('client_a'), null, 'RWF', 0) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing finance.invoices.write: creation is denied');

select pg_temp.as_actor('97000000-0000-4000-8000-0000000000c6', 'aal2');
select is(public.issue_admin_invoice(pg_temp.id_of('dup'), 1, current_date, current_date) -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing finance.invoices.issue: issue is denied');
select is(public.record_invoice_payment(pg_temp.id_of('draft'), 1, current_date, 'cash') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'missing finance.payments.write: payment is denied');

select pg_temp.as_actor('97000000-0000-4000-8000-0000000000c2', 'aal2');
select is(public.void_admin_invoice(pg_temp.id_of('draft'), 1, 'SYNTHETIC') -> 'reasons' -> 0 ->> 'code', 'not_authorized', 'admin without finance.invoices.void cannot void');
select throws_ok(
  'select public.admin_get_invoice(''not-a-uuid''::text::uuid)', '22P02', null,
  'a malformed invoice id is rejected as a uuid cast error before any query runs'
);

select * from finish();

rollback;
