import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { PartnerList, partnerBaseHref } from "@/features/partners/components/partner-list";
import {
  availabilityLabels,
  availabilityStatuses,
  specializationOptions,
} from "@/features/partners/partner-contract";
import { loadPartnerList, normalizePartnerListFilters } from "@/features/partners/partner-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contractors | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function ContractorsPage({
  searchParams,
}: PageProps<"/admin/operations/contractors">) {
  await requirePermission("partners.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizePartnerListFilters("contractor", params);
  const result = await loadPartnerList(filters);
  const canWrite = access.permissions.includes("partners.write");
  const base = partnerBaseHref("contractor");
  const isContractor = filters.capability === "contractor";
  const filtered = Boolean(
    filters.search ||
    filters.availability ||
    filters.specialization ||
    filters.statusScope !== "active",
  );

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/projects", label: "Operations" },
          { label: "Contractors" },
        ]}
      />
      <PageHeader
        actions={
          canWrite ? (
            <Link className="button button-primary" href={`${base}/new`}>
              New contractor
            </Link>
          ) : null
        }
        description="Trade partners with the contractor capability: specializations, availability, active assignments, performance and outstanding balances per currency."
        eyebrow="Operations"
        status={<RealtimeRefresh entityTypes={["trade_partner"]} />}
        title="Contractors"
      />

      <form action={base} className="service-filters" method="get" noValidate role="search">
        <div className="field-group filter-search">
          <label htmlFor="partner-search">Search contractors</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="partner-search"
            maxLength={100}
            name="q"
            placeholder="Name, company, email, or phone"
            type="search"
          />
        </div>
        {isContractor ? (
          <>
            <div className="field-group">
              <label htmlFor="partner-availability">Availability</label>
              <select
                defaultValue={filters.availability}
                id="partner-availability"
                name="availability"
              >
                <option value="">Any</option>
                {availabilityStatuses.map((status) => (
                  <option key={status} value={status}>
                    {availabilityLabels[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="partner-specialization">Specialization</label>
              <select
                defaultValue={filters.specialization}
                id="partner-specialization"
                name="specialization"
              >
                <option value="">Any</option>
                {specializationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                {filters.specialization &&
                !specializationOptions.some((option) => option === filters.specialization) ? (
                  <option value={filters.specialization}>{filters.specialization}</option>
                ) : null}
              </select>
            </div>
          </>
        ) : null}
        <div className="field-group">
          <label htmlFor="partner-status">Status</label>
          <select defaultValue={filters.statusScope} id="partner-status" name="status">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filtered ? (
          <Link className="filter-clear" href={base}>
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Contractors register" className="register-section">
        <PartnerList canWrite={canWrite} filters={filters} result={result} />
      </section>
    </main>
  );
}
