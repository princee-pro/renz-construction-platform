# RENZ Database Architecture

Status: Phase 0 recommendation
Prepared: 27 August 2026
Database platform: Hosted Supabase PostgreSQL, with the exact PostgreSQL 17 patch level verified when environments are created.

This document proposes the initial relational model. It is not a migration and does not assert the existence of any client project, employee, testimonial, credential, statistic, or compliance record.

Related documents:

- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Security Model](./SECURITY_MODEL.md)

## 1. Decision language

- **Recommendation** is the Phase 1 baseline.
- **Deferred** is intentionally not part of the first schema.
- **Open decision** requires client, legal, operational, or verified-content input.

## 2. Database principles

1. PostgreSQL is the system of record for content, identity mappings, leads, permissions, settings, and audit metadata.
2. Supabase Auth owns credentials and sessions. Application tables reference **auth.users**; they never copy passwords.
3. Supabase Storage owns objects. PostgreSQL stores controlled object metadata and business relationships, not file blobs.
4. SQL migrations are the only schema source of truth.
5. Every exposed table has RLS and explicit table privileges. Data API exposure and RLS are separate controls.
6. Public users can read only published content and can never read drafts or sensitive lead data.
7. Normal administrator operations use the caller’s JWT so RLS remains active.
8. Privileged keys are reserved for narrow server-only operations.
9. Business relationships use real foreign keys. JSONB is limited to versioned structured content/configuration where columns would be unstable.
10. Physical deletion is exceptional. Content is normally archived; personal-data deletion follows an approved retention workflow.

Supabase currently documents that new tables may not automatically be available through the Data API. Explicit grants remain required even when RLS exists:

- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/postgres/row-level-security

## 3. Schema boundaries

### 3.1 public schema

**Recommendation:** application tables live in **public** for straightforward Supabase type generation and caller-scoped Data API access. This does not mean they are public to visitors. Access requires an explicit table privilege and a passing RLS policy.

### 3.2 private schema

Use an unexposed **private** schema for:

- permission helper functions used by RLS;
- redacted audit helper functions;
- internal validation helpers;
- rate-limit persistence if later justified;
- any privileged routine that does not need Data API invocation.

Where a SECURITY DEFINER function is genuinely necessary, it must be in this schema, set an empty search path, schema-qualify every object, derive the actor from **auth.uid()**, revoke execution from PUBLIC, and grant only the required role.

### 3.3 api schema

**Recommendation:** expose a small **api** schema only if a Data API RPC is needed. It may contain narrow routines such as lead intake or a safe current-user permission reader. It must not become a second unstructured service layer.

Preferred intake function characteristics:

- SECURITY INVOKER when called with the server secret role;
- explicit argument list rather than arbitrary JSON forwarding;
- database constraints and normalization repeated inside the transaction;
- execution revoked from PUBLIC, anon, and authenticated when the server secret is the intended caller;
- explicit grant only to the elevated server role;
- no dynamic SQL or caller-controlled object names.

### 3.4 Managed schemas

Do not create custom tables or functions inside Supabase-managed **auth**, **storage**, or **realtime** schemas. Use supported foreign keys, policies, and product APIs. Supabase has tightened modification access to these schemas:

- https://supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025

## 4. Common conventions

### 4.1 Identifiers

- UUID primary keys with **gen_random_uuid()** for externally referenced business entities: services, projects, posts, pages, media, leads, attachments, team members, testimonials, and credentials.
- Small identity integers for compact stable lookup tables: roles, permissions, lead stages.
- Big identity integers for append-only, high-write records such as audit logs and stage history.
- Composite primary keys for pure many-to-many joins.

### 4.2 Time and authorship

Mutable records use:

- **created_at timestamptz not null default now()**
- **updated_at timestamptz not null default now()**
- **created_by uuid null**
- **updated_by uuid null**
- **version integer not null default 1**

Author foreign keys reference **profiles.id** with ON DELETE SET NULL. An update trigger may maintain **updated_at**, but version increments should be explicit in the mutation so optimistic concurrency conflicts are detectable.

### 4.3 Publication

