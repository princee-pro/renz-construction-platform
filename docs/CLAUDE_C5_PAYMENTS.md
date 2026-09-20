# C5 PAYMENTS

A **client payment** is money RENZ received against one issued client
invoice — staff recording what happened, not an online payment. Contractor
payments are C6 and share nothing with this table.

## Table: `invoice_payments`

`id, invoice_id, amount numeric(14,2) > 0, payment_date, payment_method,
reference, note, created_by, created_at, reversed_at, reversed_by,
reversal_reason`. Methods are a bounded vocabulary: `bank_transfer | cash |
mobile_money | card | cheque | other` (labelled "Bank transfer", "Mobile
money", …). `note` is internal and is never shown on the document, the share
page, the PDF, or in audit metadata.

## Recording (`record_invoice_payment`, `finance.payments.write`)

Sequence: validate amount (> 0, 2dp), date, method, lengths → **lock the
invoice row `FOR UPDATE`** → invoice must be `issued` → read the effective
balance through `private.invoice_financials` **under that lock** → refuse if
`amount > balance_due` (`exceeds_balance`, with the current balance in the
result) → insert → bump the invoice version → audit
`invoice.payment_record` (and `invoice.paid` on the invoice, the client and
the project when the balance reaches zero) → emit `payment_recorded`.

Because the balance is read under the invoice row lock, two simultaneous
payments serialize: the second is validated against the balance the first
left behind. Two 285 000 payments against a 285 000 balance yield exactly one
success and one `exceeds_balance` — proven in `scripts/verify-c5.mjs` (§96)
and never an effective paid total above the invoice total.

Overpayments are not supported in C5 and are rejected; no negative balance
can be created. The Record Payment dialog shows invoice total, already paid,
current balance, and the balance after the entered amount before submission,
and disables submission once the entry would exceed the balance (the server
re-checks regardless).

## Partial → paid

`payment_state` is derived every read: `unpaid` (paid = 0),
`partially_paid` (0 < paid < total), `paid` (paid ≥ total). Example from the
synthetic flow: total 385 000 → payment 100 000 → *Partially paid*, balance
285 000 → payment 285 000 → *Paid*, balance 0.

## Reversal (`reverse_invoice_payment`)

Payments are never edited or deleted — the
`invoice_payments_history` trigger blocks `DELETE` outright and blocks any
`UPDATE` except setting `reversed_at / reversed_by / reversal_reason` once
on an unreversed row. Reversal requires a reason, preserves the original row
(struck through in the Payments tab with actor, time and reason), removes the
amount from the effective total, recomputes state/balance at the next read,
audits `invoice.payment_reverse`, and emits `payment_reversed`. A reversed
payment cannot be reversed again.

## Receipts

Each payment row offers **Receipt** → `/admin/finance/invoices/[id]/print?payment=<paymentId>`,
a print-friendly payment confirmation (amount received, date, method,
reference, invoice total, remaining balance; marked REVERSED when applicable).
A client-facing receipt PDF was left optional per the brief.

## Overdue

`is_overdue = issued ∧ due_date < today ∧ balance_due > 0`; derived at read
time, so a payment or reversal changes it immediately with no scheduled job.
Void invoices are never overdue.

## Where money shows up (always per currency)

- Invoice Command Center header and Payments tab.
- Client 360 → Invoices tab (`admin_client_invoices`): invoiced / paid /
  outstanding per currency + bounded invoice list.
- Project Command Center → Invoices tab (`admin_project_invoices`): same; the
  project budget is never compared to invoice totals across currencies.
- Finance overview / Control Room (`admin_finance_overview`): outstanding,
  overdue, invoiced, paid-in-30-days — each grouped by currency; counts of
  drafts / issued / overdue / partially paid / due-soon; recent payments.
- Finance action queue (`admin_finance_action_queue`): overdue, overdue +
  partially paid, due within 7 days, stale drafts (14+ days).
