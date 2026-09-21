# RENZ scheduled tasks

R1 §31–§33. Every job that must run on a schedule in production, with its
authorization and failure behaviour. There are two; only the first is a
runtime job.

## 1. Timed notification sweep

| | |
| --- | --- |
| Purpose | Produces the deterministic "timed" notifications (invoice due / overdue, stale drafts, assignments ending, materials due, proposal stale…) from current record state. Event-driven notifications do not depend on it. |
| Cadence | Hourly (C9 contract; Launch Readiness turns the check green when a run landed within 26 h). |
| Endpoint | `POST /api/tasks/notifications-sweep` → `public.run_notification_sweep('scheduled')` as service_role. |
| Alternatives | `pnpm notifications:sweep` (operator machine, service key) · Notifications → **Run sweep now** (owner, in the product). |
| Authorization | `Authorization: Bearer $RENZ_TASK_TOKEN` (32+ chars). Constant-time comparison. 404 when the token is not configured at all, 401 on a missing/forged bearer (proven by the C10 security probe, check 9). Never exposed to the browser; never in `NEXT_PUBLIC_*`. |
| Idempotency | One row per (recipient, dedupe key): a repeated run creates nothing new (pgTAP 017; c9 E2E "timed sweep … is idempotent"). Each run is recorded in `notification_sweep_runs`. |
| Failure behaviour | The endpoint returns 500 with `{ ok: false }` and no internals; nothing partial is written (one SQL transaction). Launch Readiness shows the scheduler check as warning after 26 h without a run; the owner can trigger it manually. |
| Owner-approved wiring | **Cloudflare Workers Free cron** — `infra/cloudflare/notification-sweep/worker.mjs` (`5 * * * *`) POSTs with the bearer token; secret set with `wrangler secret put RENZ_TASK_TOKEN`; app origin in `wrangler.toml`. The Worker also answers `POST /run` (same bearer) for a manual check. Provider-triggered execution: **NOT TESTED** until the Worker is deployed. |
| Other hosts | Any scheduler that can `POST` with a bearer header (GitHub Actions cron, Supabase pg_cron + `net.http_post`). |

## 2. Intake upload-session cleanup

| | |
| --- | --- |
| Purpose | Removes expired, never-submitted upload sessions and their quarantine objects (`lead-intake` bucket); reports orphans. Attachments of submitted leads are never touched. |
| Cadence | Weekly is enough; not time-critical (expired sessions are already unusable). |
| Job | `pnpm intake:cleanup` (report) / `pnpm intake:cleanup:purge` (operator machine with the service key). No HTTP endpoint on purpose. |
| Authorization | Service key on the operator's machine only. |
| Idempotency | Yes — only rows/objects past expiry are affected; a repeat run finds nothing. |
| Failure behaviour | Script exits non-zero; nothing partial (per-session delete). |

## Not scheduled (by design)

- Backups: provider-managed (Supabase daily) plus the operator's dump
  (`RENZ_BACKUP_RESTORE.md`); not an application job.
- Analytics retention: bounded in the recorder itself (daily counters).
- Notification archive retention: none (backlog item 10).

## Rehearsal status (R1)

- Manual trigger, repeated trigger, idempotency, failure handling: proven
  locally by pgTAP 017, `verify-c9.mjs` (idempotent timed sweep) and the
  c9 browser suite (Settings → Run sweep now).
- Provider-triggered execution: **NOT TESTED** — no hosting exists.
