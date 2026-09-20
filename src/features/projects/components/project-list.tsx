import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { encodeProjectCursor, type ProjectListFilters } from "@/features/projects/project-data";
import type { ProjectListResult } from "@/features/projects/project-contract";

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function projectUrl(id: string, locale: string): string {
  return `/admin/content/projects/${id}?locale=${encodeURIComponent(locale)}`;
}

function listUrl(filters: ProjectListFilters, cursor = ""): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.locale) params.set("locale", filters.locale);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `/admin/content/projects?${query}` : "/admin/content/projects";
}

export function ProjectList({
  result,
  filters,
  canCreate,
}: Readonly<{
  result: ProjectListResult;
  filters: ProjectListFilters;
  canCreate: boolean;
}>) {
  const filtered = Boolean(
    filters.query || filters.locale || filters.type || filters.status !== "all" || filters.cursor,
  );

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/content/projects">
              Clear filters
            </Link>
          ) : canCreate ? (
            <Link className="button button-primary" href="/admin/content/projects/new">
              Create first draft
            </Link>
          ) : null
        }
        title={filtered ? "No projects match these filters" : "No project drafts yet"}
      >
        <p>
          {filtered
            ? "Adjust or clear the current search and filters."
            : "The Projects register is empty. Create a project and it appears on the website once published."}
        </p>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="project-register-heading" aria-hidden="true">
        <span>Project</span>
        <span>Status</span>
        <span>Readiness</span>
        <span>Media</span>
        <span>Updated</span>
      </div>
      <ol className="project-register">
        {result.items.map((project) => (
          <li key={`${project.id}:${project.locale}`}>
            <div className="project-register-identity">
              <Link href={projectUrl(project.id, project.locale)}>{project.title}</Link>
              <span>
                /{project.slug} · {project.locale}
                {project.project_type ? ` · ${project.project_type}` : ""}
                {project.public_location ? ` · ${project.public_location}` : ""}
                {project.featured ? " · Featured" : ""}
              </span>
            </div>
            <div data-label="Status">
              <StatusBadge tone={project.publication_status}>
                {titleCase(project.publication_status)}
              </StatusBadge>
            </div>
            <div data-label="Readiness">
              <StatusBadge tone={project.readiness}>
                {project.readiness === "ready" ? "Ready" : `Blocked · ${project.blocker_count}`}
              </StatusBadge>
            </div>
            <span data-label="Media" className="project-media-count">
              {project.media_count}
            </span>
            <time data-label="Updated" dateTime={project.updated_at}>
              {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                new Date(project.updated_at),
              )}
            </time>
          </li>
        ))}
      </ol>
      <nav aria-label="Projects pagination" className="pagination">
        {filters.cursor ? (
          <Link className="button button-quiet" href={listUrl(filters)}>
            First page
          </Link>
        ) : (
          <span />
        )}
        {result.has_more && result.next_cursor ? (
          <Link
            className="button button-secondary"
            href={listUrl(filters, encodeProjectCursor(result.next_cursor))}
          >
            Next 25
          </Link>
        ) : (
          <span className="pagination-end">End of register</span>
        )}
      </nav>
    </>
  );
}
