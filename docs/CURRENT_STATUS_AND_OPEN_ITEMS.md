# Current status and open items

Source/report review: **23 October 2026**. RENZ Construction Services Ltd — **Brick by Brick.** — has a connected public website, owner CMS and private Admin Control Room. The application is substantially implemented with historical local verification. **Production readiness remains unproven:** repository publication is not hosting deployment, cloud validation or go-live approval.

This is the incoming developer's current triage view. Dated reports remain evidence for their own tree/scope. [GITHUB_PUBLICATION_VERIFICATION.md](GITHUB_PUBLICATION_VERIFICATION.md) supplies the current mission's fresh command results and remote GitHub verification; do not infer those results from historical reports.

## Implemented with historical local verification

| Area                            | Current implementation / evidence                                                                                                                                                                    | Verification limit                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Public website                  | Home, five service categories, projects/studies with gallery/lightbox, About, Insights/articles, Contact, Start-a-Project, WhatsApp messaging, structured metadata and owner-published SEO/site mode | [phase tracker](RENZ_PHASE_STATUS.md), source routes and public suites. Owner content/legal and actual hosting acceptance remain necessary. |
| Owner CMS                       | Pages/sections/custom routes, navigation/footer/globals, services/projects/insights, draft preview → publication snapshots → revision history/restore, concurrency and media library                 | [owner CMS report](RENZ_CR1_OWNER_CMS_REPORT.md), CR1 migration/tests. Historical "not started C10" lines are superseded by C10/R1 work.    |
| Project galleries               | Roles/order, captions/alt/focal points, upload/replace, context/ordinary concept labels, generated visual confirmation, public galleries and keyboard lightbox                                       | [gallery guide](RENZ_PROJECT_GALLERY_GUIDE.md), current gallery source and CMS functions. A concept is not completed RENZ work.             |
| Staff security                  | Password + TOTP/AAL2, capability checks, staff role templates, owner-controlled create/disable/reactivate/reset/rename, forced password change, last-owner protection and audit                      | C10 staff migration/pgTAP/browser/security probes. Hosted Auth/session/MFA/provider configuration is not verified.                          |
| Clients and operations          | Client CRM, operational projects/stages, public-case-study bridge, targeted realtime invalidation and permission-aware Quick Find                                                                    | C4 contracts, migration and tests. Operational projects and public case studies are separate domains.                                       |
| Finance and delivery            | Issued/draft/void invoices, line items/snapshots, currency-safe totals, append-only payments/reversals, share/revoke/PDF; partners, assignments, contractor finance, materials, POs and receiving    | C5/C6 contracts/tests; production PDF/function packaging and hosted transactional workflows remain acceptance items.                        |
| Leads, analytics, notifications | Validated contact/service/project/material intake, private uploads, rate limits/form tokens/idempotency, Lead CRM/conversion, bounded aggregates/CSV and notification preferences/event/timed sweep  | C8/C9 contracts/tests. Provider-triggered cron, real Turnstile and cloud realtime/performance still need evidence.                          |
| Engineering/recovery            | Exact dependency/runtime pins, 50 migrations, pgTAP, generated types, local browser suites, static gates, health/CSP/security scripts and documented backup/rollback/incident paths                  | C10/R1 reports and source scripts. SQL-only backup is incomplete for media recovery.                                                        |

## Later branding and visual work

The official slogan is **Brick by Brick.** D1.8 migration `20260924100000_d18_brand_and_copy.sql` updates the owner-managed page/global copy; the auth shell and fallback menu text agree. Prior R1 prose saying "From land to landmark" remains the campaign headline is historical and superseded. Owner revisions can intentionally restore older wording, so production content review must verify the **published database snapshot** as well as source fallback text.

The latest identity is the **orange curved R plus two-line Renz Construction wordmark**, selected by the user on 28 September after the silver brief. `src/lib/site/brand.ts` and shared `RenzIdentity` own its operational uses; SVG assets and icons are local. [RENZ_ORANGE_BRAND.md](RENZ_ORANGE_BRAND.md) records authority, source hash, vector derivation and historical scoped verification. Silver/earlier Figma/original monogram records are retained history, not current runtime direction. Approval covers website implementation and does not assert independent trademark/ownership clearance.

