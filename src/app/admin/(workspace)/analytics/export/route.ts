import "server-only";

import { NextResponse } from "next/server";

import {
  agingBucketLabels,
  agingBuckets,
  funnelStageLabels,
} from "@/features/analytics/analytics-contract";
import {
  loadFinanceAnalytics,
  loadLeadAnalytics,
  loadProjectAnalytics,
  resolveRequestedRange,
} from "@/features/analytics/analytics-data";
import {
  projectPhaseLabels,
  projectStatusLabels,
} from "@/features/operational-projects/project-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// C9 §86: CSV export of selected aggregate tables only — never raw
// operational rows. Authorization is the aggregate RPC's; an unauthorized
// caller gets an error, never a file.

/** RFC 4180 quoting plus a guard against spreadsheet formula injection. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request): Promise<NextResponse> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const report = params["report"] ?? "";
  if (!["lead-funnel", "invoice-aging", "project-status"].includes(report)) {
    return NextResponse.json({ error: "Unknown report." }, { status: 400 });
  }
  const { range } = await resolveRequestedRange(params);
  const rows: string[] = [];
  try {
    if (report === "lead-funnel") {
      const data = await loadLeadAnalytics(range);
      const base = data.funnel[0]?.count ?? 0;
      rows.push(["Stage", "Leads", "Share of submitted (%)"].join(","));
      for (const stage of data.funnel) {
        rows.push(
          [
            funnelStageLabels[stage.stage] ?? stage.stage,
            stage.count,
            base === 0 ? "" : Math.round((stage.count / base) * 1000) / 10,
          ]
            .map(cell)
            .join(","),
        );
      }
    } else if (report === "invoice-aging") {
      const data = await loadFinanceAnalytics(range);
      rows.push(["Currency", "Aging bucket", "Outstanding amount", "Invoices"].join(","));
      for (const currency of data.by_currency) {
        for (const bucket of agingBuckets) {
          const entry = currency.aging.find((item) => item.bucket === bucket);
          rows.push(
            [
              currency.currency,
              agingBucketLabels[bucket],
              entry?.amount ?? 0,
              entry?.invoice_count ?? 0,
            ]
              .map(cell)
              .join(","),
          );
        }
      }
    } else {
      const data = await loadProjectAnalytics(range);
      rows.push(["Dimension", "Value", "Projects"].join(","));
      for (const [key, label] of Object.entries(projectStatusLabels)) {
        rows.push(["Status", label, data.status_counts[key] ?? 0].map(cell).join(","));
      }
      for (const [key, label] of Object.entries(projectPhaseLabels)) {
        rows.push(["Phase", label, data.phase_counts[key] ?? 0].map(cell).join(","));
      }
    }
  } catch {
    return NextResponse.json({ error: "The report could not be produced." }, { status: 403 });
  }
  const filename = `renz-${report}-${range.from}-to-${range.to}.csv`;
  const bom = "\uFEFF";
  return new NextResponse(`${bom}${rows.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
