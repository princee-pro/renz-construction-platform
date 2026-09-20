# RENZ Phase 1 / S3 Report

## 1. S3 status

**PASS for the explicitly authorized local-only S3 boundary.** The repository now contains invitation-only staff Auth, mandatory TOTP MFA, SSR cookie sessions, fresh database-backed RBAC, least-privilege grants/RLS, a one-shot operator bootstrap path, protected admin routes, and redacted audit support. Clean database resets, 251 pgTAP assertions, local Auth integration, browser acceptance, S1/S2 regressions, production build, and production dependency audit pass. The local machine remains on Node `24.18.1` while the repository and CI target `24.20.0`; this is recorded as an exact-runtime verification nuance, not hidden or worked around.

S3 does not create a hosted Supabase project, customer accounts, public intake, content workflows, uploads, analytics, deployment resources, or the final RENZ visual experience.

## 2. New product requirements captured

The dated product direction is recorded in [`CLIENT_PRODUCT_EXPANSION_2026-09-05.md`](./CLIENT_PRODUCT_EXPANSION_2026-09-05.md), with separate sections for locked requirements, the current S3 implementation, and future work. It records guest public access without customer accounts, staff-only authentication, future admin domains, verified contact/service/material requests, commercial operations, privacy-aware analytics, and a premium motion/media direction without presenting any of those future capabilities as implemented.

`IMPLEMENTATION_ROADMAP.md` now contains a dated future-extension section covering S7 guest requests, S8 commercial operations and quotations/invoices, S9 approved premium media/motion, and S10 analytics/consent/hardening. No S4+ feature was implemented.

## 3. Auth/toolchain decisions

