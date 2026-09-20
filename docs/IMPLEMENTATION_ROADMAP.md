# RENZ Phase 1 Implementation Roadmap

**Status:** S9A-P client-preview signature elevation complete within its local noindex boundary; final S9 is incomplete, S5 overall remains in progress, and S5B is the mandatory next slice
**Prepared:** 27 August 2026
**Scope:** Sequenced delivery plan for the public website, Start a Project intake, administration product, data platform, and production operations

> **Authority update — 30 August 2026:** The current user instruction passes G0 and authorizes S0 repository/source/governance work, including Git initialization. Stop after S0. Do not scaffold the application, install its dependency set, create cloud resources or migrations, or build the production homepage in this task. Later slices still require their exact assignment and entry evidence.

> **Authority update — 2 September 2026:** S1 was accepted for progression and the project lead explicitly authorized S2 as a local-only migration spine, overriding the G5 cloud-decision dependency only for local work. S2 is now **PASS** within that boundary: the local PostgreSQL 17 stack, repeatable migrations/seeds, 218 pgTAP assertions, two-session integrity race, warning-failing lint, generated types, lifecycle ownership, and isolated Linux database CI definition were verified. S3 and all cloud, Auth, Storage, intake, admin, and deployment work remain unauthorized.

> **Authority update — 5 September 2026:** The project lead explicitly authorized S3. S3 is **PASS** for the local invitation-only staff identity, mandatory TOTP MFA, fresh RBAC, grants, RLS, audit, and protected admin-shell boundary. The dated product-expansion record captures public guest access, commercial, analytics, and premium-experience direction; those capabilities remain deferred to their named slices. No cloud project, production identity, or deployment was created.

> **Authority update — 5 September 2026 / S4:** The project lead explicitly authorized S4 under the evidence-safe revised scope. S4 may build local schema, typed evidence, rights/provenance state, publication checks, private Storage foundations, public projections, synthetic fixtures, server commands, RLS, grants, and tests. Unverified content remains draft/private; missing evidence blocks publication; unknown rights block promotion; concept/generated/synthetic media cannot become completed-project evidence. The S4 engine is implemented and verified locally. Real RENZ public content, production uploads, public frontend delivery, and S5 admin authoring remain gated.

> **Authority update — 6 September 2026 / S5A:** The project lead accepted S4 and authorized the first S5 vertical. S5A is **PASS** for the synthetic-first local authenticated workspace and Services register/create/editor/evidence/readiness/private-preview/publication workflow, including capability-filtered navigation, AAL2/direct-action enforcement, responsive browser/axe acceptance, two-actor conflict protection, deterministic reconciliation, and S1–S4 regression. S5 overall remains **IN PROGRESS**. S5B Projects + Project Media, later admin verticals, S6 public delivery, real client content, cloud resources, and deployment remain separately gated.

> **Authority update — 8 September 2026 / S6A fast-track:** The project lead accepted S5A and deliberately accelerated S6A ahead of S5B for a local client-facing preview. S6A is **PASS** for the server-first noindex public route system, S4 published-projection integration, Datum & Mass visual foundation, accessible architectural navigation, honest empty states, responsive/reduced-motion behavior, screenshot correction loop, and public plus S5A/S4 regression. This is an ordering exception, not a cancellation: S5B Projects + Project Media administration remains mandatory. No S7 intake, S8 operations, S9 signature-motion completion, real-content promotion, cloud resource, deployment, or indexing is authorized by this note.

> **Authority update — 9 September 2026 / S9A-P preview elevation:** The project lead accepted S6A as an engineering foundation but rejected its rendered pixels as the final visual target, then authorized a bounded signature-experience sprint. S9A-P is **PASS** only for the local client-preview layer: a preview-gated provisional brand derivative, construction opener, Hero 2.0, architectural field family, differentiated routes, varied concept-labelled project studies, normal-scroll project story, accessible Drawing → Reality control, proof/contact presentation architecture, responsive/reduced-motion behavior, and visual correction loops. It is not final S9, approves no identity or business fact, creates no project/media admin or intake capability, and changes no S4/S5A authority. S5B Projects + Project Media administration is **READY / MANDATORY** immediately after client review.

The monogram raster and WhatsApp service screenshot are now authenticated. The expected AI reference board is absent; even if recovered, it is a creative reference and not an original identity standard or business-evidence source. Current G0–G6 status is authoritative in [`PHASE_1_DECISION_REGISTER.md`](./PHASE_1_DECISION_REGISTER.md).

## 1. Purpose and authority boundary

The repository began empty and without Git metadata. Phase 0 produced discovery, product, architecture, security, SEO, and visual-concept artifacts only. There is no application to continue and no legacy behavior to preserve.

Phase 1 should build the smallest secure, coherent vertical product in controlled slices. Each slice must be independently reviewable, testable, deployable, and reversible. A later slice may not be used to excuse incomplete authorization, accessibility, security, evidence, or rollback work in an earlier one.

This roadmap is synthesized from:

- [Repository Assessment](./REPOSITORY_ASSESSMENT.md)
- [Information Architecture](./INFORMATION_ARCHITECTURE.md)
- [Content Model](./CONTENT_MODEL.md)
- [Admin Product](./ADMIN_PRODUCT.md)
- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Database Architecture](./DATABASE_ARCHITECTURE.md)
- [Security Model](./SECURITY_MODEL.md)
- [SEO Strategy](./SEO_STRATEGY.md)
- [S4 Report](./PHASE_1_S4_REPORT.md)
- [S4 Content/Evidence Model](./PHASE_1_S4_CONTENT_EVIDENCE_MODEL.md)
- [S4 Publication Rules](./PHASE_1_S4_PUBLICATION_RULES.md)
- [S4 Media Architecture](./PHASE_1_S4_MEDIA_ARCHITECTURE.md)
- [S4 Public Projections](./PHASE_1_S4_PUBLIC_PROJECTIONS.md)
- [S4 Storage Security](./PHASE_1_S4_STORAGE_SECURITY.md)
- [S9A-P Signature Experience Inventory](./S9A_SIGNATURE_EXPERIENCE_INVENTORY.md)
- [S9A-P Provisional Brand Mark](./S9A_PROVISIONAL_BRAND_MARK.md)
- [S9A-P Project Experience Study](./S9A_PROJECT_EXPERIENCE_STUDY.md)
- [S9A-P Motion Choreography](./S9A_MOTION_CHOREOGRAPHY.md)
- [S9A-P Preview Signature Report](./S9A_PREVIEW_SIGNATURE_REPORT.md)

