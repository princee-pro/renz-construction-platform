# RENZ developer handoff — start here

Revalidated 23 October 2026. RENZ Construction Services Ltd — **BRICK BY
BRICK.** This handoff covers the existing application, its private GitHub
publication and the route to independent testing. It does not authorize go-live.

## What you are receiving

A connected public website, structured Owner CMS and private Admin Control
Room. The source contains public services/portfolio/insights/contact/intake,
staff password/TOTP authentication, capability-based administration, clients,
operational projects, finance, trade partners/procurement, leads, analytics,
notifications and audited content publication. The stack is Next.js/React/
TypeScript with Supabase Auth, PostgreSQL RLS, private Storage and Realtime.

C10 and R1 reports record substantial earlier local release verification.
Later changes include the Owner CMS, concept galleries, staff templates and
the approved orange identity. **There is no meaningful single completion
percentage:** implementation coverage, fresh local verification, content
approval and cloud release readiness are separate questions. Consult
[current status](CURRENT_STATUS_AND_OPEN_ITEMS.md) and
[the fresh publication checks](GITHUB_PUBLICATION_VERIFICATION.md).

The repository ships 50 migrations. No cloud database, production object
store, real owner account or DNS configuration is embedded in Git. Cloning
source cannot restore private Storage objects or business data.

## Onboarding order

These are milestones, not guaranteed day estimates.

| Milestone | Work                                                                                                                                                    | Evidence to retain                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Day 1     | Accept private GitHub invitation; clone; verify pinned tools; install frozen lockfile; configure disposable local Supabase; inspect architecture/schema | Tool versions, setup result and private local environment inventory   |
| Day 2     | Run static/unit/component gates, then isolated database/Auth/browser gates; inspect public, CMS and operational flows                                   | Exact commit, command, exit status and sanitized failure reproduction |
| Day 3     | Review owner/provider decisions, security limitations, backup restoration and staging plan                                                              | Explicit remaining gates, named operators and a staging checklist     |

Follow [environment setup](ENVIRONMENT_SETUP.md). The essential sequence is
`pnpm install --frozen-lockfile`, local Docker/Supabase start, an explicitly
disposable `pnpm db:reset`, `pnpm storage:provision`, private local environment
configuration and `pnpm dev`. Optional `website-seed-content.mjs` adds
labelled concepts; it does not establish real client projects. Reserved
local owner creation and TOTP instructions are in that guide. Never reuse
local synthetic account credentials or secrets remotely.

## Read the code by boundary

| Area                                                     | Start with                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Public and admin routes                                  | `src/app/(public)/`, admin route groups and `src/app/api/` (see architecture for exact route paths) |
| Business operations and typed server commands            | `src/features/` and their colocated data/actions/schema modules                                     |
| Public page loading, section registry and snapshots      | `src/features/website/`, `src/components/site/sections/`                                            |
| Auth, Supabase adapters, database types, shared concerns | `src/lib/`                                                                                          |
| Admin/public UI                                          | `src/components/admin/`, `src/components/site/`                                                     |
| Database source of truth                                 | `supabase/migrations/`, `supabase/tests/`, `supabase/seed.sql`                                      |
| Local integration/recovery/release harnesses             | `scripts/`, `tests/e2e/`, Playwright configurations                                                 |
| Exact runtime/tooling                                    | `package.json`, `pnpm-lock.yaml`, `.node-version`, `.nvmrc`, `.github/workflows/ci.yml`             |

Use [architecture](ARCHITECTURE_OVERVIEW.md) for exact routes and data flows,
[data relationships](DATA_MODEL_AND_RELATIONSHIPS.md) for table/function names,
and [security](SECURITY_MODEL.md) for authority and residual findings. Public
case studies and private operational projects have different identities and
publication rules; do not merge them for convenience.

## Public content and the owner workflow

Owners edit typed pages/sections, services, projects, insights, media and
configuration in Admin. Saves carry versions. Publication freezes approved
snapshots; public readers receive only eligible projections. A real project
with cleared evidence/media appears on Projects after authorized publication
and cache refresh, without a code change. Generated studies remain labelled
concepts and never become completed RENZ evidence. See
[WEBSITE_CMS_GUIDE.md](WEBSITE_CMS_GUIDE.md) for exact controls, rollback support
and limitations. New section types and system features still need development.

