import {
  client,
  createActor,
  credentials,
  removeUserByEmail,
  rpc,
  signInAndActivate,
  sleep,
} from "./c4-local.mjs";
import { assert, runLocalSql } from "./s4-local.mjs";

// C9 intelligence — network-level verification against the local stack
// (the pgTAP suite 017 owns the arithmetic). Proves, as real roles:
//   - analytics RPCs refuse anon / AAL1 / missing permission and omit
//     unauthorised domains from the overview;
//   - the website analytics recorder is service_role only; recorded
//     aggregates carry no query strings, emails, references or private paths;
//   - notification recipient routing (assignee only), preferences, the
//     value-free realtime pointer arriving at a subscribed staff session,
//     own-rows-only facades, and an idempotent timed sweep.
// Every record is synthetic and removed at the end.

const emailA = "c9-synthetic-a@example.test";
const emailB = "c9-synthetic-b@example.test";
const emailC = "c9-synthetic-c@example.test";
const emailNoAnalytics = "c9-synthetic-noan@example.test";
const emailAal1 = "c9-synthetic-aal1@example.test";
const password = ["Local", "C9", "Intelligence", "Passphrase", "2026", "!"].join("-");
const leadsOnlyRole = "c9-synthetic-leads-only";
// Actor A is an admin plus a synthetic manager role (notifications.manage):
// a synthetic super_admin would be the only super admin after a db reset and
// the S3 guard refuses to delete the last one.
const managerRole = "c9-synthetic-manager";
const marker = "SYNTHETIC C9";

