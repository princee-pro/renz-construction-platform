# Environment setup

Source inspection: **23 October 2026**. This guide describes the current application and operator scripts. It supplements the dated [environment inventory](RENZ_ENVIRONMENT_VARIABLES.md) and [production runbook](RENZ_PRODUCTION_DEPLOYMENT.md); where their historical wording differs, the source consumers named below determine current behavior. No cloud deployment is implied.

## Toolchain and prerequisites

Use the committed lockfile and package pins. Do not scaffold a replacement application.

| Component                 | Repository pin / requirement                                                               | Authority                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Node.js                   | **24.20.0** preferred; manifest accepts `>=24.18.0 <25`                                    | `.nvmrc`, `.node-version`, `package.json`, `netlify.toml` |
| pnpm                      | **11.25.0**                                                                                | `packageManager` and `engines.pnpm` in `package.json`     |
| Next.js / React           | **16.4.1 / 19.2.8**                                                                        | `package.json`, `pnpm-lock.yaml`                          |
| TypeScript                | **6.0.3**                                                                                  | `package.json`                                            |
| Supabase CLI / PostgreSQL | **2.116.0 / 17**                                                                           | `package.json`, `supabase/config.toml`                    |
| Playwright                | **1.63.0**, matching browser binaries                                                      | `package.json`                                            |
| Container engine          | Running Docker engine with Linux containers and enough free memory/disk for local Supabase | Local integration suites                                  |
| Git access                | Authenticated access to the private repository; use its actual clone URL                   | Repository owner                                          |

The handoff's targeted dependency remediation also pins `@next/eslint-plugin-next` **16.4.1** and Sharp **0.35.5**, with `source-map-js` **1.2.2** enforced through the `pnpm-workspace.yaml` override and lockfile. Preserve these together; historical reports describe the earlier versions. Fresh validation and final advisory results are in [GITHUB_PUBLICATION_VERIFICATION.md](GITHUB_PUBLICATION_VERIFICATION.md).

Install Node using the platform's normal version manager, then use Corepack if available. If the Node distribution does not include Corepack, install it through the organization's approved toolchain process. The package-manager pin remains mandatory.

```powershell
node --version
corepack pnpm@11.25.0 --version
corepack pnpm@11.25.0 install --frozen-lockfile
corepack pnpm@11.25.0 exec supabase --version
```

## Local services and configuration

