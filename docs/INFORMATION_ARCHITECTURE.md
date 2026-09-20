# RENZ Information Architecture

**Status:** Phase 0 recommendation; not a production specification
**Scope:** Public website navigation, audience journeys, expertise taxonomy, homepage sequence, and conversion paths
**Last updated:** 2026-08-27

> **Phase 1 / S0 source-recovery update — 2026-08-30:** The missing-source statement below remains accurate for the Phase 0 audit date. The exact monogram raster and WhatsApp screenshot are now recovered; the AI reference board is not. The screenshot supports seven general source phrases but does not approve professional capacity or the ten-item taxonomy. Use the reconciliation/status table in [`SOURCE_RECOVERY_AND_RECONCILIATION.md`](./SOURCE_RECOVERY_AND_RECONCILIATION.md); all Phase 0 labels remain proposals until confirmed.

## Evidence convention

- **Brief-supplied** — stated in the project brief. It is useful direction, but it is not independently verified business evidence.
- **Recommendation** — proposed product, UX, content, or naming direction for client review.
- **Publish gate** — information or proof that must be supplied, approved, and recorded before the related claim or module is public.

At the time of this Phase 0 pass, the repository did not contain `references/client/`. The expected brand board, logo files, and WhatsApp service image therefore could not be inspected. The service list and brand language in this document come only from the supplied brief. No license, qualification, project, statistic, testimonial, client, team, or performance claim is assumed.

## Experience objective

**Brief-supplied:** RENZ Construction Services Ltd needs a premium public presence for a Rwanda-based construction, architecture, and engineering business. Its prospective audiences need to understand what RENZ does, determine whether its work is relevant, understand what happens after contact, and start a project without first knowing construction terminology.

**Recommendation:** Organize the experience around a clear journey from early site understanding through design, cost, construction, and handover. The site should answer three questions in order:

1. Is RENZ relevant to the project I am considering?
2. Is there credible, verified evidence that I should continue the conversation?
3. What information should I provide to start productively?

The public site should not attempt to prove credibility through decorative statistics or generic claims. Process clarity, relevant case studies, precise service boundaries, and verified credentials are the preferred trust mechanisms.

## Positioning and language system

| Element | Direction | Evidence state |
|---|---|---|
| Brand platform | **From Land to Landmark.** | **Recommendation.** Derived from the lifecycle described in the brief; requires client approval. |
| Existing tagline | **We Build Today, For a Better Tomorrow** | **Brief-supplied.** Retain as a supporting heritage/corporate line until its long-term role is decided. |
| Proposition | “RENZ brings planning, design, engineering, cost, and construction into one clear project journey.” | **Recommendation. Publish gate:** confirm which disciplines are in-house, partner-led, subcontracted, or coordinated. |
| Voice | Assured, precise, calm, useful, and plain-spoken | **Recommendation.** |
| Headline style | Short, directional, and material: “Start with clarity.” “Design every decision.” “Build with control.” | **Recommendation;** concept copy, not approved public copy. |
| Primary CTA | **Start a Project** | **Brief-supplied.** |
| Secondary CTAs | **Explore Expertise**, **View Projects**, **Discuss Your Project** | **Recommendation.** |
| Channel CTA | **Chat on WhatsApp** | **Publish gate:** official number, monitoring owner, and operating expectations. |

Do not publish “one team,” “end-to-end,” “single point of accountability,” “best,” “world-class,” “guaranteed,” numerical proof, or response-time promises unless the operating model and evidence support those words.

## Audience and job map

The audience groups below are **brief-supplied**. The jobs and content paths are **recommendations** that must be validated through client and, ideally, customer interviews.

| Audience | Primary job | Decision evidence needed | Suggested path |
|---|---|---|---|
| Individual building a home | Turn land, needs, and an approximate budget into an understandable plan | Plain-language process, required inputs, relevant home projects, cost-planning explanation | Architecture or Construction → Start a Project |
| Diaspora client building in Rwanda | Initiate and oversee a project without being continuously on site | Actual communication/reporting practice, accountable contacts, verifiable progress evidence | Process → Projects → Start a Project |
| Property developer | Assess capability and coordinate multiple disciplines around a development | Relevant project types, defined RENZ role, delivery method, project governance | Projects → Expertise → Start a Project |
| Commercial business | Plan or deliver a functional commercial property or interior | Similar verified work, disruption/timeline planning, fit-out or construction scope | Projects → Relevant expertise |
| Institution | Evaluate delivery governance, safety, compliance, and procurement fit | Verified registrations, policies, relevant projects, clear procurement/contact route | About → Projects → Contact |
| Existing property owner | Decide how to improve an existing building | Renovation assessment process, required inputs, before/during/after evidence | Renovation → Start a Project |
| Consultancy or project-management buyer | Appoint a defined advisory or management scope | Deliverables, reporting, boundaries, accountable roles | Consultancy or PM → Contact |
| Partner or subcontractor | Reach the correct business-development contact | Clear inquiry type and attachment route | Contact; not the client project wizard |

