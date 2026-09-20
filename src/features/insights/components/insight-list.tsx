import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { InsightList } from "@/features/insights/insight-data";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}

export function InsightListView({ list }: Readonly<{ list: InsightList }>) {
  if (list.items.length === 0) {
    return <p className="quiet-empty">No insights match. Write one with “New insight”.</p>;
  }
  return (
    <>
      <div aria-hidden="true" className="page-register-heading">
        <span>Article</span>
        <span>Topic</span>
        <span>State</span>
        <span>Date</span>
        <span>Ready</span>
      </div>
      <ol className="page-register">
        {list.items.map((item) => (
          <li key={item.id}>
            <div className="page-register-identity">
              <Link href={`/admin/content/insights/${item.id}`}>{item.title}</Link>
              <span>/insights/{item.slug}</span>
            </div>
            <span data-label="Topic">{item.topic ?? "—"}</span>
            <span className="page-register-state" data-label="State">
              <StatusBadge tone={item.publication_status}>
                {item.publication_status.charAt(0).toUpperCase() + item.publication_status.slice(1)}
              </StatusBadge>
              {item.has_draft_changes ? (
                <StatusBadge tone="review">Draft changes</StatusBadge>
              ) : null}
              {item.pinned ? (
                <StatusBadge tone="neutral">Pinned</StatusBadge>
              ) : item.featured ? (
                <StatusBadge tone="neutral">Featured</StatusBadge>
              ) : null}
            </span>
            <span data-label="Date">{formatDate(item.publication_date)}</span>
            <span data-label="Ready">
              <StatusBadge tone={item.readiness}>
                {item.readiness === "ready" ? "Ready" : `Blocked · ${item.blocker_count}`}
              </StatusBadge>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
