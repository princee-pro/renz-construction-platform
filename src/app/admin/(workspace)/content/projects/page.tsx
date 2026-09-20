import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ProjectList } from "@/features/projects/components/project-list";
import { loadProjectList, normalizeProjectListFilters } from "@/features/projects/project-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function ProjectsPage({ searchParams }: PageProps<"/admin/content/projects">) {
  await requirePermission("content.read");
  const [params, access] = await Promise.all([searchParams, getCurrentAdminAccess()]);
  const filters = normalizeProjectListFilters(params);
  const result = await loadProjectList(filters);
  const filtered = Boolean(
    filters.query || filters.locale || filters.type || filters.status !== "all",
  );

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs items={[{ href: "/admin", label: "Overview" }, { label: "Projects" }]} />
      <PageHeader
        actions={
          access.permissions.includes("content.write") ? (
            <Link className="button button-primary" href="/admin/content/projects/new">
              New case study
            </Link>
          ) : null
        }
        description="Public projects and concept studies. Create a project, upload its photographs, relate services and publish; the website places it automatically."
        eyebrow="Website"
        title="Projects"
      />

      <form
        action="/admin/content/projects"
        className="service-filters"
        method="get"
        noValidate
        role="search"
      >
        <div className="field-group filter-search">
          <label htmlFor="project-search">Search projects</label>
          <input
            autoComplete="off"
            defaultValue={filters.query}
            id="project-search"
            maxLength={100}
            name="q"
            placeholder="Title or slug"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="project-status">Status</label>
          <select defaultValue={filters.status} id="project-status" name="status">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="project-type">Type</label>
          <input
            autoComplete="off"
            defaultValue={filters.type}
            id="project-type"
            maxLength={80}
            name="type"
            placeholder="All types"
            type="text"
          />
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
        {filtered ? (
          <Link className="filter-clear" href="/admin/content/projects">
            Clear filters
          </Link>
        ) : null}
      </form>

      <section aria-label="Case studies register" className="register-section">
        <ProjectList
          canCreate={access.permissions.includes("content.write")}
          filters={filters}
          result={result}
        />
      </section>
    </main>
  );
}
