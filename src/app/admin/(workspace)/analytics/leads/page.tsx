import type { Metadata } from "next";
import Link from "next/link";

import {
  analyticsRangeQuery,
  formatHours,
  formatPercent,
  funnelStageLabels,
} from "@/features/analytics/analytics-contract";
import { loadLeadAnalytics } from "@/features/analytics/analytics-data";
import { requireAnalytics } from "@/features/analytics/analytics-guards";
import {
  AnalyticsPageFrame,
  MetricRegister,
  NoData,
} from "@/features/analytics/components/analytics-shell";
import {
  BarList,
  ChartPanel,
  Funnel,
  TrendChart,
  fillBuckets,
} from "@/features/analytics/components/charts";
import { leadTypeLabels, needLabels } from "@/features/intake/intake-policy";
import {
  leadSourceLabels,
  leadStatusLabels,
  lostReasonLabels,
} from "@/features/leads/lead-contract";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead analytics | RENZ Administration",
  robots: { index: false, follow: false },
};

function label(map: Readonly<Record<string, string>>, key: string): string {
  return map[key] ?? (key === "unspecified" ? "Not specified" : key);
}

export default async function LeadAnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics/leads">) {
  const params = await searchParams;
  const { access, range, timeZone, today } = await requireAnalytics(["leads.read"], params);
  const data = await loadLeadAnalytics(range);
  const query = analyticsRangeQuery(range);
  const trend = fillBuckets(data.trend, range.from, range.to, data.range.bucket, {
    submitted: 0,
    won: 0,
  });
  const withinTarget =
    data.response.contacted_count > 0
      ? Math.round((data.response.within_target_count / data.response.contacted_count) * 100)
      : null;

  return (
    <AnalyticsPageFrame
      actions={
        <Link
          className="button button-secondary"
          href={`/admin/analytics/export?report=lead-funnel&${query}`}
        >
          Export funnel CSV
        </Link>
      }
      description="Real C8 timestamps and stage history: what arrived, how fast it was contacted, how far it moved, and what was won or lost. Win rate uses Won + Lost only."
      permissions={access.permissions}
      range={range}
      section="leads"
      timeZone={timeZone}
      title="Lead analytics"
      today={today}
    >
      <MetricRegister
        items={[
          { label: "New leads in period", value: data.new_leads },
          { label: "Open leads (now)", value: data.open_leads },
          {
            label: "Unassigned (now)",
            value: data.unassigned_leads,
            attention: data.unassigned_leads > 0,
          },
          {
            label: "Awaiting first contact (now)",
            value: data.awaiting_first_contact,
            attention: data.awaiting_first_contact > 0,
          },
          { label: "Qualified in period", value: data.status_counts["qualified"] ?? 0 },
          { label: "Proposal in period", value: data.status_counts["proposal"] ?? 0 },
          { label: "Won in period", value: data.outcome.won_count },
          { label: "Lost in period", value: data.outcome.lost_count },
        ]}
        label="Lead counts"
      />

      <div className="overview-grid analytics-grid">
        <ChartPanel id="lead-funnel" title="Funnel — leads submitted in the period">
          <Funnel
            label="Lead funnel"
            stages={data.funnel.map((stage) => ({
              stage: stage.stage,
              label: funnelStageLabels[stage.stage] ?? stage.stage,
              count: stage.count,
            }))}
          />
        </ChartPanel>

        <ChartPanel id="lead-response" title="Response time">
          <MetricRegister
            items={[
              {
                label: "Median time to first contact",
                value: formatHours(data.response.median_hours),
                hint: `${data.response.contacted_count} contacted leads`,
              },
              {
                label: "Average time to first contact",
                value: formatHours(data.response.average_hours),
              },
              {
                label: `Contacted within ${data.response.target_hours} h target`,
                value: withinTarget === null ? "—" : `${withinTarget}%`,
                hint: `${data.response.within_target_count} of ${data.response.contacted_count}`,
                attention: withinTarget !== null && withinTarget < 80,
              },
              {
                label: "Awaiting first contact (this period)",
                value: data.response.awaiting_first_contact,
                attention: data.response.awaiting_first_contact > 0,
              },
              {
                label: "Median time to qualification",
                value: formatHours(data.qualification.median_hours),
                hint: `${data.qualification.qualified_count} qualified leads`,
              },
              {
                label: "Median time to Won",
                value:
                  data.outcome.won_median_days === null
                    ? "—"
                    : `${data.outcome.won_median_days} days`,
              },
              {
                label: "Median time to Lost",
                value:
                  data.outcome.lost_median_days === null
                    ? "—"
                    : `${data.outcome.lost_median_days} days`,
              },
            ]}
            label="Response-time metrics"
          />
          <p className="field-help">
            Durations count only leads that completed the step; leads still waiting are shown
            separately. The target is the C8 “uncontacted” threshold from Settings → System.
          </p>
        </ChartPanel>

        <ChartPanel id="lead-outcome" title="Won / Lost">
          <MetricRegister
            items={[
              { label: "Won", value: data.outcome.won_count },
              {
                label: "Lost",
                value: data.outcome.lost_count,
                attention: data.outcome.lost_count > 0,
              },
              {
                label: "Win rate (Won ÷ (Won + Lost))",
                value: formatPercent(data.outcome.win_rate),
              },
            ]}
            label="Outcome"
          />
          <h3 className="panel-subheading">Lost reasons</h3>
          <BarList
            emptyText="No lost leads in this period."
            items={data.lost_reasons.map((row) => ({
              key: row.reason ?? "unknown",
              label: label(lostReasonLabels, row.reason ?? "other"),
              value: row.count,
            }))}
            label="Lost reasons"
          />
        </ChartPanel>

        <ChartPanel id="lead-trend" title="Trend">
          <TrendChart
            buckets={trend.map((row) => row.bucket)}
            emptyText="No leads in this period."
            granularity={data.range.bucket}
            series={[
              { key: "submitted", label: "Submitted", values: trend.map((row) => row.submitted) },
              { key: "won", label: "Won", values: trend.map((row) => row.won) },
            ]}
            title="Leads submitted and won"
          />
        </ChartPanel>

        <ChartPanel id="lead-types" title="Lead types">
          <BarList
            emptyText="No leads in this period."
            hrefFor={(key) =>
              `/admin/operations/leads?type=${key}&from=${range.from}&to=${range.to}`
            }
            items={Object.entries(data.type_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([key, value]) => ({ key, label: label(leadTypeLabels, key), value }))}
            label="Lead types"
          />
        </ChartPanel>

        <ChartPanel id="lead-sources" title="Sources">
          <BarList
            emptyText="No leads in this period."
            hrefFor={(key) =>
              `/admin/operations/leads?source=${key}&from=${range.from}&to=${range.to}`
            }
            items={Object.entries(data.source_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([key, value]) => ({ key, label: label(leadSourceLabels, key), value }))}
            label="Lead sources"
          />
        </ChartPanel>

        <ChartPanel id="lead-services" title="Service interest (enquiries, not page views)">
          {data.service_interest.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <caption className="visually-hidden">
                  Enquiries, qualified and won per service
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Service</th>
                    <th scope="col">Enquiries</th>
                    <th scope="col">Qualified</th>
                    <th scope="col">Won</th>
                  </tr>
                </thead>
                <tbody>
                  {data.service_interest.map((row) => (
                    <tr key={row.service_key}>
                      <th scope="row">{label(needLabels, row.service_key)}</th>
                      <td>{row.enquiries}</td>
                      <td>{row.qualified}</td>
                      <td>{row.won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData>No service-linked enquiries in this period.</NoData>
          )}
        </ChartPanel>

        <ChartPanel id="lead-stages" title="Current stage of leads submitted in the period">
          <BarList
            emptyText="No leads in this period."
            items={Object.entries(leadStatusLabels).map(([key, text]) => ({
              key,
              label: text,
              value: data.status_counts[key] ?? 0,
            }))}
            label="Current stage"
          />
        </ChartPanel>
      </div>
    </AnalyticsPageFrame>
  );
}
