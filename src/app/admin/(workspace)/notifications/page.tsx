import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import {
  normalizeNotificationFilters,
  notificationCategories,
  notificationCategoryLabels,
  notificationListUrl,
  notificationSeverities,
  notificationSeverityLabels,
} from "@/features/notifications/notification-contract";
import { loadNotificationList } from "@/features/notifications/notification-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NotificationsPage({
  searchParams,
}: PageProps<"/admin/notifications">) {
  await requirePermission("notifications.read");
  const params = await searchParams;
  const filters = normalizeNotificationFilters(params);
  const result = await loadNotificationList(filters);

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Notifications" }]} />
      <PageHeader
        actions={
          <Link className="button button-secondary" href="/admin/settings/notifications">
            Preferences
          </Link>
        }
        description="Your in-app notifications: new enquiries, assignments, payments, issued orders, receipts and time-based alerts. Each one links to the record it is about."
        eyebrow="Notification Center"
        status={<RealtimeRefresh entityTypes={["notification"]} />}
        title="Notifications"
      />

      <nav aria-label="Notification views" className="lead-quick-filters">
        {(["all", "unread", "archived"] as const).map((state) => (
          <Link
            aria-current={filters.state === state ? "page" : undefined}
            className="lead-quick-filter"
            href={notificationListUrl(filters, { state, cursorCreatedAt: "", cursorId: "" })}
            key={state}
          >
            {state === "all" ? "All" : state === "unread" ? "Unread" : "Archived"}
            {state === "unread" ? <span>{result.unread_count}</span> : null}
          </Link>
        ))}
      </nav>

      <form
        action="/admin/notifications"
        className="service-filters lead-filters"
        method="get"
        noValidate
        role="search"
      >
        {filters.state !== "all" ? (
          <input name="state" type="hidden" value={filters.state} />
        ) : null}
        <div className="field-group">
          <label htmlFor="notification-category">Category</label>
          <select defaultValue={filters.category} id="notification-category" name="category">
            <option value="">All categories</option>
            {notificationCategories.map((category) => (
              <option key={category} value={category}>
                {notificationCategoryLabels[category]}
                {result.category_counts[category]
                  ? ` (${result.category_counts[category]} unread)`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="notification-severity">Severity</label>
          <select defaultValue={filters.severity} id="notification-severity" name="severity">
            <option value="">Any severity</option>
            {notificationSeverities.map((severity) => (
              <option key={severity} value={severity}>
                {notificationSeverityLabels[severity]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="notification-from">From</label>
          <input defaultValue={filters.from} id="notification-from" name="from" type="date" />
        </div>
        <div className="field-group">
          <label htmlFor="notification-to">To</label>
          <input defaultValue={filters.to} id="notification-to" name="to" type="date" />
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filters.category || filters.severity || filters.from || filters.to ? (
          <Link
            className="filter-clear"
            href={notificationListUrl({
              ...filters,
              category: "",
              severity: "",
              from: "",
              to: "",
              cursorCreatedAt: "",
              cursorId: "",
            })}
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      <NotificationCenter filters={filters} result={result} />
    </main>
  );
}
