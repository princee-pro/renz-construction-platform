# RENZ Phase 0 Product Blueprint

Status: **Phase 0 complete as a planning package; production implementation has not started.**
Prepared: 2026-08-27
Product: RENZ Construction Services Ltd public website, project-intake experience, and internal administration product.

> **Phase 1 / S0 update — 2026-08-30:** The statements below describe the Phase 0 audit state on 27 August. The monogram raster and WhatsApp service screenshot have since been recovered and authenticated; the expected client-supplied AI reference board remains missing. Phase 1 is authorized only to the assigned slice. Current evidence, gates, and safe omissions are recorded in [`SOURCE_RECOVERY_AND_RECONCILIATION.md`](./SOURCE_RECOVERY_AND_RECONCILIATION.md) and [`PHASE_1_DECISION_REGISTER.md`](./PHASE_1_DECISION_REGISTER.md). No application implementation has started.

## 1. Decision language

Every material statement uses one of three evidence levels:

- **Brief-supplied** — stated by the client brief and safe to use as a planning input, but still subject to final client sign-off.
- **Recommendation** — the Phase 0 team's proposed product, design, content, or engineering decision.
- **Publish gate** — a fact, claim, policy, or asset that must be supplied or approved before it appears in production.

No concept image, placeholder statistic, testimonial, credential, project, employee, location detail, or qualification in this package is production evidence.

## 2. Starting point and scope boundary

The repository was empty and was not a Git worktree at discovery time. No application, package manifest, migrations, environment example, tests, existing brand files, or runtime configuration were present. The expected `references/client/` source package—brand board, original logo, and WhatsApp services image—was also absent. The only authoritative input available was the supplied written brief.

Phase 0 therefore delivers a decision system rather than a disguised implementation:

- repository and source-material assessment;
- brand, visual, interaction, and logo **directions**;
- information, content, SEO, admin, database, security, and technical architecture;
- ten generated concept boards used as reference targets;
- Phase 1 gates, sequence, risks, and verification expectations.

It intentionally does **not** deliver a production homepage, application shell, database migration, Supabase project, authentication system, CMS, deployed route, or final identity.

## 3. Product thesis

### Recommended master proposition

**From Land to Landmark.**

Use this as the organizing product idea, not an unsupported promise. It connects early planning, surveying, design, cost control, construction, improvement, and project stewardship without claiming that RENZ directly performs every regulated discipline. The brief-supplied existing tagline, “We Build Today, For a Better Tomorrow,” can remain a supporting heritage/corporate line until the client chooses the final hierarchy.

### Product promise

RENZ should feel like an accountable guide through a complicated project: clear about scope, rigorous about evidence, and easy to approach. Trust should come from verified project detail, explained process, precise content, responsive communication paths, and operationally sound intake—not invented numbers or prestige language.

### Voice

- Assured, calm, useful, and technically literate.
- Specific verbs and plain explanations rather than inflated superlatives.
- “Start a Project” is the primary conversion action; “View Projects” is the principal evidence action.
- Claims that depend on qualifications, licenses, delivery partners, geography, or outcomes remain unpublished until verified.

## 4. Audience and jobs

| Audience | Primary question | Product response |
|---|---|---|
| Individual building a home | Can RENZ help me understand and progress the whole journey? | Plain-language service paths, process, relevant residential evidence, guided intake. |
| Property developer | Can this team control scope, coordination, time, and cost? | Capability detail, project evidence, governance/process content, qualified inquiry. |
| Commercial business or institution | Is RENZ credible, compliant, and operationally dependable? | Verified credentials, safety/quality evidence, procurement-ready contact path. |
| Diaspora client building in Rwanda | How can I obtain visibility and make decisions remotely? | Clear stages, communication expectations, document upload, location-aware inquiry. |
| Existing property owner | Can RENZ assess and improve an existing building? | Renovation pathway, constraints content, relevant case studies, diagnostic inquiry. |
| Partner or subcontractor | Is there a legitimate collaboration route? | Contact routing and future partner pathway, without a launch-only page unless demand is proven. |

Audience-specific landing pages are deferred. The first release should use one strong architecture with context-sensitive links and examples.

## 5. Expertise architecture

The ten brief-supplied services remain recognizable but are grouped by customer task:

1. **Plan & Design** — Architecture & House Plans; Land Surveying; Structural Design; Interior Design & Fit-Out.
2. **Cost & Manage** — Cost Planning & Estimation; Project Management & Supervision; Construction Consultancy.
3. **Build & Improve** — Building Construction; Renovation & Remodeling; Civil Works & Infrastructure.

