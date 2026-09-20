# RENZ Construction Services Ltd

This repository holds the reviewed product, design, content, architecture, security, delivery, and application foundation for a future RENZ public website and internal administration product.

## Current status

Phase 1 / S9A-P is a **bounded local noindex client-preview signature experience**, not final S9 and not the approved or deployed RENZ website. The repository contains the S1 application foundation, S2 migration-defined PostgreSQL/Supabase spine, S3 invitation-only staff Auth/RBAC shell, S4 evidence-safe publication kernel, S5A Services administration vertical, S6A server-first public route/design foundation, and the reversible S9A-P visual/interaction layer. It does **not** contain customer accounts, real RENZ public content, an approved production identity, S5B Projects + Project Media administration, cloud resources, public intake, visitor uploads, analytics, or deployment configuration.

S2, S3, S4, S5A, S6A, and S9A-P are **PASS** within their authorized local boundaries; final S9 is incomplete and S5 overall remains **IN PROGRESS** because S5B is still required. S6A and then the preview-only S9A-P layer were intentionally accelerated ahead of S5B for client review. The exact-pinned application, 27-migration PostgreSQL `17.6` stack, 369 pgTAP assertions, database/Auth/content/media/publication gates, 47 unit tests, 19 component tests, and public/Admin production-browser scenarios pass. S9A-P approves no brand master, project evidence, contact fact, testimonial, institution, service claim, cloud decision, privacy policy, deployment, or indexing action. S5B Projects + Project Media administration is **READY / MANDATORY** next.

Read these first:

1. [`docs/PHASE_1_S2_REPORT.md`](docs/PHASE_1_S2_REPORT.md)
2. [`docs/PHASE_1_S2_TOOLCHAIN.md`](docs/PHASE_1_S2_TOOLCHAIN.md)
3. [`docs/PHASE_1_S2_DATA_MODEL.md`](docs/PHASE_1_S2_DATA_MODEL.md)
4. [`docs/PHASE_1_S2_RLS_GRANT_MATRIX.md`](docs/PHASE_1_S2_RLS_GRANT_MATRIX.md)
5. [`docs/PHASE_1_S2_RECOVERY.md`](docs/PHASE_1_S2_RECOVERY.md)
6. [`docs/PHASE_1_DECISION_REGISTER.md`](docs/PHASE_1_DECISION_REGISTER.md)
7. [`docs/PHASE_1_S1_REPORT.md`](docs/PHASE_1_S1_REPORT.md) and [`docs/PHASE_1_S0_REPORT.md`](docs/PHASE_1_S0_REPORT.md)
8. [`DESIGN.md`](DESIGN.md), [`UX-CONTRACT.md`](UX-CONTRACT.md), and [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md)
9. [`docs/PHASE_1_S3_REPORT.md`](docs/PHASE_1_S3_REPORT.md) and [`docs/CLIENT_PRODUCT_EXPANSION_2026-09-05.md`](docs/CLIENT_PRODUCT_EXPANSION_2026-09-05.md)
10. [`docs/PHASE_1_S4_REPORT.md`](docs/PHASE_1_S4_REPORT.md), [`docs/PHASE_1_S4_CONTENT_EVIDENCE_MODEL.md`](docs/PHASE_1_S4_CONTENT_EVIDENCE_MODEL.md), and [`docs/CLIENT_EVIDENCE_BACKLOG.md`](docs/CLIENT_EVIDENCE_BACKLOG.md)
11. [`docs/PHASE_1_S5A_REPORT.md`](docs/PHASE_1_S5A_REPORT.md), [`docs/PHASE_1_S5_ADMIN_UX_ARCHITECTURE.md`](docs/PHASE_1_S5_ADMIN_UX_ARCHITECTURE.md), [`docs/PHASE_1_S5_SERVICES_WORKFLOW.md`](docs/PHASE_1_S5_SERVICES_WORKFLOW.md), and [`docs/PHASE_1_S5_ADMIN_ACCESSIBILITY.md`](docs/PHASE_1_S5_ADMIN_ACCESSIBILITY.md)
12. [`docs/PHASE_1_S6A_REPORT.md`](docs/PHASE_1_S6A_REPORT.md), [`docs/PHASE_1_S6_PUBLIC_FRONTEND_ARCHITECTURE.md`](docs/PHASE_1_S6_PUBLIC_FRONTEND_ARCHITECTURE.md), [`docs/PHASE_1_S6_RESPONSIVE_SYSTEM.md`](docs/PHASE_1_S6_RESPONSIVE_SYSTEM.md), [`docs/PHASE_1_S6_PUBLIC_MOTION_FOUNDATION.md`](docs/PHASE_1_S6_PUBLIC_MOTION_FOUNDATION.md), and [`docs/PHASE_1_S6_CLIENT_PREVIEW.md`](docs/PHASE_1_S6_CLIENT_PREVIEW.md)
13. [`docs/S9A_PREVIEW_SIGNATURE_REPORT.md`](docs/S9A_PREVIEW_SIGNATURE_REPORT.md), [`docs/S9A_SIGNATURE_EXPERIENCE_INVENTORY.md`](docs/S9A_SIGNATURE_EXPERIENCE_INVENTORY.md), [`docs/S9A_PROVISIONAL_BRAND_MARK.md`](docs/S9A_PROVISIONAL_BRAND_MARK.md), [`docs/S9A_PROJECT_EXPERIENCE_STUDY.md`](docs/S9A_PROJECT_EXPERIENCE_STUDY.md), and [`docs/S9A_MOTION_CHOREOGRAPHY.md`](docs/S9A_MOTION_CHOREOGRAPHY.md)

