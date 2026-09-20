# C9 NOTIFICATION RULES

Two sources: **event-driven** AFTER triggers on the real domain tables (no
facade body duplicated; `auth.uid()` is the acting staff member and is never
notified about their own action) and **one idempotent timed sweep**
(`private.generate_due_notifications()`).

Recipients are resolved by permission (`private.permission_holders(key)`)
or are the assignee / super administrators. Every rule respects the
recipient's in-app preference except the mandatory `security` and `system`
categories. `private.notify` inserts with `on conflict (recipient, dedupe_key)
do nothing`, so a repeated event or a repeated sweep never duplicates.

## Event-driven

| Trigger                                            | Recipients                              | Category / severity   | Title                             | Dedupe key                            |
| -------------------------------------------------- | --------------------------------------- | --------------------- | --------------------------------- | ------------------------------------- |
| public lead inserted (website sources)             | `leads.write` holders                   | leads / attention     | New {type} enquiry received       | `lead:<id>:submitted`                 |
| lead `assigned_to` set to someone else             | the assignee                            | leads / attention     | Lead assigned to you              | `lead:<id>:assigned:<version>`        |
| lead status changed by someone other than assignee | the assignee                            | leads / info          | Lead moved to {stage}             | `lead:<id>:stage:<version>`           |
| lead won                                           | `leads.write` holders (excl. actor)     | leads / info          | Lead won                          | `lead:<id>:won:<version>`             |
| invoice payment recorded                           | `finance.invoices.read` (excl. actor)   | finance / info        | Payment recorded                  | `invoice:<id>:payment:<payment id>`   |
| invoice becomes fully paid                         | `finance.invoices.read` (excl. actor)   | finance / info        | Invoice paid in full              | `invoice:<id>:paid:<payment id>`      |
| payment reversed                                   | `finance.invoices.read` (excl. actor)   | finance / attention   | Payment reversed                  | `invoice:<id>:reversal:<payment id>`  |
| purchase order issued                              | `procurement.orders.read` (excl. actor) | procurement / info    | Purchase order issued             | `po:<id>:issued`                      |
| goods receipt recorded                             | `procurement.orders.read` (excl. actor) | procurement / info    | Goods receipt recorded            | `po:<id>:receipt:<receipt id>`        |
| operational project status changed                 | `operations.projects.read` (excl. actor)| projects / info       | Project {status}                  | `project:<id>:status:<version>`       |
| contractor assignment completed / cancelled        | `partners.read` (excl. actor)           | contractors / info    | Contractor assignment {status}    | `assignment:<id>:<status>:<version>`  |
| public configuration snapshot published            | `settings.website.read` (excl. actor)   | website / info        | Public configuration published    | `settings:snapshot:<snapshot id>`     |
| site mode changed                                  | `settings.website.read` (excl. actor)   | system / attention    | Site mode changed to {mode}       | `settings:site_mode:<mode>:<version>` |
| staff account status changed                       | super admins (excl. actor)              | security / attention  | Staff account {status}            | `security:status:<profile>:<version>` |
| staff role granted / removed                       | super admins (excl. actor)              | security / attention  | Staff role changed                | `security:role:<profile>:<minute>`    |

Deliberately **not** notified (no flood): field edits, notes, phase or
priority changes, drafts, share links, material catalogue edits.

## Timed (sweep)

Thresholds come from C7 operational settings and C8 intake settings; no
duplicate settings were created.

| Condition                                            | Recipients                                   | Severity                         | Dedupe key                                      |
| ---------------------------------------------------- | -------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| invoice overdue (balance > 0, due date passed)       | `finance.invoices.read`                      | attention; urgent beyond 30 days | `invoice:<id>:overdue:<ISO week>` (weekly)      |
| invoice due within `invoice_due_soon_days`           | `finance.invoices.read`                      | info                             | `invoice:<id>:due_soon:<due date>` (once)       |
| project ending within `project_ending_soon_days`     | `operations.projects.read`                   | info                             | `project:<id>:ending_soon:<end date>` (once)    |
| project behind planned end date                      | `operations.projects.read`                   | attention                        | `project:<id>:behind:<ISO week>` (weekly)       |
| PO delayed (expected date passed, quantity open)     | `procurement.orders.read`                    | attention                        | `po:<id>:delayed:<ISO week>` (weekly)           |
| PO expected within `po_expected_soon_days`           | `procurement.orders.read`                    | info                             | `po:<id>:expected_soon:<date>` (once)           |
| approved material required within `material_required_soon_days` | `procurement.orders.read`        | info                             | `requirement:<id>:due_soon:<required_by>` (once)|
| active assignment ending within `assignment_ending_soon_days` | `partners.read`                     | info                             | `assignment:<id>:ending_soon:<end date>` (once) |
| lead uncontacted beyond `lead_uncontacted_hours`     | assignee, else `leads.write` holders         | attention                        | `lead:<id>:uncontacted:<day>` (daily)           |
| proposal stale beyond `proposal_stale_days`          | assignee, else `leads.write` holders         | attention                        | `lead:<id>:proposal_stale:<ISO week>` (weekly)  |

Running the sweep twice in the same bucket produces zero new rows (pgTAP
and `verify-c9.mjs` run it twice; the E2E runs it twice from Settings).

## Audit

Only meaningful changes are audited: `notification.preference_update`,
`notification.mark_all_read`, `notification.sweep_run`,
`analytics.settings_update`, plus the existing `website_settings.update`.
Reading or marking a single notification is not audited.