“Structural Engineering” and “Quantity Surveying” are publish gates because those names may imply regulated professional capacity. Final labels must reflect RENZ's actual legal delivery model, internal qualifications, and any partner arrangements. See `INFORMATION_ARCHITECTURE.md` for the complete navigation and route model.

## 6. Public product architecture

### Canonical launch routes

- `/` — proposition, expertise, selected work, process, conditional proof, insights, and conversion.
- `/expertise` and `/expertise/[slug]` — grouped overview and one evidence-rich page per approved service.
- `/projects` and `/projects/[slug]` — filterable project index and case-study narratives.
- `/about` — verified story, approach, team, quality/safety, and credentials.
- `/insights` and `/insights/[slug]` — useful evergreen guidance and project knowledge.
- `/start-a-project` — guided project brief.
- `/contact` — lower-friction contact and verified company details.
- `/privacy`, `/terms`, owned `404`, and route-error states.

### Homepage sequence

1. Optional first-eligible-session RENZ opener with skip and reduced-motion bypass.
2. Cinematic but content-first hero: proposition, short qualifier, `Start a Project`, `View Projects`.
3. Company proposition and operating idea.
4. Interactive expertise grouped by Plan & Design / Cost & Manage / Build & Improve.
5. Selected case studies, only after client-verified project media and facts exist.
6. Who RENZ helps and why each audience should continue.
7. Project journey from discovery through handover.
8. Quality, safety, and sustainability, expressed only with verified practices.
9. Conditional proof: credentials, metrics, and testimonials render only when approved evidence exists.
10. Insights preview.
11. Strong project-start CTA and information-dense footer.

The datum line is the continuity device; sections should not repeat the same dark card grid or alternate mechanically between identical split layouts.

## 7. Project intake architecture

The brief describes ten question groups. The recommended implementation presents them as seven humane steps while preserving all ten data domains:

1. Need — service and project/property type.
2. Context — current stage and location.
3. Scale — approximate size and optional supporting detail.
4. Parameters — indicative budget and desired timeline, explicitly non-binding.
5. Supporting material — optional documents/images with clear limits.
6. Contact — identity, preferred channel, consent, and privacy notice.
7. Review and submit — editable summary, anti-abuse validation, idempotent finalization.

The concept board deliberately shows the ten-part anatomy from the brief; it is not a mandate for ten separate screens. No pricing engine, quotation, or eligibility decision is made in the wizard.

## 8. Admin product architecture

The admin is an operational product, not a set of CMS forms. Its canonical areas are:

- Overview: action queue, publication warnings, lead follow-up, system health summaries.
- Leads: project requests, contact messages, detail, attachments, internal notes, ownership, stage history.
- Content: projects, expertise, insights, pages, homepage curation, team, testimonials.
- Media: originals, derived assets, metadata, usage, replacement, archive state.
- Website: navigation, SEO/social defaults, verified company information, integrations.
- System: users, roles, permissions, audit log, settings.

Proposed editorial lifecycle: `Draft → In Review → Approved → Published → Archived`.
Proposed lead lifecycle: `New → Contacted → Qualified → Site Visit → Proposal → Won/Lost`.

Both are recommendations pending client operating policy. Homepage editing is curated slots with guardrails, not a free-form page builder. Tables remain the primary dense view; a Kanban lead view is optional after workflow volume is understood.

## 9. Brand and visual direction

### Creative north star: Datum & Mass

A single gold survey datum moves through dark navy structure, white space, concrete neutrals, photographs, section drawings, and restrained technical annotations. The expression is architectural without falling into crane icons, real-estate brochure styling, glassmorphism, rounded “card soup,” cream-and-brown lifestyle branding, or neon agency effects.

### Provisional palette and type

- Deep navy `#071523`: structural ground and primary wordmark field.
- Gold `#C69A3A`: datum, focus support, active accents, and selected high-emphasis action.
- True white `#FFFFFF` and concrete `#F1F2EF`: editorial breathing room.
- Graphite `#303940` and steel `#7D8992`: light-surface text hierarchy, subject to contrast validation.
- Montserrat: short display and brand utility roles.
- Source Sans 3: recommended body, form, and admin text.
- IBM Plex Mono: optional technical metadata only.

### Logo direction

