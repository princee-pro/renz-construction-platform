# RENZ C10 test matrix

C10 §6–7. Every automated check that exists at the release candidate, what
it proves, how it is run, and where C10 added coverage. Counts are from the
files themselves on 2026-09-20. `pnpm c10:verify` runs all of it in the
order of the last table and stops at the first failure.

## Layers

| Layer | Runner | Files | Cases | Proves |
| --- | --- | --- | --- | --- |
| Database | pgTAP via `supabase test db` | 20 | 1,313 assertions | schema, constraints, RLS, every facade's authorization and refusal paths, finance/procurement arithmetic, C7 configuration, C8 intake, C9 analytics, CR1 CMS, C10 staff access + bounded queues |
| Unit | vitest (`--project unit`) | 21 | 149 | zod contracts for every domain, business-time conversion, PDF document models, media validation/signatures, cache tags, public metadata, redirects, environment visibility |
| Component | vitest + Testing Library (`--project component`) | 3 | 20 | admin/public/service state renderers |
| Browser | Playwright (Chromium, 1 worker, one spec per process) | 15 | 82 tests | the workflows in the next table, all through the real UI against the real database |
| Network / scripts | node scripts against the local stack | 12 | — | facade behaviour as real roles without a browser (`verify-c4…c9`, `verify-database`, `verify-lead-concurrency`, C10 security probe, headers, CSP, scale, perf, a11y matrix) |
| Static | prettier, eslint (0 warnings), `tsc --noEmit` strict, `next typegen`, `designmd lint`, design-token check, secret scan, `pnpm audit --prod`, public-bundle audit | — | — | formatting, lint, types, design contract, no secrets in committable files, no known vulnerable dependency, no CMS JavaScript on public routes |

## Browser suites (what each proves)

| Spec | Tests | Coverage |
| --- | --- | --- |
| `s5a-admin` | 3 | AAL1 kept out; capability-filtered UI; disabled session fails closed; service lifecycle + stale save |
| `s5a-visual` | 1 | admin compositions at mobile/tablet |
| `s6a-public` | 6 | every public route noindex + semantic; labelled studies; real 404; mobile nav modal; expertise redirects; reduced motion + axe |
| `s6a-project-populated` | 1 (conditional) | evidence-published project through index/detail — runs inside `s6a:verify` with `RENZ_E2E_PUBLISHED_PROJECT=true`; skipped otherwise by design |
| `s9ap-public` | 6 | opener once per session; reduced-motion comparison; project study keyboard; placeholders non-actionable; mark matrix; axe |
| `s9bp-public` | 11 | no hydration errors; document semantics + local media; 12 studies navigable; 404s; redirects; focus trap; drawing comparison; wizard reversible/no early writes; reduced motion; axe |
| `d1-visual` | 5 | screenshot captures desktop/mobile/tablet, opener, auth, admin |
| `cr1-owner-cms` | 10 | home draft→preview→publish→rollback; custom page; XSS/unsafe link refusal; service/project/insight publish–unpublish propagation; media library; two-session stale save; globals/footer; WhatsApp rule |
| `c4-control-room` | 5 | AAL1 out; client→project→case-study chain; realtime propagation; stale two-actor saves; archive + responsive |
| `c5-finance` | 5 | AAL1 out; draft→issue→share→pay; realtime payment; stale draft save; void after reversal + share link + responsive |
| `c6-delivery` | 6 | AAL1 out; contractor workflow; realtime payment/reverse/rate; procurement workflow to deliveries; realtime delivery + stale save; layouts 320–1440 + 200 % |
| `c7-settings` | 5 | AAL1 out; business draft→publish→public follows; legal privacy + conflicts + realtime; go-live gating; layouts + axe |
| `c8-intake` | 8 | four public forms → leads (realtime); material enquiry never a PO; anti-abuse (rate limit, form session, upload security); privacy; two-staff realtime + stale edit; layouts + axe |
| `c9-intelligence` | 6 | Analytics Center; analytics off by default; first-party privacy-safe events; consent; Notification Center; sweep idempotence + readiness |
| `c10-staff-access` | 3 | **new**: owner creates staff → temp password shown once → MFA enrol → forced password change → template access → second sign-in → disable/reactivate/reset; admin cannot manage staff (UI + facade); last owner protected at the trigger |

## C10 additions

| Check | File | What it proves |
| --- | --- | --- |
| pgTAP 019 (30) | `supabase/tests/database/019_c10_staff_access.sql` | role templates, admin lacks staff powers, `has_permission` gated on `must_change_password`, owner-only facades, self-change refused, last-owner protection, no password in app tables/audit |
| pgTAP 020 (6) | `supabase/tests/database/020_c10_bounded_queues.sql` | the operations, finance and delivery action queues return at most `limit_count` items (the defect the scale test found) |
| Security probe (15) | `scripts/verify-c10-security.mjs` | 151 SECURITY DEFINER facades refuse anonymous and AAL1 sessions without leaking; disabled and password-pending accounts hold zero permissions; 10 sensitive tables unreadable; 8 staff routes redirect/refuse anonymously; health/tasks/media/attachment/upload endpoints refuse forged and malformed requests; forged share tokens → constant 404; analytics recorder stores no query strings; 2 MB server-action body refused; wrong-password messages identical for known and unknown accounts |
| Headers + CSP | `scripts/c10-headers.mjs`, `scripts/c10-csp-check.mjs` | CSP, nosniff, frame deny, referrer, permissions policy on public + admin routes; zero CSP violations while browsing |
| Scale + perf | `scripts/c10-scale.mjs`, `scripts/c10-admin-perf.mjs` | 500 clients / 1,000 projects / 500 leads / 300 partners / 2,500 invoices / 1,250 payments through the real facades; every register bounded at 25 rows; Overview 1.1 MB → 97 KB after the queue fix |
| A11y + responsive matrix | `scripts/c10-admin-a11y.mjs` | 22 admin routes × 320/768/1440: axe serious/critical = 0, no horizontal overflow (measured without mobile-viewport masking), screenshots; keyboard: Help drawer open/Escape/focus return, Ctrl+K, Sign out reachable |
| Backup/restore | `scripts/backup.mjs` | dump → reset → restore in one transaction with identical counts and working sign-in |
| Gate | `scripts/verify-c10.mjs` (`pnpm c10:verify`) | the ordered, stop-on-failure sequence below with a JSON ledger |

## `pnpm c10:verify` order

`format → lint → typecheck → unit → component → design → secrets → db:reset
→ db:test → db:lint → db:types → db:verify → build → audit → network
(headers, CSP, security probe) → verify:c4-c9 → e2e (14 specs, one process
each) → db:concurrency`

Each browser spec resets and reseeds the database in its own global
setup/teardown; `network` starts and stops its own production server on
port 3100.

## Not automated (and why)

- Cloud deployment, DNS, TLS, scheduler, cloud backup/restore — no hosting
  exists (Decision Register G5).
- Real email delivery (password reset) — no SMTP; staff onboarding does
  not use email by design.
- Malware scanning of intake attachments — no scanner wired; review is
  manual and the state machine is tested.
- Third-party analytics adapters other than the published provider shape.
- Print output of invoice/PO PDFs on paper — PDFs are generated and their
  document models unit-tested; a human looked at the rendered PDFs in D1.5.
