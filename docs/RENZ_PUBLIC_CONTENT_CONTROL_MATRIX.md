# RENZ PUBLIC CONTENT CONTROL MATRIX

CR1 / D1.5A — Owner Website Control System.

This register answers one client question: **which parts of the public website
can the RENZ owner change from Admin without a developer?**

Every visible element of every public route is classified as one of:

| Class | Meaning |
| --- | --- |
| **OWNER EDITABLE** | Business content the owner reads, edits, previews, publishes and rolls back from `/admin/website`. |
| **DOMAIN MANAGED** | Content owned by a typed Admin domain (Services, Projects, Insights, Media, Business/Contact settings). Public pages read the *published* domain projection; the owner manages it in that domain's editor. |
| **SYSTEM PROTECTED** | Code-controlled behaviour and copy that must not be editable: form validation, security states, intake mappings, accessibility labels on functional controls, layout/CSS. |
| **LEGAL MANAGED** | Privacy / Terms / Cookies, controlled by C7 legal drafts + published revisions (`settings.legal.*`). |

Section 1 records the **audit before CR1** (what the owner could and could not
edit on 2026-09-15). Section 2 is the **acceptance matrix after CR1**, section
3 the verified developer-independence checklist and section 4 what stays
system-protected by design.

---

## 1. Audit before CR1 (2026-09-15)

Sources of truth found on the public routes, with the file that owned them:

| Route | Element | Source before CR1 | Class before CR1 | Gap |
| --- | --- | --- | --- | --- |
| `/` | Hero headline "From land / to landmark", kicker, register facts, secondary CTA | `src/components/site/final-home.tsx` constants | STATIC (developer) | Not editable |
| `/` | Hero summary | C7 `business.description` else static | Partly owner | Fallback static |
| `/` | Hero image | `features/client-preview/projects.ts` (concept study image, preview only) | STATIC | Not editable |
| `/` | Business clarity (A/B/C columns) | `final-home.tsx` | STATIC | Not editable |
| `/` | Marquee words | `final-home.tsx` | STATIC | Not editable |
| `/` | "Five ways to work with RENZ" heading | `final-home.tsx` | STATIC | Becomes false with Service #6 |
| `/` | Services grid | `service-source.ts` → static five OR `published_services` | **SPLIT SOURCE** | Publishing one Admin service hides the static five |
| `/` | Featured / selected studies | `client-preview/projects.ts` (six concept studies) in preview; `published_projects.featured` otherwise | STATIC in preview | Concept studies not in Admin |
| `/` | Process story (7 steps) | `features/public-content/process.ts` | STATIC | Not editable; "Seven short steps" copy hard-coded |
| `/` | Material moment | `final-home.tsx` + static image | STATIC | Not editable |
| `/` | Why RENZ (four principles) | `final-home.tsx` | STATIC | Not editable |
| `/` | Drawing ↔ built | `client-preview` | STATIC | — |
| `/` | Insights preview | `published_posts` | DOMAIN MANAGED | No Insights Admin editor exists (published by script) |
| `/` | Final CTA copy + three steps | `final-home.tsx` | STATIC | Not editable; CTA label/route from C7 |
| `/services` | Masthead title "Five ways…", summary, facts | `app/(public)/services/page.tsx` | STATIC | Count hard-coded |
| `/services` | "Which service fits" list | `services/page.tsx` `fits` const | STATIC | Not editable |
| `/services` | Service navigator | split source (above) | SPLIT | — |
| `/services/[slug]` | Positioning, overview, sub-services, use cases, process, coordination, FAQ | `features/services/content.ts` | STATIC | `services` table has no columns for these; Admin service renders empty sections |
| `/services/[slug]` | Related studies | `client-preview/service-studies.ts` | STATIC | Not owner-selectable |
| `/projects` | Masthead, "Six settings, six responses", filters | `app/(public)/projects/page.tsx`, `studies-index.tsx` | STATIC | Count hard-coded; filters derived from static categories |
| `/projects` | Six concept studies | `client-preview/projects.ts` | STATIC | Not in Admin; layout cycle tied to exactly six |
| `/projects` | Published case studies grid | `published_projects` | DOMAIN MANAGED | Published rows immutable (unpublish to edit) |
| `/projects/[slug]` | Concept case study (9 chapters) | `client-preview/projects.ts` | STATIC | — |
| `/projects/[slug]` | Real case study | `published_projects` + media + claims | DOMAIN MANAGED | No revision history; slug change breaks links |
| `/about` | Masthead title/summary | `published_pages('/about')` else static | Partly | No page editor exists in Admin |
| `/about` | Mission / approach | C7 business profile else static | Partly owner | Fallback static |
| `/about` | Four principles | `about/page.tsx` const | STATIC | Not editable |
| `/about` | Process navigator | `process.ts` | STATIC | — |
| `/about` | Services section, selected studies, CTA | static + split | STATIC | — |
| `/about` | Team / credentials | S4 domains (unused; no editor) | DOMAIN (no UI) | — |
| `/insights` | Masthead, featured/supporting placement | `insights/page.tsx` | STATIC copy; DOMAIN data | No Insights editor |
| `/insights/[slug]` | Article | `published_posts` | DOMAIN MANAGED | Topic / related service not stored — inferred |
| `/contact` | Masthead, route cards copy, FAQ, closing CTA | `contact/page.tsx` | STATIC (except `contact_intro`) | Not editable |
| `/contact` | Email / WhatsApp values, hours, location | C7 contact settings | DOMAIN MANAGED | ✓ |
| `/contact` | Contact form | C8 intake | SYSTEM PROTECTED | ✓ |
| `/start-a-project` | Intro / guidance copy | `published_pages('/start-a-project')` else static | Partly | No editor |
| `/start-a-project` | Wizard, validation, tokens, uploads | C8 | SYSTEM PROTECTED | ✓ |
| `/start-a-project/success` | Success copy, WhatsApp continuation | static | STATIC | Not editable |
| `/enquire/service`, `/enquire/materials` | Intro copy | static | STATIC | Not editable; forms SYSTEM |
| `/privacy`, `/terms`, `/cookies` | Body | C7 legal revisions | LEGAL MANAGED | ✓ |
| Header | Route labels/order/visibility, CTA | C7 navigation settings (approved routes only) | DOMAIN MANAGED | Cannot add a custom page |
| Header mega panel | Services list | split source | SPLIT | — |
| Footer | Statement | C7 `footer_statement` | OWNER | ✓ |
| Footer | Link groups, services column, legal links, staff sign-in | `public-footer.tsx` | STATIC | Not editable |
| Floating / header / footer WhatsApp | Wording | static | STATIC | Not editable; visual not green |
| SEO | Per-page titles/descriptions | mixed static + C7 | Partly | Home/Services/Projects/Insights fixed in code |
| Media | Alt text, caption, focal point, usage, replace | S5C per-project only | DOMAIN (partial) | No media library; no focal point; no usage inspector |

