// D1.5 — seeds a realistic SYNTHETIC local workspace through the real C4–C8
// RPCs (never direct inserts) so the admin, documents and screenshots can be
// designed against actual records. Local only; every record is marked
// SYNTHETIC. Run after `node scripts/d1-seed-actors.mjs`.
import crypto from "node:crypto";

import { client, createActor, credentials, rpc, signInAndActivate } from "./c4-local.mjs";
import { assert } from "./s4-local.mjs";

const runId = crypto.randomBytes(2).toString("hex");
const email = `synthetic-d15-seed-${runId}@example.test`;
const password = ["SYNTHETIC", "D15", "Local", "Only", "2026!"].join("-");
const today = new Date().toISOString().slice(0, 10);
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

async function main() {
  // Each run creates its own actor: seeded records reference their creator,
  // so an earlier actor can never be deleted and its factor cannot be reused.
  await createActor(email, password, "super_admin");
  const a = await signInAndActivate(email, password);
  const service = client(credentials.secretKey);

  // Clients + projects
  const clients = [];
  for (const [name, company, tier] of [
    ["SYNTHETIC Amina Uwase", "SYNTHETIC Uwase Holdings", "vip"],
    ["SYNTHETIC Jean Bosco Habimana", null, "standard"],
    ["SYNTHETIC Green Ridge Cooperative", "SYNTHETIC Green Ridge Co-op", "standard"],
  ]) {
    const created = await rpc(a, "create_admin_client", {
      full_name: name,
      target_email: `${name.toLowerCase().replace(/[^a-z]+/gu, "-")}-${runId}@example.test`,
      target_phone: "+250780000900",
      ...(company ? { target_company: company, target_address: "SYNTHETIC KG 7 Ave, Kigali" } : {}),
      target_tier: tier,
    });
    assert(created?.ok, `Client ${name} was not created.`);
    clients.push(created.id);
  }
  const projects = [];
  for (const [index, title] of [
    "SYNTHETIC Ridge Residence — hillside house",
    "SYNTHETIC Courtyard House — private residence",
    "SYNTHETIC Co-op Pavilion — community hall",
  ].entries()) {
    const created = await rpc(a, "create_admin_operational_project", {
      target_client_id: clients[index],
      title,
    });
    assert(created?.ok, `Project ${title} was not created.`);
    projects.push(created.id);
  }

  // Invoices: draft (3 lines), issued, partially paid, void, 60-line multipage.
  const line = (description, quantity, unit_label, unit_price) => ({
    description,
    quantity: String(quantity),
    unit_label,
    unit_price: String(unit_price),
  });
  const draft = await rpc(a, "create_admin_invoice", {
    target_client_id: clients[0],
    target_project_id: projects[0],
    target_currency: "RWF",
    target_tax_rate: 18,
    lines: [
      line("Concept design and site reading — Stage 1", 1, "stage", 2400000),
      line("Developed drawings for pricing and permit", 1, "stage", 3600000),
      line("Site supervision — inspection visits", 6, "visit", 150000),
    ],
  });
  assert(draft?.ok, "Draft invoice failed.");

  const issue = async (invoice, due) =>
    rpc(a, "issue_admin_invoice", {
      target_id: invoice.id,
      expected_version: invoice.version,
      target_issue_date: today,
      target_due_date: due,
    });

  const issued = await rpc(a, "create_admin_invoice", {
    target_client_id: clients[1],
    target_project_id: projects[1],
    target_currency: "RWF",
    target_tax_rate: 18,
    lines: [
      line("Setting out and substructure — measured stage", 1, "stage", 8500000),
      line("Board-marked concrete — ground floor slab", 120, "m²", 42000),
      line("Hardwood screen — supply and fix", 18, "m²", 165000),
    ],
  });
  assert(issued?.ok, "Issued invoice draft failed.");
  const issuedResult = await issue(issued, daysFromNow(14));
  assert(issuedResult?.ok, "Issue failed.");

  const partial = await rpc(a, "create_admin_invoice", {
    target_client_id: clients[0],
    target_project_id: projects[0],
    target_currency: "USD",
    target_tax_rate: 0,
    lines: [
      line("Consultation — feasibility and budget band", 2, "session", 450),
      line("Survey coordination and site record", 1, "report", 1200),
    ],
  });
  assert(partial?.ok, "Partial invoice draft failed.");
  const partialIssued = await issue(partial, daysFromNow(3));
  assert(partialIssued?.ok, `Partial issue failed: ${JSON.stringify(partialIssued)}`);
  const payment = await rpc(a, "record_invoice_payment", {
    target_invoice_id: partial.id,
    amount: 900,
    target_payment_date: today,
    target_method: "bank_transfer",
    target_note: "SYNTHETIC first instalment",
  });
  assert(payment?.ok, "Payment failed.");

  const toVoid = await rpc(a, "create_admin_invoice", {
    target_client_id: clients[2],
    target_project_id: projects[2],
    target_currency: "RWF",
    target_tax_rate: 18,
    lines: [line("Pavilion roof structure — steel", 1, "lot", 5200000)],
  });
  assert(toVoid?.ok, "Void invoice draft failed.");
  const voidIssued = await issue(toVoid, daysFromNow(7));
  assert(voidIssued?.ok, "Void issue failed.");
  const detail = await rpc(a, "admin_get_invoice", { target_id: toVoid.id });
  const voided = await rpc(a, "void_admin_invoice", {
    target_id: toVoid.id,
    expected_version: detail.invoice.version,
    reason: "SYNTHETIC issued against the wrong stage",
  });
  assert(voided?.ok, "Void failed.");

  const longLines = Array.from({ length: 60 }, (_, index) =>
    line(
      index % 4 === 0
        ? `Item ${index + 1} — long description that wraps across the column to prove multi-page line rendering keeps its hierarchy`
        : `Item ${index + 1} — ${["formwork", "reinforcement", "blockwork", "plaster"][index % 4]}`,
      (index % 7) + 1,
      ["m²", "m³", "bag", "day", "lot", "m", "unit"][index % 7],
      (index + 1) * 12500,
    ),
  );
  const multipage = await rpc(a, "create_admin_invoice", {
    target_client_id: clients[2],
    target_project_id: projects[2],
    target_currency: "RWF",
    target_tax_rate: 18,
    lines: longLines,
  });
  assert(multipage?.ok, "Multipage draft failed.");
  const multipageIssued = await issue(multipage, daysFromNow(30));
  assert(multipageIssued?.ok, "Multipage issue failed.");

  // Trade partners, material, requirement, purchase order.
  const supplier = await rpc(a, "create_admin_trade_partner", {
    target_display_name: "SYNTHETIC Kigali Cement Supplies",
    target_capabilities: ["supplier"],
    target_company: "SYNTHETIC Kigali Cement Ltd",
    target_email: `synthetic-kcs-${runId}@example.test`,
    target_phone: "+250780000702",
    target_address: "SYNTHETIC Industrial Zone, Kigali",
  });
  assert(supplier?.ok, "Supplier failed.");
  const contractor = await rpc(a, "create_admin_trade_partner", {
    target_display_name: "SYNTHETIC Mugisha Masonry",
    target_capabilities: ["contractor"],
    target_specializations: ["Masonry"],
    target_availability: "available",
  });
  assert(contractor?.ok, "Contractor failed.");
  const material = await rpc(a, "create_admin_material", {
    target_name: "SYNTHETIC Cement 42.5N",
    target_unit: "bag",
    target_code: `SYN-CEM-${runId}`,
    target_category: "Cement & Aggregates",
    target_supplier_id: supplier.id,
  });
  assert(material?.ok, "Material failed.");
  await rpc(a, "create_material_requirement", {
    target_project_id: projects[0],
    target_item_name: "SYNTHETIC cement for slab",
    target_quantity: 220,
    target_unit: "bag",
    target_material_id: material.id,
  });
  const order = await rpc(a, "create_admin_purchase_order", {
    target_project_id: projects[0],
    target_supplier_id: supplier.id,
    target_currency: "RWF",
    target_tax_rate: 18,
    lines: [
      line("Cement 42.5N — 50 kg bags", 220, "bag", 12500),
      line("River sand — delivered", 18, "m³", 38000),
      line("Aggregate 20 mm — delivered", 12, "m³", 45000),
    ],
  });
  assert(order?.ok, "Purchase order failed.");
  const orderIssued = await rpc(a, "issue_admin_purchase_order", {
    target_id: order.id,
    expected_version: order.version,
    target_issue_date: today,
  });
  assert(orderIssued?.ok, "PO issue failed.");
  await rpc(a, "create_contractor_assignment", {
    target_project_id: projects[0],
    target_partner_id: contractor.id,
    target_scope: "SYNTHETIC stone retaining wall and blockwork",
  });

  // Two public leads through the intake facade.
  for (const [n, serviceKey, summary] of [
    [1, "design", "Two-storey family house on a sloping plot"],
    [2, "supervision", "Independent checks on an ongoing build"],
  ]) {
    const result = await rpc(service, "intake_submit_lead", {
      payload: {
        lead_type: "project",
        source_channel: "start_a_project",
        idempotency_key: crypto.randomBytes(16).toString("hex"),
        full_name: `SYNTHETIC Visitor ${n}`,
        email: `synthetic-d15-visitor-${n}@example.test`,
        phone: "+250 780 000 11" + n,
        summary,
        message: `SYNTHETIC enquiry ${n}: ${summary}. Land is available; drawings are not.`,
        service_key: serviceKey,
        preferred_contact: "whatsapp",
        consent_revision: 1,
        details: {
          need_key: serviceKey,
          project_type: "residential",
          floors: "2",
          scale_band: "medium",
          current_stage: "idea",
          budget_preference: "not_sure",
        },
      },
    });
    assert(result?.ok, `Lead ${n} failed.`);
  }
  void sha256;

  console.log(
    JSON.stringify({
      ok: true,
      draftInvoice: draft.id,
      issuedInvoice: issued.id,
      partialInvoice: partial.id,
      voidInvoice: toVoid.id,
      multipageInvoice: multipage.id,
      purchaseOrder: order.id,
      project: projects[0],
    }),
  );
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