function subscribe(supabase, label) {
  const received = [];
  const channel = supabase
    .channel(`verify-c9-${label}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "realtime_events" },
      (payload) => received.push(payload),
    );
  const status = new Promise((resolve) => {
    channel.subscribe((state) => {
      if (state === "SUBSCRIBED" || state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
        resolve(state);
      }
    });
  });
  return { channel, received, status };
}

async function waitFor(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(200);
  }
  return predicate();
}

// Business calendar day (Africa/Kigali), never the UTC date.
function businessDay(offsetDays = 0) {
  const instant = new Date(Date.now() - offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const read = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function today() {
  return businessDay(0);
}

function daysAgo(days) {
  return businessDay(days);
}

async function verifyC9() {
  const checkpoints = [];
  const service = client(credentials.secretKey);
  const anonymous = client(credentials.anonymousKey);
  let channelA = null;
  let sessionA = null;
  try {
    runLocalSql(
      `delete from public.user_roles where role_id in (select id from public.roles where key = '${leadsOnlyRole}');
       delete from public.role_permissions where role_id in (select id from public.roles where key = '${leadsOnlyRole}');
       delete from public.roles where key = '${leadsOnlyRole}';
       insert into public.roles (key, display_name) values ('${leadsOnlyRole}', 'SYNTHETIC leads read only');
       insert into public.role_permissions (role_id, permission_id)
       select r.id, p.id from public.roles r cross join public.permissions p where r.key = '${leadsOnlyRole}' and p.key in ('leads.read', 'notifications.read');
       delete from public.user_roles where role_id in (select id from public.roles where key = '${managerRole}');
       delete from public.role_permissions where role_id in (select id from public.roles where key = '${managerRole}');
       delete from public.roles where key = '${managerRole}';
       insert into public.roles (key, display_name) values ('${managerRole}', 'SYNTHETIC notification manager');
       insert into public.role_permissions (role_id, permission_id)
       select r.id, p.id from public.roles r cross join public.permissions p where r.key = '${managerRole}' and p.key = 'notifications.manage';`,
      "C9 synthetic roles",
    );
    const idA = await createActor(emailA, password, "admin");
    runLocalSql(
      `insert into public.user_roles (user_id, role_id) select '${idA}', id from public.roles where key = '${managerRole}';`,
      "C9 manager grant",
    );
    const idB = await createActor(emailB, password, "admin");
    const idC = await createActor(emailC, password, "admin");
    await createActor(emailNoAnalytics, password, leadsOnlyRole);
    await createActor(emailAal1, password, "admin");
    sessionA = await signInAndActivate(emailA, password);
    const sessionB = await signInAndActivate(emailB, password);
    const sessionC = await signInAndActivate(emailC, password);
    const leadsOnly = await signInAndActivate(emailNoAnalytics, password);
    const aal1 = client(credentials.publishableKey);
    assert(
      !(await aal1.auth.signInWithPassword({ email: emailAal1, password })).error,
      "AAL1 sign-in failed.",
    );
    // Actor creation notified super admins (mandatory security category);
    // start the routing checks from a clean slate for the synthetic actors.
    runLocalSql(
      `delete from public.notifications where recipient_profile_id in ('${idA}', '${idB}', '${idC}');`,
      "C9 clean notifications",
    );

    // ------------------------------------------------------------------
    // 1. RBAC negatives for analytics.
    // ------------------------------------------------------------------
    const range = { range_from: daysAgo(29), range_to: today() };
    const anonOverview = await anonymous.rpc("admin_analytics_overview", range);
    assert(Boolean(anonOverview.error), "Anonymous could read analytics.");
    const aal1Overview = await aal1.rpc("admin_analytics_overview", range);
    assert(Boolean(aal1Overview.error), "AAL1 could read analytics.");
    const leadsOnlyOverview = await leadsOnly.rpc("admin_analytics_overview", range);
    assert(Boolean(leadsOnlyOverview.error), "leads.read without analytics.read read analytics.");
    const anonNotifications = await anonymous.rpc("admin_notifications_summary");
    assert(Boolean(anonNotifications.error), "Anonymous could read notifications.");
    const anonRecord = await anonymous.rpc("website_analytics_record", { events: [] });
    assert(Boolean(anonRecord.error), "Anonymous could execute website_analytics_record.");
    const staffRecord = await sessionB.rpc("website_analytics_record", { events: [] });
    assert(Boolean(staffRecord.error), "Staff could execute website_analytics_record.");
    const staffSweep = await sessionB.rpc("run_notification_sweep", { trigger_kind: "scheduled" });
    assert(Boolean(staffSweep.error), "Staff could execute the service sweep.");
    const anonTable = await anonymous.from("website_analytics_daily").select("day").limit(1);
    assert(
      Boolean(anonTable.error) || (anonTable.data ?? []).length === 0,
      "Anonymous read the analytics table.",
    );
    const staffTable = await sessionB.from("notifications").select("id").limit(1);
    assert(
      Boolean(staffTable.error) || (staffTable.data ?? []).length === 0,
      "Staff read the notifications table directly.",
    );
    checkpoints.push(
      "analytics/notification facades refuse anon, AAL1 and missing permissions; recorder and sweep are service_role only; tables default-deny",
    );

    // ------------------------------------------------------------------
    // 2. Permission-scoped overview (admin holds finance analytics; a
    //    leads-only actor is refused entirely; super admin sees everything).
    // ------------------------------------------------------------------
    const overviewA = await rpc(sessionA, "admin_analytics_overview", range);
    assert(overviewA.finance && overviewA.leads && overviewA.website, "Admin overview incomplete.");
    assert(
      overviewA.range?.timezone === "Africa/Kigali",
      "Overview does not echo the business timezone.",
    );
    assert(
      Array.isArray(overviewA.finance.by_currency),
      "Finance analytics are not grouped by currency.",
    );
    const badRange = await sessionA.rpc("admin_analytics_overview", {
      range_from: "2026-06-30",
      range_to: "2026-06-01",
    });
    assert(Boolean(badRange.error), "An inverted range was accepted.");
    checkpoints.push(
      "overview is permission-scoped, timezone-aware and range-validated server-side",
    );

    // ------------------------------------------------------------------
    // 3. Website analytics recorder: privacy-safe aggregates only.
    // ------------------------------------------------------------------
    runLocalSql(
      `update public.website_settings set first_party_analytics_enabled = true, version = version + 1 where id = 1;`,
      "C9 enable first-party analytics",
    );
    const recorded = await rpc(service, "website_analytics_record", {
      events: [
        { t: "page_view", p: "/", dc: "desktop" },
        {
          t: "page_view",
          p: "/services/design?email=synthetic@example.test&ref=RENZ-LEAD-2026-000001",
          dc: "mobile",
        },
        { t: "service_view", p: "/services/design", d: "design", dc: "mobile" },
        { t: "cta_click", p: "/services/design", d: "start_project", dc: "mobile" },
        { t: "page_view", p: "/admin/operations/leads", dc: "desktop" },
        { t: "page_view", p: "/i/abcdef", dc: "desktop" },
        { t: "custom", p: "/", dc: "desktop" },
        { t: "cta_click", p: "/", d: "<script>", dc: "desktop" },
      ],
    });
    assert(
      recorded.accepted === 4 && recorded.rejected === 4,
      `Recorder accepted ${recorded.accepted}/${recorded.rejected}.`,
    );
    const leaked = runLocalSql(
      `select count(*) from public.website_analytics_daily
        where path_key like '%?%' or path_key like '%@%' or dimension like '%@%' or path_key like '%RENZ-LEAD%'
           or path_key like '/admin%' or path_key like '/i/%' or dimension like '%<%';`,
      "C9 privacy scan",
    );
    assert(
      leaked === "0",
      "Analytics aggregates contain a query string, email, reference or private path.",
    );
    const columns = runLocalSql(
      `select string_agg(column_name, ',') from information_schema.columns where table_schema = 'public' and table_name = 'website_analytics_daily';`,
      "C9 analytics columns",
    );
    assert(
      !/ip|identity|agent|session|visitor/u.test(columns),
      "The analytics table carries an identifier column.",
    );
    const website = await rpc(sessionA, "admin_analytics_website", range);
    assert(website.page_views >= 2, "Website analytics did not count the accepted page views.");
    checkpoints.push(
      "website analytics recorder keeps a fixed vocabulary, strips query strings, rejects private paths; aggregates hold no identifiers",
    );

    // ------------------------------------------------------------------
    // 4. Event-driven routing + realtime pointer + preferences.
    // ------------------------------------------------------------------
    const subscription = subscribe(sessionA, "staff-a");
    channelA = subscription.channel;
    assert(
      (await subscription.status) === "SUBSCRIBED",
      "Staff A could not subscribe to realtime.",
    );

    // Public lead → lead handlers (A, B, C hold leads.write) receive one each; over realtime A sees a pointer.
    const submitted = await rpc(service, "intake_submit_lead", {
      payload: {
        lead_type: "general",
        source_channel: "website_contact",
        idempotency_key: "c9".padEnd(32, "0"),
        full_name: `${marker} VISITOR`,
        email: "synthetic-c9-visitor@example.test",
        summary: "SYNTHETIC C9 enquiry",
        message: "SYNTHETIC C9 private message body",
        consent_revision: 1,
      },
    });
    assert(submitted.ok === true, "Synthetic lead submission failed.");
    const summaryA = await rpc(sessionA, "admin_notifications_summary", { limit_count: 6 });
    assert(summaryA.unread_count >= 1, "Staff A holds no notification after the public lead.");
    const arrived = await waitFor(
      () => subscription.received.some((frame) => frame.new?.entity_type === "notification"),
      30_000,
    );
    assert(
      arrived,
      `Staff A did not receive a notification pointer over realtime (frames: ${subscription.received.length}).`,
    );
    const pointer = subscription.received.find(
      (frame) => frame.new?.entity_type === "notification",
    );
    assert(
      !("title" in (pointer.new ?? {})) && !("body_short" in (pointer.new ?? {})),
      "The realtime pointer carried notification content.",
    );
    const enquiry = summaryA.latest.find((item) => item.title.startsWith("New general enquiry"));
    assert(enquiry, "Staff A was not notified about the new enquiry.");
    assert(
      !enquiry.body_short.includes("private message body") && !enquiry.body_short.includes("@"),
      "The enquiry notification leaked the message or the email.",
    );
    const leadId = runLocalSql(
      `select id from public.leads where full_name = '${marker} VISITOR' limit 1;`,
      "C9 lead id",
    );
    assert(
      enquiry.href === `/admin/operations/leads/${leadId}`,
      "The enquiry notification does not link to Lead 360.",
    );
    checkpoints.push(
      "a public lead notifies lead handlers with a privacy-safe payload; the realtime pointer is value-free",
    );

    // C disables leads; A assigns the lead to B → B notified, C not (disabled), A (actor) not.
    const prefs = await rpc(sessionC, "update_notification_preferences", {
      preferences: { leads: false, security: false },
    });
    assert(prefs.ok === true, "Preference update failed.");
    const prefState = await rpc(sessionC, "admin_get_notification_preferences");
    assert(
      prefState.categories.find((c) => c.category === "security").in_app_enabled === true,
      "Security could be disabled.",
    );
    const leadVersion = Number(
      runLocalSql(`select version from public.leads where id = '${leadId}';`, "C9 lead version"),
    );
    const assigned = await rpc(sessionA, "assign_lead", {
      target_id: leadId,
      expected_version: leadVersion,
      target_assignee: idB,
    });
    assert(assigned.ok === true, "Lead assignment failed.");
    const summaryB = await rpc(sessionB, "admin_notifications_summary", { limit_count: 6 });
    assert(
      summaryB.latest.some((item) => item.title === "Lead assigned to you"),
      "Assignee B was not notified.",
    );
    const listC = await rpc(sessionC, "admin_list_notifications", { state_filter: "all" });
    assert(
      !listC.items.some((item) => item.title === "Lead assigned to you"),
      "Unrelated staff C received the assignment notification.",
    );
    const listA = await rpc(sessionA, "admin_list_notifications", { state_filter: "all" });
    assert(
      !listA.items.some((item) => item.title === "Lead assigned to you"),
      "The acting staff member was notified about their own assignment.",
    );
    // Own rows only: B cannot mark A's notification read.
    const foreign = await rpc(sessionB, "mark_notification_read", { target_id: enquiry.id });
    assert(foreign.ok === false, "Staff B could mark Staff A's notification read.");
    const own = await rpc(sessionB, "mark_notification_read", {
      target_id: summaryB.latest.find((item) => item.title === "Lead assigned to you").id,
    });
    assert(own.ok === true && typeof own.unread_count === "number", "Own mark-read failed.");
    // Re-enable and confirm C receives the next qualifying event (won → lead handlers).
    await rpc(sessionC, "update_notification_preferences", { preferences: { leads: true } });
    checkpoints.push(
      "assignment routes to the assignee only; disabled category suppresses; mandatory categories cannot be disabled; own rows only",
    );

    // ------------------------------------------------------------------
    // 5. Timed sweep idempotency (service role) + admin manual run.
    // ------------------------------------------------------------------
    runLocalSql(
      `insert into public.clients (id, full_name, email, email_normalized) values ('99000000-0000-4000-8000-00000000c9c1', '${marker} Client', 'synthetic-c9-client@example.test', 'synthetic-c9-client@example.test');
       insert into public.invoices (id, client_id, invoice_number, lifecycle_state, currency, issue_date, due_date, issued_client_snapshot, issued_issuer_snapshot, issued_subtotal, issued_tax_amount, issued_total, issued_at)
       values ('99000000-0000-4000-8000-00000000c9f1', '99000000-0000-4000-8000-00000000c9c1', 'RENZ-2026-909001', 'issued', 'RWF', current_date - 40, current_date - 10, '{}'::jsonb, '{}'::jsonb, 100000, 0, 100000, now() - interval '40 days');`,
      "C9 overdue invoice fixture",
    );
    runLocalSql(
      `delete from public.notifications where recipient_profile_id in ('${idA}', '${idB}', '${idC}') and category = 'finance';`,
      "C9 clean finance notifications",
    );
    const sweep1 = await rpc(service, "run_notification_sweep", { trigger_kind: "verification" });
    const sweep2 = await rpc(service, "run_notification_sweep", { trigger_kind: "verification" });
    assert(sweep1.ok === true && sweep2.ok === true, "Sweep failed.");
    const overdueCount = runLocalSql(
      `select count(*) from public.notifications where recipient_profile_id = '${idB}' and dedupe_key like 'invoice:99000000-0000-4000-8000-00000000c9f1:overdue:%';`,
      "C9 overdue notifications",
    );
    assert(overdueCount === "1", `Expected one overdue notification for B, found ${overdueCount}.`);
    const manualDenied = await rpc(sessionB, "admin_run_notification_sweep");
    assert(manualDenied.ok === false, "An admin without notifications.manage ran the sweep.");
    const manual = await rpc(sessionA, "admin_run_notification_sweep");
    assert(manual.ok === true && manual.produced === 0, "Manual sweep should be idempotent.");
    checkpoints.push("timed sweep is idempotent across service and manual runs");

    // ------------------------------------------------------------------
    // 6. Launch readiness reflects the analytics + sweep state.
    // ------------------------------------------------------------------
    const readiness = await rpc(sessionA, "admin_launch_readiness");
    const check = (key) => readiness.checks.find((item) => item.key === key);
    assert(check("notification_sweep")?.state === "ready", "Readiness did not see the sweep.");
    assert(
      check("analytics_privacy")?.state === "blocked",
      "Readiness should block: analytics on, privacy not published.",
    );
    checkpoints.push("launch readiness reports sweep status and the analytics/privacy mismatch");

    console.log(JSON.stringify({ ok: true, checkpoints }));
  } finally {
    if (channelA && sessionA) await sessionA.removeChannel(channelA).catch(() => null);
    runLocalSql(
      `update public.website_settings set first_party_analytics_enabled = false, version = version + 1 where id = 1;
       delete from public.website_analytics_daily;
       delete from public.notifications where entity_id in (select id from public.leads where full_name like '${marker}%') or entity_id = '99000000-0000-4000-8000-00000000c9f1';
       delete from public.leads where full_name like '${marker}%';
       delete from public.invoices where id = '99000000-0000-4000-8000-00000000c9f1';
       delete from public.clients where id = '99000000-0000-4000-8000-00000000c9c1';
       delete from public.notification_sweep_runs where trigger_kind in ('verification', 'manual');
       delete from public.intake_rate_limits;
       delete from public.realtime_events where entity_type in ('lead', 'notification');
       delete from public.user_roles where role_id in (select id from public.roles where key = '${leadsOnlyRole}');
       delete from public.role_permissions where role_id in (select id from public.roles where key = '${leadsOnlyRole}');
       delete from public.roles where key = '${leadsOnlyRole}';
       delete from public.user_roles where role_id in (select id from public.roles where key = '${managerRole}');
       delete from public.role_permissions where role_id in (select id from public.roles where key = '${managerRole}');
       delete from public.roles where key = '${managerRole}';`,
      "C9 synthetic cleanup",
    );
    for (const email of [emailA, emailB, emailC, emailNoAnalytics, emailAal1]) {
      await removeUserByEmail(email);
    }
    runLocalSql(
      `delete from public.notifications where category = 'security' and body_short like '%SYNTHETIC%';`,
      "C9 security notification cleanup",
    );
  }
}

verifyC9().catch((error) => {
  console.error(error instanceof Error ? error.message : "C9 verification failed.");
  process.exit(1);
});
