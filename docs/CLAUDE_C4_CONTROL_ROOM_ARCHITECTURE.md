# C4 CONTROL ROOM — ARCHITECTURE

This is the entry point for the Client CRM + Operational Project Management
foundation built in Phase C4. Read this first, then the domain-specific docs
(`CLAUDE_C4_CLIENT_DOMAIN.md`, `CLAUDE_C4_OPERATIONAL_PROJECT_DOMAIN.md`,
`CLAUDE_C4_CASE_STUDY_BRIDGE.md`, `CLAUDE_C4_REALTIME.md`).

## What C4 is

C4 introduces the first genuinely **internal, business-operational** domain in
the admin: `clients` and `operational_projects`. It is the load-bearing layer
for everything C5 (invoices/finance), C6 (contractors), C8 (lead intake) will
eventually attach to. C4 itself implements only Clients + Operational Projects
+ the Control Room dashboard that reads them — nothing from those later phases.

## Pattern reused, not reinvented

C4 is built as a straight continuation of the S4/S5A/S5C admin-facade pattern
already established for Services and public Projects:

- **Default-deny RLS** on every new table (`enable row level security` +
  `revoke all ... from public, anon, authenticated`), with the only exception
  being `realtime_events` (see `CLAUDE_C4_REALTIME.md`).
- **Narrow `SECURITY DEFINER` RPC facades** (`set search_path = ''`) as the
  sole access path — one function per read shape, one per mutation. No `select
  *`, no client-constructed queries.
- **`private.has_permission(key)`** for authorization,
  **`private.has_aal2()`** for step-up assurance, **`private.s4_audit(...)`**
  for the audit trail, **`private.failure(code, field, detail)`** for the
  uniform `{ok:false, reasons:[...]}` error shape.
- **Keyset pagination** (`cursor_updated_at`, `cursor_id`, bounded `page_size`)
  on every list RPC — never `OFFSET`, never an unbounded `select *`.
- **Optimistic concurrency** via an integer `version` column, checked
  server-side against `expected_version` before any mutation.
- **The server mutation sequence** is identical to S4/S5A/S5C: parse →
  authenticate → require AAL2 → require active profile → authorize by
  permission → validate input → check `expected_version` → transactional
  write → `private.s4_audit(...)` → `private.emit_realtime_event(...)` →
  return the sanitized `{ok, id, version}`/`{ok:false, reasons}` result →
  `revalidatePath(...)` on the calling Server Action.

Nothing about this required a new security architecture. The only genuinely
new primitive C4 adds is the realtime notification pipe (see below).

## Domain boundary (read `CLAUDE_C4_CASE_STUDY_BRIDGE.md` for the full detail)

```
CLIENT  →  OPERATIONAL PROJECT  →  (optional, 1:1)  →  PUBLIC CASE STUDY
```

`clients` and `operational_projects` are **private** tables — no RLS grant,
ever, to `anon`. `public.projects` (the C3 public case study) is untouched by
this phase except for one new nullable, unique foreign key
(`operational_projects.public_case_study_id references public.projects(id)`).
Never conflate the two: a public case study is marketing content; an
operational project is a business record with a real client's contact
information, notes, and (from C5 onward) money attached to it.

## Database objects C4 added

Tables (all RLS-enabled, all default-deny except `realtime_events`):

- `public.clients`
- `public.client_notes`
- `public.operational_projects`
- `public.operational_project_notes`
- `public.operational_project_status_history`
- `public.operational_project_phase_history`
- `public.realtime_events`

Permissions seeded (`clients.read`, `clients.write`,
`operations.projects.read`, `operations.projects.write`), granted to both
`admin` and `super_admin` — C4 has no publish-style elevated operation that
would need to distinguish the two roles further.

26 RPC functions (read + write + bridge + dashboard + quick find + the
case-study reverse lookup) — see
`CLAUDE_C4_CLIENT_DOMAIN.md` and `CLAUDE_C4_OPERATIONAL_PROJECT_DOMAIN.md` for
the full list and contracts. All are `revoke ... from anon`, `grant execute
... to authenticated` only; every one still re-checks
`private.has_permission(...)` internally, so holding `authenticated` alone
grants nothing.

Migrations (forward-only — S2/S3/S4/S5A/S5C history was never rewritten):

- `supabase/migrations/20260911100000_establish_c4_control_room.sql` — the
  domain: tables, RLS, permissions, the 25 facades, realtime pipe.
- `supabase/migrations/20260911120000_harden_c4_realtime_policy_and_reverse_link.sql`
  — (1) `private.is_active_aal2_staff()` and the corrected
  `realtime_events_staff_select` policy (see `CLAUDE_C4_REALTIME.md`);
  (2) `admin_get_operational_project_for_case_study` (see
  `CLAUDE_C4_CASE_STUDY_BRIDGE.md`); (3) `admin_get_project` re-created to
  emit `project_scope`/`renz_role` for the S5C editor contract.

