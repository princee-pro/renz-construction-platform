import {
  admin,
  client,
  createActor,
  credentials,
  removeUserByEmail,
  rpc,
  signInAndActivate,
  sleep,
} from "./c4-local.mjs";
import { assert } from "./s4-local.mjs";

// Transport-level proof of the C4 realtime invalidation pipe (C4 §4-5, §66):
//
//   RPC mutation -> private.emit_realtime_event -> supabase_realtime
//   publication -> Realtime (RLS as the subscriber) -> websocket INSERT
//
// Session A subscribes to `realtime_events` exactly as the admin hook does;
// session B (a different staff member) creates a client and changes a
// project status. A must receive PII-free pointers for both within a bounded
// window. An anonymous subscriber on the same table must receive no pointer
// data (only Realtime's empty "Unauthorized" frames), and the delivered
// staff payload must never carry field values.

const emailA = "c4-realtime-a@example.test";
const emailB = "c4-realtime-b@example.test";
const password = ["Local", "C4", "Realtime", "Passphrase", "2026", "!"].join("-");
const deliveryWindowMs = 10_000;
const subscribeAttempts = 3;

function subscribe(supabase, label) {
  const received = [];
  const channel = supabase
    .channel(`verify-c4-realtime-${label}`)
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

async function verifyRealtime() {
  let clientId;
  let projectId;
  let sessionA;
  let anonymous;
  try {
    await createActor(emailA, password, "admin");
    await createActor(emailB, password, "admin");
    sessionA = await signInAndActivate(emailA, password);
    const sessionB = await signInAndActivate(emailB, password);
    anonymous = client(credentials.anonymousKey);

    // B creates a client -> A must see a `client/created` pointer.
    const created = await rpc(sessionB, "create_admin_client", {
      full_name: "SYNTHETIC C4 REALTIME CLIENT",
      target_email: "synthetic-c4-realtime@example.test",
      target_tier: "standard",
    });
    assert(created?.ok === true, "Realtime fixture client creation failed.");
    clientId = created.id;

    // Right after a `supabase db reset` (which every Playwright run performs
    // in its teardown) the Realtime service needs a moment to re-attach its
    // logical replication slot; a subscription accepted in that window is
    // SUBSCRIBED but silent. Bounded re-subscribe attempts, each proven by a
    // fresh mutation, keep that sequencing from reading as a false negative.
    let staff;
    let delivered = false;
    for (let attempt = 1; attempt <= subscribeAttempts && !delivered; attempt += 1) {
      staff = subscribe(sessionA, `staff-${attempt}`);
      const staffStatus = await staff.status;
      assert(staffStatus === "SUBSCRIBED", `Staff realtime subscription failed (${staffStatus}).`);
      const probe = await rpc(sessionB, "create_client_note", {
        target_client_id: clientId,
        body: `SYNTHETIC realtime probe ${attempt}.`,
      });
      assert(probe?.ok === true, "Realtime probe note creation failed.");
      delivered = await waitFor(
        () =>
          staff.received.some(
            ({ new: row }) => row?.entity_type === "client" && row?.entity_id === clientId,
          ),
        deliveryWindowMs,
      );
      if (!delivered) {
        await sessionA.removeChannel(staff.channel);
        await sleep(3_000);
      }
    }
    assert(delivered, "Session A did not receive the client change pointer over realtime.");
    const anon = subscribe(anonymous, "anon");
    await anon.status;

    // B creates a project and changes its status -> A sees both pointers.
    const project = await rpc(sessionB, "create_admin_operational_project", {
      target_client_id: clientId,
      title: "SYNTHETIC C4 REALTIME PROJECT",
    });
    assert(project?.ok === true, "Realtime fixture project creation failed.");
    projectId = project.id;
    const changed = await rpc(sessionB, "change_operational_project_status", {
      target_id: projectId,
      expected_version: project.version,
      next_status: "in_progress",
    });
    assert(changed?.ok === true, "Realtime fixture status change failed.");
    assert(
      await waitFor(
        () =>
          staff.received.some(
            ({ new: row }) =>
              row?.entity_type === "operational_project" &&
              row?.entity_id === projectId &&
              row?.action === "status_changed",
          ),
        deliveryWindowMs,
      ),
      "Session A did not receive the project status_changed pointer over realtime.",
    );

    // Payload hygiene: pointers only, never field values.
    const allowedKeys = new Set(["id", "entity_type", "entity_id", "action", "created_at"]);
    for (const { new: row, errors } of staff.received) {
      assert(!errors, "A staff realtime frame carried an error.");
      for (const key of Object.keys(row ?? {})) {
        assert(allowedKeys.has(key), `Realtime payload carried an unexpected field "${key}".`);
      }
    }
    const serialized = JSON.stringify(staff.received);
    for (const forbidden of [
      "SYNTHETIC C4 REALTIME CLIENT",
      "synthetic-c4-realtime@example.test",
      "SYNTHETIC C4 REALTIME PROJECT",
    ]) {
      assert(!serialized.includes(forbidden), "Realtime payload leaked a record value.");
    }

    // Anonymous subscribers receive no data. Supabase Realtime cannot refuse
    // a postgres_changes subscription outright; for a role with no table
    // privilege it emits an "Unauthorized" frame with EMPTY new/old records.
    // So the assertion is: every anonymous frame is such an empty error frame
    // — never an entity type, id, action, or value. (The residual is a
    // content-free timing signal; see docs/CLAUDE_C4_REALTIME.md.)
    await sleep(1_500);
    for (const frame of anon.received) {
      assert(
        Object.keys(frame.new ?? {}).length === 0 &&
          Object.keys(frame.old ?? {}).length === 0 &&
          Array.isArray(frame.errors) &&
          frame.errors.some((message) => /unauthorized/iu.test(String(message))),
        "An anonymous subscriber received realtime pointer data.",
      );
    }

    await sessionA.removeChannel(staff.channel);
    await anonymous.removeChannel(anon.channel);

    console.log(
      JSON.stringify({
        ok: true,
        pointersReceived: staff.received.length,
        checkpoints: [
          "two synthetic AAL2 admin sessions created",
          "staff session subscribed to realtime_events",
          "client created by B delivered to A as a pointer",
          "project status change by B delivered to A as a pointer",
          "payload carries only id/entity_type/entity_id/action/created_at",
          "payload never carries client or project values",
          "anonymous subscriber received only empty Unauthorized frames (no pointer data)",
        ],
      }),
    );
  } finally {
    const failures = [];
    const steps = [
      async () => {
        if (projectId) {
          await admin
            .from("operational_project_status_history")
            .delete()
            .eq("project_id", projectId);
          await admin
            .from("operational_project_phase_history")
            .delete()
            .eq("project_id", projectId);
          await admin.from("operational_projects").delete().eq("id", projectId);
        }
      },
      async () => {
        if (clientId) {
          await admin.from("client_notes").delete().eq("client_id", clientId);
          await admin.from("clients").delete().eq("id", clientId);
        }
      },
      async () => {
        await admin
          .from("audit_logs")
          .delete()
          .in("entity_id", [clientId, projectId].filter(Boolean));
        await admin
          .from("realtime_events")
          .delete()
          .in("entity_id", [clientId, projectId].filter(Boolean));
      },
      () => removeUserByEmail(emailA),
      () => removeUserByEmail(emailB),
    ];
    for (const step of steps) {
      try {
        await step();
      } catch {
        failures.push("cleanup step failed");
      }
    }
    if (failures.length > 0) {
      console.error("One or more synthetic C4 realtime cleanup steps failed.");
      process.exitCode = 1;
    }
  }
}

try {
  await verifyRealtime();
} catch (error) {
  console.error(error instanceof Error ? error.message : "C4 realtime verification failed.");
  process.exitCode = 1;
}
process.exit();
