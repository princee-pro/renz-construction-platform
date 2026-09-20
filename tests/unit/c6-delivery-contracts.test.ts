import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/public-server", () => ({ createPublicSupabaseClient: vi.fn() }));

import {
  assignmentCreateInput,
  assignmentRateInput,
  assignmentStatusTone,
  contractorPaymentInput,
  suggestedPlannedValue,
} from "@/features/assignments/assignment-contract";
import { normalizePayablesFilters } from "@/features/assignments/assignment-data";
import {
  partnerCapabilityInput,
  partnerCreateInput,
  ratingLabel,
  ratingScale,
} from "@/features/partners/partner-contract";
import { normalizePartnerListFilters } from "@/features/partners/partner-data";
import {
  lineFromRequirement,
  lineOverOrders,
  newPoLine,
  orderableRequirements,
} from "@/features/procurement/po-editor-model";
import {
  deliveryQueueHref,
  materialCreateInput,
  poCreateInput,
  poIssueInput,
  purchaseOrderStatus,
  receiptRecordInput,
  requirementCreateInput,
} from "@/features/procurement/procurement-contract";
import { normalizePoListFilters } from "@/features/procurement/procurement-data";
import { adminNavigation } from "@/lib/admin/navigation";
import { adminPermissions } from "@/lib/auth/permissions";

const projectId = "97000000-0000-4000-8000-000000000601";
const partnerId = "97000000-0000-4000-8000-000000000602";
const requirementId = "97000000-0000-4000-8000-000000000603";
const lineId = "97000000-0000-4000-8000-000000000604";

function form(entries: Readonly<Record<string, string | string[]>>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) value.forEach((entry) => data.append(key, entry));
    else data.set(key, value);
  }
  return data;
}

describe("C6 trade partner contract", () => {
  it("requires at least one admitted capability and de-duplicates the rest", () => {
    const parsed = partnerCreateInput(
      form({
        displayName: "SYNTHETIC MASON",
        capabilities: ["contractor", "contractor"],
        specializations: ["Masonry", "Masonry", "Roofing"],
      }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.capabilities).toEqual(["contractor"]);
      expect(parsed.data.specializations).toEqual(["Masonry", "Roofing"]);
      expect(parsed.data.availability).toBe("available");
    }
    expect(partnerCreateInput(form({ displayName: "X", capabilities: [] })).success).toBe(false);
    expect(partnerCreateInput(form({ displayName: "X", capabilities: ["plumber"] })).success).toBe(
      false,
    );
    expect(
      partnerCapabilityInput(form({ partnerId, expectedVersion: "2", capability: "supplier" }))
        .success,
    ).toBe(true);
  });

  it("normalizes register filters per capability", () => {
    const filters = normalizePartnerListFilters("supplier", {
      q: "  cement  ",
      availability: "nonsense",
      status: "archived",
    });
    expect(filters.capability).toBe("supplier");
    expect(filters.search).toBe("cement");
    expect(filters.availability).toBe("");
    expect(filters.statusScope).toBe("archived");
  });

  it("labels the five-point rating scale accessibly and averages as text", () => {
    expect(ratingScale.map((entry) => entry.label)).toEqual([
      "1 — Poor",
      "2 — Below expectations",
      "3 — Meets expectations",
      "4 — Very good",
      "5 — Excellent",
    ]);
    expect(ratingLabel("4.5")).toBe("4.5 / 5");
    expect(ratingLabel(null)).toBe("Not yet rated");
  });
});

