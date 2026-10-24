# RENZ Security Model

Status: Phase 0 recommendation with dated S3 implementation addendum
Prepared: 27 August 2026
Scope: Public website, Start a Project and contact intake, administration application, Supabase Auth/Data API/Storage, and supporting deployment operations.

**Current reviewer entry point:** [Section 26](#26-current-implementation-review--23-october-2026) records the source-reviewed C10/Owner CMS/R1 boundary on 23 October 2026. The older dated recommendations and slice statements below remain historical; they must not be read as a current feature inventory or evidence of cloud verification.

## Dated S3 implementation addendum — 5 September 2026

S3 is now implemented and verified for the local invitation-only staff boundary described in `PHASE_1_S3_IDENTITY_ARCHITECTURE.md`: Supabase Auth email/password, mandatory TOTP AAL2, fresh database-backed permissions, protected admin routes, narrow server-only Auth Admin invitation, explicit grants/RLS, redacted audit, and last-active-Super-Admin safeguards. This addendum does not convert the remaining Phase 0 recommendations into production policy. Public/customer authentication, content/lead/media policies, SMTP ownership, rate limiting, privacy/retention, cloud resources, and deployment remain deferred to their named slices and gates.

The current local configuration enables only Auth, API, and Mailpit for synthetic verification. The browser uses the publishable key; `SUPABASE_SECRET_KEY` is server-only and is not a generic application client. The original Phase 0 guidance below remains historical/recommendation text unless this dated addendum explicitly records an S3 implementation fact.

This is an engineering security baseline, not a legal or compliance certification. It does not claim that RENZ holds any license, certification, registration, privacy approval, or security accreditation.

Related documents:

- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Database Architecture](./DATABASE_ARCHITECTURE.md)

## 1. Decision language

- **Recommendation** is the default implementation and launch requirement.
- **Conditional** is admitted only after a stated security or operational gate.
- **Open decision** needs client, legal, operational, budget, or verified-content approval.

## 2. Security objectives

The system must:

1. expose only verified, published public content;
2. prevent anonymous access to drafts, leads, notes, private settings, attachments, identity data, and audit logs;
3. make every administrator operation depend on both verified identity and explicit authorization;
4. contain privileged credentials to the server;
5. treat the browser, form input, CMS content, uploads, URLs, and third-party callbacks as untrusted;
6. preserve a redacted, tamper-resistant record of material administrator activity;
7. limit spam, automated form abuse, malicious uploads, stored XSS, CSRF, broken object authorization, and privilege escalation;
8. avoid leaking personal data through logs, analytics, error monitoring, cache, previews, or backups;
9. support credential rotation, session revocation, restore, and incident investigation;
10. fail safely without preventing visitors from seeing public contact alternatives.

## 3. Information classification

| Class | Examples | Required handling |
| --- | --- | --- |
| Public | Published services, projects, articles, approved team/testimonial/credential content, public navigation/settings, published media derivatives | Anonymous read through published-only RLS; CDN/cache permitted |
| Internal | Draft content, editorial comments, unpublished media, role definitions, operational settings, aggregate dashboard data | Authenticated and permission-controlled; no public cache |
| Confidential personal/business | Lead contact data, project brief, contact message, notes, assignments, attachment metadata, audit context | Least privilege, encryption in transit/at rest through providers, no anonymous access, retention and export controls |
| Restricted file content | Land documents, plans, site images, quotations, CAD or other attachments if later permitted | Private quarantine, validation/scan, signed access, no indexing, explicit retention and object backup decisions |
| Secret | Supabase secret key, database credentials, Auth tokens, Turnstile secret, monitoring tokens, SMTP/provider credentials | Managed secret store only; never CMS/database public settings, browser bundles, logs, screenshots, or repository |

**Open decision:** legal counsel/client must confirm applicable data-protection, record-retention, consent, and cross-border data-location obligations. Engineering must not infer legal compliance from a cloud region or product certification.

## 4. Trust boundaries and principal threats

### 4.1 Trust boundaries

1. **Visitor browser:** fully untrusted; the publishable key and all client code are observable.
2. **Administrator browser:** authenticated but still untrusted; it may be compromised and cannot make authorization decisions.
3. **Next.js server:** validates identity/input, applies rate limits, invokes caller-scoped database operations, and contains narrowly scoped privileged adapters.
4. **Supabase Data API/PostgreSQL:** final row and operation authorization through grants, constraints, functions, and RLS.
5. **Supabase Storage:** object authorization through bucket configuration and policies; object state is not transactionally coupled to PostgreSQL.
6. **Third-party providers:** Turnstile, deployment, monitoring, SMTP, analytics, or malware scanning receive only the minimum approved data.
7. **CI/CD and operator accounts:** can alter production and therefore require least privilege, MFA, review, and auditable ownership.

### 4.2 Threats addressed

- Broken object-level authorization against IDs, slugs, and Storage paths.
- Authentication without authorization, especially policies that merely say authenticated.
- Role escalation through client state or user-editable metadata.
- Leakage of unpublished CMS content.
- Leaked secret/service credentials.
- Direct Data API form spam that bypasses Turnstile.
- Credential stuffing and administrator account takeover.
- Stale sessions after role removal or user deletion.
- Stored XSS through CMS content, external URLs, SVG, or uploaded HTML.
- CSRF against cookie-authenticated actions.
- SQL injection or dynamic SQL misuse.
- Malicious, oversized, spoofed, or polyglot uploads.
- Exposure of personal data in logs, analytics, error reports, previews, cache, or source maps.
- Audit deletion or unbounded sensitive before/after snapshots.
- Supply-chain compromise and unpatched framework dependencies.
- Backup gaps between PostgreSQL metadata and Storage objects.

## 5. Defense-in-depth model

No single check is considered sufficient:

    Route/UI visibility
      -> verified Supabase identity
      -> current MFA assurance level
      -> server permission check
      -> explicit Data API privilege
      -> row-level policy
      -> database constraints
      -> redacted audit

Hiding **/admin**, omitting a button, or checking a role in React is user experience only. It is never security.

## 6. Authentication and session security

### 6.1 Administrator account model

**Recommendation:**

- Administrator accounts are invitation-only.
- Public Auth signup is disabled.
- Production invitations and password recovery use a client-approved custom SMTP provider.
- Email ownership is verified.
- Password policy and breached-password protection are configured to the strongest practical supported settings.
- Supabase organization, source-control, deployment, DNS, and monitoring operator accounts also require MFA.

Do not use beta passkeys as the only production administrator factor in Phase 1. They may be evaluated later after recovery and browser-support review.

### 6.2 Next.js server-rendered sessions

Use the current Supabase SSR package for cookie-backed sessions and create a new server client for every request. Current guidance states:

- use **getClaims()** to validate identity for protected pages/data;
- use **getUser()** when a fresh Auth user record is specifically required;
- do not trust the user object returned by **getSession()** for server authorization;
- use **proxy.ts** to refresh cookies, not as the final authorization boundary.

Source:

- https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs

Every Server Action and Route Handler repeats authentication and permission checks because these functions are directly invokable network endpoints:

- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/getting-started/mutating-data

### 6.3 Session revocation

Deleting or disabling a user does not automatically make every previously issued token harmless. User deactivation/removal must:

1. revoke/sign out active sessions;
2. remove role assignments;
3. mark the application profile disabled;
4. preserve required redacted audit history;
5. verify protected database operations are immediately denied.

Fresh database permission checks make role removal effective even if UI/JWT role hints are stale.

## 7. Multi-factor authentication

**Recommendation:** TOTP MFA is mandatory for every administrator before any admin data is available in production.

Supabase expresses MFA assurance in the JWT:

