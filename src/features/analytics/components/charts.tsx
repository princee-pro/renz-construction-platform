import type { ReactNode } from "react";

import { formatBucket, formatCount } from "@/features/analytics/analytics-contract";

/**
 * Accessible CSS/SVG charts (C9 §41–42). No chart library: every figure is
 * server-rendered, carries a text summary, and exposes its data as a table.
 * Colour never encodes status alone — labels and numbers are always visible.
 * Series palette (validated for CVD separation and contrast): gold + blue.
 */

const seriesColors = ["#c08a2e", "#1873a8"] as const;

export function BarList({
  items,
  label,
  emptyText,
  format = formatCount,
  hrefFor,
}: Readonly<{
  items: readonly Readonly<{ key: string; label: string; value: number; note?: string }>[];
  label: string;
  emptyText: string;
  format?: (value: number) => string;
  hrefFor?: (key: string) => string | null;
}>) {
  if (items.length === 0) return <p className="quiet-empty">{emptyText}</p>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ol aria-label={label} className="bar-list">
      {items.map((item) => {
        const href = hrefFor?.(item.key) ?? null;
        return (
          <li key={item.key}>
            <span className="bar-list-label">
              {href ? <a href={href}>{item.label}</a> : item.label}
              {item.note ? <small>{item.note}</small> : null}
            </span>
            <span aria-hidden="true" className="bar-list-track">
              <span
                className="bar-list-fill"
                style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%` }}
              />
            </span>
            <strong className="bar-list-value">{format(item.value)}</strong>
          </li>
        );
      })}
    </ol>
  );
}

export function Funnel({
  stages,
  label,
}: Readonly<{
  stages: readonly Readonly<{ stage: string; label: string; count: number }>[];
  label: string;
}>) {
  const base = stages[0]?.count ?? 0;
  if (base === 0) {
    return (
      <p className="quiet-empty">
        No leads were submitted in this period. The funnel fills as enquiries arrive and move
        through Contacted, Qualified, Site visit, Proposal and Won.
      </p>
    );
  }
  return (
    <ol aria-label={label} className="funnel">
      {stages.map((stage) => {
        const share = Math.round((stage.count / base) * 1000) / 10;
        return (
          <li key={stage.stage}>
            <span className="funnel-label">{stage.label}</span>
            <span aria-hidden="true" className="funnel-track">
              <span
                className="funnel-fill"
                style={{ width: `${Math.max(share, stage.count > 0 ? 2 : 0)}%` }}
              />
            </span>
            <strong className="funnel-value">{formatCount(stage.count)}</strong>
            <span className="funnel-share">
              {stage.stage === "submitted" ? "of submitted" : `${share}%`}
            </span>
          </li>
        );
      })}
      <li className="funnel-note">
        Percentages use leads submitted in the period as the denominator. Site visit and Proposal
        are optional stages; a lead may be won without them.
      </li>
    </ol>
  );
}

export type TrendSeries = Readonly<{
  key: string;
  label: string;
  values: readonly number[];
}>;

/**
 * Two-series maximum trend chart: bars when one series, bars + line when two.
 * The SVG is decorative; the `<figcaption>` summary and the table carry the
 * same information for non-visual readers.
 */
export function TrendChart({
  title,
  buckets,
  granularity,
  series,
  format = formatCount,
  emptyText,
}: Readonly<{
  title: string;
  buckets: readonly string[];
  granularity: "day" | "week";
  series: readonly TrendSeries[];
  format?: (value: number) => string;
  emptyText: string;
}>) {
  const visible = series.slice(0, 2);
  const total = visible.reduce((sum, s) => sum + s.values.reduce((a, b) => a + b, 0), 0);
  if (buckets.length === 0 || total === 0) return <p className="quiet-empty">{emptyText}</p>;
  const width = 640;
  const height = 200;
  const padLeft = 8;
  const padBottom = 28;
  const plotHeight = height - padBottom - 8;
  const max = Math.max(...visible.flatMap((s) => s.values), 1);
  const slot = (width - padLeft * 2) / buckets.length;
  const barWidth = Math.max(Math.min(slot * 0.6, 28), 3);
  const x = (index: number) => padLeft + slot * index + slot / 2;
  const y = (value: number) => 8 + plotHeight - (value / max) * plotHeight;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 8));
  const primary = visible[0];
  const secondary = visible[1];
  const summary = visible
    .map((s) => {
      const sum = s.values.reduce((a, b) => a + b, 0);
      const peakIndex = s.values.indexOf(Math.max(...s.values));
      return `${s.label}: ${format(sum)} in total, peak ${format(s.values[peakIndex] ?? 0)} on ${formatBucket(buckets[peakIndex] ?? buckets[0] ?? "", granularity)}`;
    })
    .join(". ");

  return (
    <figure className="trend-figure">
      <svg
        aria-hidden="true"
        className="trend-chart"
        focusable="false"
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
      >
        <line className="trend-baseline" x1={padLeft} x2={width - padLeft} y1={y(0)} y2={y(0)} />
        {primary
          ? primary.values.map((value, index) => (
              <rect
                fill={seriesColors[0]}
                height={Math.max(y(0) - y(value), 0)}
                key={`${primary.key}-${index}`}
                rx={value > 0 ? 2 : 0}
                width={barWidth}
                x={x(index) - barWidth / 2}
                y={y(value)}
              >
                <title>{`${formatBucket(buckets[index] ?? "", granularity)} · ${primary.label} ${format(value)}`}</title>
              </rect>
            ))
          : null}
        {secondary ? (
          <>
            <polyline
              fill="none"
              points={secondary.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
              stroke={seriesColors[1]}
              strokeLinejoin="round"
              strokeWidth={2}
            />
            {secondary.values.map((value, index) => (
              <circle
                cx={x(index)}
                cy={y(value)}
                fill={seriesColors[1]}
                key={`${secondary.key}-${index}`}
                r={4}
                stroke="#ffffff"
                strokeWidth={2}
              >
                <title>{`${formatBucket(buckets[index] ?? "", granularity)} · ${secondary.label} ${format(value)}`}</title>
              </circle>
            ))}
          </>
        ) : null}
        {buckets.map((bucket, index) =>
          index % labelEvery === 0 ? (
            <text
              className="trend-axis-label"
              key={bucket}
              textAnchor="middle"
              x={x(index)}
              y={height - 8}
            >
              {formatBucket(bucket, granularity)}
            </text>
          ) : null,
        )}
      </svg>
      {visible.length > 1 ? (
        <ul aria-label={`${title} legend`} className="trend-legend">
          {visible.map((s, index) => (
            <li key={s.key}>
              <span
                aria-hidden="true"
                className={index === 0 ? "legend-swatch legend-bar" : "legend-swatch legend-line"}
                style={{ background: seriesColors[index] }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
      <figcaption>
        {title}. {summary}.
      </figcaption>
      <details className="chart-data">
        <summary>Show data table</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{granularity === "week" ? "Week commencing" : "Day"}</th>
              {visible.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket, index) => (
              <tr key={bucket}>
                <th scope="row">{bucket}</th>
                {visible.map((s) => (
                  <td key={s.key}>{format(s.values[index] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Fills missing buckets between `from` and `to` with zero so trends read evenly. */
export function fillBuckets<T extends { bucket: string }>(
  rows: readonly T[],
  from: string,
  to: string,
  granularity: "day" | "week",
  zero: Omit<T, "bucket">,
): readonly T[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  const result: T[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (granularity === "week") {
    // ISO week starts Monday, matching date_trunc('week').
    const day = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - day);
  }
  for (let cursor = new Date(start); cursor <= end;) {
    const key = cursor.toISOString().slice(0, 10);
    result.push(byBucket.get(key) ?? ({ ...zero, bucket: key } as T));
    cursor = new Date(cursor.getTime() + (granularity === "week" ? 7 : 1) * 86_400_000);
  }
  return result;
}

export function ChartPanel({
  title,
  id,
  children,
  aside,
}: Readonly<{ title: string; id: string; children: ReactNode; aside?: ReactNode }>) {
  return (
    <section aria-labelledby={id} className="admin-panel analytics-panel">
      <div className="section-heading-row section-heading-compact">
        <h2 id={id}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
