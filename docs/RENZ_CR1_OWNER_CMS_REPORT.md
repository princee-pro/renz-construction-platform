# RENZ Owner CMS + Client Change Report

CR1 / D1.5A — Owner Website Control System. Date: 2026-09-15. Scope stops
before C10.

## 1. Summary

The RENZ owner now runs the public website from Admin. Every visitor-facing
element is either **owner editable** (pages, sections, wording, order,
appearance, media, navigation, footer, globals, SEO), **domain managed**
(services, projects, insights, business facts, published through their own
editors) or **system protected** by design (forms, security, colours,
grid). Drafts are private, preview uses the real components, publish is
atomic, every publish is a revision, rollback is non-destructive. The
functional freeze holds: CRM, finance, leads, procurement, contractor
finance, analytics and auth were not modified.

## 2. Audit before CR1

`docs/RENZ_PUBLIC_CONTENT_CONTROL_MATRIX.md` §1. Before CR1 the owner could
edit services (S5A), case studies (S5C), business/contact/SEO/legal settings
(C7) and insights only through a script. Home, About, Services index,
Projects index, Contact and Start-a-Project copy, the six concept studies,
the process story, the footer, WhatsApp wording and every section order were
code constants (`src/features/services/content.ts`,
`src/features/public-content/client-preview/*`, `editorial-insights.ts`,
`process` constants). Adding Service #6 or Project #7 required a developer;
"Five services" was hard-coded.

## 3. Split-source elimination

All static runtime sources are gone. `seed-categories.ts`,
`client-preview/*` and `editorial-insights.ts` survive only as **seed
inputs** for `scripts/website-seed-content.mjs`, which migrates the five
services (with exclusions and client-input text), six concept studies
(stages from chapters, preview images uploaded as generated references,
first four featured on Home) and three insights into the registers,
preserving wording, slugs and order. The approved page copy ships in
migration `20260917130000_seed_cr1_website_pages.sql` as published revision
1 of every page.

## 4. Data model (pages)

`website_pages` (page_key, page_type system / content / custom / global,
path, title, seo_*, og_media_id, noindex, status, published_revision_id,
version), `website_page_sections` (type, variant, tone, spacing, motion,
hidden, locked, label, config jsonb, sort_order, version),
`website_page_revisions` (revision_no, kind published / restore_point,
summary, snapshot, media_ids), `website_route_aliases`,
`website_section_types` (registry mirror, system_module flag). All
default-deny RLS; facades only.

## 5. Data model (content revisions)

`content_publications` freezes a snapshot of services / projects / posts on
every publish (`private.capture_on_publish_trigger`) and on **Publish
changes** (`republish_content`). `published_services`, `published_projects`,
`published_project_media`, `published_posts` are views over the current
snapshot; `is_public_content` = published + current snapshot + no *live*
failure (evidence, claims, media rights). Published entities are therefore
editable without affecting visitors.

## 6. Website control center

`/admin/website`: counts (pages, services, projects, insights, images with
alt / rights gaps), quick actions, "Needs attention" (content health), page
cards, recent activity (audit-derived). `/admin/website/pages` register with
status, draft-changes flag, SEO completeness; `/admin/website/sitemap`
lists every public URL, its source and indexability.

## 7. Page domain and reserved routes

Page types and addresses in `docs/CLAUDE_OWNER_PAGE_BUILDER.md`. Reserved
slugs live in `private.website_reserved_slugs()` and are mirrored in
`src/features/website/routes.ts` (unit-tested for parity). Custom pages
render through `src/app/(public)/[slug]/page.tsx` — the one controlled
renderer — with alias redirects and a real 404 when unpublished.

## 8. Section system

Static registry `src/features/website/section-registry.ts`: 35 types (21
content, 10 system modules, 4 global — listed in the page-builder doc),
each a `FieldSpec` list → zod schema → defaults → editor form → renderer in
`src/components/site/sections/*`. `renderers` is a static map; unknown
types render nothing. Move up / down buttons, duplicate, hide, remove
(confirmation), locked system modules.

## 9. Variants, tones, spacing, motion

Named choices only (`docs/CLAUDE_OWNER_PAGE_BUILDER.md` §Appearance): 11
tones mapped to design tokens, 3 spacings, 3 motions (plus reduced-motion),
per-type variants. No CSS, colours or classes are ever entered by the owner.

## 10. Rich text

