import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import {
  InvoiceList,
  invoiceListUrl,
  isInvoiceListFiltered,
} from "@/features/invoices/components/invoice-list";
import {
  invoiceLifecycleLabels,
  invoiceLifecycleStates,
  invoicePaymentStateLabels,
  invoicePaymentStates,
} from "@/features/invoices/invoice-contract";
import { loadInvoiceList, normalizeInvoiceListFilters } from "@/features/invoices/invoice-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoices | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function InvoicesPage({ searchParams }: PageProps<"/admin/finance/invoices">) {
  await requirePermission("finance.invoices.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizeInvoiceListFilters(params);
  const result = await loadInvoiceList(filters);
  const canWrite = access.permissions.includes("finance.invoices.write");

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/finance", label: "Finance" },
          { label: "Invoices" },
        ]}
      />
      <PageHeader
        actions={
          <>
            {result.items.length > 0 ? (
              <a
                className="button button-quiet"
                href={invoiceListUrl(filters).replace(
                  "/admin/finance/invoices",
                  "/admin/finance/invoices/export",
                )}
              >
                Export CSV
              </a>
            ) : null}
            {canWrite ? (
              <Link className="button button-primary" href="/admin/finance/invoices/new">
                New invoice
              </Link>
            ) : null}
          </>
        }
        description="Drafts, issued invoices, and payments. Amounts are shown in each invoice's own currency and are never combined across currencies."
        eyebrow="Finance"
        status={<RealtimeRefresh entityTypes={["invoice"]} />}
        title="Invoices"
      />

      <form
        action="/admin/finance/invoices"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="invoice-search">Search invoices</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="invoice-search"
            maxLength={100}
            name="q"
            placeholder="Number, reference, client, or project"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="invoice-lifecycle">Lifecycle</label>
          <select defaultValue={filters.lifecycle} id="invoice-lifecycle" name="lifecycle">
            <option value="">All</option>
            {invoiceLifecycleStates.map((state) => (
              <option key={state} value={state}>
                {invoiceLifecycleLabels[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="invoice-payment">Payment</label>
          <select defaultValue={filters.payment} id="invoice-payment" name="payment">
            <option value="">Any</option>
            {invoicePaymentStates.map((state) => (
              <option key={state} value={state}>
                {invoicePaymentStateLabels[state]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="invoice-currency">Currency</label>
          <input
            defaultValue={filters.currency}
            id="invoice-currency"
            maxLength={3}
            name="currency"
            placeholder="RWF"
            style={{ textTransform: "uppercase" }}
            type="text"
          />
        </div>
        <div className="field-group">
          <label htmlFor="invoice-from">Issued from</label>
          <input defaultValue={filters.issuedFrom} id="invoice-from" name="from" type="date" />
        </div>
        <div className="field-group">
          <label htmlFor="invoice-to">Issued to</label>
          <input defaultValue={filters.issuedTo} id="invoice-to" name="to" type="date" />
        </div>
        <div className="field-group filter-check">
          <label htmlFor="invoice-overdue">
            <input
              defaultChecked={filters.overdue}
              id="invoice-overdue"
              name="overdue"
              type="checkbox"
              value="1"
            />{" "}
            Overdue only
          </label>
          <label htmlFor="invoice-archived">
            <input
              defaultChecked={filters.includeArchived}
              id="invoice-archived"
              name="archived"
              type="checkbox"
              value="1"
            />{" "}
            Include archived drafts
          </label>
        </div>
        {filters.clientId ? <input name="client" type="hidden" value={filters.clientId} /> : null}
        {filters.projectId ? (
          <input name="project" type="hidden" value={filters.projectId} />
        ) : null}
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {isInvoiceListFiltered(filters) ? (
          <Link className="filter-clear" href="/admin/finance/invoices">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Invoice register" className="register-section">
        <InvoiceList canWrite={canWrite} filters={filters} result={result} />
      </section>
    </main>
  );
}
