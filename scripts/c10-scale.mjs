// C10 §87–88 — reversible synthetic scale data for the LOCAL database only.
// Everything is created through the real facades (numbering, audit, versions)
// as the synthetic super admin from .playwright/s5a-fixtures.json, inside
// one psql session with the owner's JWT claims set, so it is fast (plpgsql
// loops) and behaves exactly like owner activity. Every record carries the
// marker "SCALE " in its name/reference; `down` removes them all.
//   node scripts/c10-scale.mjs up   [clients=500 projectsPerClient=2 leads=500 partners=300 invoices=2500 payments=2]
//   node scripts/c10-scale.mjs down
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mode = process.argv[2] ?? "up";
const container = process.env.RENZ_DB_CONTAINER ?? "supabase_db_renz-construction-local";
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const owner = fixtures.actors.superA;
const counts = {
  clients: Number(process.argv[3] ?? 500),
  projectsPerClient: Number(process.argv[4] ?? 2),
  leads: Number(process.argv[5] ?? 500),
  partners: Number(process.argv[6] ?? 300),
  invoices: Number(process.argv[7] ?? 2500),
  paymentsPerInvoice: Number(process.argv[8] ?? 2),
};

const claims = JSON.stringify({ sub: owner.id, role: "authenticated", aal: "aal2" });

const up = `
select set_config('request.jwt.claims', '${claims}', false);
set role authenticated;
do $$
declare
  i integer;
  j integer;
  client_id uuid;
  client_ids uuid[] := '{}';
  project_id uuid;
  project_ids uuid[] := '{}';
  invoice_id uuid;
  result jsonb;
  version integer;
  currency text;
begin
  -- clients + projects
  for i in 1..${counts.clients} loop
    result := public.create_admin_client(
      'SCALE Client ' || lpad(i::text, 4, '0'),
      'scale-client-' || i || '@example.test',
      '+2507800' || lpad((10000 + i)::text, 5, '0'),
      null, 'SCALE Company ' || i, case when i % 5 = 0 then 'premium' else 'standard' end, null, null, null
    );
    if (result ->> 'ok') <> 'true' then raise exception 'client %: %', i, result; end if;
    client_id := (result ->> 'id')::uuid;
    client_ids := client_ids || client_id;
    for j in 1..${counts.projectsPerClient} loop
      result := public.create_admin_operational_project(
        client_id, 'SCALE Project ' || i || '-' || j, 'Synthetic scale project.',
        (array['planning','in_progress','on_hold','completed'])[1 + (i + j) % 4],
        (array['design','planning','procurement','structural','execution','finishing'])[1 + (i + j) % 6],
        (array['low','medium','high'])[1 + i % 3],
        current_date - (i % 200), current_date + (j * 30), 1000000 * (1 + i % 9),
        (array['RWF','USD','EUR'])[1 + i % 3]
      );
      if (result ->> 'ok') <> 'true' then raise exception 'project %-%: %', i, j, result; end if;
      project_ids := project_ids || (result ->> 'id')::uuid;
    end loop;
  end loop;
  -- leads
  for i in 1..${counts.leads} loop
    result := public.create_lead_manual(
      (array['general','project','service','material'])[1 + i % 4], 'manual',
      'SCALE Lead ' || lpad(i::text, 4, '0'), 'SCALE enquiry ' || i,
      'scale-lead-' || i || '@example.test', null, null, null, 'Synthetic scale lead message.', null, null, false
    );
    if (result ->> 'ok') <> 'true' then raise exception 'lead %: %', i, result; end if;
  end loop;
  -- partners (contractors and suppliers)
  for i in 1..${counts.partners} loop
    result := public.create_admin_trade_partner(
      'SCALE Partner ' || lpad(i::text, 4, '0'),
      case when i % 3 = 0 then array['supplier'] else array['contractor'] end,
      'SCALE Partner Co ' || i, null, 'scale-partner-' || i || '@example.test', null, null, null, '{}', 'available'
    );
    if (result ->> 'ok') <> 'true' then raise exception 'partner %: %', i, result; end if;
  end loop;
  -- invoices (issued) + payments
  for i in 1..${counts.invoices} loop
    client_id := client_ids[1 + (i % array_length(client_ids, 1))];
    project_id := project_ids[1 + (i % array_length(project_ids, 1))];
    currency := (array['RWF','USD','EUR'])[1 + i % 3];
    result := public.create_admin_invoice(
      client_id, null, currency, 18, 'SCALE-' || i, null, 'Due in 30 days.', current_date - (i % 90), current_date - (i % 90) + 30,
      jsonb_build_array(
        jsonb_build_object('description', 'SCALE line 1', 'quantity', 1 + i % 3, 'unit_label', 'item', 'unit_price', 100000 + (i % 7) * 12500),
        jsonb_build_object('description', 'SCALE line 2', 'quantity', 2, 'unit_label', 'day', 'unit_price', 45000)
      )
    );
    if (result ->> 'ok') <> 'true' then raise exception 'invoice %: %', i, result; end if;
    invoice_id := (result ->> 'id')::uuid;
    version := (result ->> 'version')::integer;
    if i % 4 <> 0 then
      result := public.issue_admin_invoice(invoice_id, version, current_date - (i % 90), current_date - (i % 90) + 30);
      if (result ->> 'ok') <> 'true' then raise exception 'issue %: %', i, result; end if;
      for j in 1..${counts.paymentsPerInvoice} loop
        if (i + j) % 3 = 0 then
          result := public.record_invoice_payment(invoice_id, 20000, current_date - (i % 60), 'bank_transfer', 'SCALE-PAY-' || i || '-' || j, null);
          if (result ->> 'ok') <> 'true' then raise exception 'payment %-%: %', i, j, result; end if;
        end if;
      end loop;
    end if;
  end loop;
end $$;
reset role;
`;

// LOCAL teardown only: the integrity triggers (payments are never deleted,
// audit rows are append-only, versions) are the product's own protection and
// refuse this even as superuser, so replication mode bypasses them here.
const down = `
set session_replication_role = replica;
delete from public.invoice_payments where invoice_id in (select id from public.invoices where reference like 'SCALE-%');
delete from public.invoice_line_items where invoice_id in (select id from public.invoices where reference like 'SCALE-%');
delete from public.invoices where reference like 'SCALE-%';
delete from public.operational_projects where title like 'SCALE Project %';
delete from public.clients where full_name like 'SCALE Client %';
delete from public.leads where full_name like 'SCALE Lead %';
delete from public.trade_partners where display_name like 'SCALE Partner %';
delete from public.notifications where title like '%SCALE%';
delete from public.audit_logs where metadata::text like '%SCALE %' or metadata::text like '%SCALE-%';
reset session_replication_role;
`;

const sql = mode === "down" ? down : up;
const file = join(tmpdir(), `c10-scale-${mode}.sql`);
writeFileSync(file, sql);
const started = Date.now();
execFileSync("docker", ["cp", file, `${container}:/tmp/c10-scale.sql`], { stdio: "inherit" });
try {
  execFileSync(
    "docker",
    [
      "exec",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-f",
      "/tmp/c10-scale.sql",
    ],
    { stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1" } },
  );
} catch (error) {
  console.error(`scale ${mode} failed`);
  throw error;
}
console.log(`scale ${mode} done in ${Math.round((Date.now() - started) / 1000)}s`);
