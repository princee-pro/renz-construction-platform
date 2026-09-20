import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import { PublishPanel } from "@/features/settings/components/publish-panel";
import {
  legalSlugLabels,
  readinessLabels,
  readinessTone,
  type SettingsOverview,
} from "@/features/settings/settings-contract";

type Snapshot = Readonly<{
  id: string;
  published_at: string;
  note: string | null;
  is_current: boolean;
  published_by: string | null;
}>;

function formatDateTime(value: string | null): string {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function SettingsOverviewView({
  data,
  history,
  canPublish,
}: Readonly<{ data: SettingsOverview; history: readonly Snapshot[]; canPublish: boolean }>) {
  const domains = data.domains;
  const legal = domains.legal;
  return (
    <div className="settings-view">
      <PublishPanel
        canPublish={canPublish}
        hasUnpublishedChanges={data.has_unpublished_changes}
        publishedAt={data.published_at}
      />
      <div className="settings-grid">
        {domains.business ? (
          <section aria-labelledby="ov-business" className="admin-panel settings-card">
            <h2 id="ov-business">Business</h2>
            <dl className="detail-list">
              <div>
                <dt>Display name</dt>
                <dd>{domains.business.display_name}</dd>
              </div>
              <div>
                <dt>Primary email</dt>
                <dd>{domains.business.email}</dd>
              </div>
              <div>
                <dt>Public contact channels</dt>
                <dd>{domains.business.channel_count}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{domains.business.location_published ? "Publishable" : "Not published"}</dd>
              </div>
            </dl>
            <Link className="text-link" href="/admin/settings/business">
              Open Business
            </Link>
          </section>
        ) : null}
        {domains.website ? (
          <section aria-labelledby="ov-website" className="admin-panel settings-card">
            <h2 id="ov-website">Website & SEO</h2>
            <dl className="detail-list">
              <div>
                <dt>Site mode</dt>
                <dd>
                  <StatusBadge tone={data.site_mode === "live" ? "ready" : "review"}>
                    {data.site_mode.toUpperCase()}
                  </StatusBadge>
                </dd>
              </div>
              <div>
                <dt>Canonical URL</dt>
                <dd>{domains.website.canonical_base_url ?? "Not set"}</dd>
              </div>
              <div>
                <dt>SEO</dt>
                <dd>
                  {domains.website.seo_site_name}
                  {domains.website.meta_description_set
                    ? " · description set"
                    : " · no description"}
                </dd>
              </div>
              <div>
                <dt>Logo</dt>
                <dd>{domains.website.logo_set ? "Media selected" : "Working RENZ mark"}</dd>
              </div>
            </dl>
            <Link className="text-link" href="/admin/settings/website">
              Open Website
            </Link>
          </section>
        ) : null}
        {legal ? (
          <section aria-labelledby="ov-legal" className="admin-panel settings-card">
            <h2 id="ov-legal">Legal</h2>
            <dl className="detail-list">
              {Object.entries(legal).map(([slug, entry]) => (
                <div key={slug}>
                  <dt>{legalSlugLabels[slug as keyof typeof legalSlugLabels] ?? slug}</dt>
                  <dd>
                    <StatusBadge tone={entry.published ? "ready" : "draft"}>
                      {entry.published
                        ? `Published · rev ${entry.revision}`
                        : entry.starter
                          ? "Starter draft"
                          : "Draft"}
                    </StatusBadge>
                  </dd>
                </div>
              ))}
            </dl>
            <Link className="text-link" href="/admin/settings/legal">
              Open Legal Center
            </Link>
          </section>
        ) : null}
        {domains.system ? (
          <section aria-labelledby="ov-system" className="admin-panel settings-card">
            <h2 id="ov-system">Documents & operations</h2>
            <dl className="detail-list">
              <div>
                <dt>Default currency</dt>
                <dd>{domains.system.default_currency}</dd>
              </div>
              <div>
                <dt>Invoice tax label</dt>
                <dd>{domains.system.invoice_tax_label}</dd>
              </div>
            </dl>
            <Link className="text-link" href="/admin/settings/system">
              Open System
            </Link>
          </section>
        ) : null}
        {domains.staff ? (
          <section aria-labelledby="ov-staff" className="admin-panel settings-card">
            <h2 id="ov-staff">Staff & access</h2>
            <dl className="detail-list">
              <div>
                <dt>Active</dt>
                <dd>{domains.staff.active}</dd>
              </div>
              <div>
                <dt>Disabled</dt>
                <dd>{domains.staff.disabled}</dd>
              </div>
            </dl>
            <Link className="text-link" href="/admin/settings/staff">
              Open Staff
            </Link>
          </section>
        ) : null}
        {data.readiness ? (
          <section aria-labelledby="ov-readiness" className="admin-panel settings-card">
            <h2 id="ov-readiness">Launch readiness</h2>
            <p>
              <StatusBadge tone={readinessTone(data.readiness)}>
                {readinessLabels[data.readiness]}
              </StatusBadge>
            </p>
            <Link className="text-link" href="/admin/settings/launch-readiness">
              Open Launch Readiness
            </Link>
          </section>
        ) : null}
      </div>
      <section aria-labelledby="publish-history-heading" className="admin-panel settings-panel">
        <h2 id="publish-history-heading">Publish history</h2>
        {history.length === 0 ? (
          <p className="quiet-empty">The public configuration has not been published yet.</p>
        ) : (
          <ul className="activity-list">
            {history.map((snapshot) => (
              <li key={snapshot.id}>
                <div>
                  <strong>
                    {formatDateTime(snapshot.published_at)}
                    {snapshot.is_current ? " · current" : ""}
                  </strong>
                  <span>
                    {snapshot.published_by ?? "Staff member"}
                    {snapshot.note ? ` — ${snapshot.note}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
