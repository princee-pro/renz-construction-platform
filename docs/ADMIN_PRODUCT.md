# RENZ Admin Product

**Status:** Phase 0 recommendation; workflow and product architecture, not implemented UI
**Scope:** Administrative information architecture, lead handling, content operations, media, site configuration, roles, permissions, and UX states
**Last updated:** 2026-08-27

## Evidence convention

- **Brief-supplied** — stated in the project brief; not independently verified.
- **Recommendation** — proposed product behavior or operating workflow.
- **Publish gate** — business rule, content, consent, or authority that must be approved before production use.

The brief names Super Admin, Admin, and Editor as initial roles and proposes lead stages. Who will occupy those roles, who may publish, and how RENZ currently handles inquiries are not yet supplied.

## Product objective

**Brief-supplied:** `/admin` is intended to be a real business application, not a basic CMS. It must support public content, project requests, contact messages, attachments, website settings, users, roles, audit activity, and later Sales or Project Manager roles.

**Recommendation:** Optimize the admin around two daily outcomes:

1. No promising inquiry is lost, left unassigned, or separated from its context.
2. No public content is published without the required facts, rights, review, and approval.

The dashboard should be an action queue, not a collection of vanity totals.

## Administrative information architecture

```text
Overview
Leads
├── Project Requests
├── Contact Messages
└── Saved Views / Pipeline
Content
├── Projects
├── Expertise
├── Insights
├── Pages
├── Team
└── Testimonials
Media
└── Media Library
Website
├── Homepage
├── Navigation
├── SEO & Social
├── Brand & Company Information
└── Site Settings
System
├── Users & Roles
├── Audit Log
└── Security
```

**Recommendation:** Use **Expertise** consistently in public and admin language. Technical models may use “service,” but editors should not have to translate between two product vocabularies.

Navigation visibility must be capability-based. Hiding a navigation item is not authorization; all reads and mutations require server-side authorization.

## Route plan

| Area | Proposed route | Purpose |
|---|---|---|
| Overview | `/admin` | Actionable dashboard and recent activity |
| Project Requests | `/admin/leads/project-requests` | Search, filter, assign, and progress structured inquiries |
| Contact Messages | `/admin/leads/contact-messages` | Triage general messages and convert relevant ones to requests |
| Lead detail | `/admin/leads/[id]` | Answers, contact, attachments, notes, history, next action, stage |
| Projects | `/admin/content/projects` | Project index, content health, publication workflow |
| Project editor | `/admin/content/projects/[id]` | Structured case-study editor and preview |
| Expertise | `/admin/content/expertise` | Service taxonomy, scope, proof, and SEO |
| Insights | `/admin/content/insights` | Editorial calendar, review currency, articles |
| Pages | `/admin/content/pages` | Bounded About, Contact, Privacy, and Terms templates |
| Team | `/admin/content/team` | Bios, credentials, consent, publication state |
| Testimonials | `/admin/content/testimonials` | Quote, attribution, consent, evidence, relationships |
| Media | `/admin/media` | Rights-aware asset library and usage inspection |
| Homepage | `/admin/website/homepage` | Curated chapter configuration and preview |
| Navigation | `/admin/website/navigation` | Bounded nav editing with route validation |
| SEO & Social | `/admin/website/seo` | Defaults, social previews, robots/indexing controls |
| Brand and company | `/admin/website/brand` | Approved logo variants, name, tagline, contact details |
| Site settings | `/admin/website/settings` | Locale, integrations, form routing, operational settings |
| Users and roles | `/admin/system/users`, `/admin/system/roles` | User access and capability assignments |
| Audit log | `/admin/system/audit-log` | Searchable administrative event history |
| Security | `/admin/system/security` | Authentication/security status and privileged settings |

Exact route names are **recommendations**. Permissions, not URL secrecy, protect each area.

## Overview dashboard

### Primary action queue

| Module | Question it answers | Empty/unavailable behavior |
|---|---|---|
| New or unassigned project requests | What needs triage now? | Explain that no new requests need action; do not show zero as “growth.” |
| Unread contact messages | What has not been reviewed? | Link to all messages when none are unread. |
| Leads needing a next action | What follow-up is due or missing? | Requires an approved next-action workflow before activation. |
| Drafts awaiting review | What content is blocked on editorial approval? | Show only records the user may act on. |
| Content health | Which records are missing alt text, rights, evidence, or factual review? | Group by fixable issue and content owner. |

### Secondary context

