# RENZ C10 HARDENING BACKLOG

Production security / performance / integration hardening after the Final
Design phase. Nothing here starts before the design phase ends. Each item
records where the boundary currently sits.

## Security

1. **Real malware scanning** for intake attachments: decide the scanner
   (ClamAV sidecar / vendor API), implement the adapter behind
   `src/features/intake/scanning.ts`, gate `lead_attachments.scan_status`
   on it. Until then Launch Readiness keeps images-only as the safe policy.
2. **Intake PDF policy**: keep `images_and_pdf` disabled in production until
   item 1 ships; document the decision.
3. **`RENZ_INTAKE_ALLOW_DEV_BYPASS` prohibition**: fail startup (or Launch
   Readiness → blocked) when set with `NODE_ENV=production`; it exists for
   the Playwright server only.
4. **CSP / security headers**: strict CSP (nonce for the C9 provider adapter
   scripts and `next/script`), HSTS, referrer policy, permissions policy,
   frame-ancestors for the shared invoice / PO pages. D1 additions to cover:
   the self-hosted `next/font/local` faces under `/_next/static/media`
   (`font-src 'self'`), Motion for React's inline `style` attributes
   (`style-src 'unsafe-inline'` is already required by Next's streaming;
   no `unsafe-eval` is needed — verified by the D1 build), the
   `sessionStorage` use by the brand opener and the intake draft (no CSP
   impact, but the privacy notice must describe the draft), and the
   `data:`-free SVG fields (all inline `<svg>`, no `img src="data:"`).
5. **Production rate limiting** at the edge for `/api/intake/*`,
   `/api/analytics/events`, sign-in and the shared document routes, on top
   of the database HMAC limiter.
6. **Secret rotation and deployment configuration**: `SUPABASE_SECRET_KEY`,
   `INTAKE_RATE_LIMIT_SECRET`, `RENZ_TASK_TOKEN`, Turnstile keys; rotation
   runbook; `.env.example` parity check in CI.
7. **Dependency audit**: `pnpm audit:production` in CI with an allow-list
   process; exact-pin review.
8. **Final RLS / grant sweep** against the S2 grant matrix after design-phase
   changes (pgTAP inventories 001/006/007 are the gate).

## Notifications and scheduling

9. **Notification scheduler**: wire the deployment scheduler to
   `POST /api/tasks/notifications-sweep` (bearer `RENZ_TASK_TOKEN`) or
   `pnpm notifications:sweep` hourly; Launch Readiness turns
   `notification_sweep` ready once a run lands within 26 h.
10. Decide notification archive retention (e.g. auto-archive read items
    after 90 days) — C9 keeps everything, no hard delete.

## Data lifecycle

11. **Retention / purge** for Leads (archived), upload sessions
    (`pnpm intake:cleanup`), rate-limit tables, audit logs, realtime pointer
    rows, notification rows; C9 only bounded website analytics counters.
12. **Backup / restore rehearsal** on the hosted database; document RPO/RTO.
13. **Database migration rehearsal**: apply C1–C9 migrations to a copy of
    production, run pgTAP, confirm `db:types:check`.

## Operations

14. **Monitoring / error reporting**: server errors, RPC failures, realtime
    disconnect rates, beacon rejection rate; alert routing (no PII in logs).
15. **Performance budgets after design**: Lighthouse / Web Vitals budgets
    for public routes; measure `admin_analytics_*` query plans with
    representative synthetic volumes (EXPLAIN ANALYZE) and add indexes or
    materialised aggregates only if measured.
16. **Image / video optimisation** pipeline for the final media. D1 leaves
    `docs/RENZ_FINAL_MEDIA_QUEUE.md` as the production brief: the seventh
    study, per-study detail crops, a material register and service openers;
    every generated image must arrive as a ≤ 450 KB WebP master and go
    through `next/image` with the per-card `sizes` recorded in the queue.
    Measure `/_next/image` cache hit rates on the host.
17. **Final accessibility audit** (WCAG 2.2 AA) across public + admin,
    including 200% zoom, 320 px, forced colours and screen-reader passes.
    D1 state: axe serious/critical = 0 on every public route (dev and
    production build), 320/390/768/1440 reflow, 720 px @ 2× ("200% zoom")
    reviewed, keyboard model verified for menu, mega panel, services index,
    comparison, wizard. Still open: a forced-colours pass on the SVG fields
    and drawings (they rely on `currentColor` but the gold datum line needs
    a `forced-color-adjust` decision), and a screen-reader pass on the
    horizontal process story (it is a plain document order today).