1. Clone the private [princee-pro/renz-construction-platform](https://github.com/princee-pro/renz-construction-platform) repository with authenticated access and change into its root: `git clone https://github.com/princee-pro/renz-construction-platform.git`.
2. Install dependencies above. Start Docker and run `corepack pnpm@11.25.0 db:start`. The first start downloads container images.
3. Inspect the project configuration before changing data. `project_id` is `renz-construction-local`; local API, database and mail UI ports are **56231**, **56232** and **56234**. Auth's development Site URL is `http://127.0.0.1:3000`. Studio, edge runtime and Supabase analytics are disabled; Auth, Storage, Realtime and local SMTP are enabled.
4. On a **disposable local database only**, run `corepack pnpm@11.25.0 db:reset`. It applies the migrations and `supabase/seed.sql`. There are **50 migrations**, latest `20260924100000_d18_brand_and_copy.sql`, at this inspection. The seed contains conspicuously synthetic drafts, not production records.
5. Copy `.env.example` to `.env.local` only if the latter does not already exist. Obtain local URL, publishable key and secret key privately from the CLI. The PowerShell example below captures them without printing their values; it also gives raw Node scripts the same local process environment.

```powershell
if (-not (Test-Path -LiteralPath '.env.local')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}

$renzLocalStatus = & node node_modules/supabase/dist/supabase.js status --output env
if ($LASTEXITCODE -ne 0) { throw 'Local Supabase status failed.' }
$renzLocalValues = @{}
foreach ($renzLine in $renzLocalStatus) {
  if ($renzLine -match '^([A-Z][A-Z0-9_]*)="(.*)"$') {
    $renzLocalValues[$Matches[1]] = $Matches[2]
  }
}
$renzLocalUrl = [Uri]$renzLocalValues['API_URL']
if ($renzLocalUrl.Scheme -ne 'http' -or -not $renzLocalUrl.IsLoopback) {
  throw 'Expected a local HTTP Supabase API.'
}
$renzLocalSecret = $renzLocalValues['SECRET_KEY']
if (-not $renzLocalSecret) { $renzLocalSecret = $renzLocalValues['SERVICE_ROLE_KEY'] }
if (-not $renzLocalValues['PUBLISHABLE_KEY'] -or -not $renzLocalSecret) {
  throw 'Local Supabase keys are incomplete.'
}
# Remove inherited aliases/publication credentials in THIS shell only:
# local helpers can otherwise prefer them to the discovered local values.
foreach ($renzName in @(
  'SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY','RENZ_PUBLISH_EMAIL',
  'RENZ_PUBLISH_PASSWORD','RENZ_PUBLISH_TOTP'
)) {
  [Environment]::SetEnvironmentVariable($renzName, $null, 'Process')
}
$env:NEXT_PUBLIC_SUPABASE_URL = $renzLocalUrl.AbsoluteUri.TrimEnd('/')
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $renzLocalValues['PUBLISHABLE_KEY']
$env:SUPABASE_SECRET_KEY = $renzLocalSecret
$renzLocalText = Get-Content -LiteralPath '.env.local' -Raw
$renzLocalText = $renzLocalText -replace '(?m)^NEXT_PUBLIC_SUPABASE_URL=.*$', "NEXT_PUBLIC_SUPABASE_URL=$env:NEXT_PUBLIC_SUPABASE_URL"
$renzLocalText = $renzLocalText -replace '(?m)^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*$', "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
$renzLocalText = $renzLocalText -replace '(?m)^SUPABASE_SECRET_KEY=.*$', "SUPABASE_SECRET_KEY=$env:SUPABASE_SECRET_KEY"
Set-Content -LiteralPath '.env.local' -Value $renzLocalText -Encoding utf8
Remove-Variable renzLocalStatus,renzLocalValues,renzLocalSecret,renzLocalText
```

Never paste CLI status output or `.env.local` into a ticket, report or screenshot. Check `git check-ignore .env.local .local/owner-totp.txt` before creating accounts. The CLI's status output contains privileged local credentials.

6. Provision and inspect private buckets:

```powershell
corepack pnpm@11.25.0 storage:provision
corepack pnpm@11.25.0 storage:status
```

The provisioner creates/hardens `editorial-originals` and `editorial-derivatives` (25 MiB, admitted image/video MIME types), plus `lead-intake` (10 MiB, admitted image/PDF MIME types). All are private. The product's upload policy is narrower than the bucket allow-list: images-only is the safe intake default.

7. **Before CMS seeding**, run `corepack pnpm@11.25.0 local:owner` for a local manual owner; use the synthetic credentials printed locally by that script and obtain the current authenticator code with `corepack pnpm@11.25.0 local:owner:code`. The factor secret is stored only in ignored `.local/owner-totp.txt`. Do not copy this account or factor into staging/production. The helper recreates its named local account and uses the one-shot owner bootstrap; on a database that already has an owner assignment, inspect ownership instead of repeatedly rerunning it. In particular, CMS seeding creates another synthetic Super Admin, so creating the manual owner after that seed would fail the bootstrap's existing-owner check.
8. For the reviewed local public content and concept galleries, run `node scripts/website-seed-content.mjs`, then optionally `node scripts/website-seed-content.mjs --heroes`. These **write and publish** content through the CMS facades and upload files from the repository. Use only the local shell above. Do not promote this into an unattended production bootstrap: without `RENZ_PUBLISH_*`, the script creates a synthetic privileged actor and retains it locally. The database seed alone does not restore Storage object bytes.
9. Start `corepack pnpm@11.25.0 dev` and visit `http://127.0.0.1:3000` and `/admin/sign-in`. `RENZ_CLIENT_PREVIEW=true` is optional for an explicitly labeled local/client review. Leave it absent on all cloud candidates.

Next reads root `.env.local`; standalone Node scripts generally read the current process environment or discover local CLI values. They do not universally load `.env.local`. Existing process variables take precedence over the file, and `NEXT_PUBLIC_*` values are embedded during the build. Rebuild when changing a public value. See [Next.js environment documentation](https://nextjs.org/docs/app/guides/environment-variables).

## Application variables

`L`, `S`, `P` mean local, staging and production. A secret belongs in the hosting provider's secret environment store; a public value is browser-visible by design. Configure build and function scopes as appropriate. Never put secret keys in `next.config.ts`'s `env` object or a `NEXT_PUBLIC_*` variable.

| Exact name                             | Required / environment                                       | Public or secret               | Source and consumer; missing behavior                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Required for connected app, L/S/P                            | Public                         | Local CLI `API_URL`, or assigned project's URL. `src/lib/supabase/public-env.ts`, public/server clients and CSP. Missing: auth clients cannot construct; health blocked.                                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required for connected app, L/S/P                            | Public, RLS-limited            | CLI `PUBLISHABLE_KEY` or project API settings. Public/server Supabase clients; rebuild on change. Never substitute a privileged key.                                                                                                                         |
| `SUPABASE_SECRET_KEY`                  | Required for full app, L/S/P                                 | **Server secret**              | Local CLI secret/service-role key or assigned project's secret key. Server-only Auth Admin, media signing, intake/tasks/health; operator scripts. Missing: affected operations fail closed.                                                                  |
| `INTAKE_RATE_LIMIT_SECRET`             | Required for real intake in S/P; optional L                  | **Server secret**              | Generate privately; code minimum 16 characters, operational recommendation 32+ random characters. `intake-server.ts` HMAC identity and form/upload tokens. Development fallback is unsuitable for a live environment. Rotation invalidates in-flight tokens. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`       | Required with secret for enabled intake in S/P; optional L   | Public                         | Cloudflare Turnstile site configured for the candidate/domain. Widget and CSP. Requires a rebuild when changed.                                                                                                                                              |
| `TURNSTILE_SECRET_KEY`                 | Required with site key for enabled intake in S/P; optional L | **Server secret**              | Matching Turnstile secret; server `siteverify` call. **Current code refuses intake in production mode if either Turnstile key is absent.** Older prose calling both optional does not override this behavior.                                                |
| `RENZ_TASK_TOKEN`                      | Optional app; required for external sweep, S/P               | **Server secret**              | Generate privately, at least 32 characters; same value in app and scheduler. `POST /api/tasks/notifications-sweep`; absent/short disables task endpoint (404).                                                                                               |
| `RENZ_PUBLIC_CACHE_SECONDS`            | Optional L/S/P                                               | Nonsecret server config        | Operator-chosen positive cache window; default 60 seconds; browser harness uses 5. Public content query cache. Do not use test timing as a hosted freshness promise.                                                                                         |
| `RENZ_CLIENT_PREVIEW`                  | Optional local review only; absent S/P                       | Nonsecret server flag          | Explicit `true` enables labeled legacy preview experience. Production build with it enabled is reported blocked by health/readiness. Different from owner-published Site mode Preview.                                                                       |
| `RENZ_INTAKE_ALLOW_DEV_BYPASS`         | Browser-test only; absent S/P                                | Nonsecret **unsafe test flag** | Exact `true` relaxes production intake posture for isolated tests. Health/readiness block a production build with it enabled. Never use it to make staging forms work.                                                                                       |
| `RENZ_LATEST_MIGRATION`                | Optional build override L/S/P                                | Nonsecret metadata             | Latest 14-digit migration version. `next.config.ts` discovers it from filenames; health compares database state. Override only if packaging omits migration sources and automatic discovery cannot run.                                                      |
| `RENZ_BUILD_ID`                        | Optional build override L/S/P                                | Nonsecret metadata             | Short revision/release id; computed from provider commit or Git, else `local`. Recorded by `next.config.ts`, shown in health.                                                                                                                                |
| `RENZ_APP_VERSION`                     | Optional build override L/S/P                                | Nonsecret metadata             | Computed from `package.json` version; health display. Metadata emitted through Next config is not a secret location.                                                                                                                                         |
| `COMMIT_REF`, `VERCEL_GIT_COMMIT_SHA`  | Optional provider build metadata                             | Nonsecret metadata             | `next.config.ts` build-id inputs, with Git fallback. The latter is compatibility support, not a hosting selection.                                                                                                                                           |
| `NODE_ENV`                             | Runtime-managed L/S/P                                        | Nonsecret                      | Next uses development/production/test; affects health, intake and HTTPS headers. Do not invent an environment named `staging` here.                                                                                                                          |

There is no runtime `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, SMTP variable, analytics-secret variable or active `INTAKE_SCANNER` selector. Canonical URL, business/contact details, legal text, site mode, analytics provider/site token and document defaults are owner-managed Settings, published as snapshots. Supabase Auth SMTP is provider configuration. `scanning.ts` returns the unconfigured manual-review adapter.

## Script, test and infrastructure variables

These do not belong in the app's ordinary deployment environment unless the named consumer requires them. Privileged maintenance processes can change external data; review their target before running.

| Exact names                                                                                                                                                                                                 | Requirement / applicability                                              | Classification, origin and consumer                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`                                                                                                                | Optional local aliases                                                   | URL and publishable/anon keys are public; service-role alias is secret. `s4-local.mjs` and helper imports prefer certain inherited values over local discovery. Remove cloud overrides before local tests.                                                                                      |
| `RENZ_PUBLISH_EMAIL`, `RENZ_PUBLISH_PASSWORD`, `RENZ_PUBLISH_TOTP`                                                                                                                                          | Optional operator publication session; all three for explicit actor path | **Sensitive identity/password/current MFA code.** Publisher scripts (`content-publish-insights.mjs`, `website-seed-content.mjs`) support an operator session, including remote targets. Supply through a private process, never a committed env file; independently approve content and target. |
| `RENZ_E2E_PORT`                                                                                                                                                                                             | Optional local test server, default 3100                                 | Nonsecret; `e2e-server.mjs`. Main Playwright config still fixes its base URL to 3100; changing only this value is insufficient.                                                                                                                                                                 |
| `RENZ_E2E_PUBLISHED_PROJECT`, `RENZ_E2E_SKIP_CONTENT_SEED`                                                                                                                                                  | Optional local fixture modes                                             | Nonsecret test flags; global setup selects synthetic publication or skips CMS content seed. Do not put them on a host.                                                                                                                                                                          |
| `RENZ_FRONTEND_BASE_URL`                                                                                                                                                                                    | Optional read-only frontend harness                                      | Nonsecret local HTTP origin; `playwright.frontend.config.ts`. Must be loopback with no credentials/path/query/hash. Default 3101.                                                                                                                                                               |
| `CI`                                                                                                                                                                                                        | Runner-provided                                                          | Nonsecret; disables focused tests and selects CI reporters. No credential needed.                                                                                                                                                                                                               |
| `RENZ_DB_CONTAINER`                                                                                                                                                                                         | Optional local scale rehearsal                                           | Nonsecret; `c10-scale.mjs`, default `supabase_db_renz-construction-local`. Scale commands insert/remove large synthetic datasets.                                                                                                                                                               |
| `RENZ_BASE`, `RENZ_SHOT_BASE`, `RENZ_SHOT_EXTRA`, `RENZ_SHOT_ONLY`, `RENZ_SHOT_REDUCED`, `RENZ_SHOT_VIEWPORT_ONLY`, `RENZ_SHOT_WAIT`, `RENZ_WAIT`, `RENZ_AXE_NODES`, `RENZ_D1_CAPTURE_PASS`, `RENZ_DOC_IDS` | Optional local screenshot/audit tooling                                  | Nonsecret origins, selectors, delays, capture modes or synthetic record ids. Inspect the consuming screenshot script; several import seeded local account fixtures. Never target real client records for committed captures.                                                                    |
| `HIGGSFIELD_CLI`                                                                                                                                                                                            | Optional historical media-generation tooling                             | Nonsecret executable path override; generation scripts. Not required to run the checked-in media. No generation or paid service is needed for onboarding.                                                                                                                                       |
| `NEXT_TELEMETRY_DISABLED`, `DO_NOT_TRACK`, `COREPACK_ENABLE_STRICT`                                                                                                                                         | Build/tool controls                                                      | Nonsecret, set in `netlify.toml` or scripts. Not RENZ business settings.                                                                                                                                                                                                                        |
| `SUPABASE_ACCESS_TOKEN`                                                                                                                                                                                     | Authorized cloud CLI operations only                                     | **Secret**, from owner/operator Supabase access; CLI consumes it. Never required for purely local development.                                                                                                                                                                                  |
| `SUPABASE_DB_URL`                                                                                                                                                                                           | Backup workflow/operator only                                            | **Secret connection string**, assigned database connection settings. Never browser/app configuration; contains database credentials.                                                                                                                                                            |
| `BACKUP_AGE_PUBLIC_KEY`                                                                                                                                                                                     | Backup workflow                                                          | Public age recipient stored with workflow configuration; generated by backup custodian. Matching **private decryption key stays offline**, outside Git and GitHub secrets.                                                                                                                      |
| `R2_ACCOUNT_ID`, `R2_BUCKET`                                                                                                                                                                                | Backup workflow                                                          | Nonsecret infrastructure identifiers, from approved R2 account/bucket; repository secrets interface may store them for consistency.                                                                                                                                                             |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`                                                                                                                                                                  | Backup workflow                                                          | **Credentials**, from narrowly scoped R2 API access. Workflow maps them into `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`; `AWS_DEFAULT_REGION=auto` and `R2_ENDPOINT` are nonsecret derived settings.                                                                                           |
| `RENZ_APP_ORIGIN`                                                                                                                                                                                           | Notification Worker only                                                 | Public origin in Worker config; assigned staging/production app URL, never supplied inventively. Worker secret `RENZ_TASK_TOKEN` must match the app.                                                                                                                                            |
| `RENZ_BACKUP_ENABLED`                                                                                                                                                                                       | Repository variable, absent/false by default                             | Nonsecret opt-in for the manual backup workflow. Set exact `true` only after separate authorization, credential setup and rehearsal. No backup schedule is enabled by this handoff.                                                                                                             |

`PATH`, `npm_execpath` and `MSYS_NO_PATHCONV` are tool/runtime controls, not application settings. The production audit intentionally expects a pnpm-launched process; use `pnpm audit:production`, not a direct invocation that bypasses that check.

## Separate staging and production setup

Staging receives its own Supabase project and Netlify environment context; production gets a different project and secrets. Rebuild each environment with its own browser-safe URL/key. A deploy preview must never inherit production data access by accident.

Use [DEPLOYMENT_HANDOFF.md](DEPLOYMENT_HANDOFF.md) for the authorized future provisioning sequence. Keep owner Site mode **Preview**, keep runtime test flags absent, configure the real Turnstile pair before enabling intake, then conduct owner/staff, media, finance, restore and rollback rehearsals. Production setup requires named account/billing/recovery owners, approved domain and legal content, real owner email, verified backups and explicit go-live approval. This GitHub handoff does not authorize any deployment.

Review [SECURITY_MODEL.md §26](SECURITY_MODEL.md#26-current-implementation-review--23-october-2026) before treating a configured environment as secure. Current source limitations include the password-change completion RPC's reliance on the supported UI sequence, Turnstile hostname/action comparisons, trusted proxy/body-limit assumptions and health flags that report a blocked release without functioning as a request firewall. Provider credentials do not resolve those source-review items.

## Reset and recovery boundaries

`db:reset`, `db:verify`, `c10:verify`, `r1:verify`, `s5a:verify` and the default Playwright harness erase/reseed local state. Their runs can remove the manual owner account and invalidate its saved TOTP file. Recreate the owner only after the disposable database is reset and its owner state is understood. A running Next server may retain ids from before reset: restart it; the E2E server automatically clears its fetch cache.

The CLI distinguishes [local resets and remote migration pushes](https://github.com/supabase/cli/blob/develop/apps/cli/docs/go-cli-reference.md). Never substitute `--linked`, a remote `--db-url` or a cloud endpoint into local verification. Use append-only migrations for remote environments, never `seed.sql` or a production reset.
