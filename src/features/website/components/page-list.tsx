import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { PageListItem } from "@/features/website/contracts";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

const typeLabels: Readonly<Record<string, string>> = {
  system: "System page",
  content: "Content page",
  custom: "Custom page",
  global: "Global content",
};

export function PageList({ pages }: Readonly<{ pages: readonly PageListItem[] }>) {
  return (
    <section aria-label="Pages register" className="register-section">
      <div aria-hidden="true" className="page-register-heading">
        <span>Page</span>
        <span>Type</span>
        <span>State</span>
        <span>Updated</span>
        <span>Health</span>
      </div>
      <ol className="page-register">
        {pages.map((page) => {
          const errors = page.health.filter((entry) => entry.severity === "error").length;
          const warnings = page.health.filter((entry) => entry.severity === "warning").length;
          return (
            <li key={page.id}>
              <div className="page-register-identity">
                <Link href={`/admin/website/pages/${page.id}`}>{page.title}</Link>
                <span>{page.page_type === "global" ? "No public address" : page.path}</span>
              </div>
              <span data-label="Type">{typeLabels[page.page_type] ?? page.page_type}</span>
              <span className="page-register-state" data-label="State">
                <StatusBadge
                  tone={
                    page.status === "published"
                      ? "published"
                      : page.status === "archived"
                        ? "archived"
                        : "draft"
                  }
                >
                  {page.status === "published"
                    ? "Published"
                    : page.status === "archived"
                      ? "Archived"
                      : "Draft"}
                </StatusBadge>
                {page.status === "published" && page.has_draft_changes ? (
                  <StatusBadge tone="review">Draft changes</StatusBadge>
                ) : null}
                {page.noindex ? <StatusBadge tone="neutral">Noindex</StatusBadge> : null}
              </span>
              <span data-label="Updated">
                {formatDate(page.updated_at)}
                {page.updated_by ? ` · ${page.updated_by}` : ""}
              </span>
              <span data-label="Health">
                {errors > 0 ? (
                  <StatusBadge tone="blocked">{errors} to fix</StatusBadge>
                ) : warnings > 0 ? (
                  <StatusBadge tone="review">{warnings} to review</StatusBadge>
                ) : (
                  <StatusBadge tone="ready">OK</StatusBadge>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
