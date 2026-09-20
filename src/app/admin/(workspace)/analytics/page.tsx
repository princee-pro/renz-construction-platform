import type { Metadata } from "next";
import Link from "next/link";

import {
  analyticsRangeQuery,
  formatAmount,
  formatCount,
  formatHours,
  formatPercent,
  funnelStageLabels,
} from "@/features/analytics/analytics-contract";
import { loadAnalyticsOverview } from "@/features/analytics/analytics-data";
import { requireAnalytics } from "@/features/analytics/analytics-guards";
import {
  AnalyticsPageFrame,
  ComparisonRow,
  MetricRegister,
  NoData,
} from "@/features/analytics/components/analytics-shell";
import { ChartPanel, Funnel } from "@/features/analytics/components/charts";
import { PrintButton } from "@/features/invoices/components/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analytics | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function AnalyticsOverviewPage({
  searchParams,
}: PageProps<"/admin/analytics">) {
  const params = await searchParams;
  const { access, range, timeZone, today } = await requireAnalytics([], params);
  const overview = await loadAnalyticsOverview(range);
  const query = analyticsRangeQuery(range);
  const { headline, previous_headline: previous } = overview;
  const currencies = new Set<string>([
    ...Object.keys(headline.invoiced_by_currency ?? {}),
    ...Object.keys(previous.invoiced_by_currency ?? {}),
    ...Object.keys(headline.collected_by_currency ?? {}),
    ...Object.keys(previous.collected_by_currency ?? {}),
  ]);

  return (
    <AnalyticsPageFrame
      actions={<PrintButton />}
      description="What is happening over time, from real operational records. The Control Room keeps answering what needs attention right now; this centre reads the trend. Currencies are never summed together."
      permissions={access.permissions}
      range={range}
      section="overview"
      timeZone={timeZone}
      title="Executive overview"
      today={today}
    >
      <section aria-labelledby="comparison-heading" className="overview-section print-summary">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Period comparison</p>
            <h2 id="comparison-heading">
              {range.from} – {range.to} against {overview.previous_range.from} –{" "}
              {overview.previous_range.to}
            </h2>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table comparison-table">
            <caption className="visually-hidden">
              Headline figures for the selected period compared with the immediately preceding
              period of the same length
            </caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">This period</th>
                <th scope="col">Previous period</th>
                <th scope="col">Change</th>
              </tr>
            </thead>
            <tbody>
              {headline.new_leads !== undefined ? (
                <>
                  <ComparisonRow
                    current={headline.new_leads}
                    increaseMeans="positive"
                    label="New leads"
                    previous={previous.new_leads ?? 0}
                  />
                  <ComparisonRow
                    current={headline.won_leads ?? 0}
                    increaseMeans="positive"
                    label="Leads won"
                    previous={previous.won_leads ?? 0}
                  />
                  <ComparisonRow
                    current={headline.lost_leads ?? 0}
                    increaseMeans="attention"
                    label="Leads lost"
                    previous={previous.lost_leads ?? 0}
                  />
                </>
              ) : null}
              {headline.projects_created !== undefined ? (
                <>
                  <ComparisonRow
                    current={headline.projects_created}
                    increaseMeans="neutral"
                    label="Projects created"
                    previous={previous.projects_created ?? 0}
                  />
                  <ComparisonRow
                    current={headline.projects_completed ?? 0}
                    increaseMeans="positive"
                    label="Projects completed"
                    previous={previous.projects_completed ?? 0}
                  />
                </>
              ) : null}
              {headline.invoices_issued !== undefined ? (
                <>
                  <ComparisonRow
                    current={headline.invoices_issued}
                    increaseMeans="neutral"
                    label="Invoices issued"
                    previous={previous.invoices_issued ?? 0}
                  />
                  {[...currencies].sort().map((currency) => (
                    <ComparisonRow
                      currency={currency}
                      current={headline.invoiced_by_currency?.[currency] ?? 0}
                      increaseMeans="neutral"
                      key={`inv-${currency}`}
                      label={`Invoiced (${currency})`}
                      previous={previous.invoiced_by_currency?.[currency] ?? 0}
                    />
                  ))}
                  {[...currencies].sort().map((currency) => (
                    <ComparisonRow
                      currency={currency}
                      current={headline.collected_by_currency?.[currency] ?? 0}
                      increaseMeans="positive"
                      key={`col-${currency}`}
                      label={`Collected (${currency})`}
                      previous={previous.collected_by_currency?.[currency] ?? 0}
                    />
                  ))}
                </>
              ) : null}
              {headline.orders_issued !== undefined ? (
                <ComparisonRow
                  current={headline.orders_issued}
                  increaseMeans="neutral"
                  label="Purchase orders issued"
                  previous={previous.orders_issued ?? 0}
                />
              ) : null}
              {headline.page_views !== undefined ? (
                <ComparisonRow
                  current={headline.page_views}
                  increaseMeans="positive"
                  label="Website page views"
                  previous={previous.page_views ?? 0}
                />
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="overview-grid analytics-grid">
        {overview.leads ? (
          <ChartPanel
            aside={
              <Link className="text-link" href={`/admin/analytics/leads?${query}`}>
                Lead analytics
              </Link>
            }
            id="ov-leads"
            title="Lead pipeline"
          >
            <MetricRegister
              items={[
                { label: "New leads", value: overview.leads.new_leads },
                { label: "Open now", value: overview.leads.open_leads },
                {
                  label: "Awaiting first contact",
                  value: overview.leads.awaiting_first_contact,
                  attention: overview.leads.awaiting_first_contact > 0,
                },
                {
                  label: "Median time to contact",
                  value: formatHours(overview.leads.response.median_hours),
                },
                { label: "Win rate", value: formatPercent(overview.leads.outcome.win_rate) },
              ]}
              label="Lead pipeline summary"
            />
            <Funnel
              label="Lead funnel"
              stages={overview.leads.funnel.map((stage) => ({
                stage: stage.stage,
                label: funnelStageLabels[stage.stage] ?? stage.stage,
                count: stage.count,
              }))}
            />
          </ChartPanel>
        ) : null}

        {overview.projects ? (
          <ChartPanel
            aside={
              <Link className="text-link" href={`/admin/analytics/projects?${query}`}>
                Project analytics
              </Link>
            }
            id="ov-projects"
            title="Projects"
          >
            <MetricRegister
              items={[
                { label: "Active projects", value: overview.projects.active_projects },
                {
                  label: "Active high priority",
                  value: overview.projects.active_high_priority,
                },
                {
                  label: "Behind planned end date",
                  value: overview.projects.schedule.behind_planned_end,
                  attention: overview.projects.schedule.behind_planned_end > 0,
                },
                {
                  label: "Completed in period",
                  value: overview.projects.schedule.completed_in_period,
                },
              ]}
              label="Project summary"
            />
            {overview.projects.budget_by_currency.length > 0 ? (
              <ul className="currency-register">
                {overview.projects.budget_by_currency.map((entry) => (
                  <li key={entry.currency}>
                    <span>Active budget · {entry.currency}</span>
                    <strong>{formatAmount(entry.total, entry.currency)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <NoData>No budgeted active projects.</NoData>
            )}
          </ChartPanel>
        ) : null}

        {overview.finance ? (
          <ChartPanel
            aside={
              <Link className="text-link" href={`/admin/analytics/finance?${query}`}>
                Finance analytics
              </Link>
            }
            id="ov-finance"
            title="Finance by currency"
          >
            {overview.finance.by_currency.length > 0 ? (
              <div className="table-scroll">
                <table className="data-table">
                  <caption className="visually-hidden">
                    Invoiced, collected, outstanding and overdue by currency
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Currency</th>
                      <th scope="col">Invoiced</th>
                      <th scope="col">Collected</th>
                      <th scope="col">Outstanding</th>
                      <th scope="col">Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.finance.by_currency.map((row) => (
                      <tr key={row.currency}>
                        <th scope="row">{row.currency}</th>
                        <td>{formatAmount(row.invoiced_amount, row.currency)}</td>
                        <td>{formatAmount(row.collected_amount, row.currency)}</td>
                        <td>{formatAmount(row.outstanding_amount, row.currency)}</td>
                        <td className={row.overdue_amount > 0 ? "cell-attention" : undefined}>
                          {formatAmount(row.overdue_amount, row.currency)}
                          {row.overdue_count > 0 ? ` (${row.overdue_count})` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoData>
                No issued invoices in this period. Invoiced and collected figures appear once
                invoices are issued and payments recorded.
              </NoData>
            )}
          </ChartPanel>
        ) : null}

        {overview.contractors ? (
          <ChartPanel
            aside={
              <Link className="text-link" href={`/admin/analytics/delivery?${query}`}>
                Delivery analytics
              </Link>
            }
            id="ov-contractors"
            title="Contractor commitments"
          >
            <MetricRegister
              items={[
                { label: "Active contractors", value: overview.contractors.active_contractors },
                { label: "Active assignments", value: overview.contractors.active_assignments },
                { label: "Ending soon", value: overview.contractors.ending_soon },
              ]}
              label="Contractor summary"
            />
            {overview.contractors.finance_by_currency.length > 0 ? (
              <ul className="currency-register">
                {overview.contractors.finance_by_currency.map((entry) => (
                  <li key={entry.currency}>
                    <span>
                      {entry.currency} · committed {formatAmount(entry.committed, entry.currency)}
                    </span>
                    <strong>remaining {formatAmount(entry.remaining, entry.currency)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <NoData>No contractor commitments recorded.</NoData>
            )}
          </ChartPanel>
        ) : null}

        {overview.procurement ? (
          <ChartPanel
            aside={
              <Link className="text-link" href={`/admin/analytics/delivery?${query}#procurement`}>
                Procurement analytics
              </Link>
            }
            id="ov-procurement"
            title="Procurement status"
          >
            <MetricRegister
              items={[
                { label: "Open purchase orders", value: overview.procurement.open_orders },
                {
                  label: "Delayed",
                  value: overview.procurement.delayed_orders,
                  attention: overview.procurement.delayed_orders > 0,
                },
                { label: "Expected soon", value: overview.procurement.expected_soon },
                { label: "Receipts in period", value: overview.procurement.receipts_in_period },
              ]}
              label="Procurement summary"
            />
          </ChartPanel>
        ) : null}

        {overview.website ? (
          <ChartPanel
            aside={
              <Link className="text-link" href={`/admin/analytics/website?${query}`}>
                Website analytics
              </Link>
            }
            id="ov-website"
            title="Website activity"
          >
            {overview.website.first_party_enabled || overview.website.page_views > 0 ? (
              <MetricRegister
                items={[
                  { label: "Page views", value: overview.website.page_views },
                  { label: "Interactions", value: overview.website.interactions },
                  {
                    label: "Start-a-Project submissions",
                    value: overview.website.intake.project_intake_submit,
                  },
                  {
                    label: "Contact submissions",
                    value: overview.website.intake.contact_submit,
                  },
                ]}
                label="Website summary"
              />
            ) : (
              <NoData>
                First-party website analytics is off. Enable it in Settings → Website to count page
                views and interactions (no cookies, no identifiers).
              </NoData>
            )}
            <p className="field-help">
              Page views are site events, not unique visitors.{" "}
              {formatCount(overview.website.page_views)} in the period.
            </p>
          </ChartPanel>
        ) : null}
      </div>
    </AnalyticsPageFrame>
  );
}
