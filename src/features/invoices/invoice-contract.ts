import { z } from "zod";

import {
  formNumber,
  formText,
  optionalText,
  requiredText,
  zodFieldErrors,
} from "@/features/admin-shared/action-state";

// ---------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------

export const invoiceLifecycleStates = ["draft", "issued", "void"] as const;
export type InvoiceLifecycleState = (typeof invoiceLifecycleStates)[number];
export const invoiceLifecycleLabels: Readonly<Record<InvoiceLifecycleState, string>> = {
  draft: "Draft",
  issued: "Issued",
  void: "Void",
};

export const invoicePaymentStates = ["unpaid", "partially_paid", "paid"] as const;
export type InvoicePaymentState = (typeof invoicePaymentStates)[number];
export const invoicePaymentStateLabels: Readonly<Record<InvoicePaymentState, string>> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
};

export const paymentMethods = [
  "bank_transfer",
  "cash",
  "mobile_money",
  "card",
  "cheque",
  "other",
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export const paymentMethodLabels: Readonly<Record<PaymentMethod, string>> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  mobile_money: "Mobile money",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

/**
 * One display status for an invoice, derived from the canonical projection
 * (lifecycle first, then payment state, overdue as a consequence). This is
 * the only place that ordering lives — registers, Client 360, the Command
 * Center and the document all call it.
 */
export function invoiceStatus(
  invoice: Readonly<{
    lifecycle_state: InvoiceLifecycleState;
    payment_state: InvoicePaymentState;
    is_overdue: boolean;
    archived_at?: string | null;
  }>,
): Readonly<{
  label: string;
  tone: "draft" | "archived" | "ready" | "review" | "blocked" | "neutral";
}> {
  if (invoice.lifecycle_state === "draft") {
    return invoice.archived_at
      ? { label: "Archived draft", tone: "archived" }
      : { label: "Draft", tone: "draft" };
  }
  if (invoice.lifecycle_state === "void") return { label: "Void", tone: "archived" };
  if (invoice.is_overdue) return { label: "Overdue", tone: "blocked" };
  if (invoice.payment_state === "paid") return { label: "Paid", tone: "ready" };
  if (invoice.payment_state === "partially_paid")
    return { label: "Partially paid", tone: "review" };
  return { label: "Unpaid", tone: "neutral" };
}

// ---------------------------------------------------------------------
// Money display (server/database remain the arithmetic authority)
// ---------------------------------------------------------------------

const zeroDecimalCurrencies = new Set(["RWF", "JPY", "KRW", "UGX", "TZS", "XAF", "XOF", "CLP"]);

export function currencyFractionDigits(currency: string): number {
  return zeroDecimalCurrencies.has(currency.toUpperCase()) ? 0 : 2;
}

export function formatMoney(amount: string | number | null | undefined, currency: string): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const numeric = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(numeric)) return "—";
  const digits = currencyFractionDigits(currency);
  const formatted = new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  }).format(numeric);
  return `${currency.toUpperCase()} ${formatted}`;
}

export function formatQuantity(value: string | number): string {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(numeric);
}

/**
 * Client-side preview arithmetic for the draft editor only. It mirrors the
 * database rule (round each line to 2dp, tax on the rounded subtotal) so the
 * preview agrees with what the server will store, but the server always
 * recomputes; nothing here is ever persisted.
 */
export function previewTotals(
  lines: readonly Readonly<{ quantity: string; unit_price: string }>[],
  taxRate: string,
): Readonly<{ subtotal: number; tax: number; total: number; lineTotals: number[] }> {
  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const lineTotals = lines.map((line) => {
    const quantity = Number.parseFloat(line.quantity);
    const price = Number.parseFloat(line.unit_price);
    return Number.isFinite(quantity) && Number.isFinite(price) ? round2(quantity * price) : 0;
  });
  const subtotal = round2(lineTotals.reduce((sum, value) => sum + value, 0));
  const rate = Number.parseFloat(taxRate);
  const tax = Number.isFinite(rate) ? round2((subtotal * rate) / 100) : 0;
  return { subtotal, tax, total: round2(subtotal + tax), lineTotals };
}

// ---------------------------------------------------------------------
// Form contracts
// ---------------------------------------------------------------------

const dateOrNull = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Enter a valid date.")
      .nullable(),
  );

const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Enter a valid date.");

const currencyCode = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/u, "Use a 3-letter currency code."));

const decimalText = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,12}(\.\d{1,3})?$/u, message);

