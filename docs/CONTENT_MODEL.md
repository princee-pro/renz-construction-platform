# RENZ Content Model

**Status:** Phase 0 recommendation; conceptual content contract, not a database schema
**Scope:** Public content types, project case studies, media, proof governance, project-request wizard, and publication controls
**Last updated:** 2026-08-27

> **Phase 1 / S0 source-recovery update — 2026-08-30:** The source-absence statement below is historical to 27 August. The monogram and WhatsApp PNGs now match their expected hashes; the AI reference board is still absent. WhatsApp wording supports seven source phrases only and does not establish qualifications, scopes, proof, contacts, or publication approval. The canonical reconciliation and publish statuses are in [`SOURCE_RECOVERY_AND_RECONCILIATION.md`](./SOURCE_RECOVERY_AND_RECONCILIATION.md). Existing evidence/publish gates remain binding.

## Evidence convention

- **Brief-supplied** — stated in the project brief; not independently verified.
- **Recommendation** — proposed content structure or editorial behavior.
- **Publish gate** — evidence, consent, or approval required before content is public.

The expected `references/client/` source material was not available during this pass. The model deliberately supports incomplete and unverified information without forcing placeholders into production.

## Modeling principles

1. **Separate truth from presentation.** Store a fact once, retain its source and review state, and let templates decide how to present it.
2. **Separate project status from content status.** “Completed” describes a project; “Published” describes its page.
3. **Omit unsupported sections.** A missing statistic, testimonial, credential, outcome, or gallery is not replaced with demo content.
4. **Make media rights first-class.** A beautiful image is not publishable until rights and consent are recorded.
5. **Preserve submission history.** Project-request records retain the answers and labels submitted at that time, even if option labels later change.
6. **Constrain high-visibility composition.** Homepage and project templates offer curated, approved content structures rather than unrestricted page-builder blocks.
7. **Prepare for localization without pretending translation exists.** Content may have locale-aware variants; only completed locales are public.
8. **Treat regulated and time-sensitive content as reviewable evidence.** Credentials, permitting, cost, safety, and compliance statements need an owner and review date.

## Evidence and claim states

**Recommendation:** Every material business claim should support an internal evidence state.

| State | Meaning | Public behavior |
|---|---|---|
| Unverified | Entered from a brief, interview, import, or draft without evidence | Never render as a factual public claim |
| In review | Evidence supplied; awaiting authorized review | Preview only, visibly marked in admin |
| Verified | Evidence and public wording approved by an accountable reviewer | May render while current and consent remains valid |
| Expired | Review date, credential validity, or consent is no longer current | Remove from public display and flag in admin |
| Rejected | Proven inaccurate, out of scope, or unsuitable for publication | Retain audit history; do not render |

Recommended evidence fields:

- Claim or fact being supported
- Source type and source reference
- Internal notes
- Evidence attachment, when appropriate
- Owner
- Reviewer
- Verified date
- Review or expiry date
- Public wording approved
- Public/private classification

Sensitive evidence attachments must remain private even when the resulting public wording is approved.

## Shared public-content contract

The following fields apply where relevant to Expertise, Projects, Insights, Pages, Team, and Testimonials.

| Field group | Recommended fields | Notes |
|---|---|---|
| Identity | internal title, public title, slug, locale | Slug is unique within content type and locale. |
| Summary | short summary/deck, optional eyebrow | Used in listings and social previews; no unsupported claims. |
| Composition | approved modular body content or bounded template sections | Avoid arbitrary visual blocks on high-value pages. |
| Ownership | content owner, author, reviewer, created/updated by | Public author appears only when real and approved. |
| Lifecycle | draft, in review, scheduled, published, archived; publish/unpublish dates | Exact workflow permissions are defined in `ADMIN_PRODUCT.md`. |
| Evidence | claim references, reviewed date, next review date | Required for regulated, numerical, or time-sensitive statements. |
| Media | hero asset, listing asset, social asset, captions and focal points | Every relationship inherits the asset rights state. |
| SEO | SEO title, meta description, canonical override, indexability, OG/social image | Canonical override is exceptional and permission-controlled. |
| Relationships | related services, projects, articles, CTA context | Manual curation first; safe fallback rules may supplement it. |
| Localization | source locale, translation status, translation group | Never publish machine or incomplete translation as approved copy. |

## Expertise content type