Use one publication field:

- **publication_status text** constrained to draft, published, archived;
- **published_at timestamptz null**;
- a check that published records have a publication timestamp.

Do not create separate booleans such as is_draft and is_published. They can contradict each other.

Review states, scheduled publication, revisions, and approvals are **deferred** until the editorial workflow is approved.

### 4.4 Slugs and locales

- Slugs live in localization tables and are unique by locale.
- Recommended constraint: lower-case ASCII words separated by a single hyphen.
- Locale values are BCP 47 language tags validated in the application and bounded by a database length/check.
- Primary uniqueness is **unique(locale, slug)** or **unique(locale, path)**.

### 4.5 Structured content

Long-form page, project, service, and post bodies may use JSONB blocks only when:

- the block is a discriminated, allow-listed Zod union;
- the row carries a **schema_version**;
- raw HTML and executable markup are forbidden;
- references that require integrity remain foreign keys in join tables;
- migrations or read adapters can upgrade older block versions.

Do not add a GIN index to every JSONB column. Index only a demonstrated query.

### 4.6 Data types

- Use **timestamptz**, not timestamp without time zone.
- Use **date** for verified calendar facts that have no time.
- Use **numeric**, not float, for measured quantities that require decimal accuracy.
- Store phone and email values as text, with separately normalized values if matching is required.
- Store budget as a client-approved band code rather than invented pricing.
- Store URLs only after protocol and host validation at the application boundary.

## 5. Identity and authorization tables

| Table | Purpose and key fields | Relationships and deletion |
| --- | --- | --- |
| profiles | Application profile for an Auth user: id, display_name, account_status, timestamps | id is both PK and FK to auth.users; cascade only after sessions are revoked and user deletion is intentional |
| roles | Expandable roles: key, display_name, is_system | Restrict deletion while assigned; archive or disable instead |
| permissions | Atomic capabilities such as content.publish or leads.export | Restrict deletion while mapped; seeded as controlled system data |
| role_permissions | Maps roles to permissions | Composite PK role_id plus permission_id; cascade when an unassigned role/permission is deliberately removed |
| user_roles | Maps users to one or more roles, with granted_by and granted_at | Composite PK user_id plus role_id; user deletion cascades, role deletion restricts while assigned |

**Recommendation:** do not put a role column on profiles. The join model supports future Sales and Project Manager roles without schema change.

**Recommendation:** permission checks read these tables using an indexed private helper. Do not use user-editable Auth metadata for authorization.

## 6. Media tables

| Table | Purpose and key fields | Relationships and deletion |
| --- | --- | --- |
| media_assets | Editorial media metadata: original and public bucket/path, MIME, size, checksum, width, height, processing_status, visibility, creator | Referenced by content and usage tables; hard delete restricts while referenced; object cleanup is explicit |

Important rules:

- The database row is not proof that the object exists; finalization verifies both sides.
- Object paths are immutable UUID-based keys.
- Originals and published derivatives have separate paths and visibility.
- A unique index covers bucket plus object_path.
- A checksum index may support duplicate detection, but checksum is not necessarily globally unique.
- Contextual alt text belongs to the content usage/localization record, not only to the underlying asset.

## 7. Services and projects

| Table | Purpose and key fields | Relationships and deletion |
| --- | --- | --- |
| services | Stable service identity, publication state, order, featured flag, hero asset | Archive by default; restrict hard delete while used by projects or leads |
| service_localizations | Locale-specific slug, name, summary, body blocks, SEO title/description | Composite PK service_id plus locale; cascade with service |
| projects | Stable project facts: publication state, verified location/year/type/status fields, featured flag, hero asset | Archive by default; author FKs set null; media asset FKs restrict |
| project_localizations | Locale-specific slug, title, summary, challenge, approach, solution, outcomes, SEO fields | Composite PK project_id plus locale; cascade with project |
| project_categories | Stable category identity and publication/order state | Archive by default; restrict hard delete while assigned |
| project_category_localizations | Localized category slug, name, description | Cascade with category |
| project_category_assignments | Many-to-many project/category assignment | Project deletion cascades; category deletion restricts while assigned |
| project_services | Many-to-many project/service relationship with sort_order and optional scope label | Project deletion cascades; service deletion restricts while referenced |
| project_stages | Ordered construction/case-study stages with optional verified date and status | Cascade with project |
| project_media | Usage of a media asset: role, phase, optional stage, sort_order | Cascade with project; restrict asset deletion; stage deletion sets null or restricts according to approved editorial behavior |
| project_media_localizations | Contextual alt text and caption by locale for a project-media usage | Cascade with project_media |