The official slogan is seeded into owner-managed business settings as
`Brick by Brick.`. A campaign headline can differ; older dated documents and
superseded identity references are retained as history. Production consistency
also depends on the approved published configuration, not a local browser alone.

## Reproduce the critical workflows

Use [the QA guide](TESTING_AND_QA_GUIDE.md) for authoritative commands and
required services. At minimum, reproduce these on disposable synthetic data:

1. Staff sign-in → TOTP → required password change where applicable → allowed
   route. Prove direct forbidden actions and revoked staff are denied.
2. Client → operational project → stage update; a second editor must receive
   a version conflict instead of silently overwriting.
3. Draft invoice → issue → PDF → payment → reversal → token-share revoke.
   Confirm exact totals, currency isolation and append-only history.
4. Supplier/material → purchase order → receipt and contractor assignment;
   verify permissions and project relationships.
5. Public enquiry → validated intake → Admin Leads → authorized conversion.
   Verify abuse rejection and disabled/misconfigured production intake.
6. CMS edit → preview → publish → anonymous route; then unpublish/restore where
   supported. Confirm no drafts, private media or generated evidence leak.
7. Notification/read state and Realtime invalidation after authorized changes.
8. Mobile 320px reflow, keyboard, reduced motion, forced colors, errors and
   poor-network behavior. Chromium automation does not replace manual review.

Default E2E setup and C10/R1 gates reset and reseed the local database. They
can remove manual synthetic accounts. After reset-only cleanup, create a manual
local owner before CMS seeding. R1 restores synthetic actors and published CMS
content, including existing owner assignments: inspect and use those synthetic
actors rather than blindly rerunning the one-shot owner bootstrap. If a new
manual owner is needed, deliberately reset the disposable local database first,
then follow the owner-before-seed order in [environment setup](ENVIRONMENT_SETUP.md).
Do not point these harnesses at staging or production.

## Report and reproduce problems

Create a feature/fix branch. Record commit SHA, exact command, tool versions,
route/workflow, synthetic setup, expected/actual result and cleanup. Include
only sanitized screenshots; omit Auth output, tokens, private uploads, TOTP,
invoice share URLs and customer data. Check that a reported historical issue
still exists before changing source. Use the issue and pull-request templates.

## Before staging and production

Read [DEPLOYMENT_HANDOFF.md](DEPLOYMENT_HANDOFF.md), then the preserved
[deployment runbook](RENZ_PRODUCTION_DEPLOYMENT.md),
[go-live checklist](RENZ_GO_LIVE_CHECKLIST.md),
[backup/restore](RENZ_BACKUP_RESTORE.md), [rollback](RENZ_ROLLBACK.md) and
[incident response](RENZ_INCIDENT_RESPONSE.md). Validate provider/runtime
compatibility and cost controls before creating anything.

The path is reviewed GitHub source → isolated staging app and Supabase →
migrations and private bucket provisioning → real staff/bootstrap and
provider configuration → controlled smoke/recovery/performance testing →
owner release approval → production → separate indexing approval. Email/reset,
domain/DNS, legal/business evidence, Turnstile, monitoring, schedulers and
cloud backup restoration all need actual operator evidence.

Dangerous actions include database resets/restores, remote migrations, storage
cleanup/purge, credential rotation, staff disabling, invoice issuance/payment
reversal, public content publication, backup retention deletion and deployment.
Review each command's endpoint and authority. This mission enables no cloud
backup or notification schedule and performs no hosting deployment.

## Private collaboration

Owner: Settings → Collaborators → Add people → verify username → invite.
Keep the repository private. Personal-repository invitations grant write
access; finer read/triage roles are not available there. The developer clones,
branches, runs checks and submits PRs; ownership transfer and unrelated admin
access are unnecessary. Repository protections/settings and any plan
limitations are recorded in the publication verification record.