describe("C6 assignment contract", () => {
  it("accepts a fixed-project assignment and normalizes the currency", () => {
    const parsed = assignmentCreateInput(
      form({
        projectId,
        partnerId,
        scope: "Masonry works",
        rateType: "fixed_project",
        rateAmount: "950000",
        currency: "rwf",
        agreedAmount: "950000",
        startDate: "2026-09-12",
        endDate: "2026-09-30",
      }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("RWF");
      expect(parsed.data.status).toBe("planned");
      expect(parsed.data.plannedUnits).toBeNull();
    }
  });

  it("refuses money without a currency, a rate without a type, and an inverted schedule", () => {
    expect(
      assignmentCreateInput(form({ projectId, partnerId, scope: "x", agreedAmount: "10" })).success,
    ).toBe(false);
    expect(
      assignmentCreateInput(
        form({ projectId, partnerId, scope: "x", rateAmount: "10", currency: "RWF" }),
      ).success,
    ).toBe(false);
    expect(
      assignmentCreateInput(
        form({
          projectId,
          partnerId,
          scope: "x",
          startDate: "2026-09-30",
          endDate: "2026-09-12",
        }),
      ).success,
    ).toBe(false);
  });

  it("suggests rate × planned units only as guidance", () => {
    expect(suggestedPlannedValue("15000", "12", "daily")).toBe(180000);
    expect(suggestedPlannedValue("950000", "", "fixed_project")).toBe(950000);
    expect(suggestedPlannedValue("abc", "2", "hourly")).toBeNull();
  });

  it("validates payments and ratings", () => {
    const payment = contractorPaymentInput(
      form({
        assignmentId: partnerId,
        amount: "350000",
        paymentDate: "2026-09-12",
        paymentMethod: "bank_transfer",
      }),
    );
    expect(payment.success).toBe(true);
    expect(
      contractorPaymentInput(
        form({
          assignmentId: partnerId,
          amount: "0",
          paymentDate: "2026-09-12",
          paymentMethod: "cash",
        }),
      ).success,
    ).toBe(false);
    expect(
      assignmentRateInput(form({ assignmentId: partnerId, expectedVersion: "3", rating: "6" }))
        .success,
    ).toBe(false);
    expect(
      assignmentRateInput(form({ assignmentId: partnerId, expectedVersion: "3", rating: "5" }))
        .success,
    ).toBe(true);
    expect(assignmentStatusTone("completed")).toBe("neutral");
    expect(assignmentStatusTone("cancelled")).toBe("archived");
  });

  it("normalizes payables filters", () => {
    const filters = normalizePayablesFilters({
      status: "active",
      payment: "partially_paid",
      currency: "rwf",
      partner: "not-a-uuid",
    });
    expect(filters.status).toBe("active");
    expect(filters.payment).toBe("partially_paid");
    expect(filters.currency).toBe("RWF");
    expect(filters.partnerId).toBe("");
  });
});

describe("C6 procurement contract", () => {
  it("accepts a material and a project requirement", () => {
    expect(materialCreateInput(form({ name: "Cement 42.5N", unit: "bag" })).success).toBe(true);
    expect(materialCreateInput(form({ name: "", unit: "bag" })).success).toBe(false);
    const requirement = requirementCreateInput(
      form({ projectId, itemName: "Cement", quantity: "100", unit: "bag" }),
    );
    expect(requirement.success).toBe(true);
    if (requirement.success) {
      expect(requirement.data.priority).toBe("medium");
      expect(requirement.data.state).toBe("draft");
      expect(requirement.data.materialId).toBeNull();
    }
    expect(
      requirementCreateInput(form({ projectId, itemName: "Cement", quantity: "0", unit: "bag" }))
        .success,
    ).toBe(false);
  });

  it("parses purchase order drafts with linked and free-text lines", () => {
    const lines = JSON.stringify([
      {
        description: "Cement",
        quantity: "100",
        unit_label: "bag",
        unit_price: "10000",
        material_requirement_id: requirementId,
        over_order_confirmed: false,
      },
      { description: "Sand", quantity: "2.5", unit_label: "tonne", unit_price: "45000.50" },
    ]);
    const parsed = poCreateInput(
      form({ projectId, supplierId: partnerId, currency: "rwf", taxRate: "10", lines }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("RWF");
      expect(parsed.data.lines[0]?.material_requirement_id).toBe(requirementId);
      expect(parsed.data.lines[1]?.material_requirement_id).toBeNull();
      expect(parsed.data.lines[1]?.over_order_confirmed).toBe(false);
    }
    expect(
      poCreateInput(form({ projectId, supplierId: "", currency: "RWF", taxRate: "0", lines }))
        .success,
    ).toBe(false);
    expect(
      poIssueInput(
        form({
          orderId: partnerId,
          expectedVersion: "1",
          issueDate: "2026-09-12",
          expectedDeliveryDate: "2026-09-01",
        }),
      ).success,
    ).toBe(false);
  });

  it("collects goods receipt quantities from per-line fields", () => {
    const parsed = receiptRecordInput(
      form({
        orderId: partnerId,
        receivedAt: "2026-09-12",
        [`received[${lineId}]`]: "40",
        "received[not-a-line]": "9",
      }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toEqual([{ line_item_id: lineId, quantity_received: "40" }]);
    }
    expect(receiptRecordInput(form({ orderId: partnerId, receivedAt: "2026-09-12" })).success).toBe(
      false,
    );
  });

  it("derives one display status per purchase order (lifecycle first, delivery second)", () => {
    expect(purchaseOrderStatus({ lifecycle_state: "draft", delivery_state: "delayed" }).label).toBe(
      "Draft",
    );
    expect(
      purchaseOrderStatus({
        lifecycle_state: "issued",
        delivery_state: "delayed",
        is_delayed: true,
      }).tone,
    ).toBe("blocked");
    expect(
      purchaseOrderStatus({ lifecycle_state: "issued", delivery_state: "received" }).label,
    ).toBe("Received");
    expect(
      purchaseOrderStatus({ lifecycle_state: "closed", delivery_state: "partially_received" })
        .label,
    ).toBe("Closed");
  });

  it("flags over-orders against the requirement remainder in the editor model", () => {
    const requirements = orderableRequirements([
      {
        id: requirementId,
        item_name: "Cement",
        unit_label: "bag",
        required_quantity: "100",
        remaining_to_order: "60",
        approval_state: "approved",
        specification: null,
        material: null,
      },
      {
        id: lineId,
        item_name: "Done",
        unit_label: "bag",
        required_quantity: "10",
        remaining_to_order: "0",
        approval_state: "approved",
        specification: null,
        material: null,
      },
    ]);
    expect(requirements).toHaveLength(1);
    const line = lineFromRequirement(requirements[0]!);
    expect(line.quantity).toBe("60");
    expect(lineOverOrders(line)).toBe(false);
    expect(lineOverOrders({ ...line, quantity: "61" })).toBe(true);
    expect(lineOverOrders(newPoLine({ quantity: "999" }))).toBe(false);
  });

  it("normalizes purchase order filters and routes queue items", () => {
    const filters = normalizePoListFilters({
      lifecycle: "issued",
      delivery: "delayed",
      delayed: "1",
      from: "2026-01-01",
      to: "bad",
    });
    expect(filters.lifecycle).toBe("issued");
    expect(filters.delivery).toBe("delayed");
    expect(filters.delayed).toBe(true);
    expect(filters.issuedFrom).toBe("2026-01-01");
    expect(filters.issuedTo).toBe("");
    expect(
      deliveryQueueHref({
        kind: "material_due_soon",
        entity: "operational_project",
        id: projectId,
        label: null,
        detail: null,
      }),
    ).toBe(`/admin/operations/projects/${projectId}?tab=procurement`);
  });
});

describe("C6 wiring", () => {
  it("declares the ten delivery permissions and the navigation entries", () => {
    for (const key of [
      "partners.read",
      "partners.write",
      "contractors.assign",
      "contractors.payments.write",
      "procurement.materials.read",
      "procurement.materials.write",
      "procurement.orders.read",
      "procurement.orders.write",
      "procurement.orders.issue",
      "procurement.receipts.write",
    ]) {
      expect(adminPermissions).toContain(key);
    }
    const hrefs = adminNavigation.map((item) => item.href);
    for (const href of [
      "/admin/operations/contractors",
      "/admin/procurement/materials",
      "/admin/procurement/suppliers",
      "/admin/procurement/orders",
      "/admin/finance/contractor-payables",
    ]) {
      expect(hrefs).toContain(href);
    }
  });
});
