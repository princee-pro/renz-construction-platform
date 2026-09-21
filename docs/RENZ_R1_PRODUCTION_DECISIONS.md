# RENZ R1 production decisions

R1 §4. Every decision a production deployment needs. **Updated 2026-09-21
after the owner approved the infrastructure decisions** ("RENZ R1
INFRASTRUCTURE DECISIONS — OWNER APPROVED"); the first version of this
table (same day, before the approval) listed eight of these as REQUIRED
FROM OWNER. Sources: `docs/PHASE_1_DECISION_REGISTER.md` (G5 SAFE-DEFERRED),
`docs/RENZ_PRODUCTION_DEPLOYMENT.md`, `docs/RENZ_GO_LIVE_CHECKLIST.md`,
`docs/RENZ_C10_HARDENING_BACKLOG.md`.

| # | Decision | State | Detail |
| --- | --- | --- | --- |
| 1 | Application hosting provider | **DECIDED: Netlify Free** | `netlify.toml` + `@netlify/plugin-nextjs` (OpenNext adapter, Node 24, pnpm via corepack). Not Vercel Hobby (commercial use), not Cloudflare Pages + Render (no split). Persistent state never on the Netlify filesystem (all state is Supabase). Account + site: REQUIRED FROM OWNER to create/grant. |
| 2 | Database / Auth / MFA / Realtime / Storage | **DECIDED: Supabase Free** | Two projects: project 1 = **staging** (destructive rehearsals), project 2 = **production**. No migration away from Supabase; no Neon. Organisation access: REQUIRED FROM OWNER (invite the operator or provide a `SUPABASE_ACCESS_TOKEN`). |
| 3 | Deployment region | **DECIDED (staging): eu-central-1 Frankfurt** — production region pending benchmark | Measure real Netlify-function-to-Supabase latency on staging before creating production; only then choose the production region. |
| 4 | Public domain | **DECIDED: Cloudflare** (Registrar preferred where the TLD is supported); domain name itself REQUIRED FROM OWNER | DNS at Cloudflare; the Netlify custom domain uses Netlify-managed TLS. |
| 5 | `www` behaviour | **DECIDED (engineering default)** | Apex canonical; `www.` → 308 to apex (Netlify primary-domain redirect); no loops. |
| 6 | Owner production email (first Super Admin) | **REQUIRED FROM OWNER** | Public business email stays `renzconstruuction@gmail.com` as supplied (OWNER CONFIRMATION REQUIRED for the spelling). Optional after domain activation: Cloudflare Email Routing → the existing RENZ Gmail. |
| 7 | Email / password-reset strategy | **DECIDED: owner/operator-assisted** | Temporary passwords issued by the owner from Staff & Access; operator resets the owner via the Supabase dashboard. No SMTP, no "check your email" flow (the sign-in screen and Security help say so). |
| 8 | Backup location | **DECIDED: private Cloudflare R2 Standard bucket** | Written by GitHub Actions (`.github/workflows/backup.yml`): encrypted `pg_dump` (age), SHA-256 checksum, rolling retention. Bucket + API token + age key pair: REQUIRED FROM OWNER/operator to create. |
| 9 | Backup retention | **DECIDED: rolling — 30 daily, 12 monthly** | Enforced by the workflow's prune step. Restore rehearsal mandatory (`RENZ_BACKUP_RESTORE.md`). |
| 10 | Scheduler mechanism | **DECIDED: Cloudflare Workers Free cron** | `infra/cloudflare/notification-sweep/` (hourly POST with the bearer token). Worker deploy: REQUIRED FROM OWNER/operator (Cloudflare account). |
| 11 | Turnstile / anti-abuse | **DECIDED: Cloudflare Turnstile Free** | Already supported (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`); server-side controls remain authoritative; a visitor whose JS fails is never blocked solely for that. Keys: REQUIRED FROM OWNER/operator. |
| 12 | Analytics provider | **DECIDED: Cloudflare Web Analytics** | Cookieless beacon adapter added (`provider = cloudflare`, migration `20260923110000`); CSP allows `static.cloudflareinsights.com`; **no cookie banner** for it. Site token: REQUIRED FROM OWNER/operator. |
| 13 | Error monitoring provider | **DECIDED: none** | Netlify function logs + Supabase logs + `/api/health` + System Health. |
| 14 | Environments | **DECIDED** | LOCAL / STAGING (Supabase project 1 + Netlify deploy preview or branch deploy) / PRODUCTION (Supabase project 2 + Netlify production). Destructive restore rehearsals only on STAGING/scratch. |
| 15 | Site mode at handover | **DECIDED** | Preview (noindex) until R1 and R2 gates pass; only the owner switches to Live. |
| 16 | Data-protection contact / incident roles | **REQUIRED FROM OWNER** | Named in the privacy notice and the incident runbook. |
| 17 | Malware scanning for intake attachments | **DECIDED (default: manual review)** | Attachments stay `pending_review` until staff mark them safe. |
| 18 | Notification / audit retention | **NOT APPLICABLE for R1** | Nothing is deleted; revisit with volume. |
| 19 | Official slogan | **DECIDED: "Brick by Brick."** | Owner-editable (Settings → Business → Slogan), seeded once by migration `20260923100000`, read by the opener and footer from the published identity. "From land to landmark." remains the homepage/campaign headline (owner-editable page copy). |

## What still blocks execution

Accounts and access, not decisions: a Netlify site, two Supabase projects
(organisation access), a Cloudflare account (domain, Turnstile, Web
Analytics, Workers, R2), a GitHub repository for the backup workflow (the
code has never been pushed), and the owner's production email. Every cloud
step of the R1 brief unblocks together once these exist; per `AGENTS.md`
none may be created without explicit approval.
