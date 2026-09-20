import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  formatLeadDateTime,
  leadQueueLabels,
  leadStatusLabels,
  leadStatusTones,
  leadStatuses,
  leadTypeLabel,
  leadTypeLabels,
  type LeadOverview,
  type LeadQueueItem,
} from "@/features/leads/lead-contract";

/**
 * Control Room lead module (C8 §66–68): exact counts and a deterministic
 * action queue — no conversion rates, no scoring (C9 owns analytics).
 */
export function LeadOverviewSection({
  overview,
  queue,
}: Readonly<{ overview: LeadOverview; queue: readonly LeadQueueItem[] }>) {
  const open = leadStatuses
    .filter((status) => status !== "won" && status !== "lost")
    .reduce((sum, status) => sum + (overview.status_counts[status] ?? 0), 0);
  return (
    <section aria-labelledby="leads-heading" className="overview-section">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Leads</p>
          <h2 id="leads-heading">Enquiries &amp; pipeline</h2>
        </div>
        <div className="page-actions">
          <Link className="text-link" href="/admin/operations/leads">
            Open Leads
          </Link>
          <Link className="text-link" href="/admin/operations/leads?assigned=unassigned">
            Unassigned
          </Link>
        </div>
      </div>
      <dl className="metric-register">
        <div className={(overview.status_counts["new"] ?? 0) > 0 ? "metric-attention" : undefined}>
          <dt>New leads</dt>
          <dd>{overview.status_counts["new"] ?? 0}</dd>
        </div>
        <div className={overview.unassigned_count > 0 ? "metric-attention" : undefined}>
          <dt>Unassigned</dt>
          <dd>{overview.unassigned_count}</dd>
        </div>
        <div>
          <dt>Open leads</dt>
          <dd>{open}</dd>
        </div>
        <div>
          <dt>New today</dt>
          <dd>{overview.new_today_count}</dd>
        </div>
      </dl>
      <div className="overview-grid">
        <section aria-labelledby="lead-stage-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="lead-stage-heading">By stage</h2>
          </div>
          <dl className="definition-register">
            {leadStatuses.map((status) => (
              <div key={status}>
                <dt>{leadStatusLabels[status]}</dt>
                <dd>{overview.status_counts[status] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="lead-type-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="lead-type-heading">By type and outcome</h2>
          </div>
          <dl className="definition-register">
            {Object.entries(leadTypeLabels).map(([type, label]) => (
              <div key={type}>
                <dt>{label}</dt>
                <dd>{overview.type_counts[type] ?? 0}</dd>
              </div>
            ))}
            <div>
              <dt>Won (30 days)</dt>
              <dd>{overview.won_30d_count}</dd>
            </div>
            <div>
              <dt>Lost (30 days)</dt>
              <dd>{overview.lost_30d_count}</dd>
            </div>
          </dl>
        </section>
        <section aria-labelledby="lead-recent-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="lead-recent-heading">Recent submissions</h2>
          </div>
          {overview.recent.length > 0 ? (
            <ul className="activity-list lead-recent-list">
              {overview.recent.map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/operations/leads/${item.id}`}>
                    <span className="lead-reference">{item.reference}</span> {item.full_name}
                  </Link>
                  <span>
                    {leadTypeLabel(item.lead_type)} ·{" "}
                    <StatusBadge tone={leadStatusTones[item.status]}>
                      {leadStatusLabels[item.status]}
                    </StatusBadge>{" "}
                    · {formatLeadDateTime(item.submitted_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">
              No enquiries yet. Website submissions appear here immediately.
            </p>
          )}
        </section>
        <section aria-labelledby="lead-queue-heading" className="admin-panel">
          <div className="section-heading-row section-heading-compact">
            <h2 id="lead-queue-heading">Lead action queue</h2>
            <StatusBadge tone={queue.length > 0 ? "blocked" : "ready"}>
              {queue.length > 0 ? "Attention" : "Clear"}
            </StatusBadge>
          </div>
          {queue.length > 0 ? (
            <ul className="action-queue-list">
              {queue.map((item, index) => (
                <li key={`${item.kind}-${item.lead_id}-${index}`}>
                  <Link href={`/admin/operations/leads/${item.lead_id}`}>
                    {item.reference} · {item.title}
                  </Link>
                  <span>
                    {leadQueueLabels[item.kind] ?? item.kind} · {item.detail}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-empty">
              No lead needs action. Thresholds: {overview.uncontacted_hours ?? 24}h uncontacted,{" "}
              {overview.proposal_stale_days ?? 14}d stale proposal.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
