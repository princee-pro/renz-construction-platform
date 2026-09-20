import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { RecentlyViewedPanel } from "@/components/admin/recently-viewed-panel";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { CurrencyRegister } from "@/features/invoices/components/currency-register";
import { formatMoney, invoiceActivityLabels } from "@/features/invoices/invoice-contract";
import { loadFinanceActionQueue, loadFinanceOverview } from "@/features/invoices/invoice-data";
import { assignmentActivityLabels } from "@/features/assignments/assignment-contract";
import { LeadOverviewSection } from "@/features/leads/components/lead-overview-section";
import { leadActivityLabels } from "@/features/leads/lead-contract";
import { loadLeadActionQueue, loadLeadOverview } from "@/features/leads/lead-data";
import {
  notificationCategoryLabels,
  relativeTime,
  safeNotificationHref,
} from "@/features/notifications/notification-contract";
import { loadNotificationSummary } from "@/features/notifications/notification-data";
import { partnerActivityLabels } from "@/features/partners/partner-contract";
import { DeliveryOverviewSection } from "@/features/procurement/components/delivery-overview";
import { procurementActivityLabels } from "@/features/procurement/procurement-contract";
import {
  loadDeliveryActionQueue,
  loadDeliveryOverview,
} from "@/features/procurement/procurement-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";
import { loadAuditActivity, loadServiceOverview } from "@/features/services/service-data";
import {
  loadActionQueue,
  loadOperationsOverview,
  loadRecentActivity,
} from "@/features/operational-projects/project-data";
import {
  projectPhaseLabels,
  projectStatusLabels,
} from "@/features/operational-projects/project-contract";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Overview | RENZ Administration",
  robots: { index: false, follow: false },
};

function formatActivity(action: string): string {
  const labels: Readonly<Record<string, string>> = {
    "service.create": "Service draft created",
    "service.update": "Service draft updated",
    "content.publish": "Content published",
    "content.unpublish": "Content unpublished",
    "content.archive": "Content archived",
    "evidence.create": "Evidence registered",
    "evidence.submit_review": "Evidence submitted",
    "claim.verify": "Evidence verified",
    "claim.rejected": "Evidence rejected",
    "client.create": "Client created",
    "client.update": "Client updated",
    "client.archive": "Client archived",
    "client.note_create": "Client note added",
    "operational_project.create": "Project created",
    "operational_project.update": "Project updated",
    "operational_project.status_change": "Project status changed",
    "operational_project.phase_change": "Project phase changed",
    "operational_project.priority_change": "Project priority changed",
    "operational_project.case_study_link": "Case study linked",
    "operational_project.case_study_unlink": "Case study unlinked",
    "operational_project.archive": "Project archived",
    "operational_project.note_create": "Project note added",
    ...invoiceActivityLabels,
    ...partnerActivityLabels,
    ...assignmentActivityLabels,
    ...procurementActivityLabels,
    ...leadActivityLabels,
  };
  return labels[action] ?? "Administrative event";
}

function actionQueueHref(kind: string, projectId: string): string {
  if (kind === "completed_without_case_study" || kind === "draft_case_study_unpublished") {
    return `/admin/operations/projects/${projectId}`;
  }
  return `/admin/operations/projects/${projectId}`;
}