Current source also includes labeled generated imagery and poster-first motion on Insights/auth surfaces with reduced-motion/Save-Data behavior. These later media/identity changes need review on the exact handoff SHA; older D1.8 statements that no images/video were added do not describe every later file. Assets remain concept material; no source inspection establishes a real completed RENZ project portfolio.

## Implemented but requiring further validation

- **Current host limitation:** Docker's Linux daemon was unavailable during the initial 23 October migration checks. Database/Auth/E2E/full C10/R1 runs were not executed under that condition. Restore the approved local Docker engine before conducting the destructive synthetic-data regression gates.
- **Current dependency security:** the initial 23 October production audit reported 13 advisories (3 critical, 4 high, 5 moderate, 1 low). The migration's publication verification record documents any subsequently applied targeted updates and final audit outcome. A September clean audit does not supersede a current finding; unresolved production advisories must be reviewed before deployment.
- **Complete current release regression:** R1 records a full September local gate. The later D1.8 report records C8's long accessibility test hitting its 240-second budget on a constrained host; a diagnostic longer-budget pass was not the committed suite passing. The orange report proves a bounded brand/browser/static set, not fresh complete C10/R1/Auth/RLS/cloud checks. Re-run and publish exact outcomes; do not present all historic passes as one current pass.
- **Real hosting behavior:** Next 16.4.1 + the provider's actual OpenNext adapter, Node proxy, SSR/caches, signed image/video delivery, PDF font tracing, cold start and function-to-database latency. No locally measured vitals prove real hosting budgets.
- **Staff security in cloud:** real owner bootstrap, password change/MFA, user disable/reactivate/reset, session revocation, stale privilege changes, direct RPC/storage denials and two-session behavior.
- **Cloud data/media recovery:** automatic database backup execution, offline key recovery, separate object-byte backup, staging restore/checksums/sequences/media reconciliation and hosted rollback. Local restore did not empty/rebuild object storage.
- **Accessibility/device matrix:** literal 200% browser zoom, physical phones/touch/short landscape and NVDA/VoiceOver. Chromium/axe/reflow/forced-colors evidence is partial support, not full manual certification.
- **Media provenance and licensing:** retain concept/evidence labels, review each asset's rights/source/derivative register, and verify local runtime files are included. Publishing a rights-cleared concept does not make it real project evidence. Font license records are present in the current handoff tree; assess actual asset register, not the old backlog's missing-license line.
- **Retained design audit:** `premium-audit.json` records **121 violations and 17 unresolved items, totaling 138 errors**. It was not rerun during the GitHub migration and must not be described as a clean design certification. Contract/token/scoped visual checks do not supersede it; broad redesign is outside this mission.

The targeted dependency remediation pins Next.js and its matching ESLint plugin at **16.4.1**, Sharp at **0.35.5**, and `source-map-js` at **1.2.2** through the workspace override. The initial 13-advisory snapshot above remains historical evidence; check the publication verification record for the final audit and compatibility results.

