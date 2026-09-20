import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { needLabels } from "@/features/intake/intake-policy";
import {
  formatLeadDate,
  leadAge,
  leadStatusLabels,
  leadStatusTones,
  leadStatuses,
  leadTypeLabel,
  type LeadListResult,
  type LeadSummary,
} from "@/features/leads/lead-contract";
import { leadFiltersActive, type LeadListFilters } from "@/features/leads/lead-data";

export function leadListUrl(
  filters: LeadListFilters,
  overrides: Partial<LeadListFilters> = {},
  cursor?: Readonly<{ s: string; i: string }>,
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.search) params.set("q", merged.search);
  if (merged.type) params.set("type", merged.type);
  if (merged.status) params.set("status", merged.status);
  if (merged.service) params.set("service", merged.service);
  if (merged.assigned) params.set("assigned", merged.assigned);
  if (merged.source) params.set("source", merged.source);
  if (merged.scope !== "active") params.set("scope", merged.scope);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.view === "pipeline") params.set("view", "pipeline");
  if (cursor) {
    params.set("cs", cursor.s);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  return query ? `/admin/operations/leads?${query}` : "/admin/operations/leads";
}

function contextFor(item: LeadSummary): string {
  if (item.service_key)
    return needLabels[item.service_key as keyof typeof needLabels] ?? item.service_key;
  return item.summary;
}

function LeadIdentity({ item }: Readonly<{ item: LeadSummary }>) {
  return (
    <div className="ops-register-identity">
      <Link href={`/admin/operations/leads/${item.id}`}>
        <span className="lead-reference">{item.reference}</span> {item.full_name}
      </Link>
      <span>
        {item.company ?? "No company"}
        {item.archived_at ? " · Archived" : ""}
      </span>
    </div>
  );
}

/** Register (mandatory) with a compact, non-drag pipeline view as an alternative. */
export function LeadList({
  result,
  filters,
}: Readonly<{ result: LeadListResult; filters: LeadListFilters }>) {
  const filtered = leadFiltersActive(filters);

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/operations/leads">
              Clear filters
            </Link>
          ) : (
            <Link className="button button-primary" href="/admin/operations/leads/new">
              Create a lead
            </Link>
          )
        }
        title={filtered ? "No leads match these filters" : "No leads yet"}
      >
        <p>
          {filtered
            ? "Adjust or clear the current search and filters."
            : "Website enquiries land here the moment a visitor submits; staff can also record a lead by hand."}
        </p>
      </EmptyState>
    );
  }

  if (filters.view === "pipeline") {
    return (
      <div className="lead-pipeline" role="region" aria-label="Lead pipeline">
        {leadStatuses.map((status) => {
          const column = result.items.filter((item) => item.status === status);
          return (
            <section
              aria-labelledby={`pipeline-${status}`}
              className="lead-pipeline-column"
              key={status}
            >
              <h3 id={`pipeline-${status}`}>
                {leadStatusLabels[status]}{" "}
                <span className="lead-pipeline-count">{result.status_counts[status] ?? 0}</span>
              </h3>
              {column.length === 0 ? (
                <p className="quiet-empty">None on this page.</p>
              ) : (
                <ul className="lead-pipeline-cards">
                  {column.map((item) => (
                    <li key={item.id}>
                      <Link href={`/admin/operations/leads/${item.id}`}>
                        <span className="lead-reference">{item.reference}</span>
                        <strong>{item.full_name}</strong>
                      </Link>
                      <span>
                        {leadTypeLabel(item.lead_type)} · {contextFor(item)}
                      </span>
                      <span>
                        {item.assigned_to_name ?? "Unassigned"} · {leadAge(item.submitted_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="lead-register-heading" aria-hidden="true">
        <span>Reference / name</span>
        <span>Type</span>
        <span>Context</span>
        <span>Status</span>
        <span>Assigned</span>
        <span>Submitted</span>
        <span>Activity</span>
        <span>Action</span>
      </div>
      <ol className="lead-register">
        {result.items.map((item) => (
          <li key={item.id}>
            <LeadIdentity item={item} />
            <span data-label="Type">{leadTypeLabel(item.lead_type)}</span>
            <span className="lead-register-context" data-label="Context">
              {contextFor(item)}
            </span>
            <div data-label="Status">
              <StatusBadge tone={leadStatusTones[item.status]}>
                {leadStatusLabels[item.status]}
              </StatusBadge>
            </div>
            <span data-label="Assigned">{item.assigned_to_name ?? "Unassigned"}</span>
            <span data-label="Submitted">
              <time dateTime={item.submitted_at}>{formatLeadDate(item.submitted_at)}</time>
              <span className="lead-age"> · {leadAge(item.submitted_at)}</span>
            </span>
            <span data-label="Activity">
              {formatLeadDate(item.last_activity_at ?? item.updated_at)}
            </span>
            <Link
              className="ops-register-action text-link"
              data-label="Action"
              href={`/admin/operations/leads/${item.id}`}
            >
              Open
            </Link>
          </li>
        ))}
      </ol>
      <nav aria-label="Leads pagination" className="pagination">
        {filters.cursorId ? (
          <Link className="button button-quiet" href={leadListUrl(filters)}>
            First page
          </Link>
        ) : (
          <span />
        )}
        {result.has_more && result.items.length > 0 ? (
          <Link
            className="button button-secondary"
            href={leadListUrl(
              filters,
              {},
              {
                s: result.items[result.items.length - 1]!.submitted_at,
                i: result.items[result.items.length - 1]!.id,
              },
            )}
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
