import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import { CurrencyRegister } from "@/features/invoices/components/currency-register";
import {
  deliveryQueueHref,
  deliveryQueueLabels,
  type DeliveryOverview,
  type DeliveryQueueItem,
} from "@/features/procurement/procurement-contract";

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  );
}

/**
 * Control Room delivery module (C6): contractors, purchase orders and
 * deliveries at a glance, per-currency money only, plus the deterministic
 * delivery action queue. Every count is null when the viewer lacks the
 * matching read permission; the facade omits rather than denies.
 */
export function DeliveryOverviewSection({
  overview,
  queue,
}: Readonly<{ overview: DeliveryOverview; queue: readonly DeliveryQueueItem[] }>) {
  const canPartners = overview.active_assignment_count !== null;
  const canOrders = overview.open_order_count !== null;
  const canMaterials = overview.requirements_due_soon !== null;
  const attention =
    (overview.delayed_order_count ?? 0) +
    (overview.assignments_ending_soon ?? 0) +
    (overview.requirements_due_soon ?? 0);

  return (
    <section aria-labelledby="delivery-heading" className="overview-section">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Delivery</p>
          <h2 id="delivery-heading">Contractors, orders &amp; deliveries</h2>
        </div>
        <div className="page-actions">
          {canPartners ? (
            <Link className="text-link" href="/admin/operations/contractors">
              Open Contractors
            </Link>
          ) : null}
          {canOrders ? (
            <Link className="text-link" href="/admin/procurement/orders">
              Open Purchase Orders
            </Link>
          ) : null}
          {canPartners ? (
            <Link className="text-link" href="/admin/finance/contractor-payables">
              Open Payables
            </Link>
          ) : null}
        </div>
      </div>
      <dl className="metric-register">
        {canPartners ? (
          <>
            <div>
              <dt>Active contractors</dt>
              <dd>{overview.active_contractor_count ?? 0}</dd>
            </div>
            <div>
              <dt>Active assignments</dt>
              <dd>{overview.active_assignment_count ?? 0}</dd>
            </div>
            <div
              className={
                (overview.assignments_ending_soon ?? 0) > 0 ? "metric-attention" : undefined
              }
            >
              <dt>Ending in {overview.assignment_soon_window_days} days</dt>
              <dd>{overview.assignments_ending_soon ?? 0}</dd>
            </div>
          </>
        ) : null}
        {canOrders ? (
          <>
            <div>
              <dt>Open purchase orders</dt>
              <dd>{overview.open_order_count ?? 0}</dd>
            </div>
            <div
              className={(overview.delayed_order_count ?? 0) > 0 ? "metric-attention" : undefined}
            >
              <dt>Delayed deliveries</dt>
              <dd>{overview.delayed_order_count ?? 0}</dd>
            </div>
            <div>
              <dt>Expected in {overview.po_soon_window_days} days</dt>
              <dd>{overview.orders_expected_soon ?? 0}</dd>
            </div>
          </>
        ) : null}
        {canMaterials ? (
          <div
            className={(overview.requirements_due_soon ?? 0) > 0 ? "metric-attention" : undefined}
          >
            <dt>Materials due in {overview.material_soon_window_days} days</dt>
            <dd>{overview.requirements_due_soon ?? 0}</dd>
          </div>
        ) : null}
      </dl>
      <div className="overview-grid">
        {canPartners ? (
          <CurrencyRegister
            countLabel="assignments"
            emptyText="Nothing owed to contractors."
            heading="Owed to contractors by currency"
            headingId="overview-contractor-outstanding-heading"
            rows={(overview.contractor_outstanding_by_currency ?? []).map((row) => ({
              currency: row.currency,
              total: row.total,
              invoice_count: row.assignment_count,
            }))}
            tone={
              (overview.contractor_outstanding_by_currency ?? []).length > 0
                ? "attention"
                : "neutral"
            }
          />
        ) : null}
        {canOrders ? (
          <CurrencyRegister
            countLabel="orders"
            emptyText="No issued orders awaiting delivery."
            heading="Open order value by currency"
            headingId="overview-open-order-heading"
            rows={(overview.open_order_value_by_currency ?? []).map((row) => ({
              currency: row.currency,
              total: row.total,
              invoice_count: row.order_count,
            }))}
          />
        ) : null}
        {canOrders ? (
          <section aria-labelledby="overview-receipts-heading" className="admin-panel">
            <div className="section-heading-row section-heading-compact">
              <h2 id="overview-receipts-heading">Recent deliveries</h2>
              <StatusBadge tone={attention > 0 ? "blocked" : "ready"}>
                {attention > 0 ? "Attention" : "Current"}
              </StatusBadge>
            </div>
            {(overview.recent_receipts ?? []).length === 0 ? (
              <p className="quiet-empty">No deliveries recorded yet.</p>
            ) : (
              <ul className="activity-list">
                {(overview.recent_receipts ?? []).map((receipt) => (
                  <li key={receipt.id}>
                    <div>
                      <strong>
                        <Link href={`/admin/procurement/orders/${receipt.purchase_order_id}`}>
                          {receipt.purchase_order_number ?? "Order"}
                        </Link>{" "}
                        · {receipt.supplier}
                      </strong>
                      <span>
                        {receipt.project} · {shortDate(receipt.received_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
      <section aria-labelledby="delivery-queue-heading" className="activity-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Deterministic, no urgency scoring</p>
            <h2 id="delivery-queue-heading">Delivery action queue</h2>
          </div>
        </div>
        {queue.length > 0 ? (
          <ul className="action-queue-list">
            {queue.map((item, index) => (
              <li key={`${item.kind}-${item.id}-${index}`}>
                <Link href={deliveryQueueHref(item)}>{item.label ?? "Open"}</Link>
                <span>
                  {deliveryQueueLabels[item.kind]}
                  {item.detail ? ` · ${item.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-empty">No contractor, material or delivery items need action.</p>
        )}
      </section>
    </section>
  );
}
