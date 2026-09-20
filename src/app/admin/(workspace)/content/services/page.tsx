import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ServiceList } from "@/features/services/components/service-list";
import { loadServiceList, normalizeServiceListFilters } from "@/features/services/service-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function ServicesPage({ searchParams }: PageProps<"/admin/content/services">) {
  await requirePermission("content.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizeServiceListFilters(params);
  const result = await loadServiceList(filters);
  const filtered = Boolean(filters.query || filters.locale || filters.status !== "all");

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Services" }]} />
      <PageHeader
        actions={
          access.permissions.includes("content.write") ? (
            <Link className="button button-primary" href="/admin/content/services/new">
              New service
            </Link>
          ) : null
        }
        description="A bounded editorial register with explicit draft, evidence, and publication state."
        eyebrow="Content"
        title="Services"
      />

      <form
        action="/admin/content/services"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="service-search">Search services</label>
          <input
            autoComplete="off"
            defaultValue={filters.query}
            id="service-search"
            maxLength={100}
            name="q"
            placeholder="Name or slug"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="service-status">Status</label>
          <select defaultValue={filters.status} id="service-status" name="status">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="service-locale">Language</label>
          <input
            autoComplete="off"
            defaultValue={filters.locale}
            id="service-locale"
            maxLength={35}
            name="locale"
            placeholder="All locales"
            spellCheck={false}
            type="text"
          />
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filtered ? (
          <Link className="filter-clear" href="/admin/content/services">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Services register" className="register-section">
        <ServiceList
          canCreate={access.permissions.includes("content.write")}
          filters={filters}
          result={result}
        />
      </section>
    </main>
  );
}
