import type { Metadata } from "next";
import Link from "next/link";

import { analyticsRangeQuery, formatAmount } from "@/features/analytics/analytics-contract";
import { loadProjectAnalytics } from "@/features/analytics/analytics-data";
import { requireAnalytics } from "@/features/analytics/analytics-guards";
import {
  AnalyticsPageFrame,
  MetricRegister,
  NoData,
} from "@/features/analytics/components/analytics-shell";
import {
  BarList,
  ChartPanel,
  TrendChart,
  fillBuckets,
} from "@/features/analytics/components/charts";
import {
  projectPhaseLabels,
  projectPriorityLabels,
  projectStatusLabels,
} from "@/features/operational-projects/project-contract";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project analytics | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function ProjectAnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics/projects">) {
  const params = await searchParams;
  const { access, range, timeZone, today } = await requireAnalytics(
    ["operations.projects.read"],
    params,
  );
  const data = await loadProjectAnalytics(range);
  const query = analyticsRangeQuery(range);
  const trend = fillBuckets(data.trend, range.from, range.to, data.range.bucket, {
    created: 0,
    completed: 0,
  });

  return (
    <AnalyticsPageFrame
      actions={
        <Link
          className="button button-secondary"
          href={`/admin/analytics/export?report=project-status&${query}`}
        >
          Export status CSV
        </Link>
      }
      description="Current distribution of operational projects plus what happened in the period. Budget is grouped by currency and is never treated as expenditure."
      permissions={access.permissions}
      range={range}
      section="projects"
      timeZone={timeZone}
      title="Project analytics"
      today={today}
    >
      <MetricRegister
        items={[
          { label: "Active projects (now)", value: data.active_projects },
          { label: "Active high priority", value: data.active_high_priority },
          { label: "Created in period", value: data.schedule.created_in_period },
          { label: "Completed in period", value: data.schedule.completed_in_period },
          {
            label: `Ending within ${data.schedule.ending_soon_window_days} days`,
            value: data.schedule.ending_soon,
          },
          {
            label: "Behind planned end date",
            value: data.schedule.behind_planned_end,
            attention: data.schedule.behind_planned_end > 0,
            hint: "Planned end date passed and not completed",
          },
          { label: "No planned end date", value: data.schedule.no_end_date },
        ]}
        label="Project counts"
      />

      <div className="overview-grid analytics-grid">
        <ChartPanel id="project-status" title="Status (current)">
          <BarList
            emptyText="No operational projects yet."
            hrefFor={(key) => `/admin/operations/projects?status=${key}`}
            items={Object.entries(projectStatusLabels).map(([key, text]) => ({
              key,
              label: text,
              value: data.status_counts[key] ?? 0,
            }))}
            label="Projects by status"
          />
        </ChartPanel>

        <ChartPanel id="project-phase" title="Phase distribution (current)">
          <BarList
            emptyText="No operational projects yet."
            items={Object.entries(projectPhaseLabels).map(([key, text]) => ({
              key,
              label: text,
              value: data.phase_counts[key] ?? 0,
            }))}
            label="Projects by phase"
          />
        </ChartPanel>

        <ChartPanel id="project-priority" title="Priority (current)">
          <BarList
            emptyText="No operational projects yet."
            items={Object.entries(projectPriorityLabels).map(([key, text]) => ({
              key,
              label: text,
              value: data.priority_counts[key] ?? 0,
            }))}
            label="Projects by priority"
          />
        </ChartPanel>

        <ChartPanel id="project-budget" title="Active project budget by currency">
          {data.budget_by_currency.length > 0 ? (
            <ul className="currency-register">
              {data.budget_by_currency.map((entry) => (
                <li key={entry.currency}>
                  <span>
                    {entry.currency} · {entry.project_count}{" "}
                    {entry.project_count === 1 ? "project" : "projects"}
                  </span>
                  <strong>{formatAmount(entry.total, entry.currency)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <NoData>No budgeted active projects. Budgets stay separate per currency.</NoData>
          )}
        </ChartPanel>

        <ChartPanel id="project-origin" title="Project origin">
          <MetricRegister
            items={[
              { label: "Created from leads (period)", value: data.origin.from_leads },
              { label: "Created manually (period)", value: data.origin.manual },
              { label: "From leads (all time)", value: data.origin.all_time_from_leads },
              { label: "All projects (all time)", value: data.origin.all_time_total },
            ]}
            label="Project origin"
          />
        </ChartPanel>

        <ChartPanel id="project-phase-aging" title="Phase aging (active projects)">
          {data.phase_aging.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <caption className="visually-hidden">Days spent in the current phase</caption>
                <thead>
                  <tr>
                    <th scope="col">Phase</th>
                    <th scope="col">Projects</th>
                    <th scope="col">Average days in phase</th>
                    <th scope="col">Longest</th>
                  </tr>
                </thead>
                <tbody>
                  {data.phase_aging.map((row) => (
                    <tr key={row.phase}>
                      <th scope="row">
                        {projectPhaseLabels[row.phase as keyof typeof projectPhaseLabels] ??
                          row.phase}
                      </th>
                      <td>{row.count}</td>
                      <td>{row.average_days ?? "—"}</td>
                      <td>{row.max_days ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData>No active projects to age.</NoData>
          )}
        </ChartPanel>

        <ChartPanel id="project-trend" title="Trend">
          <TrendChart
            buckets={trend.map((row) => row.bucket)}
            emptyText="No projects were created or completed in this period."
            granularity={data.range.bucket}
            series={[
              { key: "created", label: "Created", values: trend.map((row) => row.created) },
              { key: "completed", label: "Completed", values: trend.map((row) => row.completed) },
            ]}
            title="Projects created and completed"
          />
        </ChartPanel>
      </div>
    </AnalyticsPageFrame>
  );
}
