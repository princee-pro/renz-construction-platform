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
  title: "Suppliers | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function SuppliersPage({
  searchParams,
}: PageProps<"/admin/procurement/suppliers">) {
  await requirePermission("partners.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizePartnerListFilters("supplier", params);
  const result = await loadPartnerList(filters);
  const canWrite = access.permissions.includes("partners.write");
  const base = partnerBaseHref("supplier");
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
          { href: "/admin/procurement/orders", label: "Procurement" },
          { label: "Suppliers" },
        ]}
      />
      <PageHeader
        actions={
          canWrite ? (
            <Link className="button button-primary" href={`${base}/new`}>
              New supplier
            </Link>
          ) : null
        }
        description="Trade partners with the supplier capability. Raise purchase orders against them and track deliveries. A contractor can gain the supplier capability without a duplicate record."
        eyebrow="Procurement"
        status={<RealtimeRefresh entityTypes={["trade_partner"]} />}
        title="Suppliers"
      />

      <form action={base} className="service-filters" method="get" noValidate role="search">
        <div className="field-group filter-search">
          <label htmlFor="partner-search">Search suppliers</label>
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

      <section aria-label="Suppliers register" className="register-section">
        <PartnerList canWrite={canWrite} filters={filters} result={result} />
      </section>
    </main>
  );
}
