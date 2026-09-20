import "server-only";

import { NextResponse } from "next/server";

import { invoiceStatus } from "@/features/invoices/invoice-contract";
import {
  loadInvoiceList,
  normalizeInvoiceListFilters,
  type InvoiceListFilters,
} from "@/features/invoices/invoice-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bounded: the export walks the same keyset-paginated facade the register
// uses, at most 20 pages × 25 rows. Authorization is the facade's — an
// unauthorized caller gets an RPC error, never a file.
const MAX_PAGES = 20;

const columns = [
  "Invoice",
  "Client",
  "Project",
  "Lifecycle",
  "Status",
  "Currency",
  "Issue date",
  "Due date",
  "Total",
  "Paid",
  "Balance",
  "Reference",
  "Updated",
] as const;

/** RFC 4180 quoting plus a guard against spreadsheet formula injection. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request): Promise<NextResponse> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const base = normalizeInvoiceListFilters(params);
  const rows: string[] = [columns.join(",")];
  let filters: InvoiceListFilters = { ...base, cursorUpdatedAt: "", cursorId: "" };

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await loadInvoiceList(filters);
      for (const item of result.items) {
        rows.push(
          [
            item.invoice_number ?? "DRAFT",
            item.client.full_name,
            item.project?.title ?? "",
            item.lifecycle_state,
            invoiceStatus(item).label,
            item.currency,
            item.issue_date ?? "",
            item.due_date ?? "",
            item.total,
            item.paid_amount,
            item.lifecycle_state === "void" ? "" : item.balance_due,
            item.reference ?? "",
            item.updated_at,
          ]
            .map(cell)
            .join(","),
        );
      }
      if (!result.has_more || !result.next_cursor_updated_at || !result.next_cursor_id) break;
      filters = {
        ...filters,
        cursorUpdatedAt: result.next_cursor_updated_at,
        cursorId: result.next_cursor_id,
      };
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "not_authorized" }, { status: 403 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  // UTF-8 BOM so spreadsheet apps decode accented client names correctly.
  const bom = String.fromCharCode(0xfeff);
  return new NextResponse(`${bom}${rows.join("\r\n")}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="renz-invoices-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
