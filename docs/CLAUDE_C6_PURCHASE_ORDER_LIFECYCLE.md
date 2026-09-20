# C6 — PURCHASE ORDER LIFECYCLE

## States

`draft → issued → (cancelled | closed)`. Drafts are editable and carry no
number. Issued orders are immutable (facade **and** trigger
`enforce_purchase_order_immutability`); they end either **cancelled**
(nothing delivered, refused once effective receipts exist) or **closed**
(delivery complete or short delivery accepted with an audited reason).
Derived delivery state — `private.purchase_order_financials(id)`:
`subtotal`, `tax_amount`, `total`, `ordered_quantity`, `received_quantity`,
`remaining_quantity`, `delivery_state`
(`not_received | partially_received | received | delayed`), `is_delayed`
(issued, remaining > 0, `expected_delivery_date < today`).

Display status (`purchaseOrderStatus` in `procurement-contract.ts`):
lifecycle first, delivery second — Draft, Cancelled, Closed, Delayed,
Received, Partially received, “Issued · awaiting delivery”.

## Numbering

`RENZ-PO-YYYY-NNNNNN`, assigned atomically at issue from
`purchase_order_number_counters` (`insert … on conflict do update` under the
order's row lock). Proven: two drafts issued concurrently → two distinct
numbers; two actors issuing the same draft → exactly one success (the other
`version_conflict` / `invalid_state`).

## Snapshots

Issue freezes `issued_supplier_snapshot` (display name, company, contact,
email, phone, address), `issued_project_snapshot` (title, id),
`issued_issuer_snapshot` (`private.invoice_issuer_snapshot()`, the C5 issuer)
and `issued_subtotal / tax / total`. `private.purchase_order_document(id)`
builds the document from these snapshots plus received quantities; the HTML
document, the print page, the PDF and the supplier share page all use it.

## Facades (`procurement.orders.*`)

| Facade | Permission | Notes |
| --- | --- | --- |
| `admin_list_purchase_orders(search, supplier, project, lifecycle, delivery, currency, delayed_only, issued_from, issued_to, cursor…)` | `orders.read` | Keyset |
| `admin_get_purchase_order(target_id)` | `orders.read` | Lines with requirement context and received/remaining, financials, receipts, share state, document, activity |
| `create_admin_purchase_order(project, supplier, currency, tax_rate, reference, expected_delivery_date, notes, terms, lines)` | `orders.write` | Lines: description, quantity, unit_label, unit_price, material_requirement_id, material_id, over_order_confirmed |
| `update_admin_purchase_order(target_id, expected_version, …)` | `orders.write` | Draft only (`invalid_state` otherwise) |
| `issue_admin_purchase_order(target_id, expected_version, issue_date, expected_delivery_date)` | `orders.issue` | ≥ 1 line; assigns number; freezes snapshots |
| `cancel_admin_purchase_order(target_id, expected_version, reason)` | `orders.issue` | Refused with effective receipts |
| `close_admin_purchase_order(target_id, expected_version, reason)` | `orders.issue` | Records short delivery / completion |
| `duplicate_admin_purchase_order(target_id)` | `orders.write` | New draft; lines copied **without** requirement links |
| `create_purchase_order_share_link(target_id)` / `revoke_purchase_order_share_link(target_id)` | `orders.write` | Issued/cancelled/closed only; raw token returned once |

Line rules (`private.replace_purchase_order_lines`): ≤ 100 lines; quantity
> 0; price ≥ 0; unit required; a linked requirement must exist, belong to the
same project (`invalid_relationship`) and be approved (`invalid_state`);
ordering more than the requirement's remaining-to-order is refused
(`over_order`) unless `over_order_confirmed` is true — the editor shows the
warning and a confirmation checkbox per line and disables Save until every
over-order is confirmed.

## Editor and command center

`/admin/procurement/orders/new` (project-first `?project=` `&requirement=`, or
supplier-first `?supplier=` with a project picker that loads approved
requirements), `/[orderId]/edit` (draft only). Editor: project + supplier,
currency / tax / expected delivery / reference, “Add from material
requirement” select + free-text lines with an optional catalog link, live
totals preview (server recomputes), terms and notes.

`/admin/procurement/orders/[orderId]`: header (number, supplier, project,
status, total, received/ordered, expected), actions (Copy number, Edit,
Preview / View-Print, Download PDF, Issue, Record Delivery, Duplicate, Close,
Cancel), tabs Document / Deliveries / Material requirements / Supplier link /
Activity. Subscribes to `purchase_order` realtime pointers.

## Supplier share link

`/po/[token]` (+ `/pdf`) — `public_purchase_order_by_share_token(raw_token)`
resolves a SHA-256 hash; only the hash is stored; raw token returned once
to staff and never logged. Revoked, draft or unknown tokens are a uniform
404. The document carries supplier, project title, lines, totals, terms,
notes and received quantities — never internal notes, requirement links,
versions or actor names. The page has print, PDF, WhatsApp and email
contacts and no admin chrome.

## Audit

`purchase_order.create/update/issue/cancel/close/share_create/share_revoke`,
`goods_receipt.record/reverse`; milestones also written to the project and
supplier entity types. Metadata carries number, currency and totals — never
the token, notes or addresses.