- **aal1**: first factor only;
- **aal2**: a verified second factor.

Enforcement must occur at all three levels:

1. Auth flow redirects an AAL1 administrator to enroll or verify.
2. Server authorization rejects sensitive admin work without AAL2.
3. Restrictive RLS policies require AAL2 for protected administrator tables/operations.

Displaying an MFA screen without database/API enforcement does not improve security. Supabase explicitly recommends enforcing MFA in SSR, APIs, and RLS:

- https://supabase.com/docs/guides/auth/auth-mfa
- https://supabase.com/docs/guides/auth/auth-mfa/totp

Recovery codes/device-loss support, administrator identity verification, and who may reset MFA are **open decisions** that require a documented runbook before launch.

## 8. API keys and privileged access

Supabase’s current key model distinguishes:

- publishable keys, safe to include in public clients but not a security boundary;
- secret keys, server-only and able to bypass RLS;
- legacy anon/service_role keys, scheduled for deprecation by the end of 2026.

Source:

- https://supabase.com/docs/guides/getting-started/api-keys

Rules:

- Only URL, publishable key, Turnstile site key, and explicitly approved public monitoring/analytics identifiers may use the **NEXT_PUBLIC_** prefix.
- The Supabase secret key exists only in the deployment secret store and a narrow server-only module.
- Normal admin reads/writes never use the secret key; they use the administrator JWT so RLS applies.
- The secret client may perform only allow-listed public-form intake, Auth administration, and media promotion operations.
- Do not export a generic privileged client from a shared utility.
- Separate development, staging, and production keys.
- Rotate a key immediately after suspected exposure and exercise routine rotation before launch.
- Never print environment objects or provider responses that may contain credentials.

## 9. RBAC design

### 9.1 Authorization source

The authorization source of truth is:

- roles;
- permissions;
- role_permissions;
- user_roles.

Do not authorize from:

- React/client state;
- route visibility;
- a profiles.role column;
- **user_metadata** or other user-editable JWT content;
- an email-domain comparison;
- merely being in the PostgreSQL authenticated role.

### 9.2 Recommended permission catalog

| Permission | Capability |
| --- | --- |
| content.read | Read draft and published editorial content |
| content.write | Create and edit drafts |
| content.publish | Publish or unpublish approved content |
| content.archive | Archive editorial records |
| media.read | Read private editorial media metadata/previews |
| media.upload | Upload private editorial source assets |
| media.manage | Promote, replace, archive, or delete media |
| leads.read | Read leads, briefs, messages, notes, and approved attachment metadata |
| leads.manage | Assign leads, add notes, and change stages |
| leads.export | Export personal lead data |
| claims.verify | Approve testimonial, credential, compliance, and similar evidence-backed public claims |
| website.manage | Change navigation, homepage, SEO, branding, and public site settings |
| analytics.read | Read aggregate analytics dashboards |
| users.manage | Invite, disable, and recover administrator accounts |
| roles.manage | Grant/revoke roles and edit role-permission mappings |
| audit.read | Read the application audit log |
| security.manage | Change security-sensitive settings and perform security operations |

### 9.3 Proposed initial role matrix

This is a **recommendation requiring explicit client approval**, not an assertion about current staff.

| Permission | Super Admin | Admin | Editor |
| --- | --- | --- | --- |
| content.read | Yes | Yes | Yes |
| content.write | Yes | Yes | Yes |
| content.publish | Yes | Yes | No |
| content.archive | Yes | Yes | No |
| media.read | Yes | Yes | Yes |
| media.upload | Yes | Yes | Yes |
| media.manage | Yes | Yes | No |
| leads.read | Yes | Yes | No |
| leads.manage | Yes | Yes | No |
| leads.export | Yes | Open decision | No |
| claims.verify | Yes | Open decision | No |
| website.manage | Yes | Yes | No |
| analytics.read | Yes | Yes | No |
| users.manage | Yes | No | No |
| roles.manage | Yes | No | No |
| audit.read | Yes | No by default | No |
| security.manage | Yes | No | No |

Future Sales and Project Manager roles are composed from the same atomic permissions; they do not require a schema change.

### 9.4 Fresh permission checks

**Recommendation:** a private stable **has_permission(permission_key)** function derives the caller from **auth.uid()** and queries indexed role tables. This avoids waiting for stale role claims.

If SECURITY DEFINER is necessary to read protected authorization tables:

- keep the function in the unexposed private schema;
- set search_path to empty;
- schema-qualify every object;
- accept no arbitrary user ID;
- return only a boolean;
- revoke execute from PUBLIC;
- grant only authenticated;
- test every permission and cross-user denial;
- run Supabase database advisors.

The application may fetch a safe current-user permission list for UI composition, but the UI result is only a hint. Every operation rechecks.

### 9.5 Administrative safeguards

- Prevent removal or disablement of the final active Super Admin in a transaction.
- Role grants/removals require AAL2, roles.manage, current password/MFA challenge where practical, and an audit entry.
- Do not implement a hidden hard-coded superuser email.
- Break-glass access, if required, is an **open decision** and must be time-limited, separately stored, monitored, and rehearsed.

Supabase’s current RBAC reference:

- https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac

## 10. Data API grants and RLS

### 10.1 Two independent controls

For a Data API request to succeed:

1. the PostgreSQL role needs table/function/schema privilege;
2. an applicable RLS policy must permit the row/operation.

RLS does not grant access, and a GRANT does not bypass RLS. New Supabase tables may not be automatically exposed, so migrations must specify both deliberately.

### 10.2 Policy requirements

- Enable RLS on every table in an exposed schema.
- Revoke broad defaults before granting the minimum operation.
- Write separate SELECT, INSERT, UPDATE, and DELETE policies.
- Use **TO anon** and **TO authenticated** rather than deprecated **auth.role()** checks.
- Authentication alone is not authorization; authenticated policies include ownership or permission predicates.
- UPDATE requires an applicable SELECT policy.
- UPDATE has both USING for the existing row and WITH CHECK for the resulting row.
- Wrap stable no-argument helper calls in a scalar SELECT where appropriate so PostgreSQL can initialize them once per statement.
- Index every column/predicate used by RLS.
- Views exposed to callers must declare their execution boundary explicitly. S4 public projections use owner-evaluated **security_invoker = false** with **security_barrier = true**; anonymous callers have no base-table `SELECT` grant.
- SECURITY DEFINER is never added simply to make a denied query work.

Current source:

- https://supabase.com/docs/guides/database/postgres/row-level-security

### 10.3 RLS and grant matrix

| Resource | anon | authenticated administrator |
| --- | --- | --- |
| Published content and localizations | SELECT where publication_status is published and publication time is effective | content.read for drafts; operation-specific write/publish/archive permissions |
| Content relationships/taxonomies | SELECT only where the related parent content is published | Matching content permission |
| Public navigation/settings | SELECT only allow-listed public values | website.manage for mutation |
| Public media metadata | SELECT only finalized public derivatives | media.read/upload/manage according to operation |
| Profiles | No access | Own minimal profile; users.manage for broader administration |
| Roles/permissions/mappings | No direct access | Safe own-permission reader; roles.manage for mutation |
| Leads, briefs, messages | No SELECT or INSERT | leads.read or leads.manage |
| Notes and stage history | No access | leads.read/manage |
| Lead attachment metadata | No access | leads.read; mutation via approved upload/finalization flow |
| Audit logs | No access | audit.read SELECT only; insertion through trusted audit path |
| Testimonial verification evidence | No access | claims.verify |
| Private credential evidence | No access | claims.verify |

### 10.4 Public form exception

**Recommendation:** do not grant anonymous INSERT on lead tables. The browser’s publishable key is discoverable, and a direct REST call would bypass application Turnstile and rate limiting.

