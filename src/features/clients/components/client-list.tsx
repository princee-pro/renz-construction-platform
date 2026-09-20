import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { clientTierLabels, type ClientListResult } from "@/features/clients/client-contract";
import type { ClientListFilters } from "@/features/clients/client-data";

function listUrl(filters: ClientListFilters, cursor?: Readonly<{ u: string; i: string }>): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.tier) params.set("tier", filters.tier);
  if (filters.statusScope && filters.statusScope !== "active")
    params.set("status", filters.statusScope);
  if (cursor) {
    params.set("cu", cursor.u);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  return query ? `/admin/operations/clients?${query}` : "/admin/operations/clients";
}

export function ClientList({
  result,
  filters,
}: Readonly<{
  result: ClientListResult;
  filters: ClientListFilters;
}>) {
  const filtered = Boolean(filters.search || filters.tier || filters.statusScope !== "active");

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/operations/clients">
              Clear filters
            </Link>
          ) : (
            <Link className="button button-primary" href="/admin/operations/clients/new">
              Create first client
            </Link>
          )
        }
        title={filtered ? "No clients match these filters" : "No clients yet"}
      >
        <p>
          {filtered
            ? "Adjust or clear the current search and filters."
            : "The client register is empty. Create a client to start tracking their projects."}
        </p>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="ops-client-register-heading" aria-hidden="true">
        <span>Client</span>
        <span>Tier</span>
        <span>Primary contact</span>
        <span>Projects</span>
        <span>Updated</span>
        <span>Action</span>
      </div>
      <ol className="ops-client-register">
        {result.items.map((item) => (
          <li key={item.id}>
            <div className="ops-register-identity">
              <Link href={`/admin/operations/clients/${item.id}`}>{item.full_name}</Link>
              <span>
                {item.company ?? "No company"}
                {item.archived_at ? " · Archived" : ""}
              </span>
            </div>
            <div data-label="Tier">
              <StatusBadge tone={item.client_tier === "premium" ? "ready" : "review"}>
                {clientTierLabels[item.client_tier]}
              </StatusBadge>
            </div>
            <span data-label="Contact">{item.email ?? item.phone_display ?? "—"}</span>
            <span data-label="Projects">
              {item.active_project_count} active / {item.project_count} total
            </span>
            <time data-label="Updated" dateTime={item.updated_at}>
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                new Date(item.updated_at),
              )}
            </time>
            <Link
              className="ops-register-action text-link"
              data-label="Action"
              href={`/admin/operations/clients/${item.id}`}
            >
              Open
            </Link>
          </li>
        ))}
      </ol>
      <nav aria-label="Clients pagination" className="pagination">
        {filters.cursorId ? (
          <Link className="button button-quiet" href={listUrl(filters)}>
            First page
          </Link>
        ) : (
          <span />
        )}
        {result.has_more && result.next_cursor_id && result.next_cursor_updated_at ? (
          <Link
            className="button button-secondary"
            href={listUrl(filters, { u: result.next_cursor_updated_at, i: result.next_cursor_id })}
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
