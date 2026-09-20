// C10 §87, §142–146 — backup and restore (LOCAL rehearsal + production
// runbook helper). See docs/RENZ_BACKUP_RESTORE.md.
//
//   node scripts/backup.mjs dump <file.sql>          data-only dump (auth, public, storage metadata)
//   node scripts/backup.mjs restore <file.sql>       restore into the LOCAL database, one transaction
//   node scripts/backup.mjs counts                   row counts for the verification table
//
// `dump` is `supabase db dump --data-only --use-copy` (the Supabase CLI's own
// format). `restore` prepends one statement that empties every table the dump
// repopulates — migrations insert defaults (roles, permissions, settings
// singletons, section registries) that would otherwise collide — and runs
// the whole file in a single transaction with ON_ERROR_STOP, so a failed
// restore leaves the database exactly as it was. Storage OBJECT BYTES are not
// in a database dump; the runbook covers the bucket copy.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { root, runLocalSql, runSupabase } from "./s4-local.mjs";

const [mode, file] = process.argv.slice(2);
const countTables = [
  "auth.users",
  "auth.mfa_factors",
  "public.profiles",
  "public.user_roles",
  "public.services",
  "public.projects",
  "public.posts",
  "public.media_assets",
  "public.website_pages",
  "public.website_page_revisions",
  "public.clients",
  "public.operational_projects",
  "public.leads",
  "public.trade_partners",
  "public.invoices",
  "public.invoice_payments",
  "public.purchase_orders",
  "public.notifications",
  "public.audit_logs",
  "public.public_configuration_snapshots",
  "storage.buckets",
  "storage.objects",
];

function counts() {
  const sql = countTables
    .map((table) => `select '${table}' as t, count(*)::text as n from ${table}`)
    .join(" union all ");
  return runLocalSql(sql, "row counts");
}

if (mode === "counts") {
  console.log(counts());
} else if (mode === "dump") {
  if (!file) throw new Error("dump needs a target file");
  const result = runSupabase(["db", "dump", "--local", "--data-only", "--use-copy", "-f", file], {
    timeout: 600_000,
  });
  if (result.status !== 0) throw new Error("supabase db dump failed");
  const size = readFileSync(join(root, file)).length;
  console.log(`dumped ${file} (${Math.round(size / 1024)} KB)`);
} else if (mode === "restore") {
  if (!file) throw new Error("restore needs a source file");
  const raw = readFileSync(join(root, file), "utf8");
  // Keep only COPY blocks that carry rows. The CLI dumps every table in
  // auth/storage including platform-internal ones (owned by Supabase roles);
  // an empty COPY into those fails on privilege and carries nothing anyway.
  const blocks = raw.split(/^(?=COPY ")/mu);
  const kept = [];
  const tables = [];
  for (const block of blocks) {
    const match = /^COPY "([a-z0-9_]+)"\."([a-z0-9_]+)"[^\n]*\n([\s\S]*?)^\\\.$/mu.exec(block);
    if (!match) {
      kept.push(block);
      continue;
    }
    if (match[3].trim().length === 0) continue;
    tables.push(`"${match[1]}"."${match[2]}"`);
    kept.push(block);
  }
  if (tables.length === 0) throw new Error("the dump contains no rows");
  const unique = [...new Set(tables)];
  const dump = kept.join("");
  // DELETE (not TRUNCATE): with replica mode the referential triggers are
  // off, and nothing outside the dump's own tables is touched (TRUNCATE
  // CASCADE would reach Supabase-owned tables the app role cannot alter).
  // The S4 publication/media guards are CHECK constraints keyed on session
  // settings (only the reviewed commands may write published rows); a
  // restore replays already-reviewed rows, so the same settings are set.
  const restore = [
    "set session_replication_role = replica;",
    "select set_config('renz.s4.publication_command', '1', false);",
    "select set_config('renz.s4.media_command', '1', false);",
    ...[...unique].reverse().map((table) => `delete from ${table};`),
    dump,
    // COPY does not move sequences: every serial/identity column would hand
    // out ids that already exist (found in the rehearsal: Auth refresh tokens
    // collided and sign-in failed with 500 until the sequences were reset).
    `do $$
declare seq record;
begin
  for seq in
    select n.nspname as schema_name, s.relname as sequence_name, t.relname as table_name, a.attname as column_name
    from pg_class s
    join pg_namespace n on n.oid = s.relnamespace
    join pg_depend d on d.objid = s.oid and d.deptype in ('a', 'i')
    join pg_class t on t.oid = d.refobjid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
    where s.relkind = 'S' and n.nspname in ('auth', 'public', 'storage')
  loop
    execute format('select setval(%L, coalesce((select max(%I) from %I.%I), 0) + 1, false)',
      seq.schema_name || '.' || seq.sequence_name, seq.column_name, seq.schema_name, seq.table_name);
  end loop;
end $$;`,
    "reset session_replication_role;",
  ].join("\n");
  const staged = join(tmpdir(), "renz-restore.sql");
  writeFileSync(staged, restore);
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8");
  const projectId = /^project_id\s*=\s*"([A-Za-z0-9][A-Za-z0-9._-]*)"\s*$/mu.exec(config)?.[1];
  if (!projectId) throw new Error("The local Supabase project id could not be resolved safely.");
  const name = `supabase_db_${projectId}`;
  spawnSync("docker", ["cp", staged, `${name}:/tmp/renz-restore.sql`], { stdio: "inherit" });
  const result = spawnSync(
    "docker",
    [
      "exec",
      name,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-q",
      "--single-transaction",
      "--variable",
      "ON_ERROR_STOP=1",
      "-f",
      "/tmp/renz-restore.sql",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, MSYS_NO_PATHCONV: "1" },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    console.error(result.stderr?.split("\n").slice(-6).join("\n"));
    throw new Error("restore failed; the transaction was rolled back");
  }
  console.log(`restored ${unique.length} tables from ${file}`);
  console.log(counts());
} else {
  throw new Error("usage: backup.mjs dump <file> | restore <file> | counts");
}
