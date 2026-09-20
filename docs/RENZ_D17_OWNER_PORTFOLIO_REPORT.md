# RENZ D1.7 Owner Experience + Portfolio Completion Report

Date: 2026-09-20. Slice: D1.7 — final admin simplification, Staff Login
entry, alignment / readability repair, classic footer, media / motion
completion, Rwanda-context portfolio expansion (6 → 12), project galleries,
media differentiation, CMS control. Verified against a production build
(`next build`, Next.js 16.3.4) on `http://127.0.0.1:3100` with the local
Supabase stack.

**STOP after this report. C10 was not started. Nothing was deployed. Nothing
was pushed.**

## 1. Status

D1.7 PASS against §110, with the media portion honestly bounded: the
generative tool (Higgsfield, free plan, 10 credits) produced six distinct
heroes and four secondaries; the remaining gallery roles are sixty locally
drawn diagrams and labelled detail crops, and the production queue is
written down (§69). Every other gate — alignment, Staff Login, auth polish,
Admin language and layout, footer, twelve labelled studies, galleries,
lightbox, owner-managed media, dynamic counts, Project #13 through the Admin,
accessibility, performance controls, regression — is met.

## 2. Phase tracker

C1–C9 complete · CR1 complete · D1.5 complete · D1.6 complete · **D1.7
complete → FINAL PRODUCT FREEZE** (`docs/RENZ_PHASE_STATUS.md`) · C10 not
started · production release not started.

## 3. Git checkpoint

`f69790b chore: checkpoint d1.6 client art direction` — the repository's
first commit (797 files). Before committing: `.gitignore` inspected;
`graphify-out/` (137 MB generated) added to it; `.env.local`,
`.playwright/`, `supabase/.temp/` confirmed ignored; `.env.example` holds
placeholders only; `pnpm scan:secrets` passed (941 files); `git diff --check`
showed only Markdown hard-break whitespace. Not pushed. The D1.7 work itself
is uncommitted in the working tree (68 modified files + new files) for the
owner to review and commit.

## 4. Functional freeze compliance

Preserved: Manrope, navy / gold / limestone, Measured Track, plain-English
system, green WhatsApp system, Datum & Mass, CMS ownership, motion
architecture, poster-first video, accessibility foundations, responsive
architecture, all C1–C9 business systems. No framework change, no CMS
rebuild, no domain-semantics change. One migration
(`20260921100000_d17_owner_portfolio.sql`): the evidence class
`context_study` (constraint + the presentation RPC + the owner sitemap
label) and two copy republishes (globals Staff Login wording, Projects page
dynamic-count copy). Everything else is presentation, content and scripts.

## 5. Public alignment audit

Method: viewport-stepped captures stitched per route at 1440 and 390
(`scripts/d17-scroll-audit.mjs`; full-page captures are unreliable with
`svh` landings), read as tiles. Findings: (a) the process section was a
horizontal scroll-story with each panel's copy in the left 40 % and the right
60 % empty, plus clipped panels mid-transition; (b) the "Every service in one
line" list and five other lists sat at x = 0 because their CSS reset
`margin: 0` and killed `.container`'s `margin-inline: auto`; (c) the footer
was experimental (giant mark, field grid, wrapping email); (d) About's
two-project showcase left a lone portrait card in the left third; (e) the
projects index alternated giant single cards with empty halves; (f) the
footer utility row sat under the floating WhatsApp pill.

## 6. Alignment fixes

(a) Process **ledger**: sticky index rail 3/12 + two-column panels 9/12,
inside `.container`, scroll-spy, no hijack (`process-story.tsx`,
`final-pages.css`). (b) `margin-block: 0` for `service-lines`,
`insight-grid`, `people-register`, `service-related-list`,
`service-sequence`, `study-gallery-grid`, `testimonial-list` — the centred
shell now holds everywhere; the rule is frozen in `RENZ_DESIGN_FREEZE.md`
§7d. (c) Footer rebuilt (§12). (d) A single follower card renders as a wide
landscape at 3/12 → span 8. (e) Tile rhythm index (§35). (f) Utility row
keeps `clamp(0, 12vw, 14rem)` clear of the pill; mobile adds bottom padding.

## 7. Public readability

Body 17–19 px at 1.6 (unchanged), tile meta 0.88 rem, gallery captions
0.92 rem, mono labels ≥ 0.62 rem only for technical index marks. The copy
audit from D1.6 still holds (avg 6–10 words per sentence). New copy written
to the guide: twelve nine-chapter studies, gallery captions, Admin wording.