const taxRateText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? "0" : value))
  .pipe(
    z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/u, "Enter a tax rate between 0 and 100.")
      .refine((value) => Number.parseFloat(value) <= 100, "Tax rate cannot exceed 100."),
  );

export const invoiceLineSchema = z
  .object({
    description: requiredText(1, 500),
    quantity: decimalText("Enter a quantity greater than zero.").refine(
      (value) => Number.parseFloat(value) > 0,
      "Enter a quantity greater than zero.",
    ),
    unit_label: optionalText(40),
    unit_price: decimalText("Enter a non-negative unit price.").refine(
      (value) => /^\d{1,12}(\.\d{1,2})?$/u.test(value),
      "Unit price supports at most two decimals.",
    ),
  })
  .strict();
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

const draftFields = {
  clientId: z.string().uuid("Select a client."),
  projectId: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.string().uuid("Select a valid project.").nullable()),
  currency: currencyCode,
  taxRate: taxRateText,
  reference: optionalText(120),
  notes: optionalText(4000),
  paymentTerms: optionalText(4000),
  issueDate: dateOrNull,
  dueDate: dateOrNull,
  lines: z.array(invoiceLineSchema).max(100, "An invoice may carry at most 100 line items."),
};

export const invoiceCreateSchema = z
  .object(draftFields)
  .strict()
  .refine(
    (value) =>
      value.issueDate === null || value.dueDate === null || value.dueDate >= value.issueDate,
    { message: "Due date cannot precede the issue date.", path: ["dueDate"] },
  );

export const invoiceEditSchema = z
  .object({
    invoiceId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    ...draftFields,
  })
  .strict()
  .refine(
    (value) =>
      value.issueDate === null || value.dueDate === null || value.dueDate >= value.issueDate,
    { message: "Due date cannot precede the issue date.", path: ["dueDate"] },
  );

export const invoiceIssueSchema = z
  .object({
    invoiceId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    issueDate: requiredDate,
    dueDate: requiredDate,
  })
  .strict()
  .refine((value) => value.dueDate >= value.issueDate, {
    message: "Due date cannot precede the issue date.",
    path: ["dueDate"],
  });

export const invoiceVoidSchema = z
  .object({
    invoiceId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    reason: requiredText(3, 1000),
  })
  .strict();

export const invoiceRefSchema = z
  .object({ invoiceId: z.string().uuid(), expectedVersion: z.number().int().positive() })
  .strict();

export const paymentRecordSchema = z
  .object({
    invoiceId: z.string().uuid(),
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,2})?$/u, "Enter an amount with at most two decimals.")
      .refine((value) => Number.parseFloat(value) > 0, "Amount must be greater than zero."),
    paymentDate: requiredDate,
    paymentMethod: z.enum(paymentMethods),
    reference: optionalText(120),
    note: optionalText(2000),
  })
  .strict();

export const paymentReverseSchema = z
  .object({ paymentId: z.string().uuid(), reason: requiredText(3, 1000) })
  .strict();

function linesFromForm(formData: FormData): InvoiceLineInput[] {
  const raw = formText(formData, "lines");
  if (raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      const line =
        typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
      return {
        description: typeof line["description"] === "string" ? line["description"] : "",
        quantity: typeof line["quantity"] === "string" ? line["quantity"] : "",
        unit_label: typeof line["unit_label"] === "string" ? line["unit_label"] : "",
        unit_price: typeof line["unit_price"] === "string" ? line["unit_price"] : "",
      };
    });
  } catch {
    return [];
  }
}

function draftFromForm(formData: FormData) {
  return {
    clientId: formText(formData, "clientId"),
    projectId: formText(formData, "projectId"),
    currency: formText(formData, "currency"),
    taxRate: formText(formData, "taxRate"),
    reference: formText(formData, "reference"),
    notes: formText(formData, "notes"),
    paymentTerms: formText(formData, "paymentTerms"),
    issueDate: formText(formData, "issueDate"),
    dueDate: formText(formData, "dueDate"),
    lines: linesFromForm(formData),
  };
}

export function invoiceCreateInput(formData: FormData) {
  return invoiceCreateSchema.safeParse(draftFromForm(formData));
}