## Evidence classes

- `client-original/source`: byte-preserved client evidence. It may inform decisions but is not automatically cleared for public use.
- `client-supplied AI/reference`: creative direction only; never business evidence or a source of production claims.
- `Phase-0 generated concept`: composition/design exploration; permitted only as an explicitly labelled local noindex preview study and never RENZ project proof or a production publication record.
- `S9A-P provisional web derivative`: approximate client-preview identity study behind `RENZ_CLIENT_PREVIEW`; never an approved identity master or production asset.
- `future approved derivative`: produced only from an approved source with a recorded change log and owner approval.
- `future production asset`: rights-cleared and approved for a named public or operational use.

The two recovered client-source files remain under `references/client/originals/`. The first filename is historically misleading: its payload is the authenticated 190×181 monogram, not the absent AI brand board. Do not rename or duplicate it without updating the provenance record.

## Slice workflow

Work proceeds only through the slices in [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md). Before a slice:

1. read the relevant contracts and current gate statuses;
2. record the authorized outcome and exact boundary;
3. omit blocked capabilities instead of inventing policies or facts;
4. make one coherent, reviewable change;
5. run the applicable verification and preserve evidence;
6. stop at the assigned slice boundary.

The current project-lead instruction makes Git history informational rather than an implementation gate. Slice authorization, repository contracts, evidence integrity, and the decision register remain authoritative. Later slices must still be explicitly assigned and may not infer answers to G1–G5.

## Local development

Required repository targets:

- Node.js `24.20.0` (declared in `.node-version`, `.nvmrc`, and CI)
- pnpm `11.25.0` (declared in `package.json`)

Corepack can run the exact package manager without replacing a different global pnpm installation:

```powershell
corepack pnpm@11.25.0 --version
corepack pnpm@11.25.0 install --frozen-lockfile
corepack pnpm@11.25.0 dev
corepack pnpm@11.25.0 verify
corepack pnpm@11.25.0 build

# With the local Auth stack running and environment values loaded privately:
corepack pnpm@11.25.0 auth:verify

# Bootstrap the first local Super Admin only when no Super Admin assignment exists:
# load NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY privately first.
corepack pnpm@11.25.0 auth:bootstrap -- --email operator@example.test
```

When the active shell already resolves `pnpm --version` to `11.25.0`, the equivalent shorthand is:

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm verify
pnpm build
```

The public S1 route requires no runtime environment variables. S3 Auth routes require the names in [`.env.example`](.env.example): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser-safe; `SUPABASE_SECRET_KEY` is server-only. Local status output can be loaded privately for `auth:verify`; never commit or print those values.

### Local client preview

The public pages render safely with intentional empty states and no secret. Build and run the local production-style preview:

```powershell
corepack pnpm@11.25.0 install --frozen-lockfile
$env:RENZ_CLIENT_PREVIEW = "true"
corepack pnpm@11.25.0 build
corepack pnpm@11.25.0 start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The flag activates the reversible S9A-P signature preview: provisional identity variants, a once-per-session skippable opener, route-specific construction fields, labelled non-evidentiary project studies, and non-actionable content architecture. No concept is represented as RENZ work and no contact/intake data is collected. Stop with `Ctrl+C`. Published local projection integration is covered by `pnpm s6a:verify`; the expanded signature, preview-off, public, and S5A browser gate is `pnpm s9ap:verify`. Both require the healthy local stack described below.

## Local database

The local data stack uses project-pinned Supabase CLI `2.116.0`, PostgreSQL 17, and a healthy Docker-compatible engine. S4 enables the local Storage API for two private editorial buckets; Realtime, analytics, edge-runtime, and Studio remain disabled. `supabase/config.toml` uses the explicit local `56230`–`56236` range because the Windows host reserves lower development ranges dynamically. Scripts derive endpoints from `supabase status`; do not hard-code or disclose local credentials. Bucket rows are provisioned only through the supported Storage API. Do not log in to Supabase cloud, link a remote project, or run remote database commands.

