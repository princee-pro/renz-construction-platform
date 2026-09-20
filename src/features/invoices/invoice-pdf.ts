import "server-only";

import {
  renderBusinessDocument,
  type BusinessDocumentModel,
  type DocumentSection,
} from "@/features/documents/pdf-engine";
import {
  formatMoney,
  formatQuantity,
  invoicePaymentStateLabels,
  paymentMethodLabels,
  type InvoiceDocument,
} from "@/features/invoices/invoice-contract";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function rate(value: string | number): string {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(numeric)}%`;
}

function issuerLines(document: InvoiceDocument): string[] {
  return [
    document.issuer?.email,
    document.issuer?.whatsapp ? `WhatsApp ${document.issuer.whatsapp}` : undefined,
  ].filter((line): line is string => Boolean(line));
}

/**
 * Maps the invoice document model (issued snapshot, void snapshot, or the
 * staff-only draft preview) onto the shared RENZ document family. The
 * financial figures are the RPC's own; nothing is recomputed here.
 */
export function invoiceDocumentModel(document: InvoiceDocument): BusinessDocumentModel {
  const currency = document.currency;
  const isVoid = document.lifecycle_state === "void";
  const isDraft = document.lifecycle_state === "draft";
  const issuerName = document.issuer?.name ?? "RENZ Construction Services Ltd";
  const stateLabel = isDraft
    ? "Internal review copy"
    : isVoid
      ? "Void"
      : document.is_overdue
        ? "Overdue"
        : invoicePaymentStateLabels[document.payment_state];
  const tone = isVoid || document.is_overdue ? "danger" : isDraft ? "muted" : "gold";

  const sections: DocumentSection[] = [];
  if (document.payments.length > 0) {
    sections.push({
      heading: "Payments received",
      rows: document.payments.map((payment) => [
        formatDate(payment.payment_date),
        paymentMethodLabels[payment.payment_method],
        formatMoney(payment.amount, currency),
      ]),
    });
  }
  if (document.payment_terms)
    sections.push({ heading: "Payment terms", body: document.payment_terms });
  if (document.notes) sections.push({ heading: "Notes", body: document.notes });
  if (isDraft) {
    sections.push({
      heading: "Draft status",
      body: "This document is a draft prepared for internal review. It carries no official invoice number, is not payable, and may change before issue. The issued invoice will replace it.",
    });
  }

  return {
    kind: isDraft ? "Draft invoice" : "Invoice",
    number: document.invoice_number,
    numberFallback: isDraft ? "DRAFT — NOT ISSUED" : "INVOICE",
    state: { label: stateLabel, tone },
    stamp: isDraft ? "DRAFT" : isVoid ? "VOID" : null,
    banner: isVoid
      ? {
          text: "VOID — this invoice was cancelled. No amount is payable against it.",
          tone: "danger",
        }
      : isDraft
        ? { text: "DRAFT — for internal review only. Not an issued invoice.", tone: "muted" }
        : null,
    issuer: { name: issuerName, lines: issuerLines(document) },
    parties: [
      {
        label: "Bill to",
        name: document.client?.full_name ?? "—",
        lines: [
          document.client?.company,
          document.client?.address,
          document.client?.email,
          document.client?.phone,
        ].filter((line): line is string => Boolean(line)),
      },
      {
        label: "Issued by",
        name: issuerName,
        lines: issuerLines(document),
      },
    ],
    meta: [
      { label: "Issue date", value: formatDate(document.issue_date) },
      { label: "Due date", value: formatDate(document.due_date) },
      { label: "Currency", value: currency },
      ...(document.project ? [{ label: "Project", value: document.project.title }] : []),
      ...(document.reference ? [{ label: "Reference", value: document.reference }] : []),
    ],
    lines: document.lines.map((line) => ({
      description: line.description,
      quantity: formatQuantity(line.quantity),
      unit: line.unit_label ?? "—",
      unitPrice: formatMoney(line.unit_price, currency),
      total: formatMoney(line.line_total, currency),
    })),
    totals: [
      { label: "Subtotal", value: formatMoney(document.subtotal, currency) },
      {
        label: `${document.issuer?.tax_label ?? "Tax"} (${rate(document.tax_rate)})`,
        value: formatMoney(document.tax_amount, currency),
      },
      { label: "Total", value: formatMoney(document.total, currency), emphasis: "strong" },
      { label: "Amount paid", value: formatMoney(document.paid_amount, currency) },
      {
        label: "Balance due",
        value: isVoid ? formatMoney(0, currency) : formatMoney(document.balance_due, currency),
        emphasis: "final",
      },
    ],
    sections,
    footer: `${issuerName}${document.issuer?.email ? ` · ${document.issuer.email}` : ""}`,
    title: isDraft ? "Draft invoice (not issued)" : `Invoice ${document.invoice_number ?? ""}`,
    author: issuerName,
  };
}

/** Renders any invoice document state (draft preview, issued, void) to PDF. */
export async function renderInvoicePdf(document: InvoiceDocument): Promise<Buffer> {
  return renderBusinessDocument(invoiceDocumentModel(document));
}

export type ReceiptInput = Readonly<{
  document: InvoiceDocument;
  payment: Readonly<{
    payment_date: string;
    amount: string | number;
    payment_method: keyof typeof paymentMethodLabels;
    reference?: string | null;
    reversed_at?: string | null;
  }>;
}>;

/** Compact payment receipt in the same document family (C5 receipts, D1.5 §69). */
export async function renderPaymentReceiptPdf({
  document,
  payment,
}: ReceiptInput): Promise<Buffer> {
  const currency = document.currency;
  const issuerName = document.issuer?.name ?? "RENZ Construction Services Ltd";
  const reversed = Boolean(payment.reversed_at);
  return renderBusinessDocument({
    kind: "Payment receipt",
    number: document.invoice_number,
    numberFallback: "RECEIPT",
    state: { label: reversed ? "Reversed" : "Received", tone: reversed ? "danger" : "ok" },
    stamp: reversed ? "REVERSED" : null,
    banner: reversed
      ? {
          text: "REVERSED — this payment record was reversed and no longer counts.",
          tone: "danger",
        }
      : null,
    issuer: { name: issuerName, lines: issuerLines(document) },
    parties: [
      {
        label: "Received from",
        name: document.client?.full_name ?? "—",
        lines: [document.client?.company, document.client?.email].filter((line): line is string =>
          Boolean(line),
        ),
      },
      { label: "Against invoice", name: document.invoice_number ?? "—", lines: [] },
    ],
    meta: [
      { label: "Payment date", value: formatDate(payment.payment_date) },
      { label: "Method", value: paymentMethodLabels[payment.payment_method] },
      { label: "Currency", value: currency },
      ...(payment.reference ? [{ label: "Reference", value: payment.reference }] : []),
    ],
    lines: [],
    totals: [
      { label: "Amount received", value: formatMoney(payment.amount, currency), emphasis: "final" },
      { label: "Invoice total", value: formatMoney(document.total, currency) },
      { label: "Paid to date", value: formatMoney(document.paid_amount, currency) },
      {
        label: "Remaining balance",
        value: formatMoney(document.balance_due, currency),
        emphasis: "strong",
      },
    ],
    sections: [],
    footer: `${issuerName}${document.issuer?.email ? ` · ${document.issuer.email}` : ""}`,
    title: `Payment receipt ${document.invoice_number ?? ""}`,
    author: issuerName,
  });
}