Database tests: `supabase/tests/database/011_c4_control_room.sql` (shape,
lifecycle, version conflict) and `012_c4_security_negative.sql` (AAL1,
disabled staff, each missing permission, malformed UUID, every §69 check
constraint, realtime RLS under each actor).

## Frontend surface

New IA group **OPERATIONS** in the admin sidebar (`Clients`, `Projects`),
distinct from **WEBSITE → Case Studies** (`/admin/content/projects`, the C3
public register — relabeled from a generic name to "Case Studies" specifically
so it stops reading as the same thing as `/admin/operations/projects`).

```
src/features/clients/                     — Client domain (contract, data, actions, components)
src/features/operational-projects/        — Operational Project domain (same shape)
src/features/admin-shared/                — shared AdminActionState, form helpers, realtime hook
src/app/admin/(workspace)/operations/     — the six new routes (list/new/[id] × 2)
```

`src/features/admin-shared/` holds what both domains (and, structurally,
every future admin domain) share:

- `action-state.ts` / `action-helpers.ts` — the `AdminActionState` shape
  (including `createdId`, so create forms land on the new record instead of
  the register), FormData parsers, and the `{ok,reasons}` → message
  translation.
- `use-realtime-invalidation.ts` + `realtime-refresh.tsx` — the realtime
  hook and the mountable Live / Updated just now / paused indicator.
- `use-pinned-edit.ts` + `use-draft-fields.ts` — the optimistic-concurrency
  edit session (version pinned at open, controlled drafts, Reload latest).
- `recently-viewed.ts` + `use-record-recently-viewed.ts` — the client-side
  recently-viewed list on the Overview.

`src/components/admin/ui/register-skeleton.tsx` backs the route-level
`loading.tsx` files for Overview, both registers, Client 360 and the Project
Command Center: a header + rows silhouette that shows no numbers (a
placeholder must never read as a zero).

## Control Room dashboard

`/admin` (`src/app/admin/(workspace)/page.tsx`) now renders real C4 data
alongside the pre-existing Services register block: client/active-project
counts, status/phase distribution, an "attention" panel (ending-soon /
past-due / without-case-study counts), budget grouped by currency (never
summed across currencies — see `CLAUDE_C4_OPERATIONAL_PROJECT_DOMAIN.md`), a
deterministic action queue, and one merged Recent Activity feed. The
pre-existing generic activity feed (`loadAuditActivity`, unfiltered by
entity_type) is filtered to exclude `client`/`operational_project` rows so it
does not duplicate the C4-scoped `admin_recent_activity` feed — both read the
same `audit_logs` table and would otherwise show every C4 event twice.

## Verification surface

- `pnpm db:test` — pgTAP incl. `011_c4_control_room.sql`,
  `012_c4_security_negative.sql`.
- `pnpm c4:verify` — `scripts/verify-c4.mjs`, the RPC-level synthetic
  lifecycle (§65) incl. the public privacy invariant and anonymous denials.
- `pnpm c4:verify:realtime` — `scripts/verify-c4-realtime.mjs`, the
  transport-level two-session realtime proof (§66).
- `pnpm test:e2e:c4` — `tests/e2e/c4-control-room.spec.ts`: AAL1 exclusion,
  the full browser workflow (create client → duplicate awareness → create
  project from Client 360 → status/phase/priority → note → case-study draft
  → privacy invariant → reverse link → Quick Find → Control Room), two-session
  realtime propagation (§66), two-actor stale-save rejection on a client and
  a project (§67), archive semantics, 390/768/1440 layouts with no horizontal
  overflow, and axe (serious/critical = 0) on every C4 screen.
- `tests/unit/c4-control-room-contracts.test.ts` — the zod contracts, health
  rule, filter normalisation, action-result readers, and navigation IA.

## Global Admin Quick Find

`src/components/admin/quick-find.tsx`, mounted once in `AdminNavigation`,
opens on Ctrl/Cmd+K or a visible "Quick Find" button. It calls
`admin_global_quick_find(search_query, limit_count)`, which silently *omits*
(never denies) each domain the caller lacks read permission for — a staff
member missing `clients.read` simply sees no CLIENT rows, with no error.
Results are labelled CLIENT/PROJECT/CASE STUDY and route to the matching
detail page.

## What C4 deliberately did not build

Per the brief's explicit stop list: no invoices/finance (C5), no
contractors/payments (C6), no lead-intake backend (C8), no public-site visual
redesign. No `Invoices`/`Contractors`/`Payments`/`Analytics` navigation items
or dashboard tiles exist yet — they are added only when their owning phase
actually implements them, per the brief's "no dead future items" rule.