18. **Final privacy / legal sync**: publish the privacy and cookie notices
    that describe intake and analytics (Launch Readiness `analytics_privacy`
    / `consent_mode` must be ready); confirm the consent copy with counsel.
19. **Domain / DNS / SSL readiness**: canonical URL, redirects, HSTS preload
    decision, mail records for the public email.
20. **Disaster recovery / runbook**: sign-in recovery (S3 runbook), owner
    bootstrap, key loss, database restore, rollback of a bad deploy.
21. **C7 public configuration cache**: revisit the per-request projection
    read only if production profiles show it.
22. **Realtime anonymous frame residual** (C4 note): move to private-channel
    broadcast if the content-free timing signal is judged unacceptable.
23. **Order-independent Playwright suites**: the aggregated `pnpm s5a:verify`
    run shows three cross-suite state interactions (see
    `RENZ_PHASE_STATUS.md`); isolate fixtures per suite or reset between
    files so the single-process run is green in CI.
24. **Bundle delta after D1** — measured on the production server
    (`next build` 2026-09-13, Chromium, Home, warmed). Before the D1 split:
    509,888 B transferred across `/_next/static` on Home, of which JS
    338,036 B — the largest chunk (86 KB transferred / 375 KB decoded) was
    zod with all locales, pulled into every public page by the C9 beacon's
    shared `analytics-policy.ts`. D1 moved the schema/normalizer to
    `analytics-schema.ts` (server-only import) so the browser keeps the plain
    helpers. After the split (same method): Home JS 212,073 B transferred /
    675,682 B decoded, case study 205,415 B, Start-a-Project 300,826 B (the
    C8 wizard's client-side zod validation). After D1.5 (same method): Home
    JS 212,469 B (held), Insights 204,265 B, Contact 296,386 B, admin
    sign-in 144,129 B; CSS 48,262 B transferred (+8 KB for the auth, shell
    and document sheets). Fonts add
    172 KB (Archivo 93 KB, Source Sans 3 47 KB, two Plex Mono cuts 31 KB) and
    two CSS chunks 40 KB transferred. S9A baseline for comparison: JS
    146,364 B / CSS 20,440 B transferred. Motion for React is the ONE
    animation library; Three.js / R3F / WebGL were deliberately not added.
    Action: run `pnpm s9ap:measure http://127.0.0.1:3100/` in CI and budget
    Home JS ≤ 230 KB transferred; consider subsetting Archivo further
    (wdth axis only where used) and lazy-loading the intake wizard's zod
    validation (client-side C8 schema) on the intake routes only.
25. **Hydration-dependent beacons and inputs**: the C9 page-view beacon and
    the admin picker inputs are client effects/controlled inputs; a visitor
    who leaves within ~200 ms of `load` is not counted, and typing before
    hydration is discarded. D1 documented both in the E2E suites (explicit
    hydration waits) rather than changing C8/C9 behaviour; C10 may inline a
    hydration-independent page-view beacon if analytics accuracy matters.
26. **Legacy CSS retirement**: `src/styles/public.css` still carries the C8
    intake base rules, legal/structured-content, not-found/error, floating
    WhatsApp and analytics-consent styles that `final-*.css` overrides. Fold
    the survivors into the final sheets and delete the file once the D1
    visual suite is the only baseline.

## D1.5 hardening carry-overs (actual hardening only)

27. **Insights publication in production**: run `pnpm content:publish-insights`
    once with the owner's credentials (`RENZ_PUBLISH_EMAIL/PASSWORD/TOTP`)
    after the owner bootstrap, so the three editorial articles exist as
    reviewed `posts` rows (the public routes render the code-authored copies
    until then). Add a Launch Readiness check if the owner wants it gated.
28. **Draft-invoice PDF access review**: the staff route now renders drafts
    (`/admin/finance/invoices/<id>/pdf`) through the same `admin_get_invoice`
    authorization; confirm in the final RLS sweep that no share-token path can
    ever reach a draft (C5 test `anonymousAdmin` covers the admin route).
29. **PDF engine fonts**: documents use PDF-standard Helvetica (no embedded
    fonts, no fetches). If the brand later requires Archivo in PDFs, embed the
    subset and re-measure file size.
30. **Auth rate limiting / lockout** stays a C10 item (§5); the new auth UI
    does not change the sign-in or MFA semantics.

## CR1 / D1.5A carry-forward (owner CMS hardening)

31. **Media delivery caching**: `/api/media/website/[id]` answers with a 302 to
    a short-lived signed Storage URL. For production, put a CDN in front of
    the derivatives bucket (or serve derivatives through a public bucket with
    immutable, content-hashed paths) and add cache headers on the redirect so
    every page view does not sign a URL per image.
32. **Realtime for the page editor**: `website_page` is in the realtime
    vocabulary but no admin route subscribes yet. Conflicts are caught by
    optimistic concurrency (a stale save is refused, nothing overwritten); a
    live "someone else is editing" banner is a C10 nicety.
33. **Restore does not rebuild project media relations**: `restore_content_revision`
    restores fields, placement flags and hero references only; the Media tab
    stays the source of truth. Decide whether a revision should also snapshot
    `project_media` order/roles.
34. **CR1 seed script + dev cache**: `scripts/website-seed-content.mjs` is
    idempotent but `next dev` keeps `unstable_cache` on disk
    (`.next/dev/cache/fetch-cache`); document or automate the clear in the
    local bootstrap (`tests/e2e/global-setup.mjs` already does it).
35. **Migration idempotency**: `20260917120000_establish_cr1_owner_surfaces.sql`
    wraps `admin_global_quick_find` / `admin_launch_readiness` by copying the
    previous definition (`pg_get_functiondef`) inside a `DO` block. It is
    correct on a fresh reset (the only supported path) but re-applying the
    file on an already-migrated database would nest the wrapper; a C10 clean-up
    can restate both functions in full.
36. **Intake vocabulary vs Service #6**: the C8 intake "need" list is
    protected; a newly published service appears on every public surface but
    not as an intake option until the C8 vocabulary is extended by a developer
    (functional freeze). Decide whether intake should derive its options from
    published services.
37. **C7 website copy fields are now legacy**: the Contact intro is owner-edited
    on the page (Pages → Contact) and the footer statement in Footer → Footer
    options; `website_settings.contact_intro` is no longer rendered and
    `footer_statement` is only a fallback when the footer option is empty.
    Retire both fields (or label them "legacy") in C10 so there is one source.
38. **Concept media rule relaxation**: `project_publication_failures` accepts
    `concept_demo` / `generated_reference` media for `concept_study` /
    `experience_study` classes (never for `real_project`). Re-confirm the
    provenance labelling in the final legal review.
39. **Rate limits on the media upload route** (`/api/admin/media`): per-user
    upload throttling and antivirus scanning remain C10 items (uploads are
    staff-only, MIME-sniffed, size-capped and private).
40. **Public bundle audit**: `scripts/audit-production.mjs` should assert that
    no `@/features/website/components/*` (admin) chunk is reachable from the
    public route group, in addition to the existing checks.


## D1.6 carry-forward (hardening only)

41. **Hero footage production**: connect a generative tool or commission
    photography for the queue in `docs/RENZ_HERO_MEDIA_CONTACT_SHEET.md`;
    produce MP4 (H.264) fallbacks and 720×1280 mobile sources (needs an
    ffmpeg with libx264 — the Playwright build encodes VP8 only). Re-measure
    transferred bytes per route afterwards (`pnpm s9ap:measure`).
42. **Video delivery**: `/api/media/website/[id]` answers a 302 to a 5-minute
    signed URL and Chromium fetches the loop with range requests; put the
    derivatives bucket behind a CDN (item 31) before launch so a loop is not
    re-signed per visitor, and set `Cache-Control` on the redirect.
43. **Video upload hardening**: `/api/admin/media` accepts MP4/WebM up to
    12 MiB with signature sniffing only; add duration / dimension probing
    (ffprobe) and a per-user throttle (item 39).
44. **Scroll-driven animations**: `final-motion.css` relies on
    `animation-timeline: view()/scroll()`; verify the final-state fallback on
    Safari / Firefox versions without support during the final browser
    matrix, and keep `prefers-reduced-motion` as the override.
45. **Intake vocabulary from published services** (item 36) is now more
    visible: the wizard shows plain-English public labels
    (`publicNeedLabels`) while staff see canonical labels; extend both when
    the vocabulary becomes CMS-driven.
46. **Typography licence record**: Manrope (OFL) is self-hosted; add the
    licence text to the repository's third-party notices before release.