**Brief-supplied:** RENZ supplied overlapping service ideas. The canonical taxonomy is a **recommendation** documented in `INFORMATION_ARCHITECTURE.md`.

| Content area | Recommended fields |
|---|---|
| Identity | canonical name, slug, lifecycle group, short label, internal aliases, sort order, active state |
| Proposition | one-sentence value proposition, concise overview, suitable project types |
| Scope | included deliverables, exclusions, client inputs, prerequisites, delivery mode |
| Process | ordered service-specific steps with title and plain-language description |
| Proof | related verified projects, approved credentials, approved practice statements |
| Guidance | FAQs, related insights, downloadable guidance if available and safe |
| Conversion | CTA label, wizard service preselection, alternate contact route |
| Governance | service owner, professional reviewer where relevant, last reviewed date |
| SEO | title, description, social image, keyword intent notes, indexability |

**Publish gate:** The delivery-mode field must distinguish in-house, partner-led, subcontracted, coordinated, and not-yet-confirmed work internally. Public wording may be published only after RENZ confirms the accurate relationship. Do not automatically expose partner details.

An Expertise record is publishable only when it has:

- Approved canonical name and scope
- Clear deliverables and exclusions
- Verified delivery wording
- A meaningful overview and client-input section
- Reviewed SEO title and description
- No unsupported credentials or outcomes

## Project case-study content type

### Identity and classification

| Field | Requirement | Publication behavior |
|---|---|---|
| Project title | Required | Client-approved public title; may differ from internal name. |
| Slug | Required | Stable and unique. |
| Short summary | Required | Specific but free of unsupported outcomes. |
| Project type | Required | Controlled taxonomy approved by client. |
| Categories/sectors | Optional | Used only when enough projects support meaningful filtering. |
| Related services | Required | One or more canonical Expertise relationships. |
| Featured state and sort order | Optional | Curatorial control; does not imply importance or performance. |

### Project facts

| Field | Requirement | Publication gate |
|---|---|---|
| Public location | Required at an approved level of precision | Respect client/property privacy; exact coordinates are not required. |
| Start and completion year/period | Optional | Confirm from project evidence. |
| Project delivery status | Optional controlled value | Client approves vocabulary and current status. |
| Scope | Required | Describe the work without inflating RENZ’s role. |
| RENZ role | Required | State whether RENZ designed, engineered, estimated, managed, supervised, built, coordinated, or partnered. |
| Client name | Optional | Explicit client consent required. |
| Partners and consultants | Optional | Permission and accurate role wording required. |

### Narrative

Recommended narrative fields:

- Context and client objective
- Challenge or constraint
- RENZ approach
- Solution or delivered scope
- Key design, engineering, cost, or construction decisions
- Outcome narrative

The editor should not require every narrative section. Empty optional sections disappear cleanly. “Challenge” and “Outcome” must never become invented drama or performance copy.

### Construction stages and timeline

Each repeatable stage should support:

- Stage title
- Sequence
- Date or general period, optional
- Plain-language description
- Related images or video
- Caption and evidence/source note
- Public/private state

**Recommendation:** Keep project milestones separate from the general editorial narrative so a project can show a useful before/during/after or construction-stage sequence without forcing a uniform case-study layout.

### Media and details

Project media relationships should support:

- Hero, listing, gallery, before, during, after, detail, drawing, or video role
- Sort order
- Caption
- Project-specific alt text when the base asset description is insufficient
- Focal point or crop guidance per responsive use
- Credit and copyright holder
- Client/property publication consent
- Concept/demo marker

Concept or AI-generated architecture may support visual exploration, but **must not** be assigned a completed-project role or reach the production portfolio.

Materials and technical details are optional structured or narrative fields. Supplier names, performance characteristics, and technical outcomes require source evidence.

### Outcomes

Use structured outcomes when a case study contains a measurable claim:

- Public statement
- Optional value and unit
- Measurement period
- Source
- Reviewer
- Verification state
- Client approval state

If a metric is not verified, publish the factual scope and approach without it. Do not transform descriptive feedback into a numerical outcome.

### Relationships and CTA

- Manually selected related projects
- Safe fallback by shared service or project type, only among published projects
- Related insights
- CTA label and preselected service/project type

Hide the related-project block when there is no genuinely relevant published item.

### Project publication gate

A project may be published only when:

