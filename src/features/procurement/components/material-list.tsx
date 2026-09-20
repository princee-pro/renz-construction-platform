import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { MaterialListResult } from "@/features/procurement/procurement-contract";
import type { MaterialListFilters } from "@/features/procurement/procurement-data";

export function materialListUrl(
  filters: MaterialListFilters,
  cursor?: Readonly<{ u: string; i: string }>,
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.statusScope !== "active") params.set("status", filters.statusScope);
  if (cursor) {
    params.set("cu", cursor.u);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  return query ? `/admin/procurement/materials?${query}` : "/admin/procurement/materials";
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

export function MaterialList({
  result,
  filters,
  canWrite,
}: Readonly<{ result: MaterialListResult; filters: MaterialListFilters; canWrite: boolean }>) {
  const filtered = Boolean(filters.search || filters.category || filters.statusScope !== "active");

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/procurement/materials">
              Clear filters
            </Link>
          ) : canWrite ? (
            <Link className="button button-primary" href="/admin/procurement/materials/new">
              Add the first material
            </Link>
          ) : null
        }
        title={filtered ? "No materials match these filters" : "No materials yet"}
      >
        {filtered
          ? "Widen the search or clear a filter to see more of the catalog."
          : "The catalog is a reusable list of materials with a default unit and an optional preferred supplier. Project requirements and purchase order lines can reference it, but free-text items are always allowed."}
      </EmptyState>
    );
  }

  return (
    <>
      <div aria-hidden="true" className="material-register-heading">
        <span>Material</span>
        <span>Code</span>
        <span>Category</span>
        <span>Unit</span>
        <span>Preferred supplier</span>
        <span>Status</span>
        <span>Updated</span>
        <span>Action</span>
      </div>
      <ol className="material-register">
        {result.items.map((item) => (
          <li key={item.id}>
            <div className="material-register-identity">
              <Link href={`/admin/procurement/materials/${item.id}`}>{item.name}</Link>
            </div>
            <span data-label="Code">{item.internal_code ?? "—"}</span>
            <span data-label="Category">{item.category ?? "—"}</span>
            <span data-label="Unit">{item.default_unit}</span>
            <span data-label="Preferred supplier">
              {item.preferred_supplier ? (
                <Link href={`/admin/procurement/suppliers/${item.preferred_supplier.id}`}>
                  {item.preferred_supplier.display_name}
                </Link>
              ) : (
                "—"
              )}
            </span>
            <div data-label="Status">
              <StatusBadge tone={item.archived_at ? "archived" : item.active ? "ready" : "neutral"}>
                {item.archived_at ? "Archived" : item.active ? "Active" : "Inactive"}
              </StatusBadge>
            </div>
            <span data-label="Updated">{shortDate(item.updated_at)}</span>
            <Link
              className="material-register-action text-link"
              data-label="Action"
              href={`/admin/procurement/materials/${item.id}`}
            >
              Open
            </Link>
          </li>
        ))}
      </ol>
      <nav aria-label="Material pagination" className="pagination">
        {filters.cursorUpdatedAt ? (
          <Link className="button button-quiet" href={materialListUrl(filters)}>
            Back to first page
          </Link>
        ) : null}
        {result.has_more && result.next_cursor_updated_at && result.next_cursor_id ? (
          <Link
            className="button button-secondary"
            href={materialListUrl(filters, {
              u: result.next_cursor_updated_at,
              i: result.next_cursor_id,
            })}
          >
            Next page
          </Link>
        ) : (
          <span className="pagination-end">End of catalog</span>
        )}
      </nav>
    </>
  );
}
