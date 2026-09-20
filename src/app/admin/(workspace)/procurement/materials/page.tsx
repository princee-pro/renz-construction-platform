import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { MaterialList } from "@/features/procurement/components/material-list";
import { materialCategoryOptions } from "@/features/procurement/procurement-contract";
import {
  loadMaterialList,
  normalizeMaterialListFilters,
} from "@/features/procurement/procurement-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Materials | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function MaterialsPage({
  searchParams,
}: PageProps<"/admin/procurement/materials">) {
  await requirePermission("procurement.materials.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizeMaterialListFilters(params);
  const result = await loadMaterialList(filters);
  const canWrite = access.permissions.includes("procurement.materials.write");
  const filtered = Boolean(filters.search || filters.category || filters.statusScope !== "active");

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/orders", label: "Procurement" },
          { label: "Materials" },
        ]}
      />
      <PageHeader
        actions={
          canWrite ? (
            <Link className="button button-primary" href="/admin/procurement/materials/new">
              New material
            </Link>
          ) : null
        }
        description="The reusable material catalog: name, unit, category and preferred supplier. Requirements and purchase order lines may reference it; free-text items remain allowed."
        eyebrow="Procurement"
        status={<RealtimeRefresh entityTypes={["material"]} />}
        title="Materials"
      />

      <form
        action="/admin/procurement/materials"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="material-search">Search materials</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="material-search"
            maxLength={100}
            name="q"
            placeholder="Name, code, or category"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="material-category">Category</label>
          <select defaultValue={filters.category} id="material-category" name="category">
            <option value="">Any</option>
            {materialCategoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            {filters.category &&
            !materialCategoryOptions.some((option) => option === filters.category) ? (
              <option value={filters.category}>{filters.category}</option>
            ) : null}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="material-status">Status</label>
          <select defaultValue={filters.statusScope} id="material-status" name="status">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filtered ? (
          <Link className="filter-clear" href="/admin/procurement/materials">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Material catalog" className="register-section">
        <MaterialList canWrite={canWrite} filters={filters} result={result} />
      </section>
    </main>
  );
}
