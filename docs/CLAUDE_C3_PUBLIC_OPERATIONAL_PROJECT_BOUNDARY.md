# PUBLIC CASE STUDY != OPERATIONAL CLIENT PROJECT

This boundary is load-bearing for every future phase (starting with C4). Read this
before adding anything to the `projects` table or building the operational
Clients/CRM domain.

## The rule

**`public.projects` / `public.project_localizations` / `public.project_media` /
`public.project_stages` / `public.project_evidence` are the PUBLIC MARKETING CASE
STUDY domain, and only that domain.** They describe what RENZ is willing to show a
website visitor: a title, a public-safe location, a narrative, rights-cleared media,
related services, factual review sign-off.

They are **not**, and must never become, the operational business-tracking domain:
no client identity, no budget, no invoices, no contractor assignments, no payment
records, no internal project phases/milestones, no private notes. That domain
("OPERATIONAL CLIENT PROJECT") does not exist yet — it is explicit **future C4
scope** — and C3 deliberately did not build it, per the brief's hard stop.

## Why this matters (concretely)

- A public case study is written to be shown to the general public and to be
  approved for that purpose (factual review, evidence, rights-cleared media).
- An operational project record will contain business-sensitive and personally
  identifying information (a client's name, contact details, what they paid, who
  worked on it, internal scheduling) that must **never** leak into a public
  projection, an SEO description, an og:image, or a signed media URL.
- Merging the two into one table (or one polymorphic `entity_type`/`entity_id`
  relationship spanning both) makes that leak a single missing `WHERE` clause away,
  instead of an entire schema boundary away. RLS on one shared table protecting two
  audiences with very different trust levels is fragile in a way RLS on two
  separate tables is not.

## What C3 actually built (and did not build)

- Built: the full public case-study admin facade (S5C) on top of the existing
  `projects`/`project_localizations`/`project_media`/`project_stages`/
  `project_evidence` tables. See `CLAUDE_C3_PROJECT_CASE_STUDY_ARCHITECTURE.md`.
- Did **not** build: any Client/CRM table, any operational project table, any
  invoice/budget/contractor/payment table, any `operational_project_id` column, any
  polymorphic `entity_type`/`entity_id` linking table.
- No column in `public.projects` or `public.project_localizations` added this phase
  carries operational meaning. `renz_role`, `project_scope`, `delivery_status`, etc.
  are all **public-facing** descriptions of RENZ's role/scope/status on the case
  study, not internal operational tracking fields.

## Guidance for C4

When C4 builds the operational Client/Project domain:

1. Create genuinely separate tables (e.g. `operational_clients`,
   `operational_projects`, with their own RLS, their own permission keys distinct
   from `content.*`/`media.*`, and no public-anon grants at all).
2. If/when a link between an operational project and its public case study is
   useful, add **one** nullable foreign key —
   `public.projects.operational_project_id references operational_projects(id)` (or
   the reverse direction, whichever reads more naturally once the operational schema
   exists) — not a polymorphic `entity_type text, entity_id uuid` pair. A named,
   typed foreign key is enforceable, indexable, and greppable; a polymorphic pair is
   none of those and was explicitly ruled out for this reason.
3. **`operational_clients.full_name` (or equivalent) must never be selectable by
   `anon`,** and must never be copied, joined, or denormalized into
   `project_localizations`, `published_projects`, or any other public projection —
   not even behind a feature flag, not even in a "preview" field. If a public case
   study ever needs to name a client (testimonial-style attribution), that must go
   through the existing, separately-consented `testimonials` domain
   (`attribution_mode`, `consent_state`, `attribution_approved`), which already
   has its own explicit consent gate — never through a raw client-record join.
4. Keep the public readiness/publication kernel (`check_publication_readiness`,
   `publish_content`, etc.) scoped to public content types only. Do not add
   `'operational_project'` to `publicationContentTypeSchema` — operational records
   are never "published" to the public in the S4 sense; they have their own
   internal status model.
5. If an operational project should surface *some* of its facts on the linked public
   case study (e.g. "mark this case study's completion year from the operational
   record"), that stays a **manual, explicit admin action** — an admin reads the
   operational record and types the public-safe fact into the public case study's
   own field via `update_admin_project_draft`. Do not build automatic sync from the
   operational domain into the public domain; every public-safe fact should be a
   deliberate editorial decision, not a byproduct of an internal data change.

## Non-negotiable checklist for any future PR touching this boundary

- [ ] No new column on `projects`/`project_localizations` stores client identity,
      money, or internal scheduling.
- [ ] No new public-anon grant exposes an operational table, even partially.
- [ ] No `entity_type`/`entity_id` polymorphic table was introduced.
- [ ] Any operational→public link is a single named nullable foreign key, reviewed
      for what it exposes.
- [ ] Client names never reach a public projection outside the existing
      testimonial consent flow.
