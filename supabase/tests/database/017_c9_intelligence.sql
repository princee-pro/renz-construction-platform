-- C9 intelligence: permissions, timezone-aware analytics windows, lead
-- funnel / response-time / win-rate math, finance by currency + aging,
-- project distributions + schedule signals, delivery commitments and
-- receiving states, privacy-safe website aggregates, event-driven and timed
-- notifications (idempotent sweep), preferences, RBAC/RLS negatives.
-- Fixtures use a fixed period (June 2026, Africa/Kigali) so the math never
-- depends on "today" except for current-state signals, which use offsets.
begin;
select plan(170);

-- Inventory ------------------------------------------------------------
select is((select count(*) from public.permissions where key in ('analytics.read', 'analytics.finance.read', 'analytics.website.read', 'notifications.read', 'notifications.manage'))::bigint, 5::bigint, 'five C9 permissions are seeded');
select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id where r.key = 'admin' and p.key = 'analytics.read'), 'admin holds analytics.read');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id join public.permissions p on p.id = rp.permission_id where r.key = 'admin' and p.key = 'notifications.manage'), 'admin does not hold notifications.manage');
select is(private.business_timezone(), 'Africa/Kigali', 'business timezone comes from the C7 profile');
select is((select first_party_analytics_enabled from public.website_settings where id = 1), false, 'first-party analytics is off by default');
select ok((select draft_body ilike '%website analytics%' from public.legal_pages where slug = 'privacy'), 'privacy DRAFT describes website analytics');
select ok((select draft_body ilike '%enquiries and project submissions%' from public.legal_pages where slug = 'privacy'), 'privacy DRAFT still covers enquiries');
select ok((select published_body is null from public.legal_pages where slug = 'privacy'), 'the C9 privacy revision is not auto-published');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'notifications_recipient_unread_idx'), 'unread notifications are indexed by recipient');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'invoice_payments_date_idx'), 'payment dates are indexed for analytics');

-- Actors ---------------------------------------------------------------
insert into auth.users (id) values
  ('99000000-0000-4000-8000-0000000000a1'), ('99000000-0000-4000-8000-0000000000a2'),
  ('99000000-0000-4000-8000-0000000000a3'), ('99000000-0000-4000-8000-0000000000a4'),
  ('99000000-0000-4000-8000-0000000000a5');
update public.profiles set account_status = 'active', display_name = 'SYNTHETIC C9 Staff ' || right(id::text, 1), version = version + 1
where id in ('99000000-0000-4000-8000-0000000000a1', '99000000-0000-4000-8000-0000000000a2', '99000000-0000-4000-8000-0000000000a3', '99000000-0000-4000-8000-0000000000a5');
update public.profiles set account_status = 'disabled', version = version + 1 where id = '99000000-0000-4000-8000-0000000000a4';
insert into public.user_roles (user_id, role_id) select '99000000-0000-4000-8000-0000000000a1', id from public.roles where key = 'super_admin';
insert into public.user_roles (user_id, role_id) select unnest(array['99000000-0000-4000-8000-0000000000a2', '99000000-0000-4000-8000-0000000000a4']::uuid[]), id from public.roles where key = 'admin';
insert into public.roles (key, display_name) values ('c9-test-no-finance', 'SYNTHETIC analytics without finance');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id from public.roles cross join public.permissions
where roles.key = 'c9-test-no-finance' and permissions.key in ('analytics.read', 'leads.read', 'operations.projects.read', 'notifications.read');
insert into public.user_roles (user_id, role_id) select '99000000-0000-4000-8000-0000000000a3', id from public.roles where key = 'c9-test-no-finance';
insert into public.roles (key, display_name) values ('c9-test-leads-only', 'SYNTHETIC leads read only');
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id from public.roles cross join public.permissions
where roles.key = 'c9-test-leads-only' and permissions.key in ('leads.read');
insert into public.user_roles (user_id, role_id) select '99000000-0000-4000-8000-0000000000a5', id from public.roles where key = 'c9-test-leads-only';
-- Role grants above notified super admins (mandatory security category); clear the slate.
delete from public.notifications;

