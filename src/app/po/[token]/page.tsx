import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/features/invoices/components/print-button";
import { PurchaseOrderDocumentView } from "@/features/procurement/components/po-document";
import { loadSharedPurchaseOrder } from "@/features/procurement/procurement-data";
import { AUTHORIZED_CONTACT, whatsappHref } from "@/lib/site/contact-details";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchase order — RENZ Construction Services Ltd",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

/**
 * Token-scoped supplier purchase order view (C6). No login, no admin chrome,
 * no staff controls. An unknown, malformed, revoked, or draft token is a
 * plain 404 — identical for every miss. A cancelled or closed order still
 * resolves and renders its state so a supplier holding the link is told,
 * rather than left with a dead link.
 */
export default async function SharedPurchaseOrderPage({ params }: PageProps<"/po/[token]">) {
  const { token } = await params;
  const document = await loadSharedPurchaseOrder(token);
  if (!document) notFound();

  return (
    <main className="shared-invoice-page" id="main-content">
      <div className="print-toolbar shared-invoice-toolbar">
        <PrintButton />
        <a className="button button-secondary" href={`/po/${token}/pdf`}>
          Download PDF
        </a>
        <a
          className="button button-quiet"
          href={whatsappHref(
            `Hello RENZ, I have a question about purchase order ${document.purchase_order_number ?? ""}.`,
          )}
          rel="noreferrer"
          target="_blank"
        >
          Message RENZ on WhatsApp
        </a>
        <a className="button button-quiet" href={`mailto:${AUTHORIZED_CONTACT.email}`}>
          Email RENZ
        </a>
      </div>
      <PurchaseOrderDocumentView document={document} variant="print" />
    </main>
  );
}
