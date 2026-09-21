# RENZ R1 Production Provisioning Report

Date: 2026-09-21. Repository `C:\Users\princ\source\repos\C-website`.
Sections follow the R1 brief §83. "BLOCKED" means the step needs a cloud
resource or credential that does not exist on this machine; "NOT TESTED"
means it could have been attempted but was not, with the reason.

## 1. Status

**R1 PARTIAL — cloud half BLOCKED.** Every cloud-independent R1 obligation
is done and green (§3–§7, §22–§23, §27–§30 policy, §31, §50, §53–§57,
§60–§69, §77–§78). Nothing in §9–§21, §24–§26, §33–§48, §51, §70–§76 could
be executed: there is no hosting account, no Supabase organisation access
token, no domain and no production owner email, and `AGENTS.md` forbids
creating provider accounts without explicit approval. The single blocking
decision is in §80. Nothing was deployed, pushed or switched live.

## 2. Current commit

Start of R1: `02e1a54 chore: prepare renz production release candidate`
(HEAD, clean tree, verified). End of R1: `RC-R1-COMMIT` (see §78).

## 3. C10 verification

HEAD was verified before any change: `git status` clean, `git log -5`
matches, secret scan clean. The full `pnpm c10:verify` sequence (31 steps)
was re-run on the final R1 tree — results in §78.

## 4. CR1 flake root cause

**Application timing.** Reproduced deterministically with a probe
(`scripts/_tmp-flake.mjs`, removed after use): a published custom page
linked from the navigation, `page.goto(editor)` followed immediately by a
click on **Unpublish** → the native `confirm()` never fired in **4/4**
attempts at 1× CPU, 4/4 at 4×, 4/4 at 8×. With a 2.5 s wait before the
click: 0/4 lost at 1×, 1/4 at 4×, 4/4 at 8×. Mechanism: the page editor is
a large client component; `load` fires before React has hydrated it, and
a `type="button"` element's `onClick` does not exist until hydration —
the click is silently dropped. Playwright only waits for
visible/stable/enabled, never for hydration. Not Playwright timing, not
the dialog, not orchestration: a real user on a slow phone loses the same
click.

## 5. CR1 flake repair

`src/components/admin/ui/button.tsx` (the shared admin `Button`): a
`type="button"` with an `onClick` renders **disabled** in server HTML and
enables at hydration (`useSyncExternalStore` hydration flag). Submit
buttons stay enabled (server-action forms work before hydration). After
the fix the same probe lost **0/4** clicks at 1×, 4× and 8× with an
immediate click. Playwright waits for `enabled`, so every suite is
deterministic without retries, skips or sleeps; a user sees a briefly
dimmed button instead of a dead one. Residual: 42 raw `<button onClick>`
elements (tab strips, picker rows) keep the old behaviour — a lost tab
click is harmless (documented in §79). CR1 passed 10/10 in the R1 gate on
the first attempt (§78).

## 6. Production decisions

`docs/RENZ_R1_PRODUCTION_DECISIONS.md` — 18 rows: 8 DECIDED (architecture
or engineering default), 8 REQUIRED FROM OWNER, 1 NOT APPLICABLE, 1
follows hosting.

## 7. Owner decisions still required

Hosting provider + billing; deployment region; public domain; owner
production email (and confirmation of `renzconstruuction@gmail.com`);
backup location and retention; scheduler mechanism (follows hosting);
data-protection contact / incident roles; optional: Turnstile, SMTP for
self-service reset, analytics provider, error monitoring.

## 8. Hosting environment

BLOCKED — none selected. Preparation is generic (`next start`, Node 24)
with a Vercel-specific appendix in `RENZ_PRODUCTION_DEPLOYMENT.md`.

## 9. Region

BLOCKED — owner decision; recommendation recorded (nearest Supabase region
to Kigali; latency not measured).

## 10. Production database

BLOCKED — no Supabase organisation token (`supabase projects list` →
"Access token not provided"). Local proof only: 47 migrations apply to an
empty database, pgTAP 1,313 pass (§78).

## 11. Migration result

Local: empty → 47 migrations → expected schema → pgTAP 20 files / 1,313
assertions → `db lint` clean → generated types identical → owner bootstrap
path exercised by the S3/C10 suites. Cloud: BLOCKED.