If implementation evidence conflicts with these recommendations, stop the affected slice, record the evidence and decision, and obtain approval before changing the architecture.

## 2. Phase 1 entry gates

Phase 1 is authorized, but work remains gate- and slice-bound. G0 has passed; G1–G6 retain the current statuses in the decision register so missing facts cannot become code, public claims, database defaults, or operational promises.

### G0 — Explicit authorization and Phase 0 acceptance

**G0 status (2026-08-30): PASS.** The current instruction authorizes Phase 1 and assigns S0 only. Unresolved owners and later-slice decisions remain recorded rather than inferred.

Required evidence:

- Written user authorization to begin Phase 1.
- Review and acceptance, or recorded amendments, for the Phase 0 information architecture, content model, admin workflow, technical architecture, database architecture, security model, SEO strategy, visual direction, and this roadmap.
- A named decision owner for unresolved product, content, security, legal, and infrastructure questions.
- Agreement that generated concepts are exploratory and not proof of RENZ projects, credentials, staff, or current brand ownership.

**Gate rule:** No application or infrastructure work begins before G0 passes.

### G1 — Client source-material recovery and brand disposition

Required evidence:

- Existing logo/monogram and WhatsApp service evidence are present under `references/client/`; any client-supplied AI reference is inventoried separately and never described as an original identity standard or business evidence.
- Every file is inventoried by exact path, format, size, dimensions where applicable, and SHA-256 hash, then visually reviewed.
- Original files remain untouched and are distinguishable from derivatives and generated concepts.
- The client confirms the authoritative service wording and whether the architectural `R` is to be refined, redrawn, or replaced.
- Exact palette, typography, logo variants, publication rights, and font licensing are recovered or explicitly approved as a new system.
- Approved identity behavior is tested for symbol, horizontal, stacked, monochrome, reversed, navy/gold, favicon, mobile header, helmet, print, and signage use.

**Gate rule:** Missing client assets are a hard blocker for brand approval, public visual implementation, logo production, and any claim that a concept preserves existing equity. They are not replaced by prompt descriptions or generated approximations.

### G2 — Verified business, service, and proof facts

Required evidence:

- Approved legal/public company name and descriptor.
- Approved service taxonomy, scopes, exclusions, delivery modes, service areas, and terminology such as Engineering, Quantity Surveying, supervision, and fit-out.
- Clear distinction between work delivered in-house, partner-led, subcontracted, or coordinated.
- Official domain, email, phone, WhatsApp, address/service area, hours, and social profiles.
- Client-validated project journey and contact handoff.
- Rights-cleared project inventory with RENZ role, dates/status, public-safe location, client/property permission, media rights, and verified outcomes.
- Approved team, credentials, testimonials, statistics, quality, safety, sustainability, or compliance evidence—or an explicit decision to omit those modules.

**Gate rule:** Unverified facts stay absent or draft. They may be represented by typed CMS fields and review states, but never by invented production values or public seed data.

### G3 — Administrative authority and operating model

Required evidence:

- Named initial administrators and approved Super Admin, Admin, and Editor capabilities.
- Decision on Editor publication, Admin lead export, claim verification, audit access, role management, and last-Super-Admin recovery.
- Approved lead stages, assignment rules, response ownership, next-action behavior, Won/Lost reasons, duplicate/spam workflow, and contact-message conversion.
- Approved content owners, reviewers, publishers, stale-content policy, media-rights owner, and legal/privacy reviewer.
- Decision on whether Sales or Project Manager roles are required at launch.

**Gate rule:** Role names alone are not authorization. Slice S3 cannot exit until the permission matrix and recovery process are approved.

### G4 — Privacy, security, intake, and file policy

Required evidence:

- Approved privacy notice, terms, consent text/versioning, lawful operational owner, and applicable retention/deletion obligations.
- Lead, note, attachment, audit, authentication-log, analytics, and backup retention decisions.
- Accepted upload types, count, size, CAD/archive policy, malware-scanning provider, quarantine behavior, detection response, and object-backup plan.
- Rate-limit thresholds, Turnstile outage behavior, abuse-response owner, and verified alternative contact channels.
- Approved MFA recovery, account invitation/recovery, custom SMTP, break-glass, secret rotation, incident contacts, and notification ownership.
- Approved analytics, monitoring, consent, replay, and data-processing providers, or a decision to omit them.

**Gate rule:** Capabilities whose safe policy is unresolved remain disabled. In particular, public attachments, lead export, session replay, broad HTML, SVG upload, CAD/archive upload, and privileged integrations are not enabled speculatively.

### G5 — Platform ownership, region, and recovery

Required evidence:

- Approved hosting and Supabase plans, budget, account owners, billing owner, domain/DNS owner, and least-privilege operator access.
- Rwanda-origin latency measurements for candidate Supabase and application regions plus a data-location decision.
- Approved database and Storage RPO/RTO, backup tier, separate object-backup design, restore owner, and restore-test cadence.
- Separate local, preview/staging, and production environment model with no production data or credentials in preview.
- Deployment approval, release owner, incident owner, and rollback authority.

**Gate rule:** Production infrastructure is not created until ownership and recovery responsibilities are explicit.

### G6 — Repository and toolchain governance

Required evidence:

- Authorization to initialize Git and capture the reviewed Phase 0 foundation in a baseline commit.
- Approved default branch, review rules, required checks, commit/PR conventions, secret scanning, and dependency update ownership.
- Node, package manager, Next.js, React, TypeScript, Tailwind, Supabase CLI, and testing versions rechecked against official sources at scaffold time.
- Package manager and production dependencies exact-pinned; lockfile policy approved.
- Approved environment-variable inventory with public and server-only classifications.

**Gate rule:** No package installation occurs before the repository baseline and version decisions are recorded.

## 3. Delivery principles

Every Phase 1 slice follows these rules:

