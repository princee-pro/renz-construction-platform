# Testing and quality assurance

Source inspection: **23 October 2026**. These commands are taken from the current `package.json`, harnesses and scripts. This guide records how to reproduce checks; it does **not** turn historical reports into fresh passing results. Record the exact release SHA, command, date, exit code, counts and limitations for each new run.

## Pick the right verification boundary

| Boundary                      | Commands                                                                 | Services / effect                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static and application checks | `pnpm verify`                                                            | Formatting, lint, strict types, unit/component, design lint/tokens, committable-file secret scan, production build and dependency audit. No intentional database reset. Builds may exercise configured public reads; use local config for local work.     |
| Full local release candidate  | `pnpm c10:verify`                                                        | Docker + healthy local Supabase + Chromium + free port 3100. **Destructive local database resets**, synthetic actors/content and server startup. Stops at first failure, records `.playwright/c10-verify.json`.                                           |
| Strongest current local gate  | `pnpm r1:verify` or `pnpm r1:local`                                      | C10 gate plus R1 network-failure tests, client bundle scan, local content/media reseed, public crawl, three-browser/performance/forced-colors smoke and log audit. Same reset warning; requires Chromium/Firefox/WebKit.                                  |
| Read-only frontend/brand      | `node scripts/verify-renz-brand.mjs`                                     | Existing healthy local stack, production build, `playwright.frontend.config.ts`, default port 3101. No actors/reset/admin sign-in. Tests current orange identity and responsive states.                                                                   |
| Hosted read-only checks       | `pnpm r1:cloud <candidate-origin>` or `pnpm r1:smoke <candidate-origin>` | Candidate already deployed by a separately authorized operator. HTTP/browser checks only. Current wrapper initializes local credentials before branching, so it also needs a healthy local Supabase stack. Does not prove hosted authenticated workflows. |

Commands below use `pnpm` for readability; the unambiguous pinned form is `corepack pnpm@11.25.0 <script>`. Run serially where they share Docker, `.next`, browser fixtures or ports. Do not run two release gates simultaneously.

## Install and inspect safely

Follow [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md), use Node 24.20.0/pnpm 11.25.0 and the lockfile, and confirm that process-level Supabase overrides point to the loopback stack. `s4-local.mjs` discovers local values but can prefer inherited cloud variables; a local status check alone does not prove every helper's target.

```powershell
corepack pnpm@11.25.0 install --frozen-lockfile
corepack pnpm@11.25.0 exec playwright install chromium firefox webkit
corepack pnpm@11.25.0 db:start
```

On Linux runners, install browser system dependencies using `pnpm exec playwright install --with-deps chromium firefox webkit`. Database tests need Docker; unit/component/static checks do not need production credentials. Do not capture `supabase status --output env` or fixture files in CI artifacts: they contain privileged keys and MFA material.

## Static, unit, component and build checks

