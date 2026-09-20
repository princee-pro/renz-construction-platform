# C6 — CONTRACTOR FINANCE

## Canonical projection

`private.assignment_financials(assignment_id)` → `agreed_amount`,
`paid_amount` (sum of non-reversed payments), `remaining_amount`
(`agreed − paid`, never negative), `payment_state`
(`unpaid | partially_paid | paid`). Every register, panel, overview and the
payables list read this projection; nothing is stored redundantly.

## Payments

`public.contractor_payments` is append-only: `amount > 0`, `payment_date`,
`payment_method` (C5 vocabulary), `reference`, `note` (private),
`recorded_by`, `reversed_at / reversed_by / reversal_reason`. The
`enforce_contractor_payment_history` trigger blocks every update except the
reversal transition and blocks deletes.

- `record_contractor_payment(target_assignment_id, amount, target_payment_date, target_method, target_reference, target_note)`
  (`contractors.payments.write`) locks the assignment row (`FOR UPDATE`),
  refuses cancelled assignments, refuses `amount > remaining`
  (`exceeds_remaining`), bumps the version, audits
  `contractor.payment_record` (amount + currency, never the note), emits
  `payment_recorded`. Reaching zero remaining audits `assignment.completed`
  as a financial milestone on the assignment and the project.
- `reverse_contractor_payment(target_payment_id, reason)` marks the row
  reversed (never deletes), recomputes, audits `contractor.payment_reverse`,
  emits `payment_reversed`.

Race proof (`scripts/verify-c6.mjs`): agreed 100000, two concurrent 80000
payments → exactly one accepted, the other `exceeds_remaining`.

## Adjusting the agreed amount

The agreed amount changes through `adjust_contractor_assignment_amount`
only once payments exist: the previous and new values plus the reason are
stored in `contractor_assignment_adjustments` and audited as
`assignment.finance_adjustment`. The new amount cannot be below the paid
total.

## Contractor Payables (Finance)

`/admin/finance/contractor-payables` (`admin_list_contractor_payables`) lists
every assignment with an agreed amount: contractor, project, scope, agreed,
paid, remaining, status, payment state, last payment date; filters by search,
partner, project, status, currency, payment state; keyset pagination. Payments
are recorded from the assignment page — the register never creates one.

## Where it appears

- Project → Contractors tab: committed / paid / remaining per currency.
- Contractor 360 → Finance: outstanding by currency and the assignment rows.
- Control Room → “Owed to contractors by currency”.
- Project overview → Cost & delivery position: `contractor_committed`,
  `contractor_paid` per currency beside client invoiced / paid and material
  ordered — never a profit or margin figure.

## Privacy

Payment notes are never written to audit metadata or realtime events; the
verification script asserts the private note is absent from `audit_logs`.