1. **One reviewable outcome.** A slice ends in a demonstrable business or platform capability, not a broad layer of unfinished code.
2. **Server-first and capability-oriented.** Route files compose; feature modules own schemas, reads, commands, permissions, and feature UI.
3. **Security with the feature.** Authentication, authorization, grants, RLS, validation, audit, logging redaction, and abuse cases ship with the operation they protect.
4. **Synthetic by default.** Local and preview data is unmistakably synthetic and cannot resemble RENZ proof, staff, testimonials, credentials, or completed projects.
5. **Evidence-aware publication.** Draft, unverified, expired, rejected, rights-incomplete, private, and concept/demo content is not publicly readable.
6. **Accessibility and responsive behavior are acceptance criteria.** They are not deferred to a final polish sprint.
7. **No silent scope expansion.** Three.js/R3F, GSAP, CRM synchronization, broad exports, real-time subscriptions, revisions, scheduling, notification centers, client portals, public pricing, and advanced analytics require their own evidence and gate.
8. **Forward-compatible delivery.** Database changes use expand–migrate–contract; code and content can roll back without destructive automatic down migrations.
9. **Document the decision.** A dependency, provider, schema deviation, permission change, or accepted risk includes its reason, owner, and rollback impact.

## 4. Workstream sequence and dependencies

The sequence below is the critical path. Limited parallel work is allowed only after the shared dependency has passed and cannot bypass the slice exit review.

| Slice | Workstream | Depends on | Additional gate |
| --- | --- | --- | --- |
| S0 | Repository baseline and decision freeze | G0–G6 | All entry blockers resolved or explicitly rejected by the user with a safe revised scope |
| S1 | Application and CI foundation | S0 | Revalidated pinned versions and dependency register |
| S2 | Local data platform and migration spine | S1 | G5 environment model and recovery direction |
| S3 | Identity, MFA, RBAC, grants, and RLS spine | S2 | G3 and security portions of G4 |
| S4 | Content, evidence, media, and publication kernel | S3 | G1, G2, media-rights and file-policy decisions |
| S5 | Admin content vertical slice | S4 | Approved editorial permissions and publish checklist |
| S6 | Public content delivery and technical SEO base | S4, then S5 publication behavior | Canonical domain/locale decisions; verified publishable content may remain absent |
| S7 | Contact and Start a Project intake | S3, S4, S6 | G3/G4 intake, privacy, routing, retention, and upload decisions |
| S8 | Lead operations and actionable dashboard | S7 | Approved lead ownership, stages, export and attachment access |
| S9 | Approved brand system and public experience | S6 | G1/G2 fully passed; rights-cleared imagery and approved public copy |
| S10 | Cross-cutting accessibility, performance, SEO, security, and observability hardening | S5–S9 | Approved providers and production-like staging |
| S11 | Release rehearsal and controlled rollout | S10 | All launch gates, verified content, operations, recovery, and explicit go-live approval |

Do not solve a later visual dependency by placing generated buildings into the portfolio, and do not solve a missing workflow decision by hard-coding an assumed role or status.

## 4.1 Future product extensions recorded 5 September 2026

The client product expansion is recorded in [`CLIENT_PRODUCT_EXPANSION_2026-09-05.md`](./CLIENT_PRODUCT_EXPANSION_2026-09-05.md). These are future capabilities, not S3 implementation:

- **S7 guest requests:** public Contact, Start a Project, service requests, and approved material requests without customer accounts.
- **S8 commercial operations:** lead/request operations followed by quotation, order, invoice, status, and audit foundations only after legal, tax, currency, and payment decisions are verified.
- **S9 premium experience:** approved identity, rights-cleared photography/media, responsive storytelling, and measured motion.
- **S10 insight and hardening:** privacy-aware first-party analytics, consent, retention, rate limits, observability, CSP, performance, and security hardening.

No invoice, order, analytics, consent, customer account, upload, or premium-motion schema or route is implied by this record.

## 5. Slice plans and acceptance criteria

### S0 — Repository baseline and decision freeze

**Outcome:** A governed, reviewable starting point exists before application code.

Work:

- Re-inventory the repository and client references after source recovery.
- Resolve or assign every entry-gate decision and record accepted deferrals.
- Initialize Git only after authorization; add safe ignore/attribute rules and capture Phase 0 artifacts in a baseline commit.
- Record the package manager, runtime versions, supported operating systems, branch rules, dependency policy, environments, and account owners.
- Classify generated concepts, client originals, approved derivatives, and future production assets distinctly.

Acceptance criteria:

- Git reports the approved branch and clean baseline; the baseline contains no secrets, local credentials, cache, build output, or unapproved client material.
- Every Phase 0 file and recovered client original has a known provenance and handling rule.
- All G0–G6 items are passed, explicitly deferred with a safe omission, or returned to the user as a blocker.
- Dependency and provider decisions have a stated purpose and owner.
- No application package, cloud project, migration, or production content exists yet.

### S1 — Application and CI foundation

**Outcome:** A minimal Next.js App Router application builds reproducibly without implementing the production homepage.

Work:

- Scaffold one Next.js/React application with strict TypeScript, Tailwind, server-first defaults, and capability-oriented boundaries.
- Establish `app`, `features`, `components`, `lib`, `styles`, `supabase`, and `tests` boundaries from the technical architecture.
- Add separate public/server environment schemas; server modules use a server-only guard.
- Add formatting, linting, type checking, unit test, build, dependency, and secret checks to CI.
- Add only baseline dependencies whose Phase 0 rationale is approved. shadcn source is admitted selectively for accessible admin primitives; GSAP and Three.js are absent.

Acceptance criteria:

- A clean locked install and production build pass on the pinned Node/package-manager versions.
- Strict TypeScript, lint, formatting, unit smoke tests, and dependency/secret checks pass.
- No server-only value appears in a client bundle or public environment schema.
- Route groups and module boundaries compile without a broad client boundary or generic privileged database utility.
- The rendered smoke route has semantic landmarks, keyboard-visible focus, loading/error/not-found scaffolds, and no fabricated RENZ content.
- Bundle baseline and build output are captured for later comparison.

### S2 — Local data platform and migration spine