After server validation, use a narrow server-only intake routine under the secret role. The routine accepts only supported fields and performs one transaction. This is a controlled exception to normal caller-scoped access, not permission for arbitrary privileged queries.

## 11. Public form abuse controls

Every contact and project-request submission uses:

1. provider/firewall rate limiting before expensive work;
2. request and body-size limits;
3. server-side Turnstile validation;
4. expected hostname and action validation;
5. Zod parsing and normalization;
6. idempotency key to prevent accidental duplicate intake;
7. database constraints and transactional write;
8. safe success/error response;
9. monitoring of rejection and failure rates.

Cloudflare states that Turnstile server validation is mandatory, tokens are single-use, and expire after five minutes:

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

Additional low-cost controls may include a visually hidden honeypot and minimum completion time, but neither replaces Turnstile or rate limiting.

Use a keyed HMAC of IP plus route for short-lived application rate-limit keys when possible. Do not retain plaintext IP or user agent beyond an approved operational purpose. Never put form text into abuse logs.

**Recommended failure mode:** fail closed for automated intake if Turnstile cannot be verified, show a clear retry state, and keep verified phone/WhatsApp/email alternatives visible. The exact provider-outage policy is an open operational decision.

## 12. Input validation and injection prevention

### 12.1 Validation layers

- Zod at environment, action, route, CMS block, URL, webhook, and RPC boundaries.
- Database NOT NULL, CHECK, UNIQUE, FK, and size/range constraints.
- Explicit column projection and parameterized Supabase queries.
- No string-concatenated SQL.
- No dynamic SQL using visitor/editor-controlled identifiers.
- Server-side allow lists for content types, page sections, sort keys, export columns, URL protocols, and redirect destinations.

### 12.2 Stored XSS prevention

**Recommendation:** store allow-listed structured content blocks and render text/components through React. Do not store arbitrary HTML and do not use **dangerouslySetInnerHTML** for CMS copy.

If a later import path requires HTML:

- sanitize on the server with a reviewed allow list;
- remove scripts, event attributes, forms, iframes, style injection, dangerous URLs, and SVG;
- store the sanitized representation plus schema version;
- still use CSP as a secondary control.

External links accept only approved HTTP/HTTPS schemes and receive appropriate noreferrer/noopener behavior. JSON-LD serialization must escape less-than characters so content cannot terminate its script element.

### 12.3 Redirect and path safety

- Auth callbacks redirect only to allow-listed same-origin paths.
- Navigation external URLs are protocol/host validated.
- Storage paths are generated server-side and never include user-supplied traversal segments.
- Download responses use sanitized Content-Disposition filenames.

## 13. CSRF, cookies, CORS, and HTTP methods

- GET and HEAD never mutate state.
- Server Actions use POST and Next.js Origin/Host comparison; allowedOrigins contains only exact trusted proxy origins if needed.
- Cookie-authenticated Route Handlers also validate origin for mutations.
- Supabase SSR owns secure cookie rotation; production cookies are Secure, HttpOnly where supported by the integration, and use an appropriate SameSite policy.
- Auth callback state/PKCE behavior remains enabled.
- CORS is not broadened to wildcard credentialed origins.
- The publishable Supabase key being visible is expected; RLS and grants protect data.

Next.js Server Action origin/body controls:

- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions

## 14. Storage security

### 14.1 Bucket model

| Bucket | Visibility | Writer | Reader | Purpose |
| --- | --- | --- | --- | --- |
| cms-originals | Private | media.upload through approved admin flow | media.read/manage through signed access | Draft/source editorial images |
| site-public | Public read | Server media-promotion operation only | Anyone | Published optimized derivatives only |
| lead-quarantine | Private | Time-limited signed upload for one pending lead slot | Scanner/finalizer only | Untrusted visitor uploads |
| lead-attachments | Private | Server promotion after checks | leads.read through short-lived signed URL | Approved project-request attachments |

Supabase Storage denies uploads unless policies permit them and documents the required operation policies:

- https://supabase.com/docs/guides/storage/security/access-control

### 14.2 Object rules

- UUID-based immutable paths; no overwrite/upsert for normal media.
- Separate originals from public derivatives so drafts cannot leak through a public URL.
- Per-bucket count, MIME, and size limits.
- Validate declared MIME, detected magic bytes, extension, size, and checksum.
- Reject HTML, executable content, and SVG at launch.
- Archives, Office documents, PDFs, and CAD formats remain disabled until client need and scanner support are approved.
- Strip location/EXIF metadata from public derivatives.
- Serve private files with short-lived signed URLs and attachment disposition where appropriate.
- Never expose a bucket listing.
- Do not rely on a filename extension or browser Content-Type.
- Quarantine files are not downloadable by ordinary administrators.
- Promotion is idempotent and records scan status/time/provider result code without storing harmful content in logs.
- Failed and abandoned objects are purged by a bounded cleanup operation.

Supabase recommends resumable upload for large files above approximately 6 MB and unreliable networks. It also recommends new object paths rather than overwrite to avoid stale CDN content:

- https://supabase.com/docs/guides/storage/uploads/resumable-uploads

### 14.3 Storage RLS details

- Policies constrain bucket_id and generated object path prefix.
- A signed upload is issued only after validated pending-lead creation.
- No anonymous SELECT on lead buckets.
- Editorial users receive only operations matching media permissions.
- Site-public writes never come directly from a browser.
- Avoid upsert. If ever introduced, remember Storage requires INSERT, SELECT, and UPDATE permission.

### 14.4 Storage backup

Supabase database backups include Storage metadata, not Storage objects:

- https://supabase.com/docs/guides/platform/backups

An independent object backup/export and restore test is required for any file the client cannot recreate.

## 15. HTTP security headers and CSP

Minimum production headers:

- Strict-Transport-Security after HTTPS/domain readiness;
- X-Content-Type-Options: nosniff;
- Referrer-Policy: strict-origin-when-cross-origin;
- Permissions-Policy denying unused sensors/capabilities;
- CSP object-src none;
- CSP base-uri self;
- CSP form-action self plus specifically required providers;
- CSP frame-ancestors none;
- CSP upgrade-insecure-requests where appropriate;
- removal of unnecessary X-Powered-By.

### 15.1 Content Security Policy

Use a route-aware CSP inventory:

- Admin/auth routes are already dynamic and should use a fresh nonce CSP.
- Marketing routes should remain cacheable; choose the strongest policy compatible with static delivery and avoid arbitrary inline content.
- Production does not allow unsafe-eval.
- Add only exact provider origins required for Supabase images/API, Turnstile, approved analytics, and monitoring.
- Do not add broad wildcards to silence CSP reports.
- Deploy report-only first, resolve violations, then enforce.

Next.js notes that nonce CSP requires dynamic rendering and has performance implications:

- https://nextjs.org/docs/app/guides/content-security-policy

## 16. Environment and secret handling

Create separate server and public environment schemas:

- public schema parses only browser-safe values;
- server schema imports the server-only guard and parses secrets;
- production fails fast when a required secret is absent;
- tests use explicit safe fixtures.

Rules:

- **.env.local** and provider credential files are ignored by Git.
- **.env.example** lists variable names and safe descriptions only.
- Secrets live in environment-scoped provider stores.
- Preview and staging never share production secrets.
- CI logs mask tokens and never echo environment dumps.
- Secret rotation ownership and cadence are documented.
- Public site settings never contain credentials.
- Source maps are uploaded privately to the monitoring provider, not publicly hosted unless reviewed.

## 17. Privacy, logging, and analytics

### 17.1 Data minimization

