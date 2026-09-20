import "server-only";

import { NextResponse } from "next/server";

import { renderPurchaseOrderPdf } from "@/features/procurement/po-pdf";
import { loadSharedPurchaseOrder } from "@/features/procurement/procurement-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Supplier PDF download for one shared purchase order; same token gate as the page. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const document = await loadSharedPurchaseOrder(token);
  if (!document) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  try {
    const pdf = await renderPurchaseOrderPdf(document);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${document.purchase_order_number ?? "purchase-order"}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "pdf_failed" }, { status: 500 });
  }
}
