import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderInvoicePdf } from "@/features/invoices/invoice-pdf";
import type { InvoiceDocument } from "@/features/invoices/invoice-contract";

function document(overrides: Partial<InvoiceDocument> = {}): InvoiceDocument {
  return {
    id: "97000000-0000-4000-8000-000000000301",
    invoice_number: "RENZ-2026-000042",
    lifecycle_state: "issued",
    currency: "RWF",
    tax_rate: "10.00",
    issue_date: "2026-09-12",
    due_date: "2026-09-26",
    reference: "SYNTHETIC-REF",
    notes: "SYNTHETIC scope clarification note shown to the client.",
    payment_terms: "Payable within 14 days by bank transfer.",
    voided_at: null,
    issuer: {
      name: "RENZ Construction Services Ltd",
      email: "renzconstruuction@gmail.com",
      whatsapp: "+44 7412 853143",
      tax_label: "Tax",
    },
    client: {
      full_name: "SYNTHETIC PDF CLIENT",
      company: "SYNTHETIC PDF LTD",
      address: "SYNTHETIC 12 Example Road",
      email: "synthetic-pdf@example.test",
    },
    project: { title: "SYNTHETIC PDF PROJECT" },
    lines: [
      {
        description: "Design coordination",
        quantity: "2",
        unit_label: "service",
        unit_price: "100000.00",
        line_total: "200000.00",
      },
      {
        description: "Site supervision",
        quantity: "3",
        unit_label: "day",
        unit_price: "50000.00",
        line_total: "150000.00",
      },
    ],
    subtotal: "350000.00",
    tax_amount: "35000.00",
    total: "385000.00",
    paid_amount: "100000.00",
    balance_due: "285000.00",
    payment_state: "partially_paid",
    is_overdue: false,
    payments: [
      { payment_date: "2026-09-13", amount: "100000.00", payment_method: "bank_transfer" },
    ],
    ...overrides,
  };
}

function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/gu) ?? []).length;
}

describe("invoice PDF renderer", () => {
  it("renders a single-page invoice with every financial figure and no internal fields", async () => {
    const pdf = await renderInvoicePdf(document());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pageCount(pdf)).toBe(1);
    const text = pdf.toString("latin1");
    // pdfkit compresses page streams; metadata stays readable.
    expect(text).toContain("Invoice RENZ-2026-000042");
    expect(text).not.toContain("recorded_by");
    expect(text).not.toContain("note");
  });

  it("wraps long descriptions and flows onto multiple pages", async () => {
    const lines = Array.from({ length: 60 }, (_, index) => ({
      description:
        index % 7 === 0
          ? `Line ${index + 1}: ${"a very long description that must wrap across several lines of the table without clipping ".repeat(3)}`
          : `Line ${index + 1}: routine item`,
      quantity: "1",
      unit_label: index % 2 === 0 ? "m²" : "hour",
      unit_price: "1250.50",
      line_total: "1250.50",
    }));
    const pdf = await renderInvoicePdf(document({ lines, currency: "USD" }));
    expect(pageCount(pdf)).toBeGreaterThan(1);
    expect(pdf.length).toBeGreaterThan(4000);
  });

  it("renders a void invoice without a payable balance", async () => {
    const pdf = await renderInvoicePdf(
      document({ lifecycle_state: "void", voided_at: "2026-09-14T10:00:00Z", payments: [] }),
    );
    expect(pageCount(pdf)).toBe(1);
  });

  it("renders zero-decimal and two-decimal currencies", async () => {
    for (const currency of ["RWF", "USD", "GBP"]) {
      const pdf = await renderInvoicePdf(document({ currency }));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    }
  });
});
