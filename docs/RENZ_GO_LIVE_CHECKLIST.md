# RENZ go-live checklist

C10 §148, §187. Tick every line before the site is switched to **Live**.
Items marked (owner) are done in the product by RENZ; items marked
(operator) need the engineer. State at the C10 release candidate
(2026-09-20): nothing below the "Engineering evidence" block has been
done — no hosting exists.

## Engineering evidence (done, local)

- [x] `pnpm c10:verify` green twice in a row on the release-candidate commit (see the C10 report §"Full verification")
- [x] pgTAP 20 files / 1,313 assertions, vitest 177, Playwright 15 suites, security probe 15 checks, headers/CSP checks
- [x] Secret scan on committable files clean; `pnpm audit --prod` no known vulnerabilities
- [x] Backup → reset → restore rehearsed locally with identical counts
- [x] Release candidate committed locally: `chore: prepare renz production release candidate` (not pushed)

## Decisions (owner) — all DECISION REQUIRED

- [ ] Hosting provider + billing owner; region; production domain
- [ ] Owner email for the first Super Admin (taken exactly as written by the client)
- [ ] SMTP for password-reset email (or accept operator-assisted resets)
- [ ] Backup retention/location; who holds the platform operator role
- [ ] Cloudflare Turnstile account (recommended for public forms)
- [ ] Third-party analytics provider, if any (first-party aggregates work without one)

## Platform (operator)

- [ ] Supabase project created; sign-ups disabled; TOTP enabled; Site URL + redirect list set
- [ ] `supabase db push` applied 47 migrations; `db lint` clean; buckets provisioned (`storage.mjs provision`)
- [ ] `seed.sql` NOT applied
- [ ] Owner user created (auto-confirmed), `must_change_password = true`, `private.bootstrap_super_admin` run once
- [ ] App deployed from the release-candidate commit with the environment table in `RENZ_PRODUCTION_DEPLOYMENT.md`; `RENZ_CLIENT_PREVIEW` and `RENZ_INTAKE_ALLOW_DEV_BYPASS` absent
- [ ] DNS: apex + www → host; TLS active; `node scripts/c10-headers.mjs https://<domain>` passes
- [ ] `/api/health` → `ok` (migrations, storage, signing all ok)
- [ ] Notification sweep scheduler wired and `Timed notification task endpoint armed` green
- [ ] First database backup taken and stored off-site; restore procedure tested against the cloud project once

## Product configuration (owner)

- [ ] Signed in; authenticator enrolled; password changed
- [ ] Settings → Business: identity, public email (`renzconstruuction@gmail.com` as supplied), WhatsApp, location, hours
- [ ] Settings → Legal: privacy notice + terms published (privacy covers online enquiries and analytics)
- [ ] Settings → Website: canonical URL, SEO name/title template, share image, logo — Published
- [ ] Website pages reviewed and published; navigation and footer checked on a phone
- [ ] Services published; project studies with real evidence and client permission only; insights reviewed
- [ ] Staff & Access: each staff member created with the right template; temporary passwords handed over privately; each has completed first sign-in
- [ ] Document defaults: bank/payment instructions, invoice numbering prefix, VAT rate checked with the accountant
- [ ] Settings → Launch readiness: every required check green
- [ ] Settings → System → Online intake on

## Rehearsal on production before Live (owner + operator)

- [ ] Public enquiry from a phone → appears under Leads → assigned → converted to client → project → invoice issued → PDF opened → share link opened from another device → payment recorded → invoice voided → records archived
- [ ] Staff member with the Finance template cannot reach Website or Staff & Access; Content Editor cannot reach Finance
- [ ] Owner disables and reactivates a test staff account
- [ ] `RENZ_ROLLBACK.md` § 1 executed once on purpose (promote previous build, then re-promote)

## Switch

- [ ] Settings → Website → Site mode → **Live**; robots now `index, follow`; sitemap reachable
- [ ] Submit the sitemap to Google Search Console (optional, owner's account)
- [ ] Watch `/api/health`, Notifications and Analytics for the first day

## Exact items remaining before go-live

Copied from the C10 report §118; kept here so the list has one home.

1. Every DECISION REQUIRED line above.
2. Cloud rehearsal of backup/restore and of the app rollback (both are only local-proven).
3. A scheduler adapter if Vercel Cron is chosen (it sends `CRON_SECRET`, the endpoint expects a bearer token).
4. Optional: Turnstile keys; third-party analytics adapter for the chosen provider.
