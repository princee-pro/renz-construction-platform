# C4 PUBLIC CASE-STUDY BRIDGE

Read `CLAUDE_C3_PUBLIC_OPERATIONAL_PROJECT_BOUNDARY.md` first — this doc is
that boundary's promised C4 implementation.

## The relationship

```
operational_projects.public_case_study_id  →  public.projects.id
```

One named, typed, nullable foreign key. **Not** a polymorphic
`entity_type text, entity_id uuid` pair — that was explicitly ruled out in
the C3 boundary doc, and C4 followed through: `public_case_study_id` is a
plain `uuid` column with a real foreign-key constraint.

The relationship is enforced **one-to-one** by a database-level
`unique (public_case_study_id)` constraint
(`operational_projects_case_study_unique`), not an application-side
check-then-insert. This is race-safe: two concurrent "link this case study"
requests for the same public project cannot both succeed, because the second
one hits the unique constraint at the database level regardless of timing.
`link_operational_project_case_study` catches the resulting
`unique_violation` and translates it into a friendly `{code:"already_linked"}`
reason rather than a raw constraint error.

## What crosses the bridge, and what never does

`create_case_study_draft_from_operational_project(target_id,
expected_version, target_locale, target_slug, target_title)` is the only
function that reaches from the operational side into the public side. It:

1. Reads **only** `target_locale`/`target_slug`/`target_title` from the
   caller.
2. Calls the existing, **unchanged** S5C function
   `public.create_admin_project_draft(target_locale, target_slug,
   target_title)` — C4 did not touch the S5C draft-creation kernel at all.
3. Links the resulting draft's id into `operational_projects.public_case_study_id`.

**Never copied, under any circumstance**: client full name, client contact
details (email/phone/address), company, budget, private notes, internal
activity, status/phase history, or anything else that lives on the
`clients`/`operational_projects`/`*_notes`/`*_history` tables. A draft case
study created this way starts exactly as empty as one created directly from
`/admin/content/projects/new` — the only thing C4 prefills is the title/slug
the staff member typed into the "Create Draft" form on the Project Command
Center, which is exactly as public-safe as a working title.

## Reverse direction: Case Study editor → operational project

`public.admin_get_operational_project_for_case_study(target_case_study_id)`
(migration `20260911120000_harden_c4_realtime_policy_and_reverse_link.sql`)
returns `{id, title, status, current_phase, priority, archived_at}` for the
operational project whose `public_case_study_id` is the given case study,
or `null`. It returns `null` — never an error — when the caller lacks
`operations.projects.read`, so content-only staff never learn that an
operational record exists behind a case study. It never returns client
identity. The Case Studies editor
(`/admin/content/projects/[projectId]`) renders it as a "Operational
project" panel with **Open operational project** (C4 §56).

The same migration re-creates the S5C read facade `admin_get_project` so it
also emits `project_scope` and `renz_role` — the editor's strict contract
required both, the update facade accepted both, but the read facade never
returned them, so every Case Studies editor load had been failing schema
validation. The C4 browser E2E surfaced this the first time it opened the
editor from the Project Command Center.

## Panel states (Project Command Center → Public Case Study tab)

- **Not linked** — "Create Draft" (opens the inline form above) or
  "Link Existing" (paste a known public case-study id) actions, shown only to
  staff with `operations.projects.write`. Copy explicitly states the privacy
  guarantee: "A draft prefills only safe, public-facing information — never
  client identity, contact details, budget, or private notes."
- **Linked** — shows the case study's publication state (Draft / Published /
  Archived) via the same `StatusBadge` tones used on the Case Studies
  register, plus Open Editor, Preview, View Public (only once Published, and
  only if a slug exists), and Unlink.

## Required regression: the public privacy invariant

The brief requires a synthetic-fixture proof that linking never leaks client
data through any anonymous public surface. This is exercised by:

1. Creating a synthetic client with an obviously fake identity
   ("SYNTHETIC ... CLIENT") — `scripts/verify-c4.mjs` at the RPC level and
   `tests/e2e/c4-control-room.spec.ts` through the real browser forms,
2. an operational project against it,
3. a linked (and, for the published-state check, published) public case
   study,
4. then reading that case study through the **anonymous** public API surface
   (`/projects/[slug]`, the public project RPCs) and asserting the response
   contains none of: the client's name, phone, email, address, company, or
   budget.

This is structurally guaranteed by the schema (the public `projects` table
has no column that could hold any of that data — there is nothing to leak
because the bridge is a bare id reference, not a data copy), but the fixture
proof is still required as the regression that would catch a future
regression (e.g. someone adding a denormalized "client name" column to
`projects` directly, which this test would immediately fail).

## Non-negotiable checklist (mirrors the C3 boundary doc, extended)

- [ ] `operational_projects.public_case_study_id` remains a single named
      foreign key — never a polymorphic pair.
- [ ] The unique constraint on `public_case_study_id` remains in place.
- [ ] `create_case_study_draft_from_operational_project` reads only
      locale/slug/title from its caller.
- [ ] No client PII, budget, or private note ever appears in a
      `projects`/`project_localizations` row, a public API response, or a
      server/client component rendered on a public route.
- [ ] The public privacy invariant fixture test keeps passing.
