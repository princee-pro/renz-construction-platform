import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { InvoiceDocumentView } from "@/features/invoices/components/invoice-document";
import { PrintButton } from "@/features/invoices/components/print-button";
import { formatMoney, paymentMethodLabels } from "@/features/invoices/invoice-contract";
import { draftInvoiceDocument, loadInvoiceDetail } from "@/features/invoices/invoice-data";
import { getSiteIdentity } from "@/lib/site/public-configuration";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print invoice | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(value.length === 10 ? `${value}T00:00:00Z` : value),
  );
}

/**
 * Clean print view of the issued document (or a draft preview). With
 * `?payment=<id>` it renders a print-friendly payment receipt for one
 * recorded payment instead. The admin shell is hidden in print media.
 */
export default async function PrintInvoicePage({
  params,
  searchParams,
}: PageProps<"/admin/finance/invoices/[invoiceId]/print">) {
  await requirePermission("finance.invoices.read");
  const [route, query] = await Promise.all([params, searchParams]);
  const parsed = idSchema.safeParse(route.invoiceId);
  if (!parsed.success) notFound();
  const detail = await loadInvoiceDetail(parsed.data);
  if (!detail) notFound();

  const paymentParam = Array.isArray(query["payment"]) ? query["payment"][0] : query["payment"];
  const payment = paymentParam
    ? (detail.payments.find((entry) => entry.id === paymentParam) ?? null)
    : null;

  const identity = await getSiteIdentity();
  const draftPreview = draftInvoiceDocument(detail, {
    name: identity.displayName,
    email: identity.email,
    whatsapp: `+${identity.whatsappDigits}`,
  });
  const document = draftPreview ?? detail.document;
  const invoiceLabel = detail.invoice.invoice_number ?? "Draft";

  return (
    <main className="workspace-page print-page" id="main-content">
      <div className="print-toolbar">
        <Link className="button button-quiet" href={`/admin/finance/invoices/${detail.invoice.id}`}>
          Back to invoice
        </Link>
        <PrintButton />
        {payment ? (
          <a
            className="button button-secondary"
            href={`/admin/finance/invoices/${detail.invoice.id}/pdf?payment=${payment.id}`}
          >
            Download receipt PDF
          </a>
        ) : (
          <a
            className="button button-secondary"
            href={`/admin/finance/invoices/${detail.invoice.id}/pdf`}
          >
            {detail.invoice.lifecycle_state === "draft" ? "Download draft PDF" : "Download PDF"}
          </a>
        )}
      </div>
      {payment ? (
        <article
          aria-labelledby="receipt-title"
          className="invoice-document invoice-document-print payment-receipt"
        >
          <header className="invoice-document-head">
            <div className="invoice-issuer">
              <span aria-hidden="true" className="invoice-mark">
                R
              </span>
              <div>
                <p className="invoice-issuer-name">RENZ Construction Services Ltd</p>
                <p>renzconstruuction@gmail.com</p>
              </div>
            </div>
            <div className="invoice-identity">
              <p className="invoice-kicker">Payment receipt</p>
              <h1 id="receipt-title">{invoiceLabel}</h1>
              {payment.reversed_at ? (
                <p className="invoice-status invoice-status-void">REVERSED</p>
              ) : (
                <p className="invoice-status invoice-status-issued">RECEIVED</p>
              )}
            </div>
          </header>
          <section className="invoice-meta">
            <dl>
              <div>
                <dt>Received from</dt>
                <dd>
                  <strong>{detail.document?.client?.full_name ?? detail.client.full_name}</strong>
                </dd>
              </div>
              <div>
                <dt>Against invoice</dt>
                <dd>{invoiceLabel}</dd>
              </div>
            </dl>
            <dl>
              <div>
                <dt>Payment date</dt>
                <dd>{formatDate(payment.payment_date)}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{paymentMethodLabels[payment.payment_method]}</dd>
              </div>
              {payment.reference ? (
                <div>
                  <dt>Reference</dt>
                  <dd>{payment.reference}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          <section className="invoice-totals">
            <dl>
              <div className="invoice-total-row">
                <dt>Amount received</dt>
                <dd>{formatMoney(payment.amount, detail.invoice.currency)}</dd>
              </div>
              <div>
                <dt>Invoice total</dt>
                <dd>{formatMoney(detail.financials.total, detail.invoice.currency)}</dd>
              </div>
              <div className="invoice-balance-row">
                <dt>Balance remaining</dt>
                <dd>{formatMoney(detail.financials.balance_due, detail.invoice.currency)}</dd>
              </div>
            </dl>
          </section>
          {payment.reversed_at ? (
            <p className="invoice-void-banner" role="status">
              This payment was reversed on {formatDate(payment.reversed_at)} and no longer counts
              towards the invoice balance.
            </p>
          ) : null}
        </article>
      ) : document ? (
        <InvoiceDocumentView document={document} variant="print" />
      ) : (
        notFound()
      )}
    </main>
  );
}