- Public title, summary, location granularity, scope, status, and RENZ role are approved
- At least one canonical service is related
- Client/property publication permission is recorded where required
- Every public media asset has confirmed rights, consent, credit, and appropriate alt text
- Outcome claims are verified or omitted
- Concept/demo assets are excluded from the public record
- SEO and social fields are complete
- A factual reviewer and review date are recorded

## Insight/article content type

| Content area | Recommended fields |
|---|---|
| Identity | title, slug, summary, topic, locale |
| Editorial | body, standfirst, author, subject reviewer, reading time derived from content |
| Currency | published date, updated date, last factual review, next review, evergreen/time-sensitive flag |
| Sources | source list and internal evidence notes |
| Relationships | relevant Expertise, Project, and CTA |
| Media | hero/listing/social assets with rights and alt text |
| SEO | SEO title, meta description, canonical, indexability, structured-data controls |

Articles about Rwanda requirements, permitting, cost, safety, or compliance need a qualified reviewer, dated sources, and clear scope. Content must not imply that RENZ possesses a registration or authority merely because it explains the topic.

**Publish gate:** Do not publish cost ranges or definitive regulatory instructions without current, attributable evidence and an approved review process.

## Page content type

Use bounded page templates rather than a universal page builder.

| Page | Recommended bounded sections |
|---|---|
| About | Company story, operating approach, team, verified credentials, quality/safety/responsibility, CTA |
| Contact | Intro, verified channels, inquiry form, verified location/hours, privacy notice |
| Privacy | Counsel-approved structured legal content and effective date |
| Terms | Counsel-approved structured legal content and effective date |

The About template should omit team, credentials, statistics, or proof sections when publishable content is unavailable.

## Team and testimonial content

### Team member

- Public name
- Approved role title
- Biography
- Portrait and alt text
- Discipline or expertise relationship
- Credentials, each linked to evidence and review state
- Contact/social links, optional and consented
- Public sort order and active state
- Publication consent and review date

### Testimonial

- Quote
- Attribution name, role, organization, or approved anonymous form
- Related project/service
- Consent record
- Source
- Date received
- Verification/review state
- Featured and sort order

**Publish gate:** Do not create composite quotes, rewrite sentiment into stronger claims, or expose a client identity without explicit approval. If consent is absent, the testimonial does not render.

## Homepage content model

**Recommendation:** Treat the homepage as a curated composition with fixed chapter types and controlled optionality.

| Chapter | Editable content | System behavior |
|---|---|---|
| Hero | approved headline, support copy, CTA labels/targets, verified media | Preview warns when media is concept/demo or missing rights. |
| Proposition | short narrative and lifecycle labels | Requires delivery-scope review. |
| Expertise | selected active services and editorial labels | Links remain canonical; inactive services cannot be selected. |
| Selected projects | manually selected published projects | Section hides if no eligible projects exist. |
| Audiences | approved audience labels and short transitions | No unapproved audience claims. |
| Process | ordered approved stages | Requires client validation before publish. |
| Quality/responsibility | approved practice statements and evidence relationships | Section or claim hides when evidence expires. |
| Statistics/testimonials | selected verified proof records | Section hides if no eligible records exist. |
| Insights | selected or safely auto-selected published articles | Never show draft or expired content. |
| Final CTA | approved copy, Start-a-Project and contact targets | WhatsApp appears only when configured and active. |

Editors may reorder only the chapters explicitly approved by the design system. Navigation, layout implementation, and arbitrary HTML are not CMS content.

## Media asset content type

| Group | Recommended fields |
|---|---|
| File | original filename, storage key, MIME type, dimensions, size, checksum |
| Editorial | title, base description, caption, credit, copyright holder |
| Accessibility | alt text guidance, decorative eligibility, transcript/captions for relevant media |
| Rights | license/permission type, consent evidence, allowed uses, expiry/review date |
| Rendition guidance | focal point, crop notes, dominant orientation |
| Governance | uploaded by, created/updated dates, review state, sensitive/private state |
| Relationships | usages across projects, pages, insights, team, homepage, and social metadata |

Prevent deletion while an asset is in use. Replacement should preserve usage relationships and require a fresh rights/accessibility review. Private lead attachments are not Media Library assets unless an authorized user intentionally imports an approved copy.

## Site and brand settings

Recommended settings groups:

