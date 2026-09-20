import { formatMoney } from "@/features/invoices/invoice-contract";

/**
 * Per-currency monetary register. Deliberately renders one row per currency
 * and never a combined figure — the C4/C5 finance invariant.
 */
export function CurrencyRegister({
  heading,
  rows,
  countLabel,
  emptyText,
  tone = "neutral",
  headingId,
}: Readonly<{
  heading: string;
  rows: readonly Readonly<{
    currency: string;
    total: string | number;
    invoice_count?: number | undefined;
    payment_count?: number | undefined;
  }>[];
  countLabel: string;
  emptyText: string;
  tone?: "neutral" | "attention";
  headingId?: string;
}>) {
  const id = headingId ?? `currency-${heading.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className={`admin-panel${tone === "attention" ? " admin-panel-attention" : ""}`}
    >
      <div className="section-heading-row section-heading-compact">
        <h2 id={id}>{heading}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="quiet-empty">{emptyText}</p>
      ) : (
        <dl className="currency-register">
          {rows.map((row) => {
            const count = row.invoice_count ?? row.payment_count;
            return (
              <div key={row.currency}>
                <dt>
                  {row.currency}
                  {count !== undefined ? (
                    <small>
                      {" "}
                      · {count} {countLabel}
                    </small>
                  ) : null}
                </dt>
                <dd>{formatMoney(row.total, row.currency)}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