The source security review is [SECURITY_MODEL.md §26](SECURITY_MODEL.md#26-current-implementation-review--23-october-2026). Its remaining limitations include `complete_password_change()` clearing the flag without independently proving an Auth password change, no application comparison of Turnstile returned hostname/action, reliance on trusted forwarded headers/perimeter body limits, access to unreviewed files that is not malware certification, document share links without automatic expiry, realtime identifier/timing visibility and CSP allowing inline scripts/styles. These need independent production-security disposition; none is silently repaired by documentation or dependency updates.

## Blocked by owner decision or approval

| Needed owner input                                                                 | Why it blocks launch                                                                                                       |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Actual domain name and control; first real owner email                             | Required for canonical/DNS/TLS/Auth redirect setup and safe owner bootstrap. Never guess these values.                     |
| Confirm public business email spelling and approved contact/content                | The client-supplied spelling has been preserved; developer must not silently correct it.                                   |
| Named operator, backup private-key custodian and incident/data-protection contacts | Required for recovery and meaningful incident/legal ownership.                                                             |
| Production region after measured staging benchmark                                 | Frankfurt is the staging choice; production is not selected by assumption.                                                 |
| Approved legal/privacy/retention/upload policy and production publication review   | Code has readiness controls, but a mechanism cannot approve RENZ's legal/business content. Keep unsupported claims absent. |
| Explicit go-live/indexing and any billable provider action                         | GitHub migration authority does not grant hosting activation, paid services or public release.                             |

## Blocked by provider setup and hosted evidence

The approved architecture is Netlify + two isolated Supabase projects + Cloudflare DNS/Turnstile/Web Analytics/Worker/R2. Account access, actual project/site identifiers, domain and hosted execution are not established by repository files. GitHub publication addresses source transfer; the remaining providers need their own owner-approved setup.

The created source repository is private [princee-pro/renz-construction-platform](https://github.com/princee-pro/renz-construction-platform). **GitHub Actions is intentionally disabled** because the authenticated billing/quota API returned 404, preventing assurance of no paid runner minutes. Workflow definitions and local gates are supplied; the owner can confirm a **$0 spending control**/included quota and explicitly enable Actions later. Remote CI success is not claimed while it is disabled. Optional integrations require manual dispatch; no cloud schedule is active.

**Current intake requirement:** `verifyTurnstile()` in `src/features/intake/intake-server.ts` refuses production-mode intake when either Turnstile key is missing. Treat the pair as required for enabled staging/production forms. Older `.env.example`/runbook language calling it optional or merely recommended is incomplete; do not enable `RENZ_INTAKE_ALLOW_DEV_BYPASS` to get a green cloud demonstration. The HMAC secret is also required, and cloud runtime test flags must remain absent.

Scheduler code and backup workflow preparation are not proof of executed jobs. The handoff's backup workflow is manual, gated by `RENZ_BACKUP_ENABLED=true`, with no active cron. Its retention is **30 `daily/` and 12 `monthly/` encrypted dump objects ordered by modification time**, not guaranteed calendar coverage. First real runs must verify endpoint auth/idempotency, correct project target, encrypted off-site artifacts/checksums and retained-key recovery. Supabase Free **does not include automatic backups/PITR**; a dated runbook line suggesting provider daily backups must not be used as the backup plan. [Current Supabase plan](https://supabase.com/pricing).

Free does not guarantee unlimited availability or zero total operating cost. Supabase's two-project allowance/pausing and Netlify's credit hard limit constrain the architecture. R2 activation involves a subscription and charges beyond its allowance; approve billing exposure before enabling it. See [DEPLOYMENT_HANDOFF.md](DEPLOYMENT_HANDOFF.md) for dated primary-source limits and the exact staging sequence.

## Confirmed current limitations and optional future work

| Item                           | Current source boundary / next action                                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automated malware scanning     | `src/features/intake/scanning.ts` returns `configured:false` and `pending_review`; manual review only. Keep production uploads disabled or images-only under approved policy; do not claim PDF malware screening.                               |
| Self-service email/reset       | Owner/operator-assisted temporary password recovery is the approved shipped path. No SMTP account or visitor registration exists in app configuration. Adding a self-service mail workflow needs separate scope and provider setup.             |
| New service intake vocabulary  | `intake-policy.ts` has a fixed validated list for the five original services plus not-sure/other. A new CMS service can appear publicly but does not automatically become a structured wizard need; a developer must extend the contract/tests. |
| Project revision restore       | `restore_content_revision` restores content fields/placement/hero and bounded chapter data, not the entire gallery relation/order history. Review Media after restore; do not promise complete media rollback.                                  |
| Hydration timing               | Shared admin action buttons are hydration-gated by R1. Some raw tab/picker controls and analytics beacons remain client-dependent; assess actual slower-device impact rather than reusing an old hard-coded raw-button count.                   |
| Retention/purge                | Expired unused intake-session cleanup exists; archived business records/audit/payment history are not general-purpose deletable data. Notification/audit retention decisions and tooling remain separate scope.                                 |
| Optional business enhancements | Supplier payment/payables ledger, stock inventory, quotation/proposal documents, broad automation and additional integrations are not established as implemented. They are not launch prerequisites unless the owner adds them.                 |
| Optimization                   | Hosted image/video caching/thumbnail fallback and Contact validation bundle need measurement; optimize only after profiling, preserving signed/private delivery and evidence labels.                                                            |

Do not reopen fixed historical backlog items: staff creation/role management shipped in C10, notification preferences shipped in C9, galleries shipped in D1.7, and per-spec release orchestration resolves the earlier aggregate-suite ordering boundary. Read the actual source and the later dated disposition before carrying an old item forward.

## Incoming developer's order of work

Additional source-confirmed CMS limits from the publication review: selecting
an article hero stores `posts.hero_asset_id`, but the current public article
and Insights renderers use fixed generated visuals rather than that value.
The inserted Insights film wording/media is hardcoded and cannot be independently
edited or hidden in the CMS. These require a separately scoped implementation
change; see [the CMS guide](WEBSITE_CMS_GUIDE.md).

The review also found white navigation on the white unpublished-page fallback.
The handoff adds an explicit fallback marker and a black header background on
that state, preserving transparency over normal dark landing media. Fresh
verification is recorded in [the publication checks](GITHUB_PUBLICATION_VERIFICATION.md).

1. Follow [HANDOFF_START_HERE.md](HANDOFF_START_HERE.md); clean clone/install and read the architecture/data/security contracts.
2. Reproduce local setup and critical tests from [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) and [TESTING_AND_QA_GUIDE.md](TESTING_AND_QA_GUIDE.md). Use a disposable database; report every failure or environment limitation.
3. Confirm assets/public content provenance and the orange identity/slogan on the exact candidate; inspect CMS publication/revision/gallery behavior.
4. Obtain the missing owner inputs and explicit staging authority, then execute [DEPLOYMENT_HANDOFF.md](DEPLOYMENT_HANDOFF.md), including cloud backup/object restore, hosted workflows and manual accessibility.
5. Prepare concrete staging evidence and an owner acceptance record before any production domain, Live mode or indexing change.

## Dated dependency revalidation — 24 October 2026

The fresh pre-remediation audit found **one high runtime Zod advisory** and **26 full-audit advisories (8 high, 14 moderate, 4 low)**; the GitHub banner's 24 alerts covered 23 unique advisories and had not yet reflected three newer Undici advisories. The 23 October clean production audit is preserved as historical evidence. Targeted follow-up pins are **Zod 4.6.6**, **Vitest 4.1.12**, and workspace overrides **Vite 8.2.4**, **brace-expansion 5.0.12** and **Undici 8.12.2**, retaining Next.js 16.4.1, Sharp 0.35.5 and source-map-js 1.2.2. The migration's actual post-change **`pnpm audit:production` passed with no known vulnerabilities**; its full **`pnpm audit --json` reported one high advisory only**, the development design-linter item below. All other baseline high/moderate/low findings were cleared. Compatibility and clean-clone verification are reported separately in [the publication verification](GITHUB_PUBLICATION_VERIFICATION.md).

One **development-only high Zod advisory** remains for `@google/design.md` 0.4.0, which declares Zod 3 and bundles Zod 3.25.76 inside its CLI. No newer package release was available in the 24 October query. Forcing its dependency to Zod 4 would not replace the embedded implementation. The tool processes reviewed repository design files, is not imported by the application, and must not be exposed as a service for arbitrary uploaded documents. Keep this upstream tooling limitation visible; see [Security Model §27](SECURITY_MODEL.md#27-dependency-revalidation--24-october-2026). No complete full-audit clearance or production approval is inferred.

## Source-sharing authorization and revalidation — 29 October 2026

The owner explicitly authorized public GitHub inspection and downloads of the
existing project. That source-sharing instruction supersedes the earlier
private-only policy; production hosting, data, credentials, indexing and go-live
remain separate and were not activated. The actual visibility and anonymous ZIP
results are recorded in [publication verification](GITHUB_PUBLICATION_VERIFICATION.md).
Client steps are in [the download guide](RENZ_CLIENT_DOWNLOAD_AND_OWNERSHIP_GUIDE.md).
No open-source licence or copyright assignment was added.

Fresh focused history/source review identified no actual credential or private
customer-data disclosure. All 183 unit/component tests and the separate production
build passed. The first combined verification run was stopped during a stalled
build and is not reported as an overall pass. Database/full integration checks
were NOT RUN because the Docker Linux daemon was unavailable. Fresh production
dependency audit found zero advisories; the full audit and GitHub Dependabot
each retained the one development-tool Zod finding. The earlier dashboard's 24
alerts are now a historical observation, not the current count.
