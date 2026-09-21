# RENZ environment variables

R1 §7. Every variable the application, its scripts or its tests read, with
classification, where it is configured, who needs it, what happens when it
is missing, and whether it can be rotated. `.env.example` mirrors the
application set. Values never appear in this repository, logs, screenshots
or reports.

## Application (read by the running server)

| Variable | Class | Purpose | Configured at | Needed by | Missing / wrong → | Rotation |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC SAFE · REQUIRED | Supabase project URL (browser + server) | host env (public scope) | everyone | server client refuses to construct; `/api/health` `auth: blocked` (503); sign-in impossible | change with the project; not a secret |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | PUBLIC SAFE · REQUIRED | Browser/server key limited by RLS | host env (public) | everyone | as above | yes (Supabase API keys); redeploy |
| `SUPABASE_SECRET_KEY` | SERVER SECRET · REQUIRED | Service-role key: Auth Admin (staff creation, bans, password resets), health probes, signed media, service tasks | host env (server only) | platform operator | health `blocked`; staff creation, media signing, health probes fail closed | yes — rotate in Supabase, update host, restart (`RENZ_INCIDENT_RESPONSE.md` §C) |
| `INTAKE_RATE_LIMIT_SECRET` | SERVER SECRET · REQUIRED (prod) | HMAC key for visitor identity hashes and signed form/upload tokens (≥16 chars) | host env (server) | operator | production public forms refuse submissions; health `blocked`; local dev falls back to a fixed dev value | yes — in-flight form tokens become invalid for minutes |
| `RENZ_TASK_TOKEN` | SERVER SECRET · OPTIONAL (required for a scheduler) | Bearer for `POST /api/tasks/notifications-sweep` (≥32 chars) | host env (server) + scheduler | operator | endpoint answers 404; timed notifications only via the owner's "Run sweep now" | yes — update both host and scheduler |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | PUBLIC SAFE · OPTIONAL | Cloudflare Turnstile widget on public forms | host env (public) | owner (Cloudflare) | widget absent; server-side controls still apply | yes |
| `TURNSTILE_SECRET_KEY` | SERVER SECRET · OPTIONAL | Server-side Turnstile verification | host env (server) | operator | verification skipped when the site key is also absent; set only one → Launch Readiness warns | yes |
| `RENZ_PUBLIC_CACHE_SECONDS` | OPTIONAL | Public content cache window (default 60) | host env | operator | default 60 s | n/a |
| `RENZ_LATEST_MIGRATION` | OPTIONAL | Latest migration version when `supabase/migrations` is not deployed with the app (health "Database up to date") | host env | operator | health migration check reports "warning: not checked" only if the folder is also absent | n/a |
| `RENZ_CLIENT_PREVIEW` | LOCAL ONLY / TEST ONLY | Labelled client-review experience | never in production | — | if `true` in a production build → health `blocked` (503) | n/a |
| `RENZ_INTAKE_ALLOW_DEV_BYPASS` | TEST ONLY | Lets the browser-test server accept intake without Turnstile / production posture | Playwright web server only | — | if `true` in a production build → health `blocked` (503); Launch Readiness warning | n/a |
| `NODE_ENV` | set by the platform | `production` on the host | host | — | — | n/a |

## Scripts and tests only (never on the host)

| Variable | Class | Used by |
| --- | --- | --- |
| `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` | LOCAL ONLY | local scripts (`s4-local.mjs` status parsing; legacy aliases) |
| `RENZ_DB_CONTAINER` | LOCAL ONLY | `c10-scale.mjs` |
| `RENZ_E2E_PORT`, `RENZ_E2E_PUBLISHED_PROJECT`, `RENZ_E2E_SKIP_CONTENT_SEED`, `CI` | TEST ONLY | Playwright harness |
| `RENZ_BASE`, `RENZ_SHOT_*`, `RENZ_AXE_NODES`, `RENZ_WAIT`, `RENZ_D1_CAPTURE_PASS`, `RENZ_DOC_IDS` | LOCAL ONLY | screenshot / audit scripts |
| `RENZ_PUBLISH_EMAIL`, `RENZ_PUBLISH_PASSWORD`, `RENZ_PUBLISH_TOTP` | LOCAL ONLY | `content-publish-insights.mjs` (operator's own local actor; never a production credential) |
| `HIGGSFIELD_CLI` | LOCAL ONLY | D1.7 image generation |

## Not environment variables (owner-published configuration)

Canonical site URL, business identity, contact channels, SEO defaults,
document defaults, legal pages, site mode: Settings in the product,
published as a configuration snapshot. `NEXT_PUBLIC_SITE_URL` is **not**
read by the app (removed from the health check in C10).

## Production checklist for variables

- Server-scope secrets are set on the host only; nothing secret starts
  with `NEXT_PUBLIC_`.
- `RENZ_CLIENT_PREVIEW` and `RENZ_INTAKE_ALLOW_DEV_BYPASS` absent.
- `/api/health` must be `ok` after deployment (503 otherwise).
- Rotation order for the secret key: rotate in Supabase → update host →
  restart → verify health → revoke the old key.
