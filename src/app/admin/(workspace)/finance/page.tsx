import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { CurrencyRegister } from "@/features/invoices/components/currency-register";
import { formatMoney, paymentMethodLabels } from "@/features/invoices/invoice-contract";
import { loadFinanceActionQueue, loadFinanceOverview } from "@/features/invoices/invoice-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance | RENZ Administration",
  robots: { index: false, follow: false },
};

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export default async function FinanceOverviewPage() {
  await requirePermission("finance.invoices.read");
  const [overview, queue, access] = await Promise.all([
    loadFinanceOverview(),
    loadFinanceActionQueue(12),
    getCurrentAdminAccess(),
  ]);
  const canWrite = access.permissions.includes("finance.invoices.write");

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Finance" }]} />
      <PageHeader
        actions={
          <>
            <Link className="button button-secondary" href="/admin/finance/invoices">
              Open Invoices
            </Link>
            {canWrite ? (
              <Link className="button button-primary" href="/admin/finance/invoices/new">
                New invoice
              </Link>
            ) : null}
          </>
        }
        description="Invoiced, paid, and outstanding — always per currency. An issued invoice is not collected revenue, so nothing here is labelled revenue."
        eyebrow="Finance"
        status={<RealtimeRefresh entityTypes={["invoice"]} />}
        title="Finance"
      />

      <dl className="metric-register">
        <div>
          <dt>Issued invoices</dt>
          <dd>{overview.issued_count}</dd>
        </div>
        <div>
          <dt>Drafts</dt>
          <dd>{overview.draft_count}</dd>
        </div>
        <div className={overview.overdue_count > 0 ? "metric-attention" : undefined}>
          <dt>Overdue</dt>
          <dd>{overview.overdue_count}</dd>
        </div>
        <div>
          <dt>Due in {overview.due_soon_window_days} days</dt>
          <dd>{overview.due_soon_count}</dd>
        </div>
        <div>
          <dt>Partially paid</dt>
          <dd>{overview.partially_paid_count}</dd>
        </div>
      </dl>

      <div className="overview-grid">
        <CurrencyRegister
          countLabel="invoices"
          emptyText="Nothing outstanding."
          heading="Outstanding by currency"
          rows={overview.outstanding_by_currency}
        />
        <CurrencyRegister
          countLabel="invoices"
          emptyText="No overdue invoices."
          heading="Overdue by currency"
          rows={overview.overdue_by_currency}
          tone="attention"
        />
        <CurrencyRegister
          countLabel="invoices"
          emptyText="No invoices issued yet."
          heading="Invoiced by currency"
          rows={overview.invoiced_by_currency}
        />
        <CurrencyRegister
          countLabel="payments"
          emptyText="No payments recorded in this window."
          heading={`Paid in the last ${overview.recent_window_days} days`}
          rows={overview.paid_recently_by_currency}
        />
      </div>

      <div className="overview-grid">
        <section aria-labelledby="finance-queue-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="finance-queue-heading">Finance action queue</h2>
          </div>
          {queue.length === 0 ? (
            <p className="quiet-empty">
              Nothing needs attention: no overdue, due-soon, or stale draft invoices.
            </p>
          ) : (
            <ul className="action-queue">
              {queue.map((item) => (
                <li key={`${item.kind}-${item.invoice_id}`}>
                  <div>
                    <StatusBadge
                      tone={
                        item.kind.startsWith("overdue")
                          ? "blocked"
                          : item.kind === "due_soon"
                            ? "review"
                            : "draft"
                      }
                    >
                      {item.kind === "overdue"
                        ? "Overdue"
                        : item.kind === "overdue_partially_paid"
                          ? "Overdue · partially paid"
                          : item.kind === "due_soon"
                            ? "Due soon"
                            : "Stale draft"}
                    </StatusBadge>{" "}
                    <Link href={`/admin/finance/invoices/${item.invoice_id}`}>{item.label}</Link>
                    <span>
                      {item.detail}
                      {item.amount !== null ? ` · ${formatMoney(item.amount, item.currency)}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="due-soon-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="due-soon-heading">Due in the next {overview.due_soon_window_days} days</h2>
          </div>
          {overview.due_soon.length === 0 ? (
            <p className="quiet-empty">No invoices fall due in this window.</p>
          ) : (
            <ul className="activity-list">
              {overview.due_soon.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>
                      <Link href={`/admin/finance/invoices/${item.id}`}>
                        {item.invoice_number ?? "Draft"}
                      </Link>
                    </strong>
                    <span>
                      Due {shortDate(item.due_date)} ·{" "}
                      {formatMoney(item.balance_due, item.currency)} outstanding
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="recent-payments-heading" className="admin-panel">
        <div className="section-heading-row section-heading-compact">
          <h2 id="recent-payments-heading">Recent payments</h2>
        </div>
        {overview.recent_payments.length === 0 ? (
          <p className="quiet-empty">No payments recorded.</p>
        ) : (
          <ul className="activity-list">
            {overview.recent_payments.map((payment) => (
              <li key={payment.id}>
                <div>
                  <strong>
                    {formatMoney(payment.amount, payment.currency)} ·{" "}
                    <Link href={`/admin/finance/invoices/${payment.invoice_id}`}>
                      {payment.invoice_number ?? "Draft"}
                    </Link>
                  </strong>
                  <span>
                    {shortDate(payment.payment_date)} ·{" "}
                    {paymentMethodLabels[payment.payment_method]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