## 8. Staff Login entry

Footer utility row on every public page: **Staff Login** with the note
"RENZ team access"; mobile navigator: **Staff Login** at the bottom of the
contact block. Both → `/admin/sign-in`. Wording is owner-editable global
copy (`staff_signin_label`, new `staff_signin_note`), republished by the
migration. Tested from Home on desktop and mobile in the S6A/S9B-P suites'
navigation flows and by hand.

## 9. Staff Login security

Unchanged: password + MFA (TOTP), RBAC permissions, RLS, session handling,
no public sign-up. The link only exposes a route that already existed.

## 10. Sign-In polish

Composition preserved (two zones, Control Room identity, steps, security
language). Refined: head, form and support share one centred `27rem`
column; the heading balances ("Sign in to the / Control Room"); the survey
marks on the drawing breathe one at a time (`auth-pulse`; off under reduced
motion); no video. "Operational workspace" → "Sites and progress" in the
module grid.

## 11. MFA polish

Same shell, same refinement (the MFA page uses `AuthShell`); OTP cells and
logic untouched. Captured at 1440 and 390.

## 12. Footer redesign

Classic four columns: brand mark + "From land to landmark." + one-sentence
statement + Start a Project · Services · Company · Contact (email, green
WhatsApp pill, "Messages only" note, location/hours only when real, social
when published) · utility row (©, Privacy, Terms, Cookies, Staff Login +
note, Back to top). Deep navy, thin rules, small gold labels, Manrope. No
giant mark, no field drawing, no huge empty space. Mobile: 2 columns → 1.

## 13. Footer dynamic data

Services from the published register (five today, a sixth appears
automatically); Company from the owner's navigation; owner footer groups
still render as extra columns; headline / statement / labels / toggles from
Website → Footer; Staff Login label + note from Website → Globals.

## 14. WhatsApp verification

`wa.me` links only (header glyph, floating pill, footer pill, navigator,
CTAs); zero `tel:` links (asserted by S6A); green kept to the glyph, the
floating pill and the footer pill — the footer is not half green.

## 15. Admin copy audit

Scripted audit of user-visible strings in `src/app/admin` and
`src/features` for developer words (facade, entity, invalidate, projection,
version conflict, restricted workspace, dataset, RLS, schema, localization,
locale, BCP 47, RPC, sort order, register …). Most were already plain; the
hits were replaced (§16). No database or domain identifiers were renamed.

## 16. Admin labels changed

"Restricted workspace" → "Your business today"; "Services register / Case
studies register / Insights register" → "Services / Website projects /
Insights"; "Locale" → "Language" (+ "Language of the text. English (en) for
now."); "Sort order" → "Order on the website"; "Schema" → "Format";
"Version conflict / Reload the authoritative version?" → "Someone else saved
first / Load the latest version?" with "This record changed while you were
editing…"; the two save-conflict messages → "Someone else updated this
record while you were editing. Your entries are kept — load the latest
version, then save again."; empty states → "No projects yet / Create the
first project." (and the same for services, operational projects, client
projects); media workspace → "Where this image comes from", "Role in the
gallery", "Alt text (describe the image)", "Shown on the website / Not on
the website yet", "Confirm rights & show on website", "Confirm as generated
concept visual", "Add an image"; nav descriptions in plain words.

## 17. Admin shell

Navigation regrouped for an owner: Overview · Work (Leads, Clients,
Projects) · Delivery (Contractors, Materials, Suppliers, Purchase Orders) ·
Money (Finance, Invoices, Contractor Payables) · Website (Website, Services,
Projects, Insights, Media) · Business (Notifications, Analytics) · System
(Settings, Launch Readiness, Security). Same routes, no duplicates; unit
tests updated. The squashed metric sub-labels ("0highpriority·0clients")
were inheriting −0.04 em tracking — fixed.

## 18. Admin alignment

The workspace already used a centred `min(100% - 3rem, 76rem)` container
(`globals.css`); an experiment to widen it was reverted. Two S5C surfaces
had never been styled and rendered as raw text: the Website → Projects list
(now the same register pattern as Services) and the project editor (tabs,
chapters, services checklist, gallery workspace) — both styled in
`website-cms.css`.

## 19. Admin forms

Project editor: pill tabs (Overview · Story · Services · Media · Website
placement · Publication), grouped fields, chapters as numbered cards, the
upload form behind "Add an image" so the gallery order is read first, plain
labels and help text. Placement form explains promotion. Long forms keep
their sections/tabs.

