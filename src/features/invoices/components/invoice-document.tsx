import {
  formatMoney,
  formatQuantity,
  invoicePaymentStateLabels,
  paymentMethodLabels,
  type InvoiceDocument,
} from "@/features/invoices/invoice-contract";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function taxRateLabel(rate: string | number): string {
  const numeric = typeof rate === "string" ? Number.parseFloat(rate) : rate;
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(numeric)}%`;
}

/**
 * The professional issued-invoice document. Server-renderable, JavaScript-
 * free, semantic (a real table with headers, definition lists for parties),
 * and printable. Rendered identically on the admin print route, the
 * token-scoped client share page, and inside the Command Center — always
 * from the same `private.invoice_document` model the PDF uses.
 */
export function InvoiceDocumentView({
  document,
  variant = "screen",
}: Readonly<{ document: InvoiceDocument; variant?: "screen" | "print" }>) {
  const currency = document.currency;
  const isVoid = document.lifecycle_state === "void";
  const status = isVoid
    ? "VOID"
    : document.lifecycle_state === "draft"
      ? "INTERNAL REVIEW COPY"
      : document.is_overdue
        ? "OVERDUE"
        : invoicePaymentStateLabels[document.payment_state].toUpperCase();
  const taxLabel = document.issuer?.tax_label ?? "Tax";
  // Standalone (print/share) pages own the h1; embedded in the Command Center
  // the page header already carries it, so the document demotes one level.
  const Title = variant === "print" ? "h1" : "h2";
  const Heading = variant === "print" ? "h2" : "h3";

  return (
    <article
      aria-labelledby="invoice-document-title"
      className={`invoice-document invoice-document-${variant}`}
      data-lifecycle={document.lifecycle_state}
    >
      {document.lifecycle_state === "draft" || isVoid ? (
        <span aria-hidden="true" className="document-stamp">
          {isVoid ? "VOID" : "DRAFT"}
        </span>
      ) : null}
      {document.lifecycle_state === "draft" ? (
        <p className="invoice-draft-banner" role="status">
          DRAFT — for internal review only. Not an issued invoice; no official number is assigned.
        </p>
      ) : null}
      {isVoid ? (
        <p className="invoice-void-banner" role="status">
          VOID — this invoice was cancelled
          {document.voided_at ? ` on ${formatDate(document.voided_at.slice(0, 10))}` : ""}. No
          amount is payable against it.
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
          <p className="invoice-kicker">Invoice</p>
          <Title id="invoice-document-title">
            {document.invoice_number ?? "DRAFT — NOT ISSUED"}
          </Title>
          <p className={`invoice-status invoice-status-${document.lifecycle_state}`}>{status}</p>
        </div>
      </header>

      <section aria-label="Invoice parties and dates" className="invoice-meta">
        <dl>
          <div>
            <dt>Billed to</dt>
            <dd>
              <strong>{document.client?.full_name ?? "—"}</strong>
              {document.client?.company ? <span>{document.client.company}</span> : null}
              {document.client?.address ? <span>{document.client.address}</span> : null}
              {document.client?.email ? <span>{document.client.email}</span> : null}
              {document.client?.phone ? <span>{document.client.phone}</span> : null}
            </dd>
          </div>
          {document.project ? (
            <div>
              <dt>Project</dt>
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
            <dt>Due date</dt>
            <dd>{formatDate(document.due_date)}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{currency}</dd>
          </div>
        </dl>
      </section>

      <div className="invoice-table-wrap">
        <table className="invoice-lines">
          <caption className="visually-hidden">Invoice line items</caption>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-label="Invoice totals" className="invoice-totals">
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
          <div>
            <dt>Amount paid</dt>
            <dd>{formatMoney(document.paid_amount, currency)}</dd>
          </div>
          <div className="invoice-balance-row">
            <dt>Balance due</dt>
            <dd>
              {isVoid ? formatMoney(0, currency) : formatMoney(document.balance_due, currency)}
            </dd>
          </div>
        </dl>
      </section>

      {document.payments.length > 0 ? (
        <section aria-labelledby="invoice-payments-heading" className="invoice-payments">
          <Heading id="invoice-payments-heading">Payments received</Heading>
          <ul>
            {document.payments.map((payment, index) => (
              <li key={index}>
                <span>{formatDate(payment.payment_date)}</span>
                <span>{paymentMethodLabels[payment.payment_method]}</span>
                <span className="numeric">{formatMoney(payment.amount, currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {document.payment_terms || document.notes ? (
        <section aria-label="Notes and terms" className="invoice-notes">
          {document.payment_terms ? (
            <div>
              <Heading>Payment terms</Heading>
              <p>{document.payment_terms}</p>
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
