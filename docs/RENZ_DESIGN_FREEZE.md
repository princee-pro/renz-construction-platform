# RENZ DESIGN FREEZE — FINAL VISUAL FREEZE (D1 + D1.5 + D1.6)

> **PUBLIC ART DIRECTION FROZEN — D1.6, 2026-09-19.** The client's final art
> direction (plain English, one typeface, the Measured Track navigation, a
> landing concept per route, poster-first video, disciplined motion) is
> implemented and recorded in §7c below. Later visual changes follow §9.

The public experience, the authentication experience, the admin Control
Room and the business-document family are frozen at the end of D1.5
(2026-09-13). D1 established the technical design system; D1.5 was the
premium completion pass the project lead reopened the freeze for. C10
hardens; it does not redesign. Anything below changes only through a
recorded decision in `docs/RENZ_PHASE_STATUS.md`.

## 1. Direction — "Datum & Mass"

A construction company that starts with the drawing. Every surface is built
on two ideas:

- **Datum** — one measured gold line (`--gold #C69A3A`) that draws, aligns,
  underlines, and marks the selected state. It never decorates; it locates.
- **Mass** — ink (`--ink #071523`) and limestone/concrete grounds carrying
  large Archivo headlines, generous measure, and the six concept studies as
  the only imagery.

Nothing on the site claims delivered RENZ work. Concept studies are labelled
as studies in every composition; published case studies come only from Admin.

## 2. Tokens (source: `DESIGN.md` → `src/styles/design-tokens.generated.css`)

| Role                    | Token                | Value                                                   |
| ----------------------- | -------------------- | ------------------------------------------------------- |
| Ground (dark)           | `--ink`              | `#071523`                                               |
| Ground (light)          | `--concrete`         | `#F1F2EF`                                               |
| Ground (warm)           | `--limestone`        | `#E9E5DC`                                               |
| Paper                   | `--paper`            | `#FFFFFF`                                               |
| Text                    | `--graphite`         | `#303940`                                               |
| Small text / labels     | `--steel`            | `#5A656E` (≥ 4.7:1 on every light ground)               |
| Datum                   | `--gold`             | `#C69A3A`                                               |
| Index marks on light    | `--bronze`           | `#775A30` (≥ 5.0:1 on limestone)                        |
| Index marks on ink      | `--ochre`            | `#D9B25C` (9.2:1 on ink; `.tone-ink` remaps `--bronze`) |
| Timber accent           | `--timber`           | `#A8784B`                                               |
| Stone / rules           | `--stone`, `--rule`  | `#B9B3A6`, `#D8DCD8`                                    |
| Display                 | `--font-display`     | Archivo (variable wdth 62–125, wght 100–900)            |
| Body                    | `--font-body`        | Source Sans 3 (variable)                                |
| Mono / measurements     | `--font-mono`        | IBM Plex Mono 400/500                                   |
| Type scale              | `--step--2 … --step-hero` | fluid clamp, 390 → 1440 px                         |
| Layout                  | `--gutter`, `--container 92rem`, `--col-gap`, `.grid-12` |                                    |
| Rhythm                  | `--section-y`, `--section-y-tight`                       |                                    |
| Motion                  | `--t-micro 180ms`, `--t-content 420ms`, `--t-section 700ms`, `--ease-out`, `--ease-in-out` |  |

Admin reuses the same faces and the gold datum through the D1 block at the
end of `src/styles/globals.css` (`--admin-display/body/mono`, `--admin-accent`).

## 3. Stylesheet map

