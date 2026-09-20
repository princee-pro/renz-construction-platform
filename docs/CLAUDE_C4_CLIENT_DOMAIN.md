# C4 CLIENT DOMAIN

## Table: `public.clients`

`id, full_name, email, email_normalized, phone_display, phone_normalized,
address, company, client_tier, referral_source, external_reference, version,
created_at, updated_at, created_by, updated_by, archived_at`.

- **`client_tier`** is `standard` | `vip` | `premium` (display Standard / VIP /
  Premium). It is a **segmentation label**, not a lifecycle status — never
  read it as "active/inactive" or as a proxy for whether the client has open
  work. Lifecycle is `archived_at` (see below), which is completely
  orthogonal to tier.
- **Contact requirement**: at least one of `email` or `phone_display` is
  required; both may be present. Enforced by
  `clients_contact_method_check` at the DB level and mirrored client-side by
  the `clientCreateSchema`/`clientEditSchema` `.refine()` in
  `client-contract.ts`. A client is **not** assumed to be a company —
  `company` is optional and purely informational.
- **Normalization**: `email_normalized`/`phone_normalized` (via
  `private.normalize_email`/`private.normalize_phone`) exist only for
  duplicate lookup and search; the human-entered `email`/`phone_display`
  values are preserved untouched for display. Duplicate email/phone is
  **not** treated as impossible — families and businesses legitimately share
  contact details — so it is surfaced as a soft signal, never a hard block.
- **`version`** is the optimistic-concurrency counter (see
  `CLAUDE_C4_REALTIME.md` → "Interaction with open edit forms" for how the
  Client 360 edit form pins it and keeps a rejected draft on screen). Every
  `update_admin_client`/`archive_admin_client` call must supply the
  `expected_version` it read; a mismatch returns `{ok:false, current_version,
  reasons:[{code:"version_conflict"}]}` rather than silently overwriting.

## Notes: `public.client_notes`

A proper relational table (`id, client_id, body, version, created_at,
updated_at, created_by, updated_by, archived_at`) rather than one giant
textarea column, so notes have their own timestamps, authorship, and future
edit history. Note bodies are **never** written into `audit_logs` — the audit
row for `client.note_create` records only that a note was created, not its
content (see the redaction rule in `CLAUDE_C4_CONTROL_ROOM_ARCHITECTURE.md`'s
mutation-sequence description).

## Duplicate awareness (not duplicate prevention)

`find_possible_duplicate_clients(candidate_full_name, candidate_email,
candidate_phone, exclude_id)` returns bounded matches on normalized email,
normalized phone, or a similar name+company pair, each tagged with a
human-readable `match_reason`. `DuplicateClientCheck`
(`src/features/clients/components/duplicate-client-check.tsx`) calls this
500ms-debounced from the Create Client form and renders a "Possible existing
clients" panel. **No automatic merge, no hard block** — a true database
identity conflict (e.g. resubmitting the exact same form twice) is prevented
by the RPC's own validation, not by this UI hint.

## Archive, not delete

`archive_admin_client` sets `archived_at`; there is no client delete path.
Archived clients:

- remain fully visible in the Client 360 / register when the `Archived` or
  `All` status filter is selected,
- stay connected to every operational project they already have,
- are **excluded** from `admin_list_active_clients_for_picker` (the
  Create-Project client search), so new work cannot be attached to a client
  the business has closed out,
- can be restored by an equivalent unarchive path if a future phase needs
  one — C4 did not build a restore UI since the brief only requires archive
  to be reversible in principle, not that a restore control exist yet.

## Admin surface

- `/admin/operations/clients` — register. Desktop columns: Client / Tier /
  Primary contact / Projects (active/total) / Updated / Action. Search +
  tier filter + active/archived/all status scope, keyset-paginated 25 at a
  time. Below 48rem it collapses to one stacked card per client (two-column
  `1fr 1fr` label/value grid inside the card, not a squeezed desktop table —
  see the CSS note below).
- `/admin/operations/clients/new` — Full name, Email, Phone, Address,
  Company, Client Tier, Referral Source, External/Reference Code, Initial
  Note. "Cancel" navigates away without saving; it is not a database state.
- `/admin/operations/clients/[clientId]` — Client 360
  (`src/features/clients/components/client-detail.tsx`). Header shows tier
  and archived state; quick actions are Email (`mailto:`, only if an email is
  on file), WhatsApp (only if the stored phone plausibly supports it — a
  digit-count heuristic in `whatsappHrefFor`, since not every stored phone
  supports WhatsApp), Create Project, Edit, Archive. Tabs: Overview,
  Projects, Notes, Activity. **No Finance/Invoices tab** — that is explicitly
  C5's job, with real data; C4 does not stub a fake one.

### The mobile-card grid bug this phase found and fixed

The first version of the mobile card layout used
`grid-template-columns: 1fr auto` for the label/value pairs. CSS Grid sizes an
`auto` track to the **max-content** of every item assigned to it across every
row — so a long unbroken value in one row (an email address) forced that
column wide, which starved the sibling `1fr` column down to `0px` and made
the *other* row's short label text wrap one character per line. Verified via
`getComputedStyle(li).gridTemplateColumns` returning `"0px 306px"`. Fixed by
switching to two equal `1fr 1fr` tracks (verified fix: `"153px 153px"`) plus
`flex-shrink:0`/`white-space:nowrap` on the label pseudo-element and
`overflow-wrap:anywhere` on the value, so long values wrap within their own
half-width cell instead of stealing space from the label.

## RPCs (all `security definer`, `set search_path = ''`, `authenticated`-only)

Read: `admin_clients_overview`, `admin_list_clients`,
`admin_list_active_clients_for_picker`, `admin_get_client`,
`find_possible_duplicate_clients`.

Write: `create_admin_client`, `update_admin_client`, `archive_admin_client`,
`create_client_note`.

All writes gate on `clients.write`; reads gate on `clients.read` (the picker
uses `operations.projects.write` instead, since it's called from the Create
Project form).
