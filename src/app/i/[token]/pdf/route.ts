import "server-only";

import { NextResponse } from "next/server";

import { loadSharedInvoiceDocument } from "@/features/invoices/invoice-data";
import { renderInvoicePdf } from "@/features/invoices/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Client PDF download for one shared invoice; same token gate as the page. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const document = await loadSharedInvoiceDocument(token);
  if (!document) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  try {
    const pdf = await renderInvoicePdf(document);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${document.invoice_number ?? "invoice"}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "pdf_failed" }, { status: 500 });
  }
}
