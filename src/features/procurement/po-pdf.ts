import "server-only";

import {
  renderBusinessDocument,
  type BusinessDocumentModel,
} from "@/features/documents/pdf-engine";
import { formatMoney, formatQuantity } from "@/features/invoices/invoice-contract";
import { deliveryStateLabels, type PoDocument } from "@/features/procurement/procurement-contract";

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

/**
 * Purchase order in the shared RENZ document family (D1.5 §70): same grid,
 * brand and totals as the invoice, its own identity (PURCHASE ORDER),
 * supplier as the counterparty and delivery state instead of payment state.
 */
export function purchaseOrderDocumentModel(document: PoDocument): BusinessDocumentModel {
  const currency = document.currency;
  const isCancelled = document.lifecycle_state === "cancelled";
  const isDraft = document.lifecycle_state === "draft";
  const issuerName = document.issuer?.name ?? "RENZ Construction Services Ltd";
  const issuerLines = [
    document.issuer?.email,
    document.issuer?.whatsapp ? `WhatsApp ${document.issuer.whatsapp}` : undefined,
  ].filter((line): line is string => Boolean(line));
  const stateLabel = isCancelled
    ? "Cancelled"
    : isDraft
      ? "Internal review copy"
      : document.lifecycle_state === "closed"
        ? "Closed"
        : deliveryStateLabels[document.delivery_state];
  const received = document.lines.some((line) => Number(line.received_quantity) > 0);

  return {
    kind: isDraft ? "Draft purchase order" : "Purchase order",
    number: document.purchase_order_number,
    numberFallback: isDraft ? "DRAFT — NOT ISSUED" : "PURCHASE ORDER",
    state: { label: stateLabel, tone: isCancelled ? "danger" : isDraft ? "muted" : "gold" },
    stamp: isCancelled ? "CANCELLED" : isDraft ? "DRAFT" : null,
    banner: isCancelled
      ? {
          text: "CANCELLED — this order was withdrawn. Nothing is to be supplied against it.",
          tone: "danger",
        }
      : isDraft
        ? { text: "DRAFT — for internal review only. Not an issued order.", tone: "muted" }
        : null,
    issuer: { name: issuerName, lines: issuerLines },
    parties: [
      {
        label: "Supplier",
        name: document.supplier?.display_name ?? "—",
        lines: [
          document.supplier?.company_name,
          document.supplier?.contact_name,
          document.supplier?.address,
          document.supplier?.email,
          document.supplier?.phone,
        ].filter((line): line is string => Boolean(line)),
      },
      { label: "Ordered by", name: issuerName, lines: issuerLines },
    ],
    meta: [
      { label: "Issue date", value: formatDate(document.issue_date) },
      { label: "Expected delivery", value: formatDate(document.expected_delivery_date) },
      { label: "Currency", value: currency },
      ...(document.project ? [{ label: "Project", value: document.project.title }] : []),
      ...(document.reference ? [{ label: "Reference", value: document.reference }] : []),
    ],
    lineColumns: { quantity: "Qty", unit: "Unit", unitPrice: "Unit price", total: "Amount" },
    lines: document.lines.map((line) => ({
      description: received
        ? `${line.description}  (received ${formatQuantity(line.received_quantity)})`
        : line.description,
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
      { label: "Order total", value: formatMoney(document.total, currency), emphasis: "final" },
    ],
    sections: [
      ...(document.terms ? [{ heading: "Terms", body: document.terms }] : []),
      ...(document.notes ? [{ heading: "Notes", body: document.notes }] : []),
    ],
    footer: `${issuerName}${document.issuer?.email ? ` · ${document.issuer.email}` : ""}`,
    title: `Purchase order ${document.purchase_order_number ?? "(draft)"}`,
    author: issuerName,
  };
}

export async function renderPurchaseOrderPdf(document: PoDocument): Promise<Buffer> {
  return renderBusinessDocument(purchaseOrderDocumentModel(document));
}