Project publication status and delivery status are different:

- **publication_status** controls whether the website may expose the record.
- **delivery_status** describes the verified real-world project state and must remain nullable until supplied.

Do not derive or invent completion, client, cost, duration, outcome, or credential claims.

## 8. Insights, team, testimonials, and credentials

| Table | Purpose and key fields | Relationships and deletion |
| --- | --- | --- |
| posts | Stable article identity, publication state, author, hero asset, published_at | Archive by default; author SET NULL; asset deletion restricts |
| post_localizations | Locale-specific slug, title, excerpt, body blocks, SEO fields | Cascade with post |
| post_categories | Stable article taxonomy | Archive; restrict deletion while assigned |
| post_category_localizations | Localized category slug/name | Cascade with category |
| post_category_assignments | Many-to-many post/category mapping | Post deletion cascades; category deletion restricts |
| team_members | Stable team identity, publication state, sort_order, portrait asset | Archive; portrait asset deletion restricts |
| team_member_localizations | Localized name presentation, role label, biography | Cascade with member |
| testimonials | Stable testimonial identity, publication state, attribution fields safe for publication | Archive; no public consent evidence in this table |
| testimonial_localizations | Quote and localized attribution presentation | Cascade with testimonial |
| testimonial_verifications | Private approval/source evidence, verified_by, verified_at | One-to-one with testimonial; no anonymous access; claims.verify required; cascade only during an approved purge |
| credentials | Company or optional team-member credential placeholder, publication state, issuer/reference/validity fields | Defaults to draft; claims.verify required before approval; optional team_member_id uses SET NULL or RESTRICT according to client policy |
| credential_localizations | Localized credential name/description | Cascade with credential |

No testimonial or credential reaches published state without verified evidence and approval. The schema provides fields for evidence; it does not assert that evidence exists.

## 9. Pages, navigation, SEO, and public settings

| Table | Purpose and key fields | Relationships and deletion |
| --- | --- | --- |
| site_pages | Stable page identity, page_key, publication state, template_key | Archive by default |
| page_localizations | Locale-specific path, title, summary, body/SEO fields | Unique locale plus path; cascade with page |
| page_sections | Ordered, allow-listed page section instances with section_type, schema_version, config JSONB, enabled | Cascade with page; section_type is validated by application and check/registry |
| page_section_projects | Referential selection/order of projects in a section | Section deletion cascades; project deletion restricts while selected |
| page_section_services | Referential selection/order of services in a section | Section deletion cascades; service deletion restricts |
| page_section_media | Referential selection/order and role of media in a section | Section deletion cascades; asset deletion restricts |
| navigation_menus | Menu identity such as primary or footer | Stable key unique; restrict deletion while items exist |
| navigation_items | Ordered tree with menu_id, parent_id, link_type, internal_path or external_url, visibility | Menu deletion restricts; parent deletion restricts until children are moved |
| navigation_item_localizations | Localized label and accessibility text | Cascade with navigation item |
| public_site_settings | Versioned public setting registry: namespace, key, value JSONB | Unique namespace plus key; only allow-listed non-secret settings |

**Recommendation:** SEO title, description, canonical override, social image reference, noindex, and structured-data-safe fields live with each localized content record. Avoid a generic polymorphic SEO table without enforceable foreign keys.

**Recommendation:** the homepage is a constrained composer, not an unrestricted website builder. Section types are designed and versioned; project, service, and media selections use foreign-key joins.

Secrets, private integration configuration, credentials, internal email routing, and tokens do not belong in public_site_settings. They belong in environment/provider secret stores.

