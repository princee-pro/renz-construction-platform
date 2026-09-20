# C8 — CONVERSION

Lead → Client → Operational Project (→ material requirements). Deliberate,
idempotent, race-safe. The lead is never deleted; it stays as the source
history of the client and project it produced.

## 1. Client (`convert_lead_to_client`, `leads.convert`)

Two modes in the Conversion panel:

- **Link an existing client** — only clients that share the visitor's
  normalized email or phone are offered (the duplicate-awareness set);
  other clients are linked from the Clients register by staff who know
  better.
- **Create a client from this lead** — additionally needs `clients.write`.
  Prefilled with name, email, phone, company and location; staff may edit
  before saving. Private notes, attachments and activity are never copied.
  The client's `referral_source` records `Lead <reference>`.

Idempotency and races: the facade locks the lead row (`for update`). Once
`client_id` is set, every later call returns `already_linked: true` with
the same client and creates nothing — checked before the version
comparison so a concurrent second staff member gets the link, not a
duplicate. `scripts/verify-lead-concurrency.mjs` proves two sessions
converting the same lead produce exactly one client;
`scripts/verify-c8.mjs` repeats the race through the API.

## 2. Operational project (`create_project_from_lead`)

Requires `leads.convert` + `operations.projects.write`, a linked (active)
client and no existing project on the lead (`leads.operational_project_id`
is unique). Staff choose the working title (prefilled from project type +
visitor name), the **starting phase** (design, planning, procurement,
structural, execution, finishing — never inferred from the public "current
stage"), priority (default medium, never fabricated) and an optional
planned start; the description is prefilled from the visitor's message.
Status starts at `planning`. Public uploads are never copied into case
study media; a separate rights review would be required to ever promote
one.

Both directions are visible: Client 360 lists **Originating leads**, the
project command center shows **From lead <reference>**, and Lead 360 links
to both.

## 3. Material requirements (`create_material_requirements_from_lead`)

Material enquiries never create purchase orders, supplier orders or
inventory movements. Once a client and project exist, staff select
enquiry items, edit item, quantity, unit, required-by date, priority and
specification, and the facade calls the existing C6
`create_material_requirement` for each (state `draft`, private note "Lead
<reference> enquiry item"). Needs `leads.convert` +
`procurement.materials.write`. The Lead 360 badge counts requirements
created from that lead.

## 4. Won

`change_lead_status(... 'won')` refuses without a client, and for project
leads without an operational project. Won and Lost set `won_at` /
`lost_at`; `lead_stage_history` keeps every transition with actor and
reason so C9 can compute time to first contact, qualification and outcome
from authoritative rows.

## Audit

`lead.convert_client` (client id, created flag), `client.create` (with
`from_lead`), `lead.convert_project` / `operational_project.create` (with
`from_lead`), `lead.material_requirements_create` (count, project id).
Metadata never carries contact data, message bodies or notes.
