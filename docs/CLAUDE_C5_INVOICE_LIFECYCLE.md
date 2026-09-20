# C5 INVOICE LIFECYCLE

## Two independent axes

**Lifecycle state** (stored, `invoices.lifecycle_state`):

```
draft ──issue──▶ issued ──void──▶ void
  │
  └──archive──▶ (draft, archived_at set — leaves the register, never issuable)
```

**Payment state** (derived by `private.invoice_financials`, never stored,
never chosen by a person): `unpaid → partially_paid → paid`, plus the derived
flag `is_overdue`. The UI collapses both into one badge through
`invoiceStatus()`: Draft / Archived draft / Void / Overdue / Paid / Partially
paid / Unpaid — lifecycle first, overdue as a consequence.

## Draft

Editable through `create_admin_invoice` / `update_admin_invoice`
(`finance.invoices.write`): client, project (must belong to the client —
DB-enforced), currency, tax rate, reference, notes, payment terms, planned
issue/due dates, and the full line-item list (replaced atomically per save,
≤ 100 lines). A draft may temporarily have no lines. It has **no invoice
number**; the register and every heading say DRAFT.

Concurrency: `expected_version` is pinned when the editor opens
(`usePinnedEdit`); another staff member's save is reported as
`version_conflict`, the stale values stay on screen (controlled drafts),
and **Reload latest** remounts the form with the fresh record.

Drafts can be **archived** (`archive_admin_invoice`) — a lifecycle-adjacent
flag, not a state: archived drafts leave the register, cannot be edited or
issued, and are never deleted.

## Issue (`issue_admin_invoice`, `finance.invoices.issue`)

One transaction, in this order, under `select … for update` on the invoice
row:

1. must be an active draft with the expected version;
2. issue date required; due date required; `due_date >= issue_date`;
3. at least one line item;
4. compute totals via the canonical projection;
5. freeze snapshots: client (name, company, address, email, phone),
   project (title, id), issuer (see below);
6. take the next official number (see `CLAUDE_C5_INVOICE_NUMBERING.md`);
7. set `issued_*`, `issue_date`, `due_date`, `lifecycle_state = issued`,
   bump version;
8. audit `invoice.issue` on the invoice **and** as a milestone on the client
   and the project (so Client 360 / Project activity show it);
9. emit the `issued` realtime pointer.

A failure anywhere rolls the whole thing back, number included. Two staff
issuing the same draft serialize on the row lock; the second sees
`invalid_state` (or `version_conflict`). This is proven in
`scripts/verify-c5.mjs` and `013_c5_finance.sql`.

### Issuer snapshot

`private.invoice_issuer_snapshot()` returns only verified, authorized public
identity: `RENZ Construction Services Ltd`, `renzconstruuction@gmail.com`,
WhatsApp `+44 7412 853143` (text-only; the document never renders a `tel:`
link), and `tax_label: "Tax"`. No VAT/tax registration, company number,
office, or bank details are invented — if C7 configures them later, invoices
issued before that keep the snapshot they were issued with.

## Issued: financial immutability

The `invoices_enforce_immutability` trigger refuses any change to client,
project, number, reference, currency, tax rate, dates, notes/terms,
snapshots, frozen totals, `issued_*`, or `archived_at` once the row is not a
draft, and refuses `void → anything` and `issued → draft`. Line items of a
non-draft invoice cannot be inserted, updated, or deleted
(`invoice_line_items_draft_only`). The edit facade refuses with
`invalid_state`; the `/edit` route redirects to the Command Center. Only
bookkeeping columns (`updated_at/by`, `version`) and the void transition can
move. To bill differently: **void and duplicate**.

## Void (`void_admin_invoice`, `finance.invoices.void` — super_admin only)

Requires a reason (≤ 1000 chars) and **no effective payments**: with any
non-reversed payment the facade refuses (`invalid_state`, field `payments`);
reverse them first. This is the deliberately simpler, safer rule over a
credit-note model. A void invoice keeps its number, lines, snapshots, and
payment history; nothing is payable against it; it is never overdue; it
cannot receive payments or new share links; an existing share link renders
the VOID state (see sharing doc).

## Duplicate to draft (`duplicate_admin_invoice`)

Starter values only: client, project, currency, tax rate, reference,
notes/terms, line items. Never the number, dates, payments, share link, or
snapshots. Refused if the client is archived.

## Facade list

Read: `admin_list_invoices`, `admin_get_invoice`, `admin_client_invoices`,
`admin_project_invoices`, `admin_finance_overview`,
`admin_finance_action_queue`, `public_invoice_by_share_token` (anon).
Write: `create_admin_invoice`, `update_admin_invoice`, `issue_admin_invoice`,
`void_admin_invoice`, `archive_admin_invoice`, `duplicate_admin_invoice`,
`record_invoice_payment`, `reverse_invoice_payment`,
`create_invoice_share_link`, `revoke_invoice_share_link`. C4's
`admin_recent_activity` and `admin_global_quick_find` were re-created to
include invoices for holders of `finance.invoices.read`.

## RBAC

| Permission                 | super_admin | admin |
| -------------------------- | ----------- | ----- |
| `finance.invoices.read`    | ✓           | ✓     |
| `finance.invoices.write`   | ✓           | ✓     |
| `finance.invoices.issue`   | ✓           | ✓     |
| `finance.payments.write`   | ✓           | ✓     |
| `finance.invoices.void`    | ✓           | —     |

Issuing is day-to-day billing and stays with admin; voiding an official
document is the narrow one. Content permissions are untouched.

## Audit events

`invoice.create`, `invoice.update`, `invoice.issue`, `invoice.void`,
`invoice.archive`, `invoice.share_create`, `invoice.share_revoke`,
`invoice.payment_record`, `invoice.payment_reverse`, `invoice.paid`.
Metadata carries ids, invoice number, amount + currency, method, and the
state transition — never the raw token, billing address, client contact
details, or a payment note (asserted by `verify-c5.mjs`).
