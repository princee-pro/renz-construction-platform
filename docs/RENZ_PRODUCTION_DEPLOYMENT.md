# RENZ production deployment

C10 §147–148. The exact order in which a first production deployment is
performed, and how later releases are shipped. Hosting is not yet
assigned (Decision Register G5); the steps are written for the Phase 0
recommendation — **Vercel for the Next.js app, Supabase Cloud for the
database / auth / storage** — and every step that depends on that choice is
marked. Nothing in this document has been executed against a cloud
resource: C10 ends with a local release candidate (`DO NOT DEPLOY`).

## 0. Preconditions (owner decisions)

| Decision | Status |
| --- | --- |
| Hosting provider and billing owner (app + database) | DECISION REQUIRED |
| Region (Supabase: `eu-central-1` or the closest region to Kigali offered; latency was not measured) | DECISION REQUIRED |
| Production domain and DNS control (`www.` + apex) | DECISION REQUIRED |
| Owner account email for the first Super Admin | DECISION REQUIRED (the client's mailbox — spelling is taken exactly as the client wrote it) |
| Transactional email: SMTP is only needed for self-service password reset; staff onboarding does NOT use email (temporary passwords are handed over privately). Default production path (R1): owner/operator-assisted reset — the sign-in screen and the Security help say so; there is no "check your email" flow | DECISION REQUIRED only if the owner wants self-service reset (`RENZ_R1_PRODUCTION_DECISIONS.md` #7) |
| Backup retention and off-site location | see `RENZ_BACKUP_RESTORE.md` |

## 1. Create the Supabase project

1. New project, chosen region, strong database password stored in the
   owner's password manager only.
2. Authentication → Providers: Email enabled; **disable sign-ups**
   ("Allow new users to sign up" = off). The product has no public
   registration; every account is created by the owner from Staff & Access.
3. Authentication → MFA: TOTP enabled (the app enforces AAL2 itself).
4. Authentication → URL configuration: Site URL = `https://<domain>`;
   redirect allow-list = `https://<domain>/admin/**`.
5. Authentication → Email: keep confirmations on; set custom SMTP if
   password reset must work at launch.
6. Storage: buckets are created by the migrations/provisioning step below,
   not by hand.
7. Note the Project URL, the **publishable** key and the **secret** (service
   role) key. The secret key goes only into the app host's server
   environment; it must never appear in `NEXT_PUBLIC_*`, Git, logs or chats.

## 2. Apply the schema

From the release-candidate commit, on an operator machine with the CLI:

```
supabase link --project-ref <ref>
supabase db push            # applies every file under supabase/migrations in order
supabase db lint --linked --fail-on warning
```

Then provision the buckets and the storage policies:

```
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/storage.mjs provision
node scripts/storage.mjs status
```

Confirm with `select count(*) from supabase_migrations.schema_migrations`
that the count equals the number of files in `supabase/migrations` (47 at
the C10 release candidate, latest `20260922120000`).

Do **not** run `supabase/seed.sql` against production: it holds reviewed
synthetic content for local development only (C10 §137–141; see the
production seed audit in the C10 report).

## 3. Create the owner (first Super Admin) — no public sign-up

1. Supabase dashboard → Authentication → Users → **Add user** → email =
   the owner's address, a long generated password, *Auto Confirm User* on.
   Give the password to the owner privately; it is changed at first login.
2. Mark the profile for first-login password change and run the one-shot
   bootstrap transaction (SQL editor, as `postgres`):

   ```sql
   update public.profiles set must_change_password = true, version = version + 1
   where id = '<user uuid>';
   select private.bootstrap_super_admin('<user uuid>'::uuid);
   ```

   The function refuses to run twice and refuses any target that is not a
   pending-MFA profile; it writes an actor-less audit marker and nothing
   else. (Locally the same path is `pnpm auth:bootstrap -- --email …`,
   which uses an invitation email instead.)
3. The owner signs in at `https://<domain>/admin/sign-in`, enrols the
   authenticator, chooses a new password, and lands on Overview. Staff &
   Access, System Health and Launch Readiness are visible only to the
   owner.

## 4. Deploy the application (Vercel or equivalent Node 24 host)

Environment (server scope unless marked public):

| Name | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | publishable key |
| `SUPABASE_SECRET_KEY` | server only | secret key |
| `INTAKE_RATE_LIMIT_SECRET` | server only | 32+ random characters; public forms refuse submissions in production without it |
| `RENZ_TASK_TOKEN` | server only | 32+ random characters; arms `POST /api/tasks/notifications-sweep` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | optional | Cloudflare Turnstile (recommended for the public forms) |
| `RENZ_CLIENT_PREVIEW` | — | **must be absent** |
| `RENZ_INTAKE_ALLOW_DEV_BYPASS` | — | **must be absent** (Launch Readiness and `/api/health` warn if set) |
| `RENZ_PUBLIC_CACHE_SECONDS`, `RENZ_LATEST_MIGRATION` | optional | leave unset when the repository (with `supabase/migrations`) is deployed |

Build settings: framework Next.js, Node 24, package manager pnpm 11.25.0
(pinned in `package.json` `packageManager`/engines), build command
`pnpm build`, output default. Security headers (CSP, HSTS, nosniff, frame
deny, referrer, permissions policy) are emitted by `next.config.ts`; HSTS
and `upgrade-insecure-requests` switch on automatically when
`NODE_ENV=production` and the Supabase URL is https.

Deploy the release-candidate commit; the platform builds and runs it.

## 5. Scheduler for timed notifications

Timed notifications (invoice due/overdue, stale drafts, ending
assignments…) are produced by an idempotent sweep. Wire one of:

- Vercel Cron: `{"crons":[{"path":"/api/tasks/notifications-sweep","schedule":"0 * * * *"}]}`
  in `vercel.json`; set `CRON_SECRET` to the same value as `RENZ_TASK_TOKEN`
  (Vercel sends it as `Authorization: Bearer …`). Vercel Cron issues GET by
  default while the route accepts POST — observe the first provider run;
  if it is refused, add a `GET` export delegating to the same handler
  (NOT TESTED in R1: no hosting). Details: `RENZ_R1_SCHEDULED_TASKS.md`.
- any external scheduler calling the endpoint hourly with the bearer token, or
- the owner's **Run sweep now** button in Notifications (manual fallback).

Launch Readiness shows the "Timed notification task endpoint armed" check.

## 6. First-run configuration by the owner (in the product, not by engineers)

1. Settings → Business: identity, public email, WhatsApp channel, location.
2. Settings → Legal: privacy notice and terms — publish.
3. Settings → Website: canonical base URL `https://<domain>`, SEO name and
   title template, default share image, brand logo; **Publish**.
4. Website → pages: review each page, publish.
5. Content: services, project studies, insights — publish what is approved.
6. Settings → Launch readiness: every required check green.
7. Settings → Website → Site mode: **Live** (until then every page is
   `noindex` and the preview banner shows).

## 7. Post-deploy verification (engineer + owner)

```
node scripts/c10-headers.mjs https://<domain>       # security headers
node scripts/wait-for-server.mjs https://<domain>/api/health
```

- `/api/health` → `"status":"ok"` with `migrations: ok`, `storage: ok`, `signing: ok`.
- Public home, a service page, a project page, `/sitemap.xml`, `/robots.txt`.
- Owner: sign in, Overview, create a test client → project → invoice →
  PDF → void; archive the test records; Staff & Access: create one real
  staff account.
- Public form: submit one test enquiry from a phone; it must appear under
  Leads within seconds; mark it spam or archive it.

## 8. Releasing a later version

1. Branch from `main`; run `pnpm c10:verify` locally (stop on the first failure).
2. Migrations are append-only and forward-only; never edit an applied file.
3. Deploy order: **database first** (`supabase db push`), then the app.
   Every migration since C4 is written to be compatible with the previous
   app version for the minutes between the two steps (additive columns,
   `create or replace function` with unchanged signatures) — check the
   release's migrations against this rule before pushing.
4. Publish the public configuration once if the release changed the
   projection (Launch Readiness says "unpublished changes").
5. Watch `/api/health` and the Notification Center for five minutes.
6. Roll back per `RENZ_ROLLBACK.md` if anything regresses.