## 12. Production seed result

Policy set and enforced by documentation: `seed.sql` is local-only; the
public audit script flags SYNTHETIC / test text on public pages. Cloud
seed: BLOCKED.

## 13. Storage configuration

BLOCKED (cloud). Local: three buckets provisioned by `storage.mjs`,
signed delivery proven (12 signed media links answered 200 in the public
audit; WebKit/Firefox/Chromium loaded every image).

## 14. Auth configuration

BLOCKED (cloud). Requirements written (sign-ups off, TOTP on, Site URL and
redirect allow-list `https://<domain>/admin/**`).

## 15. Owner bootstrap

BLOCKED (cloud). Local path proven in C10; production steps in
`RENZ_PRODUCTION_DEPLOYMENT.md` §3 (dashboard user + `must_change_password`
+ one-shot `private.bootstrap_super_admin`). No public bootstrap endpoint
exists.

## 16. Owner MFA

BLOCKED (cloud). Local: proven by s5a/c10 suites and the C10 security
probe (AAL1 sees nothing).

## 17. Staff lifecycle cloud test

BLOCKED. Local: `c10-staff-access` 3/3 in the R1 gate.

## 18. Permission cloud test

BLOCKED. Local: 151 facades × anonymous/AAL1 refused (security probe 15/15
in the gate).

## 19. Application deployment

BLOCKED. Production build proven locally (bundle scan §23).

## 20. Candidate URL

None.

## 21. Health endpoint

Local production build: `/api/health` returns categories only; **503
`blocked`** on the test server because the test-only switches are set —
the designed fail-fast (§72). Degraded behaviour: each probe has a 4 s
timeout and reports "Timed out" (C10).

## 22. Environment-variable audit

`docs/RENZ_ENVIRONMENT_VARIABLES.md`: 12 application variables classified
(PUBLIC SAFE / SERVER SECRET / REQUIRED / OPTIONAL / LOCAL ONLY / TEST
ONLY) with purpose, location, owner, failure behaviour and rotation; 20
script/test-only variables listed; `.env.example` matches.

## 23. Secret/bundle scan

`scripts/r1-bundle-scan.mjs`: 93 client/prerender files (3.0 MB), 11
markers (service-role key, intake secret, task token, `service_role`,
`SUPABASE_SECRET_KEY`, postgres/smtp URLs, localhost/127.0.0.1/:3000/:3100,
synthetic passwords and TOTP secrets), 0 source maps → **passed**. Allowed
by design: the configured `NEXT_PUBLIC_SUPABASE_URL` and supabase-js's
internal `localhost:9999` placeholder.

## 24. Domain preparation

BLOCKED — no domain. Strategy recorded (apex canonical, `www` → 308, no
loops).

## 25. HTTPS

BLOCKED. HSTS/upgrade-insecure-requests are gated on https production
(C10).

## 26. Security headers

Local production build: CSP, nosniff, frame DENY, referrer, permissions
policy on every route (`c10-headers.mjs` in the gate); 0 CSP violations
(`c10-csp-check.mjs`). Cloud: BLOCKED.

## 27. Anti-abuse protection

Server-side controls proven locally (C8 suite: rate limit, form session,
upload security; security probe 15/15). Turnstile: decision #11, not
configured. Cloud burst test: BLOCKED.

## 28. Email/reset strategy

**Path B (owner/operator-assisted) is the shipped default.** No SMTP; no
"check your email" UI exists (verified by grep and by the sign-in screen).
R1 made the path explicit in the product: the sign-in/MFA support line
now reads "Forgotten your password? The owner can issue you a temporary
one." and the Security help drawer explains password and authenticator
recovery. Path A remains available if the owner configures SMTP.

## 29. Scheduler

`docs/RENZ_R1_SCHEDULED_TASKS.md`: one runtime job (hourly notification
sweep, bearer-token protected, idempotent, manual fallback) and one
operator job (intake upload-session cleanup). Vercel: `CRON_SECRET` =
`RENZ_TASK_TOKEN`; GET-vs-POST to be observed on the first provider run.

## 30. Scheduler proof