**Publication model before CR1.** S4 publishes the live row (`published_*`
views read the draft tables where `publication_status = 'published'`). A
published Service or Project cannot be edited (`Only draft services can be
edited`); the owner must unpublish (public gap), edit, and republish. There is
no revision history or rollback for any public content, and no draft preview
for pages.

**Developer-dependency test before CR1** (spec §118): of the 22 tasks, only
5 could be done without a developer — publish a case study (S5C), change
navigation labels/order (C7), change the footer statement (C7), change the
site meta description (C7), publish a legal revision (C7). The other 17
required source edits.

---

## 2. Acceptance matrix after CR1

Legend: **OE** = OWNER EDITABLE · **DM** = DOMAIN MANAGED · **SP** = SYSTEM PROTECTED · **LM** = LEGAL MANAGED.

Owner surfaces: **Website → Pages** (`/admin/website/pages`), **Services**
(`/admin/content/services`), **Projects** (`/admin/content/projects`),
**Insights** (`/admin/content/insights`), **Media** (`/admin/website/media`),
**Navigation / Footer / SEO / Globals** (`/admin/website/...`), **Business /
Contact** (`/admin/settings/business`), **Legal** (`/admin/settings/legal`).

### `/` Home (`page_key = home`, SYSTEM PAGE)

| Element | Class | Where |
| --- | --- | --- |
| Hero eyebrow, headline, body, primary/secondary CTA, media, register facts | OE | Pages → Home → Hero section |
| Business clarity columns | OE | Pages → Home → Feature grid |
| Marquee words | OE | Pages → Home → Marquee |
| Services showcase heading/intro | OE | Pages → Home → Service showcase (count derived) |
| Services list | DM | Services domain (published) |
| Featured project / selected projects heading | OE | Pages → Home → Project showcase |
| Which projects appear | DM | Projects → *Feature on Home* / display order; deterministic fallback |
| Process story | OE | Globals → Process steps (add / remove / reorder) |
| Material moment | OE | Pages → Home → Full-width media |
| Why RENZ principles | OE | Pages → Home → Feature grid |
| Insights preview heading | OE | Pages → Home → Insight feed |
| Which insights appear | DM | Insights → featured / pinned / newest |
| Final CTA copy + steps | OE | Pages → Home → CTA |
| Section order, hide, spacing, tone | OE | Pages → Home (Locked: hero) |
| Grid, responsive rules, motion timing | SP | design system |