**CR1 / D1.5A (2026-09-15).** The owner page builder is implemented on
`website_pages`, `website_page_sections`, `website_page_revisions`,
`website_route_aliases` and `website_section_types` (migration
`20260917100000`), with entity snapshots in `content_publications`
(`20260917110000`). The S2 `site_pages` / `page_sections` family above
remains the earlier design record; the live model, its facades and the
default-deny RLS are documented in `docs/CLAUDE_OWNER_CMS_ARCHITECTURE.md`.

## 10. Lead and inquiry model

The proposed model consolidates lifecycle data while keeping the two intake experiences distinct.

| Table | Purpose and key fields | Relationships and deletion |
| --- | --- | --- |
| lead_stages | Configurable pipeline stages: key, label, order, terminal flag | Seed New, Contacted, Qualified, Site Visit, Proposal, Won, Lost only after client confirmation; restrict deletion while used |
| leads | Shared identity/contact/lifecycle: reference, kind, stage, source, name, email, phone, preferred contact, location, assigned_to, consent version/time, submission status | Stage deletion restricts; assignee SET NULL; personal-data purge follows retention workflow |
| project_briefs | One-to-one Start a Project subtype: property type, current stage, approximate size/unit, budget band, desired timeline, narrative | PK/FK lead_id; cascade only during approved lead purge |
| lead_services | Requested services for a lead | Lead purge cascades; service deletion restricts |
| contact_messages | One-to-one contact subtype: subject and message | PK/FK lead_id; cascade only during approved lead purge |
| lead_attachments | Private object metadata: bucket/path, original name, declared/detected MIME, size, checksum, scan_status, uploaded_at | Cascade metadata during approved purge; Storage object deletion remains explicit |
| lead_notes | Internal note text, author, timestamps | No public access; author SET NULL; lead purge cascades only under retention process |
| lead_stage_history | Append-only old/new stage, changed_by, changed_at, reason code | Lead purge behavior follows audit/retention decision; actor SET NULL |

Lead kind is constrained to supported intake subtypes. The database enforces one appropriate subtype per finalized lead.

Recommended intake states:

- pending_upload;
- submitted;
- spam_rejected;
- withdrawn;
- archived.

These are operational states, not the sales pipeline stage.

The final budget-band codes, project-size units, timeline options, and consent text/version are **open decisions**. No pricing bands should be invented.

## 11. Audit model

| Table | Purpose and key fields | Relationships and deletion |
| --- | --- | --- |
| audit_logs | Append-only actor/action/entity/outcome metadata, redacted changes, request_id, occurred_at | Big identity PK; actor SET NULL; entity reference intentionally type plus ID because audited rows may later be removed |

Audit records must not contain:

- passwords, access/refresh tokens, API keys, authorization headers;
- raw Turnstile tokens;
- full lead form payloads;
- attachment contents;
- unbounded before/after copies of PII;
- secrets from site configuration.

Recommended indexed fields are occurred_at, actor_id plus occurred_at, and entity_type plus entity_id plus occurred_at.

Application audit and Supabase Auth audit logs are complementary. Neither substitutes for database backup or application telemetry.

## 12. Relationship and cascade policy

| Relationship | Recommended behavior |
| --- | --- |
| auth.users to profiles and user_roles | Revoke sessions first, then CASCADE on intentional Auth user deletion |
| content to its localization rows | CASCADE |
| project/post to assignment rows | CASCADE from the parent content item |
| category/service referenced by content | RESTRICT hard delete; archive instead |
| media asset referenced by content | RESTRICT hard delete |
| author, updater, assigner, assignee | SET NULL so business history remains |
| role referenced by user_roles | RESTRICT until assignments are removed |
| lead to subtype, notes, attachments metadata | Purge through one approved retention operation; child rows may CASCADE inside that operation |
| lead attachment metadata to Storage object | No database cascade can remove the object; explicit object cleanup and reconciliation |
| audit actor or audited entity | Actor SET NULL; entity stored as durable type/ID snapshot |
| navigation parent to child | RESTRICT until children are moved or explicitly removed |

