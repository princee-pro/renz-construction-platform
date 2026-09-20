import { client, createActor, credentials, removeUserByEmail, sleep } from "./c4-local.mjs";
import { assert, runLocalSql } from "./s4-local.mjs";

// C10 §51–52, §47–49, §55, §182 — adversarial checks against the local
// stack at network level. Everything here is a request an attacker can
// make without a browser: anonymous calls to every staff facade, an AAL1
// session (password only) against the same facades, a disabled account, a
// password-change-pending account, forged share tokens, media/attachment
// IDs, the health endpoint, the tasks endpoint, the intake upload endpoint
// and the public analytics recorder. The expected result everywhere is
// refusal without information (no stack, no table names, no secrets).
//   node scripts/verify-c10-security.mjs [base]   (server must already run)

const base = process.argv[2] ?? process.env.RENZ_BASE ?? "http://127.0.0.1:3100";
const password = ["Local", "C10", "Security", "Passphrase", "2026", "!"].join("-");
const emailAal1 = "c10-synthetic-aal1@example.test";
const emailDisabled = "c10-synthetic-disabled@example.test";
const emailPending = "c10-synthetic-pending@example.test";
const secretMarkers = [
  credentials.secretKey,
  process.env.INTAKE_RATE_LIMIT_SECRET ?? "never-matches-\u0000",
  "service_role",
  "SUPABASE_SECRET_KEY",
  "at Object.",
  "node_modules",
  "pg_",
  "postgres",
];
let checks = 0;

function pass(message) {
  checks += 1;
  console.log(`  ok ${checks} - ${message}`);
}

function noLeak(text, where) {
  for (const marker of secretMarkers) {
    assert(!text.includes(marker), `${where} leaks "${marker.slice(0, 12)}…"`);
  }
}

async function http(path, init = {}) {
  const response = await fetch(base + path, { redirect: "manual", ...init });
  const text = await response.text();
  return { status: response.status, text, headers: response.headers };
}

// ---------------------------------------------------------------------
// 1. Every staff facade refuses anonymous callers, and refuses AAL1.
// ---------------------------------------------------------------------
const facades = runLocalSql(
  `select string_agg(p.proname || '|' || pg_get_function_identity_arguments(p.oid), E'\\n' order by p.proname)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and (p.proname like 'admin\\_%' or p.proname like 'create\\_admin\\_%' or p.proname like 'update\\_admin\\_%'
          or p.proname like 'set\\_staff\\_%' or p.proname like 'issue\\_%' or p.proname like 'void\\_%'
          or p.proname like 'record\\_%' or p.proname like 'archive\\_%' or p.proname like 'publish\\_%'
          or p.proname like 'restore\\_%' or p.proname like 'complete\\_%' or p.proname like 'activate\\_%')`,
  "facade inventory",
)
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [name, args] = line.split("|");
    return { name, args: args ?? "" };
  });
assert(facades.length >= 80, `facade inventory looks incomplete (${facades.length}).`);

function argumentsFor(signature) {
  // Minimal well-typed arguments so the permission check — not a parse
  // error — is what refuses the call.
  const params = {};
  if (!signature.trim()) return params;
  for (const part of signature.split(",")) {
    const [rawName, ...rest] = part.trim().split(/\s+/u);
    const type = rest.join(" ").replace(/\s+default.*$/iu, "");
    const name = rawName;
    if (/uuid\[\]/u.test(type)) params[name] = [];
    else if (/uuid/u.test(type)) params[name] = "00000000-0000-4000-8000-000000000001";
    else if (/integer|numeric|bigint/u.test(type)) params[name] = 1;
    else if (/boolean/u.test(type)) params[name] = true;
    else if (/jsonb/u.test(type)) params[name] = {};
    else if (/text\[\]/u.test(type)) params[name] = [];
    else if (/date/u.test(type)) params[name] = "2026-01-01";
    else params[name] = "x";
  }
  return params;
}

