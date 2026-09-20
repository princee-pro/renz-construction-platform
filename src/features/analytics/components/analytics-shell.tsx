import Link from "next/link";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import {
  analyticsRangePresetLabels,
  analyticsRangeQuery,
  describeChange,
  formatAmount,
  formatCount,
  type AnalyticsRange,
  type ChangeMeaning,
} from "@/features/analytics/analytics-contract";
import type { AdminPermission } from "@/lib/auth/permissions";
import { describeTimeZone } from "@/lib/time/business-time";

export const analyticsSections: readonly Readonly<{
  key: string;
  href: string;
  label: string;
  permission: AdminPermission;
}>[] = [
  { key: "overview", href: "/admin/analytics", label: "Overview", permission: "analytics.read" },
  { key: "leads", href: "/admin/analytics/leads", label: "Leads", permission: "leads.read" },
  {
    key: "projects",
    href: "/admin/analytics/projects",
    label: "Projects",
    permission: "operations.projects.read",
  },
  {
    key: "finance",
    href: "/admin/analytics/finance",
    label: "Finance",
    permission: "analytics.finance.read",
  },
  {
    key: "delivery",
    href: "/admin/analytics/delivery",
    label: "Delivery",
    permission: "partners.read",
  },
  {
    key: "website",
    href: "/admin/analytics/website",
    label: "Website",
    permission: "analytics.website.read",
  },
];

export function AnalyticsNav({
  current,
  permissions,
  range,
}: Readonly<{ current: string; permissions: readonly string[]; range: AnalyticsRange }>) {
  const query = analyticsRangeQuery(range);
  return (
    <nav aria-label="Analytics sections" className="record-tabs settings-nav analytics-nav">
      {analyticsSections
        .filter(
          (entry) =>
            permissions.includes(entry.permission) ||
            (entry.key === "delivery" && permissions.includes("procurement.orders.read")),
        )
        .map((entry) => (
          <Link
            aria-current={current === entry.key ? "page" : undefined}
            className={current === entry.key ? "record-tab record-tab-current" : "record-tab"}
            href={`${entry.href}?${query}`}
            key={entry.key}
          >
            {entry.label}
          </Link>
        ))}
    </nav>
  );
}

/** Preset links + a custom range form; state lives in the URL (C9 §7). */
export function AnalyticsRangeControl({
  basePath,
  range,
  timeZone,
  today,
}: Readonly<{ basePath: string; range: AnalyticsRange; timeZone: string; today: string }>) {
  return (
    <section aria-label="Reporting period" className="analytics-range">
      <nav aria-label="Preset periods" className="lead-quick-filters">
        {(["7d", "30d", "90d", "ytd"] as const).map((preset) => (
          <Link
            aria-current={range.preset === preset ? "page" : undefined}
            className="lead-quick-filter"
            href={`${basePath}?range=${preset}`}
            key={preset}
          >
            {analyticsRangePresetLabels[preset]}
          </Link>
        ))}
      </nav>
      <form action={basePath} className="analytics-range-form" method="get" noValidate>
        <input name="range" type="hidden" value="custom" />
        <div className="field-group">
          <label htmlFor="analytics-from">From</label>
          <input
            defaultValue={range.from}
            id="analytics-from"
            max={today}
            name="from"
            required
            type="date"
          />
        </div>
        <div className="field-group">
          <label htmlFor="analytics-to">To</label>
          <input
            defaultValue={range.to}
            id="analytics-to"
            max={today}
            name="to"
            required
            type="date"
          />
        </div>
        <button className="button button-secondary" type="submit">
          Apply range
        </button>
      </form>
      <p className="analytics-range-summary" role="status">
        Showing <strong>{range.from}</strong> to <strong>{range.to}</strong> ({range.days}{" "}
        {range.days === 1 ? "day" : "days"}) · business days in {describeTimeZone(timeZone)}.
        {range.corrected
          ? " The requested custom range was invalid, so the last 30 days are shown."
          : ""}
      </p>
    </section>
  );
}

export function AnalyticsPageFrame({
  title,
  section,
  description,
  permissions,
  range,
  timeZone,
  today,
  actions,
  children,
}: Readonly<{
  title: string;
  section: string;
  description: string;
  permissions: readonly string[];
  range: AnalyticsRange;
  timeZone: string;
  today: string;
  actions?: ReactNode;
  children: ReactNode;
}>) {
  const basePath = section === "overview" ? "/admin/analytics" : `/admin/analytics/${section}`;
  return (
    <main className="workspace-page workspace-page-wide analytics-page" id="main-content">
      <Breadcrumbs
        items={
          section === "overview"
            ? [{ href: "/admin", label: "Overview" }, { label: "Analytics" }]
            : [
                { href: "/admin", label: "Overview" },
                { href: "/admin/analytics", label: "Analytics" },
                { label: title },
              ]
        }
      />
      <PageHeader actions={actions} description={description} eyebrow="Analytics" title={title} />
      <AnalyticsNav current={section} permissions={permissions} range={range} />
      <AnalyticsRangeControl basePath={basePath} range={range} timeZone={timeZone} today={today} />
      {children}
    </main>
  );
}

export function MetricRegister({
  items,
  label,
}: Readonly<{
  items: readonly Readonly<{
    label: string;
    value: string | number;
    attention?: boolean;
    hint?: string;
  }>[];
  label: string;
}>) {
  return (
    <dl aria-label={label} className="metric-register">
      {items.map((item) => (
        <div className={item.attention ? "metric-attention" : undefined} key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            {typeof item.value === "number" ? formatCount(item.value) : item.value}
            {item.hint ? <span className="metric-hint">{item.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Period-over-period comparison with domain-aware meaning (never "up = good"). */
export function ComparisonRow({
  label,
  current,
  previous,
  increaseMeans,
  currency,
}: Readonly<{
  label: string;
  current: number;
  previous: number;
  increaseMeans: ChangeMeaning;
  currency?: string;
}>) {
  const change = describeChange(current, previous, increaseMeans);
  const format = (value: number) => (currency ? formatAmount(value, currency) : formatCount(value));
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{format(current)}</td>
      <td>{format(previous)}</td>
      <td>
        <span className={`change change-${change.meaning}`}>
          <span aria-hidden="true">{change.delta > 0 ? "▲ " : change.delta < 0 ? "▼ " : "= "}</span>
          {change.label}
          <span className="visually-hidden">
            {change.meaning === "attention"
              ? " — needs attention"
              : change.meaning === "positive"
                ? " — favourable"
                : ""}
          </span>
        </span>
      </td>
    </tr>
  );
}

export function NoData({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="quiet-empty">{children}</p>;
}

export function CurrencyTable({
  caption,
  columns,
  rows,
}: Readonly<{
  caption: string;
  columns: readonly Readonly<{
    key: string;
    label: string;
    kind: "amount" | "count" | "percent";
  }>[];
  rows: readonly Readonly<Record<string, unknown>>[];
}>) {
  if (rows.length === 0)
    return <NoData>No data in this period. Currencies are never summed together.</NoData>;
  return (
    <div className="table-scroll">
      <table className="data-table currency-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Currency</th>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row["currency"])}>
              <th scope="row">{String(row["currency"])}</th>
              {columns.map((column) => {
                const raw = row[column.key];
                const value = typeof raw === "number" || typeof raw === "string" ? raw : null;
                return (
                  <td key={column.key}>
                    {value === null
                      ? "—"
                      : column.kind === "amount"
                        ? formatAmount(Number(value), String(row["currency"]))
                        : column.kind === "percent"
                          ? `${value}%`
                          : formatCount(Number(value))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