`src/lib/content/rich-text.ts`: headings, paragraphs, bold, italic, links,
lists, quotes. Links render only for `http(s)`, `mailto`, `wa.me` and
public internal paths; `javascript:`, `data:` and `/admin` degrade to plain
text. No scripts, styles, iframes or raw HTML — refused in the app schema and
in the database (`private.content_json_is_safe`).

## 11. Draft → preview → publish

`docs/CLAUDE_OWNER_PUBLISHING.md`. Preview `/preview/website/[pageId]`
(staff, noindex) renders the draft or a chosen revision with the real
components and a preview bar (Draft / Published, **Edit page**). Publish is
one transaction (`publish_website_page`): snapshot, media readiness, SEO
requirement, revision insert, page flip, audit, revalidation.

## 12. Revision history and rollback

Every publish is a numbered revision with summary, author and timestamp;
**Restore as draft** captures a `restore_point` first and never deletes.
Rollback = restore → preview → publish (E2E *Home*, pgTAP 018).

## 13. Optimistic concurrency

Every page, section, service, project, post and media row carries a
`version`; stale saves return `version_conflict` ("Someone else saved
first…") and nothing is overwritten. The editors keep the owner's unsaved
text on conflict and adopt fresh versions from the server (E2E *Two
sessions*).

## 14. Media library

`docs/CLAUDE_OWNER_MEDIA_WORKFLOW.md`: upload with provenance class (RENZ
PROVIDED / LICENSED / GENERATED CONCEPT / review required), alt, caption,
credit, focal point (click), rights confirmation, usage ("where used"),
replace everywhere, archive blocked while in use. Delivery through
`/api/media/website/[id]` with database-decided eligibility and
service-signed short-lived URLs.

## 15. Project CMS

Evidence class (`real_project`, `concept_study`, `experience_study`),
website placement (Feature on Home, layout hint AUTO default, materials,
tags), related services, stages, media with rights clearance, review,
publish, Publish changes, revisions, unpublish / archive (never delete),
slug alias on rename. Real projects still require reviewed evidence and
RENZ-provided media.

## 16. Auto-placement

`docs/CLAUDE_OWNER_AUTO_LAYOUT.md`: cycle monument → portrait → landscape
→ technical → strip → wide; no adjacent repeats; no two full-bleeds
touching; no image-led composition without media; hints honoured when they
do not clash. Unit-tested for 6, 7, 8, 9 and 12 projects; E2E verifies 7
slots without overlap at 1440px and 390px. Home feature with fallback
(home_featured → featured → all).

## 17. Services CMS

Published services stay editable; owner detail fields (positioning,
sub-services, use cases, sequence, coordination, FAQ) join the S5A
register fields; Publish changes / Restore; alias on slug change; dynamic
count tokens so "Five services" becomes "Six" automatically; mega menu and
navigator derive from the published register. Service #6 verified end to
end.

## 18. Insights CMS

`/admin/content/insights`: create, edit (title, excerpt, structured body,
topic, related service, hero, SEO, featured / pinned / priority), review,
publish, unpublish, revisions; index placement featured → pinned → priority
→ newest.

## 19. Home page

Every section owner-editable (hero incl. register facts with tokens,
business clarity, marquee, services showcase, featured projects, process,
material moment, why RENZ, insights feed, CTA); the hero is a locked module
so Home can never lose its opening.

## 20. Process, About, Insights index, Contact, Start a Project, enquiries

All wording owner-editable through system pages; the intake wizard, forms,
validation, tokens and lead mapping are locked system modules (C8). Process
steps live in Globals (add / remove / reorder; count tokens keep "Five
steps" honest).

## 21. FAQ and CTA

`faq` sections (items with Move up / down / Remove) on any page and
per-service FAQs; `cta` sections with typed destinations; the site-wide
primary CTA falls back to Settings → Website.

## 22. Navigation

Settings → Website → Navigation: approved routes with labels, order,
visibility, plus published custom pages (`page:<slug>` keys). Unpublishing a
linked page is refused with the dependency list; renaming rewrites the key.
Functional destinations cannot be removed.

## 23. Footer and globals

Footer options (headline, statement, column labels, visibility switches)
and footer groups; Globals (primary CTA, WhatsApp CTA / note, insight note,
menu tagline, labels, process steps). CMS values are the source; C7 copy
fields are legacy fallbacks (backlog #37).

## 24. SEO

Per-page / per-entity title, description, OG image, noindex; site name and
template from C7; sitemap generated from the published register; drafts and
previews noindex; SEO health in content health and the site map.

## 25. Content health

`private.website_page_health`: `seo_title_missing`,
`seo_description_missing`, `og_image_missing`, `no_sections`,
`no_title_section`, `no_cta`, `alt_missing`, `media_not_ready`,
`not_in_navigation`. Never blocks editing; only unready media and a missing
custom-page description block publishing.

## 26. WhatsApp green system

`src/styles/whatsapp.css`: `--whatsapp #25D366`, `--whatsapp-dark #075E54`,
near-black ink on green (AA), one glyph, `wa.me` messaging links only, no
`tel:` for the RENZ number anywhere public (E2E *WhatsApp*). Site palette
unchanged; recorded as `RENZ_DESIGN_FREEZE.md` §7b. Admin WhatsApp actions
(Lead 360, Client 360, invoice / PO command centres) use the same system.

## 27. Permissions

`website.read`, `website.pages.write`, `website.layout.write`,
`website.publish`, `website.navigation.write`, `website.seo.write` (S3
naming). Editors (admin) read / write / arrange / SEO; publishing and
navigation are super_admin. AAL2 and active account enforced in
`private.has_permission`; RBAC negatives in pgTAP 018.

## 28. Audit

`page.*`, `section.*`, `revision.restore`, `navigation.update`, `media.*`,
`content.publish` rows with ids, paths and revision numbers; no section
bodies (pgTAP asserts).

## 29. Dependency checks and broken-link prevention

Unpublish blocked by navigation / section links; slug changes create
aliases; CTAs validate destinations; internal links to `/admin` or `/api`
are refused; aliases cannot loop or claim reserved routes.

## 30. Responsive and motion

Sections render 320–1920 (s9bp reflow matrix 320 / 390 / 768 / 1440 passes
over all public routes); Standard / Quiet / None motion honours
`prefers-reduced-motion`; focal-point crops replace re-uploads; empty
sections hide.

## 31. Owner UX

Three-pane editor (Sections / Edit / Publish tabs on phones, verified at
390px), save status badge, unsaved-changes guard, preview / published
comparison, Quick Find PAGE / SERVICE / PROJECT / INSIGHT, dashboard counts,
Launch Readiness website checks, in-product help on every editor.

## 32. Performance and public bundles

Public routes read the published snapshot only; `unstable_cache` with tags
(1 h window bounded, tag-revalidated on publish). `pnpm audit:public-bundles`
proves no CMS editor chunk is referenced by any public route. Storage-backed
images render `unoptimized` (derivatives ≤ 2400px) because the optimizer
does not follow the signed redirect.

## 33. Accessibility

axe serious/critical = 0 on every public route (s9bp), admin editors use
labelled controls, `aria-current`, `role="group"` arrangements, live regions
for save results, focus management on dialogs and the mobile menu.

## 34. E2E — Service #6

`tests/e2e/cr1-owner-cms.spec.ts` *Service #6*: create → details → evidence
→ review → publish → appears on /services ("Six ways"), mega menu, service
page with sub-services → edit while live (public unchanged until Publish
changes) → unpublish ("Five ways", link gone). PASS.

## 35. E2E — Project #7

Create → placement (concept study, Feature on Home) → two related services
→ upload + rights → review → publish → /projects shows 7 slots without
overlap (1440 / 390) → /services/design and Home show it → remove from Home
→ unpublish → 404. PASS.

## 36. E2E — Insight

Write → review → publish → on the index → unpublish → gone. PASS.

## 37. E2E — Home rollback

Edit hero → public unchanged, preview shows draft with Edit page → reorder
→ publish → public updated → restore revision 1 → publish → original
wording back. PASS.

## 38. E2E — Custom page

Reserved routes refused (admin, api, services, projects, i, po) → create
`/synthetic-approach` → FAQ + CTA → 404 before publish → SEO description
required → publish → navigation → unpublish blocked while linked → remove
link → unpublish → 404. PASS.

## 39. E2E — Media, concurrency, RBAC, XSS

Media library (upload, alt, focal point, rights, in-use protection): PASS.
Two-session stale save refused: PASS. XSS / `javascript:` refused at the
editor boundary: PASS. RBAC negatives (AAL1, disabled, read-only, editor
without publish, anon) in pgTAP 018.

## 40. E2E — WhatsApp and content-count audit

Green, messaging-only, no `tel:` on /, /contact, /start-a-project: PASS.
Count tokens verified through the Service #6 flow ("Five" ↔ "Six").

## 41. E2E — Globals / footer / About

Process step reorder → public rail; footer statement; About heading. PASS
(added for checklist items 5, 13, 15, 18).

## 42. Regression suites

s6a-public (6), s9ap-public (6), s9bp-public (13), c7-settings, s5a-admin,
c4-control-room, d1-visual, c8, c9, c5, c6: see §61 for the run table.

## 43. pgTAP

`018_cr1_owner_cms.sql` (76 assertions): permissions, RLS default deny on
all CMS tables, public facades for anon, RBAC negatives, reserved routes and
slug safety, XSS refusal, layout commands, editor vs owner publish, snapshot
isolation, rollback, navigation dependency, alias on rename, unpublish, audit
without bodies. Inventory counts in 001 / 006 / 007 updated. Total pgTAP plan
across the suite: 1277.

## 44. Unit and component tests

`tests/unit/cr1-owner-cms-contracts.test.ts` (14): registry, rich text,
routes, tokens, auto-placement. Unit project 157 / 157, component project 19
/ 19 (renderer states rewritten around `WebsitePage`).

## 45. Verification gate

prettier ✓, eslint ✓ (0 warnings), typegen + tsc ✓, vitest unit ✓,
component ✓, designmd lint ✓ (warnings only, unchanged), design tokens ✓,
scan-secrets ✓ (only the synthetic E2E fixture, removed by teardown),
`next build` ✓, `audit:public-bundles` ✓. Steps run individually (8 GB
machine; `pnpm verify` OOMs).

## 46. Bugs found and fixed during CR1

- Anonymous image delivery: `/api/media/project|website` signed with the
  visitor's client (no Storage grant) → 502; now database-gated + service
  signed (C7 brand pattern). Pre-existing for real project media.
- `next/image` over the signed redirect → 400; API-backed sources render
  unoptimized.
- Playwright starts the web server before global setup: stale data cache
  served ids from a previous seed; `scripts/e2e-server.mjs` clears the
  cache and the test window is 5 s.
- Section editor lost the save result when re-keyed on version; editors
  now stay mounted and sync versions from server props.
- React 19 form reset wiped owner text on a refused save (service details,
  project placement); fields are controlled.
- Nested review form inside the project save form (dropped by the browser)
  made "Mark factually reviewed" submit the draft instead; moved out and
  errors surfaced.
- `admin_website_overview` used `audit_logs.created_at` (→ `occurred_at`).
- `intake-frame` (server) called `serviceField()` from a `"use client"`
  module → `/start-a-project?service=…` and `/enquire/service?service=…`
  returned the error boundary; helpers moved to `service-fields.ts`.
- Stale S5A / C4 navigation assertions ("Case Studies"); C7 SEO default
  assertion (page descriptions now win).

## 47. Surprise improvements (§117)

1. **Edit page shortcut** in the preview bar. 2. **Dependency checker**
before unpublish with the linking pages listed. 3. **Duplicate section**.
4. **Media usage inspector** + replace everywhere. 5. **Automatic
redirects** on every slug change (pages, services, projects, posts).
6. **Public-bundle audit script** (`pnpm audit:public-bundles`).

## 48. Developer-independence checklist

22 / 22 tasks owner-doable (`RENZ_PUBLIC_CONTENT_CONTROL_MATRIX.md` §3, each
with its verification). Residual system-protected items are listed in §4
of the matrix.

## 49. Documentation

`docs/CLAUDE_OWNER_CMS_ARCHITECTURE.md`, `CLAUDE_OWNER_PAGE_BUILDER.md`,
`CLAUDE_OWNER_PUBLISHING.md`, `CLAUDE_OWNER_MEDIA_WORKFLOW.md`,
`CLAUDE_OWNER_AUTO_LAYOUT.md`, `RENZ_PUBLIC_CONTENT_CONTROL_MATRIX.md`
(audit + acceptance + checklist + residuals); `RENZ_PHASE_STATUS.md` (CR1
row, C10 next), `RENZ_DESIGN_FREEZE.md` §7b, `RENZ_C10_HARDENING_BACKLOG.md`
#31–40, README local content note.

## 50. Migrations

`20260917100000_establish_cr1_website_cms.sql` (permissions, tables, page /
section / publish / restore / public RPCs, navigation with pages),
`20260917110000_establish_cr1_content_revisions.sql` (content publications,
snapshot views, republish / restore, editable-while-published editors,
owner detail fields, alias trigger),
`20260917120000_establish_cr1_owner_surfaces.sql` (posts, media, overview,
sitemap, quick find + launch readiness extensions),
`20260917130000_seed_cr1_website_pages.sql` (approved pages). 41 migrations
total; fresh reset is the supported path.

## 51. Application surfaces added

`src/features/website/*` (registry, contracts, data, actions, media,
tokens, routes, layout, render), `src/components/site/sections/*`
(renderers), `src/app/(public)/*` rebuilt on `loadPublishedPage`,
`/preview/website/[pageId]`, `/api/media/website/[id]`,
`/api/admin/media`, `/admin/website/*`, `/admin/content/insights/*`,
`src/features/insights/*`, `src/features/content-revisions/*`,
service / project editor extensions, settings navigation with custom
pages, Quick Find kinds, styles (`whatsapp.css`, `final-sections.css`,
`website-cms.css`).

## 52. What the owner does now without a developer

Change any wording, order, appearance and image on any page; add pages;
add / edit / publish / unpublish services, projects and insights; manage
media rights; edit navigation, footer and globals; preview, publish, roll
back; see health and readiness.

## 53. What still needs a developer (by design)

New section types or system modules; intake vocabulary (C8, backlog #36);
colours / grid / typography (design freeze); legal wording structure (C7);
security and auth behaviour; new integrations.

## 54. Known limitations

- Intake "need" options do not include a newly published service (#36).
- Restore of an entity revision does not rebuild project media relations
  (#33).
- C7 `contact_intro` / `footer_statement` are legacy fallbacks (#37).
- Concept / experience studies may carry generated media by design (#38).
- Media delivery signs a URL per image request (CDN in C10, #31).
- The seed and `next dev` data cache need a cache clear (#34); the
  `DO`-block wrapper in `…120000` is not idempotent on re-application (#35).
- Real-time "someone is editing" banner not built (#32).

## 55. Security posture

Default-deny RLS on all CMS tables; facades only; AAL2 + active account;
edit / publish separation; XSS refused twice; links whitelisted; reserved
routes; anonymous reads only through snapshot facades; media eligibility
decided in the database, signing server-side; drafts never public; audit
without bodies.

## 56. Data safety

No destructive owner action: unpublish / archive instead of delete;
revisions kept; restore points before restore; aliases on rename; media
archive blocked while in use.

## 57. Content integrity

Tokens keep counts truthful; empty sections hide; provenance badges
derived from evidence class; live evidence / rights failures withdraw
content at read time (S4 invariant kept).

## 58. Performance notes

Snapshot reads, tag revalidation, no CMS JS in public bundles, images
capped at 2400px derivatives, lazy loading, focal-point crops instead of
duplicates.

## 59. Accessibility notes

axe serious = 0 public; editors keyboard operable (move buttons, labelled
groups, live status); preview bar and dialogs manage focus.

## 60. Local operations

`pnpm db:reset` → `node scripts/storage.mjs provision` →
`node scripts/website-seed-content.mjs` → clear the Next data cache if a
server was running. E2E: `pnpm exec playwright test <spec>` one batch at a
time (memory).

## 61. Test run table (2026-09-15, local production build, one suite batch at a time)

| Suite | Result |
| --- | --- |
| cr1-owner-cms (10) | PASS |
| s6a-public (6) · s9ap-public (6) · s9bp-public (13) | PASS |
| c7-settings (5) · s5a-admin (3) · c4-control-room (5) | PASS |
| d1-visual · s6a-project-populated | PASS |
| c8-intake (8) · c9-intelligence (6) · c5-finance (5) · c6-delivery (6) | PASS (c8 run alone: its "no purchase orders" assertion assumes a fresh database) |
| pgTAP 18 files / 1277 assertions (`db:test`) | PASS |
| `db:lint --fail-on warning` · `db:types:check` | PASS |
| vitest unit 157 · component 19 | PASS |
| prettier · eslint (0 warnings) · typegen + tsc · designmd lint · design tokens · scan-secrets · `next build` · `audit:public-bundles` | PASS |

## 62. Change control

Visual: WhatsApp green recorded under the design freeze's change control
(§7b); no other palette change. Functional freeze: exception limited to the
CR1 schema list; C4–C9 suites re-run as regression.

## 63. Handover

Owner surfaces: `/admin/website` (control center), `/admin/website/pages`,
`/admin/content/services`, `/admin/content/projects`,
`/admin/content/insights`, `/admin/website/media`,
`/admin/settings/website?section=navigation`, `/admin/website/footer`,
`/admin/website/globals`. Every editor explains itself; the control matrix is
the reference for "where do I change X".

## 64. Next

C10 — Hardening / release candidate (`RENZ_C10_HARDENING_BACKLOG.md`,
now including CR1 items #31–40). Not started.
