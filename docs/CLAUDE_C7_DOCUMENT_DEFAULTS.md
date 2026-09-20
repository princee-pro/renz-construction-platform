# C7 — DOCUMENT DEFAULTS

`/admin/settings/system` (`settings.system.read` to view,
`settings.system.write` — Super Admin — to change). Two domains: document
defaults and operational thresholds. The page also lists environment
presence (names and Configured / Not configured only) and the read-only
numbering formats.

## Document defaults

`document_defaults` (singleton): `default_currency`, `allowed_currencies`
(1–12 ISO codes, must include the default), `invoice_tax_label` (default
"Tax"), `invoice_tax_rate`, `invoice_payment_terms`, `invoice_due_days`,
`po_tax_label`, `po_tax_rate`, `po_terms`, `po_expected_delivery_days`.

They are **form defaults for future documents only**. `admin_document_defaults()`
is read by the invoice editor (`/admin/finance/invoices/new`) and the
purchase-order editor (`/admin/procurement/orders/new`) to prefill the
currency, tax label/rate, terms and due / expected dates. The tax label is
"Tax" unless the owner configures a specific one; no VAT registration claim
is seeded. The default currency is only a default: money is never summed
across currencies, and every position stays grouped by currency.

## Frozen documents stay frozen

Issuing an invoice or purchase order copies the values into the document
and its snapshot. Changing a default afterwards touches nothing that was
issued: `scripts/verify-c7.mjs` issues an invoice and a PO, changes every
default and the business identity, publishes, and asserts the stored
snapshots and totals are byte-identical. The issuer block for **new**
documents comes from `private.invoice_issuer_snapshot()`, which now reads
the published configuration (display name, email, WhatsApp, published
address) with the authorized defaults as fallback.

## Numbering

`RENZ-YYYY-NNNNNN` (invoices) and `RENZ-PO-YYYY-NNNNNN` (purchase orders)
are shown read-only in the System page. They are not configurable; the
counters and formats are owned by the C5/C6 migrations.

## Operational thresholds

`operational_settings` (singleton, all bounded integers):
`project_ending_soon_days`, `invoice_due_soon_days`,
`stale_draft_invoice_days`, `assignment_ending_soon_days`,
`material_required_soon_days`, `po_expected_soon_days`.

`private.operational_setting(key)` is the single reader. The C4/C5/C6
overview and action-queue functions (`admin_operations_overview`,
`admin_action_queue`, `admin_finance_overview`,
`admin_finance_action_queue`, `admin_project_procurement`,
`admin_delivery_overview`, `admin_delivery_action_queue`) were re-created
in `20260914110000_c7_settings_effects.sql` to call it, so the Control Room
and the Postgres queues agree. The React components display the thresholds
they receive from those RPCs rather than their own constants; `verify-c7`
changes a threshold and asserts the queue moves with it.

## Versioning and audit

Both singletons use `expected_version`; a conflict keeps edits and shows
Reload latest. Audit actions: `document_defaults.update`,
`operational_settings.update` with changed column names.
