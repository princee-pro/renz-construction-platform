import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { formatMoney } from "@/features/invoices/invoice-contract";
import {
  availabilityLabels,
  ratingLabel,
  type PartnerCapability,
  type PartnerListResult,
} from "@/features/partners/partner-contract";
import type { PartnerListFilters } from "@/features/partners/partner-data";

export function partnerBaseHref(capability: PartnerCapability): string {
  return capability === "supplier"
    ? "/admin/procurement/suppliers"
    : "/admin/operations/contractors";
}

export function partnerListUrl(
  filters: PartnerListFilters,
  cursor?: Readonly<{ u: string; i: string }>,
): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.availability) params.set("availability", filters.availability);
  if (filters.specialization) params.set("specialization", filters.specialization);
  if (filters.statusScope !== "active") params.set("status", filters.statusScope);
  if (cursor) {
    params.set("cu", cursor.u);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  const base = partnerBaseHref(filters.capability);
  return query ? `${base}?${query}` : base;
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

function availabilityTone(status: string): "ready" | "review" | "blocked" {
  return status === "available" ? "ready" : status === "busy" ? "review" : "blocked";
}

export function PartnerList({
  result,
  filters,
  canWrite,
}: Readonly<{ result: PartnerListResult; filters: PartnerListFilters; canWrite: boolean }>) {
  const isContractor = filters.capability === "contractor";
  const base = partnerBaseHref(filters.capability);
  const filtered = Boolean(
    filters.search ||
    filters.availability ||
    filters.specialization ||
    filters.statusScope !== "active",
  );
  const noun = isContractor ? "contractors" : "suppliers";

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href={base}>
              Clear filters
            </Link>
          ) : canWrite ? (
            <Link className="button button-primary" href={`${base}/new`}>
              {isContractor ? "Add the first contractor" : "Add the first supplier"}
            </Link>
          ) : null
        }
        title={filtered ? `No ${noun} match these filters` : `No ${noun} yet`}
      >
        {isContractor
          ? "Contractors are trade partners with the contractor capability. Assign them to projects, track agreed amounts and payments, and rate completed work."
          : "Suppliers are trade partners with the supplier capability. Raise purchase orders against them and record deliveries. A contractor can gain the supplier capability without a duplicate record."}
      </EmptyState>
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={`partner-register-heading partner-register-${filters.capability}`}
      >
        <span>{isContractor ? "Contractor" : "Supplier"}</span>
        <span>Company</span>
        {isContractor ? <span>Specializations</span> : <span>Contact</span>}
        {isContractor ? <span>Availability</span> : <span>Open orders</span>}
        {isContractor ? <span>Active</span> : null}
        {isContractor ? <span>Performance</span> : null}
        {isContractor ? <span>Outstanding</span> : null}
        <span>Updated</span>
        <span>Action</span>
      </div>
      <ol className={`partner-register partner-register-${filters.capability}`}>
        {result.items.map((item) => (
          <li key={item.id}>
            <div className="partner-register-identity">
              <Link href={`${base}/${item.id}`}>{item.display_name}</Link>
              <span>
                {item.capabilities.length > 1
                  ? "Contractor + supplier"
                  : item.capabilities[0] === "contractor"
                    ? "Contractor"
                    : "Supplier"}
                {item.archived_at ? " · Archived" : ""}
              </span>
            </div>
            <span data-label="Company">{item.company_name ?? "—"}</span>
            {isContractor ? (
              <span data-label="Specializations">
                {item.specializations.length > 0 ? item.specializations.join(", ") : "—"}
              </span>
            ) : (
              <span data-label="Contact">{item.email ?? item.phone_display ?? "—"}</span>
            )}
            {isContractor ? (
              <div data-label="Availability">
                <StatusBadge tone={availabilityTone(item.availability_status)}>
                  {availabilityLabels[item.availability_status]}
                </StatusBadge>
              </div>
            ) : (
              <span data-label="Open orders">{item.open_order_count}</span>
            )}
            {isContractor ? <span data-label="Active">{item.active_assignment_count}</span> : null}
            {isContractor ? (
              <span data-label="Performance">
                {item.performance.rated_count
                  ? `${ratingLabel(item.performance.average_rating)} (${item.performance.rated_count})`
                  : "Not yet rated"}
              </span>
            ) : null}
            {isContractor ? (
              <span className="money-stack" data-label="Outstanding">
                {item.outstanding_by_currency.filter(
                  (row) => Number.parseFloat(String(row.remaining)) > 0,
                ).length === 0
                  ? "—"
                  : item.outstanding_by_currency
                      .filter((row) => Number.parseFloat(String(row.remaining)) > 0)
                      .map((row) => (
                        <span key={row.currency}>{formatMoney(row.remaining, row.currency)}</span>
                      ))}
              </span>
            ) : null}
            <span data-label="Updated">{shortDate(item.updated_at)}</span>
            <Link
              className="partner-register-action text-link"
              data-label="Action"
              href={`${base}/${item.id}`}
            >
              Open
            </Link>
          </li>
        ))}
      </ol>
      <nav aria-label="Partner pagination" className="pagination">
        {filters.cursorUpdatedAt ? (
          <Link className="button button-quiet" href={partnerListUrl(filters)}>
            Back to first page
          </Link>
        ) : null}
        {result.has_more && result.next_cursor_updated_at && result.next_cursor_id ? (
          <Link
            className="button button-secondary"
            href={partnerListUrl(filters, {
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