Collect only the information necessary to respond to a request. Optional project fields remain optional. Do not collect government identifiers, payment details, or professional documents unless a verified requirement and safe workflow are approved.

Each submission records:

- the privacy/consent text version;
- timestamp;
- necessary communication preference;
- source category without invasive fingerprinting.

Marketing consent, if ever requested, is separate from service-request processing.

### 17.2 Logging

Allowed operational log fields:

- timestamp, environment, release;
- request/correlation ID;
- route and operation;
- duration and result class;
- non-PII actor/lead internal identifier where needed.

Forbidden:

- form message/body;
- names, email, phone, exact address;
- attachment names or content;
- session/access/refresh tokens;
- authorization headers and cookies;
- API/secret keys;
- Turnstile token;
- password or MFA secret/code;
- unredacted database rows.

### 17.3 Analytics

Analytics events use stable IDs/categories, not free text. Provider loading must not block rendering and must respect the approved consent model. Session replay is disabled by default on admin, form, and attachment routes.

Provider selection, data location, retention, IP handling, cookie/consent behavior, and DPA approval are open decisions.

## 18. Audit logging

Material events:

- successful/failed administrator login and MFA changes, using Supabase Auth audit where available;
- user invitation, disablement, recovery, and session revocation;
- role/permission grant and removal;
- content creation, publication, unpublication, archive, and destructive deletion;
- website/navigation/SEO/branding setting changes;
- lead view where required by policy, export, assignment, stage change, and note creation;
- attachment approval, scan failure, download, and deletion;
- privileged intake or administration failures;
- security configuration and secret rotation event metadata.

Application audit rows are append-only. No ordinary application role may update or delete them. Store:

- actor ID, action, entity type/ID;
- timestamp and request ID;
- outcome;
- small allow-listed redacted change summary.

Do not store whole before/after lead rows. Audit access requires **audit.read**, AAL2, monitoring, and a retention policy.

## 19. Error handling and information disclosure

- Public errors are generic, actionable, and include a correlation ID.
- Authentication failures do not disclose whether an email is an administrator.
- Authorization returns a safe denial and is logged without personal payload.
- Database/provider error text and stack traces never reach the browser.
- Validation returns field-level safe messages, not SQL or schema details.
- Upload failures distinguish retryable transport errors from disallowed type/size without exposing scanner internals.
- Custom 404/500 pages contain no environment, path, query, or configuration dump.

## 20. Supply-chain and operator security

- Pin exact production dependencies and the package manager.
- Commit and review the lockfile.
- Run dependency review, vulnerability scanning, secret scanning, and static analysis in CI.
- Use automated update pull requests with tests; prioritize framework/Supabase security releases.
- Do not execute floating **latest** CLIs in production CI.
- Minimize install scripts and review new transitive dependency changes.
- Protect main/production branches with review and required checks.
- Give deployment, Supabase, DNS, analytics, and monitoring users the smallest role.
- Remove former operators immediately and rotate shared credentials.
- Require MFA on source-control, deployment, Supabase organization, DNS, email, and monitoring accounts.

Supabase production and package security guidance:

- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/docs/guides/security/npm-security

## 21. Security testing

### 21.1 Database and RLS tests

For every protected table:

- prove anon cannot read drafts or sensitive rows;
- prove anon cannot write;
- prove each approved role can perform only its mapped operations;
- prove a user with no role is denied;
- prove cross-user/role access is denied;
- prove UPDATE cannot reassign protected ownership/relationships;
- prove archived/unpublished records are not public;
- prove AAL1 is denied and AAL2 is allowed;
- prove views preserve RLS;
- prove security functions expose no arbitrary-user oracle;
- prove grants match policies.

Use pgTAP through **supabase test db** and run from a clean reset.

### 21.2 Application tests

- Direct invocation of every Server Action without UI.
- CSRF/origin failure.
- Session expiry, disabled user, role removal, and MFA downgrade.
- ID substitution/BOLA against leads, attachments, projects, and media.
- Turnstile invalid, expired, duplicate, wrong-host, and provider-timeout cases.
- Rate-limit threshold and recovery.
- Duplicate/idempotent form submission.
- Stored XSS payloads in every CMS field and URL.
- Oversized/spoofed/polyglot upload and path traversal.
- Signed URL expiry and wrong-lead access.
- CSP/header verification in production build.
- Error/log redaction checks.

### 21.3 Operational tests

- Restore database and reconcile Storage.
- Rotate Supabase/Turnstile/monitoring secrets.
- Revoke an administrator and verify immediate denial.
- Disable public intake during abuse while preserving contact alternatives.
- Confirm alert delivery and ownership.

## 22. Monitoring and incident response

Recommended security alerts:

- sustained failed admin login/MFA attempts;
- role/security/user-management changes;
- anomalous lead export or attachment download volume;
- repeated RLS/authorization denials;
- elevated Turnstile/rate-limit rejection;
- privileged key use outside the expected operation;
- scanner backlog or malicious-file detection;
- sudden server error or intake failure rate;
- migration/advisor/security test failure.

Minimum incident runbook:

1. identify scope and preserve redacted evidence;
2. revoke affected sessions and credentials;
3. remove/disable compromised accounts or public intake paths;
4. rotate keys in a documented order;
5. verify database grants/RLS and deployment integrity;
6. restore/reconcile if integrity is affected;
7. notify the designated client/legal/operational owners according to approved obligations;
8. document root cause, impact, remediation, and prevention.

Notification timing and legal obligations are open decisions for qualified counsel/client owners.

## 23. Deployment security

- Separate local, preview/staging, and production Supabase projects/branches and provider credentials.
- No production data in previews.
- Apply reviewed migrations through CI, never by ad hoc production dashboard edits.
- Run RLS tests, advisors, static checks, dependency checks, application tests, and a production build before release.
- Use least-privilege CI tokens and protected environments for production.
- Configure server execution near the database without assuming that region choice proves compliance.
- Enable the backup/PITR tier required by the approved recovery objective.
- Back up Storage separately.
- Keep deployment rollback and compensating-migration procedures documented and tested.

Supabase environment and backup references:

- https://supabase.com/docs/guides/deployment/managing-environments
- https://supabase.com/docs/guides/platform/regions
- https://supabase.com/docs/guides/platform/backups

## 24. Open decisions

1. Applicable privacy, retention, consent, breach-notification, and cross-border data requirements.
2. Hosting/Supabase tier, operator account ownership, and production region.
3. Exact role matrix, especially Editor publication, Admin lead export, audit access, and credential/testimonial approval.
4. Admin password/login method, MFA recovery, break-glass access, and custom SMTP.
5. Lead, note, attachment, audit, Auth-log, analytics, and backup retention.
6. Accepted file types/count/size, CAD/archive support, scanning provider, and behavior after a detection.
7. Analytics, monitoring, consent, session replay, and data-processing providers.
8. Database and Storage RPO/RTO, object backup, and restore owner.
9. Rate-limit thresholds and provider-outage fallback.
10. Who can export personal data and what approval/audit is required.
11. Whether two-person approval is required for publishing claims or changing roles/security.
12. Incident-response contacts and legal/customer communication owner.
13. Credential/compliance evidence storage and verification workflow.

Until resolved, the safer capability remains absent or disabled rather than implemented with invented client policy.

## 25. S4 implementation addendum — 5 September 2026

The S4 local kernel is now implemented within the unresolved-policy boundary. This dated addendum corrects implementation status; it does not close the open production decisions above.

### 25.1 Content/evidence/publication

