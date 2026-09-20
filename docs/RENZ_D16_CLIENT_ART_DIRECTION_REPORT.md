# RENZ D1.6 Client Art Direction Report

Date: 2026-09-19. Slice: D1.6 — client final art direction (public site only).
Build verified: `next build` (Next.js 16.3.4, `RENZ_CLIENT_PREVIEW=true`),
served on `http://127.0.0.1:3100` against the local Supabase stack.

**STOP after this report. C10 was not started. Nothing was deployed. Nothing
was committed** (the repository still has no commits; committing is the
owner's call).

## 1. Status

Complete within the tools that actually exist on this machine. Every public
route was rewritten in plain English and stays owner-editable, the RENZ
Measured Track navigation replaced the old header/menu, every major route has
its own landing concept, the poster-first video engine and CMS video
ingestion are in, motion and microinteractions are frozen, and the bounded
public regression passes. Two brief items could not be done as written and
are recorded honestly: no Higgsfield (or any generative media tool) was
connected, and the bundled ffmpeg encodes VP8/WebM only (§33–35, §37).

## 2. Client requests satisfied

| Request | Result |
| --- | --- |
| Whole public site in much easier English, owner-editable | Done — pages (revision 2), services / studies / insights (content revision 2), forms, labels, errors, legal, 404 |
| Unique navigation inspired only by the Kamba principle | Done — RENZ Measured Track (§14–18) |
| Unique cinematic landing per major route | Done — sixteen concepts, one per route family (§19–32) |
| Poster-first video with fallbacks, no cross-route preload | Done (§37–39) |
| Higgsfield media as generated concept only | Tool not available; one rendered concept loop, labelled (§33–36) |
| Typography audition → one family | Done — Manrope (§11–13) |
| Scroll motion without hijacking, microinteractions, page personality | Done (§40–42) |
| Surprise-me ideas (up to seven) | Five shipped (§51) |
| CMS stress tests (6/8 nav links, Service #6, 7–12 studies, media replacement) | Done (§44–47) |
| Pixel reviews 1440/390/768/1920, axe / WCAG 2.2 AA, performance record | Done (§48–50) |
| Freeze + guides + contact sheet + screenshots + regression | Done (§52–56) |
| Do not copy Kamba; no fabricated facts; WhatsApp messaging only; admin untouched; DB freeze | Respected — two function/gate-only migrations (§44) |

## 3. Tools/plugins actually used

Used: Playwright 1.63 (Chromium) for every screenshot, pixel review, axe run
(`@axe-core/playwright` inside the E2E suites), LCP/bytes measurement and the
CMS stress fixtures; the screenshots were read back as images; `WebSearch`
(two queries, §4); the Playwright-bundled ffmpeg (VP8/WebM, `image2pipe`
MJPEG input only) plus `sharp` for the rendered loop; vitest, eslint,
prettier, `tsc`, `next build`; Supabase CLI 2.116.0 (local stack, ports
56230–56236) and Docker for the migrations; `scripts/scan-secrets.mjs`,
`designmd lint`, `scripts/design-tokens.mjs`.

Not available (not hallucinated, not simulated): Higgsfield, Computer Use,
Exa, Context7, any MCP server, Lighthouse. Substitutes: Playwright
screenshots for visual review, `PerformanceObserver` LCP in `d16-measure.mjs`
for performance, a rendered "living still" for the home loop.

## 4. Reference research

Two `WebSearch` queries (2026-09-19): "best architecture studio websites 2026
navigation hero video scroll storytelling awwwards" and "construction company
website design 2026 clear plain language navigation examples … header
pattern". Sources read as summaries: siiimple.com architecture category,
utsubo.com storytelling guide, colorlib, contractorgorilla, hontran.dev,
webcitz, diversekit, pravaahconsulting; the second query surfaced studio-site
header patterns (whitelam.media, nakadadesign.com and large-practice sites).
Take-aways applied: one hero, one line, one action; a portfolio read as a
continuous, paced scroll; restrained type with technical labels; navigation
that stays quiet until it is needed. Kamba's site was not fetched; its
principle came from the brief.

## 5. Kamba principles adopted

Logo on the left, a centred navigation track, one unmistakable active state,
actions separated on the right, the track framed as a single capsule, and a
header that stays legible over any hero.

## 6. Kamba elements intentionally NOT copied

No Kamba colours, radii, iconography, wording, hover behaviour, layout
proportions or assets. RENZ adds what Kamba does not have: index numbers on
every route, a gold measuring plate with a datum tick, a hover preview mark
that travels ahead of the plate, a reading-progress datum under the header,
a services "sheet" mega panel, "More" overflow for owner-added pages, and a
full-screen mobile navigator with a travelling rail.

## 7. Plain-English strategy

Target reader: a client with everyday English (≈B1) on a phone. Rules in
`docs/RENZ_PLAIN_ENGLISH_GUIDE.md`: short sentences (aim ≤ 12 words), one
idea per sentence, verbs over nouns, "you" and "we", construction words kept
but explained the first time, one brand line — *From land to landmark* —
always followed by its plain explanation, buttons that say what happens
next. The wording lives in content, never only in JSX: pages as
`website_pages` revision 2 (migration `20260920100000`), services / studies /
insights as content revision 2 (`scripts/website-seed-content.mjs
--rewrite-copy`); the few JSX strings that remain are labels, errors and
form help. A bounded audit (`scripts/d16-copy-audit.mjs`) reports sentence
length and flagged words per route.

## 8. Pages rewritten

Home, Services index, Design, Executions, Hybrid Service, Supervision,
Consultations, Projects index, all six concept studies, About, Insights index
and all three articles, Contact, Start a Project (all steps, labels, help,
errors, success), Service enquiry, Material enquiry, Privacy, Terms, Cookies,
404 and the error boundary; the header, mega panel, mobile navigator and
footer; the intake public vocabulary (`publicNeedLabels`,
`publicProjectTypeLabels`, `publicCurrentStageLabels`, plain step labels).

## 9. Before/after copy examples

| Before | After |
| --- | --- |
| "RENZ designs, builds and supervises buildings from the first survey to handover — with drawings a builder can price, checkpoints a client can trust, and one team accountable for the result." | "RENZ helps you plan, design, build and supervise your project — from the first idea to final handover." |
| "Architecture-led construction" (kicker) | "Construction services" |
| "Measured before drawn" / "One set of drawings, priced by everyone" / "Checkpoints, not surprises" / "Honest scope" | "We measure before we draw" / "One set of drawings for everyone" / "Checks at every stage" / "Honest advice on scope" |
| "Bring the first condition into focus." (CTA heading) | "Tell us what you need" / "Describe the site and size" / "Get a reply from RENZ" |
| "Understand — A first conversation about the place, the purpose, the budget band and the timeline — and what you already have: land, sketches, a contractor, approvals." | "Understand — A first conversation about your site, what you want to build, your budget range and your timeline. Tell us what you already have: land, sketches, a builder, approvals." |
| "Explore services" | "See our services" |

Audit (production build, 18 routes): average sentence length fell from
10.6–12.2 words to 6.4–10.7; long sentences per route from up to 5 to ≤ 2;
flagged words per route from up to 25 to ≤ 4.

| Route | Before avg / long / findings | After avg / long / findings |
| --- | --- | --- |
| / | 10.6 / 5 / 25 | 9.3 / 1 / 3 |
| /services | 11.5 / 2 / 13 | 8.4 / 0 / 2 |
| /services/design | 12.1 / 3 / 7 | 9.5 / 2 / 2 |
| /services/hybrid-service | 11.4 / 4 / 9 | 8.9 / 1 / 2 |
| /about | 11.5 / 3 / 12 | 8.7 / 1 / 3 |
| /contact | 9.2 / 3 / 9 | 7.8 / 1 / 4 |
| /insights/preparing-a-clear-construction-brief | 12.2 / 3 / 6 | 10.7 / 2 / 4 |
| /start-a-project | 7.2 / 0 / 0 | 6.4 / 0 / 0 |

## 10. Remaining technical language

Kept on purpose, each explained where it first appears: "supervision",
"drawings", "site survey", "handover", "programme" (explained as "the
schedule"), "approvals". Remaining findings in the audit are mostly proper
nouns and these kept terms. The intake "What you need" options still come
from the C8-protected vocabulary (C10 backlog item 36). Legal pages keep the
words the law needs, with a plain summary above them.

## 11. Typography audition

`scripts/d16-font-audition.mjs` rendered the live home hero (1440 and 390)
and a body-copy page in Poppins, Manrope and Plus Jakarta Sans against the
then-current Archivo/Source Sans 3 (`.playwright/screenshots/d1-6/typography/`).
Judged on: headline mass at 5 rem, readability of 17–19 px body at 1.6, how
the mono technical labels sit beside it, and file weight. Poppins: geometric,
friendly, but its round "a/e" fought the mono labels and read soft for a
builder. Plus Jakarta Sans: close second, slightly wider body, heavier file.
Manrope: tight negative tracking at display sizes, narrow enough body, one
variable file.

## 12. Selected font

**Manrope** (variable 200–800, latin subset, 55 KB, `src/fonts/manrope.woff2`,
OFL — recorded in `src/fonts/LICENSES.md`), self-hosted via `next/font/local`
as `--font-sans`. IBM Plex Mono stays for tiny technical labels only.
Archivo and Source Sans 3 were removed. `DESIGN.md` and
`design-tokens.generated.css` updated (`pnpm design:tokens:check` passes).

## 13. Typography system

`src/styles/final-base.css`: `--step-0` clamp(1.0625rem, 1rem + 0.3vw,
1.1875rem) body at line-height 1.6; `--step-5` clamp(2.4rem, 1.6rem + 3.4vw,
4.2rem) section titles; `--step-hero` clamp(2.6rem, 1.5rem + 4.8vw, 5.4rem)
for the home headline only; headings weight 700, letter-spacing −0.03 em;
`.datum-label` / `.index-mark` in mono, 0.7 rem, 0.12 em tracking. The admin
stylesheets (`globals.css`, `documents.css`) point their font variables at
the same family so nothing loads twice.

## 14. Navigation concept

The **RENZ Measured Track** (`src/components/site/nav/*`, `final-nav.css`,
`docs/RENZ_NAVIGATION_SYSTEM.md`): brand left, a centred capsule track of
numbered routes from the owner's navigation settings, WhatsApp glyph and the
"Start a Project" CTA right. Over a hero the header is transparent; after
32 px of scroll it becomes a solid ink bar (`data-scrolled`) with a
reading-progress datum beneath it. The track measures itself: routes that do
not fit (`.public-header-inner` width minus brand and actions minus 96 px)
fold into a "More" disclosure.

## 15. Active-route animation

A gold measuring plate (`.nav-plate`: 16 % gold fill, datum tick, 2 px
underline) sits under the current route. On route change the plate's x and
width are Motion values animated with a spring (stiffness 420, damping 38,
mass 0.6) — it slides along the track like a scale reading, never jumps.
Reduced motion sets the values instantly. The current item also carries
`aria-current="page"` and a bolder weight so the state does not depend on
colour.

## 16. Hover/focus motion

A lighter preview mark (`.nav-preview`) travels ahead of the plate to the
hovered or focused route and returns when the pointer leaves; the plate
stays on the real route so the user never loses their place. Arrow keys,
Home and End move focus along the track; the preview follows focus. Focus
rings use `--focus` at 2 px offset.

## 17. Services mega menu

Hovering or focusing "Services" opens an architectural sheet under the
header (`services-mega-panel.tsx`): 01 the service index (↑/↓, Escape), 02
what the highlighted service does, 03 what it includes (first four items),
"You receive" (first deliverable), 04 one related study image with its
provenance badge, then "View {service}" and "Ask about this service". The
panel is built from the published services register, so a sixth service
appears without code. Hover intent: opens on enter, closes 160 ms after
leave, closes immediately on route change or Escape; while it is open the
preview mark stays on Services. It is `inert` when closed and lives inside
the `<nav>` landmark.

## 18. Mobile navigation

Below 64 rem the track collapses to "Menu", which opens a full-screen
`<dialog>` ("RENZ / Navigation"): Close is focused first, Tab is trapped,
Escape and the backdrop close it, the page behind is inert. Routes are
numbered at display size with a travelling gold rail that follows the
focused row (Motion values), a background field per route, an expandable
Services group ("Show services"), the contact links (WhatsApp, email) and a
sticky solid-ink footer with the brand line and the CTA. Rows assemble in a
staggered 480 ms sequence; reduced motion shows the final state.

## 19. Home landing

Concept **land** (`LandScene`), full height: the Ridge Residence concept
image (poster) with the rendered loop over it, the survey datum drawing
itself from the right edge — station mark "SP-01", a vertical, two survey
rectangles and the ground datum "DATUM 00.00" that stops short of the copy
column so it never crosses the CTA row. Headline "From land / to landmark."
with the gold full stop, one plain summary, two actions, a fact rail
(services, who we work with) and the "Concept visual / not project evidence"
badge. The datum hands over to the first section below (`.landing-handover`).

## 20. Services landing

Concept **stages**, tall, split plane: the five stages drawn as a measured
row — plan, build, check, advise marks on one datum — with "Services for
every stage of your project." and a plain line under it. No media: the
drawing is the picture.

## 21. Design landing

Concept **drawing-form**: a plan drawn line by line becomes a form — the
sheet, dimension strings, then the mass filling in. Copy: what Design does
in one line, "Ask about this service" + "Start a Project".

## 22. Executions landing

Concept **plan-build**: a plan converts to a build sequence — hatch fills
arriving stage by stage with a pulsing "POUR 03" mark, over the Urban
Workspace study poster.

## 23. Hybrid landing

Concept **split-morph** (`SplitMorphOverlay`): a moving datum splits the
drawing plane from the built photograph; it drifts on a slow spring and
follows the pointer, so the same building is seen half as drawing, half as
built. Reduced motion holds the split at 56 %. The drawing sits right of the
copy column (ground datum from x = 560) so nothing crosses the title or CTAs.

## 24. Supervision landing

Concept **checkpoints**: a site line with checkpoints that light in
sequence — measured, inspected, recorded — over the Ridge Residence poster.

## 25. Consultations landing

Concept **site-decision**: contour lines, a site boundary and a decision
mark; the drawing resolves from "site" to "decision".

## 26. Projects landing

Concept **film-archive** (`FilmStrip`): a gate frame that auto-advances
every 4.2 s (paused on hover, focus and reduced motion) above an indexed
strip of the published studies; strip items are links with `aria-current`.
Below 64 rem it becomes a three-column grid of at most six frames.

## 27. Project detail landing

Concept **project**, media-driven: the study's own hero fills the plane;
real projects use their `hero` / `video_poster` + `video` roles. Chapters
read "The brief … Final idea" in plain English; concept studies carry the
"Concept study / not project evidence" badge at the top.

## 28. About landing

Concept **how-we-work**: one datum with four stations — 01 plan, 02 build,
03 check, 04 advise — drawn under "One team from planning to handover." with
the company and services facts.

## 29. Insights landing

Concept **drawing-board**, editorial height: copy on a drawing-board plane
(sheet corner marks, a title block), no media, so the articles are the
picture.

## 30. Contact landing

Concept **direct-line**, compact: one straight line drawn from the copy to
the contact panel over the Industrial Campus poster — "one message, one
line back".

## 31. Start Project landing

Concept **first-brief**: a brief sheet drawing itself (title block, three
numbered rows) above the wizard; steps renamed in plain English ("What you need", "Your project", "Size",
"Timing and budget", "Files", "Your details", "Check and send").

## 32. Service/Material enquiry treatment

Lighter: **service-cue** (a single cue line over the study image) and
**material-register** (a small register drawing), standard height, so the
form is reached within one screen on a phone. Forms load through a client
boundary (`intake/lazy-forms.tsx`) so routes without a form do not carry
them.

## 33. Higgsfield assets generated

None. Higgsfield was not connected to this session; no generated stills or
footage exist. The prompt principles the client asked for are written down in
`docs/RENZ_CINEMATIC_MEDIA_GUIDE.md` ("Prompt principles") so the queue in
`docs/RENZ_HERO_MEDIA_CONTACT_SHEET.md` can be produced later.

## 34. Videos generated

One: `public/media/renz/heroes/home-land-to-landmark.webm` — a rendered
"living still" (slow push-in, light drift and a survey-datum overlay) made
by `scripts/d16-render-loop.mjs` from the labelled Ridge Residence concept
image via sharp frames → ffmpeg VP8. 1280 × 720, 7 s, 24 fps, 1.20 MB, with a
WebP poster and a JSON manifest. Registered in the Website media library
(asset `333ddc98-…`, kind Video, rights confirmed as generated concept) and
attached to the Home masthead as **Hero video (optional)**.

## 35. Videos rejected and why

No generated candidates existed to reject. Rejected decisions: (a) a loop on
phones — the 390 build keeps the poster because there is no 720 × 1280
source and the loop would cost 1.2 MB on mobile data; (b) an MP4 fallback —
the bundled ffmpeg has no H.264 encoder, so browsers without VP8 get the
poster rather than a mislabelled file; (c) a loop per service route from the
same concept image — it would repeat one visual and add ~1.2 MB per route
for no new meaning.

## 36. Media provenance

Every generated image or loop is labelled "Generated concept visual" /
"Concept study / not project evidence" on the page, carries
`provenance_class` in the media register, and is rights-confirmed in the
Media library as such. The rendered loop's manifest records source image,
render parameters and date. Nothing generated is presented as a completed
RENZ project; `project-cards.tsx` says so in its status line. Client
originals in `references/client/originals/` were not edited.

## 37. Video optimization

`cinematic-media.tsx`: the poster is a priority `next/image` (it is the
LCP); the `<video>` element is created only 600 ms after settle and only when
reduced motion, Save-Data and 2G are off (and, on narrow screens, only if a
mobile source exists); `preload="none"` until it intersects, then it loads,
plays muted/inline/looped and fades in on `canplay`; it pauses when off
screen or when the tab is hidden; nothing preloads for other routes. The
7 s loop is 1.17 MB (measured) — under the 3 MB desktop ceiling in the
media guide.

## 38. Mobile media strategy

Phones (< 64 rem) get poster + scene, never the loop (no mobile source yet);
images use `sizes` per plane; the Projects film strip drops to a 3-column
grid of six frames; the land scene sits in the bottom 42 % so it never
crosses the headline; the direct-line and service-cue scenes are hidden
below 64 rem. Home at 390: 537 KB images, 0 KB video, 872 KB total.

## 39. Reduced-motion strategy

`prefers-reduced-motion` (and the site's `[data-motion="reduced"]` root
attribute) renders final states: no video element, drawings shown complete,
the plate and preview move instantly, the split-morph holds at 56 %, the
film strip does not auto-advance, no Ken Burns or parallax, no staggered
assembly. Verified by the s6a "honors reduced motion" test.

## 40. Scroll effects

CSS scroll-driven animations only (`animation-timeline: view()` /
`scroll(root)`), no scroll hijack, no JS scroll listeners for effects: the
section datum draws as a section enters, the header progress datum tracks
reading position, optional Ken Burns/parallax on cinematic planes. Browsers
without `animation-timeline` see final states.

## 41. Section transitions

Six frozen languages in `final-motion.css`: DATUM DRAW (a hairline draws
before a section), MASS REVEAL (blocks settle in), STRUCTURAL CUT (a hard
edge wipes), IMAGE MASK (media unmasks along the datum), PLAN LINE (list
rules draw), MATERIAL SHIFT (tone bands cross-fade). Applied by section tone
and type, not per page, so CMS-added sections inherit them.

## 42. Microinteractions

Directional button wipe; project-card media-to-blueprint hover with a
measured edge; FAQ datum on open; plate/preview springs; mega panel detail
re-typing on index change; mobile rail follow; film-gate auto-advance;
focus-visible states that reuse the same wipe and blueprint treatments.

## 43. WhatsApp treatment

Messaging only, never `tel:`: the header glyph button, the floating
"Message on WhatsApp" pill, the mobile navigator contact link and the CTA
sections all use `wa.me` links built from `identity.whatsappDigits` with a
prefilled message; the number itself is not typed into copy. The mega panel's
"Ask about this service" goes to the service enquiry form.

## 44. CMS compatibility

Everything the client can read is content: page sections (`website_pages`
snapshots via the static renderer map), the masthead's landing concept and
height (owner-selectable, "auto" default), hero image and **Hero video
(optional)**, CTAs, navigation links and labels, global copy
(`all_services_label` added). Video reaches the Media library through the
existing upload path (`upload-image.ts` video branch, `MAX_VIDEO_UPLOAD_BYTES`,
`media-picker` `kind="video"`). Database freeze respected: migration
`20260920100000` adds two `private` functions and republishes page wording;
`20260920110000` widens the `website_media_is_current` MIME gate to video —
both were needed for D1.6 itself. Admin screens were not redesigned.

## 45. Dynamic Services test

`scripts/d16-cms-stress.mjs up` published a synthetic Service #6. Result:
it appears in the track's mega index (06), the Services index, the mobile
navigator group, the footer index, and its own route with concept
`drawing-form` from the cycle (`serviceLandingConcept`), plain headings and
CTAs. Screenshots `stress/1440-services_synthetic_service_six.png`,
`stress/1440-services.png`. `down` restored the register. The only place it
does not appear is the intake "What you need" list (C8-protected).

## 46. Dynamic Projects test

The stress fixture copied the studies to 12 published projects (with related
services set so the mega panel finds a study per service). Projects film
strip, cards, home showcase and the mega "Related study" plane all held;
the strip caps at six frames below 64 rem and scrolls above it. Screenshots
`stress/1440-projects.png`, `stress/390-projects.png`. Media replacement:
the Home loop is attached through the same owner RPCs the CMS uses
(`register_media_asset`, `admin_confirm_media_rights`,
`update_website_section`, `publish_website_page`, exercised by the seed
`--heroes` path); replacing the asset in the Website media picker and
republishing needs no code change.

## 47. Content stress test

Navigation with 6 and 8 links (`stress-nav/`, `stress-nav2/` at 1120 and
1440): 6 fit at 1440; at 1120 and with 8 links the tail folds into "More"
(the CR1 E2E now opens More for its seventh route). Custom CMS page
(`synthetic-sustainability`) rendered with the stages concept and plain
masthead. Long titles wrap inside the track without breaking the capsule
(`white-space: nowrap` per item, overflow to More).

## 48. Responsive review

Read at actual pixels: 1440 (`final/`), 390 (`r390/`, `final/home-390.png`,
`final/mobile-menu.png`), 768 (`r768/`), 1920 (`r1920/`). Fixes made from
the review: mega panel lifted out of the pill's containing block; More list
vertical; film strip 3-column at narrow widths; land datum shortened to
clear the CTA row; hybrid drawing moved right of the copy column; mobile
footer made solid ink so it no longer ghosts the contact links. 320 px
reflow is covered by the s9bp reflow test.

## 49. Accessibility

axe (WCAG 2.2 AA tags) on every public route plus the open navigation states
via `tests/e2e/s6a-public.spec.ts` and `tests/e2e/s9bp-public.spec.ts`: 0
serious/critical violations on the final build. One regression found and
fixed during the final rerun: the new solid mobile footer put
"From land to landmark" at 3.08:1 — now ochre on ink. Keyboard: track
arrows/Home/End, mega ↑/↓/Escape, dialog focus trap, all disclosure buttons
labelled. `aria-current` on the route and film index; landmarks (`header`,
`nav`, `dialog` label); forced-colors block kept in `public.css`.

## 50. Performance before/after

No numeric record of the pre-D1.6 build exists (the D1.5 measurement log is
a failed run), so "before" is the first D1.6 production build measured today
(20:23) and "after" is the final build after the intake forms moved behind a
client boundary. Production server, Chromium, `scripts/d16-measure.mjs`
(`.playwright/d16-measure.json`).

| Route (1440) | JS before → after | CSS | Fonts | Images | Video | LCP after |
| --- | --- | --- | --- | --- | --- | --- |
| / | 316 → 223 KB | 53 KB | 55 KB | 833 KB | 1173 KB (loop playing) | 616 ms |
| /services | 316 → 223 KB | 53 KB | 55 KB | 252 KB | 0 | 536 ms |
| /services/design | 218 → 217 KB | 53 KB | 55 KB | 0 | 0 | 476 ms |
| /projects | 316 → 223 KB | 53 KB | 55 KB | 1769 KB | 0 | 584 ms |
| /about | 316 → 223 KB | 53 KB | 55 KB | 285 KB | 0 | 1112 ms |
| /contact | 316 → 310 KB | 53 KB | 55 KB | 238 KB | poster only | 1008 ms |
| /start-a-project | 316 → 313 KB | 53 KB | 55 KB | 0 | 0 | 1112 ms |

390: Home 223 KB JS, 537 KB images, no video (poster), LCP 396 ms; /projects
1769 KB images (the API-backed study derivatives are served unoptimized —
C10 backlog items 16/31); form routes 310–313 KB because they carry zod and
the wizard. Hero media sizes: home loop 1.20 MB, poster 537 KB at 390 /
833 KB at 1440 (includes the fact-rail images).

## 51. Surprise-me implementations

1. **The measured track** — the plate is a scale reading with a datum tick,
   not a pill highlight.
2. **Hero handover datum** — the landing's ground datum continues into the
   first section's DATUM DRAW so the page reads as one drawing.
3. **Film index** — the Projects opening is a gate frame plus an indexed
   strip, so the archive is browsed like film, not a grid.
4. **Reading-progress datum** — the header underline is the page's own
   measuring tape (`scroll(root)` timeline).
5. **Media-to-blueprint hover** — project cards swap the photograph for its
   plan with a measured edge on hover/focus.

Not done: a sixth/seventh idea was not attempted rather than padded.

## 52. Screenshots generated

`.playwright/screenshots/d1-6/`: `before/` (pre-rewrite pages), `typography/`
(16 audition sheets), `nav-v1..v3/`, `landing-v1..v2/`, `motion-v1/`,
`stress/`, `stress-nav/`, `stress-nav2/`, `r390/`, `r768/`, `r1920/` (each
with a `sheet.png`), `video-home.png`, and the client package `final/`
(18 captures: home 1440/390, navigation hover, mega menu, mobile menu,
services, design, execution, hybrid, supervision, consultation, projects,
project detail, about, insights, contact, start project, scrolled header).
Not committed (Playwright artefacts are ignored); regenerate with
`node scripts/d16-final-shots.mjs http://127.0.0.1:3100`.

## 53. Plain-English guide

`docs/RENZ_PLAIN_ENGLISH_GUIDE.md` — reader, rules, words to avoid,
construction words we keep and how to explain them, headlines, calls to
action, forms, legal pages, writing in the CMS, the final test.

## 54. Media guide

`docs/RENZ_CINEMATIC_MEDIA_GUIDE.md` — provenance first, image and video
direction, sizes and formats, how the site plays video, producing a loop
without a generative tool, attaching media to a page, prompt principles,
rejection checklist. `docs/RENZ_HERO_MEDIA_CONTACT_SHEET.md` — what opens
each route today and the production queue.

## 55. Navigation documentation

`docs/RENZ_NAVIGATION_SYSTEM.md` — desktop hero/scrolled states, plate and
preview, hover sequence, mega panel, overflow, tablet, mobile, CMS behaviour,
accessibility. `docs/RENZ_DESIGN_FREEZE.md` §7c freezes the public art
direction; `docs/RENZ_PHASE_STATUS.md` carries the D1.6 row and open items.

## 56. Public regression results

Final tree, 2026-09-19 (times local):

| Check | Command | Result |
| --- | --- | --- |
| Format | `pnpm format:check` | pass |
| Lint | `pnpm lint` (`eslint . --max-warnings 0`) | pass (after fixing a `/* global */` comment in `d16-measure.mjs`) |
| Strict types | `tsc --noEmit -p tsconfig.json` (dev server stopped) | pass |
| Unit + component | `pnpm test` (vitest) | 25 files, 177 tests pass |
| Design tokens | `pnpm design:tokens:check` | pass |
| DESIGN.md lint | `pnpm design:lint` | 0 errors, 6 pre-existing orphaned-token warnings, 1 info |
| Secret scan | `pnpm scan:secrets` | pass, 941 files |
| Build | `next build` (`RENZ_CLIENT_PREVIEW=true`) | pass |
| Public E2E | `playwright test tests/e2e/s6a-public.spec.ts` | 6/6 pass (2.3 m) |
| Public S9B-P (reflow, 404, wizard, a11y) | `playwright test tests/e2e/s9bp-public.spec.ts` | 13/14 then a11y fixed → rerun 1/1 pass (14/14) |
| Visual baseline | `playwright test tests/e2e/d1-visual.spec.ts` | pass (earlier this session, before the last CSS/SVG polish) |
| CR1 owner CMS flow | `playwright test tests/e2e/cr1-owner-cms.spec.ts` | pass (earlier this session; test now opens "More" for its seventh route) |
| C8 intake flow | `playwright test tests/e2e/c8-intake.spec.ts` | pass on rerun (earlier this session; two timing flakes on first run — MFA textbox wait, 240 s layout matrix) |

Not run: `pnpm db:test` / `db:lint` (no schema tables changed; the two
migrations are function/gate only and were applied and exercised locally),
Lighthouse (not installed), `audit:production` (unchanged dependencies).
After the E2E resets the local content was restored (`storage.mjs provision`,
seed, `--heroes`); the hero loop plays on Home again.

## 57. Remaining visual defects

- Home 1440: the fact rail and the concept badge sit close to the fold on
  short viewports (900 px); acceptable, noted.
- `/projects` weight (1.77 MB of study images) comes from unoptimized
  API-backed derivatives — a C10 media item, not a layout defect.
- No MP4 fallback and no mobile video source (encoder limit) — phones and
  non-VP8 browsers see the poster by design.
- Intake "What you need" options keep the C8 vocabulary wording.
- The Home loop is a rendered still, not footage; it is labelled as such.

## 58. C10 readiness

Ready to hand over: public art direction is frozen (`RENZ_DESIGN_FREEZE.md`
§7c banner "PUBLIC ART DIRECTION FROZEN"), all guides exist, regression is
green, the C10 backlog holds the D1.6 carry-overs (items 41–46: media
production queue, MP4/mobile sources, unoptimized derivatives, intake
vocabulary, dev-types lag, stress fixtures). Not started: C10, any
deployment, any commit, any provider/account creation.

**STOP. DO NOT START C10. DO NOT DEPLOY.**