- Published and draft project counts
- Recent leads
- Recent content changes
- Recent administrative activity
- Traffic summary and popular projects only after a privacy-conscious analytics source is configured

Analytics failure must not block the dashboard. The analytics panel should show a labelled unavailable/error state rather than stale numbers presented as current.

## Lead model and workflow

### Stage model

The following stages are **brief-supplied suggestions**:

```text
New → Contacted → Qualified → Site Visit → Proposal → Won / Lost
```

**Recommendation:** Treat the stages as an initial controlled pipeline, not an immutable universal process. Allow authorized non-linear transitions, while requiring a reason for Won, Lost, or any skipped stage that matters operationally. Record stage history rather than replacing it.

Unread/read is a message state, not a pipeline stage. Spam/duplicate is a triage state, not automatically Lost.

### Project-request list

The primary view should be a searchable table with:

- Reference
- Contact name and organization, where supplied
- Requested services
- Project type and general location
- Stage
- Owner
- Next action and due date
- Created date
- Unread/new indicator

Recommended filters:

- Stage
- Owner or unassigned
- Service
- Project type
- Date range
- Next action due/overdue
- Has attachments
- Spam/duplicate state

Saved views may be added when real workflows emerge. A Kanban pipeline may be offered as a secondary view; it must not become the only way to search or operate leads.

### Lead detail

Prioritize:

1. Contact and inquiry summary
2. Submitted answers exactly as received
3. Private attachments and validation status
4. Current owner, stage, priority, and next action
5. Append-oriented notes and activity timeline
6. Related contact messages or duplicate requests
7. Audit-visible changes and outcome reason

Sensitive fields and attachments are visible only to roles with the corresponding capability. Attachment preview/download is audited. Do not copy lead attachments into the public Media Library without an explicit, authorized import and rights review.

### Lead actions

- Assign or reassign owner
- Mark read/unread
- Change stage with history
- Add note
- Set next action and due date
- Record contact attempt
- Flag or merge duplicate, preserving both source records
- Mark spam, with a reversible correction path
- Record Won/Lost and reason
- Export only with a specific permission and audit event
- Delete or anonymize only under an approved retention/privacy policy

**Publish gate:** RENZ must define ownership, response expectations, assignment rules, outcome definitions, export rights, and retention before the workflow is considered production-ready.

### Contact-message workflow

```text
Received → unread/read → triaged
                         ├── respond/close
                         ├── flag spam
                         └── convert to Project Request
```

Conversion creates or links a Project Request while preserving the original message, source, attachments, consent, and activity history. It must not silently infer answers the sender did not provide.

## Content workflow

### Recommended lifecycle

```text
Draft → In Review → Approved → Published → Archived
```

Scheduling may sit between Approved and Published if launch requirements justify it. Unpublishing returns a record to a non-public state while preserving publication and audit history.

| Transition | Recommended authority | Required checks |
|---|---|---|
| Create/edit draft | Editor, Admin, Super Admin | Authorized content type |
| Submit for review | Editor, Admin, Super Admin | Required editorial fields present |
| Approve | Admin or explicit approver capability | Fact, rights, consent, SEO, and accessibility checks |
| Publish/unpublish | Admin or explicit publisher capability | Fresh authorization and publish checklist |
| Archive | Admin or explicit archive capability | Related-link and redirect impact reviewed |
| Permanently delete | Super Admin or dedicated capability | Retention policy, dependency check, explicit confirmation, audit event |

**Publish gate:** The client must decide whether Editors may publish. Default recommendation is that Editors create and revise content but submit it for approval.

### Project editor

Use a structured section model:

1. Overview
2. Project facts and RENZ role
3. Story
4. Stages and timeline
5. Media and rights
6. Relationships and CTA
7. SEO and social preview
8. Publish checks and history

Editor behaviors:

- Autosave drafts without changing public content
- Clearly show saved, saving, failed, and stale states
- Preview draft content through a protected preview
- Explain why publication is blocked and link directly to missing fields
- Distinguish concept/demo media from publishable portfolio media
- Warn when edits affect a currently published page
- Preserve a useful revision/audit history for significant changes

### Expertise editor

Support canonical name, group, aliases, scope, exclusions, delivery mode, process, FAQs, proof, related content, CTA preselection, reviewer, and SEO. Changes to canonical slug require redirect planning and elevated permission.

### Insight editor

Support author, subject reviewer, sources, reviewed date, next review, time-sensitive flag, related Expertise/Projects, and structured-data eligibility. Expired review dates should surface in Content Health and may trigger unpublication according to approved policy.