The generated **Structural Fold R** explores an R built from a column, roof/fold, and one gold datum. It is a provisional design hypothesis—not the RENZ logo. Approval is blocked until the original mark and brand board are recovered, compared, reconstructed as vectors if needed, checked at small sizes and one color, reviewed for distinctiveness/legal risk, and approved by the client.

## 10. Technical recommendation

Use one server-first Next.js application with two route groups—public marketing and `/admin`—backed by managed Supabase. Recommended baseline:

- Node.js 24 LTS; Next.js 16.3.x; React 19.2; strict TypeScript 6 initially.
- Tailwind CSS 4.3 with design tokens generated from `DESIGN.md`.
- Selective shadcn primitives for maintained accessibility-heavy admin controls.
- Motion for state/layout animation; CSS for simple transitions; GSAP only if one measured signature sequence justifies it; no baseline Three.js/WebGL.
- Supabase Postgres, Auth, Storage, RLS, `@supabase/ssr`, and generated database types.
- Zod at external and mutation boundaries; React Hook Form for the wizard and dense admin forms, not every field.
- Vitest, Testing Library, Playwright, axe, and pgTAP/database policy tests.

Server Components own public reads and most page composition. Server Actions and Route Handlers are treated as public endpoints and repeat authentication, authorization, validation, and abuse checks. Public, session-aware, and privileged Supabase clients are separated; a secret/service client is server-only and narrowly scoped.

## 11. Data and security shape

The data model separates identity/RBAC, content/localization, media, leads, and audit history. One `leads` core supports project briefs and contact messages without duplicating lifecycle logic. Content references real foreign keys; SEO records are not polymorphic catch-alls.

Defense in depth requires:

- server authorization plus database grants plus RLS—never hidden UI alone;
- capability checks based on fresh database state, not stale client role labels;
- MFA policy for privileged users, secure SSR cookies, revocation behavior, and audit events;
- Turnstile or equivalent public-form protection with mandatory server verification;
- private originals and quarantined lead uploads, allow-listed MIME/size, magic-byte validation, randomized keys, and malware scanning before staff access;
- CSP and security headers; strict secret separation; redacted telemetry;
- retention, export, deletion, consent, and data residency decided before launch.

## 12. Responsive, accessibility, performance, and motion strategy

- Mobile is recomposed, not reduced: vertical project stories, disclosure-based expertise, vertical process, full-screen architectural menu, single-column wizard, and safe-area-aware actions.
- WCAG 2.2 AA is the target. Keyboard access, 200% zoom/reflow, visible focus, semantics, field errors, reduced motion, contrast, touch/no-hover, and screen-reader review are release evidence.
- Core Web Vitals launch targets at the 75th percentile: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1.
- Provisional public budget: ≤170 KiB first-route JavaScript compressed; hero image roughly ≤250 KB mobile/≤450 KB desktop; no more than four initial WOFF2 files; dimensions reserved for all media.
- The opener is optional and capped near 1.4s. Reduced motion removes transforms, scrubbing, pinning, parallax, and stagger delay; content is immediately available.
- Analytics, motion, video, maps, and chat never block useful initial rendering.

## 13. Content and SEO strategy

Content is evidence-led and stateful. A claim can be draft, awaiting evidence, verified, approved, published, or retired. Project pages require approved media rights and facts before publication. AI-generated concept buildings never enter the portfolio.

The launch search architecture uses one canonical page per approved service, strong project case studies, useful insight pillars, intentional internal links, server-rendered metadata, canonical URLs, image/social metadata, XML sitemap, robots controls, and structured data only for verifiable facts. LocalBusiness/Organization fields, service areas, address, phone, hours, profiles, credentials, and reviews are publish gates.

## 14. Operating and deployment recommendation

Use managed Vercel plus managed Supabase as the starting deployment, with independent preview/staging/production environments and isolated databases/buckets/keys. Choose regions only after Rwanda latency measurements, operational ownership, and legal/data-location review. A Supabase Africa region should not be assumed.

Observe server failures, auth/RLS denials, upload rejection, lead conversion, performance, and search health without placing sensitive project details or attachments in logs. Product analytics remains consent-aware and non-blocking.

## 15. Phase 0 decisions and deferrals