- Legal company name and approved short name
- Corporate descriptor and tagline state
- Official domain and canonical base URL
- Email, phone, WhatsApp, address, service area, hours, and social profiles
- Logo variants and favicon, after source review
- Default social image
- Default SEO title pattern and description fallback
- Analytics and consent configuration
- Project-request recipient/routing configuration
- Legal page references
- Supported and default locales

Every public company-detail setting is a **publish gate** until the client supplies and approves it.

## Start-a-Project model

### Wizard behavior

**Brief-supplied:** The desired intake includes service, project type, stage, location, scale, budget, timeline, supporting files, contact details, and review.

**Recommendation:** Present these inputs across seven concise steps rather than ten isolated screens.

| Step | Fields | Validation and content rule |
|---:|---|---|
| 1. What do you need? | Service multi-select; “I’m not sure”; optional short outcome prompt | Service options reference active canonical Expertise records. Never force technical certainty. |
| 2. About the project | Project type; current stage | Controlled labels require client approval; always offer Other/Not sure. |
| 3. Site and scale | General location; approximate site/building size; unit | Exact plot identifiers are not required. Scale is optional and supports Not sure. |
| 4. Budget and timing | Approved range and currency; “Prefer to discuss”; desired start or timing window | No pricing calculation or implied quotation. Budget bands remain configuration until approved. |
| 5. Context and files | Project description; priorities; supporting plans/photos/documents | Explain accepted file types, size limits, privacy, and optionality before selection. |
| 6. Contact | Name; organization optional; email; phone; preferred channel | Collect only necessary data. Marketing consent is separate and never required for the inquiry. |
| 7. Review and submit | Editable summary; privacy acknowledgement; submit | Show terms before submission. No response-time promise unless operationally approved. |

Recommended current-stage vocabulary, subject to client approval:

- Exploring an idea
- Site or land identified
- Survey available
- Design in progress
- Design complete
- Ready to build
- Construction underway
- Existing building to improve
- Other or not sure

Recommended project-type vocabulary, subject to client approval:

- Private home
- Residential development
- Commercial
- Institutional
- Interior or fit-out
- Renovation
- Civil works or infrastructure
- Other or not sure

### Project-request record

| Group | Recommended fields |
|---|---|
| Identity | non-sequential public reference, created date, source route/campaign without personal data |
| Request | selected services, project type, current stage, location, size/value/unit, budget band/currency, timeline, description, priorities |
| Contact | name, organization, email, phone, preferred channel |
| Consent | privacy acknowledgement version/date; optional marketing consent separately |
| Workflow | lead stage, owner, priority, next action/date, duplicate/spam state, won/lost reason |
| History | immutable submitted-answer snapshot, stage history, notes, activity/audit references |
| Files | private attachment relationships, original filename, type, size, scan/validation state |

The public submission should:

1. Validate on the server.
2. Create a Project Request with stage **New**.
3. Store attachments privately and associate them only after validation.
4. Preserve the submitted labels and answers as an immutable snapshot.
5. Record an audit event without exposing sensitive field values to analytics.
6. Send an acknowledgement and staff notification only when those channels are configured.
7. Show a neutral confirmation and reference without promising qualification or response timing.

Partial progress should remain session-local unless the visitor explicitly consents to server-side saving. No account is required.

### Wizard accessibility content

- Each step has a unique heading and concise explanation.
- Related controls use `fieldset` and `legend` semantics.
- Optional fields are labelled explicitly.
- Error summary links to fields; inline errors are programmatically associated.
- Step changes and submission results are announced.
- Back preserves answers; a retry does not silently resubmit files or erase content.
- File restrictions and rejection reasons are written before and after selection.
- A mobile action area accounts for keyboard and device safe areas.

## Contact-message model

The lower-friction Contact form should collect only:

- Inquiry type
- Name
- Email or phone according to approved contact policy
- Organization, optional
- Message
- Optional attachment only if operationally required
- Privacy acknowledgement

Contact messages have unread/read state separate from lead stage. An authorized admin may convert a message into a Project Request while preserving the original message, source, and activity history.

## Localization readiness

**Recommendation:** Launch only approved language variants. If English is the only initial language, it may remain at unprefixed canonical URLs, while the model stores:

- Locale per public record
- Translation group linking variants
- Locale-specific title, slug, body, metadata, alt text, and social copy
- Translation status: missing, draft, in review, approved, published, stale
- Source-locale version and last synchronized review

Do not automatically fall back to an English body at a URL marked as another language. Decide URL-prefix and migration policy before the second locale launches.