export function invoiceEditInput(formData: FormData) {
  return invoiceEditSchema.safeParse({
    invoiceId: formText(formData, "invoiceId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    ...draftFromForm(formData),
  });
}

export function invoiceIssueInput(formData: FormData) {
  return invoiceIssueSchema.safeParse({
    invoiceId: formText(formData, "invoiceId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    issueDate: formText(formData, "issueDate"),
    dueDate: formText(formData, "dueDate"),
  });
}

export function invoiceVoidInput(formData: FormData) {
  return invoiceVoidSchema.safeParse({
    invoiceId: formText(formData, "invoiceId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    reason: formText(formData, "reason"),
  });
}

export function invoiceRefInput(formData: FormData) {
  return invoiceRefSchema.safeParse({
    invoiceId: formText(formData, "invoiceId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export function paymentRecordInput(formData: FormData) {
  return paymentRecordSchema.safeParse({
    invoiceId: formText(formData, "invoiceId"),
    amount: formText(formData, "amount"),
    paymentDate: formText(formData, "paymentDate"),
    paymentMethod: formText(formData, "paymentMethod"),
    reference: formText(formData, "reference"),
    note: formText(formData, "note"),
  });
}

export function paymentReverseInput(formData: FormData) {
  return paymentReverseSchema.safeParse({
    paymentId: formText(formData, "paymentId"),
    reason: formText(formData, "reason"),
  });
}

// ---------------------------------------------------------------------
// Read projections
// ---------------------------------------------------------------------

const money = z.union([z.string(), z.number()]);
const moneyNullable = money.nullable();

const financialsSchema = z.object({
  subtotal: money,
  tax_amount: money,
  total: money,
  paid_amount: money,
  balance_due: money,
  payment_state: z.enum(invoicePaymentStates),
  is_overdue: z.boolean(),
});
export type InvoiceFinancials = z.infer<typeof financialsSchema>;

const refSchema = z.object({ id: z.string().uuid(), full_name: z.string() });
const projectRefSchema = z.object({ id: z.string().uuid(), title: z.string() }).nullable();

const invoiceListItemSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string().nullable(),
  reference: z.string().nullable(),
  lifecycle_state: z.enum(invoiceLifecycleStates),
  currency: z.string(),
  issue_date: z.string().nullable(),
  due_date: z.string().nullable(),
  updated_at: z.string(),
  version: z.number().int(),
  archived_at: z.string().nullable(),
  client: refSchema,
  project: projectRefSchema,
  total: money,
  paid_amount: money,
  balance_due: money,
  payment_state: z.enum(invoicePaymentStates),
  is_overdue: z.boolean(),
});
export type InvoiceListItem = z.infer<typeof invoiceListItemSchema>;

export const invoiceListResultSchema = z.object({
  items: z.array(invoiceListItemSchema),
  has_more: z.boolean(),
  next_cursor_updated_at: z.string().nullable(),
  next_cursor_id: z.string().nullable(),
});
export type InvoiceListResult = z.infer<typeof invoiceListResultSchema>;

export const invoiceLineSchemaRead = z.object({
  id: z.string().uuid(),
  description: z.string(),
  quantity: money,
  unit_label: z.string().nullable(),
  unit_price: money,
  line_total: money,
  sort_order: z.number().int(),
});

export const invoiceDocumentSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string().nullable(),
  lifecycle_state: z.enum(invoiceLifecycleStates),
  currency: z.string(),
  tax_rate: money,
  issue_date: z.string().nullable(),
  due_date: z.string().nullable(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  payment_terms: z.string().nullable(),
  voided_at: z.string().nullable(),
  issuer: z
    .object({
      name: z.string(),
      email: z.string().optional(),
      whatsapp: z.string().optional(),
      tax_label: z.string().optional(),
    })
    .nullable(),
  client: z
    .object({
      full_name: z.string(),
      company: z.string().optional(),
      address: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    })
    .nullable(),
  project: z.object({ title: z.string(), id: z.string().optional() }).nullable(),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: money,
      unit_label: z.string().nullable(),
      unit_price: money,
      line_total: money,
    }),
  ),
  subtotal: money,
  tax_amount: money,
  total: money,
  paid_amount: money,
  balance_due: money,
  payment_state: z.enum(invoicePaymentStates),
  is_overdue: z.boolean(),
  payments: z.array(
    z.object({ payment_date: z.string(), amount: money, payment_method: z.enum(paymentMethods) }),
  ),
});
export type InvoiceDocument = z.infer<typeof invoiceDocumentSchema>;

