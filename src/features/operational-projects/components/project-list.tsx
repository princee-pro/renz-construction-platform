import Link from "next/link";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { ProjectListFilters } from "@/features/operational-projects/project-data";
import {
  projectHealth,
  projectHealthLabels,
  projectPhaseLabels,
  projectPriorityLabels,
  projectStatusLabels,
  type OperationalProjectListResult,
} from "@/features/operational-projects/project-contract";

function listUrl(filters: ProjectListFilters, cursor?: Readonly<{ u: string; i: string }>): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.clientId) params.set("client", filters.clientId);
  if (filters.status) params.set("status", filters.status);
  if (filters.phase) params.set("phase", filters.phase);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.statusScope && filters.statusScope !== "active")
    params.set("scope", filters.statusScope);
  if (filters.caseStudy) params.set("caseStudy", filters.caseStudy);
  if (cursor) {
    params.set("cu", cursor.u);
    params.set("ci", cursor.i);
  }
  const query = params.toString();
  return query ? `/admin/operations/projects?${query}` : "/admin/operations/projects";
}

function formatBudget(amount: string | number | null, currency: string | null): string {
  if (amount === null || currency === null) return "—";
  const numeric = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return `${currency} ${new Intl.NumberFormat("en").format(numeric)}`;
}

function priorityTone(priority: string): "ready" | "review" | "blocked" {
  if (priority === "high") return "blocked";
  if (priority === "medium") return "review";
  return "ready";
}

function healthTone(health: "on_track" | "attention" | "overdue"): "ready" | "review" | "blocked" {
  if (health === "overdue") return "blocked";
  if (health === "attention") return "review";
  return "ready";
}

export function ProjectList({
  result,
  filters,
}: Readonly<{
  result: OperationalProjectListResult;
  filters: ProjectListFilters;
}>) {
  const filtered = Boolean(
    filters.search ||
    filters.clientId ||
    filters.status ||
    filters.phase ||
    filters.priority ||
    filters.caseStudy ||
    (filters.statusScope && filters.statusScope !== "active"),
  );

  if (result.items.length === 0) {
    return (
      <EmptyState
        action={
          filtered ? (
            <Link className="button button-secondary" href="/admin/operations/projects">
              Clear filters
            </Link>
          ) : (
            <Link className="button button-primary" href="/admin/operations/projects/new">
              Create first project
            </Link>
          )
        }
        title={filtered ? "No projects match these filters" : "No projects yet"}
      >
        <p>
          {filtered
            ? "Adjust or clear the current search and filters."
            : "The operational project register is empty. Create a project against an existing client."}
        </p>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="ops-project-register-heading" aria-hidden="true">
        <span>Project</span>
        <span>Client</span>
        <span>Status</span>
        <span>Phase</span>
        <span>Priority</span>
        <span>Budget</span>
        <span>Action</span>
      </div>
      <ol className="ops-project-register">
        {result.items.map((item) => (
          <li key={item.id}>
            <div className="ops-register-identity">
              <Link href={`/admin/operations/projects/${item.id}`}>{item.title}</Link>
              <span>
                {item.end_date ? `Ends ${item.end_date}` : "No end date"}
                {item.archived_at ? " · Archived" : ""}
                {item.case_study ? " · Case study linked" : ""}
              </span>
              {(() => {
                const health = projectHealth(item);
                return health ? (
                  <StatusBadge tone={healthTone(health)}>{projectHealthLabels[health]}</StatusBadge>
                ) : null;
              })()}
            </div>
            <span data-label="Client">
              <Link href={`/admin/operations/clients/${item.client.id}`}>
                {item.client.full_name}
              </Link>
            </span>
            <div data-label="Status">
              <StatusBadge tone={item.status === "completed" ? "ready" : "neutral"}>
                {projectStatusLabels[item.status]}
              </StatusBadge>
            </div>
            <span data-label="Phase">{projectPhaseLabels[item.current_phase]}</span>
            <div data-label="Priority">
              <StatusBadge tone={priorityTone(item.priority)}>
                {projectPriorityLabels[item.priority]}
              </StatusBadge>
            </div>
            <span data-label="Budget">
              {formatBudget(item.budget_amount, item.budget_currency)}
            </span>
            <Link
              className="ops-register-action text-link"
              data-label="Action"
              href={`/admin/operations/projects/${item.id}`}
            >
              Open
            </Link>
          </li>
        ))}
      </ol>
      <nav aria-label="Projects pagination" className="pagination">
        {filters.cursorId ? (
          <Link className="button button-quiet" href={listUrl(filters)}>
            First page
          </Link>
        ) : (
          <span />
        )}
        {result.has_more && result.next_cursor_id && result.next_cursor_updated_at ? (
          <Link
            className="button button-secondary"
            href={listUrl(filters, { u: result.next_cursor_updated_at, i: result.next_cursor_id })}
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