Hard deletion must never be the normal content-editing workflow. Archive first, then perform reviewed cleanup only when contractual, privacy, or operational requirements justify it.

## 13. Constraints

Minimum database constraints:

- non-empty trimmed titles/names where required;
- valid publication-status and operational-status checks;
- published_at required when publication_status is published;
- sort_order non-negative;
- byte_size positive and within the approved per-file maximum;
- unique bucket/object path;
- unique role and permission keys;
- unique user-role and role-permission pairs;
- unique locale/slug or locale/path;
- no project stage date claims unless explicitly supplied;
- exactly one lead subtype for a finalized lead;
- budget/timeline codes restricted to approved values;
- attachment scan status constrained;
- page section types constrained to the supported registry;
- version greater than zero.

Application validation improves error messages; it does not replace constraints.

## 14. Index plan

PostgreSQL does not automatically create an index for every foreign key. Add indexes for foreign keys used by joins, RLS, ordering, and deletion checks.

### 14.1 Unique indexes

- service_localizations(locale, slug)
- project_localizations(locale, slug)
- post_localizations(locale, slug)
- page_localizations(locale, path)
- project/post category localizations(locale, slug)
- roles(key), permissions(key), lead_stages(key)
- navigation_menus(key)
- public_site_settings(namespace, key)
- media_assets(bucket_id, object_path)
- leads(reference)

### 14.2 Public list indexes

- services(sort_order) WHERE publication_status = published
- projects(featured, published_at DESC) WHERE publication_status = published
- projects(published_at DESC) WHERE publication_status = published
- posts(published_at DESC) WHERE publication_status = published
- site_pages(publication_status) and localized path uniqueness

Do not place **now()** in a partial-index predicate. An index on published_at within published status still supports the runtime published_at comparison.

### 14.3 Relationship indexes

- every localization foreign key;
- project_services(service_id) and its project ordering;
- category assignment reverse lookup;
- project_media(project_id, sort_order), media_asset_id, stage_id;
- page section item reverse references;
- navigation_items(menu_id, parent_id, sort_order);
- user_roles(user_id, role_id) and reverse role lookup;
- role_permissions(role_id, permission_id) and reverse permission lookup.

### 14.4 Lead and operations indexes

- leads(stage_id, created_at DESC)
- leads(assigned_to, stage_id, updated_at DESC)
- leads(kind, created_at DESC)
- optional normalized email/phone indexes for approved deduplication queries
- lead_notes(lead_id, created_at DESC)
- lead_stage_history(lead_id, changed_at DESC)
- lead_attachments(lead_id, scan_status)
- audit_logs(occurred_at DESC)
- audit_logs(actor_id, occurred_at DESC)
- audit_logs(entity_type, entity_id, occurred_at DESC)

### 14.5 Index admission rule

Do not preemptively index every status, boolean, JSONB, or text field. For new query patterns:

1. capture the actual bounded query;
2. inspect EXPLAIN with buffers in staging-scale data;
3. confirm selectivity and write/storage cost;
4. add a targeted migration and regression test;
5. re-run Supabase advisors.

## 15. RLS and grants summary

The detailed model is in [Security Model](./SECURITY_MODEL.md). Database requirements are:

- Enable RLS on every Data API-exposed table.
- Revoke broad default privileges.
- Grant only the operations needed by anon and authenticated.
- Create a separate policy for SELECT, INSERT, UPDATE, and DELETE.
- UPDATE needs a SELECT policy plus USING and WITH CHECK.
- Use **TO anon** and **TO authenticated**, not the deprecated auth.role helper.
- Public-content SELECT checks publication_status and published_at.
- Administrator policies call the fresh permission helper.
- Anonymous roles receive no SELECT or INSERT privilege on lead, note, attachment, identity, or audit tables.
- Views exposed to callers must declare their execution boundary explicitly. S4 public projections are owner-evaluated security-barrier views with `security_invoker=false`; they are the only anonymous read surface and are not backed by anonymous base-table grants.
- Never solve a permission error by casually adding SECURITY DEFINER.

