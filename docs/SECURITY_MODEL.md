# RENZ Security Model

Status: Phase 0 recommendation with dated S3 implementation addendum
Prepared: 27 August 2026
Scope: Public website, Start a Project and contact intake, administration application, Supabase Auth/Data API/Storage, and supporting deployment operations.

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
