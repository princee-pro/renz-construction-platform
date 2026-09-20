import {
  admin,
  client,
  createActor,
  credentials,
  removeUserByEmail,
  rpc,
  signInAndActivate,
} from "./c4-local.mjs";
import { assert, runLocalSql } from "./s4-local.mjs";

// C5 finance: RPC-level synthetic lifecycle plus the three race proofs the
// browser cannot express deterministically — concurrent numbering (§95),
// double-issue of one draft (§95), and the payment race (§96) — and the
// token-scoped share path (§56–59) exercised through the anonymous key.

const emailA = "c5-synthetic-a@example.test";
const emailB = "c5-synthetic-b@example.test";
const password = ["Local", "C5", "Finance", "Passphrase", "2026", "!"].join("-");

function reasons(result) {
  return Array.isArray(result?.reasons) ? result.reasons : [];
}
function hasReason(result, code) {
  return reasons(result).some((r) => r?.code === code);
}

async function verifyC5() {
  const created = { clients: [], projects: [], invoices: [] };
  try {
    await createActor(emailA, password, "super_admin");
    await createActor(emailB, password, "admin");
    const a = await signInAndActivate(emailA, password);
    const b = await signInAndActivate(emailB, password);
    const anonymous = client(credentials.anonymousKey);

    // Fixtures: two clients, a project each.
    const clientA = await rpc(a, "create_admin_client", {
      full_name: "SYNTHETIC C5 CLIENT A",
      target_email: "synthetic-c5-a@example.test",
      target_phone: "+250780000601",
      target_company: "SYNTHETIC C5 A LTD",
      target_address: "SYNTHETIC C5 STREET",
      target_tier: "vip",
    });
    const clientB = await rpc(a, "create_admin_client", {
      full_name: "SYNTHETIC C5 CLIENT B",
      target_email: "synthetic-c5-b@example.test",
    });
    assert(clientA?.ok && clientB?.ok, "Fixture clients were not created.");
    created.clients.push(clientA.id, clientB.id);
    const projectA = await rpc(a, "create_admin_operational_project", {
      target_client_id: clientA.id,
      title: "SYNTHETIC C5 PROJECT A",
    });
    const projectB = await rpc(a, "create_admin_operational_project", {
      target_client_id: clientB.id,
      title: "SYNTHETIC C5 PROJECT B",
    });
    assert(projectA?.ok && projectB?.ok, "Fixture projects were not created.");
    created.projects.push(projectA.id, projectB.id);

    // §94 mismatch: client A + project B is rejected server-side.
    const mismatch = await rpc(a, "create_admin_invoice", {
      target_client_id: clientA.id,
      target_project_id: projectB.id,
      target_currency: "RWF",
      target_tax_rate: 0,
    });
    assert(hasReason(mismatch, "invalid_relationship"), "Client/project mismatch was accepted.");

    // §93 draft: 2 × 100000 service + 3 × 50000 day, synthetic 10% test tax.
    const lines = [
      {
        description: "Design coordination",
        quantity: "2",
        unit_label: "service",
        unit_price: "100000",
      },
      { description: "Site supervision", quantity: "3", unit_label: "day", unit_price: "50000" },
    ];
    const draft = await rpc(a, "create_admin_invoice", {
      target_client_id: clientA.id,
      target_project_id: projectA.id,
      target_currency: "rwf",
      target_tax_rate: 10,
      lines,
    });
    assert(draft?.ok === true, "Draft creation failed.");
    created.invoices.push(draft.id);
    let detail = await rpc(a, "admin_get_invoice", { target_id: draft.id });
    assert(detail.invoice.invoice_number === null, "A draft received an invoice number.");
    assert(Number(detail.financials.subtotal) === 350000, "Subtotal is not 350000.");
    assert(Number(detail.financials.tax_amount) === 35000, "Tax is not 35000.");
    assert(Number(detail.financials.total) === 385000, "Total is not 385000.");

    // Draft concurrency (§66/§100): B's stale save is rejected, A's edit survives.
    const editA = await rpc(a, "update_admin_invoice", {
      target_id: draft.id,
      expected_version: 1,
      target_client_id: clientA.id,
      target_project_id: projectA.id,
      target_currency: "RWF",
      target_tax_rate: 10,
      target_reference: "SYNTHETIC-A",
      lines,
    });
    assert(editA?.ok === true, "A's draft edit failed.");
    const editB = await rpc(b, "update_admin_invoice", {
      target_id: draft.id,
      expected_version: 1,
      target_client_id: clientA.id,
      target_project_id: projectA.id,
      target_currency: "RWF",
      target_tax_rate: 10,
      target_reference: "SYNTHETIC-B-STALE",
      lines,
    });
    assert(hasReason(editB, "version_conflict"), "A stale draft save was accepted.");
    detail = await rpc(a, "admin_get_invoice", { target_id: draft.id });
    assert(detail.invoice.reference === "SYNTHETIC-A", "The stale save overwrote A's edit.");

    // §95 numbering race: two drafts issued concurrently get distinct numbers.
    const raceDrafts = await Promise.all(
      [1, 2].map((n) =>
        rpc(a, "create_admin_invoice", {
          target_client_id: clientB.id,
          target_currency: "USD",
          target_tax_rate: 0,
          lines: [{ description: `SYNTHETIC race ${n}`, quantity: "1", unit_price: "10" }],
        }),
      ),
    );
    created.invoices.push(...raceDrafts.map((r) => r.id));
    const today = new Date().toISOString().slice(0, 10);
    const raceIssued = await Promise.all(
      raceDrafts.map((r) =>
        rpc(a, "issue_admin_invoice", {
          target_id: r.id,
          expected_version: r.version,
          target_issue_date: today,
          target_due_date: today,
        }),
      ),
    );
    assert(
      raceIssued.every((r) => r?.ok === true),
      "Concurrent issue did not succeed for both drafts.",
    );
    const numbers = new Set(raceIssued.map((r) => r.invoice_number));
    assert(numbers.size === 2, "Concurrent issue produced a duplicate invoice number.");
    for (const number of numbers) {
      assert(/^RENZ-\d{4}-\d{6}$/u.test(number), `Invoice number ${number} is malformed.`);
    }

    // §95 double issue: two actors issue the SAME draft at once; exactly one succeeds.
    detail = await rpc(a, "admin_get_invoice", { target_id: draft.id });
    const dueDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    const doubleIssue = await Promise.all(
      [a, b].map((session) =>
        rpc(session, "issue_admin_invoice", {
          target_id: draft.id,
          expected_version: detail.invoice.version,
          target_issue_date: today,
          target_due_date: dueDate,
        }),
      ),
    );
    const successes = doubleIssue.filter((r) => r?.ok === true);
    assert(successes.length === 1, `Double issue produced ${successes.length} successes.`);
    const invoiceNumber = successes[0].invoice_number;
    detail = await rpc(a, "admin_get_invoice", { target_id: draft.id });
    assert(detail.invoice.lifecycle_state === "issued", "The draft is not issued.");
    assert(detail.invoice.invoice_number === invoiceNumber, "Issued number mismatch.");

    // Snapshots + immutability.
    assert(
      detail.document.client.full_name === "SYNTHETIC C5 CLIENT A",
      "Client snapshot missing.",
    );
    assert(detail.document.project.title === "SYNTHETIC C5 PROJECT A", "Project snapshot missing.");
    assert(
      detail.document.issuer.name === "RENZ Construction Services Ltd",
      "Issuer snapshot missing.",
    );
    const lockedEdit = await rpc(a, "update_admin_invoice", {
      target_id: draft.id,
      expected_version: detail.invoice.version,
      target_client_id: clientA.id,
      target_currency: "USD",
      target_tax_rate: 0,
      lines,
    });
    assert(hasReason(lockedEdit, "invalid_state"), "An issued invoice accepted an edit.");
    const directEdit = await admin.from("invoices").update({ tax_rate: 0 }).eq("id", draft.id);
    assert(directEdit.error, "A direct update of an issued invoice was not blocked by trigger.");

    // Share link: anonymous token read works; raw table/API reads stay denied.
    const share = await rpc(a, "create_invoice_share_link", { target_id: draft.id });
    assert(share?.ok === true && typeof share.token === "string", "Share link was not generated.");
    const shared = await anonymous.rpc("public_invoice_by_share_token", { raw_token: share.token });
    assert(
      !shared.error && shared.data?.invoice_number === invoiceNumber,
      "Anonymous token read failed.",
    );
    const sharedText = JSON.stringify(shared.data);
    for (const forbidden of ["note", "recorded_by", "created_by", "audit", "version"]) {
      assert(!sharedText.includes(`"${forbidden}"`), `Shared document leaked "${forbidden}".`);
    }
    const wrong = await anonymous.rpc("public_invoice_by_share_token", {
      raw_token: share.token.slice(0, -1) + (share.token.endsWith("a") ? "b" : "a"),
    });
    assert(wrong.data === null, "A near-miss token resolved an invoice.");
    for (const table of [
      "invoices",
      "invoice_line_items",
      "invoice_payments",
      "invoice_share_links",
    ]) {
      const probe = await anonymous.from(table).select("id").limit(1);
      assert(probe.error || !probe.data?.length, `Anonymous caller could read ${table}.`);
    }
    const anonRpc = await anonymous.rpc("admin_get_invoice", { target_id: draft.id });
    assert(anonRpc.error || anonRpc.data === null, "Anonymous caller executed a staff facade.");

    // Payments: 100000 partial by A, then the §96 race — two 285000 attempts.
    const pay1 = await rpc(a, "record_invoice_payment", {
      target_invoice_id: draft.id,
      amount: 100000,
      target_payment_date: today,
      target_method: "bank_transfer",
      target_note: "SYNTHETIC private note",
    });
    assert(pay1?.ok === true && Number(pay1.balance_due) === 285000, "First payment failed.");
    const race = await Promise.all(
      [a, b].map((session) =>
        rpc(session, "record_invoice_payment", {
          target_invoice_id: draft.id,
          amount: 285000,
          target_payment_date: today,
          target_method: "mobile_money",
        }),
      ),
    );
    const paid = race.filter((r) => r?.ok === true);
    assert(paid.length === 1, `Payment race accepted ${paid.length} payments.`);
    assert(
      race.some((r) => hasReason(r, "exceeds_balance")),
      "The losing payment was not rejected as exceeds_balance.",
    );
    detail = await rpc(a, "admin_get_invoice", { target_id: draft.id });
    assert(detail.financials.payment_state === "paid", "Invoice is not paid after the race.");
    assert(Number(detail.financials.balance_due) === 0, "Balance is not zero after the race.");
    assert(Number(detail.financials.paid_amount) === 385000, "Effective paid total is wrong.");

    // Reverse the winning payment → partially paid; the shared document reflects it.
    const winner = detail.payments.find((p) => Number(p.amount) === 285000 && !p.reversed_at);
    const reversed = await rpc(a, "reverse_invoice_payment", {
      target_payment_id: winner.id,
      reason: "SYNTHETIC duplicate entry",
    });
    assert(reversed?.ok === true, "Reversal failed.");
    detail = await rpc(a, "admin_get_invoice", { target_id: draft.id });
    assert(
      detail.financials.payment_state === "partially_paid",
      "State did not return to partially_paid.",
    );
    assert(Number(detail.financials.balance_due) === 285000, "Balance did not return to 285000.");
    const sharedAfter = await anonymous.rpc("public_invoice_by_share_token", {
      raw_token: share.token,
    });
    assert(Number(sharedAfter.data?.balance_due) === 285000, "Shared document balance is stale.");

    // Void requires payments reversed first; then void; the token shows VOID.
    const voidBlocked = await rpc(a, "void_admin_invoice", {
      target_id: draft.id,
      expected_version: detail.invoice.version,
      reason: "SYNTHETIC",
    });
    assert(!voidBlocked.ok, "Void succeeded with an effective payment outstanding.");
    const first = detail.payments.find((p) => Number(p.amount) === 100000 && !p.reversed_at);
    await rpc(a, "reverse_invoice_payment", {
      target_payment_id: first.id,
      reason: "SYNTHETIC cleanup",
    });
    detail = await rpc(a, "admin_get_invoice", { target_id: draft.id });
    const voidByAdmin = await rpc(b, "void_admin_invoice", {
      target_id: draft.id,
      expected_version: detail.invoice.version,
      reason: "SYNTHETIC",
    });
    assert(
      hasReason(voidByAdmin, "not_authorized"),
      "An admin without finance.invoices.void voided an invoice.",
    );
    const voided = await rpc(a, "void_admin_invoice", {
      target_id: draft.id,
      expected_version: detail.invoice.version,
      reason: "SYNTHETIC issued in error",
    });
    assert(voided?.ok === true, "Void failed.");
    const sharedVoid = await anonymous.rpc("public_invoice_by_share_token", {
      raw_token: share.token,
    });
    assert(sharedVoid.data?.lifecycle_state === "void", "The shared document does not show VOID.");
    const revoked = await rpc(a, "revoke_invoice_share_link", { target_id: draft.id });
    assert(revoked?.ok === true, "Revoke failed.");
    const sharedRevoked = await anonymous.rpc("public_invoice_by_share_token", {
      raw_token: share.token,
    });
    assert(sharedRevoked.data === null, "A revoked token still resolved.");

    // Audit trail, redacted.
    const audit = await admin
      .from("audit_logs")
      .select("action, metadata")
      .eq("entity_type", "invoice")
      .eq("entity_id", draft.id);
    const actions = new Set(audit.data.map((row) => row.action));
    for (const expected of [
      "invoice.create",
      "invoice.update",
      "invoice.issue",
      "invoice.share_create",
      "invoice.payment_record",
      "invoice.paid",
      "invoice.payment_reverse",
      "invoice.void",
      "invoice.share_revoke",
    ]) {
      assert(actions.has(expected), `Audit is missing ${expected}.`);
    }
    const auditText = JSON.stringify(audit.data);
    assert(!auditText.includes(share.token), "Audit stored the raw share token.");
    assert(!auditText.includes("SYNTHETIC private note"), "Audit stored a private payment note.");
    assert(!auditText.includes("SYNTHETIC C5 STREET"), "Audit stored the billing address.");

    console.log(
      JSON.stringify({
        ok: true,
        invoiceNumber,
        checkpoints: [
          "client/project mismatch rejected server-side",
          "draft totals 350000 / 35000 / 385000 with no number",
          "stale draft save rejected, accepted edit preserved",
          "two drafts issued concurrently received distinct numbers",
          "double issue of one draft: exactly one success",
          "billing/project/issuer snapshots frozen; issued invoice immutable via facade and trigger",
          "anonymous token read returns that invoice only; tables and staff facades denied",
          "payment race: exactly one of two 285000 payments accepted",
          "reversal restores partially_paid / 285000, visible on the shared document",
          "void blocked with payments, denied without permission, then succeeds; token shows VOID; revoke ends access",
          "audit records every event without token, note, or address",
        ],
      }),
    );
  } finally {
    const failures = [];
    const quoted = (ids) => ids.map((id) => `'${id}'`).join(", ");
    const steps = [
      async () => {
        // Issued invoices and payments are immutable by trigger (by design);
        // synthetic rows are removed with triggers suppressed, as postgres.
        if (created.invoices.length) {
          const ids = quoted(created.invoices);
          runLocalSql(
            `set session_replication_role = replica;
             delete from public.invoice_share_links where invoice_id in (${ids});
             delete from public.invoice_payments where invoice_id in (${ids});
             delete from public.invoice_line_items where invoice_id in (${ids});
             delete from public.invoices where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C5 synthetic invoice cleanup",
          );
        }
      },
      async () => {
        if (created.projects.length) {
          const ids = quoted(created.projects);
          runLocalSql(
            `delete from public.operational_project_status_history where project_id in (${ids});
             delete from public.operational_project_phase_history where project_id in (${ids});
             delete from public.operational_projects where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C5 synthetic project cleanup",
          );
        }
      },
      async () => {
        if (created.clients.length) {
          const ids = quoted(created.clients);
          runLocalSql(
            `delete from public.clients where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C5 synthetic client cleanup",
          );
        }
      },
      () => removeUserByEmail(emailB),
      async () => {
        // The synthetic super_admin may be the only active super admin in a
        // freshly reset local database; the S3 last-super-admin guard would
        // (correctly) refuse the API delete, so remove it as postgres with
        // triggers suppressed.
        runLocalSql(
          `alter table public.profiles disable trigger profiles_prevent_last_super_admin_delete;
           delete from auth.users where email = '${emailA}';
           alter table public.profiles enable trigger profiles_prevent_last_super_admin_delete;`,
          "C5 synthetic super admin cleanup",
        );
      },
    ];
    for (const step of steps) {
      try {
        await step();
      } catch (error) {
        failures.push(error instanceof Error ? error.message : "cleanup step failed");
      }
    }
    if (failures.length > 0) {
      console.error(`Synthetic C5 cleanup failed: ${failures.join("; ")}`);
      process.exitCode = 1;
    }
  }
}

try {
  await verifyC5();
} catch (error) {
  console.error(error instanceof Error ? error.message : "C5 verification failed.");
  process.exitCode = 1;
}
process.exit();
