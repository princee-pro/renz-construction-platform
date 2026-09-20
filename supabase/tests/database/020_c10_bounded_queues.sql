begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- ---------------------------------------------------------------------
-- C10 §88/§111 bounded action queues: with more candidates than the
-- requested limit, every attention queue returns at most `limit_count`
-- items (the scale test found the limit applied to the aggregate instead).
-- ---------------------------------------------------------------------

insert into auth.users (id, email) values ('99000000-0000-4000-8000-0000000000b1', 'c10-queues-owner@example.test');
update public.profiles set account_status = 'active', version = version + 1 where id = '99000000-0000-4000-8000-0000000000b1';
insert into public.user_roles (user_id, role_id)
select '99000000-0000-4000-8000-0000000000b1', id from public.roles where key = 'super_admin';

select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-0000000000b1","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;

create temporary table q (key text primary key, value jsonb not null);
insert into q values ('client', public.create_admin_client('SYNTHETIC C10 QUEUE CLIENT', 'synthetic-c10-queue@example.test'));
select is((select value ->> 'ok' from q where key = 'client'), 'true', 'fixture client created');

-- 15 past-due projects → operations queue candidates; 15 overdue invoices → finance queue candidates.
do $$
declare
  i integer;
  client_id uuid := (select (value ->> 'id')::uuid from q where key = 'client');
  created jsonb;
begin
  for i in 1..15 loop
    created := public.create_admin_operational_project(client_id, 'SYNTHETIC C10 QUEUE PROJECT ' || i, null,
      'in_progress', 'execution', 'high', current_date - 60, current_date - i, null, null);
    if (created ->> 'ok') <> 'true' then raise exception 'project %: %', i, created; end if;
    created := public.create_admin_invoice(client_id, null, 'RWF', 0, 'SYNTHETIC-Q-' || i, null, null,
      current_date - 60, current_date - i,
      jsonb_build_array(jsonb_build_object('description', 'line', 'quantity', 1, 'unit_label', 'item', 'unit_price', 1000)));
    if (created ->> 'ok') <> 'true' then raise exception 'invoice %: %', i, created; end if;
    created := public.issue_admin_invoice((created ->> 'id')::uuid, (created ->> 'version')::integer, current_date - 60, current_date - i);
    if (created ->> 'ok') <> 'true' then raise exception 'issue %: %', i, created; end if;
  end loop;
end $$;

select cmp_ok(jsonb_array_length(public.admin_action_queue(100)), '>=', 15, 'more past-due projects exist than the queue limit');

select is(jsonb_array_length(public.admin_action_queue(10)), 10, 'the operations action queue returns exactly limit_count items');
select is(jsonb_array_length(public.admin_finance_action_queue(8)), 8, 'the finance action queue returns exactly limit_count items');
select cmp_ok(jsonb_array_length(public.admin_delivery_action_queue(12)), '<=', 12, 'the delivery action queue never exceeds limit_count');
select ok(
  (public.admin_finance_action_queue(8) -> 0 ->> 'kind') in ('overdue', 'overdue_partially_paid'),
  'the bounded finance queue keeps its ranking (overdue first)'
);

select * from finish();

rollback;
