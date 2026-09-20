import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderPurchaseOrderPdf } from "@/features/procurement/po-pdf";
import type { PoDocument } from "@/features/procurement/procurement-contract";

function document(overrides: Partial<PoDocument> = {}): PoDocument {
  return {
    id: "97000000-0000-4000-8000-000000000701",
    purchase_order_number: "RENZ-PO-2026-000007",
    lifecycle_state: "issued",
    currency: "RWF",
    tax_rate: "10.00",
    issue_date: "2026-09-12",
    expected_delivery_date: "2026-09-19",
    reference: "SYNTHETIC-QUOTE-7",
    notes: "SYNTHETIC deliver to the site gate between 08:00 and 16:00.",
    terms: "Payment within 30 days of delivery note.",
    cancelled_at: null,
    closed_at: null,
    issuer: {
      name: "RENZ Construction Services Ltd",
      email: "renzconstruuction@gmail.com",
      whatsapp: "+44 7412 853143",
      tax_label: "Tax",
    },
    supplier: {
      display_name: "SYNTHETIC PDF CEMENT SUPPLIES",
      company_name: "SYNTHETIC PDF CEMENT LTD",
      contact_name: "SYNTHETIC CONTACT",
      email: "synthetic-pdf-supplier@example.test",
    },
    project: { title: "SYNTHETIC PDF PROJECT" },
    lines: [
      {
        description: "Cement 42.5N",
        quantity: "100",
        unit_label: "bag",
        unit_price: "10000.00",
        line_total: "1000000.00",
        received_quantity: "40",
      },
    ],
    subtotal: "1000000.00",
    tax_amount: "100000.00",
    total: "1100000.00",
    delivery_state: "partially_received",
    ...overrides,
  };
}

function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/gu) ?? []).length;
}

describe("purchase order PDF renderer", () => {
  it("renders a single-page purchase order with the received column and no internal fields", async () => {
    const pdf = await renderPurchaseOrderPdf(document());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBe(1);
    const text = pdf.toString("latin1");
    expect(text).toContain("Purchase order RENZ-PO-2026-000007");
    expect(text).not.toContain("material_requirement_id");
    expect(text).not.toContain("private_note");
  });

  it("flows many lines onto multiple pages", async () => {
    const lines = Array.from({ length: 60 }, (_, index) => ({
      description:
        index % 7 === 0
          ? `Line ${index + 1}: ${"a long specification that must wrap across several lines of the table without clipping ".repeat(3)}`
          : `Line ${index + 1}: routine material`,
      quantity: "1",
      unit_label: index % 2 === 0 ? "m²" : "bag",
      unit_price: "1250.50",
      line_total: "1250.50",
      received_quantity: "0",
    }));
    const pdf = await renderPurchaseOrderPdf(document({ lines, currency: "USD" }));
    expect(pageCount(pdf)).toBeGreaterThan(1);
  });

  it("renders cancelled and closed orders and both currency styles", async () => {
    for (const overrides of [
      { lifecycle_state: "cancelled" as const, cancelled_at: "2026-09-14T10:00:00Z" },
      { lifecycle_state: "closed" as const, closed_at: "2026-09-14T10:00:00Z" },
      { currency: "GBP" },
    ]) {
      const pdf = await renderPurchaseOrderPdf(document(overrides));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pageCount(pdf)).toBe(1);
    }
  });
});
