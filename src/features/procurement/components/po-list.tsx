import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { formatMoney, formatQuantity } from "@/features/invoices/invoice-contract";
import {
  purchaseOrderStatus,
  type PoListResult,
} from "@/features/procurement/procurement-contract";
import type { PoListFilters } from "@/features/procurement/procurement-data";

export function poListUrl(
  filters: PoListFilters,
  cursor?: Readonly<{ u: string; i: string }>,
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.supplierId) params.set("supplier", filters.supplierId);
  if (filters.projectId) params.set("project", filters.projectId);
  if (filters.lifecycle) params.set("lifecycle", filters.lifecycle);
  if (filters.delivery) params.set("delivery", filters.delivery);
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.delayed) params.set("delayed", "1");
  if (filters.issuedFrom) params.set("from", filters.issuedFrom);
  if (filters.issuedTo) params.set("to", filters.issuedTo);
  if (cursor) {
    params.set("cu", cursor.u);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  return query ? `/admin/procurement/orders?${query}` : "/admin/procurement/orders";
}

export function isPoListFiltered(filters: PoListFilters): boolean {
  return Boolean(
    filters.search ||
    filters.supplierId ||
    filters.projectId ||
    filters.lifecycle ||
    filters.delivery ||
    filters.currency ||
    filters.delayed ||
    filters.issuedFrom ||
    filters.issuedTo,
  );
}

function shortDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function PurchaseOrderList({
  result,
  filters,
  canWrite,
}: Readonly<{ result: PoListResult; filters: PoListFilters; canWrite: boolean }>) {
  const filtered = isPoListFiltered(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/procurement/orders">
              Clear filters
            </Link>
          ) : canWrite ? (
            <Link className="button button-primary" href="/admin/procurement/orders/new">
              Create the first purchase order
            </Link>
          ) : null
        }
        title={filtered ? "No purchase orders match these filters" : "No purchase orders yet"}
      >
        {filtered
          ? "Widen the search or clear the filters to see the full register."
          : "Purchase orders start as drafts, receive an official RENZ-PO number when issued, and track deliveries until every line is received or the order is closed."}
      </EmptyState>
    );
  }

  return (
    <>
      <div aria-hidden="true" className="invoice-register-heading po-register-heading">
        <span>Order</span>
        <span>Supplier</span>
        <span>Project</span>
        <span>Issued</span>
        <span>Expected</span>
        <span>Total</span>
        <span>Received</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      <ol className="invoice-register po-register">
        {result.items.map((item) => {
          const status = purchaseOrderStatus(item);
          return (
            <li key={item.id}>
              <div className="invoice-register-identity">
                <Link href={`/admin/procurement/orders/${item.id}`}>
                  {item.purchase_order_number ?? "DRAFT"}
                </Link>
                <span>{item.reference ?? item.currency}</span>
              </div>
              <span data-label="Supplier">
                <Link href={`/admin/procurement/suppliers/${item.supplier.id}`}>
                  {item.supplier.display_name}
                </Link>
              </span>
              <span data-label="Project">
                <Link href={`/admin/operations/projects/${item.project.id}`}>
                  {item.project.title}
                </Link>
              </span>
              <span data-label="Issued">{shortDate(item.issue_date)}</span>
              <span
                className={item.is_delayed ? "metric-attention" : undefined}
                data-label="Expected"
              >
                {shortDate(item.expected_delivery_date)}
              </span>
              <span className="numeric" data-label="Total">
                {formatMoney(item.total, item.currency)}
              </span>
              <span className="numeric" data-label="Received">
                {formatQuantity(item.received_quantity)} / {formatQuantity(item.ordered_quantity)}
              </span>
              <div data-label="Status">
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <Link
                className="invoice-register-action text-link"
                data-label="Action"
                href={`/admin/procurement/orders/${item.id}`}
              >
                Open
              </Link>
            </li>
          );
        })}
      </ol>
      <nav aria-label="Purchase orders pagination" className="pagination">
        {filters.cursorUpdatedAt ? (
          <Link className="button button-quiet" href={poListUrl(filters)}>
            Back to first page
          </Link>
        ) : null}
        {result.has_more && result.next_cursor_updated_at && result.next_cursor_id ? (
          <Link
            className="button button-secondary"
            href={poListUrl(filters, {
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
