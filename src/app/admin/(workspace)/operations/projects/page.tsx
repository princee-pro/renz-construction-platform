import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { RealtimeRefresh } from "@/features/admin-shared/realtime-refresh";
import { ProjectList } from "@/features/operational-projects/components/project-list";
import {
  projectPhaseLabels,
  projectPhases,
  projectPriorities,
  projectPriorityLabels,
  projectStatusLabels,
  projectStatuses,
} from "@/features/operational-projects/project-contract";
import {
  loadProjectList,
  normalizeProjectListFilters,
} from "@/features/operational-projects/project-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function OperationalProjectsPage({
  searchParams,
}: PageProps<"/admin/operations/projects">) {
  await requirePermission("operations.projects.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizeProjectListFilters(params);
  const result = await loadProjectList(filters);
  const filtered = Boolean(
    filters.search ||
    filters.status ||
    filters.phase ||
    filters.priority ||
    filters.caseStudy ||
    (filters.statusScope && filters.statusScope !== "active"),
  );

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Projects" }]} />
      <PageHeader
        actions={
          access.permissions.includes("operations.projects.write") ? (
            <Link className="button button-primary" href="/admin/operations/projects/new">
              New project
            </Link>
          ) : null
        }
        description="Operational construction projects tied to a client. This register is distinct from the public website Projects register (Website → Projects)."
        eyebrow="Operations"
        status={<RealtimeRefresh entityTypes={["operational_project", "client"]} />}
        title="Projects"
      />

      <form
        action="/admin/operations/projects"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="project-search">Search projects</label>
          <input
            autoComplete="off"
            defaultValue={filters.search}
            id="project-search"
            maxLength={100}
            name="q"
            placeholder="Project title"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="project-status">Status</label>
          <select defaultValue={filters.status ?? ""} id="project-status" name="status">
            <option value="">All statuses</option>
            {projectStatuses.map((status) => (
              <option key={status} value={status}>
                {projectStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="project-phase">Phase</label>
          <select defaultValue={filters.phase ?? ""} id="project-phase" name="phase">
            <option value="">All phases</option>
            {projectPhases.map((phase) => (
              <option key={phase} value={phase}>
                {projectPhaseLabels[phase]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="project-priority">Priority</label>
          <select defaultValue={filters.priority ?? ""} id="project-priority" name="priority">
            <option value="">All priorities</option>
            {projectPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {projectPriorityLabels[priority]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="project-case-study">Case study</label>
          <select defaultValue={filters.caseStudy ?? ""} id="project-case-study" name="caseStudy">
            <option value="">Linked or unlinked</option>
            <option value="linked">Linked</option>
            <option value="unlinked">Unlinked</option>
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="project-scope">Status scope</label>
          <select defaultValue={filters.statusScope} id="project-scope" name="scope">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filtered ? (
          <Link className="filter-clear" href="/admin/operations/projects">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Projects register" className="register-section">
        <ProjectList filters={filters} result={result} />
      </section>
    </main>
  );
}
