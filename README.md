# RENZ Construction Services Ltd

**BRICK BY BRICK.**

RENZ is a construction-services platform with a public website and a private
Admin Control Room. The public experience presents approved services, projects
and clearly labelled concept studies, articles and project enquiries. Staff use
the Control Room for content, clients, operational projects, invoices/payments,
trade partners, procurement, leads, analytics, notifications and access control.
Business claims and completed-project evidence require approval; generated
concept imagery is never proof of RENZ work.

**Status, 23 October 2026:** implemented local release candidate with subsequent
Owner CMS, gallery, staff-access and orange-identity work. Publication of this
repository is a developer handoff. Cloud provisioning, production validation,
public release and indexing remain separate gates. This repository does not
establish that RENZ is live. Historical reports record checks on earlier source
states; fresh migration evidence is in
[the publication verification record](docs/GITHUB_PUBLICATION_VERIFICATION.md).

Start with [HANDOFF_START_HERE.md](docs/HANDOFF_START_HERE.md).

## Download the source code

Open [the RENZ repository](https://github.com/princee-pro/renz-construction-platform),
select the green **Code** button, then **Download ZIP**. On Windows, right-click
the downloaded ZIP and choose **Extract All**. A public repository can be viewed
and downloaded without a GitHub account. The ZIP is a source-code snapshot;
follow the setup instructions below to run it.

The owner authorized public source sharing on **29 October 2026**. This
supersedes the earlier private-only handoff policy; it does not launch the
website, grant an open-source licence or transfer repository ownership. See the
[client download guide](docs/RENZ_CLIENT_DOWNLOAD_AND_OWNERSHIP_GUIDE.md) and
[third-party notices](THIRD_PARTY_NOTICES.md).

## System at a glance

| Layer             | Implementation                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application       | Next.js 16.4.1 App Router, React 19.2.8, TypeScript 6.0.3; server-first routes and bounded interactive clients                                                          |
| Styling/media     | Tailwind 4.3.3, canonical design tokens, Motion 13.2.0, self-hosted OFL fonts, same-origin static and permission-checked media                                          |
| Data              | PostgreSQL 17 through Supabase; 50 ordered SQL migrations, generated types and pgTAP contracts                                                                          |
| Identity          | Invitation/owner-created staff, password plus mandatory TOTP MFA, fresh capability checks and database enforcement                                                      |
| Security          | RLS, narrow security-definer facades, version checks, immutable publication snapshots and audit history                                                                 |
| Storage           | Private editorial-originals, editorial-derivatives and conditional lead-intake buckets; external objects require separate restoration                                   |
| Live updates      | Eligible staff receive Realtime invalidation pointers; record refetches enforce domain permissions. Identifier/timing limits are documented in the security model       |
| Finance           | Currency-separated exact amounts, append-only payment/reversal history, PDF invoices and revocable tokenized sharing                                                    |
| Release direction | Owner-selected Netlify application hosting, Supabase data/Auth/Storage, Cloudflare DNS and conditional R2 backup; compatibility and cloud operations require validation |

The public portfolio (`projects`) and private operational jobs
(`operational_projects`) are separate domains with a controlled bridge. The
CMS publishes snapshots; the public application does not read draft content.
See [architecture](docs/ARCHITECTURE_OVERVIEW.md) and
[data relationships](docs/DATA_MODEL_AND_RELATIONSHIPS.md).

The main directories are `src/app/` for routes, `src/components/` for shared
interfaces, `src/features/` for domain behavior, `src/lib/` for shared boundaries,
`supabase/migrations/` for ordered schema changes, `supabase/tests/` and `tests/`
for verification, `scripts/` for maintenance and test harnesses, `public/` for
static media, and `docs/` for contracts, reports and operating guides.

## Get running locally

Use **Node.js 24.20.0** (`.node-version`, `.nvmrc`) and **pnpm 11.25.0**
(`packageManager`). Git is required. Docker Desktop with a healthy Linux engine
is required for Supabase, database tests and authenticated workflows. Supabase
CLI **2.116.0** is a pinned project dependency. Playwright Chromium is required
only for browser verification. Do not upgrade dependencies during onboarding.

```powershell
git clone https://github.com/princee-pro/renz-construction-platform.git
cd renz-construction-platform
node --version
pnpm --version
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

If the global pnpm differs, use `corepack pnpm@11.25.0` in place of `pnpm`
where Corepack is installed. Follow
[ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) to populate the local URL and
keys privately. Never paste `supabase status` credentials into an issue or log.

```powershell
pnpm db:start
# Destructive LOCAL reset: only use an expendable development database.
pnpm db:reset
pnpm storage:provision
# Optional disposable local owner: run BEFORE the content seed.
pnpm local:owner
# Optional local concept/demo content, never production project evidence:
node scripts/website-seed-content.mjs
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and
[the staff sign-in](http://localhost:3000/admin/sign-in). Without local data,
public routes have intentional safe empty/unavailable states. To view the
labelled creative preview set `RENZ_CLIENT_PREVIEW=true` locally before build
or development. Keep it absent outside an approved preview.

For an expendable local owner, `pnpm local:owner` creates/recreates the reserved
synthetic account and stores its TOTP secret under ignored `.local/`;
`pnpm local:owner:code` produces the current local code. Treat their output as
private. Do not use this helper for staging or production. First-real-owner
bootstrap is a separate controlled procedure. Details, resets and safe account
creation are in [environment setup](docs/ENVIRONMENT_SETUP.md). Run it before
the content seed on a fresh reset; the seed creates a synthetic administrator
that otherwise consumes the one-shot owner-bootstrap condition.

## Development and verification

| Command                                                 | Purpose / prerequisites                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm format:check` / `pnpm format`                     | Check formatting / write changes; historical evidence exclusions are intentional       |
| `pnpm lint`                                             | ESLint with zero tolerated warnings                                                    |
| `pnpm typecheck`                                        | Next route types and strict TypeScript                                                 |
| `pnpm test:unit` / `pnpm test:component`                | Vitest domain/unit and component suites                                                |
| `pnpm design:lint` / `pnpm design:tokens:check`         | Design contract and generated-token consistency                                        |
| `pnpm scan:secrets`                                     | Candidate tracked/nonignored text-file credential patterns                             |
| `pnpm build` / `pnpm audit:production`                  | Production compilation and production-dependency advisory check                        |
| `pnpm verify`                                           | Combined static/unit/component/design/secrets/build/dependency gate; no database reset |
| `pnpm db:test` / `pnpm db:lint` / `pnpm db:types:check` | Healthy local Supabase required; pgTAP/lint/type consistency                           |
| `pnpm db:verify`                                        | Isolated local database contract harness; inspect reset/cleanup behavior first         |
| `pnpm exec playwright install chromium`                 | Install pinned browser runtime                                                         |
| `pnpm test:e2e`                                         | Browser suites; default setup resets/reseeds the local database                        |
| `pnpm c10:verify`                                       | Broad release gate including resets, Auth/RLS, finance, CMS, network and browser flows |
| `pnpm r1:local`                                         | C10 plus network, bundle, local content provisioning and public/browser/log checks     |

Run the destructive gates only against an isolated disposable local stack.
Clear inherited cloud overrides before any local maintenance/test command.
Do not assume `--list` on C10 avoids its initial stack lookup. The full guide
explains command ordering, environment requirements, cleanup, cloud smoke
checks, accessibility and acceptance scenarios:
[TESTING_AND_QA_GUIDE.md](docs/TESTING_AND_QA_GUIDE.md).

## Documentation map

| Read for                                      | Entry point                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| First three onboarding milestones             | [Developer handoff](docs/HANDOFF_START_HERE.md)                                                                                       |
| Client download and ownership distinctions    | [Client download guide](docs/RENZ_CLIENT_DOWNLOAD_AND_OWNERSHIP_GUIDE.md)                                                             |
| Code and request/data flow                    | [Architecture overview](docs/ARCHITECTURE_OVERVIEW.md)                                                                                |
| Actual schema and domain boundaries           | [Data model](docs/DATA_MODEL_AND_RELATIONSHIPS.md)                                                                                    |
| Business operator instructions                | [Admin user guide](docs/ADMIN_USER_GUIDE.md)                                                                                          |
| Pages, sections, galleries and publishing     | [Website CMS guide](docs/WEBSITE_CMS_GUIDE.md)                                                                                        |
| Auth, permissions, uploads and residual risks | [Security model](docs/SECURITY_MODEL.md), [security reporting](SECURITY.md)                                                           |
| Variables, local stack and owner bootstrap    | [Environment setup](docs/ENVIRONMENT_SETUP.md)                                                                                        |
| Tests and reproducible acceptance             | [Testing and QA](docs/TESTING_AND_QA_GUIDE.md)                                                                                        |
| Staging/production prerequisites              | [Deployment handoff](docs/DEPLOYMENT_HANDOFF.md)                                                                                      |
| Recovery and incidents                        | [Backup/restore](docs/RENZ_BACKUP_RESTORE.md), [rollback](docs/RENZ_ROLLBACK.md), [incident response](docs/RENZ_INCIDENT_RESPONSE.md) |
| Current completion and open gates             | [Current status](docs/CURRENT_STATUS_AND_OPEN_ITEMS.md), [phase tracker](docs/RENZ_PHASE_STATUS.md)                                   |
| Asset evidence, hashes and rights             | [Asset/license register](docs/ASSET_AND_LICENSE_REGISTER.md)                                                                          |
| Third-party dependencies, fonts and media     | [Third-party notices](THIRD_PARTY_NOTICES.md)                                                                                         |
| Contribution and review                       | [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md)                                                                            |

Preserve dated historical reports. The current handoff points out superseding
source evidence without rewriting earlier audit claims. Read `DESIGN.md`,
`UX-CONTRACT.md`, the decision register and domain contracts before editing.

## Repository and access policy

This client-project source is shared for inspection and download;
`package.json` remains `UNLICENSED`. No open-source licence, signed copyright
assignment or ownership transfer is created by changing GitHub visibility.
Third-party packages and fonts retain their respective licences and notices;
see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Concept images remain
generated studies, never evidence of completed RENZ projects.

Never commit `.env.local`, `.local/`, `.playwright/`, database dumps, session
fixtures, `node_modules`, `.next`, generated graphs or build output. Originals
under `references/client/originals/` are immutable. Include source, migrations,
lockfile, tests, scripts, templates and the approved/local runtime assets.

Viewing and downloading a public repository require no invitation. To grant
write access, the owner uses **Settings → Collaborators → Add people**, verifies
the developer's exact GitHub username and sends the invitation. Personal
repository collaborators receive write access; finer roles require an
appropriate organization arrangement. Do not grant administration or transfer
ownership without a separate explicit instruction. Work on
`codex/<short-description>` or a descriptive feature branch and submit a pull
request. No hosting deployment is performed by repository publication.
