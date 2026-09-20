import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { HealthReport } from "@/lib/ops/health";

const tone = { ok: "ready", warning: "review", blocked: "blocked" } as const;
const words = { ok: "Healthy", warning: "Needs attention", blocked: "Problem" } as const;

/** Owner-only System Health (C10 §35): safe categories, never secrets. */
export function SystemHealthPanel({ report }: Readonly<{ report: HealthReport }>) {
  return (
    <section aria-labelledby="system-health-heading" className="admin-panel">
      <div className="section-heading-row section-heading-compact">
        <h2 id="system-health-heading">System health</h2>
        <StatusBadge tone={tone[report.status]}>{words[report.status]}</StatusBadge>
      </div>
      <p className="panel-copy">
        Version {report.version} · build {report.build} · {report.environment} · checked{" "}
        {new Intl.DateTimeFormat("en", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(new Date(report.timestamp))}{" "}
        UTC. Keys and addresses are never shown here.
      </p>
      <ul className="health-list">
        {report.checks.map((check) => (
          <li key={check.key}>
            <StatusBadge tone={tone[check.state]}>{words[check.state]}</StatusBadge>
            <span>
              <strong>{check.label}</strong>
              <small>{check.note}</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="field-help">
        The same status is available to monitoring at <code>/api/health</code> (status, version and
        dependency categories only).
      </p>
    </section>
  );
}
