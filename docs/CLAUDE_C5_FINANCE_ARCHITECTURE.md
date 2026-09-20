# C5 FINANCE — ARCHITECTURE

Entry point for the Invoices + Client Finance foundation. Read this first, then
`CLAUDE_C5_INVOICE_LIFECYCLE.md`, `CLAUDE_C5_INVOICE_NUMBERING.md`,
`CLAUDE_C5_PAYMENTS.md`, and `CLAUDE_C5_INVOICE_SHARING.md`.

## What C5 is

C5 adds the private billing domain on top of C4: **invoices** (with line
items) belong to a **client** and optionally to one of that client's
**operational projects**; **client payments** are money received against an
issued invoice. It is the layer C6 (contractor finance) will sit beside and
C9 (analytics) will read from. C5 records money; it does not process it — no
gateway, no accounting integration, no tax/legal assertions.

## Pattern reused, not reinvented

Everything is a straight continuation of the C4 pattern:

- Default-deny RLS on every finance table; `SECURITY DEFINER` facades with an
  empty `search_path` are the only access path (17 facades, listed in the
  lifecycle doc). One intentional non-staff facade exists:
  `public_invoice_by_share_token(text)` — token-scoped, hash-verified, granted
  to `anon` (see the sharing doc).
- `private.has_permission(...)` for authorization (AAL2 + active profile
  built in), `private.s4_audit(...)` for audit, `private.failure(...)` for the
  `{ok:false, reasons:[...]}` shape, integer `version` + `expected_version`
  for optimistic concurrency, `private.emit_realtime_event('invoice', …)` for
  the realtime pointer.
- Keyset pagination on `admin_list_invoices`; every list/detail/summary is one
  bounded RPC with `lateral private.invoice_financials(...)` — no N+1 from
  the app.
- The same admin-shared primitives: `AdminActionState` (+ a one-shot `detail`
  slot for the share token), `usePinnedEdit`/controlled drafts for the editor,
  `RealtimeRefresh` for server pages, `RegisterSkeleton` for loading.

## Domain model

```
clients ──< invoices >── operational_projects (optional, same client — DB-enforced)
             │
             ├──< invoice_line_items   (draft-only mutable)
             ├──< invoice_payments     (append-only; reversal = flagged, never deleted)
             └──< invoice_share_links  (SHA-256 token hashes; one active per invoice)
invoice_number_counters (per-year sequence rows; see numbering doc)
```

Client/project integrity is a **composite foreign key**
`(operational_project_id, client_id) → operational_projects (id, client_id)`
backed by a new unique constraint on `operational_projects (id, client_id)`.
A mismatched pair fails at the database (`23503`) even if every application
check were bypassed; the facade reports it first as `invalid_relationship`.

## Money rule (the only arithmetic there is)

Implemented once, in `private.invoice_financials(invoice_id)`:

```
line_total  = round(quantity × unit_price, 2)      quantity numeric(12,3), unit_price numeric(14,2)
subtotal    = Σ line_total
tax_amount  = round(subtotal × tax_rate / 100, 2)  tax_rate numeric(5,2), 0..100
total       = subtotal + tax_amount
paid_amount = Σ amount of payments where reversed_at is null
balance_due = total − paid_amount
payment_state = unpaid | partially_paid | paid   (from paid_amount vs total)
is_overdue    = lifecycle = issued ∧ due_date < today ∧ balance_due > 0
```

Rounding is half-up to two decimals at each named step (line, then tax);
nothing is ever a float. Once an invoice is issued, `issued_subtotal`,
`issued_tax_amount`, `issued_total` are frozen on the row and the projection
reads those instead of recomputing. `previewTotals()` in the editor mirrors
the same rule for display only; the server recomputes on every save.

**Different currencies are never summed.** `admin_finance_overview`,
`admin_client_invoices`, `admin_project_invoices`, and every register group by
`currency`; the UI renders one row per currency (`CurrencyRegister`) and the
overview schema has no `total_*` field a future component could misuse.

## Display language

Invoiced / Paid / Outstanding — never "Revenue". Tax is labelled "Tax" from
the issuer snapshot (`tax_label`); "VAT" appears nowhere unless C7 configures
it. A `tax_rate` of 0 is simply 0, not a claim of exemption.

## Windows and rules (deterministic, documented here)

- Due soon: `due_date` within the next **7** days and `balance_due > 0`.
- Paid recently: payments dated within the last **30** days.
- Stale draft (action queue only): draft untouched for **14+** days.
- Overdue: derived at read time; no scheduled job flips anything.

## Realtime

`invoice` joins the `realtime_events` entity vocabulary with actions
`created | updated | issued | voided | payment_recorded | payment_reversed |
share_created | share_revoked | archived`. Every finance write emits one
pointer; the Invoice Command Center, the Client 360 and Project pages
(`client`/`operational_project` + `invoice`), the Invoices register, Finance
overview and Control Room subscribe and `router.refresh()`. No amount, note,
or token ever rides the channel.

## Frontend surface

```
src/features/invoices/
  invoice-contract.ts        zod contracts, labels, money formatting, invoiceStatus()
  invoice-data.ts            RPC loaders (+ the anonymous share loader)
  invoice-actions.ts         Server Actions (parse → authorize → RPC → revalidate)
  invoice-pdf.ts             pdfkit renderer from the shared document model
  invoice-editor-model.ts    editor line model shared by client/server
  components/
    invoice-editor.tsx       draft editor (controlled lines, mobile blocks, presets)
    invoice-command-center.tsx  header/actions, Document, Payments, Client link, Activity
    invoice-document.tsx     the professional document (screen, print, share)
    invoice-list.tsx         register with mobile records
    relationship-invoices.tsx Client 360 / Project "Invoices" tab
    currency-register.tsx    per-currency monetary rows
src/app/admin/(workspace)/finance/            overview, invoices, invoices/export (filtered CSV), new, [id], [id]/edit, [id]/print, [id]/pdf
src/app/i/[token]/                            client share page (+ /pdf)
```

Navigation gains a **FINANCE** group (Finance, Invoices) only now that both
pages are real; no Payments/Contractors/Analytics placeholders exist.

## Verification surface

- `supabase/tests/database/013_c5_finance.sql` — 100 pgTAP assertions.
- `pnpm c5:verify` — `scripts/verify-c5.mjs`: RPC lifecycle + numbering race,
  double-issue race, payment race, token-scoped sharing, audit redaction.
- `pnpm test:e2e:c5` — `tests/e2e/c5-finance.spec.ts`: browser workflow,
  two-session realtime, two-actor draft conflict, void/share/void-state,
  responsive 390/768/1440 + axe, PDF download checks.
- `tests/unit/c5-finance-contracts.test.ts`, `tests/unit/invoice-pdf.test.ts`.

## CSV export

`GET /admin/finance/invoices/export?<register filters>` streams the currently
filtered register as CSV (UTF-8 BOM, RFC 4180 quoting, formula-injection
guard on leading `= + - @`). It walks the same keyset facade as the register
(≤ 20 pages × 25 rows) so authorization is the RPC's — an unauthorized call
yields 403, never a file. Columns are register columns only; no notes, ids,
or internal fields.
