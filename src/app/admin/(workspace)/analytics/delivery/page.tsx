import type { Metadata } from "next";

import { receivingStateLabels } from "@/features/analytics/analytics-contract";
import { loadDeliveryAnalytics } from "@/features/analytics/analytics-data";
import { requireAnalytics } from "@/features/analytics/analytics-guards";
import {
  AnalyticsPageFrame,
  CurrencyTable,
  MetricRegister,
  NoData,
} from "@/features/analytics/components/analytics-shell";
import {
  BarList,
  ChartPanel,
  TrendChart,
  fillBuckets,
} from "@/features/analytics/components/charts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delivery analytics | RENZ Administration",
  robots: { index: false, follow: false },
};

const assignmentStatusLabels: Readonly<Record<string, string>> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function DeliveryAnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics/delivery">) {
  const params = await searchParams;
  const { access, range, timeZone, today } = await requireAnalytics(
    ["partners.read", "procurement.orders.read"],
    params,
  );
  const data = await loadDeliveryAnalytics(range);
  const contractors = data.contractors;
  const procurement = data.procurement;
  const trend = procurement
    ? fillBuckets(procurement.trend, range.from, range.to, data.range.bucket, {
        issued: 0,
        receipts: 0,
      })
    : [];

  return (
    <AnalyticsPageFrame
      description="Contractor commitments and procurement flow from C6. Committed, paid and remaining are per currency; a remaining amount is not overdue unless a payment schedule says so."
      permissions={access.permissions}
      range={range}
      section="delivery"
      timeZone={timeZone}
      title="Delivery analytics"
      today={today}
    >
      {contractors ? (
        <section
          aria-labelledby="contractors-heading"
          className="overview-section"
          id="contractors"
        >
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Contractors</p>
              <h2 id="contractors-heading">Assignments and commitments</h2>
            </div>
          </div>
          <MetricRegister
            items={[
              { label: "Active contractors", value: contractors.active_contractors },
              { label: "Contractor partners", value: contractors.contractor_partners },
              { label: "Active assignments", value: contractors.active_assignments },
              { label: "Assignments created in period", value: contractors.created_in_period },
              { label: "Assignments completed in period", value: contractors.completed_in_period },
              {
                label: `Ending within ${contractors.ending_soon_window_days} days`,
                value: contractors.ending_soon,
              },
            ]}
            label="Contractor counts"
          />
          <div className="overview-grid analytics-grid">
            <ChartPanel id="contractor-finance" title="Contractor finance by currency">
              <CurrencyTable
                caption="Committed, paid and remaining contractor amounts by currency"
                columns={[
                  { key: "assignment_count", label: "Assignments", kind: "count" },
                  { key: "committed", label: "Committed", kind: "amount" },
                  { key: "paid", label: "Paid", kind: "amount" },
                  { key: "remaining", label: "Remaining", kind: "amount" },
                  { key: "paid_in_period", label: "Paid in period", kind: "amount" },
                ]}
                rows={contractors.finance_by_currency}
              />
            </ChartPanel>
            <ChartPanel id="contractor-status" title="Assignment status (current)">
              <BarList
                emptyText="No contractor assignments yet."
                items={Object.entries(assignmentStatusLabels).map(([key, text]) => ({
                  key,
                  label: text,
                  value: contractors.status_counts[key] ?? 0,
                }))}
                label="Assignments by status"
              />
            </ChartPanel>
            <ChartPanel
              id="contractor-performance"
              title="Performance (rated completed assignments only)"
            >
              <MetricRegister
                items={[
                  {
                    label: "Average rating",
                    value:
                      contractors.performance.average_rating === null
                        ? "—"
                        : `${contractors.performance.average_rating} / 5`,
                    hint: `${contractors.performance.rated_count} rated`,
                  },
                  {
                    label: "Awaiting rating",
                    value: contractors.performance.awaiting_rating,
                    attention: contractors.performance.awaiting_rating > 0,
                  },
                ]}
                label="Performance"
              />
              {contractors.performance.top_rated.length > 0 ? (
                <ol className="ranked-list" aria-label="Top-rated contractors">
                  {contractors.performance.top_rated.map((partner) => (
                    <li key={partner.partner_id}>
                      <a href={`/admin/operations/contractors/${partner.partner_id}`}>
                        {partner.display_name}
                      </a>
                      <span>
                        {partner.average_rating} / 5 · {partner.rated_count}{" "}
                        {partner.rated_count === 1 ? "rating" : "ratings"}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <NoData>
                  No rated assignments yet. Ratings are recorded on completed assignments.
                </NoData>
              )}
            </ChartPanel>
          </div>
        </section>
      ) : null}

      {procurement ? (
        <section
          aria-labelledby="procurement-heading"
          className="overview-section"
          id="procurement"
        >
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Procurement</p>
              <h2 id="procurement-heading">Purchase orders, receiving and materials</h2>
            </div>
          </div>
          <MetricRegister
            items={[
              { label: "Open purchase orders", value: procurement.open_orders },
              {
                label: "Delayed",
                value: procurement.delayed_orders,
                attention: procurement.delayed_orders > 0,
                hint: "Expected date passed with quantity outstanding",
              },
              {
                label: `Expected within ${procurement.expected_soon_window_days} days`,
                value: procurement.expected_soon,
              },
              { label: "Issued in period", value: procurement.issued_in_period },
              { label: "Closed in period", value: procurement.closed_in_period },
              { label: "Cancelled in period", value: procurement.cancelled_in_period },
              { label: "Goods receipts in period", value: procurement.receipts_in_period },
              {
                label: `Materials required within ${procurement.material_required_soon_window_days} days`,
                value: procurement.requirements_due_soon,
              },
              {
                label: "Materials past required-by date",
                value: procurement.requirements_past_due,
                attention: procurement.requirements_past_due > 0,
              },
            ]}
            label="Procurement counts"
          />
          <div className="overview-grid analytics-grid">
            <ChartPanel id="po-value" title="Purchase order value by currency">
              <CurrencyTable
                caption="Ordered value in the period and open ordered value by currency"
                columns={[
                  { key: "order_count", label: "Issued (period)", kind: "count" },
                  { key: "ordered_value", label: "Ordered value (period)", kind: "amount" },
                  { key: "open_order_count", label: "Open orders", kind: "count" },
                  { key: "open_ordered_value", label: "Open ordered value", kind: "amount" },
                ]}
                rows={procurement.value_by_currency}
              />
              <p className="field-help">
                Ordered value is the issued purchase order total (a commitment), not cash paid.
              </p>
            </ChartPanel>
            <ChartPanel id="po-receiving" title="Receiving state of issued orders">
              <BarList
                emptyText="No issued purchase orders."
                items={Object.entries(receivingStateLabels).map(([key, text]) => ({
                  key,
                  label: text,
                  value: procurement.receiving_states[key] ?? 0,
                }))}
                label="Receiving states"
              />
              <p className="field-help">
                Quantities are compared per line in its own unit; no quantities are added across
                units.
              </p>
            </ChartPanel>
            <ChartPanel id="po-trend" title="Trend">
              <TrendChart
                buckets={trend.map((row) => row.bucket)}
                emptyText="No purchase orders or receipts in this period."
                granularity={data.range.bucket}
                series={[
                  { key: "issued", label: "Orders issued", values: trend.map((row) => row.issued) },
                  {
                    key: "receipts",
                    label: "Goods receipts",
                    values: trend.map((row) => row.receipts),
                  },
                ]}
                title="Purchase orders issued and goods receipts recorded"
              />
            </ChartPanel>
          </div>
        </section>
      ) : null}

      {!contractors && !procurement ? (
        <NoData>Delivery analytics need partners.read or procurement.orders.read.</NoData>
      ) : null}
    </AnalyticsPageFrame>
  );
}