| File                              | Owns                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/styles/globals.css`          | Tailwind base, tokens import, admin shell, D1 admin coherence block                                    |
| `src/styles/public.css`           | Surviving C8/C9 base rules (intake base, legal, structured content, errors, consent, floating WhatsApp) |
| `src/styles/final-base.css`       | Public tokens, type, containers, tones, buttons, links, media, motion helpers, grid overlay             |
| `src/styles/final-nav.css`        | Brand mark, header + mega panel, mobile menu, footer, floating WhatsApp, brand opener                   |
| `src/styles/final-pages.css`      | Home sections, services index, study cards, process story, material moment, comparison, insights        |
| `src/styles/final-routes.css`     | Mastheads, services index page, service detail, studies index, case study, about, insights, contact, brand study |
| `src/styles/final-forms.css`      | Intake wizard, enquiry forms, contact form, intake frame                                                |
| `src/styles/admin-auth.css`       | D1.5 authentication shell (sign-in, MFA, enrolment)                                                     |
| `src/styles/admin-shell.css`      | D1.5 Control Room shell: sidebar/rail, top bar, drawer, command strip, tables, status, Quick Find, readiness |
| `src/styles/documents.css`        | D1.5 paper-sheet document workspace (HTML invoice / receipt / PO views, print)                          |
| `src/styles/final-landing.css`    | D1.6 landing system: cinematic media, scenes, film archive, split-morph, 404                            |
| `src/styles/final-motion.css`     | D1.6 motion: button wipe, card hover, scroll-driven section transitions, reading progress               |

Load order is fixed in `src/app/layout.tsx`; later sheets win at equal
specificity. No stylesheet may be added without updating this table.

## 4. Component register (public)

Shell: `public-header.tsx`, `services-nav-panel.tsx` (mega panel),
`public-menu.tsx` (mobile dialog, focus-owned), `public-footer.tsx`,
`floating-whatsapp.tsx` (WhatsApp only — never `tel:`), `brand-opener.tsx`
(≤ 1.4 s, skip, once per session, reduced-motion bypass, preview only),
`motion-preference.tsx` (`data-motion` on the root), `grid-overlay.tsx`
(press `g`), `(public)/template.tsx` (`PageTransition`).

Motion primitives (`src/components/motion/primitives.tsx`): `Reveal`
(rise / assemble / measure / resolve / shift), `Stagger`, `StaggerItem`,
`LineDraw`, `ImageReveal` (mask on a child — Chromium IO rule), `Parallax`,
`Counter`, `ScrollProgress`, `HorizontalStory` (+ `rail`), `PageTransition`.
Motion for React is the only animation dependency.

Pages: `final-home.tsx` (12 sections), `home-hero.tsx`, `services-index.tsx`
(hover/focus/arrow-key selection, `--active-index` datum), `process-story.tsx`
(the ONE horizontal story; vertical below 64 rem and under reduced motion),
`study-card.tsx` (monument / portrait / landscape / split / technical / strip /
wide / real), `studies-index.tsx` (filters derived from study categories),
`concept-case-study.tsx` + `chapter-narrative.tsx` (nine chapters, sticky
media plane, provenance repeated), `drawing-reality.tsx` (slider ≥ 48 rem,
full-width toggle below), `study-drawing.tsx` (procedural elevations),
`fields.tsx` (procedural SVG fields), `page-masthead.tsx`,
`intake/intake-frame.tsx` (service cue, next steps, WhatsApp/email — never
touches C8 form semantics), `marquee` (ONE, in `final-home.tsx`).

## 5. Motion vocabulary (frozen)

MEASURE (datum draws), DRAW (SVG line-draw), ALIGN (index → content),
REVEAL (masked image), ASSEMBLE (staggered rise), LOCK (selected state
snaps), BUILD (counter / progress), SHIFT (horizontal panel), RESOLVE
(fade-through). Rules: no scroll hijack (the browser scroll is always
authoritative; the horizontal story is a sticky viewport driven by scroll
progress), `prefers-reduced-motion` renders **final states** with no running
animation (asserted by `s9bp-public.spec.ts`), no motion on `main` layout
shifts, transitions ≤ 700 ms, opener ≤ 1.4 s total.

## 6. Responsive art direction

| Width         | Decisions                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| 320           | Wordmark hidden (mark only), preview label compact, hero at 100 svh, single-column everything           |
| 390           | Mobile menu dialog, monument copy stacks, comparison toggle only, chapter index scrolls horizontally     |
| 768           | Services index one column, studies grid full-width cards, process story vertical                        |
| 1024+ (64rem) | Horizontal process story, sticky chapter index + media plane, sticky intake aside                       |
| 1440          | Reference desktop composition                                                                           |
| 1920          | `--container 92rem` holds the measure; grounds bleed, content does not stretch                          |
| 720 @ 2×      | "200 % zoom" — verified no horizontal scroll, no clipped controls                                        |

## 7. Accessibility contract

- WCAG 2.2 AA colour contrast on every public route: axe serious/critical
  = 0 (`s6a-public`, `s9ap-public`, `s9bp-public`, `d1-visual`).
- Keyboard: skip link, header nav, mega panel (Escape closes), mobile menu
  (focus trap + restore), services index (arrow keys), comparison slider
  (Home/End/Arrows), wizard (radio groups, error summary focus), all
  `focus-visible` rings in gold on ink / light grounds.
- Accessible names: hero headline lines are separated by a real space
  (screen readers hear "From land to landmark"); every study link is
  `Open <title> concept study`; Quick Find in admin carries a name at every
  width.
- Reduced motion, reduced data (opener bypass), forced colours (pending —
  see C10 #17).

## 7a. D1.5 additions (frozen)

**Authentication language.** `src/components/admin/auth-shell.tsx` +
`src/styles/admin-auth.css`: two-zone composition — form zone (mark, step
indicator 01 Staff access / 02 Security verification, kicker, title, form,
support line) and brand zone (ink, grid, drawn structure, Datum R, Control
Room statement, six system modules, survey coordinates). Password show/hide;
segmented six-cell OTP over ONE accessible input (`autocomplete=one-time-code`,
numeric keypad, paste). Mobile: form first, compact brand strip. Motion: line
draw + rise, none under reduced motion. Error states: wrong credentials /
invalid code (form message), disabled account (`?error=access` notice),
expired session (`?error=expired` notice), permission denied (`/admin/security`).
No social auth.

**Admin shell.** `src/components/admin/admin-navigation.tsx` +
`src/styles/admin-shell.css`: sidebar with grouped glyph navigation that
collapses to a rail (`localStorage` `renz-admin-rail`), one top bar at every
width (section, Quick Find, bell, account), left-sliding mobile drawer with
overlay, scroll lock, visible Close. Control Room overview opens with the
Command strip (active projects, new leads, outstanding invoices, open POs,
needs attention — real values only) then attention, leads, operations,
finance, delivery, activity. Tables: ink header rule, hover/focus rows,
tabular numerals. Status badges: squared, mark + label. Quick Find: grouped
results in a fixed operational order with arrow-key navigation.

**Navigation.** Numbered routes (01–05), the measured active line with
registration points, a route readout on the header datum when scrolled,
the three-zone mega panel (index · context with typical fit / you receive ·
field + all-services cue), staggered mobile-menu choreography.

**Public completion.** Contact = rail (how RENZ replies, direct channels,
hours/location when published) + architectural form surface. Insights =
featured + supporting stories, topics, reading time from copy, related
service, article CTA; article pages with section rail and next article.
About/Services = process navigator (tabs + vertical timeline). Projects =
measured category rail instead of pills. Service pages = procedural
openers (`service-opener.tsx`).

**Document family.** `src/features/documents/pdf-engine.ts`: one A4 engine
for Invoice, Draft invoice (DRAFT stamp, "DRAFT — NOT ISSUED", no number,
staff-only), Void invoice (VOID stamp + banner, figures retained), Payment
receipt and Purchase order — header mark, meta strip, parties, repeated
table header, totals kept together, page X / Y. HTML previews share the
paper-sheet workspace (`src/styles/documents.css`).

**Editorial content.** `src/features/public-content/editorial-insights.ts`
(three owner-authorized articles) published through the posts domain by
`pnpm content:publish-insights` (readiness checks + `publish_post`).

## 7b. CR1 / D1.5A addition (frozen, change-controlled)

**WhatsApp green system** (`src/styles/whatsapp.css`, CR1 §68–71). The site
palette is unchanged — navy / gold / limestone / concrete — and green is
reserved for WhatsApp *messaging* actions so they are recognisable at a
glance:

- Tokens: `--whatsapp: #25D366`, `--whatsapp-dark: #075E54`,
  `--whatsapp-ink: #0b1f17` (near-black ink on filled green for AA; where
  white type is required the dark green surface is used), `--whatsapp-ring`,
  `--whatsapp-wash`.
