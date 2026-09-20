# C9 ANALYTICS ARCHITECTURE

One intelligence layer over the C4–C8 operational data. No second data
model, no nightly warehouse, no fabricated business intelligence.

## Principles

- **Real data only.** Every figure is an aggregate of existing rows: leads
  and their C8 timestamps/stage history, operational projects and their C4
  status/phase history, C5 invoices + payments through the canonical
  `private.invoice_financials`, C6 assignments/payments/purchase orders/
  receipts through `private.assignment_financials` and
  `private.purchase_order_financials`, and the C9 website daily counters.
- **Terminology is honest.** Invoiced / Collected / Outstanding / Overdue /
  Committed / Paid / Remaining / Ordered value / Budget / Page views. Never
  revenue, profit, margin, ROI, forecast, lifetime value, lead score.
- **Currencies are never summed.** Every monetary aggregate is grouped by
  currency (`by_currency`, `budget_by_currency`, `finance_by_currency`,
  `value_by_currency`, `invoiced_by_currency`). There is no "total business
  value".
- **Control Room vs Analytics.** The Control Room (`/admin`) still answers
  "what needs attention now" (C4–C8 action queues, now plus a notification
  attention summary). The Analytics Center (`/admin/analytics`) answers
  "what is happening over time".

## Where the formulas live

All aggregation is in the database (migration
`supabase/migrations/20260916100000_establish_c9_intelligence.sql`):

| Function                              | Domain                                  | Permission                                     |
| ------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| `private.analytics_window(from, to)`  | validated window + trend bucket         | —                                              |
| `private.analytics_leads`             | funnel, response, outcome, trend        | `analytics.read` + `leads.read`                |
| `private.analytics_projects`          | status/phase/priority, schedule, budget | `analytics.read` + `operations.projects.read`  |
| `private.analytics_finance`           | by currency, aging, payment trend       | `analytics.read` + `analytics.finance.read`    |
| `private.analytics_contractors`       | assignments, commitments, performance   | `analytics.read` + `partners.read`             |
| `private.analytics_procurement`       | POs, receiving, materials               | `analytics.read` + `procurement.orders.read`   |
| `private.analytics_website`           | first-party daily counters              | `analytics.read` + `analytics.website.read`    |
| `private.analytics_headline`          | compact numbers for period comparison   | —                                              |
| `public.admin_analytics_overview`     | one call, every permitted domain        | `analytics.read` (domains pruned per permission)|
| `public.admin_analytics_{leads,projects,finance,delivery,website}` | one page each | as above |

React never downloads raw rows: each page issues exactly one RPC and renders
presentation-ready JSON validated by zod
(`src/features/analytics/analytics-contract.ts`). Formulas are not
duplicated in TypeScript.

## Permission scoping

`admin_analytics_overview` omits the `finance` / `website` / … keys (and the
matching headline keys) for actors lacking the domain permission — the
server response never carries what the actor may not read. Pages redirect
through `requireAnalytics()` (AAL2 + active profile + `analytics.read` + the
domain permission); the RPC re-checks the same permissions.

New permissions: `analytics.read`, `analytics.finance.read`,
`analytics.website.read` (admin + super_admin), `notifications.read` (admin +
super_admin), `notifications.manage` (super_admin only).

## Date range and timezone

See `CLAUDE_C9_LEAD_ANALYTICS.md` for the window semantics. In short: the
range is inclusive business-timezone calendar days (`business_profile.timezone`,
seeded `Africa/Kigali`), validated server-side (inverted, future or > 2 year
ranges are rejected), persisted in the URL (`?range=7d|30d|90d|ytd|custom&from&to`),
and trended by day (≤ 31 days) or ISO week.

## Charts

No chart library was added (`package.json` has none and none was needed for
bars, a funnel and a two-series trend). `src/features/analytics/components/charts.tsx`
renders CSS bars, a CSS funnel and an inline SVG trend (bars + one line, two
series max). Every figure carries a text `figcaption` summary and a
`<details>` data table; colour never encodes state alone (labels and
numbers are always visible; attention is a word, not just a colour). The
two series colours (`#c08a2e`, `#1873a8`) passed the dataviz palette
validator (lightness band, chroma floor, CVD separation, contrast).

## Optional capabilities shipped

- CSV export of aggregate tables only (`/admin/analytics/export?report=lead-funnel|invoice-aging|project-status`).
- Print executive summary (print CSS on the overview; the `Print` button).
- Period comparison against the immediately preceding period with
  domain-aware meaning (more lost leads or more overdue is attention, not
  green).
- Project phase aging, service-interest ranking (page views beside real
  enquiries, never equated), lead response-time target indicator.

## Performance

Each page = one RPC. Supporting indexes added for the date ranges and stage
history (`leads_first_contact_idx`, `leads_won_at_idx`, `leads_lost_at_idx`,
`lead_stage_history_to_status_idx`, `invoices_issued_at_idx`,
`invoice_payments_date_idx`, `contractor_payments_date_idx`,
`contractor_assignments_completed_idx`, `purchase_orders_issued_at_idx`,
`po_receipts_received_idx`, `operational_projects_created_idx`,
`operational_project_status_history_completed_idx`,
`operational_project_phase_history_created_idx`, `website_analytics_daily_type_day_idx`).
The per-invoice / per-PO financial helpers are called laterally, exactly as
the C5/C6 overviews do; at the current scale (hundreds of documents) the
aggregate RPCs return in well under 100 ms locally. No snapshot tables were
created — measure before optimizing (C10 has a performance budget item).

## Contractor `completed_at`

`contractor_assignments.completed_at` was added (stamped by trigger when the
status becomes `completed`, cleared when it leaves it). Existing completed
rows were backfilled from `updated_at` — the best evidence available; the
"completed in period" figure for pre-C9 rows is therefore approximate.
