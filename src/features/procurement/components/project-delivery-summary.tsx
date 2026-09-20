import { formatMoney } from "@/features/invoices/invoice-contract";
import type { ProjectDeliverySummary } from "@/features/procurement/procurement-contract";

/**
 * Project cost / delivery position (C6): budget, client invoiced and paid,
 * contractor committed and paid, materials ordered — one row per currency,
 * never combined, and deliberately no profit or margin figure. Columns the
 * viewer cannot read arrive as null and render as "—".
 */
export function ProjectDeliverySummaryPanel({
  summary,
}: Readonly<{ summary: ProjectDeliverySummary | null }>) {
  if (!summary) return null;
  const money = (value: string | number | null, currency: string) =>
    value === null ? "—" : formatMoney(value, currency);
  return (
    <section aria-labelledby="project-delivery-heading" className="admin-panel project-delivery">
      <div className="section-heading-row section-heading-compact">
        <h2 id="project-delivery-heading">Cost &amp; delivery position</h2>
      </div>
      <dl className="metric-register">
        {summary.active_contractor_count !== null ? (
          <div>
            <dt>Active contractors</dt>
            <dd>{summary.active_contractor_count}</dd>
          </div>
        ) : null}
        {summary.requirement_count !== null ? (
          <div>
            <dt>Material requirements</dt>
            <dd>
              {summary.requirement_count}
              {summary.received_requirement_count !== null
                ? ` (${summary.received_requirement_count} received)`
                : ""}
            </dd>
          </div>
        ) : null}
        {summary.open_order_count !== null ? (
          <div>
            <dt>Open purchase orders</dt>
            <dd>{summary.open_order_count}</dd>
          </div>
        ) : null}
        {summary.delayed_order_count !== null ? (
          <div className={summary.delayed_order_count > 0 ? "metric-attention" : undefined}>
            <dt>Delayed deliveries</dt>
            <dd>{summary.delayed_order_count}</dd>
          </div>
        ) : null}
      </dl>
      {summary.by_currency.length === 0 ? (
        <p className="quiet-empty">
          No budget, invoices, contractor assignments or purchase orders carry a currency yet.
        </p>
      ) : (
        <div
          aria-label="Cost and delivery position by currency, scrollable"
          className="table-scroll"
          role="region"
          tabIndex={0}
        >
          <table className="delivery-position-table">
            <caption className="visually-hidden">Cost and delivery position by currency</caption>
            <thead>
              <tr>
                <th scope="col">Currency</th>
                <th className="numeric" scope="col">
                  Budget
                </th>
                <th className="numeric" scope="col">
                  Client invoiced
                </th>
                <th className="numeric" scope="col">
                  Client paid
                </th>
                <th className="numeric" scope="col">
                  Contractors committed
                </th>
                <th className="numeric" scope="col">
                  Contractors paid
                </th>
                <th className="numeric" scope="col">
                  Materials ordered
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.by_currency.map((row) => (
                <tr key={row.currency}>
                  <th scope="row">{row.currency}</th>
                  <td className="numeric" data-label="Budget">
                    {money(row.budget, row.currency)}
                  </td>
                  <td className="numeric" data-label="Client invoiced">
                    {money(row.client_invoiced, row.currency)}
                  </td>
                  <td className="numeric" data-label="Client paid">
                    {money(row.client_paid, row.currency)}
                  </td>
                  <td className="numeric" data-label="Contractors committed">
                    {money(row.contractor_committed, row.currency)}
                  </td>
                  <td className="numeric" data-label="Contractors paid">
                    {money(row.contractor_paid, row.currency)}
                  </td>
                  <td className="numeric" data-label="Materials ordered">
                    {money(row.material_ordered, row.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="field-help">
        Figures are grouped by currency and never converted or combined. This is a cost and delivery
        position, not a profitability statement.
      </p>
    </section>
  );
}