- Classes: `.btn-whatsapp` (filled CTA), `.header-icon-whatsapp`,
  `.public-menu-contact-whatsapp`, `.public-link-whatsapp`, `.floating-whatsapp`,
  `.contact-channel-whatsapp`, admin `.button-whatsapp` (Lead 360, Client 360,
  invoice / purchase-order command centres). Every one renders the WhatsApp
  glyph and a `https://wa.me/447412853143?text=…` link.
- Rule: the RENZ number is **texting only** — no `tel:` link is emitted for it
  anywhere on the public site (`tests/e2e/cr1-owner-cms.spec.ts`, *WhatsApp*).
  A `tel:` control appears only if the owner enables calling on another
  published number (C7 contact channels).
- Wording on every WhatsApp control is owner-editable (Globals → WhatsApp CTA
  / note, section `whatsapp_cta`, contact channels module). The colour, glyph
  and link form are SYSTEM PROTECTED.

**Page-builder surfaces.** Section tones, spacings and variants
(`src/styles/final-sections.css`) map to the frozen tokens; the owner picks
names, never colours. Admin CMS surfaces (`src/styles/website-cms.css`) follow
the D1.5 Control Room shell.

## 7c. D1.6 — client final art direction (frozen)

**Typography.** One public family: **Manrope** (variable, 200–800, latin
subset, `src/fonts/manrope.woff2`) for display and body; IBM Plex Mono only
for tiny technical labels (indices, measurements, drawing marks). Archivo and
Source Sans 3 are retired. Chosen in an audition against Poppins and Plus
Jakarta Sans on rendered pages (`.playwright/screenshots/d1-6/typography/`).
Scale (`final-base.css`): `--step-0` 17–19 px body at line-height 1.6,
`--step-5` 2.4–4.2 rem section titles, `--step-hero` 2.6–5.4 rem for the home
headline only; headings weight 700, letter-spacing −0.03 em.