export const invoiceDetailSchema = z.object({
  invoice: z.object({
    id: z.string().uuid(),
    invoice_number: z.string().nullable(),
    reference: z.string().nullable(),
    lifecycle_state: z.enum(invoiceLifecycleStates),
    currency: z.string(),
    tax_rate: money,
    issue_date: z.string().nullable(),
    due_date: z.string().nullable(),
    notes: z.string().nullable(),
    payment_terms: z.string().nullable(),
    version: z.number().int().positive(),
    created_at: z.string(),
    updated_at: z.string(),
    issued_at: z.string().nullable(),
    voided_at: z.string().nullable(),
    void_reason: z.string().nullable(),
    archived_at: z.string().nullable(),
  }),
  client: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    company: z.string().nullable(),
    email: z.string().nullable(),
    phone_display: z.string().nullable(),
    archived_at: z.string().nullable(),
  }),
  project: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      status: z.string(),
      archived_at: z.string().nullable(),
    })
    .nullable(),
  lines: z.array(invoiceLineSchemaRead),
  financials: financialsSchema,
  payments: z.array(
    z.object({
      id: z.string().uuid(),
      amount: money,
      payment_date: z.string(),
      payment_method: z.enum(paymentMethods),
      reference: z.string().nullable(),
      note: z.string().nullable(),
      created_at: z.string(),
      recorded_by: z.string().nullable(),
      reversed_at: z.string().nullable(),
      reversal_reason: z.string().nullable(),
      reversed_by: z.string().nullable(),
    }),
  ),
  share: z.object({ created_at: z.string(), created_by: z.string().nullable() }).nullable(),
  document: invoiceDocumentSchema.nullable(),
  activity: z.array(
    z.object({
      action: z.string(),
      outcome: z.string(),
      occurred_at: z.string(),
      actor: z.string().nullable(),
      metadata: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
});
export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;

const currencyTotalSchema = z.object({
  currency: z.string(),
  total: money,
  invoice_count: z.number().int().optional(),
  payment_count: z.number().int().optional(),
});

export const financeOverviewSchema = z.object({
  due_soon_window_days: z.number().int(),
  recent_window_days: z.number().int(),
  draft_count: z.number().int(),
  issued_count: z.number().int(),
  void_count: z.number().int(),
  overdue_count: z.number().int(),
  partially_paid_count: z.number().int(),
  due_soon_count: z.number().int(),
  outstanding_by_currency: z.array(currencyTotalSchema),
  overdue_by_currency: z.array(currencyTotalSchema),
  invoiced_by_currency: z.array(currencyTotalSchema),
  paid_recently_by_currency: z.array(currencyTotalSchema),
  due_soon: z.array(
    z.object({
      id: z.string().uuid(),
      invoice_number: z.string().nullable(),
      currency: z.string(),
      balance_due: money,
      due_date: z.string(),
    }),
  ),
  recent_payments: z.array(
    z.object({
      id: z.string().uuid(),
      invoice_id: z.string().uuid(),
      invoice_number: z.string().nullable(),
      currency: z.string(),
      amount: money,
      payment_date: z.string(),
      payment_method: z.enum(paymentMethods),
    }),
  ),
});
export type FinanceOverview = z.infer<typeof financeOverviewSchema>;

export const financeActionQueueSchema = z.array(
  z.object({
    kind: z.enum(["overdue", "overdue_partially_paid", "due_soon", "stale_draft"]),
    invoice_id: z.string().uuid(),
    label: z.string(),
    detail: z.string(),
    currency: z.string(),
    amount: moneyNullable,
  }),
);
export type FinanceActionQueueItem = z.infer<typeof financeActionQueueSchema>[number];

export const relationshipInvoicesSchema = z.object({
  invoices: z.array(
    z.object({
      id: z.string().uuid(),
      invoice_number: z.string().nullable(),
      lifecycle_state: z.enum(invoiceLifecycleStates),
      currency: z.string(),
      issue_date: z.string().nullable(),
      due_date: z.string().nullable(),
      total: money,
      paid_amount: money,
      balance_due: money,
      payment_state: z.enum(invoicePaymentStates),
      is_overdue: z.boolean(),
      project: projectRefSchema,
    }),
  ),
  summary_by_currency: z.array(
    z.object({
      currency: z.string(),
      invoiced: money,
      paid: money,
      outstanding: money,
      invoice_count: z.number().int(),
    }),
  ),
});
export type RelationshipInvoices = z.infer<typeof relationshipInvoicesSchema>;

export const invoiceActivityLabels: Readonly<Record<string, string>> = {
  "invoice.create": "Draft created",
  "invoice.update": "Draft updated",
  "invoice.issue": "Invoice issued",
  "invoice.void": "Invoice voided",
  "invoice.archive": "Draft archived",
  "invoice.share_create": "Client link generated",
  "invoice.share_revoke": "Client link revoked",
  "invoice.payment_record": "Payment recorded",
  "invoice.payment_reverse": "Payment reversed",
  "invoice.paid": "Invoice paid",
};

export { zodFieldErrors };