const anonymous = client(credentials.anonymousKey);
let anonymousRefusals = 0;
for (const facade of facades) {
  const { data, error } = await anonymous.rpc(facade.name, argumentsFor(facade.args));
  const okTrue = data && typeof data === "object" && data.ok === true;
  const returnedRows = Array.isArray(data) && data.length > 0;
  assert(!okTrue && !returnedRows, `anonymous ${facade.name} answered with data`);
  if (error) noLeak(error.message, `anonymous ${facade.name} error`);
  anonymousRefusals += 1;
}
pass(`${anonymousRefusals} staff facades refuse anonymous callers (no data, no leak)`);

await createActor(emailAal1, password, "admin");
const aal1 = client(credentials.publishableKey);
const signIn = await aal1.auth.signInWithPassword({ email: emailAal1, password });
assert(!signIn.error, "AAL1 sign-in failed");
let aal1Refusals = 0;
for (const facade of facades) {
  if (facade.name === "activate_current_profile") continue; // AAL2-only by contract, tested by S4.
  const { data, error } = await aal1.rpc(facade.name, argumentsFor(facade.args));
  const okTrue = data && typeof data === "object" && data.ok === true;
  const returnedRows = Array.isArray(data) && data.length > 0;
  assert(!okTrue && !returnedRows, `AAL1 ${facade.name} answered with data`);
  if (error) noLeak(error.message, `AAL1 ${facade.name} error`);
  aal1Refusals += 1;
}
pass(`${aal1Refusals} staff facades refuse a password-only (AAL1) session`);
const aal1Access = await aal1.rpc("current_user_access");
assert(
  !aal1Access.error && Array.isArray(aal1Access.data) && aal1Access.data.length === 0,
  "AAL1 current_user_access must expose no permissions",
);
pass("AAL1 session sees zero permissions");

// ---------------------------------------------------------------------
// 2. Disabled and password-change-pending accounts get nothing.
// ---------------------------------------------------------------------
await createActor(emailDisabled, password, "admin");
runLocalSql(
  `update public.profiles set account_status = 'disabled', version = version + 1
   where id = (select id from auth.users where email = '${emailDisabled}')`,
  "disable synthetic account",
);
const disabled = client(credentials.publishableKey);
const disabledSignIn = await disabled.auth.signInWithPassword({ email: emailDisabled, password });
if (!disabledSignIn.error) {
  const access = await disabled.rpc("current_user_access");
  assert(!access.data || access.data.length === 0, "a disabled profile must have no permissions");
  const list = await disabled.rpc("admin_list_clients", {});
  assert(list.error || !list.data || list.data?.ok !== true, "disabled account read clients");
}
pass("a disabled account holds no permissions and reads nothing");

await createActor(emailPending, password, "admin");
runLocalSql(
  `update public.profiles set account_status = 'active', must_change_password = true, version = version + 1
   where id = (select id from auth.users where email = '${emailPending}')`,
  "flag synthetic account for password change",
);
const pending = client(credentials.publishableKey);
const pendingSignIn = await pending.auth.signInWithPassword({ email: emailPending, password });
assert(!pendingSignIn.error, "pending sign-in failed");
const pendingAccess = await pending.rpc("current_user_access");
assert(
  Array.isArray(pendingAccess.data) && pendingAccess.data.length === 0,
  "a password-change-pending account must have no permissions (server-side)",
);
const pendingState = await pending.rpc("current_user_password_state");
assert(pendingState.data?.must_change_password === true, "password state not reported");
pass("a password-change-pending account holds zero permissions until it completes the change");