Local: idempotency and repeated execution proven (pgTAP 017, verify-c9,
c9 suite "Run sweep now"). Provider-triggered execution: BLOCKED.

## 31. Realtime cloud proof

BLOCKED. Local: c4/c5/c6/c8/c9 two-session tests green in the gate.

## 32. Concurrency cloud proof

BLOCKED. Local: two-actor stale saves refused in c4/c5/c6/c7/c8/cr1
(including the C10-strengthened "B edits first" case).

## 33. Lead flow proof

BLOCKED (cloud). Local: c8 8/8.

## 34. Client/project proof

BLOCKED (cloud). Local: c4 5/5.

## 35. Finance proof

BLOCKED (cloud). Local: c5 5/5, verify-c5.

## 36. Invoice PDF cloud proof

BLOCKED. Local: PDF generated and reviewed in C10; c5/c6 download the
hosted PDFs. Serverless PDF rendering (pdfkit + fonts) is explicitly
unproven in the cloud — first cloud task.

## 37. Invoice sharing proof

BLOCKED (cloud). Local: c5 share/revoke; forged tokens constant 404.

## 38–40. CMS service / project / insight proof

BLOCKED (cloud). Local: cr1 10/10 (service #6, project #7, insight
lifecycle) in the gate.

## 41. Navigation/footer proof

BLOCKED (cloud). Local: cr1 globals/footer test, c7 navigation test.

## 42. Media upload proof

BLOCKED (cloud). Local: cr1 media library test.

## 43. Media delivery proof

BLOCKED (cloud). Local: 12 signed media links 200 (public audit); three
browsers loaded every image without a failed request.

## 44. Cache invalidation

BLOCKED (cloud timing). Local: publish → public within the 5 s test window
(c7/cr1); production default window 60 s.

## 45. Cloud backup

BLOCKED. Local dump procedure and script exist (`backup.mjs`).

## 46. Scratch restore

BLOCKED. Local restore rehearsal (C10) found and fixed five pitfalls
including sequences; post-restore sign-in verified locally.

## 47. Storage recovery

BLOCKED / NOT PROVEN. Documented (bucket copy); not rehearsed.

## 48. Application rollback

BLOCKED. Procedure in `RENZ_ROLLBACK.md`.

## 49. Database rollback considerations

Forward-only migrations; every C10 migration is additive; no migration at
the RC makes application rollback unsafe (`RENZ_ROLLBACK.md` §2).

## 50. Network failure tests

**Done (was NOT TESTED in C10).** `tests/e2e/r1-network-failure.spec.ts`,
3/3: Contact form offline → inline "We could not reach RENZ right now, so
nothing was sent…", no reference, message text kept → online → one lead;
Start-a-Project wizard offline at "Check and send" → same → one lead;
Admin business-profile save offline → "The server could not be reached, so
nothing was saved…", edits kept, no route error boundary → online → saved.
**Defect found and fixed:** before R1 an offline submit threw the server
action's network error into the route error boundary ("This page could
not load") and discarded the visitor's form. Fix: `guardAction` /
`guardIntakeAction` wrap every `useActionState` server action (94 call
sites; the three auth forms keep their own small state and show the retry
boundary without data loss). Unit tests `tests/unit/r1-network-guards.test.ts`.

## 51. Slow-network tests

Chromium, 400 kbit/s + 400 ms latency, 390 px: h1 visible after 3.7 s
(Home, behind the opener), 1.1 s (Projects), 1.2 s (project detail); no
blank viewport (screenshots `.playwright/screenshots/r1/slow_*.png`).
Cloud: BLOCKED.

## 52. Physical mobile test

NOT TESTED — no phone on the network and no externally reachable
deployment.

## 53. Screen-reader test

NOT TESTED — no screen reader was run (Windows Narrator/NVDA were not
exercised in this session). Remains a manual item for R2.

## 54. Forced-colors test

