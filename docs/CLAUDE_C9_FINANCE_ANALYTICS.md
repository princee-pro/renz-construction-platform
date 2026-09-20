# C9 FINANCE ANALYTICS

`/admin/analytics/finance` · RPC `admin_analytics_finance(range_from, range_to)`
· permission `analytics.read` + `analytics.finance.read`.

Source of truth: C5 `private.invoice_financials` (issued invoices only,
non-reversed payments). Nothing here is revenue, profit or a bank balance.

## By currency (one row per currency, never combined)

| Field                          | Definition                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `issued_count`                 | invoices issued in the period (`issued_at` in window, lifecycle `issued`)    |
| `invoiced_amount`              | sum of `issued_total` of those invoices                                      |
| `collected_amount`             | non-reversed payments with `payment_date` in the period (any issued invoice) |
| `collected_on_period_invoices` | non-reversed payments (any date) on invoices issued in the period            |
| `collection_rate`              | `collected_on_period_invoices ÷ invoiced_amount` × 100, same currency, null when nothing invoiced |
| `outstanding_amount/count`     | current: issued invoices with `balance_due > 0`                              |
| `overdue_amount/count`         | current: `is_overdue` (due date passed with a balance)                       |
| `paid_count` / `partially_paid_count` / `unpaid_count` | current payment state of issued invoices               |
| `payment_count`                | payments in the period                                                       |
| `aging`                        | current outstanding by bucket: not due (no due date or due ≥ today), 1–30, 31–60, 61–90, 90+ days overdue |
| `payment_trend`                | collected per day/week (`payment_date` is a business date)                   |
| `invoice_trend`                | invoiced per day/week                                                        |

Reversed payments are excluded everywhere; a partial reversal is modelled as
a full reversal by C5 (payments are append-only).

## Contractor finance (Delivery page)

`admin_analytics_delivery.contractors.finance_by_currency`: committed =
`agreed_amount` of non-cancelled assignments, paid = non-reversed contractor
payments, remaining = committed − paid, `paid_in_period` by `payment_date`.
Remaining is **not** called overdue — no contractor payment schedule exists.

## Procurement money (Delivery page)

`value_by_currency`: `ordered_value` = issued PO totals for POs issued in
the period (issued or since closed); `open_ordered_value` = totals of issued
POs with quantity still outstanding. Labelled as commitments, never cash
paid (supplier payments are out of scope, C6).

## Executive comparison

`admin_analytics_overview.headline.invoiced_by_currency` and
`collected_by_currency` are compared with the immediately preceding period
per currency; an increase in collected is favourable, invoiced is neutral.

## Fixtures

`017_c9_intelligence.sql`: RWF (3 issued in June + 1 in July, one partially
paid and overdue 45 days, one unpaid not due, one paid, one reversed payment)
and USD (one paid after the period, one 100 days overdue). Asserts invoiced,
collected, outstanding, overdue, counts, collection rate, aging buckets and
that the two currencies stay separate. CSV export: `report=invoice-aging`.
