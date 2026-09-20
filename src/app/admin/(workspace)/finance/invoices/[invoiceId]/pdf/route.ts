import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { draftInvoiceDocument, loadInvoiceDetail } from "@/features/invoices/invoice-data";
import { renderInvoicePdf, renderPaymentReceiptPdf } from "@/features/invoices/invoice-pdf";
import { getSiteIdentity } from "@/lib/site/public-configuration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

function pdfResponse(pdf: Buffer, fileName: string): NextResponse {
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/**
 * Staff PDF download. Authorization is the RPC's: admin_get_invoice raises
 * for anyone who is not active, AAL2 staff holding finance.invoices.read,
 * and loadInvoiceDetail then yields null — so there is no path to bytes
 * without the same permission the Command Center requires.
 *
 * D1.5: a Draft invoice renders the same document family with a DRAFT
 * mark and no official number (§63 — never through a share token, which
 * drafts do not have); `?payment=<id>` renders a payment receipt (§69).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
): Promise<NextResponse> {
  const { invoiceId } = await params;
  const parsed = idSchema.safeParse(invoiceId);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid_id" }, { status: 400 });
  }
  const detail = await loadInvoiceDetail(parsed.data);
  if (!detail) {
    return NextResponse.json({ ok: false, reason: "not_available" }, { status: 404 });
  }
  const paymentId = new URL(request.url).searchParams.get("payment");
  try {
    if (paymentId) {
      const payment = detail.payments.find((entry) => entry.id === paymentId);
      if (!payment || !detail.document) {
        return NextResponse.json({ ok: false, reason: "not_available" }, { status: 404 });
      }
      const pdf = await renderPaymentReceiptPdf({ document: detail.document, payment });
      return pdfResponse(pdf, `${detail.document.invoice_number ?? "invoice"}-receipt.pdf`);
    }
    if (detail.document) {
      const pdf = await renderInvoicePdf(detail.document);
      return pdfResponse(pdf, `${detail.document.invoice_number ?? "invoice"}.pdf`);
    }
    const identity = await getSiteIdentity();
    const draft = draftInvoiceDocument(detail, {
      name: identity.displayName,
      email: identity.email,
      whatsapp: `+${identity.whatsappDigits}`,
    });
    if (!draft) {
      return NextResponse.json({ ok: false, reason: "not_available" }, { status: 404 });
    }
    const pdf = await renderInvoicePdf(draft);
    return pdfResponse(pdf, `DRAFT-invoice-${detail.invoice.id.slice(0, 8)}.pdf`);
  } catch {
    return NextResponse.json({ ok: false, reason: "pdf_failed" }, { status: 500 });
  }
}
