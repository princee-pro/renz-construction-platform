# C6 — CONTRACTOR ASSIGNMENTS

## Model

`public.contractor_assignments` — many-to-many between `operational_projects`
and `trade_partners` (contractor capability), with:

- `scope`, `specialization`, `status` (`planned | active | on_hold | completed | cancelled`),
  `start_date`, `end_date`;
- `rate_type` (`fixed_project | hourly | daily | monthly`), `rate_amount`,
  `currency` (required once any money is set), `planned_units`;
- `agreed_amount` — **the financial obligation**. Rate × planned units is a
  suggestion shown in the editor (`suggestedPlannedValue`), never stored as
  the obligation;
- `payment_terms`, `performance_rating` (1–5, only when `completed`),
  `performance_note`, `version`, `archived_at`.

Constraints: currency required when a rate or agreed amount is set; rating
only on completed assignments; `enforce_assignment_finance_identity`
trigger — once effective payments exist the currency is frozen and the agreed
amount cannot drop below the paid total.

## Facades

| Facade | Permission |
| --- | --- |
| `admin_get_contractor_assignment(target_id)` | `partners.read` |
| `admin_project_contractors(target_project_id)` → assignments, `summary_by_currency` (committed / paid / remaining), `active_count` | `partners.read` |
| `create_contractor_assignment(target_project_id, target_partner_id, target_scope, …)` | `contractors.assign` |
| `update_contractor_assignment(target_id, expected_version, …)` — `finance_locked` after payments if currency/agreed amount change | `contractors.assign` |
| `change_contractor_assignment_status(target_id, expected_version, next_status)` — cancelled is terminal; cancelling with effective payments refused | `contractors.assign` |
| `adjust_contractor_assignment_amount(target_id, expected_version, new_amount, reason)` — audited, history row in `contractor_assignment_adjustments`, cannot go below paid | `contractors.assign` |
| `rate_contractor_assignment(target_id, expected_version, rating, note)` — completed only, 1–5 | `contractors.assign` |

## Entry points

- Project → Contractors tab → **Assign Contractor**
  (`/admin/operations/assignments/new?project=…`): project locked, contractor
  picked.
- Contractor 360 → **Assign to project**
  (`/admin/operations/assignments/new?partner=…`): contractor locked, project
  picked (`searchActiveProjectsAction`).
- The database re-checks both sides (active project, contractor capability).

## Assignment command view

`/admin/operations/assignments/[id]`: header (contractor, project, status,
agreed / remaining), actions (Edit, Record Payment, Adjust Agreed Amount,
Change Status, Rate Performance), tabs Overview (scope/schedule + finance
metrics + adjustment history), Payments (append-only list with reversal),
Performance, Activity. The page subscribes to `contractor_assignment` realtime
pointers; a payment recorded in another session updates the header without a
reload (E2E proven).

## Concurrency

Edits carry `expected_version`; a stale save returns `version_conflict` with
`current_version`, the editor keeps the typed values and offers **Reload
latest**. Quick commands always target the newest version the page knows.

## Action queue rules (deterministic)

`assignment_ending_soon` — active with `end_date` within 14 days;
`assignment_unrated` — completed without a rating;
`assignment_balance_remaining` — completed with remaining > 0 (informational).
