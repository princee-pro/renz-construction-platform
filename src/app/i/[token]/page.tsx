import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InvoiceDocumentView } from "@/features/invoices/components/invoice-document";
import { PrintButton } from "@/features/invoices/components/print-button";
import { loadSharedInvoiceDocument } from "@/features/invoices/invoice-data";
import { AUTHORIZED_CONTACT, whatsappHref } from "@/lib/site/contact-details";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoice — RENZ Construction Services Ltd",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

/**
 * Token-scoped client invoice view (C5 §56–59). No login, no admin chrome,
 * no staff controls. An unknown, malformed, or revoked token is a plain 404
 * — identical for every miss. A void invoice still resolves and renders its
 * VOID state so a client who received the link is told the document was
 * cancelled rather than left with a dead link.
 */
export default async function SharedInvoicePage({ params }: PageProps<"/i/[token]">) {
  const { token } = await params;
  const document = await loadSharedInvoiceDocument(token);
  if (!document) notFound();

  return (
    <main className="shared-invoice-page" id="main-content">
      <div className="print-toolbar shared-invoice-toolbar">
        <PrintButton />
        <a className="button button-secondary" href={`/i/${token}/pdf`}>
          Download PDF
        </a>
        <a
          className="button button-quiet"
          href={whatsappHref(
            `Hello RENZ, I have a question about invoice ${document.invoice_number ?? ""}.`,
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
      <InvoiceDocumentView document={document} variant="print" />
    </main>
  );
}
