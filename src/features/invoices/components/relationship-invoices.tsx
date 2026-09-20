import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  formatMoney,
  invoiceStatus,
  type RelationshipInvoices,
} from "@/features/invoices/invoice-contract";

function shortDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

/**
 * Invoices tab shared by Client 360 and the Project Command Center: a
 * per-currency summary (invoiced / paid / outstanding — never combined) and
 * the bounded invoice list, with the relationship-first Create Invoice entry.
 */
export function RelationshipInvoicesPanel({
  data,
  createHref,
  canWrite,
  scopeLabel,
}: Readonly<{
  data: RelationshipInvoices | null;
  createHref: string;
  canWrite: boolean;
  scopeLabel: string;
}>) {
  if (!data) {
    return <p className="quiet-empty">Invoices could not be loaded for this {scopeLabel}.</p>;
  }
  return (
    <div className="notes-workspace">
      {canWrite ? (
        <div className="form-actions form-actions-start">
          <Link className="button button-primary" href={createHref}>
            Create Invoice
          </Link>
        </div>
      ) : null}
      {data.summary_by_currency.length > 0 ? (
        <div className="relationship-finance-grid">
          {data.summary_by_currency.map((row) => (
            <dl className="metric-register invoice-money-register" key={row.currency}>
              <div>
                <dt>{row.currency} invoiced</dt>
                <dd>{formatMoney(row.invoiced, row.currency)}</dd>
              </div>
              <div>
                <dt>{row.currency} paid</dt>
                <dd>{formatMoney(row.paid, row.currency)}</dd>
              </div>
              <div
                className={
                  Number.parseFloat(String(row.outstanding)) > 0 ? "metric-attention" : undefined
                }
              >
                <dt>{row.currency} outstanding</dt>
                <dd>{formatMoney(row.outstanding, row.currency)}</dd>
              </div>
            </dl>
          ))}
        </div>
      ) : null}
      {data.invoices.length === 0 ? (
        <p className="quiet-empty">No invoices yet for this {scopeLabel}.</p>
      ) : (
        <ol className="relationship-invoice-list">
          {data.invoices.map((invoice) => {
            const status = invoiceStatus(invoice);
            return (
              <li key={invoice.id}>
                <div>
                  <Link href={`/admin/finance/invoices/${invoice.id}`}>
                    {invoice.invoice_number ?? "DRAFT"}
                  </Link>
                  <span>
                    {invoice.project ? `${invoice.project.title} · ` : ""}
                    Issued {shortDate(invoice.issue_date)} · Due {shortDate(invoice.due_date)}
                  </span>
                </div>
                <span data-label="Total">{formatMoney(invoice.total, invoice.currency)}</span>
                <span data-label="Paid">{formatMoney(invoice.paid_amount, invoice.currency)}</span>
                <span data-label="Balance">
                  {invoice.lifecycle_state === "void"
                    ? "—"
                    : formatMoney(invoice.balance_due, invoice.currency)}
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