Chromium `forced-colors: active` emulation: Home header/nav, contact form
with focus, admin sign-in with focus (screenshots `forced-*.png`).
**Two defects fixed:** (1) form controls signalled focus by border colour
only — under forced colours the ring vanished (`outline: none`); a global
rule now draws a `Highlight` outline on every focusable element (measured:
outline solid 3 px on the contact field and the sign-in button); (2) the
brand opener rendered as a blank white sheet for ~1.4 s — it is now
bypassed under forced colours like reduced motion. Gallery dialog
screenshot: NOT captured (selector did not match; the dialog is covered by
the s9bp keyboard test).

## 55. Cross-browser smoke

Local production build, 7 critical paths (Home, Services, Projects, project
detail, Contact, Admin sign-in shell, forged invoice share → 404):
**Chromium, Firefox 1543 and WebKit 2359** — every path 200/404 as
expected, h1 present, 0 page errors, 0 failed requests (cancelled
prefetches excluded). Cloud: BLOCKED.

## 56. Performance

Local production build, 1440 px, decoded sizes: Home LCP 1.24 s (opener),
CLS 0.000, JS 730 KB, images 2.6 MB; Projects LCP 0.40 s, JS 730 KB, images
1.8 MB; project detail LCP 0.34 s, images 0.96 MB; Contact LCP 0.45 s, JS
1.1 MB (client-side intake validation), images 238 KB. Findings: image
weight on Home/Projects is the D1 media set (12 studies) and the main
budget item for the cloud (CDN + `next/image` cache); JS on Contact is the
known C8 wizard cost (backlog 24). Lighthouse: NOT RUN (not installed);
metrics come from PerformanceObserver.

## 57. Logging audit

`scripts/r1-log-audit.mjs` over 94 local run logs (4,095 lines): no
service-role key, intake secret, synthetic password/TOTP secret, bearer
token, JWT, refresh token, temporary-password line, raw share token or
non-synthetic email → **passed**. Cloud logs: BLOCKED.

## 58. Error observability

Decision #13: none selected; host + Supabase logs, `/api/health` and the
System Health panel are the incident source.

## 59. Analytics decision

Decision #12: first-party privacy-safe counters only; no provider.

## 60. Cookie behavior

No non-essential cookies without a third-party provider → no banner
(verified: consent layer only mounts for a published provider, c9 suite).

## 61. SEO

Owner-published canonical/SEO; `noindex` everywhere in Preview, admin /
auth / share routes always `noindex` (public audit).

## 62. Robots

Preview mode: `robots.txt` `Disallow: /`; every public page `noindex`
(public audit, 43 paths). Live mode switches to index for public pages
only (c7 suite).

## 63. Sitemap

Preview: `sitemap.xml` present and empty (correct); Live: public routes
only, never admin/i/po/preview (audit rule).

## 64. Broken-link crawl

Local production build: 43 internal paths crawled from Home, 0 × 404/5xx,
0 redirect loops, 12 signed media links 200, Staff Login link present,
six unknown-record paths → real 404 without stack traces.

## 65. WhatsApp

0 `tel:` links; every WhatsApp link is `https://wa.me/…` (public audit).

## 66. Business email confirmation status

`renzconstruuction@gmail.com` unchanged (spelling as supplied). **OWNER
CONFIRMATION REQUIRED** before Live (go-live checklist).

## 67. Evidence/provenance review

Unchanged: every study carries "Concept study" / "Rwanda context concept
study" and "Generated concept visual / not RENZ project evidence" labels
(s6a/s9ap/s9bp assert them; public audit allows this wording).

## 68. Production content review

Public audit forbids lorem/placeholder/TODO/debug/staging/localhost/
:3000/:3100/@example.test/SYNTHETIC/"Application foundation" on public
pages → 0 hits on 43 paths. "PREVIEW" badge is the site-mode banner and
disappears in Live mode.

## 69. Plain-English review

Only the sign-in support line and the Security help were touched (recovery
path). No other copy changed (D1.6 rewrite stands).

## 70. Public visual QA

Cloud: BLOCKED. Local production-build captures exist from C10 and the R1
smoke (`.playwright/screenshots/r1/`).

## 71. Admin visual QA

Cloud: BLOCKED. Local C10 matrix stands (66 checks).

## 72. System Health

Local production build reports real dependencies; on the test server
"Test-only switches absent" is `blocked` by design. Cloud: BLOCKED.

## 73. Admin guidance production audit

