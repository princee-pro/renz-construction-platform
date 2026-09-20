# C6 — GOODS RECEIVING

## Model

`public.purchase_order_receipts` (`received_at`, `delivery_reference`,
`note` (private), `received_by`, `reversed_at / reversed_by / reversal_reason`)
with `purchase_order_receipt_items` (`purchase_order_line_item_id`,
`quantity_received > 0`). Items are immutable
(`enforce_po_receipt_items_immutable`); receipts allow only the reversal
transition (`enforce_po_receipt_history`).

`private.po_line_received(line_id)` sums effective (non-reversed) item
quantities per line; `private.purchase_order_financials` and
`private.requirement_quantities` derive the order and requirement states from
it.

## Recording

`record_goods_receipt(target_po_id, target_received_at, items jsonb, target_reference, target_note)`
(`procurement.receipts.write`):

1. Locks the purchase order row (`FOR UPDATE`); refuses anything but
   `issued`.
2. Validates every item: the line belongs to this order, quantity > 0, and
   `quantity ≤ line.quantity − already received` — otherwise `over_receipt`
   with the line and remaining quantity in the message.
3. Inserts the receipt and items, bumps the order version, audits
   `goods_receipt.record` (quantity, number, delivery state — never the
   note), emits `receipt_recorded` (and `operational_project` `updated`).
4. Returns `receipt_id`, `delivery_state`, `remaining_quantity`.

Partial deliveries are the normal case: 40 then 60 bags of 100 → partially
received then received; the requirement follows (partially received →
received).

Race proof: 50 ordered, two concurrent receipts of 40 → exactly one
accepted, the other `over_receipt`.

## Reversal

`reverse_goods_receipt(target_receipt_id, reason)` marks the receipt reversed
(never deletes), recomputes the order and requirement states, audits
`goods_receipt.reverse`, emits `receipt_reversed`. A receipt cannot be
reversed twice.

## Closing and cancelling

- **Cancel** is refused while any effective receipt exists (reverse first or
  close instead).
- **Close** with a reason records that no further delivery is expected;
  outstanding quantity stays visible on the order and the supplier document
  shows CLOSED.

## UI

Purchase order → **Record Delivery** dialog lists open lines with the
outstanding quantity, an “All outstanding” shortcut, per-line inputs capped
client-side (the server still enforces), delivery date, reference and a
private note. The Deliveries tab shows ordered / received / remaining /
delivery state, per-line progress, and the receipt list with reversal. A
delivery recorded in another session updates the header without a reload
(E2E proven).

## Control Room

Delivery overview: open orders, delayed deliveries, expected within 7 days,
open order value by currency, recent deliveries. Action queue:
`po_delayed` (issued, remaining > 0, expected date passed) and
`po_expected_soon` (expected within 7 days).