**Outcome:** The schema can be recreated from reviewed migrations and synthetic seeds.

Work:

- Initialize pinned Supabase local tooling and source-controlled SQL migrations.
- Introduce schema conventions, publication state, timestamps, authorship, optimistic versioning, localization, constrained content blocks, intentional cascades, and targeted indexes.
- Add identity mapping, permissions, content, media, leads, settings, and audit structures in dependency-safe migrations.
- Generate and commit database TypeScript types from the migration-defined schema.
- Create clearly synthetic seeds and pgTAP coverage for constraints, foreign keys, indexes, grants, functions, and reset reproducibility.

Acceptance criteria:

- A clean local database reset applies the full migration history without dashboard-only steps.
- Database tests pass from an empty local state and generated types have no uncommitted diff.
- Every exposed table has an explicit RLS/grant plan, even before later policies are enabled.
- Foreign keys, unique constraints, publication checks, deletion behaviors, and indexes match the approved architecture.
- Seed data is unmistakably synthetic and cannot be published as RENZ proof.
- Database and Storage recovery are documented as separate concerns.

### S3 — Identity, MFA, RBAC, grants, and RLS spine

**Outcome:** An invited administrator can authenticate at AAL2 and perform only explicitly permitted operations.

Work:

- Configure invitation-only Supabase Auth, SSR cookie sessions, protected admin routes, MFA enrollment/verification, and session-revocation behavior.
- Implement roles, permissions, role mappings, fresh permission checks, final-Super-Admin protection, and redacted audit events.
- Provide the operator-only one-shot bootstrap command for the first pending-MFA Super Admin; never expose bootstrap as a public application route.
- Separate public, browser, authenticated-server, and narrow privileged-server adapters.
- Add explicit privileges and separate SELECT/INSERT/UPDATE/DELETE RLS policies for every exposed resource.
- Test direct Server Action/Route Handler invocation, stale roles, disabled users, AAL downgrade, ID substitution, CSRF/origin failure, and cross-role denial.

Acceptance criteria:

- Public signup is disabled; an uninvited user cannot enter admin.
- AAL1 cannot access protected administrator data; AAL2 plus the exact permission is required.
- Authentication alone grants no content, lead, role, attachment, settings, or audit access.
- Anonymous users cannot read drafts or sensitive tables and cannot insert directly into lead tables.
- Role removal or profile disablement is effective at the next protected operation, not only after JWT expiry.
- The privileged key is server-only, narrowly callable, absent from logs/bundles, and not used for ordinary admin work.
- Initial bootstrap is serialized, refuses any existing Super Admin assignment, and leaves the invited profile pending until TOTP activation.
- RLS and grant tests prove allow and deny cases for every introduced table and operation.

### S4 — Content, evidence, media, and publication kernel

**Outcome:** The local evidence-safe publication engine exists; actual RENZ content remains private until its source, rights, consent, review, and approval gates pass.

Work:

- Implement Expertise, Projects, Insights, bounded Pages, Team, Testimonials, site settings, navigation, localization, and constrained homepage-section records.
- Implement evidence and verification states for claims, credentials, testimonials, and time-sensitive content.
- Implement private editorial originals, public derivatives, immutable object paths, rights/consent metadata, contextual alt text, usage tracking, and safe promotion.
- Keep concept/demo classification non-promotable to completed-project media through ordinary editing.
- Implement transactional publish/unpublish/archive commands, centralized Next.js cache invalidation, optimistic concurrency, and redacted audit.
- Add local Storage provisioning/status/verification and report-only database/object reconciliation.

Acceptance criteria:

- Anonymous queries return only effective published rows and finalized public derivatives.
- Draft, expired, rejected, rights-incomplete, private, concept/demo, and unverified records remain inaccessible publicly.
- Public settings expose only allow-listed non-secret values.
- An in-use media asset cannot be hard-deleted; replacement preserves or explicitly reviews usages.
- Raw HTML, executable markup, SVG upload, and dangerous URL protocols are rejected at launch.
- Publication fails with actionable reasons when evidence, rights, required SEO, accessibility, or relationship checks fail.
- Publish/unpublish/archive operations are atomic where required, audited, concurrency-safe, and invalidate the smallest correct cache scope.
- Local verification proves the full S2/S3/S4 pgTAP suite, warning-failing database lint, generated-type consistency, private bucket policy, and report-only media reconciliation.

S4 stop boundary: no S5 admin content UI, S6 public frontend, public intake, production Storage, cloud resources, deployment, scheduler, analytics, orders, invoices, or real RENZ content promotion.

### S5 — Admin content vertical slice

**Outcome:** Authorized editors can manage a complete, evidence-aware content lifecycle without accessing unrelated capabilities.

**Current implementation note — 9 September 2026:** S5A completes the workspace shell and Services content vertical. The reusable pattern is documented in `PHASE_1_S5_ADMIN_UX_ARCHITECTURE.md`, `PHASE_1_S5_SERVICES_WORKFLOW.md`, and `PHASE_1_S5_ADMIN_ACCESSIBILITY.md`. S5 overall is not complete: after the deliberately accelerated S6A and bounded S9A-P preview work, S5B Projects + Project Media administration is now the mandatory next engineering vertical, followed only by separately approved content domains.

**Updated implementation note — 11 September 2026 (Claude Phase C3):** S5B/S5C Projects + Media Command Center administration is complete, mirroring the S5A pattern exactly (see `docs/CLAUDE_C3_PROJECT_CASE_STUDY_ARCHITECTURE.md` and `docs/CLAUDE_C3_PROJECT_MEDIA_WORKFLOW.md`). Authorized staff can draft, edit, factually review, link services, add story chapters, upload and rights-clear media (a real original+derivative pipeline, fixing a pre-existing S4 Storage kernel gap in the process), inspect authoritative readiness, privately preview the real public rendering, publish, see the project appear on the real public site, and unpublish/archive — all audited. S5 as a whole is still not complete: no operational Client/CRM/invoice/contractor/payment domain (C4) exists yet, and that boundary is now durably recorded in `docs/CLAUDE_C3_PUBLIC_OPERATIONAL_PROJECT_BOUNDARY.md`.

Work:

