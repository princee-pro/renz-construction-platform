import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  formatMoney,
  invoiceStatus,
  type InvoiceListResult,
} from "@/features/invoices/invoice-contract";
import type { InvoiceListFilters } from "@/features/invoices/invoice-data";

export function invoiceListUrl(
  filters: InvoiceListFilters,
  cursor?: Readonly<{ u: string; i: string }>,
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.clientId) params.set("client", filters.clientId);
  if (filters.projectId) params.set("project", filters.projectId);
  if (filters.lifecycle) params.set("lifecycle", filters.lifecycle);
  if (filters.payment) params.set("payment", filters.payment);
  if (filters.overdue) params.set("overdue", "1");
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.issuedFrom) params.set("from", filters.issuedFrom);
  if (filters.issuedTo) params.set("to", filters.issuedTo);
  if (filters.includeArchived) params.set("archived", "1");
  if (cursor) {
    params.set("cu", cursor.u);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  return query ? `/admin/finance/invoices?${query}` : "/admin/finance/invoices";
}

export function isInvoiceListFiltered(filters: InvoiceListFilters): boolean {
  return Boolean(
    filters.search ||
    filters.clientId ||
    filters.projectId ||
    filters.lifecycle ||
    filters.payment ||
    filters.overdue ||
    filters.currency ||
    filters.issuedFrom ||
    filters.issuedTo ||
    filters.includeArchived,
  );
}

function shortDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function InvoiceList({
  result,
  filters,
  canWrite,
}: Readonly<{ result: InvoiceListResult; filters: InvoiceListFilters; canWrite: boolean }>) {
  const filtered = isInvoiceListFiltered(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/finance/invoices">
              Clear filters
            </Link>
          ) : canWrite ? (
            <Link className="button button-primary" href="/admin/finance/invoices/new">
              Create the first invoice
            </Link>
          ) : null
        }
        title={filtered ? "No invoices match these filters" : "No invoices yet"}
      >
        {filtered
          ? "Widen the search or clear the filters to see the full register."
          : "Invoices start as drafts, receive an official RENZ number when issued, and track payments until the balance reaches zero."}
      </EmptyState>
    );
  }

  return (
    <>
      <div aria-hidden="true" className="invoice-register-heading">
        <span>Invoice</span>
        <span>Client</span>
        <span>Project</span>
        <span>Issued</span>
        <span>Due</span>
        <span>Total</span>
        <span>Paid</span>
        <span>Balance</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      <ol className="invoice-register">
        {result.items.map((item) => {
          const status = invoiceStatus(item);
          return (
            <li key={item.id}>
              <div className="invoice-register-identity">
                <Link href={`/admin/finance/invoices/${item.id}`}>
                  {item.invoice_number ?? "DRAFT"}
                </Link>
                <span>{item.reference ?? item.currency}</span>
              </div>
              <span data-label="Client">
                <Link href={`/admin/operations/clients/${item.client.id}`}>
                  {item.client.full_name}
                </Link>
              </span>
              <span data-label="Project">
                {item.project ? (
                  <Link href={`/admin/operations/projects/${item.project.id}`}>
                    {item.project.title}
                  </Link>
                ) : (
                  "—"
                )}
              </span>
              <span data-label="Issued">{shortDate(item.issue_date)}</span>
              <span data-label="Due">{shortDate(item.due_date)}</span>
              <span className="numeric" data-label="Total">
                {formatMoney(item.total, item.currency)}
              </span>
              <span className="numeric" data-label="Paid">
                {formatMoney(item.paid_amount, item.currency)}
              </span>
              <span className="numeric" data-label="Balance">
                {item.lifecycle_state === "void"
                  ? "—"
                  : formatMoney(item.balance_due, item.currency)}
              </span>
              <div data-label="Status">
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <Link
                className="invoice-register-action text-link"
                data-label="Action"
                href={`/admin/finance/invoices/${item.id}`}
              >
                Open
              </Link>
            </li>
          );
        })}
      </ol>
      <nav aria-label="Invoices pagination" className="pagination">
        {filters.cursorUpdatedAt ? (
          <Link className="button button-quiet" href={invoiceListUrl(filters)}>
            Back to first page
          </Link>
        ) : null}
        {result.has_more && result.next_cursor_updated_at && result.next_cursor_id ? (
          <Link
            className="button button-secondary"
            href={invoiceListUrl(filters, {
              u: result.next_cursor_updated_at,
              i: result.next_cursor_id,
            })}
          >
            Next page
          </Link>
        ) : (
          <span className="pagination-end">End of register</span>
        )}
      </nav>
    </>
  );
}