### Pages, team, and testimonials

- Pages use bounded templates, not arbitrary layout construction.
- Team credentials require evidence and review dates.
- Testimonials require source and consent before approval.
- Legal content changes require a dedicated authority or explicit privileged capability.

## Homepage management

**Recommendation:** Provide a curated homepage composer rather than a freeform page builder.

Editors may:

- Edit approved chapter copy
- Choose eligible featured projects and insights
- Select active Expertise entries
- Configure the validated process labels
- Select verified statistics/testimonials
- Enable or disable optional chapters
- Reorder only the chapter combinations permitted by the design system
- Preview desktop and mobile compositions

The system should automatically prevent or warn against:

- Selecting draft, archived, expired, or private content
- Selecting a project whose media rights are incomplete
- Publishing a statistic without current evidence
- Publishing an empty chapter
- Linking to an invalid or unpublished route
- Using concept imagery as completed RENZ work

Navigation editing should similarly validate internal destinations and protect required items such as Start a Project, Privacy, and Terms according to approved launch policy.

## Media Library

### Primary views

- Searchable asset grid/list
- Filters for type, rights state, privacy, missing alt guidance, usage, uploader, and date
- Asset detail with renditions, rights/consent, focal point, credit, and every current usage
- Upload queue with validation and per-file failure messages

### Operational rules

- Public and private assets are visibly distinct.
- Rights expiry or revoked consent removes public eligibility and alerts content owners.
- An in-use asset cannot be deleted; replacement preserves usage relationships and triggers review.
- Alt text remains contextual to usage when necessary; the asset holds base guidance, not one forced alt string for every page.
- Lead attachments are private and excluded by default.
- Bulk operations require explicit selection summaries and permission checks.

## Website configuration

### SEO and social

- Site title and title pattern
- Canonical base URL
- Default description and social image
- Search indexing defaults and per-record overrides
- Verification placeholders for search platforms, added only when approved
- Structured-data business details sourced from verified company settings

### Brand and company information

- Legal/public company names
- Approved descriptor and tagline
- Logo variants and favicon
- Official email, phone, WhatsApp, address, hours, and social profiles
- Service areas and supported locales

Every company-detail field is a **publish gate** until supplied and approved.

### Operational settings

- Project-request and contact routing
- Acknowledgement templates
- Allowed uploads and limits
- Spam protection
- Analytics/consent integration
- Retention settings

Secrets and privileged integration credentials are never displayed back in full after entry and are never exposed to the browser or ordinary content roles.

## Role and capability model

The roles are **brief-supplied**; the capability boundaries below are **recommendations**.

| Capability area | Super Admin | Admin | Editor |
|---|---:|---:|---:|
| View dashboard | Yes | Yes | Scoped content view |
| View/manage leads | Yes | Yes | No by default |
| View private lead attachments | Yes | Yes if granted | No |
| Create/edit content drafts | Yes | Yes | Yes |
| Submit content for review | Yes | Yes | Yes |
| Approve/publish content | Yes | Yes | No by default |
| Manage Media Library | Yes | Yes | Upload/edit public-content assets; no private lead media |
| Configure homepage/navigation | Yes | Yes | Draft only if granted |
| Change company, SEO, legal settings | Yes | Scoped | No |
| Manage users and roles | Yes | No by default | No |
| View audit log | Yes | Scoped read | Own/content activity only if useful |
| Configure security/integrations | Yes | No by default | No |
| Export or delete lead data | Explicit capability | Explicit capability | No |

Do not implement checks such as “role equals Admin.” Assign named capabilities to roles so later Sales and Project Manager roles can be composed safely.

Likely future capability bundles:

- **Sales:** assigned leads, notes, stage, next actions, contact-message conversion; no publishing or system access
- **Project Manager:** assigned qualified/won project requests, selected project content contribution; no lead export or system access

These are design provisions, not approved roles.

## Audit and activity model

Audit events should capture:

- Actor, timestamp, action, object type, object reference
- Before/after summary or changed fields, with sensitive values redacted
- Stage, assignment, permission, publication, navigation, settings, export, and deletion changes
- Attachment view/download when sensitivity warrants it
- Authentication/security events according to the security model
- Request or correlation reference for investigation

Audit records are not ordinary editable content. Retention and visibility require an approved policy. “Recent activity” may provide a friendly summary, but it must not replace the authoritative audit record.

