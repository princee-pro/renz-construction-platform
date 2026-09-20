import { StatusBadge } from "@/components/admin/ui/status-badge";
import { SiteModePanel } from "@/features/settings/components/website-settings";
import {
  readinessLabels,
  readinessTone,
  type LaunchReadiness,
  type ReadinessCheck,
} from "@/features/settings/settings-contract";

const classificationLabels = {
  required: "Required",
  recommended: "Recommended",
  optional: "Optional",
  info: "Info",
} as const;

function CheckList({
  checks,
  headingId,
  heading,
}: Readonly<{ checks: readonly ReadinessCheck[]; headingId: string; heading: string }>) {
  return (
    <section aria-labelledby={headingId} className="admin-panel settings-panel">
      <h2 id={headingId}>{heading}</h2>
      <ol className="readiness-list">
        {checks.map((check) => (
          <li key={check.key}>
            <div>
              <strong>{check.label}</strong>
              <span>
                {classificationLabels[check.classification]}
                {check.detail ? ` · ${check.detail}` : ""}
              </span>
            </div>
            <StatusBadge tone={readinessTone(check.state)}>
              {readinessLabels[check.state]}
            </StatusBadge>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * "Can we safely publish this website?" — deterministic READY / WARNING /
 * BLOCKED checks (no arbitrary percentage) plus the external evidence the
 * client still owes, classified required / recommended / optional.
 */
export function LaunchReadinessView({
  data,
  canSwitchMode,
}: Readonly<{ data: LaunchReadiness; canSwitchMode: boolean }>) {
  const blocked = data.checks.filter(
    (check) => check.state === "blocked" && check.classification === "required",
  );
  // D1.5 §80: real counts by state — no invented percentage.
  const tally = {
    ready: data.checks.filter((check) => check.state === "ready").length,
    warning: data.checks.filter((check) => check.state === "warning").length,
    blocked: data.checks.filter((check) => check.state === "blocked").length,
  };
  return (
    <div className="settings-view">
      <section
        aria-labelledby="readiness-summary-heading"
        className={`admin-panel settings-panel readiness-summary readiness-${data.overall}`}
      >
        <div className="section-heading-row section-heading-compact">
          <div>
            <h2 id="readiness-summary-heading">Overall</h2>
            <p className="panel-copy">
              {data.overall === "ready"
                ? "Every required check passes; optional items are complete."
                : data.overall === "warning"
                  ? "Every required check passes. Warnings are recommended or optional items."
                  : `${blocked.length} required check${blocked.length === 1 ? "" : "s"} block going live.`}
            </p>
          </div>
          <StatusBadge tone={readinessTone(data.overall)}>
            {readinessLabels[data.overall]}
          </StatusBadge>
        </div>
        <dl className="readiness-tally" aria-label="Checks by state">
          <div data-state="ready">
            <dt>Ready</dt>
            <dd>{tally.ready}</dd>
          </div>
          <div data-state="warning">
            <dt>Warning</dt>
            <dd>{tally.warning}</dd>
          </div>
          <div data-state="blocked">
            <dt>Blocked</dt>
            <dd>{tally.blocked}</dd>
          </div>
          <div>
            <dt>Required blockers</dt>
            <dd>{blocked.length}</dd>
          </div>
        </dl>
      </section>
      <CheckList
        checks={data.checks}
        heading="System checks"
        headingId="readiness-checks-heading"
      />
      <CheckList
        checks={data.evidence}
        heading="Client evidence still needed"
        headingId="readiness-evidence-heading"
      />
      <SiteModePanel
        canSwitch={canSwitchMode}
        siteMode={data.site_mode}
        version={data.website_version}
      />
    </div>
  );
}
