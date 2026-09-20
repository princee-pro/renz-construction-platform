import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { renderPurchaseOrderPdf } from "@/features/procurement/po-pdf";
import { loadPoDetail } from "@/features/procurement/procurement-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

/**
 * Staff PDF download. Authorization is the RPC's: admin_get_purchase_order
 * raises for anyone who is not active, AAL2 staff holding
 * procurement.orders.read, and loadPoDetail then yields null — so there is no
 * path to bytes without the same permission the Command Center requires.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const { orderId } = await params;
  const parsed = idSchema.safeParse(orderId);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_id" }, { status: 400 });
  }
  const detail = await loadPoDetail(parsed.data);
  if (!detail?.document) {
    return NextResponse.json({ ok: false, reason: "not_available" }, { status: 404 });
  }
  try {
    const pdf = await renderPurchaseOrderPdf(detail.document);
    const fileName = `${detail.document.purchase_order_number ?? "purchase-order"}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "pdf_failed" }, { status: 500 });
  }
}