- Content lifecycle remains `draft`, `published`, or `archived`; evidence lifecycle is independent and fail-closed.
- S4 uses typed evidence/claim relationship tables, approved public wording, consent state, reviewer/date, review due date, and optimistic versions.
- Publication commands require the current actor, AAL2, active profile, exact capability, expected version, readiness, current evidence, current rights, safe URL/content, and redacted audit.
- The `admin` role receives only draft/content-read and media capabilities. Only `super_admin` receives publication, archive, claims verification, and website-setting capabilities in this local matrix.
- A database check marker cannot be omitted accidentally: S4 publication/media checks coalesce absent session settings before comparing them.

### 25.2 Storage correction

S4 enables the local Storage API but does not insert or mutate provider-managed `storage.objects` metadata. The migration adds only project RLS policies for the two reserved private buckets. Bucket configuration and object lifecycle are performed through the Storage API by the local provisioner. There is no public bucket, anonymous Storage policy, signed upload endpoint, or production upload promise.

The development MIME set is JPEG, PNG, WebP, AVIF, MP4, and WebM. Server-side magic-byte validation, UUID-rooted paths, and a report-only database/object reconciliation command are implemented. Scanning, quarantine, EXIF policy, retention, backup, signed delivery, and incident ownership remain G4 decisions.

### 25.3 Public projections and cache

The public contract is a named explicit-column projection set. S4 views are owner-evaluated (`security_invoker=false`) and `security_barrier=true`; anonymous access is projection-only and all editorial, evidence, claim, registry, settings, and media base-table `SELECT` grants are revoked. Internal evidence, rights, reviewer, consent, and audit fields are not projected.

The application cache boundary is split intentionally between `src/lib/content/cache-tags.ts` (the bounded tag vocabulary) and `src/lib/content/invalidation.ts` (server-only invalidation). It uses Next.js 16 `revalidateTag(tag, "max")` and `revalidatePath` in supported server contexts; `updateTag` is confined to the server-action-only read-your-own-write helper. No public route or cacheable S6 query is introduced by S4.

## 26. Current implementation review — 23 October 2026

This section was checked against the current application, migrations and test source for the private GitHub handoff. It preserves the historical Phase 0/S3/S4 material above. It is **not a new penetration-test certification**, a claim that every suite has just run, or production approval. Fresh verification results belong in the handoff's current test record. The dated [C10 hardening report](./RENZ_C10_PRODUCTION_HARDENING_REPORT.md) describes its own local runs; those results do not automatically cover later branding, provider configuration or a new environment.

### 26.1 Trust and data boundaries now implemented

- Public website rendering uses published projections/read facades; private CRM, operational projects, finance, procurement, leads, staff and audit records remain outside ordinary anonymous reads.
- The browser receives the Supabase URL and publishable key. Normal staff data access uses a per-request, cookie-backed caller client and the staff JWT. PostgreSQL grants, RLS, facade predicates and constraints remain the authority.
- `src/lib/supabase/admin.ts` is server-only and encapsulates Auth user creation, password reset and account bans. `src/lib/supabase/service.ts` is a server-only privileged-client factory used for intake, short-lived Storage signing, notification tasks and health/tooling. This factory is broader than the original Phase 0 recommendation of individually encapsulated adapters: every new caller must be reviewed because its key bypasses RLS.
- Database `SECURITY DEFINER` facades are intentional authorization boundaries. Their checked patterns include an empty `search_path`, schema-qualified objects, explicit execute grants/revokes and caller identity from `auth.uid()`. A definer function can bypass underlying table RLS, so its permission, relationship and input checks must be reviewed independently; RLS alone does not secure the function.
- Client inputs, CMS rich text/URLs, original filenames, request headers and uploaded bytes remain untrusted. No company credential, certification, project evidence or legal compliance is established by passing engineering checks.

The actual application permission catalog is `src/lib/auth/permissions.ts`. It includes separate read/write/issue/payment/publish/staff capabilities across domains, beyond the small historical role matrix above. The exact grants are in migrations; do not reproduce a second independent permission policy in a component or environment variable.

### 26.2 Authentication, MFA and session lifecycle

`src/proxy.ts` refreshes Supabase cookies and sends an anonymous staff-route request to sign-in with a 307 response. It marks staff responses private/no-store and noindex. It is an initial routing boundary; workspace layouts, actions, route handlers and database checks still enforce access.

`getAdminAuthSnapshot()` checks both `auth.getUser()` and `auth.getClaims()`, fetches the caller's profile and reads AAL/TOTP state. `requireAal2User()` gates workspace pages; `authorizeServerAction()` independently rejects signed-out, inactive, AAL1, pending-password or unauthorized callers. Normal authorization never trusts React state, `user_metadata`, a hard-coded email, or a user object from client `getSession()`.

TOTP enrollment and verification are implemented. The privileged data boundary requires AAL2, not merely visiting the MFA page. Session audit is recorded through `record_session_event` for admitted events. Sign-out, disabled profile checks, Auth bans and current database permissions limit stale-session access. The disabled account's existing access token may remain cryptographically valid until expiry; the application relies on fresh profile/facade checks and the ban prevents refresh. Operator incident containment should still revoke sessions explicitly.

The local `supabase/config.toml` disables global public signup, while enabling the email provider for existing/created staff. No public customer registration flow is implemented. Check hosted Auth settings separately: committing local configuration does not configure a cloud project.

### 26.3 Owner-controlled staff administration replaces email invitation assumptions

The implemented C10 workflow is **owner-created staff with a one-time temporary password**, rather than an email invitation dependency:

1. An active AAL2 `super_admin` with `staff.manage` uses Settings → Staff & Access.
2. A server action creates an Auth user with confirmed email via the server-only Auth Admin adapter.
3. `admin_prepare_staff_profile` sets the initial role, pending-MFA state and password-change flag, and records a redacted audit entry.
4. The temporary password is shown once to the owner for delivery over an approved private channel. It must never enter a Git file, issue, log, screenshot, audit value or browser storage.
5. The staff member signs in, enrolls/verifies TOTP and follows the forced password-change UI before opening the workspace.

Current role templates are `super_admin`, `admin`, `project_manager`, `finance`, `content_editor` and `viewer`. Role names are templates, not business employment claims. `private.c10_can_manage_staff()` requires both `staff.manage` and current Super Admin status; ordinary `admin` is not an owner-account administrator. Staff may not change their own role/status. Existing last-active-Super-Admin triggers prevent lockout through ordinary disable/demotion paths.

Password reset is owner-mediated and repeats the one-time temporary-password handling. The voluntary password form uses Supabase Auth followed by `complete_password_change()`. Public self-service “forgot password,” production SMTP, lost-factor identity verification, recovery codes and a cloud-tested break-glass process must not be described as available without separate evidence.

**Known first-login gate limitation:** `public.complete_password_change()` in `20260922100000_c10_staff_access.sql` is executable by an authenticated AAL2 caller and clears `must_change_password` for that caller. The RPC itself does not prove that `auth.updateUser({ password })` completed; an AAL2 caller could invoke it directly. The supported UI changes the Auth password first, but the database flag is not an independent proof of a credential change. Preserve this as an explicit staging/security-review item rather than claiming an unbypassable forced-reset guarantee. MFA, active-profile and domain permissions still apply.

### 26.4 RLS, facades and publication isolation

The S4 owner-evaluated, security-barrier public projections expose explicit public columns while base editorial/evidence tables stay private. C4+ operational domains use narrow permission-checked facades and default-deny direct table access. Staff own-profile/role readers expose only the admitted current-user data. Test suites under `supabase/tests/database/` cover schema/grants, AAL1 and anonymous negatives, BOLA, roles, financial invariants, publication and CMS contracts.

The current `private.has_permission()` requires `auth.uid()`, AAL2, an active profile, `must_change_password = false` and a live role-to-permission relationship. Publicly executable read/intake/share functions are explicit exceptions and must validate their own inputs; “every function requires staff AAL2” would be inaccurate.