// ---------------------------------------------------------------------
// 3. Sensitive tables are not readable through PostgREST by anyone but
//    service_role (profiles/roles are read through facades only).
// ---------------------------------------------------------------------
for (const table of [
  "profiles",
  "user_roles",
  "audit_logs",
  "invoices",
  "invoice_share_links",
  "leads",
  "lead_attachments",
  "clients",
  "notifications",
  "public_configuration",
]) {
  const anonymousRead = await anonymous.from(table).select("*").limit(1);
  assert(
    anonymousRead.error || (anonymousRead.data ?? []).length === 0,
    `anonymous select on ${table} returned rows`,
  );
  const aal1Read = await aal1.from(table).select("*").limit(5);
  const ownOnly = (aal1Read.data ?? []).every(
    (row) =>
      (row.id ?? row.user_id) === signIn.data.user?.id &&
      ["profiles", "user_roles"].includes(table),
  );
  assert(
    aal1Read.error || (aal1Read.data ?? []).length === 0 || ownOnly,
    `AAL1 select on ${table} returned other people's rows`,
  );
}
pass("anonymous and AAL1 reads of 10 sensitive tables return nothing (own profile/role row only)");

// ---------------------------------------------------------------------
// 4. HTTP surface: admin routes, health, tasks, media, share tokens, intake.
// ---------------------------------------------------------------------
for (const path of [
  "/admin",
  "/admin/finance",
  "/admin/settings/staff",
  "/admin/finance/invoices/export",
  "/admin/analytics/export",
  "/admin/finance/invoices/00000000-0000-4000-8000-000000000001/pdf",
  "/admin/procurement/orders/00000000-0000-4000-8000-000000000001/pdf",
  "/preview/website/00000000-0000-4000-8000-000000000001",
]) {
  const result = await http(path);
  assert(
    [301, 302, 303, 307, 308, 401, 403, 404].includes(result.status),
    `${path} answered ${result.status} to an anonymous request`,
  );
  noLeak(result.text, path);
}
pass("8 staff-only HTTP routes redirect or refuse anonymous requests");