**Recommendation:** Do not create audience-specific landing pages at launch. Use relevant service copy, project filters, and one restrained “Who we help” passage. Dedicated audience routes should be introduced only when they can offer substantial, differentiated content and search demand is evidenced.

## Expertise taxonomy

The brief contains overlapping labels such as Construction, Building Construction, and Residential & Commercial Projects. The following taxonomy removes duplication while preserving the supplied intent.

| Lifecycle group | Canonical public label | Consolidates | Naming or publication gate |
|---|---|---|---|
| Plan & Design | Architecture & House Plans | House Plans; Architectural Design & Consultation | Confirm deliverables and licensed or partner delivery. |
| Plan & Design | Land Surveying | Land Surveying | Confirm scope, responsible professional, and service area. |
| Plan & Design | Structural Design | Structural Design | Use **Structural Engineering** only when professionally accurate and approved. |
| Plan & Design | Interior Design & Fit-Out | Interior Design; suggested Fit-Out | Confirm whether RENZ designs only or also delivers fit-out. |
| Cost & Manage | Cost Planning & Estimation | Costing | Use **Quantity Surveying** only if the professional scope is verified. |
| Cost & Manage | Project Management & Supervision | Project Management; suggested supervision | Define supervision deliverables and accountability. |
| Cost & Manage | Construction Consultancy | Consulting | Define concrete deliverables; avoid a generic catch-all page. |
| Build & Improve | Building Construction | Construction; Building Construction | Treat residential and commercial as project types, not duplicate services. |
| Build & Improve | Renovation & Remodeling | Renovation & Remodeling | Confirm assessment, design, and build scope. |
| Build & Improve | Civil Works & Infrastructure | Civil Works & Infrastructure | Confirm actual capability, scope, and relevant proof. |

**Recommendation:** Store alternative and legacy wording as internal aliases for search and redirects, while exposing one canonical name and URL. Use clear discipline names rather than “solutions” or marketing inventions.

Every service page should support:

- A concise, approved proposition
- Suitable project types and audiences
- Inputs expected from the client
- Explicit deliverables and exclusions
- A simple service process
- Related verified projects
- Related practical insights
- FAQs based on real inquiry patterns
- Credentials or compliance information only when verified
- A Start-a-Project CTA with the service preselected

## Public route architecture

```text
/
├── expertise
│   └── [service-slug]
├── projects
│   └── [project-slug]
├── about
├── insights
│   └── [article-slug]
├── contact
├── start-a-project
├── privacy
├── terms
└── system states: 404, route error, form failure, form success/retry
```

### Route register

| Route | Purpose | Core content | Indexing recommendation |
|---|---|---|---|
| `/` | Establish relevance, trust, and a route into expertise, work, or inquiry | Proposition, lifecycle, expertise, verified work, process, trust content, CTA | Index |
| `/expertise` | Help a visitor understand the full capability journey and choose a service | Lifecycle overview, service groups, how services relate, project CTA | Index |
| `/expertise/[slug]` | Explain one service and prepare a qualified inquiry | Scope, inputs, deliverables, process, proof, FAQs, related content | Index only when substantive and approved |
| `/projects` | Let visitors find relevant, verified work | Project index and restrained filters by project type, service, or status | Index |
| `/projects/[slug]` | Provide detailed project evidence | Facts, RENZ role, challenge, approach, stages, media, outcomes, related work | Index only after publication gate |
| `/about` | Explain the company, method, people, and verified credentials | Story, operating principles, team, quality/safety, credentials, CTA | Index |
| `/insights` | Surface practical guidance and expertise | Editorial index, topics, featured/current articles | Index |
| `/insights/[slug]` | Answer one search or client-preparation question | Reviewed article, sources, related service/project, CTA | Index only when current and approved |
| `/contact` | Offer a lower-friction, non-project-specific contact route | Verified contact channels, inquiry type, concise form, location/hours if supplied | Index |
| `/start-a-project` | Capture a structured project brief | Multi-step wizard, upload, review, privacy acknowledgement, confirmation | Index the entry route; noindex confirmation state |
| `/privacy` | Explain data collection and handling | Counsel-approved privacy content | Index unless counsel directs otherwise |
| `/terms` | Explain site terms | Counsel-approved terms | Index unless counsel directs otherwise |
| 404 and error states | Restore orientation and preserve trust | Plain explanation, retry where relevant, Home/Expertise/Contact links | Noindex |