| Exact command               | What it verifies / changes                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`         | Prettier over its configured file set. Existing `.prettierignore` excludes most historical Markdown/evidence, so this is not a claim that every document was reformatted. |
| `pnpm lint`                 | ESLint with zero warnings allowed.                                                                                                                                        |
| `pnpm typecheck`            | `next typegen` then `tsc --noEmit`, strict project types and generated route types. Requires installed dependencies.                                                      |
| `pnpm test:unit`            | Vitest `unit` project in Node: domain contracts, parsing, validators, permissions, financial and time/network/media policies.                                             |
| `pnpm test:component`       | Vitest `component` project in jsdom: rendered states, controls, identity and public UI semantics; not a real browser substitute.                                          |
| `pnpm test`                 | Both configured Vitest projects.                                                                                                                                          |
| `pnpm design:lint`          | Canonical `DESIGN.md` lint. Warnings are reported separately from errors.                                                                                                 |
| `pnpm design:tokens:check`  | Committed token export matches the contract. `design:tokens` writes the export and needs review.                                                                          |
| `pnpm scan:secrets`         | Current committable text files; no history/binary/OCR guarantee. `--all` broadens local inspection and can encounter ignored fixture secrets.                             |
| `pnpm build`                | Next production build, route generation, server bundling and type validation; runtime/provider compatibility still needs smoke testing.                                   |
| `pnpm audit:production`     | Production dependency advisory audit using the pinned pnpm launcher; network needed.                                                                                      |
| `pnpm audit:public-bundles` | Built public bundle boundaries and client payload audit. Requires a build.                                                                                                |
| `pnpm r1:bundle-scan`       | Built client/prerender files for privileged markers, localhost/test credentials and source maps. Requires a build and local script context.                               |
| `git diff --check`          | Whitespace defects in pending changes; inspect staged content separately with `git diff --cached --check`.                                                                |

The repository's secret scanner skips binary formats and Git internals. A migration/publication review must separately scan **every historical commit/ref to be pushed**, inspect env/dump/fixture filenames, check binary assets and logs, and review the exact staged list. A clean current-file scan cannot establish that history is safe.

The retained `premium-audit.json` currently records **121 violations + 17 unresolved items = 138 errors**. That report was **not rerun in this migration** and is not a clean design certification. `design:lint`, token checks and scoped browser/axe results exercise different boundaries; passing them does not erase the retained premium-audit findings. Broad design remediation is outside this repository-publication mission.

Dependency pins after the migration's bounded advisory remediation are Next.js/matching ESLint plugin **16.4.1**, Sharp **0.35.5** and `source-map-js` **1.2.2** (workspace override). Audit the resulting lockfile and run fresh compatibility checks; dependency installation alone is not proof that the regression suite passed.

## Database, Auth, RLS and storage

Use only a disposable local stack. `supabase/seed.sql` is deterministic synthetic draft content. Tests can temporarily change grants, roles and record state; run the supported gate rather than applying test SQL to a shared environment.

| Exact command                                        | Scope                                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:reset`                                      | Explicit local reset, reapplies all migrations and seed; removes local accounts/business records.                                                                                                                                                                 |
| `pnpm db:test`                                       | pgTAP contract files under `supabase/tests/database`: schema, permissions/RLS negatives, publication/evidence, media, finance/payment integrity, settings, leads, notifications, owner CMS, staff access and bounded queues.                                      |
| `pnpm db:lint`                                       | Local database lint, fails on warnings.                                                                                                                                                                                                                           |
| `pnpm db:types:check`                                | Generated TypeScript database types equal the current local schema. `db:types` writes them.                                                                                                                                                                       |
| `pnpm db:test:concurrency`                           | Concurrent lead submissions/conversion integrity and replay behavior. Creates local synthetic state.                                                                                                                                                              |
| `pnpm db:verify`                                     | Inspects Docker ownership, uses/starts only the expected healthy local stack, performs multiple resets, pgTAP, reset recovery, concurrency, lint and type drift. Stops a stack it started; preserves a pre-existing healthy stack. **Destructive to local data.** |
| `pnpm auth:verify`                                   | Local invitation, password/MFA enrollment, AAL1/AAL2/capability/session and bootstrap negatives; load local process credentials as in environment setup.                                                                                                          |
| `pnpm content:verify`, `pnpm publication:verify`     | Local content/provenance and publication-facade integrity. Synthetic mutations/cleanup.                                                                                                                                                                           |
| `pnpm storage:verify`                                | Private bucket restrictions: anonymous/unassigned writes and raw reads refused; admitted actor upload/read bytes match; bounded fixture cleanup.                                                                                                                  |
| `pnpm storage:status`, `pnpm media:reconcile`        | Bucket configuration inspection and media row/object reconciliation. Reconciliation is report-only; inspect output rather than deleting orphans automatically.                                                                                                    |
| `pnpm s4:verify`                                     | Earlier combined local schema/Auth/content/media/application gate, retained as phase regression.                                                                                                                                                                  |
| `pnpm s5c:verify`                                    | Projects/media CMS RPC and Storage workflow, publication/provenance restrictions and cleanup.                                                                                                                                                                     |
| `pnpm c4:verify`, `pnpm c4:verify:realtime`          | Client/operational-project boundaries, relationships, optimistic concurrency and two-session targeted invalidation.                                                                                                                                               |
| `pnpm c5:verify`                                     | Invoice issue/number/snapshot/payment/reversal/share integrity.                                                                                                                                                                                                   |
| `pnpm c6:verify`                                     | Contractors, assignments, procurement, purchase orders and receiving invariants.                                                                                                                                                                                  |
| `pnpm c7:verify`, `pnpm c8:verify`, `pnpm c9:verify` | Configuration/publication, lead intake/conversion/anti-abuse, and analytics/notification contracts.                                                                                                                                                               |

At source inspection there are **50 migration files** and **21 pgTAP files**; use fresh CLI output for assertion counts. Old C10/R1 reports refer to 47/49 migrations and differing assertion totals. Those are dated evidence, not the current inventory.

## Browser workflows

The default `playwright.config.ts` uses a **production build** on `http://127.0.0.1:3100`, Chromium, one worker, no retries. Its global setup **resets the database**, provisions buckets, publishes reviewed local content and creates synthetic staff/MFA fixtures. Global teardown resets again and removes `.playwright/s5a-fixtures.json`. Every subsequent manual owner login may need account recreation. Failed/crashed runs can leave private fixture files; never upload `.playwright` wholesale.

