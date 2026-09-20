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

// C6 delivery: RPC-level synthetic contractor and procurement lifecycles plus
// the race proofs the browser cannot express deterministically — the
// contractor payment race, concurrent PO numbering, double-issue of one
// draft, the goods-receipt race — and the token-scoped supplier share path
// exercised through the anonymous key. Every row is obviously synthetic and
// removed in cleanup.

const emailA = "c6-synthetic-a@example.test";
const emailB = "c6-synthetic-b@example.test";
const emailAal1 = "c6-synthetic-aal1@example.test";
const password = ["Local", "C6", "Delivery", "Passphrase", "2026", "!"].join("-");

function reasons(result) {
  return Array.isArray(result?.reasons) ? result.reasons : [];
}
function hasReason(result, code) {
  return reasons(result).some((r) => r?.code === code);
}
const today = new Date().toISOString().slice(0, 10);
const plusDays = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function verifyC6() {
  const created = {
    clients: [],
    projects: [],
    partners: [],
    assignments: [],
    materials: [],
    requirements: [],
    orders: [],
  };
  let removedPermission = null;
  try {
    await createActor(emailA, password, "super_admin");
    await createActor(emailB, password, "admin");
    await createActor(emailAal1, password, "admin");
    const a = await signInAndActivate(emailA, password);
    const b = await signInAndActivate(emailB, password);
    const anonymous = client(credentials.anonymousKey);
    const aal1 = client(credentials.publishableKey);
    const aal1SignIn = await aal1.auth.signInWithPassword({ email: emailAal1, password });
    assert(!aal1SignIn.error, "AAL1 synthetic sign-in failed.");

    // ------------------------------------------------------------------
    // Fixtures: two clients, a project each.
    // ------------------------------------------------------------------
    const clientA = await rpc(a, "create_admin_client", {
      full_name: "SYNTHETIC C6 CLIENT A",
      target_email: "synthetic-c6-a@example.test",
    });
    const clientB = await rpc(a, "create_admin_client", {
      full_name: "SYNTHETIC C6 CLIENT B",
      target_email: "synthetic-c6-b@example.test",
    });
    assert(clientA?.ok && clientB?.ok, "Fixture clients were not created.");
    created.clients.push(clientA.id, clientB.id);
    const projectA = await rpc(a, "create_admin_operational_project", {
      target_client_id: clientA.id,
      title: "SYNTHETIC C6 PROJECT A",
    });
    const projectB = await rpc(a, "create_admin_operational_project", {
      target_client_id: clientB.id,
      title: "SYNTHETIC C6 PROJECT B",
    });
    assert(projectA?.ok && projectB?.ok, "Fixture projects were not created.");
    created.projects.push(projectA.id, projectB.id);

    // ------------------------------------------------------------------
    // Trade partners: contractor-only, supplier-only, and duplicates.
    // ------------------------------------------------------------------
    const contractor = await rpc(a, "create_admin_trade_partner", {
      target_display_name: "SYNTHETIC C6 MASON",
      target_capabilities: ["contractor"],
      target_email: "synthetic-c6-mason@example.test",
      target_phone: "+250780000701",
      target_address: "SYNTHETIC C6 STREET 1",
      target_notes: "SYNTHETIC private partner note",
      target_specializations: ["Masonry"],
      target_availability: "available",
    });
    assert(contractor?.ok === true, "Contractor partner was not created.");
    created.partners.push(contractor.id);
    const supplier = await rpc(a, "create_admin_trade_partner", {
      target_display_name: "SYNTHETIC C6 CEMENT SUPPLIES",
      target_capabilities: ["supplier"],
      target_company: "SYNTHETIC C6 CEMENT LTD",
      target_email: "synthetic-c6-cement@example.test",
      target_phone: "+250780000702",
      target_address: "SYNTHETIC C6 STREET 2",
    });
    assert(supplier?.ok === true, "Supplier partner was not created.");
    created.partners.push(supplier.id);
    const duplicates = await rpc(a, "find_possible_duplicate_trade_partners", {
      target_display_name: "synthetic c6 mason",
      target_email: "SYNTHETIC-C6-MASON@example.test",
    });
    assert(
      Array.isArray(duplicates) && duplicates.some((d) => d.id === contractor.id),
      "Duplicate awareness did not surface the existing contractor.",
    );
    const invalidCapability = await rpc(a, "create_admin_trade_partner", {
      target_display_name: "SYNTHETIC C6 INVALID",
      target_capabilities: ["plumber"],
    });
    assert(!invalidCapability.ok, "An unknown capability was accepted.");

    // ------------------------------------------------------------------
    // Capability rules: supplier-only cannot be assigned; contractor-only
    // cannot receive a purchase order until the supplier capability is added.
    // ------------------------------------------------------------------
    const supplierAsContractor = await rpc(a, "create_contractor_assignment", {
      target_project_id: projectA.id,
      target_partner_id: supplier.id,
      target_scope: "SYNTHETIC should fail",
    });
    assert(
      hasReason(supplierAsContractor, "capability_missing"),
      "A supplier-only partner was assigned as a contractor.",
    );
    const contractorAsSupplier = await rpc(a, "create_admin_purchase_order", {
      target_project_id: projectA.id,
      target_supplier_id: contractor.id,
      target_currency: "RWF",
      target_tax_rate: 0,
    });
    assert(
      hasReason(contractorAsSupplier, "capability_missing"),
      "A contractor-only partner received a purchase order.",
    );
    let contractorDetail = await rpc(a, "admin_get_trade_partner", { target_id: contractor.id });
    const capabilityAdded = await rpc(a, "add_trade_partner_capability", {
      target_id: contractor.id,
      expected_version: contractorDetail.partner.version,
      capability: "supplier",
    });
    assert(capabilityAdded?.ok === true, "Adding the supplier capability failed.");
    contractorDetail = await rpc(a, "admin_get_trade_partner", { target_id: contractor.id });
    assert(
      contractorDetail.partner.capabilities.includes("supplier") &&
        contractorDetail.partner.capabilities.includes("contractor"),
      "The partner did not become contractor + supplier on one record.",
    );
    const partnerCount = await admin
      .from("trade_partners")
      .select("id", { count: "exact", head: true })
      .eq("display_name", "SYNTHETIC C6 MASON");
    assert(partnerCount.count === 1, "Adding a capability created a duplicate record.");
    const nowSupplier = await rpc(a, "create_admin_purchase_order", {
      target_project_id: projectA.id,
      target_supplier_id: contractor.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: [
        { description: "SYNTHETIC sand", quantity: "1", unit_label: "tonne", unit_price: "1" },
      ],
    });
    assert(nowSupplier?.ok === true, "A contractor + supplier partner could not receive a PO.");
    created.orders.push(nowSupplier.id);

    // ------------------------------------------------------------------
    // Contractor flow (§137): 950000 RWF agreed, 350000 + 600000 paid.
    // ------------------------------------------------------------------
    const assignment = await rpc(a, "create_contractor_assignment", {
      target_project_id: projectA.id,
      target_partner_id: contractor.id,
      target_scope: "SYNTHETIC masonry works",
      target_specialization: "Masonry",
      target_status: "planned",
      target_start_date: today,
      target_end_date: plusDays(10),
      target_rate_type: "fixed_project",
      target_rate_amount: 950000,
      target_currency: "rwf",
      target_agreed_amount: 950000,
      target_payment_terms: "SYNTHETIC 50% upfront",
    });
    assert(assignment?.ok === true, "Assignment creation failed.");
    created.assignments.push(assignment.id);
    let detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    assert(detail.assignment.currency === "RWF", "Currency was not normalized to RWF.");
    assert(Number(detail.financials.agreed_amount) === 950000, "Agreed amount is not 950000.");
    assert(Number(detail.financials.remaining_amount) === 950000, "Remaining is not 950000.");
    assert(detail.financials.payment_state === "unpaid", "New assignment is not unpaid.");

    // Stale edit by B is rejected; A's accepted edit survives.
    const editA = await rpc(a, "update_contractor_assignment", {
      target_id: assignment.id,
      expected_version: 1,
      target_scope: "SYNTHETIC masonry works — A",
      target_rate_type: "fixed_project",
      target_rate_amount: 950000,
      target_currency: "RWF",
      target_agreed_amount: 950000,
    });
    assert(editA?.ok === true, "A's assignment edit failed.");
    const editB = await rpc(b, "update_contractor_assignment", {
      target_id: assignment.id,
      expected_version: 1,
      target_scope: "SYNTHETIC stale",
      target_currency: "RWF",
      target_agreed_amount: 950000,
    });
    assert(hasReason(editB, "version_conflict"), "A stale assignment save was accepted.");
    detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    assert(detail.assignment.scope === "SYNTHETIC masonry works — A", "Stale save overwrote A.");
    const activated = await rpc(a, "change_contractor_assignment_status", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      next_status: "active",
    });
    assert(activated?.ok === true, "Activation failed.");

    // Archiving the partner is blocked while the assignment is active.
    contractorDetail = await rpc(a, "admin_get_trade_partner", { target_id: contractor.id });
    const archiveBlocked = await rpc(a, "archive_admin_trade_partner", {
      target_id: contractor.id,
      expected_version: contractorDetail.partner.version,
    });
    assert(
      hasReason(archiveBlocked, "invalid_state"),
      "Archive succeeded with an active assignment.",
    );

    // Payment before activation? Already active. Record 350000 then 600000.
    const pay1 = await rpc(b, "record_contractor_payment", {
      target_assignment_id: assignment.id,
      amount: 350000,
      target_payment_date: today,
      target_method: "bank_transfer",
      target_note: "SYNTHETIC private payment note",
    });
    assert(pay1?.ok === true && Number(pay1.remaining_amount) === 600000, "First payment failed.");
    // Currency is frozen once a payment stands; the agreed amount only moves via Adjust.
    detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    const currencyChange = await rpc(a, "update_contractor_assignment", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      target_scope: detail.assignment.scope,
      target_rate_type: "fixed_project",
      target_rate_amount: 950000,
      target_currency: "USD",
      target_agreed_amount: 950000,
    });
    assert(hasReason(currencyChange, "finance_locked"), "Currency changed after a payment.");
    const overpay = await rpc(a, "record_contractor_payment", {
      target_assignment_id: assignment.id,
      amount: 600001,
      target_payment_date: today,
      target_method: "cash",
    });
    assert(hasReason(overpay, "exceeds_remaining"), "An overpayment was accepted.");
    const pay2 = await rpc(a, "record_contractor_payment", {
      target_assignment_id: assignment.id,
      amount: 600000,
      target_payment_date: today,
      target_method: "mobile_money",
    });
    assert(pay2?.ok === true && Number(pay2.remaining_amount) === 0, "Second payment failed.");
    detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    assert(detail.financials.payment_state === "paid", "Assignment is not paid.");
    assert(Number(detail.financials.paid_amount) === 950000, "Paid total is not 950000.");

    // Reversal of the 600000 → partially paid, remaining 600000; then re-pay.
    const second = detail.payments.find((p) => Number(p.amount) === 600000 && !p.reversed_at);
    const reversed = await rpc(a, "reverse_contractor_payment", {
      target_payment_id: second.id,
      reason: "SYNTHETIC duplicate entry",
    });
    assert(reversed?.ok === true, "Payment reversal failed.");
    detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    assert(
      detail.financials.payment_state === "partially_paid",
      "Not partially paid after reversal.",
    );
    assert(Number(detail.financials.remaining_amount) === 600000, "Remaining is not 600000.");
    const directPaymentEdit = await admin
      .from("contractor_payments")
      .update({ amount: 1 })
      .eq("id", second.id);
    assert(directPaymentEdit.error, "A contractor payment row was editable directly.");

    // Audited adjustment: cannot drop below paid (350000); raising to 1000000 works.
    const adjustTooLow = await rpc(a, "adjust_contractor_assignment_amount", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      new_amount: 300000,
      reason: "SYNTHETIC below paid",
    });
    assert(!adjustTooLow.ok, "Agreed amount dropped below the paid total.");
    const adjusted = await rpc(a, "adjust_contractor_assignment_amount", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      new_amount: 1000000,
      reason: "SYNTHETIC scope extension",
    });
    assert(adjusted?.ok === true, "Agreed amount adjustment failed.");
    detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    assert(Number(detail.financials.agreed_amount) === 1000000, "Adjusted amount is not 1000000.");
    assert(detail.adjustments.length === 1, "Adjustment history is missing.");
    const rePay = await rpc(a, "record_contractor_payment", {
      target_assignment_id: assignment.id,
      amount: 650000,
      target_payment_date: today,
      target_method: "bank_transfer",
    });
    assert(rePay?.ok === true && Number(rePay.remaining_amount) === 0, "Re-payment failed.");

    // Rating is refused before completion; completion then rating 5.
    detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    const rateEarly = await rpc(a, "rate_contractor_assignment", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      rating: 5,
    });
    assert(hasReason(rateEarly, "invalid_state"), "An active assignment accepted a rating.");
    const completed = await rpc(a, "change_contractor_assignment_status", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      next_status: "completed",
    });
    assert(completed?.ok === true, "Completion failed.");
    detail = await rpc(a, "admin_get_contractor_assignment", { target_id: assignment.id });
    const rateBad = await rpc(a, "rate_contractor_assignment", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      rating: 6,
    });
    assert(!rateBad.ok, "A rating of 6 was accepted.");
    const rated = await rpc(a, "rate_contractor_assignment", {
      target_id: assignment.id,
      expected_version: detail.assignment.version,
      rating: 5,
      note: "SYNTHETIC excellent finish",
    });
    assert(rated?.ok === true, "Rating failed.");
    contractorDetail = await rpc(a, "admin_get_trade_partner", { target_id: contractor.id });
    assert(
      Number(contractorDetail.partner.performance.average_rating) === 5 &&
        contractorDetail.partner.performance.rated_count === 1,
      "Derived performance average is not 5 from one rating.",
    );
    const payables = await rpc(a, "admin_list_contractor_payables", {
      partner_id_filter: contractor.id,
      page_size: 10,
    });
    assert(
      payables.items.some((row) => row.id === assignment.id && row.payment_state === "paid"),
      "Contractor Payables does not list the paid assignment.",
    );

    // ------------------------------------------------------------------
    // §138 payment race: agreed 100000, two concurrent 80000 → exactly one.
    // ------------------------------------------------------------------
    const raceAssignment = await rpc(a, "create_contractor_assignment", {
      target_project_id: projectB.id,
      target_partner_id: contractor.id,
      target_scope: "SYNTHETIC race",
      target_status: "active",
      target_currency: "RWF",
      target_agreed_amount: 100000,
    });
    assert(raceAssignment?.ok === true, "Race assignment was not created.");
    created.assignments.push(raceAssignment.id);
    const paymentRace = await Promise.all(
      [a, b].map((session) =>
        rpc(session, "record_contractor_payment", {
          target_assignment_id: raceAssignment.id,
          amount: 80000,
          target_payment_date: today,
          target_method: "cash",
        }),
      ),
    );
    const raceWinners = paymentRace.filter((r) => r?.ok === true);
    assert(raceWinners.length === 1, `Payment race accepted ${raceWinners.length} payments.`);
    assert(
      paymentRace.some((r) => hasReason(r, "exceeds_remaining")),
      "The losing payment was not rejected as exceeds_remaining.",
    );
    const raceDetail = await rpc(a, "admin_get_contractor_assignment", {
      target_id: raceAssignment.id,
    });
    assert(Number(raceDetail.financials.paid_amount) === 80000, "Race paid total is not 80000.");
    assert(
      Number(raceDetail.financials.remaining_amount) === 20000,
      "Race remaining is not 20000.",
    );
    // Cancelling with a payment standing is refused.
    const cancelBlocked = await rpc(a, "change_contractor_assignment_status", {
      target_id: raceAssignment.id,
      expected_version: raceDetail.assignment.version,
      next_status: "cancelled",
    });
    assert(hasReason(cancelBlocked, "invalid_state"), "Cancelled an assignment with payments.");

    // ------------------------------------------------------------------
    // Procurement flow (§137): 100 bags × 10000 RWF at 10% synthetic test tax.
    // ------------------------------------------------------------------
    const material = await rpc(a, "create_admin_material", {
      target_name: "SYNTHETIC C6 Cement 42.5N",
      target_unit: "bag",
      target_code: "SYN-C6-CEM",
      target_category: "Cement & Aggregates",
      target_supplier_id: supplier.id,
    });
    assert(material?.ok === true, "Material creation failed.");
    created.materials.push(material.id);
    const duplicateCode = await rpc(a, "create_admin_material", {
      target_name: "SYNTHETIC C6 Cement duplicate",
      target_unit: "bag",
      target_code: "syn-c6-cem",
    });
    assert(hasReason(duplicateCode, "duplicate_code"), "A duplicate internal code was accepted.");
    const requirement = await rpc(a, "create_material_requirement", {
      target_project_id: projectA.id,
      target_item_name: "SYNTHETIC cement",
      target_quantity: 100,
      target_unit: "bag",
      target_material_id: material.id,
      target_required_by: plusDays(7),
      target_priority: "high",
      target_note: "SYNTHETIC private requirement note",
      target_state: "approved",
    });
    assert(requirement?.ok === true, "Requirement creation failed.");
    created.requirements.push(requirement.id);
    const requirementB = await rpc(a, "create_material_requirement", {
      target_project_id: projectB.id,
      target_item_name: "SYNTHETIC other project bricks",
      target_quantity: 500,
      target_unit: "piece",
      target_state: "approved",
    });
    assert(requirementB?.ok === true, "Project B requirement creation failed.");
    created.requirements.push(requirementB.id);
    const draftRequirement = await rpc(a, "create_material_requirement", {
      target_project_id: projectA.id,
      target_item_name: "SYNTHETIC draft item",
      target_quantity: 5,
      target_unit: "piece",
      target_state: "draft",
    });
    created.requirements.push(draftRequirement.id);

    // §140 project mismatch: a line linked to project B's requirement is refused on project A.
    const mismatch = await rpc(a, "create_admin_purchase_order", {
      target_project_id: projectA.id,
      target_supplier_id: supplier.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: [
        {
          description: "SYNTHETIC bricks",
          quantity: "10",
          unit_label: "piece",
          unit_price: "100",
          material_requirement_id: requirementB.id,
        },
      ],
    });
    assert(
      hasReason(mismatch, "invalid_relationship"),
      "A cross-project requirement was accepted.",
    );
    // Draft (unapproved) requirements cannot be ordered.
    const unapproved = await rpc(a, "create_admin_purchase_order", {
      target_project_id: projectA.id,
      target_supplier_id: supplier.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: [
        {
          description: "SYNTHETIC draft item",
          quantity: "1",
          unit_label: "piece",
          unit_price: "100",
          material_requirement_id: draftRequirement.id,
        },
      ],
    });
    assert(hasReason(unapproved, "invalid_state"), "A draft requirement was ordered.");
    // Over-order without confirmation is refused; confirmed over-order is accepted.
    const overOrder = await rpc(a, "create_admin_purchase_order", {
      target_project_id: projectA.id,
      target_supplier_id: supplier.id,
      target_currency: "RWF",
      target_tax_rate: 10,
      lines: [
        {
          description: "SYNTHETIC cement",
          quantity: "150",
          unit_label: "bag",
          unit_price: "10000",
          material_requirement_id: requirement.id,
        },
      ],
    });
    assert(hasReason(overOrder, "over_order"), "An unconfirmed over-order was accepted.");

    const poLines = [
      {
        description: "SYNTHETIC cement 42.5N",
        quantity: "100",
        unit_label: "bag",
        unit_price: "10000",
        material_requirement_id: requirement.id,
        material_id: material.id,
      },
    ];
    const po = await rpc(a, "create_admin_purchase_order", {
      target_project_id: projectA.id,
      target_supplier_id: supplier.id,
      target_currency: "rwf",
      target_tax_rate: 10,
      target_expected_delivery_date: plusDays(5),
      target_notes: "SYNTHETIC deliver to site gate",
      lines: poLines,
    });
    assert(po?.ok === true, "Purchase order draft creation failed.");
    created.orders.push(po.id);
    let poDetail = await rpc(a, "admin_get_purchase_order", { target_id: po.id });
    assert(poDetail.purchase_order.purchase_order_number === null, "A draft PO received a number.");
    assert(Number(poDetail.financials.subtotal) === 1000000, "PO subtotal is not 1000000.");
    assert(Number(poDetail.financials.tax_amount) === 100000, "PO tax is not 100000.");
    assert(Number(poDetail.financials.total) === 1100000, "PO total is not 1100000.");
    let procurement = await rpc(a, "admin_project_procurement", { target_project_id: projectA.id });
    let reqRow = procurement.requirements.find((r) => r.id === requirement.id);
    assert(
      reqRow.procurement_state === "not_ordered" && Number(reqRow.ordered_quantity) === 0,
      "A draft PO counted as ordered quantity.",
    );

    // §139 numbering race + double issue.
    const raceDrafts = await Promise.all(
      [1, 2].map((n) =>
        rpc(a, "create_admin_purchase_order", {
          target_project_id: projectB.id,
          target_supplier_id: supplier.id,
          target_currency: "USD",
          target_tax_rate: 0,
          lines: [
            {
              description: `SYNTHETIC race ${n}`,
              quantity: "1",
              unit_label: "piece",
              unit_price: "10",
            },
          ],
        }),
      ),
    );
    assert(
      raceDrafts.every((r) => r?.ok === true),
      "Race drafts were not created.",
    );
    created.orders.push(...raceDrafts.map((r) => r.id));
    const raceIssued = await Promise.all(
      raceDrafts.map((r) =>
        rpc(a, "issue_admin_purchase_order", {
          target_id: r.id,
          expected_version: r.version,
          target_issue_date: today,
        }),
      ),
    );
    assert(
      raceIssued.every((r) => r?.ok === true),
      "Concurrent issue failed for a draft.",
    );
    const numbers = new Set(raceIssued.map((r) => r.purchase_order_number));
    assert(numbers.size === 2, "Concurrent issue produced a duplicate PO number.");
    for (const number of numbers) {
      assert(/^RENZ-PO-\d{4}-\d{6}$/u.test(number), `PO number ${number} is malformed.`);
    }
    poDetail = await rpc(a, "admin_get_purchase_order", { target_id: po.id });
    const doubleIssue = await Promise.all(
      [a, b].map((session) =>
        rpc(session, "issue_admin_purchase_order", {
          target_id: po.id,
          expected_version: poDetail.purchase_order.version,
          target_issue_date: today,
          target_expected_delivery_date: plusDays(5),
        }),
      ),
    );
    const issueSuccesses = doubleIssue.filter((r) => r?.ok === true);
    assert(
      issueSuccesses.length === 1,
      `Double issue produced ${issueSuccesses.length} successes.`,
    );
    const poNumber = issueSuccesses[0].purchase_order_number;
    poDetail = await rpc(a, "admin_get_purchase_order", { target_id: po.id });
    assert(poDetail.purchase_order.lifecycle_state === "issued", "The PO is not issued.");
    assert(poDetail.purchase_order.purchase_order_number === poNumber, "Issued number mismatch.");
    assert(Number(poDetail.financials.total) === 1100000, "Issued total changed.");
    assert(
      poDetail.document.supplier.display_name === "SYNTHETIC C6 CEMENT SUPPLIES" &&
        poDetail.document.project.title === "SYNTHETIC C6 PROJECT A" &&
        poDetail.document.issuer.name === "RENZ Construction Services Ltd",
      "Supplier / project / issuer snapshots are missing.",
    );
    const lockedEdit = await rpc(a, "update_admin_purchase_order", {
      target_id: po.id,
      expected_version: poDetail.purchase_order.version,
      target_supplier_id: supplier.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: poLines,
    });
    assert(hasReason(lockedEdit, "invalid_state"), "An issued PO accepted an edit.");
    const directEdit = await admin.from("purchase_orders").update({ tax_rate: 0 }).eq("id", po.id);
    assert(directEdit.error, "A direct update of an issued PO was not blocked by trigger.");
    procurement = await rpc(a, "admin_project_procurement", { target_project_id: projectA.id });
    reqRow = procurement.requirements.find((r) => r.id === requirement.id);
    assert(
      reqRow.procurement_state === "ordered" && Number(reqRow.ordered_quantity) === 100,
      "Requirement is not fully ordered after issue.",
    );

    // Supplier share link: anonymous token read works; tables and staff facades stay denied.
    const share = await rpc(a, "create_purchase_order_share_link", { target_id: po.id });
    assert(share?.ok === true && typeof share.token === "string", "Share link was not generated.");
    const shared = await anonymous.rpc("public_purchase_order_by_share_token", {
      raw_token: share.token,
    });
    assert(
      !shared.error && shared.data?.purchase_order_number === poNumber,
      "Anonymous supplier token read failed.",
    );
    const sharedText = JSON.stringify(shared.data);
    for (const forbidden of [
      "material_requirement_id",
      "private_note",
      "received_by",
      "created_by",
      "audit",
      "version",
      "SYNTHETIC private requirement note",
    ]) {
      assert(!sharedText.includes(forbidden), `Shared PO leaked "${forbidden}".`);
    }
    const wrong = await anonymous.rpc("public_purchase_order_by_share_token", {
      raw_token: share.token.slice(0, -1) + (share.token.endsWith("a") ? "b" : "a"),
    });
    assert(wrong.data === null, "A near-miss supplier token resolved a PO.");
    for (const table of [
      "trade_partners",
      "contractor_assignments",
      "contractor_payments",
      "contractor_assignment_adjustments",
      "materials",
      "project_material_requirements",
      "purchase_orders",
      "purchase_order_line_items",
      "purchase_order_receipts",
      "purchase_order_receipt_items",
      "purchase_order_share_links",
    ]) {
      const probe = await anonymous.from(table).select("id").limit(1);
      assert(probe.error || !probe.data?.length, `Anonymous caller could read ${table}.`);
    }
    for (const [facade, args] of [
      ["admin_get_purchase_order", { target_id: po.id }],
      ["admin_get_trade_partner", { target_id: contractor.id }],
      ["admin_list_materials", {}],
      ["admin_delivery_overview", {}],
    ]) {
      const anonRpc = await anonymous.rpc(facade, args);
      assert(anonRpc.error || anonRpc.data === null, `Anonymous caller executed ${facade}.`);
    }
    // AAL1 (no second factor): every C6 facade refuses.
    const aal1Read = await aal1.rpc("admin_get_purchase_order", { target_id: po.id });
    assert(aal1Read.error, "An AAL1 session read a purchase order.");
    const aal1Write = await aal1.rpc("record_goods_receipt", {
      target_po_id: po.id,
      target_received_at: today,
      items: [{ line_item_id: poDetail.lines[0].id, quantity_received: 1 }],
    });
    assert(
      aal1Write.error || hasReason(aal1Write.data, "not_authorized"),
      "An AAL1 session recorded a receipt.",
    );

    // Goods receipts: 40 then 60; over-receipt refused; requirement received.
    const lineId = poDetail.lines[0].id;
    const receipt1 = await rpc(b, "record_goods_receipt", {
      target_po_id: po.id,
      target_received_at: today,
      items: [{ line_item_id: lineId, quantity_received: 40 }],
      target_reference: "SYNTHETIC DN-1",
      target_note: "SYNTHETIC private receipt note",
    });
    assert(
      receipt1?.ok === true &&
        receipt1.delivery_state === "partially_received" &&
        Number(receipt1.remaining_quantity) === 60,
      "First receipt failed.",
    );
    const overReceipt = await rpc(a, "record_goods_receipt", {
      target_po_id: po.id,
      target_received_at: today,
      items: [{ line_item_id: lineId, quantity_received: 61 }],
    });
    assert(hasReason(overReceipt, "over_receipt"), "An over-receipt was accepted.");
    procurement = await rpc(a, "admin_project_procurement", { target_project_id: projectA.id });
    reqRow = procurement.requirements.find((r) => r.id === requirement.id);
    assert(
      reqRow.procurement_state === "partially_received" && Number(reqRow.received_quantity) === 40,
      "Requirement is not partially received after 40.",
    );
    const cancelWithReceipts = await rpc(a, "cancel_admin_purchase_order", {
      target_id: po.id,
      expected_version: receipt1.version,
      reason: "SYNTHETIC",
    });
    assert(!cancelWithReceipts.ok, "A PO with receipts was cancelled.");
    const receipt2 = await rpc(a, "record_goods_receipt", {
      target_po_id: po.id,
      target_received_at: today,
      items: [{ line_item_id: lineId, quantity_received: 60 }],
      target_reference: "SYNTHETIC DN-2",
    });
    assert(
      receipt2?.ok === true &&
        receipt2.delivery_state === "received" &&
        Number(receipt2.remaining_quantity) === 0,
      "Second receipt did not complete delivery.",
    );
    procurement = await rpc(a, "admin_project_procurement", { target_project_id: projectA.id });
    reqRow = procurement.requirements.find((r) => r.id === requirement.id);
    assert(reqRow.procurement_state === "received", "Requirement is not received after 100.");
    const orderedValue = procurement.ordered_value_by_currency.find(
      (row) => row.currency === "RWF",
    );
    assert(Number(orderedValue?.total) === 1100000, "Project ordered value (RWF) is not 1100000.");
    // Receipt reversal restores partially received; direct edits stay blocked.
    poDetail = await rpc(a, "admin_get_purchase_order", { target_id: po.id });
    const secondReceipt = poDetail.receipts.find((r) => r.delivery_reference === "SYNTHETIC DN-2");
    const receiptReversed = await rpc(a, "reverse_goods_receipt", {
      target_receipt_id: secondReceipt.id,
      reason: "SYNTHETIC counted twice",
    });
    assert(receiptReversed?.ok === true, "Receipt reversal failed.");
    poDetail = await rpc(a, "admin_get_purchase_order", { target_id: po.id });
    assert(
      poDetail.financials.delivery_state === "partially_received" &&
        Number(poDetail.financials.received_quantity) === 40,
      "Reversal did not restore partially received / 40.",
    );
    const directReceiptEdit = await admin
      .from("purchase_order_receipt_items")
      .update({ quantity_received: 1 })
      .limit(1)
      .eq("receipt_id", secondReceipt.id);
    assert(directReceiptEdit.error, "A receipt item row was editable directly.");
    const sharedAfter = await anonymous.rpc("public_purchase_order_by_share_token", {
      raw_token: share.token,
    });
    assert(
      Number(sharedAfter.data?.lines?.[0]?.received_quantity) === 40,
      "The shared document does not reflect the reversal.",
    );

    // Close with a short delivery (audited reason); token shows CLOSED; revoke ends access.
    const closed = await rpc(a, "close_admin_purchase_order", {
      target_id: po.id,
      expected_version: poDetail.purchase_order.version,
      reason: "SYNTHETIC supplier short-delivered; remainder cancelled",
    });
    assert(closed?.ok === true, "Close failed.");
    const sharedClosed = await anonymous.rpc("public_purchase_order_by_share_token", {
      raw_token: share.token,
    });
    assert(
      sharedClosed.data?.lifecycle_state === "closed",
      "Shared document does not show closed.",
    );
    const revoked = await rpc(a, "revoke_purchase_order_share_link", { target_id: po.id });
    assert(revoked?.ok === true, "Revoke failed.");
    const sharedRevoked = await anonymous.rpc("public_purchase_order_by_share_token", {
      raw_token: share.token,
    });
    assert(sharedRevoked.data === null, "A revoked supplier token still resolved.");

    // ------------------------------------------------------------------
    // §139 receipt race: 50 ordered, two concurrent 40s → exactly one.
    // ------------------------------------------------------------------
    const racePo = raceDrafts[0];
    const racePoDetail = await rpc(a, "admin_get_purchase_order", { target_id: racePo.id });
    // The race draft carries 1 piece; create a dedicated 50-unit PO instead.
    const fifty = await rpc(a, "create_admin_purchase_order", {
      target_project_id: projectB.id,
      target_supplier_id: supplier.id,
      target_currency: "RWF",
      target_tax_rate: 0,
      lines: [
        { description: "SYNTHETIC blocks", quantity: "50", unit_label: "piece", unit_price: "500" },
      ],
    });
    assert(fifty?.ok === true, "Fifty-unit PO was not created.");
    created.orders.push(fifty.id);
    const fiftyIssued = await rpc(a, "issue_admin_purchase_order", {
      target_id: fifty.id,
      expected_version: fifty.version,
      target_issue_date: today,
      target_expected_delivery_date: plusDays(3),
    });
    assert(fiftyIssued?.ok === true, "Fifty-unit PO was not issued.");
    const fiftyDetail = await rpc(a, "admin_get_purchase_order", { target_id: fifty.id });
    const fiftyLine = fiftyDetail.lines[0].id;
    const receiptRace = await Promise.all(
      [a, b].map((session) =>
        rpc(session, "record_goods_receipt", {
          target_po_id: fifty.id,
          target_received_at: today,
          items: [{ line_item_id: fiftyLine, quantity_received: 40 }],
        }),
      ),
    );
    const receiptWinners = receiptRace.filter((r) => r?.ok === true);
    assert(receiptWinners.length === 1, `Receipt race accepted ${receiptWinners.length} receipts.`);
    assert(
      receiptRace.some((r) => hasReason(r, "over_receipt")),
      "The losing receipt was not rejected as over_receipt.",
    );
    const fiftyAfter = await rpc(a, "admin_get_purchase_order", { target_id: fifty.id });
    assert(Number(fiftyAfter.financials.received_quantity) === 40, "Race received is not 40.");
    assert(Number(fiftyAfter.financials.remaining_quantity) === 10, "Race remaining is not 10.");
    void racePoDetail;

    // Cancel (no receipts) on the second race draft; a cancelled PO is not payable/deliverable.
    const cancelTarget = raceIssued[1];
    const cancelled = await rpc(a, "cancel_admin_purchase_order", {
      target_id: cancelTarget.id,
      expected_version: cancelTarget.version,
      reason: "SYNTHETIC supplier unavailable",
    });
    assert(cancelled?.ok === true, "Cancel failed on a receipt-free PO.");
    const receiptOnCancelled = await rpc(a, "record_goods_receipt", {
      target_po_id: cancelTarget.id,
      target_received_at: today,
      items: [
        {
          line_item_id: (await rpc(a, "admin_get_purchase_order", { target_id: cancelTarget.id }))
            .lines[0].id,
          quantity_received: 1,
        },
      ],
    });
    assert(!receiptOnCancelled.ok, "A receipt was recorded against a cancelled PO.");
    const duplicated = await rpc(a, "duplicate_admin_purchase_order", { target_id: po.id });
    assert(duplicated?.ok === true, "Duplicate as new draft failed.");
    created.orders.push(duplicated.id);
    const duplicateDetail = await rpc(a, "admin_get_purchase_order", { target_id: duplicated.id });
    assert(
      duplicateDetail.purchase_order.lifecycle_state === "draft" &&
        duplicateDetail.lines.length === 1 &&
        duplicateDetail.lines[0].material_requirement_id === null,
      "Duplicate draft carried requirement links or is not a draft.",
    );

    // ------------------------------------------------------------------
    // Exact permission: an admin without procurement.orders.issue cannot issue.
    // ------------------------------------------------------------------
    const adminRole = await admin.from("roles").select("id").eq("key", "admin").single();
    const issuePermission = await admin
      .from("permissions")
      .select("id")
      .eq("key", "procurement.orders.issue")
      .single();
    assert(adminRole.data && issuePermission.data, "Role or permission row is missing.");
    const removal = await admin
      .from("role_permissions")
      .delete()
      .eq("role_id", adminRole.data.id)
      .eq("permission_id", issuePermission.data.id);
    assert(!removal.error, "Could not remove the issue permission for the test.");
    removedPermission = { role_id: adminRole.data.id, permission_id: issuePermission.data.id };
    const deniedIssue = await rpc(b, "issue_admin_purchase_order", {
      target_id: duplicated.id,
      expected_version: duplicateDetail.purchase_order.version,
      target_issue_date: today,
    });
    assert(
      hasReason(deniedIssue, "not_authorized"),
      "An admin without procurement.orders.issue issued a purchase order.",
    );
    const restore = await admin.from("role_permissions").insert(removedPermission);
    assert(!restore.error, "Could not restore the issue permission.");
    removedPermission = null;

    // ------------------------------------------------------------------
    // Control Room + project summary + quick find + realtime pointers.
    // ------------------------------------------------------------------
    const overview = await rpc(a, "admin_delivery_overview");
    assert(
      typeof overview.open_order_count === "number" && Array.isArray(overview.recent_receipts),
      "Delivery overview is malformed.",
    );
    const queue = await rpc(a, "admin_delivery_action_queue", { limit_count: 50 });
    assert(
      queue.some((item) => item.kind === "po_expected_soon" && item.id === fifty.id),
      "Delivery action queue did not surface the PO expected within 7 days.",
    );
    assert(
      queue.every((item) => typeof item.kind === "string" && typeof item.entity === "string"),
      "Delivery action queue rows are malformed.",
    );
    const summary = await rpc(a, "admin_project_delivery_summary", {
      target_project_id: projectA.id,
    });
    const rwf = summary.by_currency.find((row) => row.currency === "RWF");
    assert(Number(rwf?.contractor_committed) === 1000000, "Project contractor committed is wrong.");
    assert(Number(rwf?.contractor_paid) === 1000000, "Project contractor paid is wrong.");
    assert(Number(rwf?.material_ordered) === 1100000, "Project material ordered is wrong.");
    assert(!JSON.stringify(summary).includes("profit"), "Project summary exposes profitability.");
    const found = await rpc(a, "admin_global_quick_find", {
      search_query: poNumber,
      limit_count: 8,
    });
    assert(
      found.some((row) => row.kind === "purchase_order" && row.id === po.id),
      "Quick Find missed the PO.",
    );
    const foundContractor = await rpc(a, "admin_global_quick_find", {
      search_query: "SYNTHETIC C6 MASON",
      limit_count: 8,
    });
    assert(
      foundContractor.some((row) => row.kind === "contractor" && row.id === contractor.id),
      "Quick Find missed the contractor.",
    );
    const events = await admin
      .from("realtime_events")
      .select("entity_type, action")
      .in("entity_id", [assignment.id, po.id]);
    const eventKeys = new Set(events.data.map((row) => `${row.entity_type}:${row.action}`));
    for (const expected of [
      "contractor_assignment:created",
      "contractor_assignment:payment_recorded",
      "contractor_assignment:rated",
      "purchase_order:issued",
      "purchase_order:receipt_recorded",
      "purchase_order:closed",
    ]) {
      assert(eventKeys.has(expected), `Realtime pointer ${expected} was not emitted.`);
    }
    const eventText = JSON.stringify(events.data);
    assert(
      !eventText.includes("950000") && !eventText.includes("1100000"),
      "Realtime events carry values.",
    );

    // ------------------------------------------------------------------
    // Audit trail, redacted.
    // ------------------------------------------------------------------
    const audit = await admin
      .from("audit_logs")
      .select("action, metadata")
      .in("entity_id", [assignment.id, po.id, contractor.id, supplier.id, requirement.id]);
    const actions = new Set(audit.data.map((row) => row.action));
    for (const expected of [
      "partner.create",
      "partner.capability_change",
      "assignment.create",
      "assignment.status_change",
      "contractor.payment_record",
      "contractor.payment_reverse",
      "assignment.finance_adjustment",
      "assignment.performance_rate",
      "material_requirement.create",
      "purchase_order.create",
      "purchase_order.issue",
      "purchase_order.share_create",
      "goods_receipt.record",
      "goods_receipt.reverse",
      "purchase_order.close",
      "purchase_order.share_revoke",
    ]) {
      assert(actions.has(expected), `Audit is missing ${expected}.`);
    }
    const auditText = JSON.stringify(audit.data);
    assert(!auditText.includes(share.token), "Audit stored the raw supplier token.");
    for (const secret of [
      "SYNTHETIC private payment note",
      "SYNTHETIC private receipt note",
      "SYNTHETIC private partner note",
      "SYNTHETIC private requirement note",
      "SYNTHETIC C6 STREET",
    ]) {
      assert(!auditText.includes(secret), `Audit stored "${secret}".`);
    }

    console.log(
      JSON.stringify({
        ok: true,
        purchaseOrderNumber: poNumber,
        checkpoints: [
          "supplier-only partner refused as contractor; contractor-only partner refused as supplier (capability_missing)",
          "add capability upgrades the same record (one row), duplicate awareness surfaces it",
          "assignment 950000 RWF: stale save rejected; 350000 + 600000 paid → paid; overpay refused; currency frozen after payment",
          "reversal → partially paid / 600000; payment rows immutable; audited adjustment 1000000 (below-paid refused)",
          "rating refused before completion, 6 refused, 5 accepted → partner average 5 (1 rated)",
          "payment race 80000 + 80000 on 100000: exactly one accepted (exceeds_remaining)",
          "cancel refused with payments standing; archive refused with active assignment",
          "PO 100 × 10000 @ 10%: 1000000 / 100000 / 1100000; draft not counted as ordered",
          "cross-project requirement, unapproved requirement and unconfirmed over-order refused",
          "two drafts issued concurrently → distinct RENZ-PO numbers; double issue → one success; issued PO immutable",
          "anonymous supplier token returns the document only (no notes/links/versions); tables + staff facades + AAL1 denied",
          "receipts 40 + 60 → received; over-receipt refused; requirement received; reversal → 40; receipt rows immutable",
          "close with reason; token shows closed; revoke ends access",
          "receipt race 40 + 40 on 50: exactly one accepted (over_receipt)",
          "cancel on receipt-free PO; no receipt on cancelled; duplicate drops requirement links",
          "admin without procurement.orders.issue cannot issue (exact permission)",
          "delivery overview / action queue / project summary by currency (no profit) / quick find / value-free realtime pointers",
          "audit records every event without token, notes or addresses",
        ],
      }),
    );
  } finally {
    const failures = [];
    const quoted = (ids) => ids.map((id) => `'${id}'`).join(", ");
    const steps = [
      async () => {
        if (removedPermission) {
          const restore = await admin.from("role_permissions").insert(removedPermission);
          assert(!restore.error, "Could not restore the issue permission during cleanup.");
        }
      },
      async () => {
        // Issued orders, receipts and payments are immutable by trigger (by
        // design); synthetic rows are removed with triggers suppressed, as postgres.
        if (created.orders.length) {
          const ids = quoted(created.orders);
          runLocalSql(
            `set session_replication_role = replica;
             delete from public.purchase_order_share_links where purchase_order_id in (${ids});
             delete from public.purchase_order_receipt_items where receipt_id in (select id from public.purchase_order_receipts where purchase_order_id in (${ids}));
             delete from public.purchase_order_receipts where purchase_order_id in (${ids});
             delete from public.purchase_order_line_items where purchase_order_id in (${ids});
             delete from public.purchase_orders where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C6 synthetic purchase order cleanup",
          );
        }
      },
      async () => {
        if (created.requirements.length) {
          const ids = quoted(created.requirements);
          runLocalSql(
            `delete from public.project_material_requirements where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C6 synthetic requirement cleanup",
          );
        }
      },
      async () => {
        if (created.materials.length) {
          const ids = quoted(created.materials);
          runLocalSql(
            `delete from public.materials where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C6 synthetic material cleanup",
          );
        }
      },
      async () => {
        if (created.assignments.length) {
          const ids = quoted(created.assignments);
          runLocalSql(
            `set session_replication_role = replica;
             delete from public.contractor_payments where contractor_assignment_id in (${ids});
             delete from public.contractor_assignment_adjustments where contractor_assignment_id in (${ids});
             delete from public.contractor_assignments where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C6 synthetic assignment cleanup",
          );
        }
      },
      async () => {
        if (created.partners.length) {
          const ids = quoted(created.partners);
          runLocalSql(
            `delete from public.trade_partners where id in (${ids});
             delete from public.audit_logs where entity_id in (${ids});
             delete from public.realtime_events where entity_id in (${ids});`,
            "C6 synthetic partner cleanup",
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
            "C6 synthetic project cleanup",
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
            "C6 synthetic client cleanup",
          );
        }
      },
      () => removeUserByEmail(emailB),
      () => removeUserByEmail(emailAal1),
      async () => {
        runLocalSql(
          `alter table public.profiles disable trigger profiles_prevent_last_super_admin_delete;
           delete from auth.users where email = '${emailA}';
           alter table public.profiles enable trigger profiles_prevent_last_super_admin_delete;`,
          "C6 synthetic super admin cleanup",
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
      console.error(`Synthetic C6 cleanup failed: ${failures.join("; ")}`);
      process.exitCode = 1;
    }
  }
}

try {
  await verifyC6();
} catch (error) {
  console.error(error instanceof Error ? error.message : "C6 verification failed.");
  process.exitCode = 1;
}
process.exit();