```powershell
corepack pnpm@11.25.0 db:start
corepack pnpm@11.25.0 db:status
corepack pnpm@11.25.0 db:reset
corepack pnpm@11.25.0 db:test
corepack pnpm@11.25.0 db:test:concurrency
corepack pnpm@11.25.0 db:lint
corepack pnpm@11.25.0 db:types
corepack pnpm@11.25.0 db:types:check
corepack pnpm@11.25.0 db:verify
corepack pnpm@11.25.0 content:verify
corepack pnpm@11.25.0 storage:provision
corepack pnpm@11.25.0 publication:verify
corepack pnpm@11.25.0 storage:status
corepack pnpm@11.25.0 storage:verify
corepack pnpm@11.25.0 media:reconcile
corepack pnpm@11.25.0 s4:verify
corepack pnpm@11.25.0 exec playwright install chromium
corepack pnpm@11.25.0 test:e2e
corepack pnpm@11.25.0 test:e2e:visual
corepack pnpm@11.25.0 s5a:verify
corepack pnpm@11.25.0 s6a:verify
corepack pnpm@11.25.0 s9ap:verify
corepack pnpm@11.25.0 s9ap:preview-off
corepack pnpm@11.25.0 s9ap:measure http://127.0.0.1:3000/
corepack pnpm@11.25.0 auth:verify
corepack pnpm@11.25.0 db:stop
```

Run `db:types` only after a clean reset, then review the generated `src/lib/database/database.types.ts`. `db:verify` is non-remote and proves the S2–S6A database contract. For a focused publication run, provision the two local private buckets before `publication:verify`; the harness uploads owned synthetic objects and removes them after the test. `s4:verify` handles that order and proves two clean resets, the full S4 pgTAP suite, restored schema, warning-failing lint, generated type consistency, S3 Auth regression, publication concurrency, private Storage integration, report-only media reconciliation, and the application gate. `s5a:verify` requires the local stack to be running; it builds the production app, creates only reserved synthetic MFA actors/content, runs Chromium acceptance, then resets the database and removes the ignored credential fixture. `s6a:verify` extends that production-browser gate with every public route, safe synthetic publish/unpublish paths, real 404s, navigation, reduced motion, axe, and the responsive screenshot/reflow matrix. `s9ap:verify` runs those S6A/S5A browser regressions plus the signature routes, opener/session contract, project-story interaction, required screenshot set, ten-width reflow matrix, and a separate preview-off server proof. The harness then rebuilds and runs an isolated evidence-published synthetic project through the anonymous index and detail routes. Final cleanup removes the generated data cache on both success and failure so test-only public records cannot survive into a later preview. No harness installs Chromium automatically or contacts cloud services. They preserve a healthy stack they did not start. If existing project containers are unhealthy or inventory cannot be read, recover that stack explicitly. `db:start`, `db:status`, and local Storage scripts may display or use local credentials; do not copy them into logs, issues, screenshots, or documentation. `auth:bootstrap` is an operator-only local command: it requires a one-time explicit email, refuses any existing Super Admin assignment, and never prints or stores credentials.

### Owner website content (CR1)

The public website is rendered from the database (pages, sections, services,
projects, insights, media — see `docs/CLAUDE_OWNER_CMS_ARCHITECTURE.md`). A
fresh local reset ships the approved pages (migration
`20260917130000_seed_cr1_website_pages.sql`) but no services, projects or
insights. Populate them exactly as a fresh deployment does:

```powershell
corepack pnpm@11.25.0 db:reset
node scripts/storage.mjs provision
node scripts/website-seed-content.mjs
```

The seed is idempotent (services, six concept studies with their preview
images, three insights). D1.6 adds two modes: `--rewrite-copy` republishes
the plain-English wording of the seed sources as a new content revision of
each existing record, and `--heroes` registers the rendered hero loop under
`public/media/renz/heroes` as a concept video and attaches it to the Home
opening (both idempotent; the local `db:reset` path applies migrations
`20260920100000` and `20260920110000` automatically). If `next dev` was already running, delete
`.next/dev/cache/fetch-cache` (and `.next/cache/fetch-cache` for `next
start`) afterwards so the data cache does not serve the previous content;
`tests/e2e/global-setup.mjs` and `scripts/e2e-server.mjs` do this for the
browser suites. Owner surfaces live under `/admin/website`.

## Repository policy

- Default branch: `main`.
- No direct production mutation or deployment without explicit approval.
- No secrets, local credentials, generated caches, or build output in Git.
- Exact-pin every direct dependency and use only the committed `pnpm-lock.yaml`.
- Run `pnpm verify` before review; it covers formatting, linting, strict types, unit/component tests, design-contract lint, secret scanning, production build, and production dependency audit.
- Run `pnpm db:verify` separately when the local container engine is healthy. Database verification is not hidden inside the S1 application gate; `.github/workflows/ci.yml` runs it independently in the bounded Linux database-integration job.
- Run `pnpm s9ap:verify` with a healthy local stack for the combined signature-preview, preview-off, S6A public, and S5A production-build browser gate. With a verified production preview already running, `pnpm s9ap:measure http://127.0.0.1:3000/` records the bounded local performance/resource observation. CI installs only pinned Chromium in an isolated local-stack job and never uses cloud credentials.
- Treat `.github/workflows/ci.yml` as a portable quality harness only. It contains no deployment job and does not imply a GitHub-hosting requirement.
- Keep client originals immutable and generated concepts visibly classified.