export default async function AdminOverviewPage() {
  const snapshot = await requirePermission("content.read");
  const access = await getCurrentAdminAccess();
  const canReadOperations = access.permissions.includes("operations.projects.read");
  const canReadClients = access.permissions.includes("clients.read");
  const canReadFinance = access.permissions.includes("finance.invoices.read");
  const canReadLeads = access.permissions.includes("leads.read");
  const canReadDelivery =
    access.permissions.includes("partners.read") ||
    access.permissions.includes("procurement.orders.read") ||
    access.permissions.includes("procurement.materials.read");
  const canReadNotifications = access.permissions.includes("notifications.read");
  const canReadAnalytics = access.permissions.includes("analytics.read");

  const [
    overview,
    activity,
    operationsOverview,
    actionQueue,
    recentActivity,
    financeOverview,
    financeQueue,
    deliveryOverview,
    deliveryQueue,
    leadOverview,
    leadQueue,
    notifications,
  ] = await Promise.all([
    loadServiceOverview(),
    access.permissions.includes("audit.read")
      ? loadAuditActivity({ limit: 8 })
      : Promise.resolve([]),
    canReadOperations ? loadOperationsOverview() : Promise.resolve(null),
    canReadOperations ? loadActionQueue(10) : Promise.resolve([]),
    canReadOperations || canReadClients || canReadFinance || canReadDelivery
      ? loadRecentActivity(15)
      : Promise.resolve([]),
    canReadFinance ? loadFinanceOverview() : Promise.resolve(null),
    canReadFinance ? loadFinanceActionQueue(8) : Promise.resolve([]),
    canReadDelivery ? loadDeliveryOverview() : Promise.resolve(null),
    canReadDelivery ? loadDeliveryActionQueue(12) : Promise.resolve([]),
    canReadLeads ? loadLeadOverview() : Promise.resolve(null),
    canReadLeads ? loadLeadActionQueue(12) : Promise.resolve([]),
    canReadNotifications ? loadNotificationSummary() : Promise.resolve(null),
  ]);
  const attentionNotifications = (notifications?.latest ?? []).filter(
    (item) => !item.read_at && item.severity !== "info",
  );
  const nonOperationalActivity = activity.filter(
    (item) =>
      item.entityType !== "client" &&
      item.entityType !== "operational_project" &&
      item.entityType !== "invoice" &&
      item.entityType !== "trade_partner" &&
      item.entityType !== "contractor_assignment" &&
      item.entityType !== "purchase_order" &&
      item.entityType !== "material" &&
      item.entityType !== "material_requirement" &&
      item.entityType !== "lead",
  );

  return (
    <main className="workspace-page" id="main-content">
      <PageHeader
        description="Where things stand across leads, projects, money and site work — what needs attention first, then the detail."
        eyebrow="Your business today"
        status={
          canReadOperations || canReadClients || canReadDelivery || canReadLeads ? (
            <RealtimeRefresh
              entityTypes={[
                "lead",
                "client",
                "operational_project",
                "invoice",
                "trade_partner",
                "contractor_assignment",
                "purchase_order",
                "material_requirement",
              ]}
            />
          ) : null
        }
        title="Overview"
      />

      {/* D1.5 §27–28 Command strip: real metrics only, summary before detail. */}
      <dl className="command-strip" aria-label="Command strip">
        {operationsOverview ? (
          <div>
            <dt>Active projects</dt>
            <dd>
              <Link href="/admin/operations/projects">{operationsOverview.active_count}</Link>
              <small>
                {operationsOverview.priority_counts["high"] ?? 0} high priority ·{" "}
                {operationsOverview.client_count} clients
              </small>
            </dd>
          </div>
        ) : null}
        {leadOverview ? (
          <div data-tone={leadOverview.unassigned_count > 0 ? "attention" : undefined}>
            <dt>New leads</dt>
            <dd>
              <Link href="/admin/operations/leads">{leadOverview.status_counts["new"] ?? 0}</Link>
              <small>
                {leadOverview.unassigned_count} unassigned · {leadOverview.new_today_count} today
              </small>
            </dd>
          </div>
        ) : null}
        {financeOverview ? (
          <div data-tone={financeOverview.overdue_count > 0 ? "attention" : undefined}>
            <dt>Outstanding invoices</dt>
            <dd>
              <Link href="/admin/finance/invoices">
                {financeOverview.outstanding_by_currency.reduce(
                  (sum, row) => sum + Number(row.invoice_count ?? 0),
                  0,
                )}
              </Link>
              <small>
                {financeOverview.overdue_count} overdue · {financeOverview.due_soon_count} due in{" "}
                {financeOverview.due_soon_window_days} days
              </small>
            </dd>
          </div>
        ) : null}
        {deliveryOverview ? (
          <div
            data-tone={(deliveryOverview.delayed_order_count ?? 0) > 0 ? "attention" : undefined}
          >
            <dt>Open purchase orders</dt>
            <dd>
              <Link href="/admin/procurement/orders">{deliveryOverview.open_order_count ?? 0}</Link>
              <small>
                {deliveryOverview.delayed_order_count ?? 0} delayed ·{" "}
                {deliveryOverview.orders_expected_soon ?? 0} expected soon
              </small>
            </dd>
          </div>
        ) : null}
        <div
          data-tone={
            attentionNotifications.length + actionQueue.length + financeQueue.length > 0
              ? "attention"
              : "quiet"
          }
        >
          <dt>Needs attention</dt>
          <dd>
            {attentionNotifications.length + actionQueue.length + financeQueue.length}
            <small>
              {attentionNotifications.length} alerts · {actionQueue.length + financeQueue.length}{" "}
              queued actions
            </small>
          </dd>
        </div>
      </dl>

      {notifications ? (
        <section
          aria-labelledby="attention-summary-heading"
          className="overview-section attention-summary"
        >
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Notifications</p>
              <h2 id="attention-summary-heading">
                {notifications.unread_count === 0
                  ? "Nothing unread"
                  : `${notifications.unread_count} unread ${notifications.unread_count === 1 ? "notification" : "notifications"}`}
              </h2>
            </div>
            <div className="page-actions">
              <Link className="text-link" href="/admin/notifications">
                Open Notification Center
              </Link>
              {canReadAnalytics ? (
                <Link className="text-link" href="/admin/analytics">
                  Open Analytics
                </Link>
              ) : null}
            </div>
          </div>
          {attentionNotifications.length > 0 ? (
            <ul className="action-queue-list">
              {attentionNotifications.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link href={safeNotificationHref(item.href) ?? "/admin/notifications"}>
                    {item.title}
                  </Link>
                  <span>
                    {notificationCategoryLabels[item.category]} · {item.body_short ?? ""} ·{" "}
                    {relativeTime(item.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">No unread attention or urgent notifications right now.</p>
          )}
        </section>
      ) : null}

      {leadOverview ? <LeadOverviewSection overview={leadOverview} queue={leadQueue} /> : null}

      {operationsOverview ? (
        <section aria-labelledby="operations-heading" className="overview-section">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Control room</p>
              <h2 id="operations-heading">Clients & Projects</h2>
            </div>
            <div className="page-actions">
              <Link className="text-link" href="/admin/operations/clients">
                Open Clients
              </Link>
              <Link className="text-link" href="/admin/operations/projects">
                Open Projects
              </Link>
            </div>
          </div>
          <dl className="metric-register">
            <div>
              <dt>Clients</dt>
              <dd>{operationsOverview.client_count}</dd>
            </div>
            <div>
              <dt>Active projects</dt>
              <dd>{operationsOverview.active_count}</dd>
            </div>
            <div>
              <dt>Archived projects</dt>
              <dd>{operationsOverview.archived_count}</dd>
            </div>
            <div className="metric-attention">
              <dt>High priority</dt>
              <dd>{operationsOverview.priority_counts["high"] ?? 0}</dd>
            </div>
          </dl>

          <div className="overview-grid">
            <section aria-labelledby="status-heading" className="admin-panel">
              <div className="section-heading-row section-heading-compact">
                <h2 id="status-heading">Project status</h2>
              </div>
              <dl className="definition-register">
                {Object.entries(projectStatusLabels).map(([status, label]) => (
                  <div key={status}>
                    <dt>{label}</dt>
                    <dd>{operationsOverview.status_counts[status] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="phase-heading" className="admin-panel">
              <div className="section-heading-row section-heading-compact">
                <h2 id="phase-heading">Project phase</h2>
              </div>
              <dl className="definition-register">
                {Object.entries(projectPhaseLabels).map(([phase, label]) => (
                  <div key={phase}>
                    <dt>{label}</dt>
                    <dd>{operationsOverview.phase_counts[phase] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="attention-heading" className="admin-panel">
              <div className="section-heading-row section-heading-compact">
                <h2 id="attention-heading">Needs attention</h2>
                <StatusBadge
                  tone={
                    operationsOverview.past_due_count +
                      operationsOverview.without_case_study_count >
                    0
                      ? "blocked"
                      : "ready"
                  }
                >
                  {operationsOverview.past_due_count + operationsOverview.without_case_study_count >
                  0
                    ? "Attention"
                    : "Current"}
                </StatusBadge>
              </div>
              <dl className="definition-register">
                <div>
                  <dt>Ending in {operationsOverview.ending_soon_window_days} days</dt>
                  <dd>{operationsOverview.ending_soon_count}</dd>
                </div>
                <div>
                  <dt>Past planned end date</dt>
                  <dd>{operationsOverview.past_due_count}</dd>
                </div>
                <div>
                  <dt>Without a case study</dt>
                  <dd>{operationsOverview.without_case_study_count}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="budget-heading" className="admin-panel">
              <div className="section-heading-row section-heading-compact">
                <h2 id="budget-heading">Budget by currency</h2>
              </div>
              {operationsOverview.budget_by_currency.length > 0 ? (
                <ul className="currency-register">
                  {operationsOverview.budget_by_currency.map((entry) => (
                    <li key={entry.currency}>
                      <span>{entry.currency}</span>
                      <strong>
                        {new Intl.NumberFormat("en").format(
                          typeof entry.total === "string"
                            ? Number.parseFloat(entry.total)
                            : entry.total,
                        )}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="quiet-empty">
                  No budgeted projects yet. Currencies are never summed together.
                </p>
              )}
            </section>
          </div>

          <section aria-labelledby="action-queue-heading" className="activity-section">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Deterministic, no urgency scoring</p>
                <h2 id="action-queue-heading">Action queue</h2>
              </div>
            </div>
            {actionQueue.length > 0 || financeQueue.length > 0 ? (
              <ul className="action-queue-list">
                {financeQueue.map((item, index) => (
                  <li key={`finance-${item.kind}-${item.invoice_id}-${index}`}>
                    <Link href={`/admin/finance/invoices/${item.invoice_id}`}>
                      Invoice {item.label}
                    </Link>
                    <span>
                      {item.kind === "overdue_partially_paid"
                        ? "Overdue, partially paid"
                        : item.kind === "overdue"
                          ? "Overdue"
                          : item.kind === "due_soon"
                            ? "Due soon"
                            : "Stale draft"}
                      {" · "}
                      {item.detail}
                      {item.amount !== null ? ` · ${formatMoney(item.amount, item.currency)}` : ""}
                    </span>
                  </li>
                ))}
                {actionQueue.map((item, index) => (
                  <li key={`${item.kind}-${item.project_id}-${index}`}>
                    <Link href={actionQueueHref(item.kind, item.project_id)}>{item.title}</Link>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="quiet-empty">No projects or invoices currently need action.</p>
            )}
          </section>
        </section>
      ) : null}

      {financeOverview ? (
        <section aria-labelledby="finance-heading" className="overview-section">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Finance</p>
              <h2 id="finance-heading">Invoices &amp; payments</h2>
            </div>
            <div className="page-actions">
              <Link className="text-link" href="/admin/finance">
                Open Finance
              </Link>
              <Link className="text-link" href="/admin/finance/invoices">
                Open Invoices
              </Link>
            </div>
          </div>
          <dl className="metric-register">
            <div>
              <dt>Issued invoices</dt>
              <dd>{financeOverview.issued_count}</dd>
            </div>
            <div className={financeOverview.overdue_count > 0 ? "metric-attention" : undefined}>
              <dt>Overdue</dt>
              <dd>{financeOverview.overdue_count}</dd>
            </div>
            <div>
              <dt>Partially paid</dt>
              <dd>{financeOverview.partially_paid_count}</dd>
            </div>
            <div>
              <dt>Due in {financeOverview.due_soon_window_days} days</dt>
              <dd>{financeOverview.due_soon_count}</dd>
            </div>
          </dl>
          <div className="overview-grid">
            <CurrencyRegister
              countLabel="invoices"
              emptyText="Nothing outstanding."
              heading="Outstanding by currency"
              headingId="overview-outstanding-heading"
              rows={financeOverview.outstanding_by_currency}
            />
            <CurrencyRegister
              countLabel="invoices"
              emptyText="No overdue invoices."
              heading="Overdue by currency"
              headingId="overview-overdue-heading"
              rows={financeOverview.overdue_by_currency}
              tone="attention"
            />
            <CurrencyRegister
              countLabel="payments"
              emptyText="No payments in this window."
              heading={`Paid in the last ${financeOverview.recent_window_days} days`}
              headingId="overview-paid-heading"
              rows={financeOverview.paid_recently_by_currency}
            />
          </div>
        </section>
      ) : null}

      {deliveryOverview ? (
        <DeliveryOverviewSection overview={deliveryOverview} queue={deliveryQueue} />
      ) : null}

      <section aria-labelledby="service-status-heading" className="overview-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Services</p>
            <h2 id="service-status-heading">Editorial state</h2>
          </div>
          <Link className="text-link" href="/admin/content/services">
            Open Services
          </Link>
        </div>
        <dl className="metric-register">
          <div>
            <dt>Draft</dt>
            <dd>{overview.draft}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{overview.published}</dd>
          </div>
          <div>
            <dt>Archived</dt>
            <dd>{overview.archived}</dd>
          </div>
          <div className="metric-attention">
            <dt>Blocked drafts</dt>
            <dd>{overview.blocked}</dd>
          </div>
        </dl>
      </section>

      <div className="overview-grid">
        <section aria-labelledby="evidence-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="evidence-heading">Evidence review</h2>
            <StatusBadge tone={overview.evidence.attention > 0 ? "blocked" : "ready"}>
              {overview.evidence.attention > 0 ? "Attention" : "Current"}
            </StatusBadge>
          </div>
          <dl className="definition-register">
            <div>
              <dt>Unverified</dt>
              <dd>{overview.evidence.unverified}</dd>
            </div>
            <div>
              <dt>In review</dt>
              <dd>{overview.evidence.in_review}</dd>
            </div>
            <div>
              <dt>Verified</dt>
              <dd>{overview.evidence.verified}</dd>
            </div>
            <div>
              <dt>Expired / rejected</dt>
              <dd>{overview.evidence.attention}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="session-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="session-heading">Secure session</h2>
            <StatusBadge tone="ready">AAL2</StatusBadge>
          </div>
          <p className="panel-copy">
            {snapshot.displayName ?? "Staff member"} is verified with a second factor for this
            session. Permissions are checked again for every protected operation.
          </p>
          <Link className="text-link" href="/admin/security">
            Review security
          </Link>
        </section>

        <RecentlyViewedPanel />
      </div>

      <section aria-labelledby="activity-heading" className="activity-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Bounded audit view</p>
            <h2 id="activity-heading">Recent activity</h2>
          </div>
        </div>
        {recentActivity.length > 0 || nonOperationalActivity.length > 0 ? (
          <ol className="activity-list">
            {recentActivity.map((item, index) => (
              <li key={`ops-${item.action}-${index}`}>
                <div>
                  <strong>
                    {formatActivity(item.action)}
                    {(item.entity_type === "invoice" || item.entity_type === "purchase_order") &&
                    item.label
                      ? ` · ${item.label}`
                      : ""}
                  </strong>
                  <span>{item.actor ?? "Staff member"}</span>
                </div>
                <time dateTime={item.occurred_at}>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(item.occurred_at))}{" "}
                  UTC
                </time>
              </li>
            ))}
            {nonOperationalActivity.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{formatActivity(item.action)}</strong>
                  <span>{item.outcome}</span>
                </div>
                <time dateTime={item.occurredAt}>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(item.occurredAt))}{" "}
                  UTC
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="quiet-empty">No recorded activity is available yet.</p>
        )}
      </section>
    </main>
  );
}