create temporary table c9 (key text primary key, value jsonb not null);
create function pg_temp.v(k text) returns jsonb language sql as $$ select value from c9 where key = k $$;
create function pg_temp.as_actor(actor uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated', 'aal', aal)::text, true);
$$;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;
create function pg_temp.as_service() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.lead(n integer) returns uuid language sql immutable as $$
  select ('99000000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid;
$$;

-- Timezone window --------------------------------------------------------
select is((select start_at from private.analytics_window('2026-06-01', '2026-06-30')), '2026-05-31 22:00:00+00'::timestamptz, 'range start is local midnight in Africa/Kigali (UTC+2)');
select is((select end_at from private.analytics_window('2026-06-01', '2026-06-30')), '2026-06-30 22:00:00+00'::timestamptz, 'range end is exclusive local midnight after the last day');
select is((select bucket from private.analytics_window('2026-06-01', '2026-06-30')), 'day', 'a 30-day range trends by day');
select is((select bucket from private.analytics_window('2026-04-01', '2026-06-30')), 'week', 'a 90-day range trends by week');
select throws_ok($$ select * from private.analytics_window('2026-06-30', '2026-06-01') $$, '22023', 'analytics range end precedes its start', 'an inverted range is rejected');
select throws_ok($$ select * from private.analytics_window('2020-01-01', '2026-06-01') $$, '22023', 'analytics range exceeds two years', 'an over-long range is rejected');
select throws_ok($$ select * from private.analytics_window(current_date, current_date + 30) $$, '22023', 'analytics range ends in the future', 'a future range is rejected');

-- Lead fixtures: 10 submitted in June (one at 00:30 local on 1 June, i.e. 31 May 22:30Z),
-- 8 contacted, 6 qualified, 2 site visits, 4 proposals, 3 won, 1 lost; one July lead excluded.
insert into public.leads (id, reference, lead_type, source_channel, status, full_name, email, email_normalized, summary, service_key, submitted_at,
  first_contact_at, qualified_at, site_visit_at, won_at, lost_at, lost_reason, assigned_to)
select pg_temp.lead(n), 'RENZ-LEAD-2026-9' || lpad(n::text, 5, '0'),
  case when n <= 5 then 'project' when n <= 8 then 'service' else 'general' end,
  case when n <= 5 then 'start_a_project' when n <= 8 then 'service_page' else 'website_contact' end,
  case when n <= 3 then 'won' when n = 4 then 'lost' when n <= 6 then 'qualified' when n <= 8 then 'contacted' else 'new' end,
  'SYNTHETIC C9 Lead ' || n, 'synthetic-c9-' || n || '@example.test', 'synthetic-c9-' || n || '@example.test',
  'SYNTHETIC C9 summary', case when n <= 6 then 'design' when n <= 8 then 'executions' else null end,
  case when n = 10 then '2026-05-31 22:30:00+00'::timestamptz else ('2026-06-' || lpad(n::text, 2, '0') || ' 06:00:00+00')::timestamptz end,
  case when n <= 8 then ('2026-06-' || lpad(n::text, 2, '0') || ' 06:00:00+00')::timestamptz + make_interval(hours => (array[1, 2, 3, 4, 5, 6, 30, 50])[n]) end,
  case when n <= 6 then ('2026-06-' || lpad(n::text, 2, '0') || ' 06:00:00+00')::timestamptz + interval '2 days' end,
  case when n <= 2 then ('2026-06-' || lpad(n::text, 2, '0') || ' 06:00:00+00')::timestamptz + interval '3 days' end,
  case when n <= 3 then ('2026-06-' || lpad(n::text, 2, '0') || ' 06:00:00+00')::timestamptz + interval '10 days' end,
  case when n = 4 then ('2026-06-04 06:00:00+00')::timestamptz + interval '5 days' end,
  case when n = 4 then 'budget' end,
  case when n = 9 then '99000000-0000-4000-8000-0000000000a2'::uuid end
from generate_series(1, 10) as n;
insert into public.leads (id, reference, lead_type, source_channel, status, full_name, email, email_normalized, summary, submitted_at)
values (pg_temp.lead(11), 'RENZ-LEAD-2026-900011', 'general', 'website_contact', 'new', 'SYNTHETIC C9 Lead 11', 'synthetic-c9-11@example.test', 'synthetic-c9-11@example.test', 'SYNTHETIC July', '2026-06-30 22:30:00+00');
insert into public.lead_stage_history (lead_id, from_status, to_status, changed_at)
select pg_temp.lead(n), 'qualified', 'proposal', ('2026-06-' || lpad(n::text, 2, '0') || ' 06:00:00+00')::timestamptz + interval '4 days' from generate_series(1, 4) as n;
-- Public inserts notified lead handlers; not under test here.
delete from public.notifications;

select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a1', 'aal2');
insert into c9 values ('leads', public.admin_analytics_leads('2026-06-01', '2026-06-30'));
select is((pg_temp.v('leads') ->> 'new_leads')::integer, 10, 'ten leads submitted in June (local midnight edge included, July excluded)');
select is((select count(*) from jsonb_array_elements(pg_temp.v('leads') -> 'funnel') f where (f ->> 'stage', (f ->> 'count')::integer) in (('submitted', 10), ('contacted', 8), ('qualified', 6), ('site_visit', 2), ('proposal', 4), ('won', 3)))::integer, 6, 'funnel counts are 10 / 8 / 6 / 2 / 4 / 3');
select is((pg_temp.v('leads') #>> '{response,median_hours}')::numeric, 4.5, 'time to first contact median is 4.5 hours');
select is((pg_temp.v('leads') #>> '{response,contacted_count}')::integer, 8, 'eight completed contact durations');
select is((pg_temp.v('leads') #>> '{response,within_target_count}')::integer, 6, 'six leads were contacted within the 24 h target');
select is((pg_temp.v('leads') #>> '{response,awaiting_first_contact}')::integer, 2, 'two June leads still await first contact');
select is((pg_temp.v('leads') #>> '{qualification,median_hours}')::numeric, 48.0, 'time to qualification median is 48 hours');
select is((pg_temp.v('leads') #>> '{outcome,won_count}')::integer, 3, 'three won in period');
select is((pg_temp.v('leads') #>> '{outcome,lost_count}')::integer, 1, 'one lost in period');
select is((pg_temp.v('leads') #>> '{outcome,win_rate}')::numeric, 75.0, 'win rate denominator is won + lost only (3 / 4)');
select is((pg_temp.v('leads') #>> '{outcome,won_median_days}')::numeric, 10.0, 'time to won median is 10 days');
select is((pg_temp.v('leads') #>> '{type_counts,project}')::integer, 5, 'five project leads');
select is((pg_temp.v('leads') #>> '{source_counts,service_page}')::integer, 3, 'three service-page leads');
select is((select (s ->> 'enquiries')::integer from jsonb_array_elements(pg_temp.v('leads') -> 'service_interest') s where s ->> 'service_key' = 'design'), 6, 'design drew six enquiries');
select is((select (s ->> 'won')::integer from jsonb_array_elements(pg_temp.v('leads') -> 'service_interest') s where s ->> 'service_key' = 'design'), 3, 'design won three');
select is((select (r ->> 'count')::integer from jsonb_array_elements(pg_temp.v('leads') -> 'lost_reasons') r where r ->> 'reason' = 'budget'), 1, 'lost reasons aggregate controlled codes');
select is((select sum((t ->> 'submitted')::integer) from jsonb_array_elements(pg_temp.v('leads') -> 'trend') t)::integer, 10, 'daily trend sums to the submitted count');
select is((select t ->> 'bucket' from jsonb_array_elements(pg_temp.v('leads') -> 'trend') t order by t ->> 'bucket' limit 1), '2026-06-01', 'the 31 May 22:30Z lead lands on 1 June in Africa/Kigali');
select is((pg_temp.v('leads') #>> '{range,timezone}'), 'Africa/Kigali', 'lead analytics echo the business timezone');
select is((public.admin_analytics_leads('2026-06-01', '2026-07-31') ->> 'new_leads')::integer, 11, 'extending to July admits the eleventh lead');

-- Client + finance fixtures ----------------------------------------------
insert into public.clients (id, full_name, email, email_normalized) values ('99000000-0000-4000-8000-0000000000c1', 'SYNTHETIC C9 Client', 'synthetic-c9-client@example.test', 'synthetic-c9-client@example.test');
insert into public.invoices (id, client_id, invoice_number, lifecycle_state, currency, issue_date, due_date, issued_client_snapshot, issued_issuer_snapshot,
  issued_subtotal, issued_tax_amount, issued_total, issued_at)
values
  ('99000000-0000-4000-8000-0000000000f1', '99000000-0000-4000-8000-0000000000c1', 'RENZ-2026-900001', 'issued', 'RWF', '2026-06-05', private.business_today() - 45, '{}'::jsonb, '{}'::jsonb, 1000000, 0, 1000000, '2026-06-05 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000f2', '99000000-0000-4000-8000-0000000000c1', 'RENZ-2026-900002', 'issued', 'RWF', '2026-06-20', private.business_today() + 10, '{}'::jsonb, '{}'::jsonb, 500000, 0, 500000, '2026-06-20 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000f3', '99000000-0000-4000-8000-0000000000c1', 'RENZ-2026-900003', 'issued', 'RWF', '2026-06-25', private.business_today() + 30, '{}'::jsonb, '{}'::jsonb, 200000, 0, 200000, '2026-06-25 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000f4', '99000000-0000-4000-8000-0000000000c1', 'RENZ-2026-900004', 'issued', 'USD', '2026-06-08', private.business_today() + 30, '{}'::jsonb, '{}'::jsonb, 1000, 0, 1000, '2026-06-08 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000f5', '99000000-0000-4000-8000-0000000000c1', 'RENZ-2026-900005', 'issued', 'USD', '2026-06-01', private.business_today() - 100, '{}'::jsonb, '{}'::jsonb, 300, 0, 300, '2026-06-15 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000f6', '99000000-0000-4000-8000-0000000000c1', 'RENZ-2026-900006', 'issued', 'RWF', '2026-07-02', private.business_today() + 30, '{}'::jsonb, '{}'::jsonb, 999999, 0, 999999, '2026-07-02 07:00:00+00');
insert into public.invoice_payments (id, invoice_id, amount, payment_date, payment_method)
values
  ('99000000-0000-4000-8000-0000000000e1', '99000000-0000-4000-8000-0000000000f1', 400000, '2026-06-10', 'bank_transfer'),
  ('99000000-0000-4000-8000-0000000000e2', '99000000-0000-4000-8000-0000000000f3', 200000, '2026-06-26', 'cash'),
  ('99000000-0000-4000-8000-0000000000e3', '99000000-0000-4000-8000-0000000000f4', 1000, '2026-07-02', 'bank_transfer'),
  ('99000000-0000-4000-8000-0000000000e4', '99000000-0000-4000-8000-0000000000f2', 100000, '2026-06-28', 'cash');
update public.invoice_payments set reversed_at = now(), reversal_reason = 'SYNTHETIC reversal' where id = '99000000-0000-4000-8000-0000000000e4';
delete from public.notifications;

insert into c9 values ('finance', public.admin_analytics_finance('2026-06-01', '2026-06-30'));
create function pg_temp.fin(cur text, key text) returns text language sql as $$
  select c ->> key from jsonb_array_elements(pg_temp.v('finance') -> 'by_currency') c where c ->> 'currency' = cur $$;
select is((select count(*) from jsonb_array_elements(pg_temp.v('finance') -> 'by_currency'))::integer, 2, 'finance analytics are grouped into exactly two currencies');
select is(pg_temp.fin('RWF', 'issued_count')::integer, 3, 'RWF: three invoices issued in June (July excluded)');
select is(pg_temp.fin('RWF', 'invoiced_amount')::numeric, 1700000.00, 'RWF invoiced 1,700,000');
select is(pg_temp.fin('RWF', 'collected_amount')::numeric, 600000.00, 'RWF collected 600,000 in June (reversed payment excluded)');
select is(pg_temp.fin('RWF', 'outstanding_amount')::numeric, 2099999.00, 'RWF outstanding 2,099,999 (current state, July invoice included)');
select is(pg_temp.fin('RWF', 'overdue_amount')::numeric, 600000.00, 'RWF overdue 600,000');
select is(pg_temp.fin('RWF', 'paid_count')::integer, 1, 'RWF one paid invoice');
select is(pg_temp.fin('RWF', 'partially_paid_count')::integer, 1, 'RWF one partially paid invoice');
select is(pg_temp.fin('RWF', 'collection_rate')::numeric, 35.3, 'RWF collection rate 600,000 / 1,700,000');
select is((select (a ->> 'amount')::numeric from jsonb_array_elements((select c -> 'aging' from jsonb_array_elements(pg_temp.v('finance') -> 'by_currency') c where c ->> 'currency' = 'RWF')) a where a ->> 'bucket' = '31_60'), 600000.00, 'RWF aging 31–60 holds the partially paid invoice balance');
select is((select (a ->> 'amount')::numeric from jsonb_array_elements((select c -> 'aging' from jsonb_array_elements(pg_temp.v('finance') -> 'by_currency') c where c ->> 'currency' = 'RWF')) a where a ->> 'bucket' = 'not_due'), 1499999.00, 'RWF aging not-due holds the unpaid future invoices');
select is(pg_temp.fin('USD', 'invoiced_amount')::numeric, 1300.00, 'USD invoiced 1,300 (never combined with RWF)');
select is(pg_temp.fin('USD', 'collected_amount')::numeric, 0.00, 'USD nothing collected inside June');
select is(pg_temp.fin('USD', 'collected_on_period_invoices')::numeric, 1000.00, 'USD 1,000 collected later on a June invoice');
select is(pg_temp.fin('USD', 'overdue_amount')::numeric, 300.00, 'USD overdue 300');
select is((select (a ->> 'invoice_count')::integer from jsonb_array_elements((select c -> 'aging' from jsonb_array_elements(pg_temp.v('finance') -> 'by_currency') c where c ->> 'currency' = 'USD')) a where a ->> 'bucket' = '90_plus'), 1, 'USD aging 90+ holds the long-overdue invoice');
select ok(pg_temp.v('finance')::text not ilike '%revenue%' and pg_temp.v('finance')::text not ilike '%profit%', 'finance analytics never use revenue / profit terminology');
select is((select sum((t ->> 'amount')::numeric) from jsonb_array_elements((select c -> 'payment_trend' from jsonb_array_elements(pg_temp.v('finance') -> 'by_currency') c where c ->> 'currency' = 'RWF')) t), 600000.00, 'RWF payment trend sums to collected');

-- Project fixtures ---------------------------------------------------------
insert into public.operational_projects (id, client_id, title, status, current_phase, priority, end_date, budget_amount, budget_currency, created_at, archived_at)
values
  ('99000000-0000-4000-8000-0000000000d1', '99000000-0000-4000-8000-0000000000c1', 'SYNTHETIC P1', 'planning', 'design', 'high', private.business_today() + 5, 10000000, 'RWF', '2026-05-01 07:00:00+00', null),
  ('99000000-0000-4000-8000-0000000000d2', '99000000-0000-4000-8000-0000000000c1', 'SYNTHETIC P2', 'in_progress', 'execution', 'medium', private.business_today() - 3, 5000000, 'RWF', '2026-05-01 07:00:00+00', null),
  ('99000000-0000-4000-8000-0000000000d3', '99000000-0000-4000-8000-0000000000c1', 'SYNTHETIC P3', 'on_hold', 'procurement', 'low', null, null, null, '2026-05-01 07:00:00+00', null),
  ('99000000-0000-4000-8000-0000000000d4', '99000000-0000-4000-8000-0000000000c1', 'SYNTHETIC P4', 'completed', 'completed', 'medium', '2026-06-10', 7000000, 'RWF', '2026-06-01 07:00:00+00', null),
  ('99000000-0000-4000-8000-0000000000d5', '99000000-0000-4000-8000-0000000000c1', 'SYNTHETIC P5', 'in_progress', 'structural', 'high', private.business_today() + 60, 20000, 'USD', '2026-06-10 07:00:00+00', null),
  ('99000000-0000-4000-8000-0000000000d6', '99000000-0000-4000-8000-0000000000c1', 'SYNTHETIC P6', 'planning', 'design', 'high', null, 1, 'RWF', '2026-06-10 07:00:00+00', now());
insert into public.operational_project_status_history (project_id, from_status, to_status, created_at)
values ('99000000-0000-4000-8000-0000000000d4', 'in_progress', 'completed', '2026-06-15 07:00:00+00');
insert into public.operational_project_phase_history (project_id, from_phase, to_phase, created_at)
values ('99000000-0000-4000-8000-0000000000d5', 'design', 'structural', now() - interval '20 days');
update public.leads set operational_project_id = '99000000-0000-4000-8000-0000000000d5', client_id = '99000000-0000-4000-8000-0000000000c1', version = version + 1 where id = pg_temp.lead(1);
delete from public.notifications;

insert into c9 values ('projects', public.admin_analytics_projects('2026-06-01', '2026-06-30'));
select is((pg_temp.v('projects') ->> 'active_projects')::integer, 4, 'four active (non-completed, non-archived) projects');
select is((pg_temp.v('projects') #>> '{status_counts,in_progress}')::integer, 2, 'two in progress');
select is((pg_temp.v('projects') #>> '{phase_counts,structural}')::integer, 1, 'phase distribution reflects the current phase');
select is((pg_temp.v('projects') ->> 'active_high_priority')::integer, 2, 'two active high-priority projects');
select is((pg_temp.v('projects') #>> '{schedule,ending_soon}')::integer, 1, 'one project ends within the configured window');
select is((pg_temp.v('projects') #>> '{schedule,behind_planned_end}')::integer, 1, 'one project is behind its planned end date');
select is((pg_temp.v('projects') #>> '{schedule,no_end_date}')::integer, 1, 'one active project has no planned end date');
select is((pg_temp.v('projects') #>> '{schedule,completed_in_period}')::integer, 1, 'one project completed in June (status history)');
select is((pg_temp.v('projects') #>> '{schedule,created_in_period}')::integer, 2, 'two non-archived projects created in June');
select is((select (b ->> 'total')::numeric from jsonb_array_elements(pg_temp.v('projects') -> 'budget_by_currency') b where b ->> 'currency' = 'RWF'), 15000000.00, 'RWF active budget 15,000,000 (completed and archived excluded)');
select is((select (b ->> 'total')::numeric from jsonb_array_elements(pg_temp.v('projects') -> 'budget_by_currency') b where b ->> 'currency' = 'USD'), 20000.00, 'USD budget stays separate');
select is((pg_temp.v('projects') #>> '{origin,from_leads}')::integer, 1, 'one June project originated from a lead');
select is((pg_temp.v('projects') #>> '{origin,manual}')::integer, 1, 'one June project was created manually');
select is((select (p ->> 'max_days')::integer from jsonb_array_elements(pg_temp.v('projects') -> 'phase_aging') p where p ->> 'phase' = 'structural'), 20, 'phase aging uses the last phase change');

-- Delivery fixtures -----------------------------------------------------------
insert into public.trade_partners (id, capabilities, display_name) values
  ('99000000-0000-4000-8000-0000000000b1', array['contractor'], 'SYNTHETIC C9 Contractor One'),
  ('99000000-0000-4000-8000-0000000000b2', array['contractor'], 'SYNTHETIC C9 Contractor Two'),
  ('99000000-0000-4000-8000-0000000000b3', array['supplier'], 'SYNTHETIC C9 Supplier');
insert into public.contractor_assignments (id, operational_project_id, trade_partner_id, scope, status, currency, agreed_amount, end_date, performance_rating, completed_at, created_at)
values
  ('99000000-0000-4000-8000-0000000000a6', '99000000-0000-4000-8000-0000000000d2', '99000000-0000-4000-8000-0000000000b1', 'SYNTHETIC A1', 'active', 'RWF', 2000000, private.business_today() + 7, null, null, '2026-06-02 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000a7', '99000000-0000-4000-8000-0000000000d2', '99000000-0000-4000-8000-0000000000b1', 'SYNTHETIC A2', 'completed', 'RWF', 1000000, null, 5, '2026-06-20 07:00:00+00', '2026-06-02 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000a8', '99000000-0000-4000-8000-0000000000d2', '99000000-0000-4000-8000-0000000000b2', 'SYNTHETIC A3', 'cancelled', 'RWF', 3000000, null, null, null, '2026-06-02 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000a9', '99000000-0000-4000-8000-0000000000d5', '99000000-0000-4000-8000-0000000000b2', 'SYNTHETIC A4', 'active', 'USD', 5000, null, null, null, '2026-06-02 07:00:00+00'),
  ('99000000-0000-4000-8000-0000000000aa', '99000000-0000-4000-8000-0000000000d5', '99000000-0000-4000-8000-0000000000b2', 'SYNTHETIC A5', 'completed', 'USD', 1000, null, null, '2026-06-22 07:00:00+00', '2026-06-02 07:00:00+00');
insert into public.contractor_payments (contractor_assignment_id, amount, payment_date, payment_method) values
  ('99000000-0000-4000-8000-0000000000a6', 500000, '2026-06-12', 'cash'),
  ('99000000-0000-4000-8000-0000000000a7', 1000000, '2026-06-21', 'bank_transfer'),
  ('99000000-0000-4000-8000-0000000000aa', 1000, '2026-06-23', 'bank_transfer');
insert into public.project_material_requirements (id, operational_project_id, item_name, required_quantity, unit_label, approval_state, required_by) values
  ('99000000-0000-4000-8000-0000000000ab', '99000000-0000-4000-8000-0000000000d2', 'SYNTHETIC cement', 100, 'bag', 'approved', private.business_today() + 3),
  ('99000000-0000-4000-8000-0000000000ac', '99000000-0000-4000-8000-0000000000d2', 'SYNTHETIC steel', 5, 'tonne', 'approved', private.business_today() - 2);
insert into public.purchase_orders (id, operational_project_id, supplier_id, lifecycle_state, currency) values
  ('99000000-0000-4000-8000-0000000000ad', '99000000-0000-4000-8000-0000000000d2', '99000000-0000-4000-8000-0000000000b3', 'draft', 'RWF'),
  ('99000000-0000-4000-8000-0000000000ae', '99000000-0000-4000-8000-0000000000d5', '99000000-0000-4000-8000-0000000000b3', 'draft', 'USD'),
  ('99000000-0000-4000-8000-0000000000af', '99000000-0000-4000-8000-0000000000d2', '99000000-0000-4000-8000-0000000000b3', 'draft', 'RWF'),
  ('99000000-0000-4000-8000-0000000000b0', '99000000-0000-4000-8000-0000000000d2', '99000000-0000-4000-8000-0000000000b3', 'draft', 'RWF');
insert into public.purchase_order_line_items (id, purchase_order_id, operational_project_id, description, quantity, unit_label, unit_price) values
  ('99000000-0000-4000-8000-0000000000ba', '99000000-0000-4000-8000-0000000000ad', '99000000-0000-4000-8000-0000000000d2', 'SYNTHETIC cement', 10, 'bag', 80000),
  ('99000000-0000-4000-8000-0000000000bb', '99000000-0000-4000-8000-0000000000ae', '99000000-0000-4000-8000-0000000000d5', 'SYNTHETIC fittings', 4, 'set', 500),
  ('99000000-0000-4000-8000-0000000000bc', '99000000-0000-4000-8000-0000000000af', '99000000-0000-4000-8000-0000000000d2', 'SYNTHETIC sand', 3, 'tonne', 100000);
update public.purchase_orders set lifecycle_state = 'issued', purchase_order_number = 'RENZ-PO-2026-900001', issue_date = '2026-06-03', expected_delivery_date = private.business_today() - 5,
  issued_supplier_snapshot = '{}'::jsonb, issued_project_snapshot = '{}'::jsonb, issued_issuer_snapshot = '{}'::jsonb, issued_subtotal = 800000, issued_tax_amount = 0, issued_total = 800000, issued_at = '2026-06-03 07:00:00+00'
where id = '99000000-0000-4000-8000-0000000000ad';
update public.purchase_orders set lifecycle_state = 'issued', purchase_order_number = 'RENZ-PO-2026-900002', issue_date = '2026-06-10', expected_delivery_date = private.business_today() + 3,
  issued_supplier_snapshot = '{}'::jsonb, issued_project_snapshot = '{}'::jsonb, issued_issuer_snapshot = '{}'::jsonb, issued_subtotal = 2000, issued_tax_amount = 0, issued_total = 2000, issued_at = '2026-06-10 07:00:00+00'
where id = '99000000-0000-4000-8000-0000000000ae';
update public.purchase_orders set lifecycle_state = 'issued', purchase_order_number = 'RENZ-PO-2026-900003', issue_date = '2026-06-01', expected_delivery_date = '2026-06-15',
  issued_supplier_snapshot = '{}'::jsonb, issued_project_snapshot = '{}'::jsonb, issued_issuer_snapshot = '{}'::jsonb, issued_subtotal = 300000, issued_tax_amount = 0, issued_total = 300000, issued_at = '2026-06-01 07:00:00+00'
where id = '99000000-0000-4000-8000-0000000000af';
insert into public.purchase_order_receipts (id, purchase_order_id, received_at) values
  ('99000000-0000-4000-8000-0000000000c2', '99000000-0000-4000-8000-0000000000ad', '2026-06-15'),
  ('99000000-0000-4000-8000-0000000000c3', '99000000-0000-4000-8000-0000000000af', '2026-06-18'),
  ('99000000-0000-4000-8000-0000000000c4', '99000000-0000-4000-8000-0000000000ae', '2026-06-19');
insert into public.purchase_order_receipt_items (receipt_id, purchase_order_line_item_id, quantity_received) values
  ('99000000-0000-4000-8000-0000000000c2', '99000000-0000-4000-8000-0000000000ba', 4),
  ('99000000-0000-4000-8000-0000000000c3', '99000000-0000-4000-8000-0000000000bc', 3),
  ('99000000-0000-4000-8000-0000000000c4', '99000000-0000-4000-8000-0000000000bb', 4);
update public.purchase_order_receipts set reversed_at = now(), reversal_reason = 'SYNTHETIC reversal' where id = '99000000-0000-4000-8000-0000000000c4';
update public.purchase_orders set lifecycle_state = 'closed', closed_at = '2026-06-20 07:00:00+00', close_reason = 'SYNTHETIC fully received' where id = '99000000-0000-4000-8000-0000000000af';
select is((select count(*) from public.notifications where title = 'Purchase order issued' and recipient_profile_id = '99000000-0000-4000-8000-0000000000a2')::integer, 3, 'procurement readers are told about each issued purchase order');
select is((select count(*) from public.notifications where title = 'Purchase order issued' and recipient_profile_id = '99000000-0000-4000-8000-0000000000a1')::integer, 0, 'the acting super admin is not notified about their own PO issue');
delete from public.notifications;

insert into c9 values ('delivery', public.admin_analytics_delivery('2026-06-01', '2026-06-30'));
select is((pg_temp.v('delivery') #>> '{contractors,active_contractors}')::integer, 2, 'two contractors hold active assignments');
select is((pg_temp.v('delivery') #>> '{contractors,active_assignments}')::integer, 2, 'two active assignments');
select is((pg_temp.v('delivery') #>> '{contractors,completed_in_period}')::integer, 2, 'two assignments completed in June');
select is((pg_temp.v('delivery') #>> '{contractors,ending_soon}')::integer, 1, 'one assignment ends within the window');
select is((select (f ->> 'committed')::numeric from jsonb_array_elements(pg_temp.v('delivery') #> '{contractors,finance_by_currency}') f where f ->> 'currency' = 'RWF'), 3000000.00, 'RWF committed excludes the cancelled assignment');
select is((select (f ->> 'paid')::numeric from jsonb_array_elements(pg_temp.v('delivery') #> '{contractors,finance_by_currency}') f where f ->> 'currency' = 'RWF'), 1500000.00, 'RWF contractor paid 1,500,000');
select is((select (f ->> 'remaining')::numeric from jsonb_array_elements(pg_temp.v('delivery') #> '{contractors,finance_by_currency}') f where f ->> 'currency' = 'RWF'), 1500000.00, 'RWF contractor remaining 1,500,000');
select is((select (f ->> 'remaining')::numeric from jsonb_array_elements(pg_temp.v('delivery') #> '{contractors,finance_by_currency}') f where f ->> 'currency' = 'USD'), 5000.00, 'USD contractor remaining 5,000 (separate currency)');
select is((pg_temp.v('delivery') #>> '{contractors,performance,rated_count}')::integer, 1, 'one rated completed assignment');
select is((pg_temp.v('delivery') #>> '{contractors,performance,awaiting_rating}')::integer, 1, 'one completed assignment awaits rating');
select is((select (t ->> 'rated_count')::integer from jsonb_array_elements(pg_temp.v('delivery') #> '{contractors,performance,top_rated}') t limit 1), 1, 'top-rated shows the sample count');
select is((pg_temp.v('delivery') #>> '{procurement,open_orders}')::integer, 2, 'two open purchase orders');
select is((pg_temp.v('delivery') #>> '{procurement,delayed_orders}')::integer, 1, 'one delayed purchase order');
select is((pg_temp.v('delivery') #>> '{procurement,expected_soon}')::integer, 1, 'one delivery expected soon');
select is((pg_temp.v('delivery') #>> '{procurement,issued_in_period}')::integer, 3, 'three purchase orders issued in June');
select is((pg_temp.v('delivery') #>> '{procurement,closed_in_period}')::integer, 1, 'one purchase order closed in June');
select is((pg_temp.v('delivery') #>> '{procurement,receipts_in_period}')::integer, 2, 'two goods receipts in June (reversed excluded)');
select is((pg_temp.v('delivery') #>> '{procurement,receiving_states,delayed}')::integer, 1, 'receiving states count the delayed order');
select is((pg_temp.v('delivery') #>> '{procurement,receiving_states,not_received}')::integer, 1, 'receiving states count the untouched order');
select is((select (v ->> 'ordered_value')::numeric from jsonb_array_elements(pg_temp.v('delivery') #> '{procurement,value_by_currency}') v where v ->> 'currency' = 'RWF'), 1100000.00, 'RWF ordered value 1,100,000 in June');
select is((select (v ->> 'open_ordered_value')::numeric from jsonb_array_elements(pg_temp.v('delivery') #> '{procurement,value_by_currency}') v where v ->> 'currency' = 'RWF'), 800000.00, 'RWF open ordered value 800,000');
select is((pg_temp.v('delivery') #>> '{procurement,requirements_due_soon}')::integer, 1, 'one material requirement is due soon');
select is((pg_temp.v('delivery') #>> '{procurement,requirements_past_due}')::integer, 1, 'one material requirement is past its required-by date');

-- Website analytics --------------------------------------------------------------
select pg_temp.as_postgres();
update public.website_settings set first_party_analytics_enabled = true, version = version + 1 where id = 1;
select pg_temp.as_service();
insert into c9 values ('record', public.website_analytics_record('[
  {"t":"page_view","p":"/","dc":"desktop"},
  {"t":"page_view","p":"/services/design?utm_source=x#top","dc":"mobile"},
  {"t":"service_view","p":"/services/design","d":"design","dc":"mobile"},
  {"t":"cta_click","p":"/services/design","d":"start_project","dc":"mobile"},
  {"t":"project_intake_start","p":"/start-a-project","dc":"mobile"},
  {"t":"page_view","p":"/admin/operations/leads","dc":"desktop"},
  {"t":"page_view","p":"/i/abcdef","dc":"desktop"},
  {"t":"page_view","p":"/services/design?email=someone@example.test","dc":"desktop"},
  {"t":"custom_event","p":"/","dc":"desktop"},
  {"t":"cta_click","p":"/","d":"<script>","dc":"desktop"},
  {"t":"page_view","p":"/RENZ-LEAD-2026-000001","dc":"desktop"}
]'::jsonb));
select is((pg_temp.v('record') ->> 'accepted')::integer, 6, 'six approved events are accepted');
select is((pg_temp.v('record') ->> 'rejected')::integer, 5, 'admin path, document path, unknown event, malformed dimension and unknown route are rejected');
select is((select sum(hit_count) from public.website_analytics_daily where event_type = 'page_view' and path_key = '/services/design')::integer, 2, 'query strings are stripped before counting');
select is((select count(*) from public.website_analytics_daily where path_key like '%?%' or path_key like '%@%' or dimension like '%@%' or path_key like '%RENZ-LEAD%' or path_key like '/admin%' or path_key like '/i/%')::integer, 0, 'no query string, email, lead reference, admin or document path enters analytics');
select is((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'website_analytics_daily' and column_name in ('ip', 'identity_hash', 'user_agent', 'session_id', 'visitor_id'))::integer, 0, 'the analytics table has no identifier columns');
select pg_temp.as_postgres();
-- A public lead insert records the submission event server-side (tied to the real C8 row).
insert into public.leads (id, reference, lead_type, source_channel, status, full_name, email, email_normalized, summary, service_key)
values (pg_temp.lead(12), 'RENZ-LEAD-2026-900012', 'service', 'service_page', 'new', 'SYNTHETIC C9 Lead 12', 'synthetic-c9-12@example.test', 'synthetic-c9-12@example.test', 'SYNTHETIC', 'design');
select is((select sum(hit_count) from public.website_analytics_daily where event_type = 'service_enquiry_submit' and dimension = 'design')::integer, 1, 'a service-page lead counts one service enquiry submission');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a1', 'aal2');
insert into c9 values ('website', public.admin_analytics_website(private.business_today() - 6, private.business_today()));
select is((pg_temp.v('website') ->> 'page_views')::integer, 3, 'three page views in the last seven days');
select is((select (s ->> 'views')::integer from jsonb_array_elements(pg_temp.v('website') -> 'service_views') s where s ->> 'service_slug' = 'design'), 1, 'service views are keyed by slug');
select is((select (c ->> 'clicks')::integer from jsonb_array_elements(pg_temp.v('website') -> 'cta_clicks') c where c ->> 'cta_key' = 'start_project'), 1, 'CTA clicks aggregate by key');
select is((pg_temp.v('website') #>> '{intake,project_intake_start}')::integer, 1, 'intake starts are counted');
select is((pg_temp.v('website') #>> '{device_classes,mobile}')::integer, 1, 'device class is a bounded dimension');

-- Overview: permission-scoped omission ------------------------------------------
insert into c9 values ('overview', public.admin_analytics_overview('2026-06-01', '2026-06-30'));
select ok(pg_temp.v('overview') ? 'finance' and pg_temp.v('overview') ? 'leads' and pg_temp.v('overview') ? 'website', 'super admin overview carries every domain');
select is(pg_temp.v('overview') #>> '{previous_range,from}', '2026-05-02', 'the comparison period immediately precedes the range with the same length');
select is((pg_temp.v('overview') #>> '{headline,new_leads}')::integer, 10, 'headline new leads match');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a3', 'aal2');
insert into c9 values ('overview_nofin', public.admin_analytics_overview('2026-06-01', '2026-06-30'));
select ok(not (pg_temp.v('overview_nofin') ? 'finance'), 'an actor without analytics.finance.read receives no finance section');
select ok(not (pg_temp.v('overview_nofin') ? 'website'), 'an actor without analytics.website.read receives no website section');
select ok(not (pg_temp.v('overview_nofin') -> 'headline' ? 'invoiced_by_currency'), 'finance headline keys are omitted too');
select ok(pg_temp.v('overview_nofin') ? 'leads', 'lead analytics remain for a leads reader');
select throws_ok($$ select public.admin_analytics_finance('2026-06-01', '2026-06-30') $$, '42501', 'finance analytics are not authorized', 'finance analytics refuse without analytics.finance.read');

-- Security negatives ---------------------------------------------------------------
select pg_temp.as_anon();
select throws_ok($$ select public.admin_analytics_overview('2026-06-01', '2026-06-30') $$, '42501', 'analytics are not authorized', 'anon cannot read analytics');
select throws_ok($$ select public.admin_notifications_summary() $$, '42501', 'notifications are not authorized', 'anon cannot read notifications');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a2', 'aal1');
select throws_ok($$ select public.admin_analytics_overview('2026-06-01', '2026-06-30') $$, '42501', 'analytics are not authorized', 'AAL1 is denied analytics');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a4', 'aal2');
select throws_ok($$ select public.admin_analytics_overview('2026-06-01', '2026-06-30') $$, '42501', 'analytics are not authorized', 'disabled staff are denied analytics');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a5', 'aal2');
select throws_ok($$ select public.admin_analytics_leads('2026-06-01', '2026-06-30') $$, '42501', 'lead analytics are not authorized', 'leads.read without analytics.read is denied');
select ok(not has_function_privilege('authenticated', 'public.website_analytics_record(jsonb)', 'EXECUTE'), 'authenticated staff cannot execute the website event recorder');
select ok(not has_function_privilege('anon', 'public.website_analytics_record(jsonb)', 'EXECUTE'), 'anon cannot execute the website event recorder');
select ok(has_function_privilege('service_role', 'public.website_analytics_record(jsonb)', 'EXECUTE'), 'only the server credential records website events');
select ok(not has_function_privilege('authenticated', 'public.run_notification_sweep(text)', 'EXECUTE'), 'authenticated cannot run the service sweep');

-- Event-driven notifications + recipient routing ---------------------------------------
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a1', 'aal2');
update public.leads set assigned_to = '99000000-0000-4000-8000-0000000000a2', version = version + 1 where id = pg_temp.lead(7);
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and title = 'Lead assigned to you')::integer, 1, 'the assignee is notified about the assignment');
select is((select count(*) from public.notifications where recipient_profile_id <> '99000000-0000-4000-8000-0000000000a2' and title = 'Lead assigned to you')::integer, 0, 'nobody else receives the assignment notification');
select ok((select body_short not ilike '%summary%' and body_short not ilike '%@%' from public.notifications where title = 'Lead assigned to you' limit 1), 'the assignment payload carries reference and stage only');
select is((select href from public.notifications where title = 'Lead assigned to you' limit 1), '/admin/operations/leads/' || pg_temp.lead(7)::text, 'the notification links to Lead 360');
select ok(exists (select 1 from public.realtime_events e where e.entity_type = 'notification' and e.action = 'created' and e.entity_id = (select id from public.notifications where title = 'Lead assigned to you' limit 1)), 'a value-free notification pointer is emitted');

insert into public.invoice_payments (id, invoice_id, amount, payment_date, payment_method)
values ('99000000-0000-4000-8000-0000000000e5', '99000000-0000-4000-8000-0000000000f2', 500000, '2026-07-05', 'cash');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and title = 'Payment recorded')::integer, 1, 'finance-capable staff are told about a recorded payment');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and title = 'Invoice paid in full')::integer, 1, 'a fully paid invoice notifies finance readers');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a3' and category = 'finance')::integer, 0, 'staff without finance read receive no payment amounts');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a1' and title = 'Payment recorded')::integer, 0, 'the acting staff member is not notified about their own action');

-- Preferences: disable a category, event produces nothing; re-enable, next event notifies.
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a2', 'aal2');
select is((public.update_notification_preferences('{"leads": false, "security": false}'::jsonb)) ->> 'ok', 'true', 'preferences update succeeds');
select is((select in_app_enabled from public.notification_preferences where profile_id = '99000000-0000-4000-8000-0000000000a2' and category = 'leads'), false, 'leads preference is stored');
select is((select count(*) from public.notification_preferences where profile_id = '99000000-0000-4000-8000-0000000000a2' and category = 'security')::integer, 0, 'the mandatory security category cannot be disabled');
select is((select (c ->> 'in_app_enabled')::boolean from jsonb_array_elements(public.admin_get_notification_preferences() -> 'categories') c where c ->> 'category' = 'security'), true, 'security reads as enabled and mandatory');
select is((select (c ->> 'mandatory')::boolean from jsonb_array_elements(public.admin_get_notification_preferences() -> 'categories') c where c ->> 'category' = 'system'), true, 'system is mandatory');
select is(public.admin_get_notification_preferences() #>> '{email,configured}', 'false', 'email delivery reports provider not configured');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a1', 'aal2');
update public.leads set assigned_to = '99000000-0000-4000-8000-0000000000a2', version = version + 1 where id = pg_temp.lead(10);
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and title = 'Lead assigned to you')::integer, 1, 'a disabled category produces no notification');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a2', 'aal2');
select is((public.update_notification_preferences('{"leads": true}'::jsonb)) ->> 'ok', 'true', 'preference re-enabled');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a1', 'aal2');
update public.leads set assigned_to = '99000000-0000-4000-8000-0000000000a2', version = version + 1 where id = pg_temp.lead(8);
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and title = 'Lead assigned to you')::integer, 2, 'the next qualifying event notifies again');
select is((select count(*) from public.audit_logs where action = 'notification.preference_update')::integer, 2, 'preference changes are audited');

-- Timed sweep: idempotent -----------------------------------------------------------------
select pg_temp.as_service();
insert into c9 values ('sweep1', public.run_notification_sweep('verification'));
insert into c9 values ('sweep2', public.run_notification_sweep('verification'));
select ok((pg_temp.v('sweep1') ->> 'produced')::integer > 0, 'the first sweep produces timed notifications');
select is((pg_temp.v('sweep2') ->> 'produced')::integer, 0, 'the second sweep produces nothing new');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and dedupe_key like 'invoice:99000000-0000-4000-8000-0000000000f1:overdue:%')::integer, 1, 'one active overdue notification per invoice');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and dedupe_key like 'po:99000000-0000-4000-8000-0000000000ad:delayed:%')::integer, 1, 'one active delayed notification per purchase order');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and dedupe_key like 'lead:' || pg_temp.lead(11)::text || ':uncontacted:%')::integer, 1, 'one stale-lead notification per lead per day');
select is((select count(*) from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' and dedupe_key like 'project:99000000-0000-4000-8000-0000000000d2:behind:%')::integer, 1, 'one behind-planned-end notification per project per week');
select is((select count(*) from public.notification_sweep_runs where trigger_kind = 'verification' and finished_at is not null)::integer, 2, 'sweep runs are recorded');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a2', 'aal2');
select is((public.admin_run_notification_sweep()) ->> 'ok', 'false', 'an admin without notifications.manage cannot run the sweep');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a1', 'aal2');
select is((public.admin_run_notification_sweep()) ->> 'ok', 'true', 'the super admin can run the sweep manually');
select ok(exists (select 1 from jsonb_array_elements(private.launch_readiness() -> 'checks') c where c ->> 'key' = 'notification_sweep' and c ->> 'state' = 'ready'), 'launch readiness sees the recent sweep');

-- Notification facades: own rows only, read state, archive ---------------------------------
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a2', 'aal2');
insert into c9 values ('summary', public.admin_notifications_summary());
select ok((pg_temp.v('summary') ->> 'unread_count')::integer >= 4, 'the unread count covers event-driven and timed notifications');
select is((select count(*) from jsonb_array_elements(public.admin_list_notifications('all') -> 'items') i where (i ->> 'id')::uuid in (select id from public.notifications where recipient_profile_id <> '99000000-0000-4000-8000-0000000000a2'))::integer, 0, 'the register never returns another recipient''s notifications');
select is((select count(*) from jsonb_array_elements(public.admin_list_notifications('unread', 'finance') -> 'items') i where i ->> 'category' <> 'finance')::integer, 0, 'category filter is honoured');
select is((public.mark_notification_read((select id from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' order by created_at limit 1))) ->> 'ok', 'true', 'own notification can be marked read');
select is((public.mark_notification_read((select id from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a1' limit 1))) ->> 'ok', 'false', 'another recipient''s notification cannot be marked read');
select is((public.archive_notification((select id from public.notifications where recipient_profile_id = '99000000-0000-4000-8000-0000000000a2' order by created_at limit 1))) ->> 'ok', 'true', 'own notification can be archived');
select is((public.mark_all_notifications_read()) ->> 'unread_count', '0', 'mark all read clears the unread count');
select is((public.admin_notifications_summary() ->> 'unread_count')::integer, 0, 'summary agrees');
select ok(not has_table_privilege('authenticated', 'public.notifications', 'SELECT') and not has_table_privilege('anon', 'public.notifications', 'SELECT'), 'nobody can read the notifications table directly');
select ok(not has_table_privilege('authenticated', 'public.website_analytics_daily', 'SELECT') and not has_table_privilege('anon', 'public.website_analytics_daily', 'SELECT'), 'nobody can read the analytics table directly');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.notifications'::regclass), 'notifications force row level security');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a5', 'aal2');
select throws_ok($$ select public.admin_notifications_summary() $$, '42501', 'notifications are not authorized', 'notifications.read is required');
select pg_temp.as_actor('99000000-0000-4000-8000-0000000000a4', 'aal2');
select throws_ok($$ select public.admin_notifications_summary() $$, '42501', 'notifications are not authorized', 'disabled staff are denied notifications');

-- Launch readiness: analytics + privacy sync ----------------------------------------------
select pg_temp.as_postgres();
select ok(exists (select 1 from jsonb_array_elements(private.launch_readiness() -> 'checks') c where c ->> 'key' = 'analytics_privacy' and c ->> 'state' = 'blocked'), 'first-party analytics on without a published analytics disclosure blocks readiness');
update public.website_settings set analytics_enabled = true, analytics_provider = 'ga4', consent_required = false, version = version + 1 where id = 1;
select ok(exists (select 1 from jsonb_array_elements(private.launch_readiness() -> 'checks') c where c ->> 'key' = 'consent_mode' and c ->> 'state' = 'blocked'), 'GA4 without consent blocks readiness');
select ok(exists (select 1 from jsonb_array_elements(private.launch_readiness() -> 'checks') c where c ->> 'key' = 'analytics_configuration' and c ->> 'state' = 'warning'), 'a provider without a site id warns');
update public.website_settings set analytics_enabled = false, analytics_provider = null, first_party_analytics_enabled = false, version = version + 1 where id = 1;
select ok(exists (select 1 from jsonb_array_elements(private.launch_readiness() -> 'checks') c where c ->> 'key' = 'analytics_configuration' and c ->> 'state' = 'ready'), 'analytics off is ready with no consent prompt');
select is(public.public_site_configuration() #>> '{website,first_party_analytics_enabled}', null, 'the unpublished flag is not in the current snapshot until republished');
select is((select value ->> 'accepted' from (select public.website_analytics_record('[{"t":"page_view","p":"/","dc":"desktop"}]'::jsonb) as value) as r), '0', 'recording is a no-op while first-party analytics is off');

select * from finish();
rollback;