CMS page drafts and published revisions are separate. Saves use expected versions and stale edits are refused. Publication validates the canonical section vocabulary, media readiness, URLs, current rights and other content-specific evidence. Public cache invalidation follows successful publication; the public site is not the staff draft preview. Revoking rights removes eligibility when database-backed media is resolved.

Concept studies remain distinguished from real RENZ projects. Generated-reference media may illustrate labelled studies/pages where the current website predicates permit it; real-project media promotion refuses generated/concept/synthetic provenance. A database rights flag records the reviewer assertion, and does not establish third-party ownership independently. See [the asset register](./ASSET_AND_LICENSE_REGISTER.md).

### 26.5 Editorial media and confidential supporting files

Editorial buckets `editorial-originals` and `editorial-derivatives` are private. The server uses magic-byte checks and safe immutable UUID paths, records checksums/source lineage, and generates bounded image derivatives with Sharp. Image uploads are limited to 20 MiB; accepted videos have a separate 12 MiB bound. Image derivatives are capped at 2400 pixels and thumbnail children at 960 pixels. The accepted current signatures include image JPEG/PNG/WebP/AVIF and admitted MP4/WebM video; no SVG/HTML upload pipeline is admitted.

The owner library and real-project route share `src/lib/media/upload-image.ts`. Registration/finalization, rights confirmation, project-use eligibility and publication remain separate operations. Uploaded originals are not made public automatically. Archive retains records/objects and rejects in-use assets. Media/object reconciliation reports inconsistencies rather than deleting arbitrary objects.

Website delivery resolves `resolve_website_media_path` for either a published reference or an authorized staff preview, then signs the resulting Storage path for five minutes. The website redirect currently uses `Cache-Control: private, max-age=240`. Project/brand delivery uses its corresponding bounded resolver. A signed URL already issued is a bearer capability until expiry; eligibility revocation prevents later minting and is not guaranteed to revoke a previously issued URL immediately.

Public supporting files use a separate `lead-intake` bucket with no anonymous/authenticated direct object policy. `/api/intake/uploads` checks Origin/Sec-Fetch-Site, a signed form token, an HMAC-derived visitor rate key, a session token and the configured upload policy. Current limits are 5 files, 10 MiB per file, a two-hour upload session and 30 uploads/hour per identity key. JPEG/PNG/WebP are allowed by images-only policy; PDF is conditional on the owner setting. PDF signature/active-content checks are heuristics, not malware scanning.

Every supporting file begins as `pending_review`. `NoScanner` is the only installed scanner adapter. Staff with `leads.attachments.read` can resolve a non-rejected, lead-bound file; the server mints a 120-second signed URL. PDFs are forced to download. A pending file is **not independently proven safe** merely because the preview/download is available. The existing quarantine/review wording must not be interpreted as antivirus certification. Keep uploads disabled or images-only until the approved file policy and operational review permit more.

### 26.6 Intake validation, abuse and trust in the hosting proxy

`src/features/intake/intake-actions.ts`, `intake-server.ts` and `intake-contract.ts` validate supported public form fields, signed issue-time/nonces, timing, honeypot, bot verification and idempotent database intake. Anonymous callers have no direct lead-table insertion grant. The server credential is used only after the application screen; service-only intake facades perform the transactional write.

The canonical rates are 5 contact/service submissions/hour, 3 project/material submissions/hour and 30 uploads/hour per identity key, with an independent analytics budget. PostgreSQL records limiter state through `intake_rate_limit_hit`; failure denies intake. Visitor identity is an HMAC of the requesting address under `INTAKE_RATE_LIMIT_SECRET`; plaintext addresses do not become the database limiter key.

The address comes from forwarded headers. Staging must prove the chosen hosting proxy replaces/normalizes those headers and that outside callers cannot choose a new identity key on each request. The upload Origin comparison also trusts the effective host/forwarded-host contract. Host/firewall body limits must bound multipart parsing before the handler buffers a file; a per-file size check alone is not a perimeter request-size limit.

Turnstile verification uses a five-second server-side request and currently checks the provider's `success` field. It does **not** compare returned hostname/action values in the current source. Configure the provider's permitted hostnames, then review/test hostname/action binding before production. The old recommendation above is a target, not evidence that those comparisons exist.

`RENZ_INTAKE_ALLOW_DEV_BYPASS=true` deliberately permits the local production-build browser harness to operate without live bot credentials. A production health check reports blocked/503 if this or `RENZ_CLIENT_PREVIEW` remains enabled. This is a release gate signal; it is not an HTTP request firewall and does not by itself stop the running app. Both switches must be absent in staging/production.

### 26.7 Financial integrity and bearer document links

Invoice issuance freezes the financial document snapshot; financial state uses database precision, currency separation and transaction/locking rules. Payments and reversals are append-only. Procurement applies corresponding purchase-order/receipt invariants. See the authoritative [finance contract](./CLAUDE_C5_FINANCE_ARCHITECTURE.md) and [contractor finance contract](./CLAUDE_C6_CONTRACTOR_FINANCE.md).

`create_invoice_share_link` and `create_purchase_order_share_link` generate random tokens; tables store SHA-256 hashes rather than raw tokens. Raw values are returned once to the authorized action and remain in component memory for explicit copying/sharing. Public pages `/i/[token]` and `/po/[token]`, and their PDF routes, resolve only the corresponding document via `public_invoice_by_share_token` / `public_purchase_order_by_share_token`. Invalid, malformed, revoked and ineligible values have a uniform unavailable/404 result.

The tokens are **bearer access to confidential document content**: anyone holding a link can read that document. There is no built-in share expiry column in the current share-link tables; access ends on revocation/replacement or an ineligible document state. Do not promise automatic expiry. Keep links out of source, analytics, access-log retention and screenshots, and configure host/proxy log redaction for token paths. Shared pages/PDFs are noindex/private/no-store where the corresponding page/runtime headers apply; test the effective host response during staging. No customer account/password is required.

### 26.8 Realtime, audit and scheduled tasks

Operational changes write minimal `public.realtime_events` pointers: entity type, ID, action and metadata needed for ordering. They contain no business record body. The `realtime_events_staff_select` policy calls `private.is_active_aal2_staff()`. This current helper checks active profile and AAL2; it does not filter each pointer by domain permission or by the pending-password flag. Thus eligible staff can observe identifiers/timing in the shared stream. Each subsequent record fetch still requires the domain read permission; a pointer never grants access to the record. Treat identifier/timing visibility as an explicit residual boundary for the security reviewer.

`useAdminRealtimeInvalidation` / `useRealtimePointers` prompt a fresh authorized read rather than applying untrusted event values as record state. Losing realtime leaves the page's explicit refresh/navigation paths; browser connectivity is not an authorization guarantee.

Audit records material domain/security events through trusted database routines and redacts secrets. Audit access requires its own capability; ordinary UI workflows do not delete payments or audit history. Host, Auth and provider logs remain separate operational systems and need their own retention, access and redaction decisions.

`POST /api/tasks/notifications-sweep` is disabled with 404 until `RENZ_TASK_TOKEN` is configured and requires the exact bearer token; GET is 404. It invokes the idempotent service-role notification sweep. Scheduler credentials belong in the approved hosting secret store, never the URL, source or handoff example. The presence of the route/configuration is not proof that a hosted scheduler or its alerts are operating.

### 26.9 Browser headers and remaining hardening

`next.config.ts` supplies CSP, nosniff, DENY framing, strict-origin referrer policy and a restrictive Permissions-Policy. HSTS and upgrade-insecure-requests are conditional on a production build using HTTPS Supabase configuration; inspect actual hosting headers before enabling production.

