import type { Metadata } from "next";
import Link from "next/link";

import {
  ctaKeyLabels,
  deviceClassLabels,
  formatCount,
} from "@/features/analytics/analytics-contract";
import { loadWebsiteAnalytics } from "@/features/analytics/analytics-data";
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
import { needLabels } from "@/features/intake/intake-policy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website analytics | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function WebsiteAnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics/website">) {
  const params = await searchParams;
  const { access, range, timeZone, today } = await requireAnalytics(
    ["analytics.website.read"],
    params,
  );
  const data = await loadWebsiteAnalytics(range);
  const trend = fillBuckets(data.trend, range.from, range.to, data.range.bucket, {
    page_views: 0,
    interactions: 0,
  });
  const nothingYet = data.page_views === 0 && data.interactions === 0;

  return (
    <AnalyticsPageFrame
      actions={
        access.permissions.includes("settings.website.read") ? (
          <Link className="button button-secondary" href="/admin/settings/website">
            Analytics settings
          </Link>
        ) : undefined
      }
      description="Privacy-safe first-party aggregates: daily counters per page and interaction, with no cookies, identifiers, IP addresses or query strings. Page views are site events, not unique visitors, and may include bots."
      permissions={access.permissions}
      range={range}
      section="website"
      timeZone={timeZone}
      title="Website analytics"
      today={today}
    >
      <p className="analytics-mode" role="status">
        First-party analytics: <strong>{data.first_party_enabled ? "on" : "off"}</strong>
        {" · "}Third-party provider:{" "}
        <strong>
          {data.third_party_enabled ? (data.third_party_provider ?? "configured") : "off"}
        </strong>
        {" · "}Daily aggregates retained {data.retention_days} days.
      </p>

      {nothingYet ? (
        <NoData>
          {data.first_party_enabled
            ? "No website events in this period yet. Page views and interactions are counted as visitors use the public site."
            : "First-party website analytics is off, so nothing is counted. Turn it on in Settings → Website; a matching published privacy notice is required before going live."}
        </NoData>
      ) : null}

      <MetricRegister
        items={[
          { label: "Page views", value: data.page_views },
          { label: "Interactions", value: data.interactions },
          { label: "Start-a-Project starts", value: data.intake.project_intake_start },
          { label: "Start-a-Project submissions", value: data.intake.project_intake_submit },
          { label: "Service enquiry submissions", value: data.intake.service_enquiry_submit },
          { label: "Contact submissions", value: data.intake.contact_submit },
          { label: "Material enquiry submissions", value: data.intake.material_enquiry_submit },
        ]}
        label="Website counts"
      />

      <div className="overview-grid analytics-grid">
        <ChartPanel id="site-trend" title="Page views trend">
          <TrendChart
            buckets={trend.map((row) => row.bucket)}
            emptyText="No page views in this period."
            granularity={data.range.bucket}
            series={[
              {
                key: "page_views",
                label: "Page views",
                values: trend.map((row) => row.page_views),
              },
              {
                key: "interactions",
                label: "Interactions",
                values: trend.map((row) => row.interactions),
              },
            ]}
            title="Page views and interactions"
          />
        </ChartPanel>

        <ChartPanel id="site-pages" title="Most viewed pages">
          <BarList
            emptyText="No page views in this period."
            items={data.top_pages.map((row) => ({
              key: row.path_key,
              label: row.path_key,
              value: row.page_views,
            }))}
            label="Most viewed pages"
          />
        </ChartPanel>

        <ChartPanel id="site-services" title="Service interest ranking">
          {data.service_views.length > 0 ? (
            <div className="table-scroll">
              <table className="data-table">
                <caption className="visually-hidden">
                  Service page views alongside real enquiries for the same service
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Service</th>
                    <th scope="col">Page views</th>
                    <th scope="col">Enquiries</th>
                    <th scope="col">Qualified</th>
                    <th scope="col">Won</th>
                  </tr>
                </thead>
                <tbody>
                  {data.service_views.map((row) => (
                    <tr key={row.service_slug}>
                      <th scope="row">
                        {needLabels[row.service_slug as keyof typeof needLabels] ??
                          row.service_slug}
                      </th>
                      <td>{formatCount(row.views)}</td>
                      <td>{formatCount(row.enquiries)}</td>
                      <td>{formatCount(row.qualified)}</td>
                      <td>{formatCount(row.won)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData>No service page views in this period.</NoData>
          )}
          <p className="field-help">
            Page views are views; enquiries are real leads linked to the service. They are never
            equated.
          </p>
        </ChartPanel>

        <ChartPanel id="site-cta" title="CTA clicks">
          <BarList
            emptyText="No CTA clicks in this period."
            items={data.cta_clicks.map((row) => ({
              key: row.cta_key,
              label: ctaKeyLabels[row.cta_key] ?? row.cta_key,
              value: row.clicks,
            }))}
            label="CTA clicks"
          />
        </ChartPanel>

        <ChartPanel id="site-case-studies" title="Case study views">
          <BarList
            emptyText="No case study views in this period."
            items={data.case_study_views.map((row) => ({
              key: row.case_study_slug,
              label: row.case_study_slug,
              value: row.views,
            }))}
            label="Case study views"
          />
        </ChartPanel>

        <ChartPanel id="site-devices" title="Device class (page views)">
          <BarList
            emptyText="No page views in this period."
            items={Object.entries(data.device_classes)
              .sort((a, b) => b[1] - a[1])
              .map(([key, value]) => ({
                key,
                label: deviceClassLabels[key] ?? key,
                value,
              }))}
            label="Device classes"
          />
          <p className="field-help">
            Derived from viewport width in the browser; nothing about the device is stored.
          </p>
        </ChartPanel>
      </div>
    </AnalyticsPageFrame>
  );
}