Recommended canonical service slugs:

```text
/expertise/architecture-house-plans
/expertise/land-surveying
/expertise/structural-design
/expertise/interior-design-fit-out
/expertise/cost-planning-estimation
/expertise/project-management-supervision
/expertise/construction-consultancy
/expertise/building-construction
/expertise/renovation-remodeling
/expertise/civil-works-infrastructure
```

**Recommendation:** Do not add duplicate `/services` routes, thin city pages, separate category URLs, or standalone quality/sustainability pages merely to increase page count. Project and insight filters should use query parameters or client-side state unless a category has durable standalone search value and unique editorial content.

## Global navigation

### Primary navigation

```text
Home | Expertise | Projects | About | Insights | Contact | Start a Project
```

**Recommendation:** The wordmark returns to Home, so “Home” may be omitted visually from the desktop navigation if testing confirms that visitors understand the pattern. Keep it explicit in the mobile menu and footer.

### Expertise mega-menu

| Column | Links |
|---|---|
| Understand & Plan | Land Surveying; Architecture & House Plans; Cost Planning & Estimation |
| Design & Engineer | Structural Design; Interior Design & Fit-Out |
| Build & Improve | Building Construction; Renovation & Remodeling; Civil Works & Infrastructure |
| Manage & Advise | Project Management & Supervision; Construction Consultancy |

The panel should also contain **Explore all expertise** and **Start a Project**. It should not contain decorative promotional cards, unverified project imagery, or a separate description for every link.

Interaction requirements:

- Use a button-backed accessible disclosure; never require hover.
- Open on intentional pointer or keyboard action, not on accidental pointer crossing.
- Preserve a logical DOM and tab order.
- Support Escape, outside dismissal, focus return, and visible focus.
- Keep page content inert only when the menu behaves as a modal overlay.
- Do not hide service content behind motion or pointer-only previews.

### Responsive navigation

**Recommendation:** Use the full desktop navigation only when the final typography and CTA fit comfortably, likely around 1200–1280px and above. At 1024px and below, prefer the full-screen architectural menu rather than compressed labels.

The mobile menu should:

- Present primary destinations first
- Use one Expertise accordion with the same lifecycle groupings
- Keep Contact and Start a Project visually distinct
- Expose close and back behavior clearly
- Respect device safe areas and on-screen keyboards
- Remain fully usable with motion disabled

## Homepage editorial architecture

| Sequence | Chapter | Experience objective | Evidence and fallback rule |
|---:|---|---|---|
| 0 | Optional RENZ opening mark | Establish a distinctive first-session signature without delaying access | **Recommendation.** Skippable, first-session only, `aria-hidden`, bypassed for reduced motion, and never a content gate. |
| 1 | Cinematic hero | State what RENZ is for and provide a decisive next action | “From Land to Landmark” is **Recommendation**. Use verified RENZ media; label concept imagery and never present it as completed work. |
| 2 | Company proposition | Explain the coordinated journey in one concise passage | **Publish gate:** actual delivery model and service boundaries. |
| 3 | Expertise across the lifecycle | Help visitors recognize the appropriate service without scanning ten cards | **Recommendation:** editorial vertical or progressive index; all links readable without animation. |
| 4 | Selected projects | Provide relevant evidence of capability | **Publish gate:** project facts, RENZ role, client permission, and image rights. Omit the chapter when evidence is unavailable. |
| 5 | Who RENZ helps | Let key audiences self-identify without audience landing pages | **Recommendation:** restrained typographic sequence, not a card grid. |
| 6 | Project journey | Clarify what happens after inquiry | **Recommendation:** Understand → Survey → Design → Engineer → Cost → Build → Deliver. **Publish gate:** client validates the real operating process. |
| 7 | Quality, safety, and responsibility | Explain practices that reduce uncertainty and support long-term value | **Publish gate:** policies, practices, credentials, and sustainability evidence. Avoid generic promises. |
| 8 | Conditional proof | Add statistics and testimonials when genuine | **Publish gate:** source, date, consent, attribution, and owner. Empty or demo proof never renders in production. |
| 9 | Practical insights | Demonstrate useful expertise and support project preparation | **Recommendation:** two or three current, reviewed articles tied to services and client questions. |
| 10 | Final conversion chapter | Invite a useful project conversation | **Recommendation:** “Tell us what you’re planning.” Pair Start a Project with lower-friction Contact and verified WhatsApp. |
| 11 | Utility footer | Provide orientation, legal routes, and verified company details | **Publish gate:** company information, social profiles, contact channels, and legal copy. |