- Build the capability-filtered admin shell and one end-to-end content workflow first, then extend the same pattern to approved content types.
- Implement indexes, structured editors, protected preview, content health, media selection, publish checks, history, and responsive product states.
- Use reviewed accessible primitives for menus, dialogs, tabs, tables, filters, comboboxes, uploads, and confirmations.
- Preserve draft input across recoverable errors, session expiry where safe, and optimistic-concurrency conflicts.

Acceptance criteria:

- Editor, Admin, and Super Admin see only permitted navigation and direct URL/action access enforces the same permissions.
- Draft → review/approval → publish → unpublish/archive follows the approved authority matrix.
- Loading, initial empty, filtered empty, denied, not found, recoverable error, partial dependency failure, saving, save-failed, success, destructive, stale/conflict, expired-session, and poor-connection states are designed and tested.
- Editors cannot accidentally present concept media, unsupported proof, expired evidence, or private lead files as public content.
- Keyboard, focus, announcements, 320px reflow, 200% zoom, and representative screen-reader flows pass.
- Every material mutation produces an allow-listed, redacted audit event.

### S6 — Public content delivery and technical SEO base

**Outcome:** Public routes render approved content server-first with correct indexability and safe empty behavior.

**Current implementation note — 8 September 2026:** S6A replaces the neutral technical shell with the production-capable public route and design foundation documented in `PHASE_1_S6_PUBLIC_FRONTEND_ARCHITECTURE.md`, `PHASE_1_S6_RESPONSIVE_SYSTEM.md`, `PHASE_1_S6_PUBLIC_MOTION_FOUNDATION.md`, `PHASE_1_S6_CLIENT_PREVIEW.md`, and `PHASE_1_S6A_REPORT.md`. All routes remain noindex/nofollow and local-preview only. Sitemap submission, production domain/canonical decisions, structured business data, rights-cleared media, final brand/font approval, and later signature interactions remain gated.

Work:

- Implement the route register for Home, Expertise, Projects, About, Insights, Contact, Start a Project entry, Privacy, Terms, and system states without yet adding signature motion.
- Use published-only anonymous projections, static/server caching where valid, tagged invalidation, bounded queries, and meaningful streaming boundaries.
- Implement dynamic metadata, canonicals, robots, sitemap, breadcrumbs, social fallbacks, redirects, real 404s, and conservative structured-data adapters.
- Keep admin, preview, lead, attachment, confirmation, draft, expired, and filter-only resources non-indexable and authorization-protected where applicable.

Acceptance criteria:

- Every public route works without client-side JavaScript for its critical content and action links.
- No private, draft, expired, preview, or personal data appears in HTML, metadata, cache, sitemap, structured data, or social previews.
- Empty proof, project, team, testimonial, statistics, or insight modules collapse cleanly instead of rendering filler.
- Canonicals, route status codes, metadata, sitemap inclusion, breadcrumbs, and redirects are deterministic and tested.
- Structured data mirrors visible verified facts; passing syntax validation is not treated as evidence approval.
- Navigation and route states work by keyboard, with reduced motion and constrained-network behavior.

### S7 — Contact and Start a Project intake

**Outcome:** Visitors can submit a validated, privacy-aware inquiry without obtaining direct database write access.

Work:

- Build the seven-step project wizard and lower-friction contact form from approved option sets and consent text.
- Add coarse provider/firewall rate limiting, body limits, server-side Turnstile validation, Zod normalization, idempotency, and a narrow privileged transactional intake routine.
- Preserve immutable submitted labels/answers and create the lead, subtype, selected services, initial stage history, and audit metadata in one transaction.
- If approved by G4, issue signed uploads only after pending-lead creation, store files in private quarantine, validate signature/MIME/size/checksum/count, scan, then promote to private approved storage.
- Keep verified phone/WhatsApp/email alternatives available when automated intake safely fails closed.

Acceptance criteria:

- Anonymous callers cannot bypass Turnstile/rate limits by writing directly to tables or Storage.
- Invalid, expired, duplicate, wrong-host/action, and provider-timeout Turnstile cases fail safely and do not create duplicate leads.
- Back/retry preserves form state without silently re-uploading or duplicating submissions.
- Field errors, error summary, step changes, file restrictions, and submission results are programmatically announced.
- Logs, analytics, errors, and audit records contain no form message, contact values, attachment content, token, or raw payload.
- Unapproved file types and spoofed, oversized, polyglot, traversal, malicious, or orphaned objects never reach approved storage.
- Confirmation uses a non-sequential reference and makes no unapproved response-time, qualification, or pricing promise.

### S8 — Lead operations and actionable dashboard

**Outcome:** Authorized staff can triage and progress inquiries without losing history or exposing personal data.

Work:

- Implement project-request and contact-message indexes, lead detail, assignment, notes, next actions, stage history, spam/duplicate handling, conversion, approved attachments, and controlled export/anonymization.
- Build the dashboard around new/unassigned work, unread messages, due actions, blocked drafts, and content health; treat analytics as optional context.
- Audit sensitive views/actions according to policy and use short-lived signed access for approved private files.

Acceptance criteria:

- Only roles with the exact lead/attachment/export capability can access each operation, including direct ID substitution attempts.
- Stage changes preserve history; Won/Lost/skipped transitions follow approved reason requirements.
- Contact conversion preserves the original message, source, consent, attachments, and activity without inventing missing answers.
- Search, filtering, stable pagination, filtered-empty states, and narrow/mobile detail behavior are usable and accessible.
- Dashboard failure in analytics or another optional provider does not hide the operational action queue or present stale values as current.
- Export, attachment access, anonymization, and destructive actions are permission-controlled, explicit, and audited.

### S9 — Approved brand system and public experience

**Outcome:** The content-first public routes receive the approved RENZ identity and editorial experience without compromising access or performance.

**Current implementation note — 9 September 2026:** S9A-P proves a stronger client-preview visual and interaction direction, but does not satisfy this slice's approved-brand or real-project-media outcome. Its provisional mark, concept imagery, sample presentation modules, `/projects/experience-study`, and `/brand-study` are server-gated by `RENZ_CLIENT_PREVIEW`; verified preview-off pages do not render, request, or link them, and both routes resolve through the real 404 boundary. Final S9 remains dependent on S5B, rights-cleared real project media, verified public facts, approved testimonials/institutional proof where supplied, approved contact/location information, and a production identity/font package.