## 20. Admin tables

Website → Projects list fixed (was an unstyled column). The lists keep the
desktop grid / mobile card pattern.

## 21. Admin mobile

Captured at 390: sign-in, MFA, overview (metrics 2-up), drawer (grouped
IA), project editor (tabs wrap, gallery cards stack), invoices, website
pages (stacked cards). No squeezed desktop tables.

## 22. Admin accessibility

Tabs use `aria-current`; the disclosure is a native `<details>`; every
control keeps its label; focus-visible rings on tabs, summary and gallery
controls; the media cards' thumbnails are decorative (`alt=""`) with the
role/caption in text. S5A / C4–C9 suites (which include admin axe passes
where written) stay green.

## 23. Existing Project audit

Ridge Residence, Courtyard House, Urban Workspace, Lake Retreat, Community
Pavilion, Industrial Campus: categories normalised (Residential ×2,
Workplace, Hospitality, Community, Industrial), each given a seven-piece
gallery (hero, labelled detail crop, site diagram, plan study, section study,
material study, construction sequence study), chapters unchanged. Their
heroes are 1586 × 992 px (D1 renders) — flagged in §68.

## 24. New Project 07 — Kigali Infill Apartments

Mixed Use · "Kigali context study" · Rwanda context concept study. Hero:
eye-level, overcast late morning, dense hillside street, brick and
board-marked concrete, deep balconies, motorcycle taxis (3:4, 2688 × 3584).
Secondary: living room and shaded balcony. Nine plain chapters. Featured.

## 25. New Project 08 — Musanze Highlands Lodge

Hospitality · "Musanze context study". Hero: misty early morning, volcanic
stone bases, timber, pitched roofs, courtyards, volcano in haze (16:9,
4096 × 2304). Secondary: lounge with the fire lit. Featured.

## 26. New Project 09 — Bugesera Logistics Hub

Industrial · "Bugesera context study". Hero: midday drone view, strong
equatorial light, long steel / precast halls, loading bays, trucks, red
earth, acacia buffer. Secondary: construction stage (portal frame, crane,
precast panels) — captioned as a generated concept, never site footage.
Featured.

## 27. New Project 10 — Huye Learning Courtyard

Education · "Huye context study". Hero: from inside a brick arcade across a
courtyard with one big shade tree, dappled daylight. Secondary: brick
ventilation screen and timber louvre detail.

## 28. New Project 11 — Rubavu Lakeside Residences

Residential · "Rubavu context study". Hero: soft golden-blue late
afternoon, terraces of lime-plaster homes stepping to Lake Kivu, stone walls,
pergolas. Labelled detail crop + diagrams.

## 29. New Project 12 — Rwamagana Production Yard

Industrial · "Rwamagana context study". Hero: blue hour, sawtooth halls
glowing, brick admin block, wet loading yard, banana buffer. Labelled detail
crop + diagrams.

## 30. Rwanda-context evidence policy

Three explicit classes: **Case study** (real_project — reviewed evidence,
RENZ / client photographs, generated media refused), **Rwanda context
concept study** (`context_study`, new), **Concept study** (plus the earlier
Experience study). Labels print on every card, the film strip, the detail
hero, the sticky plane, every gallery frame and the lightbox. Location
wording is "<District> context study"; no addresses, no landmarks, no flags,
no signage, no project boards, no RENZ branding on buildings (the prompts
forbid text and logos). No internet photograph of any real building was
used.

## 31. Media-generation tools available

Higgsfield CLI 1.1.26 (set up this session: `higgsfield auth login`, workspace
"Private", free plan, 10 credits, one concurrent job). Models available; used
Seedream 5.0 Lite at quality high (1 credit per image). Also available:
Playwright, sharp, the bundled ffmpeg (VP8 only). Not available: paid credits,
Computer Use.

## 32. Generated media

Ten images, all 1 credit each, all recorded in
`public/media/renz-preview/projects/d17-generation-manifest.json` (job id,
seed, size, prompt, time) and `docs/RENZ_D17_MEDIA_PROMPTS.json`: six heroes
(07–12) + four secondaries (Kigali interior, Musanze interior, Bugesera
construction stage, Huye brick detail). Converted to WebP ≤ 2400 px
(241–1056 KB). Credits now 0. Plus sixty diagrams drawn by
`scripts/d17-diagrams.mjs` (site, plan, section, materials, sequence × 12)
and eight labelled detail crops.

