import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { ClientList } from "@/features/clients/components/client-list";
import { clientTierLabels, clientTiers } from "@/features/clients/client-contract";
import { loadClientList, normalizeClientListFilters } from "@/features/clients/client-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clients | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function ClientsPage({
  searchParams,
}: PageProps<"/admin/operations/clients">) {
  await requirePermission("clients.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizeClientListFilters(params);
  const result = await loadClientList(filters);
  const filtered = Boolean(filters.search || filters.tier || filters.statusScope !== "active");

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Clients" }]} />
      <PageHeader
        actions={
          access.permissions.includes("clients.write") ? (
            <Link className="button button-primary" href="/admin/operations/clients/new">
              New client
            </Link>
          ) : null
        }
        description="A bounded client register with tier, primary contact, and a live project count. This is the client's identity record — never public content."
        eyebrow="Operations"
        status={<RealtimeRefresh entityTypes={["client", "operational_project"]} />}
        title="Clients"
      />

      <form
        action="/admin/operations/clients"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="client-search">Search clients</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="client-search"
            maxLength={100}
            name="q"
            placeholder="Name, company, email, or phone"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="client-tier">Tier</label>
          <select defaultValue={filters.tier ?? ""} id="client-tier" name="tier">
            <option value="">All tiers</option>
            {clientTiers.map((tier) => (
              <option key={tier} value={tier}>
                {clientTierLabels[tier]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="client-status">Status</label>
          <select defaultValue={filters.statusScope} id="client-status" name="status">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filtered ? (
          <Link className="filter-clear" href="/admin/operations/clients">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Clients register" className="register-section">
        <ClientList filters={filters} result={result} />
      </section>
    </main>
  );
}