| Decision | Phase 0 disposition |
|---|---|
| Product structure | Recommended and documented. |
| Final business/service claims | Blocked pending client evidence. |
| Brand direction | Coherent provisional direction produced. |
| Final logo/identity | Blocked pending original source assets and approval. |
| Runtime stack | Recommended; versions must be revalidated at Phase 1 start. |
| Supabase schema/RLS | Designed; no migrations created. |
| Admin permissions and workflows | Proposed; owner approval required. |
| Intake fields and retention | Proposed; privacy/operations approval required. |
| Visual concept boards | Produced and reviewed as reference material only. |
| Production code/deployment | Explicitly deferred to Phase 1. |

## 16. Client facts required before implementation or publication

1. Original logo files, brand board, font files/licenses, color values, and usage rules.
2. WhatsApp services image and any conflicting naming or scope information.
3. Legal company name, registration details, office/address, phone, email, hours, service areas, social profiles, and preferred language(s).
4. Which services RENZ directly performs, which require partners, and which regulated titles/claims it may lawfully use.
5. Verified project inventory, dates, locations at safe granularity, scopes, outcomes, media rights, client naming permissions, and before/after provenance.
6. Team identities, roles, biographies, credentials, memberships, licenses, certificates, awards, and the evidence/expiry owner for each.
7. Quality, safety, sustainability, warranty, procurement, supervision, and communication practices that can be documented.
8. Approved testimonials, reviewers, consent, and relationship context.
9. Lead owners, SLA, stage definitions, notifications, export permissions, attachment policy, retention/deletion rules, consent text, and privacy/legal review.
10. Admin roles, capability matrix, MFA/recovery policy, offboarding, break-glass ownership, audit retention, and incident contacts.
11. Hosting/data-location constraints, DNS owner, email provider, analytics/consent choices, backup objectives, and operating budget.

## 17. Principal risks

| Risk | Impact | Required response |
|---|---|---|
| Missing identity sources | Rework or accidental brand replacement | Recover and compare before identity approval. |
| Unsupported regulated service language | Legal/reputational exposure | Qualified client/legal review of naming and delivery model. |
| No verified project evidence | Portfolio and trust modules cannot honestly launch | Build an evidence register and media-rights workflow. |
| Undefined permissions/retention | Unauthorized access or unlawful data handling | Approve policy before migrations and admin workflows freeze. |
| Lead attachments | Malware, privacy, and staff-device risk | Quarantine, validate, scan, restrict, retain minimally. |
| Motion-heavy ambition | LCP/INP/accessibility regressions | Admit effects only within measured budgets and reduced-motion contract. |
| Empty/non-Git repository | No history, CI, rollback, or ownership baseline | Establish repository governance at Phase 1 start. |
| Region and integration uncertainty | Latency, availability, or compliance mismatch | Benchmark from Rwanda and decide with the operational owner. |

## 18. Documentation map

- `REPOSITORY_ASSESSMENT.md` — exact starting state and source recovery gates.
- `INFORMATION_ARCHITECTURE.md` — routes, navigation, expertise taxonomy, homepage, and responsive structure.
- `CONTENT_MODEL.md` — public content types, evidence rules, wizard/contact data, and localization.
- `ADMIN_PRODUCT.md` — internal IA, lifecycles, roles, states, and workflows.
- `TECHNICAL_ARCHITECTURE.md` — stack, module boundaries, caching, performance, test, and deployment plan.
- `DATABASE_ARCHITECTURE.md` — schema, tables, relationships, constraints, indexes, and migrations.
- `SECURITY_MODEL.md` — threats, auth, RBAC/RLS, storage, headers, privacy, tests, and incident model.
- `SEO_STRATEGY.md` — search ownership, metadata, structured data, content pillars, and governance.
- `DESIGN_SYSTEM.md` and root `DESIGN.md` — visual system, tokens, components, and ownership.
- `MOTION_SYSTEM.md` — animation grammar, signature sequences, reduced-motion, and admission tests.
- `VISUAL_CONCEPTS.md` — generated concept manifest, prompt set, critique, and ethical usage.
- `IMPLEMENTATION_ROADMAP.md` — Phase 1 preconditions, work sequence, verification, and exit gates.
- Root `UX-CONTRACT.md` — durable behavior, states, navigation, forms, async, permissions, and QA contract.

## 19. Phase 1 entry decision

Phase 1 may begin with repository and non-claim-bearing foundation work after the technical owner confirms the stack. Brand-dependent implementation must wait for the source identity comparison. Database/auth/admin and public intake work must wait for explicit permission, privacy, retention, and lead-operations decisions. Public proof modules must wait for verified content.

The implementation sequence and acceptance gates are defined in `IMPLEMENTATION_ROADMAP.md`.
