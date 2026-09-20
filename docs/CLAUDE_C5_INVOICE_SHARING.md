# C5 SECURE CLIENT INVOICE SHARING

Clients never log in. An issued invoice can be shared through a revocable,
unguessable link; possession of that link grants read access to **that one
invoice document** and nothing else.

## Token model

`invoice_share_links (id, invoice_id, token_hash, created_at, created_by,
revoked_at, revoked_by)` — default-deny RLS, no facade reads it directly,
`authenticated` cannot select it.

- `create_invoice_share_link(invoice_id)` (`finance.invoices.write`, issued
  invoices only): revokes any active link, generates 36 random bytes
  (`extensions.gen_random_bytes`), base64url-encodes them (≈48 chars, 288
  bits of entropy), stores **only** `sha256(token)` (hex), audits
  `invoice.share_create`, and returns the raw token **once** in the RPC
  result. The Server Action hands it to the page through the one-shot
  `detail` slot of `AdminActionState`; nothing server-side retains it.
- One active link per invoice (`invoice_share_links_one_active_idx`);
  "Regenerate" is create-with-revoke.
- `revoke_invoice_share_link(invoice_id)` sets `revoked_at/by`, audits
  `invoice.share_revoke`, and the link stops resolving immediately.
- Audit metadata never contains the token (asserted in `verify-c5.mjs`).

## Public route

`/i/[token]` (page) and `/i/[token]/pdf` (PDF) — outside the admin layout,
no admin chrome, no staff controls, `robots: noindex, nofollow`, the site
`robots.txt` already disallows everything, and neither route is in any
sitemap. The URL carries the token only — never an invoice UUID.

Resolution goes through exactly one boundary:
`public_invoice_by_share_token(raw_token)` (the only finance facade granted
to `anon`). It rejects anything not matching `^[A-Za-z0-9_-]{40,64}$` before
touching the table, hashes the token, requires an unrevoked link whose
invoice is `issued` or `void`, and returns `private.invoice_document(...)`
— the same model the admin print view and PDF use. Every miss (unknown,
malformed, revoked, draft) is `null` → the page 404s and the PDF route
returns 404, identically, so nothing is enumerable.

## What the shared document contains — and never contains

Contains: issuer snapshot (name, email, WhatsApp, tax label), invoice number,
dates, reference, billing snapshot, project title, line items, subtotal /
tax / total / paid / balance, payment state, non-reversed payments as
(date, amount, method), payment terms and notes written for the client.

Never contains: internal payment notes, who recorded anything, staff
identities, audit rows, Client CRM notes, operational project data (status,
budget, private notes), other invoices, versions, or ids of other records.
`verify-c5.mjs` asserts the serialized document carries none of `note`,
`recorded_by`, `created_by`, `audit`, `version`.

## Void and revoked behaviour (the chosen, safer UX)

- **Revoked link** → 404. The client sees nothing.
- **Voided invoice with a live link** → the page still resolves and renders
  the document with an unmistakable **VOID** banner and a zero balance due,
  so a client who already received the link learns the document was
  cancelled rather than hitting a dead page (a dead link would look like an
  outage and invite them to pay the old figure). Staff can still revoke to
  end access entirely; a void invoice cannot receive a *new* link.

## Sharing from the Command Center

Client link tab: Generate Client Link / Regenerate Link / Revoke Link, the
URL shown once with **Copy Link** and **Open link**, plus:

- **Email Invoice** — `mailto:` to the client's stored email, prefilled with
  invoice number, amount, due date and the link. Shown only when the client
  has an email. The application sends nothing itself and says so.
- **Share on WhatsApp** — `https://wa.me/<digits>?text=…` using the
  *client's* stored phone (normalized to 10–15 digits; offered only when it
  normalizes). This is distinct from RENZ's own public WhatsApp number
  (`+44 7412 853143`), which appears on the shared page as "Message RENZ on
  WhatsApp" — text only, never a `tel:` link.

## Client page accessibility

Server-rendered semantic markup: one `h1` (the number), a real `<table>`
with headers for the lines (transformed to labelled cards below 40rem via
`data-label`), definition lists for parties/dates/totals, a `role="status"`
VOID banner. Core content needs no JavaScript; only the Print button does.
Print CSS strips toolbars. Verified with axe (serious/critical = 0) and at
390/768/1440 with no horizontal overflow.
