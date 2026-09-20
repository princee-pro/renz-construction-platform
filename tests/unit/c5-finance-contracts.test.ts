import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/public-server", () => ({ createPublicSupabaseClient: vi.fn() }));

import {
  currencyFractionDigits,
  formatMoney,
  invoiceCreateInput,
  invoiceEditInput,
  invoiceIssueInput,
  invoiceStatus,
  paymentRecordInput,
  previewTotals,
} from "@/features/invoices/invoice-contract";
import { normalizeInvoiceListFilters } from "@/features/invoices/invoice-data";
import { adminNavigation } from "@/lib/admin/navigation";

const clientId = "97000000-0000-4000-8000-000000000401";
const invoiceId = "97000000-0000-4000-8000-000000000402";

function form(entries: Readonly<Record<string, string>>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const lines = JSON.stringify([
  {
    description: "Design coordination",
    quantity: "2",
    unit_label: "service",
    unit_price: "100000",
  },
  { description: "Site supervision", quantity: "3", unit_label: "day", unit_price: "50000" },
]);

describe("C5 invoice draft contract", () => {
  it("accepts a complete draft, upper-cases the currency and keeps decimals as text", () => {
    const parsed = invoiceCreateInput(
      form({ clientId, currency: "rwf", taxRate: "10", lines, projectId: "" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("RWF");
      expect(parsed.data.taxRate).toBe("10");
      expect(parsed.data.projectId).toBeNull();
      expect(parsed.data.lines).toHaveLength(2);
      expect(parsed.data.lines[0]?.unit_price).toBe("100000");
    }
  });

  it("requires a client, a 3-letter currency, and a 0–100 tax rate", () => {
    expect(invoiceCreateInput(form({ clientId: "", currency: "RWF", lines })).success).toBe(false);
    expect(invoiceCreateInput(form({ clientId, currency: "RWFR", lines })).success).toBe(false);
    expect(
      invoiceCreateInput(form({ clientId, currency: "RWF", taxRate: "101", lines })).success,
    ).toBe(false);
    expect(
      invoiceCreateInput(form({ clientId, currency: "RWF", taxRate: "-1", lines })).success,
    ).toBe(false);
    expect(
      invoiceCreateInput(form({ clientId, currency: "RWF", taxRate: "", lines })).success,
    ).toBe(true);
  });

  it("rejects non-positive quantities, negative prices, and markup in descriptions", () => {
    const bad = (line: Record<string, string>) =>
      invoiceCreateInput(form({ clientId, currency: "RWF", lines: JSON.stringify([line]) }))
        .success;
    expect(bad({ description: "x", quantity: "0", unit_price: "1" })).toBe(false);
    expect(bad({ description: "x", quantity: "1", unit_price: "-1" })).toBe(false);
    expect(bad({ description: "<b>x</b>", quantity: "1", unit_price: "1" })).toBe(false);
    expect(bad({ description: "x", quantity: "1", unit_price: "1.555" })).toBe(false);
    expect(bad({ description: "x", quantity: "1.5", unit_price: "1.50" })).toBe(true);
  });

  it("allows an empty draft but enforces due >= issue on planned dates", () => {
    expect(invoiceCreateInput(form({ clientId, currency: "USD", lines: "[]" })).success).toBe(true);
    const inverted = invoiceCreateInput(
      form({ clientId, currency: "USD", lines, issueDate: "2026-10-01", dueDate: "2026-09-01" }),
    );
    expect(inverted.success).toBe(false);
  });

  it("keeps edits and issue versioned and issue dates mandatory", () => {
    const edit = invoiceEditInput(
      form({ invoiceId, expectedVersion: "3", clientId, currency: "GBP", lines }),
    );
    expect(edit.success && edit.data.expectedVersion).toBe(3);
    expect(
      invoiceEditInput(form({ invoiceId, expectedVersion: "0", clientId, currency: "GBP", lines }))
        .success,
    ).toBe(false);
    expect(
      invoiceIssueInput(
        form({ invoiceId, expectedVersion: "1", issueDate: "2026-09-12", dueDate: "" }),
      ).success,
    ).toBe(false);
    expect(
      invoiceIssueInput(
        form({ invoiceId, expectedVersion: "1", issueDate: "2026-09-12", dueDate: "2026-09-26" }),
      ).success,
    ).toBe(true);
  });
});

describe("C5 payment contract", () => {
  it("requires a positive two-decimal amount, a date and a bounded method", () => {
    const valid = {
      invoiceId,
      amount: "100000",
      paymentDate: "2026-09-12",
      paymentMethod: "bank_transfer",
    };
    expect(paymentRecordInput(form(valid)).success).toBe(true);
    expect(paymentRecordInput(form({ ...valid, amount: "0" })).success).toBe(false);
    expect(paymentRecordInput(form({ ...valid, amount: "1.005" })).success).toBe(false);
    expect(paymentRecordInput(form({ ...valid, paymentMethod: "crypto" })).success).toBe(false);
    expect(paymentRecordInput(form({ ...valid, paymentDate: "" })).success).toBe(false);
  });
});

describe("C5 money and status helpers", () => {
  it("mirrors the database rounding rule in the preview", () => {
    const totals = previewTotals(
      [
        { quantity: "2", unit_price: "100000" },
        { quantity: "3", unit_price: "50000" },
      ],
      "10",
    );
    expect(totals).toMatchObject({ subtotal: 350000, tax: 35000, total: 385000 });
    const fractional = previewTotals([{ quantity: "3", unit_price: "33.33" }], "7.5");
    expect(fractional.subtotal).toBe(99.99);
    expect(fractional.tax).toBe(7.5);
    expect(fractional.total).toBe(107.49);
  });

  it("formats money per currency minor unit and never drops the currency code", () => {
    expect(currencyFractionDigits("RWF")).toBe(0);
    expect(currencyFractionDigits("USD")).toBe(2);
    expect(formatMoney("385000.00", "RWF")).toBe("RWF 385,000");
    expect(formatMoney("42000", "USD")).toBe("USD 42,000.00");
    expect(formatMoney(null, "GBP")).toBe("—");
  });

  it("derives one display status with lifecycle first and overdue as a consequence", () => {
    const base = { payment_state: "unpaid" as const, is_overdue: false };
    expect(invoiceStatus({ ...base, lifecycle_state: "draft" }).label).toBe("Draft");
    expect(invoiceStatus({ ...base, lifecycle_state: "draft", archived_at: "x" }).label).toBe(
      "Archived draft",
    );
    expect(invoiceStatus({ ...base, lifecycle_state: "void", is_overdue: true }).label).toBe(
      "Void",
    );
    expect(invoiceStatus({ ...base, lifecycle_state: "issued", is_overdue: true }).label).toBe(
      "Overdue",
    );
    expect(
      invoiceStatus({
        lifecycle_state: "issued",
        payment_state: "partially_paid",
        is_overdue: false,
      }).label,
    ).toBe("Partially paid");
    expect(
      invoiceStatus({ lifecycle_state: "issued", payment_state: "paid", is_overdue: false }).label,
    ).toBe("Paid");
  });

  it("normalizes register filters to admitted values only", () => {
    const filters = normalizeInvoiceListFilters({
      lifecycle: "issued",
      payment: "partially_paid",
      overdue: "1",
      currency: "rwf",
      from: "2026-01-01",
      to: "not-a-date",
      client: "nope",
    });
    expect(filters).toMatchObject({
      lifecycle: "issued",
      payment: "partially_paid",
      overdue: true,
      currency: "RWF",
      issuedFrom: "2026-01-01",
      issuedTo: "",
      clientId: "",
    });
    expect(normalizeInvoiceListFilters({ lifecycle: "deleted", payment: "overdue" })).toMatchObject(
      {
        lifecycle: "",
        payment: "",
      },
    );
  });
});

describe("C5 navigation", () => {
  it("adds a Finance group with only real pages and no future finance items", () => {
    const finance = adminNavigation.filter((item) => item.group === "Finance");
    expect(finance.map((item) => item.href)).toEqual([
      "/admin/finance",
      "/admin/finance/invoices",
      "/admin/finance/contractor-payables",
    ]);
    expect(
      finance
        .filter((item) => item.href !== "/admin/finance/contractor-payables")
        .every((item) => item.permission === "finance.invoices.read"),
    ).toBe(true);
    expect(adminNavigation.map((item) => item.label)).not.toContain("Payments");
    expect(adminNavigation.map((item) => item.label)).not.toContain("Supplier Payables");
  });
});
