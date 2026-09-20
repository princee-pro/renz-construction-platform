import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { PurchaseOrderList, isPoListFiltered } from "@/features/procurement/components/po-list";
import {
  deliveryStateLabels,
  deliveryStates,
  poLifecycleLabels,
  poLifecycleStates,
} from "@/features/procurement/procurement-contract";
import { loadPoList, normalizePoListFilters } from "@/features/procurement/procurement-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchase Orders | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function PurchaseOrdersPage({
  searchParams,
}: PageProps<"/admin/procurement/orders">) {
  await requirePermission("procurement.orders.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizePoListFilters(params);
  const result = await loadPoList(filters);
  const canWrite = access.permissions.includes("procurement.orders.write");

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { label: "Procurement" },
          { label: "Purchase Orders" },
        ]}
      />
      <PageHeader
        actions={
          canWrite ? (
            <Link className="button button-primary" href="/admin/procurement/orders/new">
              New purchase order
            </Link>
          ) : null
        }
        description="Drafts, issued orders and deliveries. Amounts are shown in each order's own currency and are never combined across currencies."
        eyebrow="Procurement"
        status={<RealtimeRefresh entityTypes={["purchase_order"]} />}
        title="Purchase Orders"
      />

      <form
        action="/admin/procurement/orders"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="po-search">Search purchase orders</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="po-search"
            maxLength={100}
            name="q"
            placeholder="Number, reference, supplier, or project"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="po-lifecycle">Lifecycle</label>
          <select defaultValue={filters.lifecycle} id="po-lifecycle" name="lifecycle">
            <option value="">All</option>
            {poLifecycleStates.map((state) => (
              <option key={state} value={state}>
                {poLifecycleLabels[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="po-delivery">Delivery</label>
          <select defaultValue={filters.delivery} id="po-delivery" name="delivery">
            <option value="">Any</option>
            {deliveryStates.map((state) => (
              <option key={state} value={state}>
                {deliveryStateLabels[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="po-currency">Currency</label>
          <input
            defaultValue={filters.currency}
            id="po-currency"
            maxLength={3}
            name="currency"
            placeholder="RWF"
            style={{ textTransform: "uppercase" }}
            type="text"
          />
        </div>
        <div className="field-group">
          <label htmlFor="po-from">Issued from</label>
          <input defaultValue={filters.issuedFrom} id="po-from" name="from" type="date" />
        </div>
        <div className="field-group">
          <label htmlFor="po-to">Issued to</label>
          <input defaultValue={filters.issuedTo} id="po-to" name="to" type="date" />
        </div>
        <div className="field-group filter-check">
          <label htmlFor="po-delayed">
            <input
              defaultChecked={filters.delayed}
              id="po-delayed"
              name="delayed"
              type="checkbox"
              value="1"
            />{" "}
            Delayed only
          </label>
        </div>
        {filters.supplierId ? (
          <input name="supplier" type="hidden" value={filters.supplierId} />
        ) : null}
        {filters.projectId ? (
          <input name="project" type="hidden" value={filters.projectId} />
        ) : null}
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {isPoListFiltered(filters) ? (
          <Link className="filter-clear" href="/admin/procurement/orders">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Purchase order register" className="register-section">
        <PurchaseOrderList canWrite={canWrite} filters={filters} result={result} />
      </section>
    </main>
  );
}