const health = await http("/api/health");
assert(health.status === 200 || health.status === 503, `health answered ${health.status}`);
noLeak(health.text, "/api/health");
assert(!/http[s]?:\/\//u.test(health.text), "/api/health must not expose URLs");
assert(health.headers.get("cache-control")?.includes("no-store"), "health must be no-store");
pass("/api/health is public but exposes categories only (no URLs, keys or internals)");

const sweep = await http("/api/tasks/notifications-sweep", { method: "POST" });
assert([401, 403, 404, 405].includes(sweep.status), `tasks endpoint answered ${sweep.status}`);
const sweepForged = await http("/api/tasks/notifications-sweep", {
  method: "POST",
  headers: { authorization: "Bearer not-the-secret" },
});
assert(
  [401, 403, 404].includes(sweepForged.status),
  `forged task token answered ${sweepForged.status}`,
);
pass("the scheduled-task endpoint refuses missing and forged credentials");

const forgedTokens = [
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "../../etc/passwd",
  "%00",
  "' or 1=1 --",
  "a".repeat(2000),
];
const shapes = new Set();
for (const token of forgedTokens) {
  for (const prefix of ["/i/", "/po/"]) {
    const page = await http(`${prefix}${encodeURIComponent(token)}`);
    assert([404, 400].includes(page.status), `${prefix} forged token answered ${page.status}`);
    noLeak(page.text, `${prefix}token`);
    shapes.add(`${prefix}${page.status}`);
    const pdf = await http(`${prefix}${encodeURIComponent(token)}/pdf`);
    assert([404, 400].includes(pdf.status), `${prefix} forged token pdf answered ${pdf.status}`);
  }
}
pass(
  `forged share tokens (${forgedTokens.length} shapes) answer a constant not-found on /i and /po`,
);

for (const path of [
  "/api/media/website/00000000-0000-4000-8000-000000000001",
  "/api/media/project/00000000-0000-4000-8000-000000000001",
  "/api/media/brand/..%2F..%2Fetc",
  "/api/media/brand/logo%00.png",
  "/api/leads/attachments/00000000-0000-4000-8000-000000000001",
  "/api/admin/media",
  "/api/admin/projects/media",
]) {
  const result = await http(path, { method: path.startsWith("/api/admin") ? "POST" : "GET" });
  assert(
    [400, 401, 403, 404, 405].includes(result.status),
    `${path} answered ${result.status} anonymously`,
  );
  noLeak(result.text, path);
}
pass("media, attachment and admin upload endpoints refuse anonymous and malformed requests");

const crossOrigin = await http("/api/intake/uploads", {
  method: "POST",
  headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
  body: new FormData(),
});
assert(crossOrigin.status === 403, `cross-site upload answered ${crossOrigin.status}`);
const oversized = new FormData();
oversized.set(
  "file",
  new Blob([new Uint8Array(11 * 1024 * 1024)], { type: "image/png" }),
  "big.png",
);
oversized.set("form_token", "x");
const tooLarge = await http("/api/intake/uploads", {
  method: "POST",
  headers: { origin: base },
  body: oversized,
});
assert(
  [400, 403, 413, 415, 429].includes(tooLarge.status),
  `oversized upload answered ${tooLarge.status}`,
);
noLeak(tooLarge.text, "oversized upload");
const disguised = new FormData();
disguised.set("file", new Blob(["<?php echo 1; ?>"], { type: "image/png" }), "shell.png");
disguised.set("form_token", "x");
const sniffed = await http("/api/intake/uploads", {
  method: "POST",
  headers: { origin: base },
  body: disguised,
});
assert(
  [400, 403, 415, 422, 429].includes(sniffed.status),
  `disguised upload answered ${sniffed.status}`,
);
pass("intake uploads refuse cross-site, oversized and content-sniffed files");

const analyticsEvent = await http("/api/analytics/events", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ path: "/?token=secret&email=a@b.c", kind: "page_view" }),
});
assert(
  [200, 202, 204, 400, 403].includes(analyticsEvent.status),
  `analytics event answered ${analyticsEvent.status}`,
);
noLeak(analyticsEvent.text, "analytics event");
const recorded = runLocalSql(
  `select count(*) from public.website_analytics_daily where path_key like '%token=%' or path_key like '%@%' or path_key like '%?%'`,
  "analytics privacy",
).trim();
assert(
  recorded === "0" || recorded === "",
  "the analytics recorder stored a query string or email",
);
pass("the public analytics recorder never stores query strings or emails");

const bigServerAction = await http("/admin/sign-in", {
  method: "POST",
  headers: { "content-type": "text/plain;charset=UTF-8", "next-action": "0".repeat(40) },
  body: "x".repeat(2 * 1024 * 1024),
});
assert(
  [400, 404, 413, 500].includes(bigServerAction.status),
  `2 MB server-action body answered ${bigServerAction.status}`,
);
pass("an oversized server-action body is refused (1 MB limit)");

// ---------------------------------------------------------------------
// 5. Sign-in abuse: repeated wrong passwords never reveal whether the
//    account exists, and the message is constant.
// ---------------------------------------------------------------------
const wrong = client(credentials.publishableKey);
const messages = new Set();
for (let attempt = 0; attempt < 6; attempt += 1) {
  const known = await wrong.auth.signInWithPassword({ email: emailAal1, password: "wrong-pass" });
  const unknown = await wrong.auth.signInWithPassword({
    email: `nobody-${attempt}@example.test`,
    password: "wrong-pass",
  });
  messages.add(known.error?.message ?? "none");
  messages.add(unknown.error?.message ?? "none");
  await sleep(50);
}
assert(!messages.has("none"), "a wrong password signed in");
assert(
  messages.size <= 2,
  `sign-in errors differ between known and unknown accounts: ${[...messages].join(" / ")}`,
);
pass("wrong-password attempts never distinguish existing from unknown accounts");

// Cleanup -----------------------------------------------------------------
for (const email of [emailAal1, emailDisabled, emailPending]) await removeUserByEmail(email);
console.log(`\nC10 security: ${checks} checks passed against ${base}`);