Help drawer, Getting started and System Health contain no localhost, CLI,
script or developer-only instruction (grep). Recovery guidance added
(§28).

## 74. Test-data cleanup

Cloud: BLOCKED (nothing exists). Local: the R1 network suite deletes its
synthetic leads in `afterAll`; every suite resets the database.

## 75. Production record-count snapshot

BLOCKED (no production).

## 76. Clean pre-launch backup

BLOCKED (no production).

## 77. Final security scan

Secret scan (827 files) clean; `pnpm audit --prod` no known
vulnerabilities; bundle scan passed; headers passed; route authorization
smoke (security probe 15/15) and database permission smoke (pgTAP 007/012
+ 019) passed in the gate.

## 78. r1:verify result

`pnpm r1:verify` = `r1:local`: the C10 gate (31 steps) followed by the
network-failure suite, bundle scan, content reseed, public audit, browser
smoke and log audit. Result on the final tree (2026-09-21, every suite on its **first**
attempt, no reruns): 31/31 C10 steps pass — format, lint, typecheck, unit
(151), component (20), design, secrets, db:reset, db:test (1,313), db:lint,
db:types, db:verify, build, audit, network (headers + CSP + security
15/15), verify:c4-c9 (6/6), s5a-admin 3, s5a-visual 1, s6a-public 6,
s9ap-public 6, s9bp-public 14, d1-visual 5, **cr1-owner-cms 10 (first
attempt)**, c4 5, c5 5, c6 6, c7 5, c8 8, c9 6, c10-staff-access 3,
db:concurrency; then r1-network-failure 3/3, bundle scan pass, public
audit pass (43 paths, 12 signed media), browser smoke pass (3 browsers,
vitals, slow network, forced colours), log audit pass.
`r1:cloud <base>` and `r1:smoke <base>` are implemented (read-only) and
wait for a candidate URL.

## 79. Known issues

- 42 raw `<button onClick>` tab/picker controls are not hydration-gated
  (harmless lost tab click on very slow devices).
- Home carries 2.6 MB of images at 1440 px (D1 media set) — CDN/cache
  behaviour in the cloud is the first performance item to measure.
- Vercel Cron GET/POST mismatch to be observed on the first run.
- Screen reader and physical mobile: NOT TESTED.

## 80. BLOCKERS

**One:** an application host and a Supabase organisation with credentials
(access token / project) for STAGING and PRODUCTION, plus the domain and
the owner email. Every cloud section above unblocks together once these
exist.

## 81. OWNER DECISIONS

See §7 and `RENZ_R1_PRODUCTION_DECISIONS.md` (8 REQUIRED FROM OWNER).

## 82. OPTIONAL POST-LAUNCH ITEMS

Turnstile; SMTP self-service reset; third-party analytics; error
monitoring vendor; malware scanner; notification/audit retention windows;
Lighthouse CI; hydration-gating the remaining raw buttons.

## 83. Exact steps for R2 owner acceptance

1. Owner supplies the decisions in §7 and access (Supabase organisation
   invite + host project) to the operator.
2. Operator runs the R1 cloud half exactly as the brief lists (§9–§48),
   using a STAGING project for destructive rehearsals, with
   `pnpm r1:cloud https://<candidate>` as the read-only gate; appends the
   results to this report.
3. Owner signs in on the candidate (Preview mode), performs the
   acceptance rehearsal from `RENZ_GO_LIVE_CHECKLIST.md` (enquiry → lead →
   client → project → invoice → PDF → share → payment → void; staff create
   / disable / reactivate), confirms the business email spelling.
4. Test data cleaned, record-count snapshot and clean backup taken.
5. Owner switches Site mode → Live; DNS pointed by the owner's instruction
   in that session; nothing automatic.

## 84. Go-live readiness verdict

**NOT READY — BLOCKED ON CLOUD ACCESS, NOT ON THE PRODUCT.** The software
is proven locally at release-candidate quality (C10 twice, R1 additions
green, three browsers). It has never run outside this laptop; per the
brief's operating principle it cannot be declared ready until auth, data,
media, finance, CMS, backup, restore, rollback and owner access are proven
in the real environment.

STOP. FINAL PUBLIC RELEASE NOT ENABLED.