**Plain-English writing standard.** `docs/RENZ_PLAIN_ENGLISH_GUIDE.md`. All
public copy is owner-editable (pages as published revision 2, services /
studies / insights as content revision 2 via
`scripts/website-seed-content.mjs --rewrite-copy`). One brand line — *From
land to landmark* — always followed by its plain explanation. The bounded
audit is `scripts/d16-copy-audit.mjs`.

**Navigation.** The RENZ Measured Track — `docs/RENZ_NAVIGATION_SYSTEM.md`.

**Landing (hero) system.** `src/components/site/landing/*`,
`src/styles/final-landing.css`. One `Landing` composition, sixteen concepts
(`landing-concepts.ts`): land (Home, full height), stages (Services),
drawing-form (Design), plan-build (Executions), split-morph (Hybrid),
checkpoints (Supervision), site-decision (Consultations), film-archive
(Projects), project (Project detail, media-driven), how-we-work (About),
drawing-board (Insights, editorial height), direct-line (Contact, compact),
first-brief (Start a Project), service-cue, material-register, calm (legal,
404). Each has its own procedural scene (`scenes.tsx`, drawn with
`scene-kit.tsx`), layout (over media / split plane / film strip / calm) and
height (full / tall / standard / compact / editorial). The owner selects the
concept and height on the page masthead; services derive theirs from
position (`serviceLandingConcept`). Copy, poster and video are content; the
scene and layout are code. The "page personality" rule: with titles hidden,
Design, Executions, Hybrid, Supervision, Consultations, Projects, About and
Contact must still read as different experiences.

**Video system.** `cinematic-media.tsx`: poster first (LCP), the `<video>`
is created only after settle and only without reduced motion / save-data /
2G; muted, inline, looped, `preload="none"` until on screen, fades in on
`canplay`, pauses off-screen and on hidden tabs; phones keep the poster
unless a mobile source exists; no cross-route preload. Media come from the
Website media library (video MIME admitted by migration
`20260920110000`), attached on the page as **Hero video (optional)** with
the **Hero image** as poster. Rules in `docs/RENZ_CINEMATIC_MEDIA_GUIDE.md`.

**Motion rules.** `src/styles/final-motion.css` adds six transition
languages — DATUM DRAW, MASS REVEAL, STRUCTURAL CUT, IMAGE MASK, PLAN LINE,
MATERIAL SHIFT — as CSS scroll-driven animations (no JS, no hijack), the
directional button wipe, the project-card media-to-blueprint hover with a
measured edge, the FAQ datum, and the reading-progress datum in the header.
Reduced motion renders final states everywhere; browsers without
`animation-timeline` see final states.

**Generated-media provenance.** Every generated image or loop is a
*Generated concept visual*: labelled on the page, rights-confirmed in the
Media library as such, never evidence. The D1.6 home loop
(`public/media/renz/heroes/home-land-to-landmark.webm`) was rendered from
the labelled Ridge Residence concept image with
`scripts/d16-render-loop.mjs` because no generative video tool was
connected; real footage replaces it through the CMS without a code change.

**Stylesheets added.** `final-landing.css` (landing system, 404),
`final-motion.css` (motion + microinteractions). The legacy header /
navigation / menu rules were removed from `public.css`.

## 8. What is explicitly NOT in the freeze

- Real project imagery, testimonials, credentials, partner logos, team
  photographs — all remain Admin-published evidence (`CLIENT_EVIDENCE_BACKLOG.md`).
- Generated or real *footage* for every route: the video **system** is
  frozen; the hero media queue (`RENZ_HERO_MEDIA_CONTACT_SHEET.md`) is
  production work for when a generative tool or photography is available.
- A seventh concept study (queued in `RENZ_FINAL_MEDIA_QUEUE.md`).
- Any change to intake, leads, procurement, finance, auth, analytics or
  notification behaviour — D1 touched presentation only, and the C4–C9
  suites plus pgTAP prove it.

## 9. Change control

A visual change after this freeze needs: the affected screenshot round
(`node scripts/d1-screenshots.mjs <round>`), an axe census
(`node scripts/d1-axe.mjs`), the `d1-visual.spec.ts` capture, and a line in
`RENZ_PHASE_STATUS.md`.