Current Supabase guidance:

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac

## 16. Transaction boundaries

Use one database transaction for:

- lead plus subtype, services, initial stage history, and intake audit;
- project/post/service publication state plus database audit;
- role assignment/removal plus last-super-admin protection and audit;
- lead stage change plus history and audit;
- navigation reorder;
- media metadata finalization.

Storage operations are not part of a PostgreSQL transaction. The workflow must use explicit intermediate states:

- upload to quarantine;
- verify/process object;
- create/finalize metadata;
- publish only after required public derivative exists;
- reconcile and clean failed/orphaned objects.

Use optimistic concurrency on editable content:

1. read the row version;
2. update only where ID and expected version match;
3. increment version;
4. return a conflict if zero rows changed;
5. let the editor reload or reconcile rather than silently overwrite.

## 17. Query and pagination guidance

- Select explicit columns; do not use unbounded SELECT star in public/list queries.
- Bound every admin list and use stable ordering.
- Prefer keyset/cursor pagination for growing lead, audit, post, project, and media lists.
- Fetch related data through planned joins/embedded relationships, not per-row loops.
- Run independent dashboard queries in parallel.
- Do not request exact counts on every navigation if an estimate or deferred count is sufficient.
- Cache only public published projections; never cache permission or personal-data results across requests.
- Use PostgreSQL full-text search only when an approved search experience exists.

## 18. Migration and verification workflow

1. Initialize Supabase locally and pin the CLI version used in CI.
2. Create each migration through **supabase migration new**.
3. Write reviewed SQL; no manual timestamp filenames.
4. Run a clean **supabase db reset**.
5. Run pgTAP database and RLS tests with **supabase test db**.
6. Generate database types and fail CI on an uncommitted type diff.
7. Run database security/performance advisors and resolve findings.
8. Apply to staging and run integration/E2E tests.
9. Apply forward-compatible migrations to production before dependent application code.
10. Verify migration history after deployment.

Supabase environment and migration guidance:

- https://supabase.com/docs/guides/deployment/managing-environments
- https://supabase.com/docs/guides/deployment/database-migrations

Seed data is synthetic, clearly labelled, and never presented as RENZ portfolio, personnel, testimonials, credentials, or performance.

## 19. Backup and retention

Supabase database backups do not include Storage objects:

- https://supabase.com/docs/guides/platform/backups

Therefore:

- database RPO/RTO and Storage RPO/RTO are separate;
- irreplaceable editorial originals and lead documents need an approved object-backup/export process;
- lead and attachment purge must remove database metadata and Storage objects, then verify both;
- audit retention may outlive operational lead rows but must use redacted snapshots;
- backup retention is not the same as application data-retention compliance;
- restore drills must include credential rotation and object reconciliation.

## 20. Deferred schema capabilities

Do not add these until their workflow is approved:

- content revisions and diff history;
- scheduled publication;
- editorial review/approval queues;
- CRM synchronization state;
- public site search indexes;
- geographic coordinates/maps;
- fine-grained project client portals;
- billing, pricing, proposals, or invoices;
- real-time admin subscriptions;
- queues, vector search, or analytics fact tables.

## 21. Open decisions

1. Initial locale and future locales, including URL behavior.
2. Exact role/permission matrix and last-super-admin recovery process.
3. Editor publication rights and whether two-person approval is required.
4. Lead stage names/order and who may change each stage.
5. Project brief option codes: project types, stages, size units, budget bands, and timelines.
6. Personal-data, lead, note, attachment, and audit retention/anonymization.
7. Accepted upload types, limits, malware scanning, and object backup.
8. Whether testimonials/credentials require uploaded evidence and who verifies it.
9. Content revision, scheduling, and rollback needs.
10. Analytics provider and whether any aggregate data belongs in PostgreSQL.
11. Expected data volume and performance profile.
12. Database/Storage recovery objectives and selected Supabase plan.
13. Whether a CRM or other operational system becomes the lead system of record later.

These decisions must be resolved before migrations encode them. Until then, fields remain nullable or capabilities remain absent rather than containing invented defaults.
