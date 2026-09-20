import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { encodeServiceCursor, type ServiceListFilters } from "@/features/services/service-data";
import type { ServiceListResult } from "@/features/services/service-contract";

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function serviceUrl(id: string, locale: string): string {
  return `/admin/content/services/${id}?locale=${encodeURIComponent(locale)}`;
}

function listUrl(filters: ServiceListFilters, cursor = ""): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.locale) params.set("locale", filters.locale);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `/admin/content/services?${query}` : "/admin/content/services";
}

export function ServiceList({
  result,
  filters,
  canCreate,
}: Readonly<{
  result: ServiceListResult;
  filters: ServiceListFilters;
  canCreate: boolean;
}>) {
  const filtered = Boolean(
    filters.query || filters.locale || filters.status !== "all" || filters.cursor,
  );

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/content/services">
              Clear filters
            </Link>
          ) : canCreate ? (
            <Link className="button button-primary" href="/admin/content/services/new">
              Create first draft
            </Link>
          ) : null
        }
        title={filtered ? "No services match these filters" : "No service drafts yet"}
      >
        <p>
          {filtered
            ? "Adjust or clear the current search and filters."
            : "The Services register is empty. Create a synthetic draft only for approved engineering verification."}
        </p>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="service-register-heading" aria-hidden="true">
        <span>Service</span>
        <span>Status</span>
        <span>Readiness</span>
        <span>Updated</span>
        <span>Version</span>
      </div>
      <ol className="service-register">
        {result.items.map((service) => (
          <li key={`${service.id}:${service.locale}`}>
            <div className="service-register-identity">
              <Link href={serviceUrl(service.id, service.locale)}>{service.name}</Link>
              <span>
                /{service.slug} · {service.locale}
                {service.featured ? " · Featured" : ""}
              </span>
            </div>
            <div data-label="Status">
              <StatusBadge tone={service.publication_status}>
                {titleCase(service.publication_status)}
              </StatusBadge>
            </div>
            <div data-label="Readiness">
              <StatusBadge tone={service.readiness}>
                {service.readiness === "ready" ? "Ready" : `Blocked · ${service.blocker_count}`}
              </StatusBadge>
            </div>
            <time data-label="Updated" dateTime={service.updated_at}>
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(new Date(service.updated_at))}
            </time>
            <span data-label="Version" className="service-version">
              v{service.version}
            </span>
          </li>
        ))}
      </ol>
      <nav aria-label="Services pagination" className="pagination">
        {filters.cursor ? (
          <Link className="button button-quiet" href={listUrl(filters)}>
            First page
          </Link>
        ) : (
          <span />
        )}
        {result.has_more && result.next_cursor ? (
          <Link
            className="button button-secondary"
            href={listUrl(filters, encodeServiceCursor(result.next_cursor))}
          >
            Next 25
          </Link>
        ) : (
          <span className="pagination-end">End of register</span>
        )}
      </nav>
    </>
  );
}
