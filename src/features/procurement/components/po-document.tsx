import { formatMoney, formatQuantity } from "@/features/invoices/invoice-contract";
import { deliveryStateLabels, type PoDocument } from "@/features/procurement/procurement-contract";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  );
}

function taxRateLabel(rate: string | number): string {
  const numeric = typeof rate === "string" ? Number.parseFloat(rate) : rate;
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(numeric)}%`;
}

/**
 * The issued purchase order document. Server-renderable, JavaScript-free,
 * semantic and printable. Rendered identically on the admin print route, the
 * token-scoped supplier share page, and inside the Command Center — always
 * from the same `private.purchase_order_document` model the PDF uses.
 * Supplier-facing: it carries received quantities as delivery progress but
 * never internal notes, requirement links or private project data.
 */
export function PurchaseOrderDocumentView({
  document,
  variant = "screen",
}: Readonly<{ document: PoDocument; variant?: "screen" | "print" }>) {
  const currency = document.currency;
  const isCancelled = document.lifecycle_state === "cancelled";
  const status = isCancelled
    ? "CANCELLED"
    : document.lifecycle_state === "closed"
      ? "CLOSED"
      : document.lifecycle_state === "draft"
        ? "DRAFT"
        : deliveryStateLabels[document.delivery_state].toUpperCase();
  const taxLabel = document.issuer?.tax_label ?? "Tax";
  const Title = variant === "print" ? "h1" : "h2";
  const Heading = variant === "print" ? "h2" : "h3";

  return (
    <article
      aria-labelledby="po-document-title"
      className={`invoice-document po-document invoice-document-${variant}`}
      data-lifecycle={document.lifecycle_state}
    >
      {isCancelled ? (
        <p className="invoice-void-banner" role="status">
          CANCELLED — this purchase order was withdrawn
          {document.cancelled_at ? ` on ${formatDate(document.cancelled_at)}` : ""}. Do not deliver
          against it.
        </p>
      ) : null}

      <header className="invoice-document-head">
        <div className="invoice-issuer">
          <span aria-hidden="true" className="invoice-mark">
            R
          </span>
          <div>
            <p className="invoice-issuer-name">
              {document.issuer?.name ?? "RENZ Construction Services Ltd"}
            </p>
            {document.issuer?.email ? <p>{document.issuer.email}</p> : null}
            {document.issuer?.whatsapp ? <p>WhatsApp {document.issuer.whatsapp}</p> : null}
          </div>
        </div>
        <div className="invoice-identity">
          <p className="invoice-kicker">Purchase order</p>
          <Title id="po-document-title">{document.purchase_order_number ?? "DRAFT"}</Title>
          <p className={`invoice-status invoice-status-${document.lifecycle_state}`}>{status}</p>
        </div>
      </header>

      <section aria-label="Purchase order parties and dates" className="invoice-meta">
        <dl>
          <div>
            <dt>Supplier</dt>
            <dd>
              <strong>{document.supplier?.display_name ?? "—"}</strong>
              {document.supplier?.company_name ? (
                <span>{document.supplier.company_name}</span>
              ) : null}
              {document.supplier?.contact_name ? (
                <span>Attn. {document.supplier.contact_name}</span>
              ) : null}
              {document.supplier?.address ? <span>{document.supplier.address}</span> : null}
              {document.supplier?.email ? <span>{document.supplier.email}</span> : null}
              {document.supplier?.phone ? <span>{document.supplier.phone}</span> : null}
            </dd>
          </div>
          {document.project ? (
            <div>
              <dt>Deliver for project</dt>
              <dd>{document.project.title}</dd>
            </div>
          ) : null}
          {document.reference ? (
            <div>
              <dt>Reference</dt>
              <dd>{document.reference}</dd>
            </div>
          ) : null}
        </dl>
        <dl>
          <div>
            <dt>Issue date</dt>
            <dd>{formatDate(document.issue_date)}</dd>
          </div>
          <div>
            <dt>Expected delivery</dt>
            <dd>{formatDate(document.expected_delivery_date)}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{currency}</dd>
          </div>
        </dl>
      </section>

      <div className="invoice-table-wrap">
        <table className="invoice-lines">
          <caption className="visually-hidden">Purchase order lines</caption>
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th className="numeric" scope="col">
                Qty
              </th>
              <th scope="col">Unit</th>
              <th className="numeric" scope="col">
                Unit price
              </th>
              <th className="numeric" scope="col">
                Line total
              </th>
              {document.lifecycle_state !== "draft" ? (
                <th className="numeric" scope="col">
                  Received
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {document.lines.map((line, index) => (
              <tr key={index}>
                <td data-label="Description">{line.description}</td>
                <td className="numeric" data-label="Qty">
                  {formatQuantity(line.quantity)}
                </td>
                <td data-label="Unit">{line.unit_label ?? "—"}</td>
                <td className="numeric" data-label="Unit price">
                  {formatMoney(line.unit_price, currency)}
                </td>
                <td className="numeric" data-label="Line total">
                  {formatMoney(line.line_total, currency)}
                </td>
                {document.lifecycle_state !== "draft" ? (
                  <td className="numeric" data-label="Received">
                    {formatQuantity(line.received_quantity)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-label="Purchase order totals" className="invoice-totals">
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(document.subtotal, currency)}</dd>
          </div>
          <div>
            <dt>
              {taxLabel} ({taxRateLabel(document.tax_rate)})
            </dt>
            <dd>{formatMoney(document.tax_amount, currency)}</dd>
          </div>
          <div className="invoice-total-row">
            <dt>Total</dt>
            <dd>{formatMoney(document.total, currency)}</dd>
          </div>
        </dl>
      </section>

      {document.terms || document.notes ? (
        <section aria-label="Terms and notes" className="invoice-notes">
          {document.terms ? (
            <div>
              <Heading>Terms</Heading>
              <p>{document.terms}</p>
            </div>
          ) : null}
          {document.notes ? (
            <div>
              <Heading>Notes</Heading>
              <p>{document.notes}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="invoice-document-foot">
        <p>
          {document.issuer?.name ?? "RENZ Construction Services Ltd"}
          {document.issuer?.email ? ` · ${document.issuer.email}` : ""}
        </p>
      </footer>
    </article>
  );
}