## 33. Licensed/context media

None used. No licensed Rwanda photography was available; the brief's
"LICENSED CONTEXT IMAGE" class is therefore not introduced (it would be a
schema change without content) — noted in the gallery guide.

## 34. Media provenance

Every gallery item: `provenance_class = generated_reference`, rights holder
"RENZ Construction Services Ltd (generated concept visual)", rights source
naming the tool + job (or "drawn by the RENZ website team" / "detail crop"),
role, alt text, caption. The public page prints "Generated concept visual /
not RENZ project evidence" on each item; client photos would print "Client
supplied", RENZ records "RENZ project record".

## 35. 12-project index

Landing: featured film strip (owner `featured`, ≤ 6; six today). Below: the
tile rhythm grid — large · half · half · wide + portrait · third × 3 —
repeating, so twelve never read as twelve identical cards and thirteen
continues the rhythm; every tile carries its label, index, title, category ·
context · materials. Mobile: stacked. Count line and masthead are
data-driven ("Explore 12 project studies.", "Twelve places, twelve different
answers.", "12 of 12 project studies · none is a completed RENZ project").

## 36. Dynamic filters/categories

Filters derive from the published `project_type` values: All 12 ·
Industrial 3 · Residential 3 · Hospitality 2 · Community 1 · Education 1 ·
Mixed Use 1 · Workplace 1 — coherent, no duplicates; horizontal scroll on
mobile; `aria-pressed` buttons.

## 37. Existing-project galleries

Seven pieces each (§23), attached through the same RPCs the Admin uses, via
`node scripts/website-seed-content.mjs --galleries` (idempotent; re-runnable
after a database reset — the E2E global setup now seeds all twelve).

## 38. New-project galleries

Seven pieces each: hero + (secondary or labelled crop) + five diagrams.

## 39. Gallery lightbox

`project-gallery.tsx` — native `<dialog>` (platform focus trap, Escape),
previous / next / close, index "03 / 07", caption, role label, evidence
badge, thumbnail strip, ink background, minimal chrome. No library added.
Content renders only while open, so nothing full-size loads until requested.

## 40. Gallery keyboard/touch

← / → navigate, Esc closes, Tab stays inside the dialog, buttons ≥ 2.75 rem;
pointer swipe (48 px, horizontal-dominant) navigates; arrows hide below
40 rem where swipe takes over. `#gallery-N` reopens an item (deep link).

## 41. Project Detail redesign

Hero (identity + evidence class + facts) → story chapters with a sticky
plane that changes per chapter (context for "The site", interior for
"Design", section/plan for "Structure", sequence for "Construction plan",
detail for "Materials") → inline sequences after "The site" and "Materials"
→ drawing ↔ built comparison → full gallery → related services → related
studies (same category, then shared service; three tiles) → next study →
Start a Project CTA. Optional chapters and empty groups hide cleanly.

## 42. Project media differentiation

Deliberately varied: overcast street (Kigali) · misty highland morning
(Musanze) · hard midday drone (Bugesera) · dappled brick courtyard (Huye) ·
soft lakeside afternoon (Rubavu) · blue hour industrial (Rwamagana); camera
heights eye-level, elevated, drone, inside an arcade, terrace level, low
yard; materials brick / volcanic stone / steel-precast / brick / plaster-stone
/ steel-brick; urban dense, forest, open flat, campus, lake slope, farmland.
No sunset repeats.

## 43. 12-hero comparison

Side-by-side sheets were reviewed (`.playwright/d17-gen/sheet.jpg`,
`sheet2.jpg`, the index captures). No two of the twelve could be mistaken for
the same building; the original six remain the most alike in mood (warm
late light) — flagged for re-rendering in the queue, not a blocker.

## 44. Project video treatment

Supported (role `video` + `video_poster`, poster-first, `controls`, muted,
`preload="metadata"`, never autoplay with audio) in the gallery and lightbox;
no project video exists yet and none was faked.

## 45. Diagram assets

`scripts/d17-diagrams.mjs`: per-study geometry (site type, footprint
blocks, courtyard, levels, roof form, ground profile, four named materials,
five construction stages) rendered as Datum & Mass sheets — site diagram
(contours / street / lake edge, access, north), plan abstraction (grid A–F,
hatch, entrance, one dimension), section (ground, levels, roof, datum),
material palette (swatches + study shares), construction sequence (five
frames). Each carries "GENERATED CONCEPT DIAGRAM · NOT PROJECT EVIDENCE".

## 46. CMS gallery controls

Website → Projects → Media: thumbnails, role (01 Hero … 08 Dusk + video and
S5C roles), caption, alt text, decorative flag, chapter link, Move up / Move
down (persisted), Remove, Confirm (rights for photographs; "Confirm as
generated concept visual" for studies), "Add an image" upload with "Where
this image comes from" including "Generated concept visual (never evidence)".
Set hero = give an image the 01 Hero role. Focal point stays in Website →
Media (per asset). A real project cannot confirm generated media (RPC +
UI). Fixed on the way: attaching an upload > 1 MB failed because the file
was re-sent to the server action.

## 47. Owner Project #13 test

`scripts/d17-owner-test.mjs`, Admin UI only, no source edits: create draft →
overview (summary, type, "Huye context study", SEO) → chapter → related
service → placement (Rwanda context concept study) → six uploads
(hero + 5) each confirmed → reorder (Move up) → mark reviewed → publish.
Public: index "13 of 13 project studies", tile visible, detail route with
title, 6 gallery frames, lightbox opens / ArrowRight → "02 / 06" / Escape
closes, 1 related service link, mobile render. Screenshots in
`.playwright/screenshots/d1-7/owner-test/`.

## 48. Project archive/unpublish test

Same script: Archive → public route answers 404, index back to 12, the Admin
record still opens (archived), media rows intact (restrict FKs). The CR1
E2E additionally proves unpublish → 404 → republish.

## 49. Dynamic project count

`{{projects.concept_count}}` / `_words` tokens drive the Projects masthead,
the studies heading, the count line and the film strip; the E2E suites now
assert 12 / 13 / 12 across publish and unpublish. No hard-coded "six"
remains in public copy or code.

## 50. Service compatibility

Service ↔ study links extended (each service now relates to 4–5 studies);
service pages take their poster from the lead study; a sixth service would
inherit the same. The Design and Consultations landings now show the lead
study photograph muted under their drawing (split-plane poster).

## 51. Home media

Unchanged Home loop (poster-first); the process section is now the ledger;
showcase compositions balanced; CTA → footer transition tight.

## 52. Service media

Design: drawing over photo; Executions / Hybrid / Supervision: existing
posters + scenes; Consultations: drawing over photo; Services index: stages
scene (the owner can add a Hero image in the CMS).

## 53. About media

Two-project showcase balanced (monument + wide landscape); the how-we-work
scene; no fake team portraits, no invented staff.

## 54. Insights media

Unchanged editorial system (drawing-board landing, article drawings); no
animation demo added.

## 55. Contact media

Direct-line poster + calm scene retained; WhatsApp / email / Start a Project
unburied; footer contact column adds a second path.

## 56. Start Project media

Wizard unchanged; first-brief scene; footer CTA below.

## 57. Page ending/CTA audit

Every major page ends with a CTA or related content, then the compact
footer; the previous large empty zone before the footer is gone (the footer
lost its 7 rem top padding and giant mark).

## 58. Reduced motion

Ledger rail transitions, narrative plane crossfade, auth pulse, tile
reveals: all have final static states under `prefers-reduced-motion`; the
lightbox and gallery are fully usable without motion. The S6A reduced-motion
+ axe test passes.

## 59. Public responsive

1440 (`scroll-1440`, `scroll2-1440`, `scroll3-1440`) and 390 (`scroll3-390`)
stepped captures for home, services, design, consultations, projects,
project detail, about, insights, article, contact, start; no horizontal
overflow (D1 visual suite asserts it at every viewport it covers); 320 px
reflow covered by S9B-P.

## 60. Admin responsive

390 captures (`admin-390`): sign-in, MFA, overview, drawer, project editor
(media tab), invoices, website pages. 1440 (`admin-1440`, `admin2-1440`):
sign-in, MFA, overview, leads, clients, projects, finance, invoices,
analytics, website, pages, content projects, project editor, media,
settings, staff.

## 61. Performance

Controls added: 960 px WebP thumbnail child per upload
(`?size=thumb`) for cards, strips, gallery grids and the narrative planes;
the full derivative only for the hero plane, the large tile and the lightbox;
lazy loading for every non-first tile; one priority image per page; lightbox
content not rendered until open; split-plane posters at 50 vw; no
cross-route preload. Assets uploaded before D1.7 fall back to the full
derivative until re-ingested (backlog 47).

## 62. Media byte report

Repository sources (`public/media/renz-preview/projects/`): 12 heroes 5.4 MB
in total (the six D1 renders ≈ 0.4 MB each at 1586 px; the six new
0.24–0.72 MB at ≤ 2400 px); secondaries, crops and sixty diagrams 5.9 MB
(diagrams ≈ 45 KB each; generated secondaries 0.5–1.06 MB). Ingested
thumbnails: 84 children, average 42 KB (9–279 KB). Video: the D1.6 Home loop,
1.17 MB.

Measured on the production build (`scripts/d16-measure.mjs`, network
bytes): `/projects` 1440 → images 1.77 MB (18 thumbnails + the landing
poster + the large tile at full size), JS 230 KB, LCP 0.7 s; `/projects`
390 → images 1.03 MB (the large tile switches to its thumbnail via
`<picture>`); `/projects/kigali-infill-apartments` → images 742 KB (hero
full + planes and gallery thumbnails), JS 226 KB; Home unchanged (833 KB
images + 1.17 MB loop on desktop, 285 KB poster only on phones). Flagged:
the 1056 KB Huye detail WebP (re-encode at quality 76) and the film strip +
tile duplication of six thumbnails (browser-cached, one request each).

## 63. Accessibility

axe (WCAG 2.2 AA tags) across the public routes and open navigation:
0 serious/critical (S6A + S9B-P). Lightbox: native dialog, labelled
buttons, live index; gallery frames are buttons with full labels; filters
`aria-pressed`; Staff Login is a plain link; footer landmarks named; Admin
tabs `aria-current`; contrast unchanged (ink / paper / ochre labels).

## 64. Public regression

`s6a-public` 6/6 · `s9bp-public` 14/14 (matrix extended to twelve studies +
gallery count) · `d1-visual` 5/5 · `cr1-owner-cms` 10/10 (selectors updated
for the new labels, tile count 13 → 12, ledger rail) · `c8-intake` 8/8. Two
flakes on first runs (an `ERR_NO_BUFFER_SPACE` navigation, an unpublish
timing) passed on rerun.

## 65. Admin regression

`s5a-admin` 3/3 · `c4-control-room` 5/5 (IA assertion updated to the owner
groups) · `c5-finance` 5/5 · `c6-delivery` 6/6 · `c7-settings` 5/5 ·
`c9-intelligence` 6/6. All admin suites pass on the regrouped navigation
and renamed labels.

## 66. Owner CMS regression

`cr1-owner-cms` 10/10 plus the D1.7 owner script (§47–48). Static: prettier
✓, eslint (0 warnings) ✓, `tsc --noEmit` ✓, vitest 25 files / 177 tests ✓,
design tokens ✓, secret scan ✓ (after removing the synthetic E2E fixture
file), `next build` ✓.

## 67. Surprise-me changes

1. Narrative planes that follow the chapter (context → interior → drawing →
   sequence → detail) so the story reads like a site visit.
2. Deep-linkable lightbox items (`#gallery-3`) for sharing one drawing.
3. "Related studies" by category then shared service, so every detail page
   ends with a next move.
4. Drawing-over-photo split landings (Design, Consultations).
5. Numbered gallery roles in the Admin (01 Hero … 08 Dusk) so the owner sees
   the intended order while uploading.
6. Breathing survey mark on the sign-in drawing.

## 68. Remaining visual defects

- The six D1 heroes are 1586 × 992; their detail crops are soft in the
  lightbox.
- The narrative sticky plane loads all distinct chapter planes (≤ 6 thumbs)
  when it enters view — acceptable, but a `sizes`-driven variant set would
  trim it (backlog 48).
- The Admin sitemap type label for archived studies still reads from the
  function CASE (kept in sync manually; backlog 52).

## 69. Remaining media-production gaps

Photographic secondaries for studies 01–06, 11 and 12 (exterior, interior,
detail, dusk); higher-resolution re-renders of the six D1 heroes; optional
dusk / video loops per study; MP4 / mobile sources; real footage for the
D1.6 hero queue. All listed in `docs/RENZ_HERO_MEDIA_CONTACT_SHEET.md`; the
prompts and manifest make the generated set reproducible.

## 70. C10 readiness

Ready: FINAL PRODUCT FREEZE recorded; backlog items 47–53 added; owner
guide, freeze §7d, navigation and plain-English guides updated; scripts for
the owner test, admin/public captures and diagram/media generation in
`scripts/`. Not started: C10, deployment, push.

**STOP. DO NOT START C10. DO NOT DEPLOY.**
