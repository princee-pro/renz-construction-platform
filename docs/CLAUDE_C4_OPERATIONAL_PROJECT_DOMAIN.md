# C4 OPERATIONAL PROJECT DOMAIN

## Table: `public.operational_projects`

`id, client_id, title, description, status, current_phase, priority,
start_date, end_date, budget_amount, budget_currency, public_case_study_id,
version, created_at, updated_at, created_by, updated_by, archived_at`.

`client_id` is `references public.clients(id) on delete restrict` — an
operational project can never outlive an orphaned reference to a client that
no longer exists (clients are archived, never hard-deleted, so this should
never actually fire in practice, but the constraint is the backstop).

### Status vs. Phase vs. Priority — three independent axes

- **Status** — `planning | in_progress | on_hold | completed`. The
  business-lifecycle state of the whole engagement.
- **Phase** — `design | planning | procurement | structural | execution |
  finishing | completed`. Where the actual construction work is, right now.
  **Phase != Status**: a project can be Status "In Progress" and Phase
  "Structural" simultaneously — those are two different questions ("is this
  project active" vs. "what part of the build is happening").
- **Priority** — `low | medium | high`. Affects sorting, filtering, and the
  action queue's "high priority active" rule only. It **does not grant any
  permission or bypass any check** — a high-priority project is not
  authorized differently from a low-priority one.
- **Archive is neither of these.** `archived_at` is record *lifecycle*
  (is this record still part of ordinary daily operation), completely
  separate from business *status* (what stage the engagement is in). A
  `completed` project is not automatically archived, and an `archived`
  project's last known status/phase is preserved, not reset.

### Dates and budget

- `start_date`/`end_date` are both nullable; if both are present,
  `end_date >= start_date` is enforced by
  `operational_projects_dates_check`. Dates are never invented — if the
  business doesn't know a date yet, the field stays null.
- `budget_amount` is `numeric(14,2)` (never a float) with `budget_currency`
  (a 3-letter uppercase code, e.g. `RWF`/`USD`/`GBP`).
  `operational_projects_budget_currency_pair_check` enforces that amount and
  currency are both present or both absent — a currency is meaningless
  without an amount, and vice versa. **Currency is never defaulted or
  fabricated**; if the form omits it, the amount is rejected, not silently
  assigned a currency the business never chose.

### The absolute finance rule

**Different currencies are never summed.** `admin_operations_overview`'s
`budget_by_currency` is a `group by budget_currency` aggregate — an array of
`{currency, total}` pairs, never a single cross-currency number. The
dashboard (`/admin`) renders this as a small per-currency list
(`.currency-register`), and `formatBudget()` in every list/detail component
formats one project's budget as `"RWF 1,000"` — a currency-tagged string,
never a bare number that invites later arithmetic. **Any future C5 Finance
work must inherit this rule** — summing RWF + USD + GBP into one "total
revenue" figure is a real, not hypothetical, mistake to guard against.

## Status/phase history

`operational_project_status_history` and `operational_project_phase_history`
each have a **`bigint generated always as identity` primary key**, not a
`uuid default gen_random_uuid()`. This was a deliberate, tested choice: inside
one transaction, PostgreSQL's `now()` returns the *same* value for every
statement, so a single RPC call that inserts two history rows (e.g.
`create_admin_operational_project` inserting both the "created" row and,
later in the same call, a transition row) cannot be ordered reliably by
`created_at` alone. Ordering by the identity `id` instead is correct
regardless of how many rows one transaction produces. `admin_get_operational_project`
returns up to 30 of each, most-recent first.

A second, related bug this phase found and fixed: several of the JSON
aggregation queries (client's projects/notes lists, project's notes/history
lists) originally wrote `(select * from tbl limit N)` **before** applying
`order by` inside the `jsonb_agg(...)` — which applies `limit` to an
arbitrary unordered scan and only sorts the arbitrary subset afterward,
silently returning "some N rows, then sorted" instead of "the N most recent
rows." Fixed by moving the `order by ... limit N` into the inner subquery
before the join, matching the pattern the pre-existing `audit_logs` activity
subqueries already used correctly.

## Project notes and activity

`operational_project_notes` mirrors `client_notes` exactly. The Activity tab
on both Client 360 and Project Command Center reads `audit_logs` through a
permission-gated RPC (`admin_recent_activity` for the dashboard,
per-record activity subqueries for the detail pages) — bounded, chronological,
and **never** including the raw note/description/contact content in the
displayed description (the audit row itself never stored it).

## Admin surface

- `/admin/operations/projects` — register. Columns: Project (title + end
  date/archived/case-study-linked subtext) / Client / Status / Phase /
  Priority / Budget / Action. Filters: search, status, phase, priority, case
  study linked/unlinked, active/archived/all scope. Keyset-paginated.
- `/admin/operations/projects/new` — Client (via `ClientPickerField`,
  mandatory), Title, Description, Status, Phase, Priority, Start/End Date,
  Budget Amount + Currency. Reachable pre-filled from Client 360's
  "Create Project" action (`?client=<id>`).
- `/admin/operations/projects/[projectId]` — Project Command Center
  (`src/features/operational-projects/components/project-command-center.tsx`).
  Header shows Client/Status/Phase/Priority/dates/budget/case-study state.
  Tabs: Overview, Status & Phase (change-status/phase/priority forms +
  history), Notes, Public Case Study (see
  `CLAUDE_C4_CASE_STUDY_BRIDGE.md`), Activity. **No
  Invoices/Contractors/Payments/Documents tab** — not implemented, not
  stubbed.

## RPCs (all `security definer`, `set search_path = ''`, `authenticated`-only)

Read: `admin_operations_overview`, `admin_action_queue`,
`admin_recent_activity`, `admin_list_operational_projects`,
`admin_get_operational_project`.

Write: `create_admin_operational_project`, `update_admin_operational_project`,
`change_operational_project_status`, `change_operational_project_phase`,
`change_operational_project_priority`, `archive_admin_operational_project`,
`create_operational_project_note`.

All gate on `operations.projects.write` (writes) or
`operations.projects.read` (reads). `create_admin_operational_project`
additionally rejects an archived `client_id` with `{code:"invalid_state"}` —
new work cannot be attached to a closed-out client.

## Action queue rules (deterministic, no AI scoring)

`admin_action_queue` is a `union all` of five plain SQL predicates:
high-priority active project, ending within `ending_soon_window_days` (a
named constant, currently 14, not a magic number buried in the UI),
past its planned end date, completed without a linked case study, and a
linked case study still in draft. Every rule is a readable `where` clause —
none of them are an opaque model output.