## Product states

Every administrative surface requires designed states, not just the populated success state.

| State | Required behavior |
|---|---|
| Initial loading | Stable skeleton or progress without layout jumps; retain page identity |
| Empty | Explain why the area is empty and offer one authorized next action |
| Filtered empty | Show active filters and a clear reset path; do not imply there is no data at all |
| Permission denied | Explain access limitation without exposing protected data; provide safe navigation |
| Not found | Distinguish missing, deleted, and inaccessible only when safe to do so |
| Recoverable error | Preserve inputs, explain what failed, and offer retry |
| Partial dependency failure | Keep usable data visible; label unavailable analytics/media/integration panels |
| Saving | Show local changes are pending and prevent duplicate destructive actions |
| Save failed | Preserve draft, identify unsaved changes, and allow retry/copy recovery |
| Stale/conflict | Warn that another edit exists; compare/reload intentionally rather than silently overwrite |
| Success | Confirm the specific action and resulting state; offer undo when safe |
| Destructive confirmation | Name the exact record and consequences; avoid vague “Are you sure?” prompts |
| Session expired | Preserve recoverable draft state where safe, then require reauthentication |
| Offline/poor connection | Avoid claiming a save succeeded; queue only operations that can be made reliable and auditable |

## Responsive and accessibility requirements

The admin is a web application and should remain operational at the brief-supplied viewport targets, including mobile. Mobile support does not mean forcing dense tables into generic cards.

- At narrow widths, preserve essential table columns and open details in a dedicated page or panel; make secondary columns available through disclosure.
- Collapse the primary sidebar into an accessible modal navigation below the validated desktop width.
- Keep primary save/publish actions reachable without obscuring fields or on-screen keyboards.
- Support keyboard-first table navigation, filters, dialogs, comboboxes, file upload, and editors.
- Provide semantic table headers and meaningful sort/filter announcements.
- Move focus to dialog headings, error summaries, and changed route headings as appropriate.
- Use explicit labels and text for status; never rely on color alone.
- Ensure gold/navy status colors and focus indicators meet the selected accessibility target.
- Announce save, publish, upload, and validation results without stealing focus unnecessarily.
- Respect reduced motion; admin transitions should never slow repeated work.
- Test 320px reflow, 200% zoom, keyboard-only operation, and common screen readers in addition to automated checks.

## Notifications

**Recommendation:** Begin with in-product status and configured email acknowledgements/alerts only if RENZ can own them operationally. Do not introduce a complex notification center in Phase 1 without evidence of need.

Notifications must not expose lead content on lock screens or broad email lists. Staff messages should contain a safe summary and link to the authorized admin record rather than unnecessary personal data.

## Phase 1 boundary

Prioritize the smallest coherent business product:

1. Authentication and capability enforcement
2. Project Requests and Contact Messages with private attachments, assignment, notes, and stage history
3. Projects, Expertise, Insights, bounded Pages, and Media with draft/review/publish controls
4. Curated Homepage, Navigation, company settings, and SEO controls
5. Users, roles, and audit log
6. Actionable dashboard based on the workflows above

Defer advanced workflow automation, custom pipeline builders, broad exports, complex revisions, notification centers, and deep analytics until actual operations justify them.

## Unresolved facts and decisions

### People and authority

- **Publish gate:** initial admin users and role assignments
- **Publish gate:** who may see leads, private attachments, contact details, and audit events
- **Publish gate:** who may approve, publish, unpublish, archive, or permanently delete content
- **Publish gate:** who may export or anonymize lead data

### Lead operations

- **Publish gate:** lead owner, assignment rules, response expectations, next-action policy, and stage definitions
- **Publish gate:** Site Visit and Proposal workflow details; Won/Lost reasons
- **Publish gate:** acknowledgement and staff-notification recipients/channels
- **Publish gate:** duplicate, spam, retention, deletion, and data-subject request procedures

### Editorial operations

- **Recommendation to resolve:** content owners, professional reviewers, legal reviewer, and approval sequence
- **Recommendation to resolve:** scheduling, revision history, preview sharing, and stale-content policy
- **Publish gate:** media-rights and testimonial/team consent process

### System and configuration

- **Publish gate:** official company/contact data and legal content
- **Publish gate:** analytics, consent, upload, retention, and integration configuration
- **Recommendation to resolve:** whether Admin may manage users/settings or receives narrower capabilities
- **Recommendation to resolve:** when Sales and Project Manager roles become operational requirements
