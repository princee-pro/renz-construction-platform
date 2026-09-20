# C9 LEAD ANALYTICS

`/admin/analytics/leads` · RPC `admin_analytics_leads(range_from, range_to)`.

## Window and timezone

- The range is inclusive business-timezone calendar days. `private.analytics_window`
  converts `range_from` / `range_to` to half-open instants
  (`from::timestamp at time zone tz`, `(to + 1)::timestamp at time zone tz`)
  so a lead submitted at 22:30 UTC on 31 May (00:30 on 1 June in Kigali)
  counts on 1 June.
- Validation (server): `to >= from`, `to <= today + 1`, span ≤ 731 days.
- Trend buckets: local day for ranges ≤ 31 days, ISO week otherwise
  (`date_trunc('week')` on the local wall-clock time).

## C8 contact-log time semantics (fixed)

C8 accepted the browser's `datetime-local` string and converted it with the
server's own clock (`new Date(value).toISOString()`). C9:

- The contract keeps the wall-clock string (`YYYY-MM-DDTHH:mm`).
- `logLeadContactAction` converts it with the configured business timezone
  (`localDateTimeToInstant(local, timeZone)` in `src/lib/time/business-time.ts`,
  timezone from `admin_business_timezone()`), rejects future instants, and
  sends a canonical ISO instant to `log_lead_contact` (already `timestamptz`).
- Display: every Lead 360 instant renders in the business timezone
  (`formatLeadDateTime(value, timeZone)`); the "When" field says which zone
  it expects. Historical UTC values are not reinterpreted — an instant is an
  instant; only its rendering changed from UTC to the business zone.
- Regression tests: `tests/unit/business-time.test.ts`.

## Counts

| Key                       | Meaning                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `new_leads`               | leads submitted in the period (non-archived)                        |
| `open_leads`              | current: status not won/lost                                        |
| `unassigned_leads`        | current: open and unassigned                                        |
| `awaiting_first_contact`  | current: status `new` with no `first_contact_at`                    |
| `status_counts`           | current stage of the leads submitted in the period                  |
| `type_counts`, `source_counts` | period distribution by `lead_type` / `source_channel`          |

## Funnel

For leads submitted in the period: Submitted → Contacted (`first_contact_at`)
→ Qualified (`qualified_at`) → Site visit (`site_visit_at`) → Proposal
(reached `proposal` in `lead_stage_history`, or is in proposal/won) → Won
(`won_at`). Percentages use **Submitted** as the denominator and the page
says so; Site visit and Proposal are optional stages.

## Response time

- `median_hours` / `average_hours`: `first_contact_at − submitted_at` for
  period leads that were contacted (median is the primary metric).
- `awaiting_first_contact`: period leads still uncontacted (shown separately,
  never folded into the duration).
- `target_hours` / `within_target_count`: the C8 `lead_uncontacted_hours`
  operational threshold and how many contacted leads met it.
- `qualification.median_hours`: `qualified_at − submitted_at`.

## Won / Lost

Closed in the period by `won_at` / `lost_at`. `win_rate = won / (won + lost)`
— open leads are never in the denominator; null when nothing closed.
`won_median_days` / `lost_median_days` = time from submission to outcome.
`lost_reasons` aggregates the controlled `lost_reason` codes only (private
notes are never exposed).

## Service interest

`service_interest` = enquiries / qualified / won per `service_key`
(real leads, not page views). The Website page cross-references service
page views with the same service keys and labels them separately.

## Test fixtures

`supabase/tests/database/017_c9_intelligence.sql` seeds 10 submitted (one on
the local-midnight edge), 8 contacted (1,2,3,4,5,6,30,50 h → median 4.5 h,
6 within the 24 h target), 6 qualified, 2 site visits, 4 proposals, 3 won,
1 lost (budget) in June 2026 plus one July lead, and asserts every figure.