The actual CSP currently contains **`script-src 'self' 'unsafe-inline'`** and **`style-src 'self' 'unsafe-inline'`**, plus fixed Cloudflare and configured Supabase/Turnstile origins. It has no nonce/hash-based script policy. Historical statements of “script-src self” are an incomplete shorthand. Fixed external allow-list entries do not mean analytics/bot providers are activated; settings and environment decide whether requests are sent. Nonce/hash CSP hardening and deployed-policy testing remain review items.

The canonical rich-text and section schemas reject unsupported markup and unsafe URL forms; arbitrary uploaded SVG/HTML is not rendered. Keep testing stored-XSS payloads and rendered database content rather than relying on CSP to repair invalid input.

### 26.10 Review evidence, repository boundaries and open production work

Relevant existing checks include:

| Boundary                                   | Authoritative evidence / command                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Staff, AAL, roles and grants               | `supabase/tests/database/007_s3_authorization.sql`, `019_c10_staff_access.sql`; `pnpm auth:verify`    |
| Operational/financial negative access      | `012_c4_security_negative.sql`, `013_c5_finance.sql`, `014_c6_delivery.sql`                           |
| Public/evidence/media and CMS              | `008_s4_publication_media.sql`, `010_s5c_projects_admin.sql`, `018_cr1_owner_cms.sql`                 |
| Intake/notifications/infrastructure        | `016_c8_leads.sql`, `017_c9_intelligence.sql`, `021_r1_infrastructure.sql`                            |
| Direct anonymous/AAL1/authenticated probes | `node scripts/verify-c10-security.mjs` against the prepared local stack                               |
| Headers/CSP                                | `node scripts/c10-headers.mjs`, `node scripts/c10-csp-check.mjs` against the configured test server   |
| Committable text scan                      | `node scripts/scan-secrets.mjs`; excludes binary media and ignored local artifacts                    |
| Dependency audit                           | `pnpm audit:production`                                                                               |
| Aggregate current release checks           | `pnpm c10:verify`; see [testing guide](./TESTING_AND_QA_GUIDE.md) for prerequisites and fresh results |

The text scanner does not inspect Git history, deleted blobs, image pixels, binary archives or all possible client-data formats. Before a first remote push, separately scan exactly the refs/history to publish, review staged paths, inspect sensitive-name matches and confirm ignored artifacts are not tracked. A private repository is not a safe destination for real credentials or client exports.

The 23 October candidate-file inspection reviewed 856 text-capable paths and checked credential-URL, private-key, GitHub/Supabase token and JWT shapes without printing candidate values. The one URL hit was the intentionally invalid `example.invalid` negative test; it was not a live credential. This narrow scan is supporting evidence, not the root migration's final history/staged-file clearance. Local `.env.local`, `.local/owner-totp.txt`, `.playwright/s5a-fixtures.json`, `.playwright/backup-rehearsal/data.sql`, browser output and generated graph data must remain excluded.

Production requires an approved isolated backend, operator account MFA, real owner bootstrap/recovery authority, verified hosted Auth settings, validated proxy/rate/body limits, review of the known items above, safe SMTP/password-recovery decisions, upload policy, legal/privacy/retention approval, database **and** Storage backup/restore, alert ownership, scheduler configuration, no test bypasses, cloud smoke/security tests, and explicit go-live approval. No production credentials, data, hosting deployment or cloud security verification were introduced by this documentation handoff.

### 26.11 Reporting a vulnerability

No approved public security email or responsible-disclosure contact was supplied. Do not invent one. Use the private reporting procedure in [SECURITY.md](../SECURITY.md), or an existing owner-approved private channel. Avoid including real credentials, raw tokens, MFA secrets, client attachments or unredacted personal records in a report.

### 26.12 Dependency advisory review — 23 October 2026 pre-remediation snapshot

`corepack pnpm audit --prod --json` ran against the initial handoff lockfile and exited 1: **13 advisory findings, comprising 3 critical, 4 high, 5 moderate and 1 low**. The affected installed versions were Next.js 16.3.4, its Sharp 0.35.4 image dependency and source-map-js 1.2.1 through PostCSS. The direct Sharp development pin was also 0.35.4 and application/server scripts import it, so its `devDependency` label does not establish lack of runtime relevance. Historical September “no known vulnerabilities” results remain true only for their recorded run dates.

The table records why the baseline needed a security update; it is **not a claim that every advisory is exploitable in this application**. Applicability statements below are source-review inferences, not exploit demonstrations. Final shipped versions and fresh post-remediation audit/build/test results must be checked in `package.json`, `pnpm-lock.yaml` and the current handoff verification record. Do not treat this preserved baseline as an unresolved current count after a verified fix.