Composition should vary among full-bleed media, typographic chapters, vertical indexes, project narratives, and linear process graphics. Avoid scroll-jacking, auto-advancing carousels, default bento grids, excessive rounded cards, and a repeated text-left/image-right rhythm.

## Conversion architecture

| Visitor state | Primary action | Supporting action | Handoff behavior |
|---|---|---|---|
| Exploring capability | Explore Expertise | View Projects | Preserve service context when opening related pages. |
| Evaluating trust | View Project | Read About or related insight | Show RENZ role and verified evidence before the CTA. |
| Ready to brief | Start a Project | Discuss Your Project | Preselect the originating service or project type when appropriate. |
| Has a simple/general question | Contact | Verified WhatsApp or phone | Do not force a full project wizard. |
| Partner or subcontractor | Contact with inquiry type | Email if verified | Keep partner messages separate from client project requests. |

The wizard should accept “I’m not sure” rather than requiring the visitor to understand the taxonomy. A service detail page may preselect a service, but the visitor must be able to change it.

## Responsive and accessibility architecture

| Viewports | Intended behavior |
|---|---|
| 360 / 390 / 430 | Purpose-built mobile hero; vertical expertise/process; portrait image art direction; one-column wizard; no hover assumptions |
| 768 | Tablet compositions; two columns only when reading order remains clear; verify 768×430 landscape |
| 1024 | Compact/full-screen navigation; reduced motion density; no forced desktop mega-menu |
| 1280 / 1440 | Full navigation, mega-menu, cinematic editorial layouts, optional two-pane wizard review |
| 1728 / 1920 | Capped reading widths with intentional full-bleed media; avoid stretched text and controls |

Cross-route accessibility requirements:

- Semantic landmarks, one logical H1, a skip link, and meaningful page titles
- Keyboard-operable menus, filters, galleries, dialogs, and forms
- Visible focus and tested navy/gold contrast; gold is never the sole state indicator
- A reduced-motion path that removes drawing, parallax, and spatial transition effects while preserving content
- Informative image alt text, empty alt for decorative media, and captions/credits where relevant
- No auto-playing audio; informative motion media receives appropriate controls and alternatives
- Reflow at 320px and 200% zoom without page-level horizontal scrolling
- Touch targets designed at 44×44px where practical
- Error recovery and retry paths that do not erase user input

## Deferred routes and non-goals

The following should remain out of the launch IA unless evidence justifies them:

- Separate location landing pages
- Careers, procurement, partner portal, or client portal
- Standalone Sustainability, Safety, or Credentials pages
- Project category or insight topic routes with thin content
- Site-wide search before the content inventory warrants it
- Public pricing or instant quotation
- Account creation for project inquiries

## Unresolved facts and decisions

### Blocks public naming or claims

- **Publish gate:** exact legal company name and approved short descriptor
- **Publish gate:** in-house, partner-led, subcontracted, and coordinated service boundaries
- **Publish gate:** relevant licenses, registrations, qualifications, and responsible professionals
- **Publish gate:** client-approved wording for Structural Design/Engineering, Quantity Surveying/Cost Estimation, supervision, and fit-out
- **Publish gate:** actual operating process and handoff terminology

### Blocks trust and proof modules

- **Publish gate:** verified project list, RENZ role, dates, status, public-safe locations, client consent, image rights, and outcomes
- **Publish gate:** team names, biographies, portraits, credentials, and permission
- **Publish gate:** testimonials and attribution consent
- **Publish gate:** quality, safety, sustainability, reporting, or compliance practices
- **Publish gate:** statistics, clients, partners, awards, certifications, or years operating

### Blocks contact and conversion details

- **Publish gate:** domain, official email, phone, WhatsApp, office/service area, hours, and social profiles
- **Publish gate:** inquiry owner, internal routing, and any approved response expectation
- **Publish gate:** privacy and terms content

### Requires validation after launch planning

- **Recommendation:** priority order of audiences and services
- **Recommendation:** whether English launches without a locale prefix
- **Recommendation:** whether project and insight filters need indexable destinations later
- **Recommendation:** the desktop navigation breakpoint after final typography is selected
