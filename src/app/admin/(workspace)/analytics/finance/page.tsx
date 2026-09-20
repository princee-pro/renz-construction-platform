import type { Metadata } from "next";
import Link from "next/link";

import {
  agingBucketLabels,
  agingBuckets,
  analyticsRangeQuery,
  formatAmount,
  formatPercent,
} from "@/features/analytics/analytics-contract";
import { loadFinanceAnalytics } from "@/features/analytics/analytics-data";
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
  title: "Finance analytics | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function FinanceAnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics/finance">) {
  const params = await searchParams;
  const { access, range, timeZone, today } = await requireAnalytics(
    ["analytics.finance.read"],
    params,
  );
  const data = await loadFinanceAnalytics(range);
  const query = analyticsRangeQuery(range);

  return (
    <AnalyticsPageFrame
      actions={
        <Link
          className="button button-secondary"
          href={`/admin/analytics/export?report=invoice-aging&${query}`}
        >
          Export aging CSV
        </Link>
      }
      description="Invoiced, collected, outstanding and overdue — per currency, from the C5 canonical invoice projection. Not revenue, not profit, not a bank balance."
      permissions={access.permissions}
      range={range}
      section="finance"
      timeZone={timeZone}
      title="Finance analytics"
      today={today}
    >
      <MetricRegister
        items={[
          { label: "Invoices issued in period", value: data.issued_count },
          { label: "Drafts (now)", value: data.draft_count },
          { label: "Voided in period", value: data.void_count_in_period },
        ]}
        label="Invoice counts"
      />

      <ChartPanel id="finance-by-currency" title="By currency">
        <CurrencyTable
          caption="Invoiced, collected, outstanding and overdue amounts by currency"
          columns={[
            { key: "issued_count", label: "Issued", kind: "count" },
            { key: "invoiced_amount", label: "Invoiced (period)", kind: "amount" },
            { key: "collected_amount", label: "Collected (period)", kind: "amount" },
            { key: "collection_rate", label: "Collection rate", kind: "percent" },
            { key: "outstanding_amount", label: "Outstanding (now)", kind: "amount" },
            { key: "overdue_amount", label: "Overdue (now)", kind: "amount" },
            { key: "paid_count", label: "Paid", kind: "count" },
            { key: "partially_paid_count", label: "Partially paid", kind: "count" },
            { key: "overdue_count", label: "Overdue invoices", kind: "count" },
          ]}
          rows={data.by_currency}
        />
        <p className="field-help">
          Collection rate = payments received (any date) on invoices issued in the period ÷ amount
          invoiced in the period, within the same currency. Reversed payments are excluded.
        </p>
      </ChartPanel>

      <div className="overview-grid analytics-grid">
        {data.by_currency.map((row) => {
          const payments = fillBuckets(row.payment_trend, range.from, range.to, data.range.bucket, {
            amount: 0,
            payment_count: 0,
          });
          return (
            <ChartPanel
              id={`aging-${row.currency}`}
              key={row.currency}
              title={`${row.currency} · outstanding aging (now)`}
            >
              <BarList
                emptyText="Nothing outstanding."
                format={(value) => formatAmount(value, row.currency)}
                items={agingBuckets.map((bucket) => {
                  const entry = row.aging.find((item) => item.bucket === bucket);
                  return {
                    key: bucket,
                    label: agingBucketLabels[bucket],
                    value: entry?.amount ?? 0,
                    note: `${entry?.invoice_count ?? 0} ${entry?.invoice_count === 1 ? "invoice" : "invoices"}`,
                  };
                })}
                label={`${row.currency} aging buckets`}
              />
              <h3 className="panel-subheading">Payments recorded ({row.currency})</h3>
              <TrendChart
                buckets={payments.map((entry) => entry.bucket)}
                emptyText="No payments recorded in this period."
                format={(value) => formatAmount(value, row.currency)}
                granularity={data.range.bucket}
                series={[
                  {
                    key: "collected",
                    label: "Collected",
                    values: payments.map((entry) => entry.amount),
                  },
                ]}
                title={`Client payments in ${row.currency}`}
              />
              <p className="field-help">
                {row.payment_count} {row.payment_count === 1 ? "payment" : "payments"} · collection
                rate {formatPercent(row.collection_rate)} · reversed payments excluded.
              </p>
            </ChartPanel>
          );
        })}
        {data.by_currency.length === 0 ? (
          <ChartPanel id="finance-empty" title="Aging and payment trend">
            <NoData>
              No issued invoices or payments in this period. Aging buckets appear once invoices with
              due dates are issued.
            </NoData>
          </ChartPanel>
        ) : null}
      </div>
    </AnalyticsPageFrame>
  );
}