## Production content behavior

- Draft, in-review, expired, rejected, and private content is never publicly readable.
- A public module filters by evidence, consent, rights, and lifecycle state before rendering.
- If required evidence becomes expired, remove the affected claim or record and flag the owner in admin.
- Empty sections collapse without placeholder headings or awkward spacing.
- Concept imagery remains explicitly classified and cannot be promoted to portfolio media through a simple feature toggle.
- Demo and seed content are kept separate from production content and cannot be mistaken for client-approved records.

## Unresolved facts and decisions

### Business and service model

- **Publish gate:** exact legal name and approved company descriptor
- **Publish gate:** canonical service names, scopes, exclusions, and delivery modes
- **Publish gate:** licenses, registrations, responsible professionals, partners, and public wording
- **Publish gate:** actual project journey and client communication/reporting process

### Projects and proof

- **Publish gate:** project inventory, RENZ role, client permission, location privacy, dates/status, media rights, and outcomes
- **Publish gate:** team, credentials, testimonials, statistics, awards, certifications, and consent
- **Publish gate:** quality, safety, sustainability, and compliance practices with evidence owners

### Project intake

- **Publish gate:** approved project types, stages, service options, budget bands, currencies, file rules, privacy wording, and response expectations
- **Publish gate:** internal recipients, assignment rules, acknowledgement channels, attachment retention, and deletion process

### Editorial operations

- **Recommendation to resolve:** content owners, qualified reviewers, review frequency, scheduling needs, revision history, and approval permissions
- **Recommendation to resolve:** launch locale and likely next locale before final URL design
- **Publish gate:** official contact, address, domain, service area, social, analytics, and legal settings

## S4 implementation addendum — 5 September 2026

The S4 local content/evidence kernel is implemented as an evidence-safe editorial foundation. This dated addendum records the implementation status without converting any unresolved client fact into public content.

### Lifecycle and evidence boundary

- Content remains independently managed as `draft`, `published`, or `archived`; an evidence record has its own verification, approval, review-due, consent, sensitivity, and version state.
- Typed evidence and claim relationships cover services, projects, posts, pages, team members, testimonials, credentials, navigation, settings, and media rights. A generic text claim cannot silently stand in for a typed domain record.
- Publication is fail-closed. The database checks active profile, AAL2, exact permission, expected version, approved wording, current evidence, rights/consent, safe content/URLs, and domain readiness before changing lifecycle state.
- The local role matrix intentionally keeps `admin` out of publication, archival, claims-verification, and website-setting capabilities. Those capabilities remain mapped to `super_admin` until the client approves a production role policy.

### Public contract

- Public access is through explicit-column, read-only projections for services, projects, project media, posts, pages, page sections, team members, testimonials, credentials, navigation, site settings, and approved project claims.
- Projections are explicit-column, owner-evaluated security-barrier views over fail-closed S4 eligibility predicates. Anonymous access is projection-only; internal evidence, rights, reviewer, consent, audit, and operational fields are not public columns, and anonymous callers have no base-table `SELECT` privilege.
- A project cannot become public merely because its own row is complete: its linked service, evidence, media, rights, and review state must also satisfy the readiness checks.

### Media and storage

- Media provenance, rights, reviewer, consent, alt text, decorative state, storage state, and public eligibility are first-class fields. Concept, synthetic-test, and unreviewed assets cannot become completed project media.
- Local Storage uses private buckets and UUID-rooted object paths. The Storage API provisions bucket configuration; migrations add project policies without mutating provider-managed `storage.objects` ownership or metadata.
- JPEG, PNG, WebP, AVIF, MP4, and WebM are the current development MIME set. Magic-byte checks, size limits, path validation, and report-only database/object reconciliation are implemented. Scanning, quarantine, EXIF handling, retention, backup, signed delivery, and incident ownership remain unresolved production decisions.

The detailed S4 contracts are recorded in `docs/PHASE_1_S4_CONTENT_EVIDENCE_MODEL.md`, `docs/PHASE_1_S4_PUBLICATION_RULES.md`, `docs/PHASE_1_S4_MEDIA_ARCHITECTURE.md`, `docs/PHASE_1_S4_PUBLIC_PROJECTIONS.md`, `docs/PHASE_1_S4_STORAGE_SECURITY.md`, and `docs/CLIENT_EVIDENCE_BACKLOG.md`.
