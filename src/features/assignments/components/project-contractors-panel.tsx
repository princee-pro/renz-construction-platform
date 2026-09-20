import Link from "next/link";

import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  assignmentStatusLabels,
  assignmentStatusTone,
  paymentStateLabels,
  paymentStateTone,
  rateTypeLabels,
  type ProjectContractors,
} from "@/features/assignments/assignment-contract";
import { formatMoney } from "@/features/invoices/invoice-contract";
import { availabilityLabels, ratingScale } from "@/features/partners/partner-contract";

function shortDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

/**
 * Contractors tab of the Project Command Center: a per-currency committed /
 * paid / remaining summary (never combined across currencies) and the
 * assignment list with the project-first Assign Contractor entry.
 */
export function ProjectContractorsPanel({
  data,
  projectId,
  canAssign,
}: Readonly<{ data: ProjectContractors | null; projectId: string; canAssign: boolean }>) {
  if (!data) {
    return <p className="quiet-empty">Contractors could not be loaded for this project.</p>;
  }
  return (
    <div className="notes-workspace">
      {canAssign ? (
        <div className="form-actions form-actions-start">
          <Link
            className="button button-primary"
            href={`/admin/operations/assignments/new?project=${projectId}`}
          >
            Assign Contractor
          </Link>
        </div>
      ) : null}
      {data.summary_by_currency.length > 0 ? (
        <div className="relationship-finance-grid">
          {data.summary_by_currency.map((row) => (
            <dl className="metric-register invoice-money-register" key={row.currency}>
              <div>
                <dt>{row.currency} committed</dt>
                <dd>{formatMoney(row.committed, row.currency)}</dd>
              </div>
              <div>
                <dt>{row.currency} paid</dt>
                <dd>{formatMoney(row.paid, row.currency)}</dd>
              </div>
              <div
                className={
                  Number.parseFloat(String(row.remaining)) > 0 ? "metric-attention" : undefined
                }
              >
                <dt>{row.currency} remaining</dt>
                <dd>{formatMoney(row.remaining, row.currency)}</dd>
              </div>
            </dl>
          ))}
        </div>
      ) : null}
      {data.assignments.length === 0 ? (
        <p className="quiet-empty">
          No contractors assigned yet. Assignments carry the scope, schedule, rate and agreed amount
          for one contractor on this project.
        </p>
      ) : (
        <ol className="relationship-assignment-list">
          {data.assignments.map((row) => (
            <li key={row.id}>
              <div>
                <Link href={`/admin/operations/assignments/${row.id}`}>
                  {row.partner.display_name}
                </Link>
                <span>
                  {row.scope}
                  {row.specialization ? ` · ${row.specialization}` : ""}
                </span>
                <span>
                  {shortDate(row.start_date)} → {shortDate(row.end_date)} ·{" "}
                  {availabilityLabels[row.partner.availability_status]}
                  {row.rate_type && row.rate_amount !== null && row.currency
                    ? ` · ${formatMoney(row.rate_amount, row.currency)} ${rateTypeLabels[row.rate_type]}`
                    : ""}
                </span>
              </div>
              <span data-label="Agreed">
                {row.currency && row.agreed_amount !== null
                  ? formatMoney(row.agreed_amount, row.currency)
                  : "—"}
              </span>
              <span data-label="Paid">
                {row.currency ? formatMoney(row.paid_amount, row.currency) : "—"}
              </span>
              <span data-label="Remaining">
                {row.currency && row.remaining_amount !== null
                  ? formatMoney(row.remaining_amount, row.currency)
                  : "—"}
              </span>
              <span className="badge-stack">
                <StatusBadge tone={assignmentStatusTone(row.status)}>
                  {assignmentStatusLabels[row.status]}
                </StatusBadge>
                {row.currency ? (
                  <StatusBadge tone={paymentStateTone(row.payment_state)}>
                    {paymentStateLabels[row.payment_state]}
                  </StatusBadge>
                ) : null}
                {row.performance_rating ? (
                  <StatusBadge tone="neutral">
                    {ratingScale.find((option) => option.value === row.performance_rating)?.label ??
                      `${row.performance_rating} / 5`}
                  </StatusBadge>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
