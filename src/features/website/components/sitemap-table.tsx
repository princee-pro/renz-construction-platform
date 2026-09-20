import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { SitemapRow } from "@/features/website/contracts";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

/** Site map / public content register (CR1 §8): the whole public website readable from Admin. */
export function SitemapTable({ rows }: Readonly<{ rows: readonly SitemapRow[] }>) {
  const groups: readonly Readonly<{ kind: SitemapRow["kind"]; label: string }>[] = [
    { kind: "page", label: "Pages" },
    { kind: "service", label: "Services" },
    { kind: "project", label: "Projects" },
    { kind: "insight", label: "Insights" },
    { kind: "legal", label: "Legal" },
  ];
  return (
    <div className="sitemap-register">
      {groups.map((group) => {
        const entries = rows.filter((row) => row.kind === group.kind);
        if (entries.length === 0) return null;
        return (
          <section
            aria-labelledby={`sitemap-${group.kind}`}
            className="register-section"
            key={group.kind}
          >
            <h2 id={`sitemap-${group.kind}`}>
              {group.label} <small>({entries.length})</small>
            </h2>
            <div className="table-scroll">
              <table className="sitemap-table">
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col">Route</th>
                    <th scope="col">Type</th>
                    <th scope="col">Published</th>
                    <th scope="col">Draft</th>
                    <th scope="col">Last updated</th>
                    <th scope="col">Updated by</th>
                    <th scope="col">SEO</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => {
                    const problems = row.health.filter((entry) => entry.severity !== "info");
                    return (
                      <tr key={`${row.kind}-${row.id}`}>
                        <th scope="row">{row.title}</th>
                        <td>
                          {row.status === "published" ? (
                            <a href={row.route} rel="noreferrer" target="_blank">
                              {row.route}
                            </a>
                          ) : (
                            <code>{row.route}</code>
                          )}
                        </td>
                        <td>{row.type}</td>
                        <td>
                          <StatusBadge
                            tone={
                              row.status === "published"
                                ? "published"
                                : row.status === "archived"
                                  ? "archived"
                                  : "draft"
                            }
                          >
                            {row.status === "published"
                              ? "Published"
                              : row.status === "archived"
                                ? "Archived"
                                : "Draft"}
                          </StatusBadge>
                        </td>
                        <td>
                          {row.has_draft_changes ? (
                            <StatusBadge tone="review">Draft changes</StatusBadge>
                          ) : row.status === "published" ? (
                            "Up to date"
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{formatDate(row.updated_at)}</td>
                        <td>{row.updated_by ?? "—"}</td>
                        <td>
                          {row.seo_state === "complete" ? (
                            <StatusBadge tone="ready">Complete</StatusBadge>
                          ) : row.seo_state === "system" ? (
                            "—"
                          ) : (
                            <StatusBadge tone="review">Incomplete</StatusBadge>
                          )}
                          {row.noindex ? " · noindex" : ""}
                          {problems.length > 0
                            ? ` · ${problems.map((entry) => entry.message).join(" ")}`
                            : ""}
                        </td>
                        <td>
                          <Link className="button button-quiet" href={row.href}>
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
