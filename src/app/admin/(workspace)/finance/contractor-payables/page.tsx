import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { loadPayables, normalizePayablesFilters } from "@/features/assignments/assignment-data";
import {
  assignmentStatusLabels,
  assignmentStatuses,
  paymentStateLabels,
} from "@/features/assignments/assignment-contract";
import { PayablesList, isPayablesFiltered } from "@/features/assignments/components/payables-list";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contractor Payables | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function ContractorPayablesPage({
  searchParams,
}: PageProps<"/admin/finance/contractor-payables">) {
  await requirePermission("partners.read");
  const params = await searchParams;
  const filters = normalizePayablesFilters(params);
  const result = await loadPayables(filters);

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/finance", label: "Finance" },
          { label: "Contractor Payables" },
        ]}
      />
      <PageHeader
        description="What RENZ owes contractors, per assignment: agreed, paid and remaining in each assignment's own currency. Payments are recorded from the assignment page; nothing here creates a payment silently."
        eyebrow="Finance"
        status={<RealtimeRefresh entityTypes={["contractor_assignment"]} />}
        title="Contractor Payables"
      />

      <form
        action="/admin/finance/contractor-payables"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="payables-search">Search payables</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="payables-search"
            maxLength={100}
            name="q"
            placeholder="Contractor, project, or scope"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="payables-status">Assignment</label>
          <select defaultValue={filters.status} id="payables-status" name="status">
            <option value="">Any status</option>
            {assignmentStatuses.map((status) => (
              <option key={status} value={status}>
                {assignmentStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="payables-payment">Payment</label>
          <select defaultValue={filters.payment} id="payables-payment" name="payment">
            <option value="">Any</option>
            {(["unpaid", "partially_paid", "paid"] as const).map((state) => (
              <option key={state} value={state}>
                {paymentStateLabels[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="payables-currency">Currency</label>
          <input
            defaultValue={filters.currency}
            id="payables-currency"
            maxLength={3}
            name="currency"
            placeholder="RWF"
            style={{ textTransform: "uppercase" }}
            type="text"
          />
        </div>
        {filters.partnerId ? (
          <input name="partner" type="hidden" value={filters.partnerId} />
        ) : null}
        {filters.projectId ? (
          <input name="project" type="hidden" value={filters.projectId} />
        ) : null}
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {isPayablesFiltered(filters) ? (
          <Link className="filter-clear" href="/admin/finance/contractor-payables">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Contractor payables register" className="register-section">
        <PayablesList filters={filters} result={result} />
      </section>
    </main>
  );
}
