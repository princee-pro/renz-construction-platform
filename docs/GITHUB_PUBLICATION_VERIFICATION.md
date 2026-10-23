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
