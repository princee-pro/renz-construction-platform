# RENZ Phase 1 / S2 Toolchain Record

**Decision and verification date:** 1–2 September 2026

**Host inspected:** Windows

**Scope:** local data-platform tooling, local PostgreSQL configuration, migration/test/type-generation commands, and supply-chain posture only

**Verification status:** **PASS for the authorized local S2 boundary** — the exact package, lockfile, source-controlled configuration, healthy Docker engine, PostgreSQL 17 runtime, repeatable migrations/seeds, database tests/lint/types, lifecycle ownership, and isolated Linux CI definition were verified

This is a dated toolchain record, not an S2 closeout report. It does not resolve G5 cloud ownership, region, data-location, backup, restore, release, or incident decisions. It creates no hosted Supabase project and authorizes no authentication, Storage, Realtime, API exposure, deployment, or remote database operation.

## 1. Selected local platform

| Area              | Exact selection                                            | Evidence and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase CLI      | `2.116.0`                                                  | [GitHub v2.116.0](https://github.com/supabase/cli/releases/tag/v2.116.0) was the release marked **Latest** on 1 September 2026. The [official npm registry document](https://registry.npmjs.org/supabase) reported `latest: 2.116.0`. It is exact-pinned as a project dev dependency.                                                                                                                                                                                                                      |
| PostgreSQL        | major `17`                                                 | The version-tagged [CLI 2.116.0 init template](https://raw.githubusercontent.com/supabase/cli/v2.116.0/apps/cli-go/pkg/config/templates/config.toml) sets `db.major_version = 17`; the same tag's [configuration validator](https://raw.githubusercontent.com/supabase/cli/v2.116.0/apps/cli-go/pkg/config/config.go) accepts configured majors 13, 14, 15, and 17, explicitly rejects 12, and rejects other values including 16. RENZ's database and technical architecture already select PostgreSQL 17. |
| Node.js           | project target `24.20.0`; inspected host `24.18.1`         | The [Supabase installation guide](https://supabase.com/docs/guides/local-development/cli/getting-started) requires Node.js 20 or later for npm/package-runner use. Both the repository engine range and inspected host meet that floor. The S1 exact-target gap remains historical context; it is not silently rewritten here.                                                                                                                                                                             |
| pnpm              | project runner `11.25.0`; inspected global shell `11.19.0` | Commands use `corepack pnpm@11.25.0` so the global installation is neither relied on nor mutated. `saveExact`, strict peer checks, strict dependency-build review, and stale-install refusal remain enabled in `pnpm-workspace.yaml`.                                                                                                                                                                                                                                                                      |
| Container runtime | Docker client/server `29.6.2`                              | The selected `desktop-linux` engine was healthy on the 2 September completion run. The earlier unavailable-engine result is retained as dated history in section 9.                                                                                                                                                                                                                                                                                                                                        |

## 2. Stable-release decision and rejected prereleases

The official release and registry snapshot on 1 September 2026 was:

- npm `latest`: `2.116.0`, published 26 August 2026;
- [GitHub v2.116.0](https://github.com/supabase/cli/releases/tag/v2.116.0): stable and marked **Latest**;
- [GitHub v2.117.0-beta.15](https://github.com/supabase/cli/releases/tag/v2.117.0-beta.15): **Pre-release**, published 1 September 2026;
- [GitHub v3.0.0-beta.1](https://github.com/supabase/cli/releases/tag/v3.0.0-beta.1): **Pre-release**, published 1 September 2026 and assigned the npm `beta` tag later that day.

Therefore:

- `supabase@2.116.0` is selected exactly;
- both `2.117.0-beta.15` and `3.0.0-beta.1` are rejected;
- `supabase@beta` is rejected because it is a moving prerelease channel and, on the verification date, no longer meant the expected 2.117 beta line;
- floating `latest`, an unpinned global CLI, and a CI setup action configured with a floating CLI version are rejected.

Future upgrades require a new dated review of stable status, Node support, package metadata, platform binaries, lifecycle scripts, lockfile changes, Docker-image changes, migrations, reset behavior, pgTAP, lint, generated types, and cleanup behavior. This dated conclusion must not be rewritten merely because registry tags later move.

## 3. Supported project-local installation

Supabase's [official installation guide](https://supabase.com/docs/guides/local-development/cli/getting-started) supports a project dev dependency through pnpm, instructs teams to pin its version in `package.json`, and runs it through the package runner. RENZ's reproducible installation command is:

```powershell
corepack pnpm@11.25.0 add --save-dev --save-exact supabase@2.116.0
```

The repository now records `supabase: 2.116.0` in `devDependencies` and locks the selected graph in `pnpm-lock.yaml`. All operational commands use this form:

```powershell
corepack pnpm@11.25.0 supabase <command>
```

No global npm installation is required or selected. Optional dependencies must remain enabled because the npm wrapper selects its native CLI binary from exact platform packages.

## 4. Package lifecycle and supply-chain review

The installed manifest, [tagged upstream manifest](https://github.com/supabase/cli/blob/v2.116.0/apps/cli/package.json), [version metadata](https://registry.npmjs.org/supabase/2.116.0), and pnpm lock entry were reviewed.

| Property                        | Exact result                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Package                         | `supabase@2.116.0`                                                                                                 |
| License                         | MIT                                                                                                                |
| Executable                      | `supabase` mapped to `dist/supabase.js`                                                                            |
| Declared runtime dependencies   | `eciesjs ^0.5.0`; `jose ^6.2.9`                                                                                    |
| Locked runtime resolutions      | `eciesjs 0.5.0`; `jose 6.2.10`                                                                                     |
| Platform delivery               | Eight exact optional packages at `2.116.0`: macOS arm64/x64, Linux arm64/x64 glibc and musl, and Windows arm64/x64 |
| Selected host package inspected | `@supabase/cli-windows-x64@2.116.0`, MIT, `os: win32`, `cpu: x64`, with no scripts or engine declaration           |
| Wrapper engine metadata         | No `engines` field; the official guide's Node 20+ requirement is therefore the authoritative runtime floor         |
| Lock integrity                  | `sha512-cMUHkpjBacq4oLGWnMM2HC2drmUlAlfN/PQb31RARoIdYJ8sqA0xONvqBR6yd5v7w8dXuCPwvfd4N1NTHjBKEw==`                  |
| Automatic lifecycle hooks       | None of `preinstall`, `install`, `postinstall`, `prepare`, `prepack`, or `prepublishOnly` is declared              |
| pnpm pending builds             | Installed modules record an empty `pendingBuilds` list                                                             |

The wrapper does contain ordinary maintainer `build`, `test`, and development scripts. Those names are not automatic dependency-install lifecycle hooks, so no dependency-build exception is required under the repository's `strictDepBuilds` policy. A future version must be reviewed again rather than inheriting this result.

CI and local installs must not use `--no-optional` or an equivalent setting: doing so would omit the target native binary. Registry metadata also exposes signatures and provenance attestation for the published package; these complement, but do not replace, exact pins, lockfile review, and normal dependency/security checks.

## 5. PostgreSQL 17 decision

PostgreSQL 17 is selected for three independent reasons:

1. `docs/DATABASE_ARCHITECTURE.md` specifies hosted Supabase PostgreSQL with exact PostgreSQL 17 patch verification when environments are eventually created.
2. `docs/TECHNICAL_ARCHITECTURE.md` selects managed PostgreSQL 17, subject to verification at project creation.
3. The exact [Supabase CLI 2.116.0 config template](https://raw.githubusercontent.com/supabase/cli/v2.116.0/apps/cli-go/pkg/config/templates/config.toml) scaffolds `major_version = 17`.

The current general [CLI configuration page](https://supabase.com/docs/guides/local-development/cli/config) displays `15` as the default, which conflicts with the exact `v2.116.0` init template's `17`. For this version-pinned local environment, the version-tagged source controls. The [v2.116.0 validator](https://raw.githubusercontent.com/supabase/cli/v2.116.0/apps/cli-go/pkg/config/config.go) shows the exact supported configured majors and confirms that 17 is valid while 16 is not.

The 2 September local runtime reported PostgreSQL `17.6`, so the S2 major-version decision is now runtime-proven. If a hosted project is approved later, `db.major_version` must match that remote server; no remote server was queried or assumed here.

## 6. Minimal source-controlled configuration posture

`supabase/config.toml` is a deliberately database-only local profile:

- `project_id = "renz-construction-local"` distinguishes this local stack from other projects on the same host;
- database port `54322`, shadow port `54320`, health timeout `2m`, and `major_version = 17` are explicit;
- migrations are enabled and remain the schema source of truth;
- declarative `schema_paths` is empty, avoiding a parallel schema-management system;
- seeding is enabled from `./seed.sql` after migrations;
- the Data API, Realtime, Studio, local SMTP, Storage, Auth, Edge Runtime, and analytics are disabled; the CLI still starts a local gateway container alongside PostgreSQL;
- sign-up and anonymous sign-in are also false, but Auth itself remains disabled;
- no provider credential, access token, database password, remote project reference, cloud region, or production endpoint appears in the configuration.

This narrower profile enforces the authorized S2 boundary and avoids starting later-slice services. It is not evidence that Auth, Storage, API, or hosted operations are configured. The source-controlled `supabase/.gitignore` excludes `.branches`, `.temp`, and local dotenv/key material. The configuration guide says changes require a normal `supabase stop` followed by `supabase start` to take effect.

The CLI accepted the project configuration, selected the database-only local image set, started healthy containers, applied every migration and the configured seed, and reported PostgreSQL `17.6`. The disabled services remain outside S2 and no remote state was consulted.

## 7. Exact local command contract

The [CLI reference](https://supabase.com/docs/reference/cli) documents the command and flag forms below. Explicit `--local` flags are retained wherever supported so a future linked-project state cannot silently redirect a database operation.

### One-time initialization and migration authoring

The repository is already initialized. Do not repeat `init`, and never use `init --force` against the reviewed configuration. The original project-local form is recorded for reproducibility:

```powershell
corepack pnpm@11.25.0 supabase init
```

Create migrations through the CLI, then write and review their SQL:

```powershell
corepack pnpm@11.25.0 supabase migration new <snake_case_name>
```

Do not create timestamped migration filenames manually, edit a hosted schema through a dashboard, or infer migrations from a remote project in S2.

The completion correction `20260902111728_deny_default_function_execute.sql` was added through a local patch using an inspected timestamp rather than `migration new`. Its order and contents were then replayed successfully in repeated clean resets. Its already-executed filename is retained; future authoring should use the CLI command above.

### Local lifecycle and verification

```powershell
corepack pnpm@11.25.0 supabase start
corepack pnpm@11.25.0 supabase status
corepack pnpm@11.25.0 supabase db reset --local
corepack pnpm@11.25.0 supabase test db --local
corepack pnpm@11.25.0 db:test:concurrency
corepack pnpm@11.25.0 supabase db lint --local --fail-on warning
corepack pnpm@11.25.0 db:types
corepack pnpm@11.25.0 db:types:check
corepack pnpm@11.25.0 supabase stop
```

Command semantics and cautions:

- [`start`](https://supabase.com/docs/reference/cli/supabase-start) requires `supabase/config.toml`, starts the selected local containers, applies migrations and seed configuration, and performs health checks. Do not use `--ignore-health-check`, which can exit zero despite unhealthy services.
- [`status`](https://supabase.com/docs/reference/cli/supabase-status) requires a running stack. Supabase documents that status output can include local JWT and role keys; inspect it interactively when needed, but do not persist or print it in CI logs.
- [`db reset --local`](https://supabase.com/docs/reference/cli/supabase-db-reset) recreates the local Postgres container, applies all files under `supabase/migrations`, then runs the configured seed. It intentionally discards manual local-only schema/data changes.
- [`test db --local`](https://supabase.com/docs/reference/cli/supabase-test-db) runs pgTAP through `pg_prove` against the local database.
- [`db lint --local --fail-on warning`](https://supabase.com/docs/reference/cli/supabase-db-lint) runs `plpgsql_check` and exits nonzero for either warnings or errors. The CLI default `--fail-on none` is not acceptable for the quality gate.
- [`gen types`](https://supabase.com/docs/reference/cli/supabase-gen-types) emits generated definitions to stdout. `--local` excludes hosted/project-ID generation, `--lang typescript` is explicit, and `--schema public` keeps application-facing generated types scoped to the intended exposed application schema.
- [`stop`](https://supabase.com/docs/reference/cli/supabase-stop) preserves local Docker volumes by default. `stop --no-backup` deletes local data volumes and is not the normal developer command.

The canonical generated artifact is `src/lib/database/database.types.ts`. It was emitted by the exact local CLI from the reset migration-defined `public` schema. It contains 48 `Row`, `Insert`, and `Update` table definitions, no provider credential, and no synthetic fixture constants.

`db:types` runs the exact local generator and formats its output with the pinned Prettier configuration before writing the canonical artifact. `db:types:check` generates and formats in memory, then compares that result with the existing file without overwriting it. Raw CLI redirection would bypass this normalization and must not be used for the canonical artifact.

The aggregate `db:verify` inventories the local project containers and probes status without printing sensitive output. It reuses and preserves a healthy pre-existing stack, and claims startup ownership only when the inventory confirms no existing project containers. It resets twice, runs pgTAP, executes the bounded two-session lead-integrity race, lints at warning severity, and compares regenerated types without overwriting the canonical artifact. Both successful ownership paths were exercised: an existing stack remained healthy, while a verifier-started stack ended with zero running project containers.

The 5 September closeout review tightened ownership before startup: a bounded Docker inventory checks every existing container with the exact `com.supabase.cli.project` label used by the [CLI 2.116.0 source](https://raw.githubusercontent.com/supabase/cli/v2.116.0/apps/cli-go/internal/utils/docker.go). An unhealthy or partially stopped pre-existing stack, invalid project configuration, or failed inventory/status process now causes a failure before mutation. Fourteen mocked lifecycle regression cases cover preservation, cold ownership, diagnostics suppression, and failed-start cleanup without needing a running Docker engine. The database checks themselves retain their 2 September runtime evidence.

## 8. pgTAP workflow and paths

Official guidance is in [Testing Your Database](https://supabase.com/docs/guides/database/testing), the [local testing overview](https://supabase.com/docs/guides/local-development/testing/overview), and the [`test db` reference](https://supabase.com/docs/reference/cli/supabase-test-db).

RENZ database tests live beneath:

```text
supabase/tests/database/
```

The CLI mounts `supabase/tests` into its pgTAP runner, discovers nested files with `.sql` or `.pg` suffixes, and wraps each test file in an isolated transaction that is rolled back regardless of success or failure. Tests should still use the explicit pgTAP structure shown by Supabase: `BEGIN`, `plan(n)`, assertions, `finish()`, and `ROLLBACK`.

Optional exact scaffold command:

```powershell
corepack pnpm@11.25.0 supabase test new <snake_case_name> --template pgtap
```

Run all database tests from the repository root:

```powershell
corepack pnpm@11.25.0 supabase test db --local
```

The command also accepts one or more positional paths when a focused run is useful:

```powershell
corepack pnpm@11.25.0 supabase test db supabase/tests/database/<name>_test.sql --local
```

S2 pgTAP coverage is for reset reproducibility, constraints, foreign keys, deletion behavior, indexes, grants, functions, and schema invariants using unmistakably synthetic fixtures. Six files executed 218 assertions successfully. The original 217 assertions were preserved and one direct navigation self-cycle regression was added after review; the independent two-session script proves parent-row lock serialization during a competing subtype deletion/finalization race. S3 owns final Auth, MFA, RBAC, and complete allow/deny RLS behavior; S2 does not manufacture those policy decisions.

## 9. Docker preflight and runtime completion

The 1 September 2026 Windows preflight produced:

| Command               | Result      | Safe recorded evidence                                                                                                                                                                             |
| --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker --version`    | PASS        | `Docker version 29.6.2, build dfc4efb`                                                                                                                                                             |
| `docker context show` | PASS        | `desktop-linux`                                                                                                                                                                                    |
| `docker info`         | **BLOCKED** | The client section succeeded, but the server connection failed: `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; ... The system cannot find the file specified.` |

That unavailable-engine observation remains historical evidence and was not rewritten. Later on 2 September, the same selected engine became healthy and produced this completion evidence:

| Check                | Runtime result                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Docker client/server | `29.6.2`; Linux engine reachable                                                              |
| Local stack          | database and gateway containers healthy; status command exited 0                              |
| PostgreSQL           | `17.6`                                                                                        |
| Migration replay     | eleven migrations plus seed passed twice consecutively after the corrective migration         |
| Database tests       | six files, 218/218 pgTAP assertions passed; multi-session lead race passed                    |
| Database lint        | no warnings or errors with `--fail-on warning`                                                |
| Generated types      | canonical public-schema artifact generated; byte-for-byte drift check passed                  |
| Lifecycle ownership  | existing stack preserved; verifier-owned stack stopped with zero project containers remaining |

No sensitive Docker, environment, registry, or Supabase credential output is reproduced here. No health check was bypassed and no cloud credential or remote database was used.

## 10. CI posture after local proof

`.github/workflows/ci.yml` now contains an independent `database-integration` job on `ubuntu-24.04`, bounded to 30 minutes. It uses the existing immutable `actions/checkout` v7.0.1 and `pnpm/setup` v2.1.0 commit pins, `contents: read`, disabled persisted checkout credentials, pnpm lockfile caching, exact Node `24.20.0`, pnpm `11.25.0`, and project dependency `supabase@2.116.0`. `DO_NOT_TRACK=1` is set.

The job performs a frozen install, asserts all three tool versions, then runs `pnpm db:verify`. The verifier starts only the narrowed local stack; resets twice; runs 218 pgTAP assertions, the two-session race, warning-failing lint, and a genuine type-drift check; suppresses credential-bearing lifecycle output; and stops its owned stack. It has no secrets, login, link, project ID, database URL, remote operation, database-volume cache, artifact upload, or deployment step. Windows Docker CI is intentionally absent.

The workflow definition was statically reviewed and parsed by Prettier locally. Actual GitHub-hosted execution requires a future repository run; S2's stated criterion is the addition of a structurally valid bounded job, not a fabricated remote run result.

## 11. Explicitly rejected paths

The following are outside this S2 toolchain boundary:

- `supabase login`, `supabase link`, hosted project creation, organization/account changes, and access tokens;
- `supabase db push`, `supabase db pull`, remote migration repair, and dashboard-only schema changes;
- `--linked`, `--project-id`, or `--db-url` variants of reset, testing, linting, or type generation;
- Auth, user invitations, MFA, RBAC operating behavior, privileged application clients, public API exposure, Storage, Realtime, SMTP, Edge Functions, analytics, and deployment;
- real RENZ people, projects, testimonials, credentials, contacts, statistics, or business evidence in seeds/tests;
- `--ignore-health-check` as a workaround for an unhealthy stack;
- routine developer use of `stop --no-backup` or dangerous `stop --all --no-backup` on a shared host;
- fabricated generated TypeScript output while the database cannot run;
- any claim that local PostgreSQL configuration resolves G5 production region, data location, backup tier, Storage backup, RPO/RTO, restore ownership, or go-live authority.

## 12. Current conclusion

The exact local toolchain decision is complete: project-local `supabase@2.116.0`, executed with pnpm `11.25.0`, and running PostgreSQL `17.6` in a source-controlled database-only profile. Its package lifecycle and platform-delivery metadata are compatible with the repository's strict installation posture.

S2's local toolchain/runtime gate is **PASS**. The database starts healthy, rebuilds deterministically from eleven migrations and the synthetic seed, passes all 218 pgTAP assertions plus the two-session race, lints without warnings, emits stable public-schema types, preserves correct stack ownership, and has a bounded isolated Linux CI definition. This conclusion does not resolve G1–G5, authorize S3, or imply any cloud, recovery, Auth, Storage, public API, or deployment capability.
