import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  assignmentStatusLabels,
  assignmentStatusTone,
  paymentStateLabels,
  paymentStateTone,
  type PayablesResult,
} from "@/features/assignments/assignment-contract";
import type { PayablesFilters } from "@/features/assignments/assignment-data";
import { formatMoney } from "@/features/invoices/invoice-contract";

export function payablesListUrl(
  filters: PayablesFilters,
  cursor?: Readonly<{ u: string; i: string }>,
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.partnerId) params.set("partner", filters.partnerId);
  if (filters.projectId) params.set("project", filters.projectId);
  if (filters.status) params.set("status", filters.status);
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.payment) params.set("payment", filters.payment);
  if (cursor) {
    params.set("cu", cursor.u);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  return query
    ? `/admin/finance/contractor-payables?${query}`
    : "/admin/finance/contractor-payables";
}

export function isPayablesFiltered(filters: PayablesFilters): boolean {
  return Boolean(
    filters.search ||
    filters.partnerId ||
    filters.projectId ||
    filters.status ||
    filters.currency ||
    filters.payment,
  );
}

function shortDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
  );
}

/** Contractor Payables register: one row per assignment with an agreed amount. */
export function PayablesList({
  result,
  filters,
}: Readonly<{ result: PayablesResult; filters: PayablesFilters }>) {
  const filtered = isPayablesFiltered(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/finance/contractor-payables">
              Clear filters
            </Link>
          ) : (
            <Link className="button button-secondary" href="/admin/operations/contractors">
              Open contractors
            </Link>
          )
        }
        title={filtered ? "No payables match these filters" : "No contractor payables yet"}
      >
        {filtered
          ? "Widen the search or clear a filter to see more assignments."
          : "Payables appear once a contractor assignment carries an agreed amount. Assign a contractor from a project and set the agreed amount to start tracking what is owed."}
      </EmptyState>
    );
  }

  return (
    <>
      <div aria-hidden="true" className="payables-register-heading">
        <span>Contractor</span>
        <span>Project · scope</span>
        <span>Agreed</span>
        <span>Paid</span>
        <span>Remaining</span>
        <span>Status</span>
        <span>Last payment</span>
        <span>Action</span>
      </div>
      <ol className="payables-register">
        {result.items.map((item) => {
          const currency = item.currency ?? "";
          return (
            <li key={item.id}>
              <div className="payables-register-identity">
                <Link href={`/admin/operations/contractors/${item.partner.id}`}>
                  {item.partner.display_name}
                </Link>
                <span>{currency}</span>
              </div>
              <div className="payables-register-scope" data-label="Project · scope">
                <Link href={`/admin/operations/projects/${item.project.id}`}>
                  {item.project.title}
                </Link>
                <span>{item.scope}</span>
              </div>
              <span data-label="Agreed">
                {item.agreed_amount !== null && currency
                  ? formatMoney(item.agreed_amount, currency)
                  : "—"}
              </span>
              <span data-label="Paid">
                {currency ? formatMoney(item.paid_amount, currency) : "—"}
              </span>
              <span
                className={
                  item.remaining_amount !== null &&
                  Number.parseFloat(String(item.remaining_amount)) > 0
                    ? "metric-attention"
                    : undefined
                }
                data-label="Remaining"
              >
                {item.remaining_amount !== null && currency
                  ? formatMoney(item.remaining_amount, currency)
                  : "—"}
              </span>
              <span className="badge-stack" data-label="Status">
                <StatusBadge tone={assignmentStatusTone(item.status)}>
                  {assignmentStatusLabels[item.status]}
                </StatusBadge>
                <StatusBadge tone={paymentStateTone(item.payment_state)}>
                  {paymentStateLabels[item.payment_state]}
                </StatusBadge>
              </span>
              <span data-label="Last payment">{shortDate(item.last_payment_date)}</span>
              <Link
                className="payables-register-action text-link"
                data-label="Action"
                href={`/admin/operations/assignments/${item.id}`}
              >
                Open
              </Link>
            </li>
          );
        })}
      </ol>
      <nav aria-label="Payables pagination" className="pagination">
        {filters.cursorUpdatedAt ? (
          <Link className="button button-quiet" href={payablesListUrl(filters)}>
            Back to first page
          </Link>
        ) : null}
        {result.has_more && result.next_cursor_updated_at && result.next_cursor_id ? (
          <Link
            className="button button-secondary"
            href={payablesListUrl(filters, {
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