Work:

- Implement approved design tokens, responsive typography, logo assets/lockups, imagery rules, focus states, aspect ratios, and section composition.
- Build the homepage chapters, Expertise presentation, selected-project experience, process, quality/responsibility, final CTA, project detail, wizard skin, navigation, mobile menu, and page transitions from approved content and rights-cleared assets.
- Use CSS, SVG, and native controls first. Admit exact-pinned Motion only when a named approved interaction demonstrates a non-duplicated need and passes accessibility, reduced-motion, mobile, and bundle budgets. Admit dynamically loaded GSAP only if a measured prototype proves the approved scene needs it. Keep Three.js/R3F out of the baseline.
- Provide content-equivalent reduced-motion and low-power/mobile paths; do not hijack scrolling or block content behind an opening sequence.

Acceptance criteria:

- The implementation matches the approved identity system rather than an unverified generated logo.
- AI/concept imagery is never presented as completed RENZ work; portfolio modules contain only approved records and media.
- The experience remains complete at 360, 390, 430, 768, 1024, 1280, 1440, 1728, and 1920 widths plus 320px reflow, touch, landscape, and 200% zoom.
- Keyboard, focus, contrast, semantic order, dialogs/menus, alt text, and reduced-motion behavior pass manual and automated review.
- Signature motion is skippable or first-session-only where appropriate, never a content gate, and absent from the critical rendering path.
- Initial route JavaScript, LCP image, font, layout-shift, and interaction budgets remain within the approved limits.

### S10 — Cross-cutting hardening

**Outcome:** The integrated product meets measurable accessibility, performance, SEO, observability, privacy, and security release criteria.

Work:

- Add provider-neutral telemetry, approved error monitoring, consent-aware analytics, Web Vitals reporting, redaction, release/source-map handling, and actionable alerts.
- Tune images, fonts, cache behavior, server waterfalls, bundle boundaries, dynamic imports, and third-party loading against the agreed budgets.
- Deploy CSP in report-only mode, resolve the exact source inventory, then enforce without broad wildcards or unsafe-eval.
- Complete threat-focused application tests, dependency/secret/static scans, headers, stored-XSS tests, upload abuse tests, RLS tests, accessibility review, visual regression, and structured-data validation.

Acceptance criteria:

- Principal public routes target LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at p75 mobile and desktop; staging Lighthouse targets are Performance 90+, Accessibility 95+, and SEO 95+.
- Initial compressed JavaScript is at or below the approved 170 KiB target on principal public routes unless a reviewed exception demonstrates value and field safety.
- Monitoring and analytics contain stable IDs/categories only, exclude sensitive bodies/headers, and do not block first rendering.
- Admin, form, and attachment routes have session replay disabled by default.
- Required security headers and enforced CSP pass production-build checks.
- All critical and high security findings are fixed or explicitly accepted by the authorized owner with containment and expiry.
- Manual keyboard, screen-reader, zoom, touch, reduced-motion, constrained-network, and responsive reviews pass on representative browsers/devices.

### S11 — Release rehearsal and controlled rollout

**Outcome:** A production-like staging release can be deployed, operated, restored, and rolled back before public launch.

Work:

- Apply the full migration history to a clean staging environment; import only approved content and rights-cleared media.
- Rehearse administrator invitation/MFA, role removal, publication/unpublication, lead intake, abuse fallback, attachment promotion, cache invalidation, secret rotation, incident alerts, database restore, Storage restore/reconciliation, and application rollback.
- Complete launch metadata, canonical host, robots/indexing decision, legal pages, contact channels, routing, consent, retention, backup, support, and owner checklists.
- Perform a go/no-go review followed by a controlled release and explicit indexing enablement.

Acceptance criteria:

- Staging contains no production secret reuse and no unapproved personal or client data.
- A clean release passes the complete verification suite and the approved content/claim/media checklist.
- Database and Storage restore exercises meet the approved RPO/RTO and reconcile objects with metadata.
- The previous application release can be restored; schema compatibility and compensating migration procedures are proven.
- Public intake can be disabled during abuse/provider failure while verified contact alternatives remain visible.
- Operators can revoke an administrator, rotate affected credentials, identify an incident, and receive alerts according to the runbook.
- The user and named business/technical owners approve go-live; indexing is a separate deliberate action rather than an automatic side effect of deployment.

## 6. Planned verification commands

No command in this section is executed during Phase 0. These commands define the intended Phase 1 verification interface. S1 must add the corresponding pinned scripts; a different package manager may be selected only through the recorded G6 decision. Do not use floating `latest` CLIs in CI.

### Repository and reproducibility

```powershell
git status --short --branch
git diff --check
node --version
corepack --version
pnpm --version
pnpm install --frozen-lockfile
```

