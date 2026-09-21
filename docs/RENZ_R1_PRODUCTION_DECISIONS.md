# RENZ R1 production decisions

R1 §4. Every decision a production deployment needs, with its state on
2026-09-21. **No owner decision was invented.** Where the repository already
records a recommendation it is shown as such; a recommendation is not a
decision. Sources: `docs/PHASE_1_DECISION_REGISTER.md` (G5 SAFE-DEFERRED),
`docs/RENZ_PRODUCTION_DEPLOYMENT.md`, `docs/RENZ_GO_LIVE_CHECKLIST.md`,
`docs/RENZ_C10_HARDENING_BACKLOG.md`.

| # | Decision | State | Detail |
| --- | --- | --- | --- |
| 1 | Application hosting provider | **REQUIRED FROM OWNER** | Phase 0 recommendation: Vercel (Node 24, Next.js 16). No account, token or project exists on this machine (`vercel` CLI absent; no `VERCEL_*` environment). Any Node 24 host that can run `next start` is compatible. |
| 2 | Database / Auth / Storage provider | **DECIDED (architecture)** | Supabase (Postgres, Auth with TOTP, Storage). Fixed by the codebase; not changing. The production **project** does not exist: no `SUPABASE_ACCESS_TOKEN`, `supabase projects list` refuses. |
| 3 | Deployment region | **REQUIRED FROM OWNER** | Recommendation: the Supabase region closest to Kigali with the lowest measured latency (candidates: `eu-central-1` Frankfurt, `af-south-1` Cape Town if offered for the chosen plan). Latency from Rwanda was never measured (roadmap item). App host region should match. |
| 4 | Public domain | **REQUIRED FROM OWNER** | None supplied. Nothing in the repository names a domain; the canonical base URL is owner-published configuration (Settings → Website). |
| 5 | `www` behaviour | **DECIDED (engineering default, owner may override)** | Apex is canonical; `www.` → 308 to apex. Implemented at the host/DNS layer, not in code, so it can be inverted without a release. |
| 6 | Owner production email (first Super Admin) | **REQUIRED FROM OWNER** | The public business email in configuration is `renzconstruuction@gmail.com` (client-supplied spelling, never auto-corrected). Whether the same mailbox is the owner's sign-in identity is an owner decision — flagged OWNER CONFIRMATION REQUIRED. |
| 7 | Email / password-reset strategy | **DECIDED (default B, owner may upgrade to A)** | B — owner/operator-assisted: the owner issues a temporary password from Staff & Access; the platform operator resets the owner's own password / removes a lost authenticator from the Supabase dashboard. No SMTP exists; the product shows no "check your email" flow (verified R1). A — transactional email (custom SMTP in Supabase Auth) is optional and only needed if the owner wants self-service reset. |
| 8 | Backup location | **REQUIRED FROM OWNER** | Proposal: Supabase daily backups (plan-dependent) plus an encrypted off-site copy of `supabase db dump --data-only` and the three buckets in the owner's own cloud drive/object store. |
| 9 | Backup retention | **REQUIRED FROM OWNER** | Proposal: 30 daily, 12 monthly. |
| 10 | Scheduler mechanism | **REQUIRED FROM OWNER (follows #1)** | One hourly job: `POST /api/tasks/notifications-sweep` with `Authorization: Bearer $RENZ_TASK_TOKEN`. Vercel Cron needs a small adapter (it sends `CRON_SECRET`, see `docs/RENZ_R1_SCHEDULED_TASKS.md`); any external scheduler works as is. Manual fallback exists in the product ("Run sweep now"). |
| 11 | Turnstile / anti-abuse | **DECIDED (default: server-side controls only) — owner may add Turnstile** | Proven server-side controls: per-visitor HMAC rate limits, signed form tokens, honeypot, minimum interaction window, idempotency nonce, 10 MB sniffed uploads, origin checks. Cloudflare Turnstile is supported by the code (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`) and recommended; requires a Cloudflare account (owner). |
| 12 | Analytics provider | **DECIDED (default: none / first-party only)** | First-party privacy-safe daily counters ship without any provider or cookie. A third-party provider is optional (C9 adapter for the published provider shape) and would introduce the consent layer. |
| 13 | Error monitoring provider | **DECIDED (default: none)** | Host and Supabase logs plus `/api/health` and the System Health panel are the incident source (`RENZ_INCIDENT_RESPONSE.md`). A vendor (e.g. Sentry) is optional post-launch; not forced for R1. |
| 14 | Staging / release-rehearsal environment | **DECIDED (engineering)** | Three environments: LOCAL (this machine), STAGING (a separate Supabase project + preview deployment for destructive rehearsals), PRODUCTION. Destructive restore rehearsals only ever target STAGING/scratch. Requires two Supabase projects (free tier allows two). |
| 15 | Site mode at handover | **DECIDED** | The production candidate stays in **Preview** (noindex) until R2 owner acceptance; only the owner switches to Live. |
| 16 | Data-protection contact / incident roles | **REQUIRED FROM OWNER** | Named in the privacy notice and the incident runbook. |
| 17 | Malware scanning for intake attachments | **DECIDED (default: manual review)** | Attachments stay `pending_review` until staff mark them safe; a scanner vendor is optional post-launch. |
| 18 | Notification / audit retention | **NOT APPLICABLE for R1** | Nothing is deleted; revisit when volume justifies (backlog items 10–11). |

## The single blocking decision

Everything in R1 §9–§48 (provisioning, deployment, cloud rehearsals) needs
**#1 hosting + a Supabase organisation with access credentials** to exist.
Until the owner (or their delegate) creates the accounts — or supplies a
`SUPABASE_ACCESS_TOKEN` and a hosting token to the operator — no cloud
step can be executed, and per `AGENTS.md` no provider account may be
created on the owner's behalf without explicit approval.
