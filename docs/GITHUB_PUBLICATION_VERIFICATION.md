# RENZ GitHub publication verification — 23 October 2026

This is a dated repository-migration record. It distinguishes fresh checks from
the earlier C10/R1 reports and does not approve deployment or indexing.
The final chat report records the final pushed SHA after remote verification.

## Starting repository and authorized scope

- Verified root: existing `C-website` workspace, not a recreated application.
- Starting HEAD: `c8ec38475856962188bda747ec7dff6711a69607`, branch `main`.
- Eight reachable commits, one local branch, no tags and no initial remotes.
- Existing configured Git author retained; no identity was invented or changed.
- Legitimate uncommitted orange-identity, Insights/auth-media, navigation and
  accompanying evidence/tests were reviewed for inclusion. No user work was
  discarded. Originals remain byte-preserved.
- Authenticated GitHub connector and existing Git credential both identify
  `princee-pro`. The connector lacks repository creation, so the authenticated
  Git credential was used in memory with the official GitHub REST API. No
  token was printed, saved in source, or embedded in a remote URL.
- Destination: [princee-pro/renz-construction-platform](https://github.com/princee-pro/renz-construction-platform),
  created **private**, with no automatic README/licence/template initialization.

## Repository contents and exclusions

Source, the frozen pnpm lockfile, configuration templates, scripts, tests,
50 migrations (latest `20260924100000`), 21 pgTAP files, domain/design contracts,
historical reports and the complete new developer handoff are included.
The [asset register](ASSET_AND_LICENSE_REGISTER.md) records 115 important asset
files, 30,165,427 bytes, hashes, purposes, runtime status and rights limitations.
Largest candidate file is approximately 1.97 MB; Git LFS is unnecessary.
Static media references were checked for missing local files. Supabase object
bytes are a separate restore responsibility; a Git clone is not a business-data
or Storage backup.

Preserved locally and excluded: `.env.local`, `.local/` including TOTP and
operator snapshots, `.playwright/` including fixtures/screenshots/PDFs and a
recovery SQL dump, `graphify-out/`, `node_modules/`, `.next/`, Supabase runtime
state, browser output, coverage, archives and logs. No ignored file was forced
into Git. The `.playwright` corpus alone exceeds 1 GB and is not handoff media.

The preexisting `premium-audit.json` was retained, with its machine-specific
`projectRoot` normalized to `.`. It records 121 violations and 17 unresolved
items; this migration did not rerun that tool or certify a clean visual audit.
Full OFL notices were restored from the official Google Fonts repository.
No general open-source licence was added.

## Security review

1. Existing `pnpm scan:secrets` passed on the initial 856 text-capable candidates.
2. Independent Gitleaks 8.30.1 binary was downloaded through the official release
   asset API and verified against its release SHA-256 checksum. Archive checksum:
   `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e`.
3. `gitleaks git --log-opts='--all --full-history' --redact=100` inspected all
   eight existing commits, approximately 8.22 MB, and reported no leaks.
4. `gitleaks dir <candidate-copy> --redact=100` scanned the explicit tracked plus
   nonignored file snapshot, approximately 21.53 MB, and reported no leaks.
   The snapshot contained 979 candidates at that point; later documentation
   and lockfile additions require the final staged/history recheck below.
5. Candidate paths/sizes, unsafe environment/artifact names, asset provenance,
   exact staged paths and whitespace are checked again before each commit.
   No actual credential requiring rotation was identified. Synthetic local
   account examples remain restricted to isolated test helpers.

The initial current production audit found 13 advisories: 3 critical, 4 high,
5 moderate and 1 low. Targeted remediation upgraded Next.js and its ESLint
plugin to 16.4.1, Sharp to 0.35.5, and pinned source-map-js 1.2.2 through a
workspace override. No broad framework rewrite or business/schema change was
made. The subsequent `pnpm audit:production` passed with no known advisories.
See [Security Model §26](SECURITY_MODEL.md)
for separate source limitations requiring review before release; a clean
dependency/secret scan is not a full independent security certification.

## Repository hygiene and CI decisions

- ESLint now excludes ignored local credentials/scratch, browser reports and
  generated graph directories. The first lint attempt found browser globals
  in a local scratch helper; no production defect was inferred from that.
- The existing Linux quality gate remains the normal push/PR workflow.
  Windows, database, Auth, Storage and browser jobs are retained as explicit
  manual `workflow_dispatch` integrations to bound routine usage.
- Workflow permissions are `contents: read`; checkout credentials are not
  persisted. No deploy job or hosting token is configured.
- Backup cron was removed. The template is manual and additionally gated by
  repository variable `RENZ_BACKUP_ENABLED=true`, which is not enabled here.
  It uses the locked CLI, validates labels passed through environment data,
  and sorts retention by object modification time. Its retention is an object
  count, not guaranteed days/months. Cloud execution remains unverified.
- **GitHub Actions is disabled on this new repository.** Authenticated quota/
  billing endpoints returned 404, so remaining included minutes and a zero-dollar
  spending cap could not be established. The owner must verify spending controls
  and included usage before enabling Actions. No paid feature was purchased.
- Dependabot vulnerability alerts were enabled and verified through the API.
  Branch-protection availability is checked after the first push; do not assume
  private Free-account protections are available.

## Fresh local checks and environmental limits

| Check                                               | Observed result                                                                                                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node/pnpm                                           | 24.20.0 / 11.25.0                                                                                                                                                             |
| `pnpm install --frozen-lockfile` before remediation | Passed                                                                                                                                                                        |
| Initial `pnpm test`                                 | 27 files, 183 tests passed                                                                                                                                                    |
| Initial `pnpm typecheck`                            | Passed                                                                                                                                                                        |
| Initial `pnpm format:check`                         | Passed                                                                                                                                                                        |
| Initial production build                            | Passed on original Next.js 16.3.4; not used as patched-version proof                                                                                                          |
| `pnpm audit:production` after remediation           | Passed, no known vulnerabilities                                                                                                                                              |
| `pnpm design:lint`                                  | Exit 0, zero errors, six existing orphan-token warnings                                                                                                                       |
| `pnpm design:tokens:check`                          | Passed                                                                                                                                                                        |
| New guide formatting                                | Explicit Prettier checks passed; ordinary repository ignore deliberately excludes historical docs                                                                             |
| Patched-version combined `pnpm verify`              | PASS, exit 0 on Next.js 16.4.1: formatting, lint, strict types, 159 unit + 24 component tests, design/token checks, secrets, production build and production dependency audit |
| Database/Auth/RLS/full C10/R1 and cloud restore     | Not run: Docker Linux daemon unavailable; no healthy isolated stack                                                                                                           |
| Cloud deployment/smoke                              | Not run; no hosting deployment or cloud provisioning in this mission                                                                                                          |

An early attempted local `next start` after replacing framework dependencies
correctly failed against old build output (`preview-props.json` missing). Rebuild
before serving the patched framework. No deployment occurred.

The rebuilt Next.js 16.4.1 server ran locally on port 3112. The full read-only
brand suite was attempted with `RENZ_FRONTEND_BASE_URL=http://127.0.0.1:3112`:
two homepage tests failed at 320/390px and the remaining 12 stopped at the
configured maximum. The server reported `Published expertise could not be
loaded` because the configured local Supabase service was unavailable; the
page showed its route error boundary, so no header locator existed. This is
recorded as failed infrastructure-dependent browser verification, not a pass.
The independent sign-in/media selection then passed **2/2 Chromium tests**:

```powershell
$env:RENZ_FRONTEND_BASE_URL='http://127.0.0.1:3112'
pnpm exec playwright test --config playwright.frontend.config.ts tests/e2e/renz-brand.spec.ts tests/e2e/insights-auth-visual.spec.ts --grep 'approved full-color and reverse symbols|auth visual motion uses' --workers=1
```

The exact full release workflows remain in
[TESTING_AND_QA_GUIDE.md](TESTING_AND_QA_GUIDE.md). Never treat the absence of a
Docker daemon as a passed database check, or historical browser reports as
current end-to-end verification.

## Remote and clean-clone verification

Repository creation, owner, private visibility and default `main` were already
verified via authenticated API. Code push, SHA/tree inventory, fresh private
clone/install/static checks and protection results are recorded in the dated
completion entry below after they actually run. Git uses repository-local
HTTP/1.1/OpenSSL settings on this Windows host because the default TLS transport
reset the connection; certificate verification remains enabled.

## Developer access and release boundary

Owner: GitHub Settings → Collaborators → Add people → verify the incoming
developer's username → invite. Personal-repository collaborators receive write
access; finer read/triage roles require an appropriate organization arrangement.
No unknown person was invited and ownership was not transferred.

Start at [HANDOFF_START_HERE.md](HANDOFF_START_HERE.md). Reproduce local tests,
review the security/visual/CMS limitations, obtain missing owner decisions and
staging authority, then follow [DEPLOYMENT_HANDOFF.md](DEPLOYMENT_HANDOFF.md).
**No hosting deployment, paid service, production database mutation, public
release or indexing activation was performed.**

## Publication revalidation — 24 October 2026

The repository was independently inspected through the authenticated GitHub
connector and REST API after the initial push. Owner `princee-pro`, **private**
visibility and default branch `main` were confirmed. The complete recursive
remote tree contained **981 files**; every blob matched the local committed
tree, including **50 migrations, 50 files under tests/ and 144 documentation
files**. No prohibited environment/local-artifact path appeared. The README's
GitHub-rendered HTML returned HTTP 200 and included the company title, slogan,
handoff link and three tables. Repository secrets and variables both numbered
zero; no production account material was added.

Authenticated GitHub cloning succeeded after intermittent TLS resets. The
successful command used `--no-checkout` in the ignored migration directory;
the resulting independent Git repository was moved to
`C:/Users/princ/AppData/Local/Temp/renz-clean-clone-20261023`, then checked out
normally. Its origin is the private GitHub URL, not a local filesystem source.
It contained the preserved history and no `.env.local` or local owner secret.
`pnpm install --frozen-lockfile` succeeded there. A separate earlier local Git
clone caught a one-line README table-formatting drift; commit
`6d8705a444ad0a6e54b3f9d769e31eafd6e1e16d` corrects it and was pushed and
fast-forwarded into the GitHub clone. Final updated-clone checks follow below.

### Fresh dependency graph and verification

The resumed run checked GitHub's new alerts instead of treating the previous
day's clean production audit as current. GitHub reported 24 alerts covering
23 unique advisory IDs. The fresh full registry audit reported **26 advisories:
8 high, 14 moderate and 4 low**, including three newer Undici findings; the
production-only graph contained one high runtime Zod finding.

The following compatible targeted changes were applied and locked:

| Dependency                                 | Final pin / override |
| ------------------------------------------ | -------------------- |
| Application Zod                            | 4.6.6                |
| Vitest and matching internal test packages | 4.1.12               |
| Vite                                       | 8.2.4                |
| brace-expansion                            | 5.0.12               |
| Undici                                     | 8.12.2               |

These supplement the previous Next.js 16.4.1, Sharp 0.35.5 and source-map-js
1.2.2 fixes. Strict peers, exact direct pins and the reviewed lockfile remain
enabled; no application architecture or database behavior was rewritten.

Measured post-change results on 24 October:

- `pnpm verify`: **PASS, exit 0**, including format, ESLint, strict route/types,
  **159 unit and 24 component tests**, design lint/token consistency, candidate
  secret scan, Next.js 16.4.1 production build and production dependency audit.
- `pnpm audit:production`: **PASS, no known vulnerabilities**.
- `pnpm audit --json`: **exit 1**, with exactly **one high development-only
  advisory**, `.>@google/design.md>zod`; zero critical, moderate or low findings.
- `pnpm c10:verify` was attempted against this host but stopped at initial
  Supabase-health discovery. No database or browser phase ran and no reset was
  performed. Docker-dependent and cloud workflow verification remain open.

The remaining [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
is retained in `@google/design.md` 0.4.0, the latest observed upstream tool.
The CLI embeds Zod 3 in its bundle; forcing an external Zod 4 override would
not replace that implementation. The tool processes reviewed repository design
input rather than public requests. This is a documented development-tool limit,
not a claim of a clean full audit. See [Security Model §27](SECURITY_MODEL.md)
and [current open items](CURRENT_STATUS_AND_OPEN_ITEMS.md). No alert was
dismissed merely to obtain a green status.

### Repository controls

Vulnerability alerts are enabled. Main-branch protection requires one PR review
and resolved conversations, blocks force pushes and branch deletion, and retains
the owner's normal administrator exception. Publication commits use that
authorized owner exception; this is not a review of those commits by another
person. Automatic branch deletion is disabled to preserve branches.

Required CI status checks are not imposed while Actions is disabled. The owner
must first establish included usage and a zero-dollar spending control, enable
Actions, run the quality workflow, then require its real check name. The API
confirmed **zero workflow runs, zero repository secrets and zero variables**.
The manual backup opt-in is unset; no cloud backup, scheduler or deployment was
activated.

### Fresh-checkout command ordering correction

The authenticated clone's first `pnpm verify` attempt failed with 303 typed
ESLint errors. Neither ignored `next-env.d.ts` nor `.next/types` existed; the
old verification command ran typed ESLint before `next typegen`, leaving
`PageProps` and other route types unresolved. This was a reproducibility defect
hidden by the original workspace's generated files, not a reason to weaken
the lint rules or commit generated declarations.

The `lint` command now generates Next.js types before ESLint. The combined
`verify` command does the same before its lint/typecheck steps, and C10's
individually selectable lint step also generates the declarations first. The
existing CI calls these package scripts and inherits the correction. The
installed Next.js 16.4.1 CLI guide and current Context7 documentation confirm
that `next typegen` creates both route helpers and `next-env.d.ts` without a
build. The final clone run below starts with those generated files absent.

### Final clean-clone evidence — 24 October 2026

The final checkout was cloned from the authenticated private GitHub repository
into `C:\Users\princ\AppData\Local\Temp\renz-clean-clone-20261024-final` at
`48f3e1ad4db72ca1bb61d8321bcad94a5994e3a8`. It began without `node_modules`,
`next-env.d.ts`, `.next/types` or `.env.local`. Inherited Supabase, publisher and
test-secret environment variables were cleared from the verification process.
The dependency installation used the committed lockfile and pnpm's normal
package store; it did not copy the original workspace's installed dependencies.

| Check in the GitHub clone                   | Observed result                                                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`            | PASS, exit 0                                                                                                                                                                      |
| `pnpm lint` as the first type-aware command | PASS, exit 0; Next.js generated the missing declarations before typed ESLint                                                                                                      |
| `pnpm verify`                               | PASS, exit 0; 159 unit tests and 24 component tests, formatting, lint, strict types, design/token checks, candidate secret scan, production build and production dependency audit |
| `pnpm audit:public-bundles`                 | PASS; five CMS chunks were referenced by no public route                                                                                                                          |
| `node scripts/verify-handoff.mjs`           | PASS; 14 required documents, 154 local documentation links, 50 migrations and 981 Git candidate files                                                                             |
| Asset register manifest                     | PASS; all 115 recorded file sizes and SHA-256 hashes matched                                                                                                                      |
| Git tracked working tree                    | Clean after verification                                                                                                                                                          |

The publication-record and final onboarding-correction commits following this
tested commit change documentation only. The onboarding correction distinguishes
reset-only cleanup from R1's retained synthetic owner assignments; see
[the handoff](HANDOFF_START_HERE.md). Application source, dependencies, schema and verification commands remain
the versions tested above. The final publication SHA is available in Git history
and the accompanying migration report.

### Browser result and its configuration boundary

The existing RENZ brand suite ran against a temporary loopback preview of the
clean clone with one Chromium worker: **13 passed, 1 failed in 34.3 seconds**.
Passing checks covered public branding, navigation, footer, intro controls,
favicons, widths from 320 to 1440 pixels, reduced motion, forced colors and
200%-equivalent reflow. Its scoped automated accessibility checks found no
serious or critical violations. Visual inspection of the 320-pixel screenshot
confirmed the orange mark and readable Menu control on the unpublished-page
fallback. This is evidence for that configuration, not approval of all populated
website pages or a complete WCAG audit.

The Admin sign-in branding test failed because the credential-free preview
returned an internal server error: `src/proxy.ts` requires the public Supabase
URL/key through `getPublicSupabaseEnvironment()`. The expected sign-in brand
element therefore never rendered. No authentication pass is claimed from this
run. The separately recorded two focused sign-in/media checks on 23 October
used the original configured workspace and remain a distinct dated observation.
The temporary preview was stopped; port 3113 had zero listening connections
afterward.

### Remote verification and remaining release gates

Authenticated API checks confirmed the private owner/repository, default branch,
pushed commit, rendered README, source, documentation, migrations, tests and
assets. The remote recursive tree matched every local Git blob. Pinned workflow
action revisions were checked against their official upstream repositories.
Actions remained disabled with zero hosted workflow runs, so local success is
not represented as a hosted CI pass.

The latest observed GitHub Dependabot dashboard still showed **24 open alerts**
(8 high, 12 medium and 4 low), while the fresh post-update registry audit showed
the single development-only finding described above and no production findings.
The remote package manifest independently contained the patched versions. These
are separate observations; the incoming developer must reconcile the GitHub
dependency graph/dashboard after its update. No alerts were manually dismissed
and no claim is made that the GitHub dashboard is clear.

Docker's Linux daemon remained unavailable on 24 October. The database, full C10,
Auth/MFA, RLS/permissions, finance, concurrency, realtime, populated CMS and cloud
restore workflows were therefore not freshly verified. Their executable tests,
historical evidence and reproduction prerequisites remain in the handoff.
Provider accounts/configuration, real-owner bootstrap, email/reset decisions,
Turnstile, asset rights/approval, production security findings, backup/restore,
domain/DNS and staged acceptance still require the documented release gates.

Private GitHub publication and the reproducible developer handoff are complete.
No hosting deployment, production activation, cloud provisioning, collaborator
invitation or paid service was performed in this mission.

## Public source-sharing preflight — 29 October 2026

The owner explicitly authorized making this exact repository public so the client
can inspect and download the complete project without a GitHub account. This
supersedes the private-only source-sharing instructions in the dated records
above. It does not authorize hosting deployment, production data/configuration,
ownership transfer, an open-source licence or a fabricated copyright assignment.

### Repository and disclosure review

The authenticated account was `princee-pro`, with administration permission on
repository `princee-pro/renz-construction-platform` (GitHub ID `1431432278`).
At preflight, local and remote `main` both pointed to
`6f8bfdd3cec27c71d913b0fe9fa7d53cf30cdda7`: 15 commits, 981 tracked files,
no local changes before this task, and no tags/releases. An authenticated recursive
tree comparison found zero local/remote blob differences.

Gitleaks 8.30.1 scanned all 15 commits through all reachable local refs and
reported no leaks. The repository secret scanner also passed. An independent
focused review classified 1,153 reachable text blobs, commit messages, contact
references and synthetic account fixtures. No actual private customer record,
production credential, session, committed TOTP factor, private dump or backup
was identified. The client-source service screenshot contains service phrases
and message times, without a visible sender name or phone number.

Fixed fixture passwords are clearly synthetic test inputs; their runtime factors,
privileged keys and sessions are generated into ignored local files. These values
are not certified unusable on every hypothetical external system: no live-account
credential test was performed. Scripts can prefer inherited environment values,
and not every helper has a strict loopback guard. Follow the environment guide's
cloud-variable clearing and disposable-local-only instructions.

Git author metadata, developer profile paths, architecture and documented source
limitations are intentionally part of the authorized project history. No history
rewrite, force push, secret rotation or customer-data removal was required by
the focused findings. A clean scan is evidence from these checks, not a claim of
production security certification.

### Fresh technical checks

| Command / check                                              | 29 October result                                                                                                                              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`, through its pre-build stages                  | Formatting, route generation, ESLint, strict TypeScript, 159 unit tests, 24 component tests, design/token checks and source secret scan passed |
| Initial combined verification build                          | Stopped after prolonged no-progress in the earlier sandbox session; the combined command is not claimed as a completed pass                    |
| `pnpm build`, separate retry                                 | PASS, exit 0; compiled in 16.7 seconds, TypeScript completed, all routes built                                                                 |
| `pnpm audit --prod --json`                                   | PASS, exit 0; zero known production advisories                                                                                                 |
| `pnpm audit --json`                                          | Exit 1; one high development-only Zod advisory in `@google/design.md`, as documented in Security Model §27                                     |
| `pnpm audit:public-bundles`                                  | PASS; five CMS chunks referenced by no public route                                                                                            |
| Database/Auth/MFA/RLS/full C10/R1/browser/cloud verification | NOT RUN in this task; Docker Linux daemon unavailable, no database reset or provider mutation attempted                                        |

The design linter retained six existing orphan-token warnings and zero errors.
No dependency, application source, migration, test or deployment architecture
was changed for this public-sharing task. Earlier clean-clone/browser results
remain their separately dated evidence.

### GitHub settings before visibility change

Authenticated checks confirmed: Actions disabled with zero runs/logs, zero
repository secrets/variables, owner-only collaborator access, no rulesets, no
tags/releases and no issues. Branch protection requires one review and resolved
conversations, denies force pushes/deletion and retains the owner administrator
exception. Required CI checks remain unset while Actions is disabled.

Dependabot alerts are enabled and now show **one high Zod alert only**, matching
the retained development-tool issue. The previous 24-alert observation is
historical; it has been reconciled with the updated GitHub dependency graph.
The private-repository secret-scanning and private-reporting endpoints returned
404, so neither feature was represented as active on that basis. Public settings
and anonymous page/archive checks are recorded after the visibility operation.

The client instructions are in
[RENZ_CLIENT_DOWNLOAD_AND_OWNERSHIP_GUIDE.md](RENZ_CLIENT_DOWNLOAD_AND_OWNERSHIP_GUIDE.md).
Third-party dependency/font notices and the generated-media assessment are in
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Public source sharing is not
an assignment of RENZ or third-party rights.

### Public visibility and anonymous archive verification — PASS

The authenticated GitHub API accepted the explicitly authorized change from
`private` to **`public`** for repository ID `1431432278`, owner `princee-pro`,
default branch `main`. No other setting was included in that mutation.
The published handover commit was
`04c78c2ad6e351aa147bbb773cfec6608802a940`; all previous commits were preserved.
The final staged scan found no leaks, and the all-history scan covered 16 commits
with no leaks. The source secret scan passed across 877 text-capable files.

Independent requests with **no Authorization header, no Cookie header and no
cookie jar** returned HTTP 200 for the public repository API, GitHub repository
page, raw README and the source ZIP. The README's source-download instructions
were present. GitHub's separate authenticated connector also reported public
visibility after the operation.

The actual **Code → Download ZIP** archive URL was downloaded and inspected:

- [Public repository](https://github.com/princee-pro/renz-construction-platform).
- [Download main as ZIP](https://github.com/princee-pro/renz-construction-platform/archive/refs/heads/main.zip).
- Archive at the handover commit above: **31,632,731 bytes**, SHA-256
  `1e891569ede1a2f0698ea10e2985de360cf0a8187dfef84a7eb60b9f4ddca93b`.
- **983 files**, every file's Git blob hash matched the intended committed tree;
  zero missing/extra/mismatching files, valid member CRCs, no forbidden local,
  credential or generated-output paths.
- Included **50 migrations, 50 test-directory files and 92 public files**, plus
  the complete source, lockfile, technical handoff, client guide and notices.

The URL follows `main`; a later documentation commit changes its archive bytes
and checksum. The values above identify the inspected handover commit, rather
than promising a permanent checksum for the moving branch URL. The final
publication response records the latest pushed commit.

No third-party stock image/film requiring omission was identified; all existing
asset bytes and concept labels were preserved. No open-source licence, copyright
assignment, repository transfer, collaborator invitation, tag/release, paid
service or hosting deployment was created by this visibility change. Website
go-live and the existing production-readiness items remain separate.