Build with the local URL/publishable key first. `c10:verify` orchestrates that automatically. For an individual test:

```powershell
corepack pnpm@11.25.0 build
corepack pnpm@11.25.0 exec playwright test tests/e2e/cr1-owner-cms.spec.ts
```

| Suite / exact script                                                                                      | Critical behavior                                                                                                       |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:e2e:admin`; `pnpm test:e2e:visual`                                                             | S5A sign-in/MFA, service administration, validation/conflicts, desktop/mobile and representative accessibility.         |
| `pnpm test:e2e:c4`                                                                                        | Client → operational project, access denial, stale save, realtime and responsive registers.                             |
| `pnpm test:e2e:c5`                                                                                        | Draft → issued invoice, PDF, sharing/revocation, partial payments/reversals, totals and permissions.                    |
| `pnpm test:e2e:c6`                                                                                        | Trade partners, assignments, procurement/PO PDF/sharing and receiving reversals.                                        |
| `pnpm test:e2e:c7`                                                                                        | Business/website/legal configuration, publication/site mode and navigation.                                             |
| `pnpm test:e2e:c8`                                                                                        | Contact/service/project/material intake, upload restrictions, Leads, conversion, concurrency/realtime, responsive/a11y. |
| `pnpm test:e2e:c9`                                                                                        | Analytics views, currency/time filters, notification delivery/preferences/sweep.                                        |
| `pnpm test:e2e:c10`                                                                                       | Owner staff lifecycle, temporary passwords/forced change, templates and last-owner protection.                          |
| `pnpm exec playwright test tests/e2e/cr1-owner-cms.spec.ts`                                               | Page builder, revision publication/restore, custom routes, media and service/project/insight owner workflows.           |
| `pnpm test:e2e:r1`                                                                                        | Offline visitor/admin writes retain safe input, show inline failure and create one record after reconnect.              |
| `pnpm test:e2e:public`, `pnpm test:e2e:s9ap`, `pnpm exec playwright test tests/e2e/s9bp-public.spec.ts`   | Public routes, concept labels, media/gallery/lightbox, navigation, preview behavior, mobile, keyboard and axe.          |
| `pnpm test:e2e:visual:public`; `pnpm test:a11y:public`                                                    | Current D1 visual captures; public accessibility subset. Inspect captures manually.                                     |
| `pnpm exec playwright test --config playwright.frontend.config.ts tests/e2e/insights-auth-visual.spec.ts` | Read-only local Insights/article/auth shell media and visual surfaces. No authenticated admin workflow.                 |

Prefer the C10 one-spec-per-process sequence for a full release. `pnpm test:e2e` and unfiltered older `s5a:verify` aggregate all tests in one process with a single setup; historical cross-suite state interactions make that a different boundary. Do not describe a selected-spec pass as an aggregate suite pass.

For read-only orange-brand checking, `node scripts/verify-renz-brand.mjs --skip-build` reuses an already matching build. Optional `$env:RENZ_FRONTEND_BASE_URL='http://127.0.0.1:<free-port>'` targets an existing local production server; the frontend config validates loopback and does not create one in that mode. Do not use an unrelated server/build or stop another user's process just to free a port.

## Release gates and evidence

```powershell
corepack pnpm@11.25.0 c10:verify
corepack pnpm@11.25.0 r1:verify
```

C10 currently defines 31 steps: static/design/secrets; reset/pgTAP/lint/types/database verification; build/audits; headers/CSP/security probe; C4–C9 RPC scripts; 14 browser specs; lead concurrency. The network probe exercises anonymous/AAL1 denial, forged document links, task auth and public/private boundaries. The runtime test flags deliberately make health return blocked on the local production test server; this expected test posture must never be copied to hosting.

`node scripts/verify-c10.mjs --list`, `--only <step>` and `--from <step>` support diagnosis/resumption, but initialize the local stack credentials first. Partial runs can inherit earlier ledger entries; inspect timestamps and commit context before claiming all 31 passed on one tree. A failed step stops the gate and must remain visible in the report.

`r1:verify` adds three offline tests, bundle scan, a local reseed (including `d1-seed-actors.mjs`, which itself invokes destructive global setup), public audit, three-browser smoke/vitals and log scan. It is a substantial release run, not a routine safe smoke command. `r1-browser-smoke.mjs` reports unavailable browser engines and continues; inspect its per-browser report before claiming Chromium, Firefox and WebKit all ran.

Historical evidence: [R1 provisioning report](RENZ_R1_PRODUCTION_PROVISIONING_REPORT.md) records a September local pass; [D1.8 report](RENZ_D18_VISUAL_COMPLETION_REPORT.md) records a C8 accessibility test exceeding its 240-second timeout on a memory-constrained machine; [orange identity report](RENZ_ORANGE_BRAND.md) records September scoped Chromium/build/static checks. None establishes a fresh full release pass for later changes. Reproduce timeout failures, distinguish assertion failures from host capacity, retain the failing exit code, and do not add sleeps/retries or silently raise budgets to conceal them.

The migration's fresh results are recorded in [GITHUB_PUBLICATION_VERIFICATION.md](GITHUB_PUBLICATION_VERIFICATION.md). At its initial 23 October checks, Docker's Linux engine was unavailable, so database/Auth/reset/E2E gates could not run; current static test passes must not be labeled a complete C10/R1 pass.

The supplied CI workflow defines a Linux quality gate for push/PR and optional Windows/database/Auth/Storage/browser jobs through manual `workflow_dispatch` with `integration=true`. **GitHub Actions is disabled on the new private repository.** The authenticated billing/quota API returned 404, preventing assurance that workflow execution would incur no paid minutes. The owner can verify a **$0 spending control** and included-minute availability, then enable Actions explicitly; until then use the documented local checks and do not expect a remote CI result. Backup execution is additionally opt-in through `RENZ_BACKUP_ENABLED=true`, with no active cron or cloud schedule.

## Performance, accessibility and recovery

`pnpm c10:scale` inserts a large synthetic load; inspect `scripts/c10-scale.mjs` before using its `up`/`down` modes, and only on a disposable local database. `pnpm c10:perf`, `pnpm s9ap:measure <local-url>` and `pnpm r1:browser-smoke <origin>` record performance/surface observations. They are not sustained hosted load tests or a Lighthouse certificate. Real hosting/CDN/region measurements remain required.

Manual acceptance must cover keyboard-only operation, focus return, touch/short landscape, 320px reflow, literal 200% browser zoom, forced colors, reduced motion, Save-Data/slow network, NVDA/VoiceOver, long names and currency/date/timezone rendering. Automated axe and emulated reflow support this work; physical mobile and manual screen-reader acceptance were not proven by historical reports.

Backup rehearsal uses `pnpm backup:dump <ignored-relative-path.sql>`, `pnpm backup:counts`, then **destructive** `pnpm backup:restore <ignored-relative-path.sql>` against the local database. Follow [RENZ_BACKUP_RESTORE.md](RENZ_BACKUP_RESTORE.md), match the schema commit, compare counts/sequences, test restored owner MFA and reconcile object bytes separately. SQL dumps contain Auth/PII and Storage metadata; they do not include the media bytes. Cloud database/object restore and Netlify rollback require a dedicated authorized staging rehearsal.

## Hosted acceptance before go-live

The read-only cloud wrapper needs a local stack today. Without one, an operator can run its individual HTTP checks directly against an approved candidate:

```powershell
node scripts/wait-for-server.mjs https://<candidate>/api/health 5
node scripts/c10-headers.mjs https://<candidate>
node scripts/r1-public-audit.mjs https://<candidate>
node scripts/r1-browser-smoke.mjs https://<candidate>
```

The angle-bracket origin is a placeholder, not a command to run unchanged. Candidate public crawling verifies robots/sitemap/noindex, links/statuses, media, prohibited test text, WhatsApp links and unknown-route 404s. `--expect-live` on `r1-public-audit.mjs` is only for an owner-approved Live release. These scripts do not create production test users or conduct real account/finance writes.

In staging, authorized staff must separately rehearse: owner password/MFA → create/disable/reactivate staff → enquiry → Lead → Client → Operational Project → invoice issue/PDF/share/revoke → payment/reversal → procurement/receiving; two-session conflict/realtime; CMS edit/preview/publish/unpublish/revision restore; gallery upload/reorder/alt/rights/public delivery; scheduler repeat/idempotency; backup/object restore and app rollback. Clean the synthetic records through permitted product actions and record the exact results. Never run the default local E2E harness against production.

Include the source-review items from [SECURITY_MODEL.md §26](SECURITY_MODEL.md#26-current-implementation-review--23-october-2026): direct invocation of `complete_password_change()` cannot independently prove an Auth password update; Turnstile success is not currently bound by app-side hostname/action comparisons; forwarded-address/host trust and perimeter body limits need provider validation; pending attachment availability is not malware clearance; share links have no automatic expiry; realtime pointers disclose identifiers/timing to eligible staff; CSP permits inline scripts/styles. Existing negative probes do not establish that these residual boundaries have been fixed.