### `/services` (SYSTEM PAGE `services`) and `/services/[slug]`

| Element | Class | Where |
| --- | --- | --- |
| Index masthead title / summary / facts | OE | Pages → Services (heading uses derived count) |
| "Which service fits" list | OE | Pages → Services → Feature grid |
| Service order, names, positioning, overview, sub-services, use cases, process, coordination, FAQ, SEO, visual | DM | Services editor (draft → preview → publish, revisions) |
| Related projects on a service | DM | Projects → Related services |
| Service navigator layout, mega panel columns | SP | renderer adapts to any count |

### `/projects` (SYSTEM PAGE `projects`) and `/projects/[slug]`

| Element | Class | Where |
| --- | --- | --- |
| Index masthead, intro, CTA | OE | Pages → Projects |
| Filters | SP (derived from published project types) | — |
| Project cards: order, hero, title, type, summary | DM | Projects editor |
| Card composition (monument / portrait / landscape / technical / strip / wide) | SP auto-layout; optional `layout_hint` | Projects → Layout hint (AUTO recommended) |
| Case study: narrative, materials, gallery, related services, SEO, evidence class | DM | Projects editor |
| Old slug redirect | SP (route alias) | automatic on slug change |
| Provenance badge for concept / experience studies | SP | derived from evidence class |

### `/about` (CONTENT PAGE `about`)

| Element | Class | Where |
| --- | --- | --- |
| Masthead, introduction, principles, process reference, services section, project selection, CTA | OE | Pages → About |
| Company facts (name, region, service area) | DM | Business settings |
| Team / credentials | DM | S4 domains (hidden when empty) |

### `/insights` and `/insights/[slug]`

| Element | Class | Where |
| --- | --- | --- |
| Index masthead | OE | Pages → Insights |
| Featured / supporting placement | DM | Insights → Featured / Pinned / Sort priority; newest fallback |
| Article title, excerpt, body, topic, related service, hero, SEO | DM | Insights editor |
| Professional-advice note | OE | Globals → Insight note |

### `/contact` (SYSTEM PAGE `contact`)

| Element | Class | Where |
| --- | --- | --- |
| Masthead, intro, form intro, channel card copy, start-project card, FAQ, closing CTA | OE | Pages → Contact |
| Email, WhatsApp digits, hours, location, tel (only if enabled) | DM | Business → Contact channels |
| Contact form fields, validation, privacy acknowledgement, anti-abuse | SP | C8 |

### `/start-a-project` (SYSTEM PAGE `start-a-project`) and `/success`

| Element | Class | Where |
| --- | --- | --- |
| Page intro, guidance, step explanations, help text, success copy, WhatsApp surrounding copy | OE | Pages → Start a Project |
| Wizard steps, required inputs, validation, tokens, rate limits, uploads, idempotency, lead mapping | SP | C8 |

### `/enquire/service`, `/enquire/materials`

| Element | Class | Where |
| --- | --- | --- |
| Intro copy | OE | Pages → Service enquiry / Material enquiry |
| Forms | SP | C8 |

### Custom pages (`/[slug]`, CUSTOM PAGE)

| Element | Class | Where |
| --- | --- | --- |
| Title, slug, SEO, sections, media, navigation inclusion, publish/unpublish | OE | Pages → New page |
| Reserved routes (`admin`, `api`, `services`, `projects`, `insights`, `about`, `contact`, `start-a-project`, `enquire`, `privacy`, `terms`, `cookies`, `i`, `po`, `brand-study`, `expertise`, `media`, `_next`, …) | SP | rejected on save |

### Legal

| Element | Class | Where |
| --- | --- | --- |
| Privacy / Terms / Cookies | LM | Settings → Legal |

### Header / navigation

| Element | Class | Where |
| --- | --- | --- |
| Route labels, order, visibility, custom page links, CTA | OE | Website → Navigation |
| Services in mega panel | DM | Services (published) |
| Functional destinations (Start a Project, Contact) | SP (cannot be removed) | — |

### Footer

| Element | Class | Where |
| --- | --- | --- |
| Statement, link groups, custom page links, social visibility, contact/location visibility, legal links, staff sign-in visibility, CTA | OE | Website → Footer |
| Social URLs, contact values | DM | Business settings |

### Global content