### Static quality and application build

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:component
pnpm build
```

### Database, migrations, and RLS

```powershell
supabase --version
supabase start
supabase db reset
supabase test db
supabase db lint --local
pnpm db:types:check
pnpm test:integration
pnpm content:verify
pnpm publication:verify
pnpm storage:provision
pnpm storage:status
pnpm storage:verify
pnpm media:reconcile
pnpm s4:verify
```

`db:types:check` should regenerate types into a temporary comparison or fail on an uncommitted generated-type diff; it must not hide schema drift.

### Browser, accessibility, visual, and security behavior

```powershell
pnpm test:e2e
pnpm test:a11y
pnpm test:visual
pnpm test:security
pnpm test:headers
pnpm test:seo
pnpm test:structured-data
```

The scripts above should invoke pinned Playwright, axe integration, screenshot baselines, direct-action authorization tests, upload/abuse cases, CSP/header checks, route status/canonical tests, and structured-data validators. Automated accessibility checks do not replace manual review.

### Performance and supply chain

```powershell
pnpm analyze
pnpm lighthouse
pnpm audit:production
pnpm scan:secrets
pnpm verify
```

`verify` is the final local/CI aggregate and should run formatting, lint, strict types, unit/component/integration tests, clean database/RLS tests, production build, and the bounded browser/security checks suitable for CI. Staging-only performance, restore, provider, and operational exercises remain separate evidence.

### Command-to-slice minimum

| Slice | Minimum planned verification |
| --- | --- |
| S0 | Git status, exact baseline review, diff check, secret scan |
| S1 | Locked install, format, lint, typecheck, unit/component smoke, build, bundle baseline |
| S2 | Clean DB reset, pgTAP, DB lint/advisors, type-generation check |
| S3 | DB/RLS tests, integration, direct-action security and session/MFA E2E |
| S4 | DB/RLS, typed evidence/publication transition, private Storage policy, media reconciliation, XSS/URL, integration tests |
| S5 | Unit/component, E2E, a11y, visual, direct-action authorization |
| S6 | Build, route/status/metadata/SEO tests, E2E, a11y, Lighthouse baseline |
| S7 | Integration, Turnstile/idempotency/rate/upload security, E2E, a11y |
| S8 | RLS/BOLA/export/attachment tests, E2E, a11y, visual |
| S9 | Visual and responsive baselines, a11y/manual review, bundle analysis, Lighthouse |
| S10 | Full verify, production audit/secret scan, headers/CSP, SEO, performance, manual QA |
| S11 | Full CI on release commit plus staging smoke, restore, rotation, alert, rollout, and rollback evidence |

## 7. Rollout strategy

### 7.1 Environment progression

1. **Local:** synthetic data, local Supabase, provider test credentials, no real client PII.
2. **Preview:** isolated safe backend or approved staging isolation; no production secrets or data.
3. **Staging:** production-like Auth, Storage, migrations, CSP, provider test/approved staging configuration, and rights-cleared rehearsal content.
4. **Production dark launch:** infrastructure and invite-only admin are verified before public indexing; only approved operators have access.
5. **Controlled public release:** verified public content and forms are enabled with monitoring and contact fallback.
6. **Indexing enablement:** canonical host, robots, sitemap, legal content, structured data, and Search Console ownership are rechecked before deliberate indexing.

### 7.2 Feature and content controls

- Release capability slices behind server-enforced permissions or configuration, not hidden buttons alone.
- Keep incomplete content draft/noindex and incomplete homepage chapters disabled.
- Keep attachments, exports, analytics, replay, scheduled publication, and optional integrations off until their specific gate passes.
- Publish a minimal truthful site before filling empty modules with demo content.
- Admit signature motion after content, accessibility, and performance baselines are stable.

### 7.3 Database rollout

- Deploy backward-compatible schema before code that requires it.
- Use expand–migrate–contract so old and new releases can overlap safely.
- Apply reviewed migrations through CI and verify migration history afterward.
- Avoid dashboard-only schema edits and destructive automated down migrations.
- Treat Storage object changes as an explicit workflow with intermediate states and reconciliation, not as part of a database transaction.

## 8. Rollback strategy

| Failure domain | Rollback/containment action | Data-integrity rule |
| --- | --- | --- |
| Application release | Restore the previous immutable deployment and verify health, auth, public reads, and forms | Previous code must remain compatible with the expanded schema |
| Database migration | Stop rollout; use a reviewed forward compensating migration | Never use an automatic destructive down migration on production data |
| Content or claim | Unpublish/archive the affected record, invalidate exact caches, preserve audit/history | Do not erase evidence or audit simply to hide an error |
| Public media | Remove public eligibility, revert the content relationship, and invalidate CDN/cache; preserve private original/evidence as policy permits | Immutable paths prevent stale overwrite ambiguity |
| Lead intake/provider outage | Fail closed for automated intake, disable the affected path, preserve verified contact alternatives, and alert the owner | Do not accept unvalidated data through a bypass |
| Malicious upload/scanner outage | Stop signed-upload issuance/promotion, isolate quarantine, retain only approved forensic metadata | Quarantine content never becomes generally downloadable |
| Authorization issue | Disable affected route/action, revoke sessions/roles/keys, verify RLS, and audit scope | Hiding UI is insufficient; database/API denial must be restored |
| CSP or third-party breakage | Remove the new source/integration or temporarily return that policy change to report-only while retaining minimum safe headers | Do not add broad wildcards or unsafe-eval as an emergency shortcut |
| Secret exposure | Revoke and rotate in documented order, redeploy, invalidate sessions where required, and inspect redacted logs | Never commit the replacement secret or print it during recovery |
| Analytics/monitoring failure | Disable the optional provider adapter and continue core operation | Analytics never blocks public rendering or lead handling |
| Database/Storage loss | Invoke the tested restore plan, rotate credentials, and reconcile Storage objects and metadata | A database backup alone is not treated as a Storage backup |

Rollback is complete only when the user-facing state, authorization state, data integrity, cache, monitoring, and audit evidence are verified—not merely when an older deployment is active.

## 9. Risk register

| ID | Risk | Impact | Mitigation and gate |
| --- | --- | --- | --- |
| R1 | Monogram and WhatsApp sources are recovered, but the AI reference, vector master, rights/font records, tests, and identity approval remain missing | Critical: brand implementation could overwrite client equity or mistake AI reference for evidence | G1 remains partial; preserve hashes, present evolution choices, recover/approve the production package, and never silently substitute a generated mark |
| R2 | Business facts, services, delivery modes, project proof, contact details, or credentials remain unverified | Critical: misleading public claims and invalid structured data | G2 and evidence states; omit unsupported modules; publish checklist and reviewer |
| R3 | Git identity is configured, but no attributable baseline or repository history exists under the project-lead override | High: the current staged/untracked implementation is not an immutable rollback point | G6 remains partial; preserve evidence, review status/diffs before work, and create reviewed attributable history through an explicitly authorized repository-governance action |
| R4 | Role, publication, lead ownership, and export decisions are unresolved | High: over-privileged admin or unusable workflow | G3 permission/operations approval; capabilities default off |
| R5 | Privacy, consent, retention, breach, and cross-border obligations are unresolved | Critical: mishandled personal/project data | G4 legal/operational decision; minimize collection and keep risky features disabled |
| R6 | Region, vendor tier, RPO/RTO, and operator ownership are unresolved | High: latency, recovery, or accountability failure | G5 measured region and recovery decisions before production resources |
| R7 | RLS/grants are incomplete or permissive | Critical: draft, lead, attachment, identity, or audit disclosure | S3 per-operation pgTAP allow/deny matrix; no policy based only on authenticated |
| R8 | Privileged Supabase key leaks or becomes a generic utility | Critical: RLS bypass and full data compromise | Narrow server-only adapter, secret scanning, redaction, rotation drill, code review |
| R9 | Public uploads introduce malware, spoofed content, storage abuse, or privacy leaks | Critical: user/operator compromise and uncontrolled cost | G4 policy; quarantine, signature/MIME/size/checksum validation, scanner, promotion, cleanup |
| R10 | AI/concept architecture is mistaken for RENZ portfolio work | Critical: deceptive representation | Permanent concept classification, publish gate, rights review, no ordinary promotion path |
| R11 | Motion, fonts, media, or broad client components breach performance/accessibility budgets | High: poor mobile/Rwanda experience and Core Web Vitals failure | Content-first S6, measured S9 admission, reduced motion, bundle/image/font budgets |
| R12 | Admin expands into CRM, page builder, workflow engine, or portal before core operations are proven | High: delivery delay and security surface growth | Slice boundary; defer advanced automation, broad exports, real time, and client portal |
| R13 | Ten service routes launch as thin or duplicated SEO pages | High: poor utility and search quality | Draft/noindex until substantive verified scope; one canonical page per service |
| R14 | Turnstile, SMTP, monitoring, analytics, or scanner outage blocks or weakens the product | Medium–High | Approved fail mode, provider adapter, alerts, safe contact fallback; never bypass validation |
| R15 | Database backups are assumed to contain Storage objects | Critical: unrecoverable media or lead documents | Separate object backup/export and restore/reconciliation drill in G5/S11 |
| R16 | Concurrent edits or undocumented dashboard changes cause repository/schema drift | High | Git review, migrations as source of truth, clean reset, generated-type diff, no dashboard-only changes |
| R17 | Accessibility passes automation but fails real keyboard, screen-reader, zoom, touch, or reduced-motion use | High | Manual acceptance at S5/S7/S9/S10; automation is supporting evidence only |
| R18 | Framework or dependency versions drift between plan, local, CI, and deployment | High: non-reproducible builds or security exposure | Reverify in the opening S1 preflight before scaffold/install, then exact pins, committed lockfile, runtime pin, and reviewed automated updates |
| R19 | Logs, analytics, source maps, or error reports receive PII/secrets | Critical: secondary data exposure | Explicit field allow lists, default PII off, body/header redaction, tests and provider review |
| R20 | Launch pressure enables indexing or claims before content/legal approval | Critical: public misinformation or legal exposure | Separate deployment, publication, and indexing approvals; S11 go/no-go checklist |

Risk severity is reassessed at every slice review. A critical risk blocks exit unless fixed or the authorized owner explicitly narrows the product so the risk-bearing capability is absent.

## 10. Phase 1 exit definition

Phase 1 is complete only when all of the following are true. Passing a build alone is not completion.

### Source, brand, and content

- Client originals have been recovered, audited, preserved, and approved; the identity implemented in code has a documented source and rights status.
- Canonical services, company details, delivery wording, contact channels, process, and publication rules are client-approved.
- Every public project, image, testimonial, credential, statistic, team record, and claim has the required evidence, rights, consent, reviewer, and current state—or the module is omitted.
- No generated concept is presented as completed RENZ work.

### Repository and platform

- Git history begins with a reviewed Phase 0 baseline and all Phase 1 work is traceable through reviewable slices.
- Runtime, package manager, dependencies, CLI tools, lockfile, environment schemas, and CI are reproducible and exact-pinned according to policy.
- One production Next.js application and environment-isolated Supabase projects implement the approved boundaries without unnecessary baseline dependencies.

### Data and security

- The entire migration history applies from a clean reset; generated types match; constraints, indexes, transactions, cascades, grants, and RLS tests pass.
- Invitation-only Auth, mandatory AAL2 admin access, fresh capability checks, session revocation, last-Super-Admin protection, and redacted audit are verified.
- Anonymous access is limited to published public projections and narrow validated intake; drafts, leads, notes, attachments, identity, settings, and audit stay private.
- Privileged keys, uploads, CSP, headers, CSRF/origin checks, rate limits, Turnstile, error handling, logging, secrets, and dependency controls pass the security acceptance suite.

### Product workflows

- Authorized staff can complete the approved content draft/review/publish lifecycle, media-rights workflow, lead triage, notes, assignment, stage history, contact conversion, and dashboard action flow.
- Visitors can navigate the approved routes, understand RENZ's verified scope, use Contact, and complete Start a Project with safe retry and accessible validation.
- All designed loading, empty, denied, error, stale, success, partial-failure, session, destructive, mobile, and poor-connection states are present.

### Quality and discovery

- Responsive and content behavior is approved at 360, 390, 430, 768, 1024, 1280, 1440, 1728, and 1920 widths, plus 320px reflow, landscape, touch, 200% zoom, constrained networks, and reduced motion.
- Automated and manual accessibility review passes for keyboard, focus, landmarks, dialogs/menus, tables, form announcements, alt text, contrast, and representative screen readers.
- Core Web Vitals, Lighthouse, JavaScript, image, font, and server-response targets are met or a documented exception is approved with field evidence.
- Canonicals, metadata, redirects, sitemap, robots, breadcrumbs, social previews, structured data, status codes, indexability, internal links, and stale-content behavior are verified.

### Operations and release

- Monitoring, alerts, redaction, consent-aware analytics, incident response, administrator revocation, secret rotation, intake failover, and support ownership are exercised.
- Database and Storage backup/restore/reconciliation meet the approved RPO/RTO.
- The release can roll back application code and compensate schema/content/media changes without data loss or authorization regression.
- Staging and production are isolated; production accounts use least privilege and MFA; no preview contains production credentials or data.
- The full release verification suite passes on the exact release commit.
- Named business, content, security, and technical owners approve go-live, and the user explicitly approves public release and indexing.

Any unmet item remains a blocker or must be converted into an explicitly approved omission. Phase 1 does not exit by substituting placeholders, demo claims, hidden routes, or undocumented risk acceptance.
