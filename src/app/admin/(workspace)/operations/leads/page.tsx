import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { needLabels } from "@/features/intake/intake-policy";
import { LeadList, leadListUrl } from "@/features/leads/components/lead-list";
import {
  leadSourceLabels,
  leadSources,
  leadStatusLabels,
  leadStatusTones,
  leadStatuses,
  leadTypeLabels,
} from "@/features/leads/lead-contract";
import {
  leadFiltersActive,
  loadLeadList,
  normalizeLeadListFilters,
} from "@/features/leads/lead-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function LeadsPage({ searchParams }: PageProps<"/admin/operations/leads">) {
  await requirePermission("leads.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizeLeadListFilters(params);
  const result = await loadLeadList(filters, filters.view === "pipeline" ? 100 : 25);
  const filtered = leadFiltersActive(filters);
  const total = Object.values(result.status_counts).reduce((sum, value) => sum + value, 0);

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Leads" }]} />
      <PageHeader
        actions={
          access.permissions.includes("leads.write") ? (
            <Link className="button button-primary" href="/admin/operations/leads/new">
              New lead
            </Link>
          ) : null
        }
        description="Every website enquiry and staff-recorded lead, from New to Won or Lost. Leads are private records; nothing here is public."
        eyebrow="Operations"
        status={<RealtimeRefresh entityTypes={["lead"]} />}
        title="Leads"
      />

      <nav aria-label="Quick filters" className="lead-quick-filters">
        <Link
          aria-current={!filters.assigned && !filters.status ? "page" : undefined}
          className="lead-quick-filter"
          href={leadListUrl(filters, {
            assigned: "",
            status: "",
            cursorId: "",
            cursorSubmittedAt: "",
          })}
        >
          All open <span>{total}</span>
        </Link>
        <Link
          aria-current={filters.assigned === "me" ? "page" : undefined}
          className="lead-quick-filter"
          href={leadListUrl(filters, { assigned: "me", cursorId: "", cursorSubmittedAt: "" })}
        >
          My leads
        </Link>
        <Link
          aria-current={filters.assigned === "unassigned" ? "page" : undefined}
          className="lead-quick-filter"
          href={leadListUrl(filters, {
            assigned: "unassigned",
            cursorId: "",
            cursorSubmittedAt: "",
          })}
        >
          Unassigned
        </Link>
        <Link
          aria-current={filters.status === "new" ? "page" : undefined}
          className="lead-quick-filter"
          href={leadListUrl(filters, { status: "new", cursorId: "", cursorSubmittedAt: "" })}
        >
          New <span>{result.status_counts["new"] ?? 0}</span>
        </Link>
        <span className="lead-quick-filter-spacer" />
        <Link
          aria-current={filters.view === "table" ? "page" : undefined}
          className="lead-quick-filter"
          href={leadListUrl(filters, { view: "table", cursorId: "", cursorSubmittedAt: "" })}
        >
          Table
        </Link>
        <Link
          aria-current={filters.view === "pipeline" ? "page" : undefined}
          className="lead-quick-filter"
          href={leadListUrl(filters, { view: "pipeline", cursorId: "", cursorSubmittedAt: "" })}
        >
          Pipeline
        </Link>
      </nav>

      <ul aria-label="Leads by stage" className="lead-status-counts">
        {leadStatuses.map((status) => (
          <li key={status}>
            <Link href={leadListUrl(filters, { status, cursorId: "", cursorSubmittedAt: "" })}>
              <StatusBadge tone={leadStatusTones[status]}>{leadStatusLabels[status]}</StatusBadge>
              <strong>{result.status_counts[status] ?? 0}</strong>
            </Link>
          </li>
        ))}
      </ul>

      <form
        action="/admin/operations/leads"
        className="service-filters lead-filters"
        method="get"
        noValidate
        role="search"
      >
        {filters.view === "pipeline" ? <input name="view" type="hidden" value="pipeline" /> : null}
        <div className="field-group filter-search">
          <label htmlFor="lead-search">Search leads</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="lead-search"
            maxLength={100}
            name="q"
            placeholder="Reference, name, company, email or phone"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="lead-type">Type</label>
          <select defaultValue={filters.type} id="lead-type" name="type">
            <option value="">All types</option>
            {Object.entries(leadTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="lead-status">Status</label>
          <select defaultValue={filters.status} id="lead-status" name="status">
            <option value="">All stages</option>
            {leadStatuses.map((status) => (
              <option key={status} value={status}>
                {leadStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="lead-service">Service</label>
          <select defaultValue={filters.service} id="lead-service" name="service">
            <option value="">Any service</option>
            {Object.entries(needLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="lead-assigned">Assigned</label>
          <select
            defaultValue={
              filters.assigned === "me" || filters.assigned === "unassigned" ? filters.assigned : ""
            }
            id="lead-assigned"
            name="assigned"
          >
            <option value="">Anyone</option>
            <option value="me">Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="lead-source">Source</label>
          <select defaultValue={filters.source} id="lead-source" name="source">
            <option value="">Any source</option>
            {leadSources.map((source) => (
              <option key={source} value={source}>
                {leadSourceLabels[source]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="lead-from">From</label>
          <input defaultValue={filters.from} id="lead-from" name="from" type="date" />
        </div>
        <div className="field-group">
          <label htmlFor="lead-to">To</label>
          <input defaultValue={filters.to} id="lead-to" name="to" type="date" />
        </div>
        <div className="field-group">
          <label htmlFor="lead-scope">Records</label>
          <select defaultValue={filters.scope} id="lead-scope" name="scope">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filtered ? (
          <Link className="filter-clear" href="/admin/operations/leads">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Leads register" className="register-section">
        <LeadList filters={filters} result={result} />
      </section>
    </main>
  );
}