| Technology | Exact version | Support/status | Primary evidence | Reason selected | Rejected alternative |
| --- | --- | --- | --- | --- | --- |
| Node.js | `24.20.0` target | Node 24 LTS | [Node previous releases](https://nodejs.org/en/about/previous-releases), [v24.20.0 release](https://nodejs.org/en/blog/release/v24.20.0) | Patched production-LTS line; CI target | Node 26 Current; no system-wide runtime mutation |
| pnpm | `11.25.0` | Mature supported v11 | [pnpm documentation](https://pnpm.io/), [v11.25.0 release](https://github.com/pnpm/pnpm/releases/tag/v11.25.0) | Exact, reproducible package manager already used by S1/S2 | Newly released major merely for novelty |
| Next.js | `16.3.3` | Stable patched 16.3 line | [Next.js support policy](https://nextjs.org/support-policy), [Next.js blog](https://nextjs.org/blog) | App Router, current Proxy convention, stable security baseline | Canary/RC/experimental releases |
| React | `19.2.8` | Stable 19.2 | [React versions](https://react.dev/versions) | Compatible exact renderer line | Prerelease or mismatched renderer |
| React DOM | `19.2.8` | Matching stable renderer | [React releases](https://github.com/facebook/react/releases/tag/v19.2.8) | Exact React match | Mismatched DOM patch |
| TypeScript | `6.0.3` | Stable compatibility line | [TypeScript blog](https://devblogs.microsoft.com/typescript/) | Normal Next/typed-lint path without experimental compiler infrastructure | TypeScript 7 transitional API path |
| Tailwind CSS | `4.3.3` | Stable 4.3 | [Tailwind CSS blog](https://tailwindcss.com/blog) | Current PostCSS integration | Legacy v3 configuration |
| ESLint | `10.9.1` | Current flat-config engine | [ESLint version support](https://eslint.org/version-support/) | Typed flat rules and Next rules | Obsolete eslintrc/config chains |
| Prettier | `3.9.6` | Stable | [Prettier installation](https://prettier.io/docs/install) | Deterministic repository formatting | Floating formatter commands |
| Vitest | `4.1.11` | Stable 4.1 | [Vitest blog](https://vitest.dev/blog) | Existing unit/component foundation | Second test runner or vanity tests |
| `@supabase/supabase-js` | `2.115.0` | Current stable client | [Supabase JavaScript reference](https://supabase.com/docs/reference/javascript/introduction) | Auth/MFA and narrow server operations | Legacy-only client architecture |
| `@supabase/ssr` | `0.12.6` | Supabase-recommended SSR package | [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) | Cookie-based browser/server session handling | Obsolete middleware-only examples |
| `server-only` | `0.0.1` | Stable boundary marker | [npm package metadata](https://www.npmjs.com/package/server-only) | Prevents accidental server-module client imports | Convention-only protection |
| Supabase CLI | `2.116.0` | Exact project dev tool | [Supabase CLI documentation](https://supabase.com/docs/guides/cli) | Local Auth/Postgres reset, tests, lint, and type generation | Cloud link/push/pull workflows |
| Playwright | `1.62.1` planned | Stable, deliberately deferred | [Playwright release notes](https://playwright.dev/docs/release-notes) | Later browser/visual acceptance loop | Browser binaries and runtime dependency in S3 |
| `@google/design.md` | `0.4.0` | Exact design-contract linter | [design.md repository](https://github.com/google-labs-code/design.md) | Reproducible `pnpm design:lint` | Floating `npx` invocation |

The package manager is pinned in `package.json`; direct dependency ranges are all exact and the only package-manager lockfile is `pnpm-lock.yaml`.

**TypeScript 6 vs 7 decision.** TypeScript `6.0.3` remains the S3 choice. TypeScript 7 is documented as a stable language line, but its legacy programmatic compiler API transition is still not the normal, boring integration path for this Next.js/typed-ESLint stack. The selected `typescript-eslint` release and Next.js production path are compatible with TypeScript 6 without an experimental backend, compiler alias, or build suppression. Strict checking is enabled with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `useUnknownInCatchVariables`, and `noPropertyAccessFromIndexSignature`.

## 4. Environment/key architecture

The committed `.env.example` contains names/comments only:

- `NEXT_PUBLIC_SUPABASE_URL` — browser-safe project URL;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — browser-safe publishable key;
- `SUPABASE_SECRET_KEY` — server-only Auth Admin key.

The browser client and SSR caller-scoped client use only the public URL and publishable key. The secret key is read only in `src/lib/supabase/admin.ts`, which is protected by `server-only` and exposes the single `inviteAdminUser` operation. No `NEXT_PUBLIC_` secret, `.env.local`, provider credential, or secret value is committed. Legacy `ANON_KEY` is used only as a private local-test input because the local CLI status command supplies it; it is not the application environment contract.

## 5. Public authentication posture

Public visitors remain guest-accessible at `/` and receive no customer Auth account. Local Supabase configuration disables both global signup and email signup, disables anonymous sign-ins, and enables only the Auth/API/Mailpit services required for local verification. The public signup attempt in `auth:verify` is rejected. No customer login, registration, password management, ordering, or intake route was added.

## 6. Admin route architecture

The dedicated staff routes are:

- `/admin/sign-in` — email/password first factor;
- `/admin/mfa` — verified-factor challenge for an AAL1 session;
- `/admin/mfa/enroll` — first-factor enrollment for a user without a verified TOTP factor;
- `/admin` — minimal authenticated identity/access shell;
- `/admin/security` — current MFA/capability status.

All admin routes are dynamic and `noindex,nofollow`. `/admin` and `/admin/security` require a fresh AAL2 session and exact database permission. The public route has no staff navigation link. Loading, route error, and not-found states are real route-owned components; the only broad-looking client boundary is the required Next error boundary, not a global provider.

## 7. SSR/session architecture

`src/proxy.ts` uses the current Next.js `proxy.ts` convention and `@supabase/ssr` to refresh cookies optimistically for `/admin/:path*`. `createServerSupabaseClient()` is a server-only, request-cookie-bound caller client. Every protected page/action then calls `auth.getUser()`, reads current MFA assurance/factors, reads the safe profile state, and asks the database permission facade. Proxy refresh is not treated as authorization.

Sign-out clears the SSR session and records a redacted event when an AAL2 actor is present. No localStorage session is used as authority, no JWT role claim is trusted by itself, and no generic privileged database client is exported.

## 8. MFA architecture

Supabase TOTP is the only S3 factor. Password authentication establishes AAL1. A user with no verified factor is sent to enrollment; a user with a verified factor but AAL1 is sent to challenge; only AAL2 plus an active profile reaches normal admin content. Enrollment provides the Auth-generated QR code and a manual setup secret only until verification, accepts a six-digit paste/password-manager code, clears the enrollment state on success, and offers retry and sign-out escape. The challenge form has a labelled one-time-code field, generic retry errors, safe return-path handling, and sign-out.

The database `private.has_aal2()` and `private.has_permission()` helpers enforce assurance independently of UI routing. Password recovery, factor removal, break-glass ownership, and production SMTP remain documented operational work; S3 invents no recovery code or MFA bypass.

## 9. Role vocabulary

Only two system roles are seeded:

- `super_admin` — all eight approved S3 capabilities and protected last-active safeguards;
- `admin` — normal identity/security operations, without `roles.manage`.

No editor, sales, project-manager, operations, accountant, customer, content, lead, order, invoice, media, or analytics role is seeded.

## 10. Permission vocabulary

| Permission | `super_admin` | `admin` | S3 operation |
| --- | ---: | ---: | --- |
| `users.read` | yes | yes | Read safe profile state |
| `users.invite` | yes | yes | Invite an administrator through the narrow server adapter |
| `users.disable` | yes | yes | Disable a profile through the guarded RPC |
| `roles.read` | yes | yes | Read the approved role/capability registry |
| `roles.manage` | yes | no | Assign/remove approved roles |
| `audit.read` | yes | yes | Read redacted audit rows |
| `audit.write` | yes | yes | Write through the redacted helper |
| `security.manage` | yes | yes | Read the current staff security state |

Future `orders.*`, `invoices.*`, `analytics.*`, `content.*`, `leads.*`, and `media.*` capabilities are absent.

## 11. RBAC database architecture

The forward migration `20260905140000_establish_s3_auth_rbac.sql` backfills existing null profile states to `pending_mfa`, constrains the lifecycle to `pending_mfa | active | disabled`, seeds the two roles/eight permissions/fifteen mappings, creates the Auth-user profile trigger, and adds explicit grants/RLS. `private.has_permission(requested_permission text)` accepts only a permission key, derives the actor from `auth.uid()`, requires AAL2 and an active profile, and checks indexed role mappings. It has no arbitrary-user argument, dynamic SQL, or JWT-only role decision.

Public functions are narrow facades for current permission, current access, activation, invited-admin assignment, disablement, role assignment/removal, and redacted audit writing. Direct authenticated table mutation is not granted. Future product tables retain default deny.

## 12. SECURITY DEFINER review

Every admitted `SECURITY DEFINER` function has `set search_path = ''`, schema-qualified data references, explicit argument shapes, and reviewed callable roles:

| Function | Why elevated / callable role |
| --- | --- |
| `private.has_aal2()` | Reads current JWT assurance for protected RLS helpers; no browser execute grant |
| `private.has_permission(text)` | Evaluates protected role/profile tables from RLS; only the minimum `authenticated` execute grant required by RLS, plus no schema usage |
| `private.is_current_super_admin()` | Checks current role for guarded role mutations; reachable only through reviewed server/database functions |
| `private.prevent_last_super_admin()` | Trigger owner authority for role-delete invariant; not directly callable by browser roles |
| `private.prevent_last_active_super_admin_disable()` | Trigger owner authority for disable invariant; not directly callable by browser roles |
| `private.prevent_last_active_super_admin_delete()` | Trigger owner authority for profile-delete invariant, including Auth cascades; not directly callable by browser roles |
| `private.handle_auth_user_created()` | Auth trigger creates the minimum pending profile; not directly callable by browser roles |
| `private.record_audit_event(...)` | Redacted append-only writer used by reviewed facades/triggers; not directly callable by browser roles |
| `private.bootstrap_super_admin(uuid)` | One-shot operator transaction with advisory lock; invoked only through the local CLI database connection, never exposed through PostgREST |
| Public current-actor facades | Keep RLS-protected evaluation and mutations narrow; authenticated execution is explicitly granted per function, anon is denied |

The bootstrap operation checks for any existing Super Admin assignment, requires a pending-MFA target, serializes attempts with a transaction advisory lock, writes only a bounded actor-null audit marker, and refuses subsequent assignments. No generic SQL execution function exists.

## 13. Grant matrix

| Principal | Tables | Functions | Result |
| --- | --- | --- | --- |
| `anon` | No table privileges | No S3 facade execution | Denied |
| `authenticated` | `SELECT` only on `profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `audit_logs` | Seven current-actor facades plus redacted audit writer; one private `has_permission` execute grant solely for RLS evaluation | RLS and AAL2/permission checks still required |
| `service_role` | No new broad grants | No private bootstrap grant; secret adapter uses Auth Admin authority only | No generic application bypass |
| Operator local database connection | Existing local operator access | Can invoke private bootstrap transaction | One-shot bootstrap only, no app route |

No `ALL TABLES`, `ALL FUNCTIONS`, or `ALL SEQUENCES` grant is introduced. Future-domain tables and sequences remain default deny.

## 14. RLS policy matrix

| Table | Operation/policy | Predicate |
| --- | --- | --- |
| `profiles` | `SELECT` | Self row or `users.read` |
| `roles` | `SELECT` | `roles.read` |
| `permissions` | `SELECT` | `roles.read` |
| `role_permissions` | `SELECT` | `roles.read` |
| `user_roles` | `SELECT` | Self rows or `users.read` |
| `audit_logs` | `SELECT` | `audit.read` |

There are no direct authenticated INSERT/UPDATE/DELETE policies for these tables; writes occur through reviewed server/database operations. All other S2 tables retain RLS with no S3 allow policy. pgTAP verifies policy count, grants, anonymous denial, future-domain default deny, and last-admin behavior.

## 15. Invitation lifecycle

`inviteAdminAction` authenticates the current caller, requires fresh AAL2 and `users.invite`, validates an email shape, invokes only `inviteAdminUser()` from the server-only Auth Admin adapter, then calls the caller-scoped `assign_invited_admin` facade. That database operation rechecks `users.invite`, assigns only the approved `admin` role to a pending profile, and records the redacted audit event. Auth-user creation creates a `pending_mfa` profile. The invited user cannot enter `/admin` until TOTP enrollment/verification activates the profile. There is no hardcoded administrator email, development backdoor, master password, or public signup.

## 16. Initial Super Admin bootstrap

The operator command is `pnpm auth:bootstrap -- --email operator@example.test` after loading the local public URL and server secret privately. The email is supplied at execution time, validated, masked in the success message, never stored in source, and never printed with credentials. The command invites exactly one pending-MFA user, then invokes `private.bootstrap_super_admin` over the local database connection. The transaction refuses any existing Super Admin assignment and uses an advisory lock to serialize concurrent attempts. The invited operator must complete TOTP before becoming active. The script compensates by deleting the just-created invitation if the database assignment is rejected.

## 17. Last Super Admin protection

The database protects the invariant at three paths: role deletion, profile status transition away from `active`, and profile deletion (including Auth cascades). Only an active profile with a `super_admin` assignment counts; pending-MFA bootstrap assignments can be safely removed before activation. A transaction trigger raises `23514` when the last active Super Admin would be removed or disabled. pgTAP covers two-active-admin removal, last-role removal, last disablement, last-profile deletion, and pending-assignment removal.

## 18. Disabled/stale session behavior

Protected pages and actions fetch the current Auth user and profile on every request. `private.has_permission()` checks the current profile status and role mapping again inside the database, so a disabled account or removed role fails closed without waiting for JWT expiry. AAL1 cannot pass the helper; AAL2 without an active profile cannot pass it. No UI role string is authoritative. Profile and role mutations advance the existing `version` field.

## 19. Audit events and redaction

The append-only audit table stores actor, action, entity type/id, outcome, request ID, timestamp, and object-shaped metadata only. The trusted writer rejects top-level `password`, `code`, `totp_secret`, `secret`, `token`, `access_token`, `refresh_token`, `authorization`, and `raw_payload` keys. Authenticated direct mutation of audit rows is denied.

S3 records successful MFA enrollment/verification, invitation, role assignment/removal, disablement, AAL2 sign-out, and operator bootstrap. Failed credential outcomes remain generic and rely on Supabase Auth logging where available; S3 does not copy passwords, codes, tokens, raw recovery links, or full user payloads into application audit metadata.

## 20. CSRF/origin/redirect protections

State-changing application operations use Next Server Actions, whose current framework origin validation and SSR SameSite cookie behavior remain in force; no custom cookie-authenticated mutation route was added. During browser verification, a deliberately mismatched forwarded origin was rejected by Next with `Invalid Server Actions request`, confirming the framework boundary rather than weakening it. Additional provider-specific origin/rate-limit policy remains a production hardening decision.

`safeInternalRedirect()` accepts only a leading single-slash internal path and rejects empty, protocol-relative, absolute, malformed, encoded-external, and `javascript:` destinations. Unit tests cover the rejection set, and every `next` query/form value is normalized before redirect.

## 21. Application tests

| Suite | Result |
| --- | --- |
| Vitest unit | 3 files, 19 tests passed |
| Vitest component | 2 files, 5 tests passed |
| Local Auth integration (`auth:verify`) | Invitation, caller-scoped invited-admin assignment, password sign-in, public-signup denial, TOTP enrollment/challenge, activation, fresh permission, anonymous denial, audit write/redaction, invalid code, sign-out denial — PASS |
| Bootstrap lifecycle | Synthetic one-shot bootstrap, pending assignment cleanup, second-assignment refusal — PASS |
| Browser | Password → enrollment → AAL2 challenge → admin/security → sign-out/unauthorized denial; invalid credential and wrong-code errors — PASS |

Tests use only reserved `.example.test` identities and are cleaned after execution; the final local Auth state has zero synthetic users, user-role rows, and audit rows.

## 22. pgTAP/database tests

`corepack pnpm@11.25.0 db:verify` passes two consecutive clean resets, the full seven-file pgTAP suite, the two-session lead-integrity race, warning-failing database lint, and generated type drift.

| Evidence | Result |
| --- | --- |
| pgTAP files | 7 |
| pgTAP assertions | **251 passed, 0 failed** |
| S3 authorization assertions | Role/permission seeds, grants, policies, helper callable roles, bootstrap, audit, disabled state, future-table deny, and Super Admin invariants — PASS |
| Lead concurrency | Existing S2 two-session race — PASS |

## 23. Database reset/lint/type evidence

The twelve forward migrations apply in filename order from an empty local PostgreSQL `17.6` database on both resets. `supabase db lint --local --fail-on warning` reports zero warnings and zero errors. `db:types:check` confirms the generated `src/lib/database/database.types.ts` matches the live public schema. No `supabase link`, `db push`, `db pull`, cloud project, or remote database was used.

## 24. Browser/accessibility evidence

The local browser run covered the staff sign-in page at 320, 360, 390, 430, 768, 1024, and 1280 CSS-pixel viewport checks; every run had a semantic main, one H1, no horizontal overflow, and `noindex,nofollow`. A temporary same-origin proxy was used only to let the browser harness reach the local Auth port; it was not repository code and was stopped afterward.

The flow was manually exercised for labelled email/password fields, password-manager autocomplete, keyboard-visible focus (including the skip link), generic invalid-credential messaging, no-factor enrollment, verified-factor challenge, wrong-code rejection, successful AAL2 admin/security rendering, sign-out, unauthenticated `/admin` denial, and a real not-found recovery link. MFA enrollment exposes a manual setup fallback and sign-out escape. This is evidence for the S3 shell, not a WCAG certification or final public visual QA claim.

## 25. Secret/client-bundle review

Production output and source were searched for `SUPABASE_SECRET_KEY`, the secret accessor, the privileged adapter, synthetic credentials, TOTP material, and local key values. No secret value, server-only environment name, privileged adapter string, test credential, or TOTP secret appears in client chunks. The only `sb_secret_` match is a benign Supabase client prefix-recognition string, not a credential. The secret scanner inspected 123 text-capable repository files and passed. Only `.env.example` is present in the repository.

## 26. S1/S2 regression verification

The final application gate passes formatting, ESLint with zero warnings, strict type generation/checking, unit/component tests, design lint, secret scan, production build, and high-severity production audit. S2 `db:verify` passes the two-reset/251-assertion/concurrency/lint/type-drift gate. No S1 shell contract, S2 migration history, generated types, client originals, or concept classification was removed.

## 27. Senior security review findings

The separate review found and corrected the following security/invariant issues before closeout:

1. A pending bootstrap Super Admin assignment was initially treated as an active last-admin removal; the role-delete trigger now counts only active profiles, allowing safe pre-activation cleanup.
2. Auth cascade ordering could bypass the role-delete trigger when deleting an active profile; an explicit `BEFORE DELETE` profile trigger now closes that path.
3. The profile-delete trigger helper now has an explicit revoke for `public`, `anon`, and `authenticated`, making its non-callable posture auditable even though the repository-wide default privileges already deny execution.
4. The privileged server adapter was narrowed to Auth Admin invitation only; approved-role assignment and its audit now run through the caller-scoped `assign_invited_admin` facade, which rechecks `users.invite` inside PostgreSQL.
5. Profile activation is idempotent for an already-active AAL2 actor, so a lost response cannot strand a user between MFA activation and audit completion.

The review also confirmed that the private helper’s single authenticated execute grant exists only because RLS policies invoke it, that public facades are narrow, that future product tables remain default-deny, that no customer authentication or S4+ workflow was introduced, and that no warnings or type/build errors are suppressed.

## 28. Files created/changed

### Application/auth

- `src/proxy.ts`
- `src/lib/supabase/public-env.ts`, `server-env.ts`, `browser.ts`, `server.ts`, `admin.ts`
- `src/lib/auth/guards.ts`, `redirects.ts`
- `src/app/admin/**` sign-in, MFA, security, loading, error, and actions
- `src/components/admin/**` sign-in, MFA, invitation, and disablement forms
- `src/styles/globals.css`

### Database/configuration

- `supabase/config.toml`
- `supabase/migrations/20260905140000_establish_s3_auth_rbac.sql`
- `supabase/tests/database/003_relationships.sql`, `006_security_seeds_audit.sql`, `007_s3_authorization.sql`
- generated `src/lib/database/database.types.ts`
- `.env.example`, `.gitignore`, `package.json`, `pnpm-lock.yaml`

### Scripts/testing/CI

- `scripts/verify-auth-local.mjs`
- `scripts/bootstrap-super-admin.mjs`
- `tests/unit/redirects.test.ts`, `tests/component/admin-states.test.tsx`, `vitest.config.ts`
- `.github/workflows/ci.yml` Auth/MFA integration job

### Documentation

- `docs/CLIENT_PRODUCT_EXPANSION_2026-09-05.md`
- `docs/PHASE_1_S3_IDENTITY_ARCHITECTURE.md`
- `docs/PHASE_1_S3_RBAC_MATRIX.md`
- `docs/PHASE_1_S3_AUTH_THREAT_MODEL.md`
- `docs/PHASE_1_S3_RECOVERY_RUNBOOK.md`
- this report, plus dated updates to `README.md`, `docs/PHASE_1_DECISION_REGISTER.md`, `docs/IMPLEMENTATION_ROADMAP.md`, and `docs/SECURITY_MODEL.md`

No cloud resource, deployment configuration, browser binary, or temporary proxy was added to the repository.

## 29. G0-G6 after S3

| Gate | Status | Evidence/effect |
| --- | --- | --- |
| G0 — authorization and Phase 0 disposition | **PASS** | Project lead explicitly authorized S3 after accepting S2 PASS; work stayed local-only and within the attachment boundary. |
| G1 — source recovery and brand disposition | **PARTIAL** | S3 promoted no identity asset; production brand and AI-reference disposition remain gated. |
| G2 — verified business/service/proof facts | **BLOCKED** | No real business, service, project, team, contact, credential, testimonial, or statistic claims were added. |
| G3 — admin authority and operating model | **PARTIAL** | The authorized `super_admin`/`admin` security spine exists; named operators, broader workflow ownership, and recovery ownership remain open. |
| G4 — privacy/security/intake/file policy | **PARTIAL** | S3 establishes Auth/MFA/RBAC/audit controls; intake, uploads, analytics, consent, retention, SMTP, and provider policy remain absent. |
| G5 — platform ownership/region/recovery | **SAFE-DEFERRED** | No hosted Supabase/Vercel project, production key, region, DNS, backup promise, or deployment was created. |
| G6 — repository/toolchain governance | **PARTIAL** | Exact dependencies, lockfile, local/CI toolchain, 251 database assertions, Auth verification, browser evidence, and regressions pass; local Node is `24.18.1` versus the pinned/CI target `24.20.0`. |

## 30. Remaining real blockers

- Production execution still needs an approved Supabase environment, region, operator ownership, secret-management process, SMTP/recovery owner, session/revocation policy, and rate/abuse controls.
- The local developer runtime should be upgraded to Node `24.20.0` (the exact CI target) before claiming exact local-release parity; no system-wide runtime was changed by S3.
- MFA recovery/factor removal and any break-glass procedure require an explicitly named operational owner and audited production policy.

These are genuine environment/operational boundaries, not reasons to add speculative code. No S4+ product feature is treated as an S3 defect merely because it was intentionally deferred.

## 31. Manual user actions required

For local first-operator setup, load the local Supabase URL and secret key privately and run `pnpm auth:bootstrap -- --email <approved-operator-email>` once, then complete the invitation and TOTP enrollment. Do not paste credentials into source, logs, screenshots, or documentation.

Before production Auth, the responsible owners must select the hosted environment/region, name the recovery and incident owners, configure approved SMTP and secret rotation, and approve session/rate-limit/privacy policy. No secret value is requested in this report.

## 32. S4 readiness

**BLOCKED pending G1/G2/G4 evidence decisions.** The S3 identity/authorization substrate is ready to support a later content kernel, but S4 must not begin until the client brand/source disposition, verified business/content/proof facts, media rights/file policy, and editorial authority are explicitly approved.

## 33. Recommended S4 scope

The next approved slice should be limited to the content/evidence/media foundation: evidence and rights metadata, draft/publication states, verified claim handling, private originals and approved derivatives, immutable media paths, constrained public projections, and migration/RLS/tests for those operations. It should not implement the final homepage, intake, orders, invoices, analytics, premium motion, deployment, or unapproved RENZ claims.
