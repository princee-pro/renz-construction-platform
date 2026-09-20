# C8 — LEAD PIPELINE

`/admin/operations/leads` (`leads.read`) and Lead 360 at
`/admin/operations/leads/[leadId]`.

## Vocabulary

- **Types**: General, Project, Service, Material Enquiry.
- **Sources**: website_contact, start_a_project, service_page,
  material_enquiry (public forms set these) · whatsapp, manual, referral,
  other (staff-created leads only; the public facade refuses them).
- **Stages**: New → Contacted → Qualified → Site Visit → Proposal → Won |
  Lost. Meaning: New = not yet handled; Contacted = first contact made;
  Qualified = worth progressing; Site Visit = visit stage reached; Proposal
  = quotation stage; Won = converted / accepted; Lost = not proceeding.
- **Lost reasons** (required for Lost): not_ready, budget, timeline,
  not_a_fit, unreachable, chose_another_provider, duplicate, other. A
  private note may accompany the change.
- **Priority**: optional low / medium / high, set by staff only.

Stages never move from unrelated changes. Logging a contact records
`first_contact_at` but leaves the stage alone; the contact form offers an
explicit "Also move the stage to Contacted" checkbox. "Won" is refused
until a client is linked (and, for project leads, an operational project
exists), so a won lead always points at real records.

## Register

Desktop columns: reference / name, type, context (service or summary),
status, assigned, submitted (+ age indicator), last activity, Open. Filters:
search (reference, name, company, summary, exact email / phone), type,
status, service, assigned (me / unassigned), source, submitted date range,
active / archived / all. Quick filters: All open, My leads, Unassigned,
New; stage counts; Table / Pipeline toggle. Keyset pagination
(`submitted_at, id`), 25 per page.

The **Pipeline** view is the same data in seven stage columns with plain
links (no drag; the register stays mandatory). At 390px the register
becomes stacked cards showing reference, name, type, status, submitted,
assigned and Open.

## Lead 360

Header: reference, name, type, stage badge, source, submitted, assignee,
priority. Quick actions: copy reference, email, copy email / phone,
WhatsApp (`wa.me` from the **visitor's** number), Call (`tel:` to the
visitor — the WhatsApp-only rule applies to RENZ's own number, not to lead
phone values), Assign to me, Edit, Archive.

Sections:

- **Overview** — identity, service, location, assignee, stage timestamps,
  privacy acknowledgement (revision + time), message.
- **Requirements** — project details, service details or the material
  items table (visitor-stated, no prices).
- **Attachments** — quarantine state per file, Preview (images) /
  Download (PDF always as attachment), Mark safe / Reject with reason.
- **Contact** — submitted contact details, "Log contact" (type, time, short
  private note, optional stage move), contact history.
- **Notes** — private dated notes; never public, never copied to the client.
- **Activity** — bounded timeline from stage history, events and contact
  logs (actor, time, reason).
- **Conversion** — see `CLAUDE_C8_CONVERSION.md`.

Assignment: any active staff profile (`admin_lead_assignees`) or
unassigned; "Assign to me" is one click. Both are audited (`lead.assign`).

## Duplicate awareness

`private.lead_possible_matches` compares the lead's normalized email and
phone against other active leads and all clients. Lead 360 shows a
"Possible match" banner with links; nothing is merged automatically. The
conversion panel offers only these matches for "Link an existing client".

## Concurrency and realtime

All mutations carry `expected_version`; a stale save returns
`version_conflict` and the UI keeps the typed values (C4 pinned-edit rule:
an open edit form shows the outdated cue when another staff member saves,
and Reload latest re-pins). Every write emits a `lead` pointer; the
register, Lead 360 and the Control Room refresh through
`useAdminRealtimeInvalidation`.

## Control Room and queue

`admin_leads_overview()` gives exact counts (by stage, by type, unassigned,
new today, my open, won / lost in 30 days) and recent submissions.
`admin_lead_action_queue()` is deterministic: new & unassigned, new & not
contacted beyond `lead_uncontacted_hours`, qualified without client,
project lead qualified without project, proposal stale beyond
`proposal_stale_days`. Thresholds live in `intake_settings`
(`private.intake_setting(key)`) so Postgres and React agree. No scoring,
no conversion rates (C9).

## Archive vs Lost

Lost is a sales outcome (stage + reason). Archive is a record-lifecycle
action (`archived_at`): the lead stays readable with its history and
nothing is deleted. Archived leads are excluded from the active register
and counts.

> **C9 update.** Contact-log times are now converted from the staff wall-clock entry with the configured business timezone and every Lead 360 instant renders in that zone; the funnel, response-time and win/lost analytics live in `docs/CLAUDE_C9_LEAD_ANALYTICS.md`.