| Element | Class | Where |
| --- | --- | --- |
| Primary CTA, WhatsApp CTA wording, company short description, service-area sentence, footer statement, insight note, process steps | OE | Website → Globals |

### WhatsApp

| Element | Class | Where |
| --- | --- | --- |
| Wording on every WhatsApp control | OE | Globals |
| Green visual treatment, `wa.me` messaging URL, no `tel:` for the RENZ number | SP | design tokens + `lib/site/whatsapp.ts` |

### SEO

| Element | Class | Where |
| --- | --- | --- |
| Per-page / per-entity title, description, OG image, index/noindex | OE / DM | page or entity editor |
| Site name, title template, canonical base | OE | Settings → Website (C7) |
| Sitemap, robots, preview `noindex` | SP | derived |

---

## 3. Developer-independence checklist (spec §118)

Verified 2026-09-15 on the local production build: **E2E** =
`tests/e2e/cr1-owner-cms.spec.ts` (9 scenarios, pass), **pgTAP** =
`supabase/tests/database/018_cr1_owner_cms.sql`, **manual** = walked in the
browser during the CR1 session.

| # | Task | After CR1 | Verified by |
| --- | --- | --- | --- |
| 1 | Change Home headline | Pages → Home → Hero → Headline → Save → Publish changes | E2E *Home* |
| 2 | Replace Home image | Pages → Home → Hero → Choose hero image (Media library / upload) | E2E *Media library* (upload, alt, focal, rights) + manual |
| 3 | Add Service #6 | Services → New service → fields → evidence → review → Publish | E2E *Service #6* |
| 4 | Add Subservice | Services → What the service page says → Sub-services | E2E *Service #6* |
| 5 | Reorder Services | Services → Display order (register) | manual |
| 6 | Create Project #7 | Projects → New project → Overview | E2E *Project #7* |
| 7 | Upload Project images | Projects → Media → Upload & attach → Clear rights | E2E *Project #7* |
| 8 | Relate Project to two Services | Projects → Services → tick two → Save related services | E2E *Project #7* |
| 9 | Feature it on Home | Projects → Website placement → Feature on Home | E2E *Project #7* |
| 10 | Remove from Home, keep in Projects | Projects → Website placement → untick → Publish changes | E2E *Project #7* |
| 11 | Unpublish Project | Projects → Publication → Unpublish | E2E *Project #7* |
| 12 | Write an Insight | Insights → New article → review → Publish | E2E *Insight* |
| 13 | Change About copy | Pages → About → section → Save → Publish changes | manual (same editor as Home) |
| 14 | Add a FAQ | Pages → Add a section → FAQ (or Services → FAQ) | E2E *Custom page* |
| 15 | Reorder Process steps | Globals → Process steps → Move up / down | manual |
| 16 | Create a new public Page | Pages → New page → sections → SEO → Publish | E2E *Custom page* |
| 17 | Add new Page to navigation | Settings → Website → Navigation → tick the page → Publish public configuration | E2E *Custom page* |
| 18 | Change footer statement | Footer → Footer options → Statement | manual |
| 19 | Change SEO description | Page settings & SEO / entity SEO tab | E2E *Custom page* |
| 20 | Replace WhatsApp wording | Globals → WhatsApp CTA / note; `whatsapp_cta` sections | E2E *WhatsApp* (green, messaging-only) + manual |
| 21 | Preview before visitors see | Preview draft (real components, Edit page shortcut) | E2E *Home* |
| 22 | Rollback a bad change | Revision history → Restore as draft → Publish changes | E2E *Home* + pgTAP |

## 4. Remaining SYSTEM PROTECTED items (by design)

| Item | Why |
| --- | --- |
| Intake vocabulary (the "need" options of Start a Project / enquiry forms) | C8 lead mapping is functionally frozen; a new service appears everywhere public but not as an intake option until a developer extends the vocabulary (`RENZ_C10_HARDENING_BACKLOG.md` #36). |
| Form fields, validation, rate limits, tokens | C8 security surface. |
| Colours, grid, breakpoints, typography, motion timing | D1 design freeze; the owner chooses tones / variants / spacing / motion by name. |
| WhatsApp green, glyph and `wa.me` link form | CR1 §68–71 (`RENZ_DESIGN_FREEZE.md` §7b); wording remains owner-editable. |
| Provenance badges on concept / experience studies | derived from the evidence class so a label can never be edited away. |
| Reserved routes | `private.website_reserved_slugs()` mirrored in `routes.ts`. |
| Section type registry and renderers | static map; new types are developer work. |
| Legal pages | C7 legal drafts + published revisions (`settings.legal.*`). |