| Advisory / baseline severity | Source-reviewed applicability | Smallest relevant fixed version reported by the audit |
| --- | --- | --- |
| [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), high | Directly relevant: RENZ uses App Router and many Server Actions. The vendor identifies a request-driven CPU-exhaustion condition and recommends upgrading. UI authorization is not a substitute for the framework fix. | Next.js 16.4.1 |
| [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), critical | Image Optimization is used. Vendor impact depends on SVG decoding and a glibc-based Linux runtime. Local Windows checks cannot establish safety for the intended Linux hosting environment. | Next.js 16.4.1 with Sharp at least 0.35.5 |
| [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), critical | Vendor prerequisite is a Cache Components `use cache` function returning multiple typed arrays. No `use cache` directive or Cache Components enablement was found in RENZ source; this specific path was not established. Vendor still recommends upgrading. | Next.js 16.4.1 |
| [GHSA-vcvr-r3jv-pc5j](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), critical | No `next/og` / `ImageResponse` implementation was found in application source, so attacker-controlled SVG generation through that API was not established. | Next.js 16.3.6 |
| [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), high | Same vulnerable upstream librsvg family as the image-optimizer advisory. Editorial upload signatures refuse SVG, reducing that direct ingestion path, but this does not clear framework image processing or Linux-native binaries. | Sharp 0.35.5 |
| [GHSA-68fv-2mgg-jv7q](https://github.com/7rulnik/source-map-js/issues/76), high | Untrusted indexed source-map parsing is the prerequisite. No public source-map ingestion API was found; the installed package is used through PostCSS/build processing. Patch the transitive lock entry rather than assuming it is harmless. | source-map-js 1.2.2 |
| GHSA-cjq9-62q9-8jv4, high | Image Optimization SSRF. The current image configuration defines no remote patterns and Storage-backed images use the unoptimized delivery path; exploitation was not established by this review. | Next.js 16.3.8 |
| GHSA-3w37-wq28-93x7, moderate | Draft Mode / pending `use cache` fill leakage. Neither Draft Mode nor `use cache` was found in application source. | Next.js 16.3.8 |
| GHSA-4jqv-mc3x-m676, moderate | Self-hosted SSG/ISR cache poisoning. Principal public/admin layouts use dynamic rendering; other host/framework cache paths were not exhaustively proven unreachable. | Next.js 16.3.8 |
| GHSA-mcj8-r9mp-w47p, moderate | SSG/ISR response substitution / denial of service. Same cache-topology qualification as the preceding row. | Next.js 16.3.8 |
| GHSA-h694-7cp9-m8p3, moderate | Nested `use cache` / root-param cache leakage. No application `use cache` functions were found. | Next.js 16.3.8 |
| GHSA-f87g-xv8r-7p7x, moderate | App Router dynamic metadata-image disclosure. This checkout has static application icons; no dynamic metadata image handler was found. | Next.js 16.3.8 |
| GHSA-39w2-rjm5-chcv, low | Development-server MCP endpoint disclosure. Development servers should remain local/private; this is separate from production runtime exposure. | Next.js 16.3.8 |

The recommended bounded remediation is to pin **Next.js and its matching ESLint plugin at 16.4.1**, pin the direct **Sharp at 0.35.5**, and refresh only the vulnerable transitive **source-map-js to at least 1.2.2**, then regenerate the lockfile and rerun the audit, strict static checks, component/unit suites and production build. This is the smallest same-major framework target covering all observed Next advisories; it crosses a minor version and requires compatibility verification. Do not use a blanket `audit fix --force`, broad dependency upgrades or framework replacement. The root migration process owns that remediation and its final evidence; this source review did not modify dependencies.

**Verified remediation outcome, later in the 23 October 2026 migration:** the package manifest now pins Next.js and its ESLint plugin at **16.4.1** and Sharp at **0.35.5**; `pnpm-workspace.yaml` constrains transitive **source-map-js to 1.2.2**, with the lockfile regenerated and dependencies installed. The migration's fresh `pnpm audit:production` completed successfully with **no known vulnerabilities**. This closes the dependency-audit failure for that installed lockfile and audit database; it does not close the application/operational review items in §26.3–§26.9 or promise that future advisory checks will stay clear. Preserve the original 13-finding snapshot above as dated evidence. Final command/test details belong in [the publication verification record](./GITHUB_PUBLICATION_VERIFICATION.md).

The migration also ran **Gitleaks 8.30.1** independently over the selected **8 historical commits / 8.22 MB** and a copied candidate set of **979 files / 21.53 MB**, reporting no leaks in either scan. Candidate scan copies were kept outside the source checkout. These results complement the narrower committable-text inspection above; they do not establish that ignored local credentials, real client data or every screenshot/binary has been inspected or approved for upload. Only the reviewed source/assets belong in the private repository.

### 26.13 Repository automation review — 23 October 2026

Static review of `.github/workflows/ci.yml` and `backup.yml` found read-only GitHub token permissions, pinned action revisions and checkout credentials disabled. Ordinary push/PR CI runs the Linux quality gate; the extra Windows, database, Auth, Storage and browser jobs require an explicit manual run with the integration input enabled. The backup workflow has no active schedule and also requires `RENZ_BACKUP_ENABLED=true`; publication does not activate a database dump, R2 upload, hosting deployment or production release.

The backup label crosses into the shell through an environment variable, is constrained to 1–40 letters/digits/underscore/hyphen characters, and is quoted in filenames. Provider values are passed as quoted data. Retention uses object modification dates and is documented as 30 daily-prefix / 12 monthly-prefix **objects**, not a calendar retention guarantee. This static review did not execute a cloud dump, decryption, object prune or restore. The template must stay disabled until its operational owner has rehearsed the complete recovery workflow. CI still consumes the account's Actions allowance; manual gates do not independently establish a billing limit or proof of free remaining minutes.

`node scripts/verify-handoff.mjs` performs read-only checks of the 14 required handoff documents, local Markdown targets, migration inclusion, candidate file paths and a 50 MiB size gate. `--inventory` adds the exact candidate path/byte inventory. It never reads ignored artifacts or scans credentials; a pass does not replace secret/history scanning, runtime tests or remote verification.

## 27. Dependency revalidation — 24 October 2026

Revalidation of published handoff commit `6d8705a444ad0a6e54b3f9d769e31eafd6e1e16d` prompted a new comparison of authenticated GitHub Dependabot alerts and fresh registry audits. The 23 October production-audit pass in §26.12 remains dated evidence; it is not a continuing guarantee. Before the 24 October follow-up dependency changes, `corepack pnpm audit --prod --json` exited 1 with **one high runtime Zod advisory**. `corepack pnpm audit --json` exited 1 with **26 unique advisories: 8 high, 14 moderate and 4 low**. The GitHub snapshot contained **24 alerts covering 23 unique advisories**, including duplicate Zod coverage across `package.json` and the lockfile. All 23 were also present in the fresh full audit; three further Undici advisories were present only in the newer audit response. The banner was therefore not safely dismissible as stale.

| Package / old resolved version                   | Fresh baseline findings                | Scope and targeted remediation                                                                                                                                                                                                                      |
| ------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod 4.5.4; also Zod 3.25.76 in the design linter | 1 high advisory covering both versions | Direct runtime Zod is pinned to **4.6.6**. React Hooks ESLint 7.1.1 and its Zod error adapter explicitly support Zod 4. The design linter's Zod 3 requires the separate disposition below.                                                          |
| `@vitest/mocker` 4.1.11                          | 2 moderate                             | Development/test tooling; pin **Vitest 4.1.12**, which resolves matching `@vitest/*` packages, including the corrected mocker.                                                                                                                      |
| Vite 8.2.2                                       | 1 high, 4 moderate, 1 low              | Development/test tooling through Vitest; workspace override **8.2.4** remains within its admitted Vite 8 range.                                                                                                                                     |
| brace-expansion 5.0.9                            | 2 high, 1 moderate                     | Development lint/glob tooling; workspace override **5.0.12**.                                                                                                                                                                                       |
| Undici 8.10.0                                    | 4 high, 7 moderate, 3 low              | Development jsdom/Vitest dependency; workspace override **8.12.2**. The earlier proposed 8.10.2 target would leave three newer advisories. jsdom admits `^8.9.0`; Undici 8.12.2 requires Node `>=22.19.0`, compatible with the pinned Node 24.20.0. |

[Zod's upstream fix](https://github.com/colinhacks/zod/pull/6652) makes leading collection size bounds reject oversized arrays/sets/maps before validating every element; unbounded collections still require application/body-size discipline. RENZ's runtime schema APIs remain within Zod 4, including `parse`, `safeParse` and collection bounds. Source inspection establishes relevant validation use, not a demonstrated denial-of-service exploit against a deployed RENZ service. [The Vitest advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8) concerns reachable mock-registration tooling, while [the newer Undici advisory](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) confirms 8.12.2 as the fixed 8.x target. Do not expose development/test servers to untrusted networks.

### Retained development-tool limitation

**`@google/design.md` 0.4.0 retains one high Zod advisory, GHSA-mrhx-c7xc-m3w5.** It is the latest package version observed in the 24 October npm query, declares Zod `^3.24.0`, and embeds Zod 3.25.76 directly into its distributed `dist/index.js` (the bundled source comments identify `zod/v3`). No external Zod import replaces that embedded parser. A forced Zod 4 override would cross the declared dependency major and leave the bundled implementation in place; it is not a valid remediation.

This CLI lints repository-controlled design Markdown/configuration during local development or CI. It is not imported by RENZ application source and is not an exposed website validation endpoint. Until an upstream corrected release is available and verified, process only reviewed local repository input, keep CI execution/timeouts isolated, and do not advertise it as safe for arbitrary uploaded design documents. This is an explicitly retained development-tool dependency limitation, **not** a claim of a clean full dependency audit or a general security acceptance for production. Replacing the tool or patching vendor bundles is outside this migration.

**Measured post-change outcome:** the migration's fresh `pnpm audit:production` passed with **no known production vulnerabilities**. The fresh full `pnpm audit --json` returned **one high advisory only**, GHSA-mrhx-c7xc-m3w5 on `.>@google/design.md>zod`; all other high, moderate and low findings in the baseline were cleared. The redacted full result is retained locally as `.local/migration/audit-final-20261024.json`. This is a production-audit pass and a disclosed full-audit limitation, not an all-dependencies-clean claim. Compatibility/full verification and clean-clone results are recorded separately in [the publication verification record](GITHUB_PUBLICATION_VERIFICATION.md). The original 24 October baseline outputs also remain in the ignored migration directory. No deployment or provider activation is authorized by this revalidation.
