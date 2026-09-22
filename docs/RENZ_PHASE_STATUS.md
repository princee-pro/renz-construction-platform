# RENZ PHASE STATUS

Single source of truth for where the RENZ Construction Services Ltd build is.
Update this file at the end of every phase; do not let it drift.

Last updated: 2026-09-22 (D1.8 — brand lock "Brick by Brick." + pre-deployment visual completion; R1 cloud execution still needs the accounts/access; R2 owner acceptance after R1 cloud).

## DONE

| Phase | Scope                                                          | Evidence                                                                 |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| C1    | Foundation, identity, RBAC, content/media kernel               | S2–S4 migrations, `docs/PHASE_1_S2_*` … `PHASE_1_S4_*`                   |
| C2    | Services admin + media manifest                                | `docs/PHASE_1_S5A_REPORT.md`, `docs/RENZ_C2_MEDIA_MANIFEST.md`           |
| C3    | Public case-study (Projects) admin + public/operational boundary | `docs/CLAUDE_C3_*.md`, `scripts/verify-s5c.mjs`                        |
| C3.5  | Public experience **functional** rescue (dev-error fix, WhatsApp-only contact, fake-trust removal, real layout/contrast bugs) | C3.5 report in session; design backlog deferred (see below) |
| C4    | Control Room foundation: Client CRM + Operational Projects + realtime invalidation + dashboard + Quick Find | `docs/CLAUDE_C4_*.md`, `supabase/migrations/20260911100000_establish_c4_control_room.sql` + `20260911120000_harden_c4_realtime_policy_and_reverse_link.sql`, `supabase/tests/database/011_c4_control_room.sql` + `012_c4_security_negative.sql`, `scripts/verify-c4.mjs`, `scripts/verify-c4-realtime.mjs`, `tests/e2e/c4-control-room.spec.ts` |
| C5    | Invoices + client finance: drafts, atomic issue with official numbering and frozen snapshots, line items, tax, partial payments/reversals, void, PDF/print, secure no-login client links, Finance overview + Control Room + Client 360 / Project finance, realtime | `docs/CLAUDE_C5_*.md`, `supabase/migrations/20260912100000_establish_c5_finance.sql`, `supabase/tests/database/013_c5_finance.sql`, `scripts/verify-c5.mjs`, `tests/e2e/c5-finance.spec.ts` |
| C6    | Delivery operating system: trade partners (contractor/supplier capabilities), contractor assignments + append-only contractor payments/reversals/adjustments/ratings, Contractor Payables, material catalog, project material requirements, purchase orders (official `RENZ-PO` numbering, frozen snapshots, PDF/print, supplier share link), goods receipts with reversals, project Contractors/Procurement tabs + cost/delivery position by currency, Control Room delivery module + action queue, Quick Find kinds, realtime | `docs/CLAUDE_C6_*.md`, `supabase/migrations/20260913100000_establish_c6_partners_contractors.sql` + `20260913110000_establish_c6_procurement.sql`, `supabase/tests/database/014_c6_delivery.sql`, `scripts/verify-c6.mjs`, `tests/e2e/c6-delivery.spec.ts` |

| C7    | Business + Website + System Configuration Center: typed settings domains (business profile, contact channels with the WhatsApp texting-only rule, optional location/hours/social, website copy + approved-route navigation/CTAs, brand media slots, structured SEO, legal drafts + published revisions, document defaults, operational thresholds), coherent draft→publish snapshots, preview/live site mode gated by launch readiness, staff register, Quick Find `setting` kind, realtime, one-RPC public projection with static fallback | `docs/CLAUDE_C7_*.md`, `supabase/migrations/20260914100000_establish_c7_configuration.sql` + `20260914110000_c7_settings_effects.sql`, `supabase/tests/database/015_c7_configuration.sql`, `scripts/verify-c7.mjs`, `tests/e2e/c7-settings.spec.ts` |

| C8    | Public leads + real intake: contact, service, seven-step Start-a-Project and material enquiries with no visitor account, `RENZ-LEAD` references, private quarantine uploads, anti-abuse (HMAC identity rate limits, signed form tokens, honeypot, optional Turnstile, idempotency), Lead CRM (register + pipeline, Lead 360, assignment, notes, contact log, stage history, duplicate awareness), race-safe Lead → Client → Operational Project → material requirement conversion, Control Room lead module + action queue, Quick Find LEAD, realtime, launch-readiness intake checks, privacy DRAFT revision | `docs/CLAUDE_C8_*.md`, `supabase/migrations/20260915100000_establish_c8_leads.sql`, `supabase/tests/database/016_c8_leads.sql` + rewritten `004_lead_integrity.sql`, `scripts/verify-c8.mjs`, `scripts/verify-lead-concurrency.mjs`, `tests/e2e/c8-intake.spec.ts` |

| C9    | Intelligence + Notification Center: Analytics Center (`/admin/analytics` overview, leads, projects, finance, delivery, website) over bounded timezone-aware aggregate RPCs grouped by currency, period comparison, CSV export, print summary; C8 contact-log time semantics corrected (business-timezone conversion); privacy-safe first-party website analytics (daily counters only) with a narrow anonymous endpoint, consent layer + provider adapter for a published third-party provider, retention; staff Notification Center (bell, panel, register, preferences) with event-driven triggers, an idempotent timed sweep, permission-based recipient routing, value-free realtime pointers; Launch Readiness analytics/privacy/consent/scheduler checks | `docs/CLAUDE_C9_*.md`, `supabase/migrations/20260916100000_establish_c9_intelligence.sql`, `supabase/tests/database/017_c9_intelligence.sql`, `scripts/verify-c9.mjs`, `scripts/notifications-sweep.mjs`, `tests/e2e/c9-intelligence.spec.ts`, `tests/unit/business-time.test.ts`, `tests/unit/c9-intelligence-contracts.test.ts` |

| D1    | Final experience transformation (presentation only): "Datum & Mass" matured — self-hosted variable fonts (Archivo / Source Sans 3 / IBM Plex Mono), D1 palette (limestone, stone, bronze, timber, ochre; steel and bronze re-measured for AA), motion primitives on one library (Motion for React), 12-section home, signature header + mega panel + mobile dialog, services index navigator, five distinct service pages, editorial studies index (six compositions), concept case study with sticky media plane + repeated provenance, Drawing ↔ Built comparison, the ONE horizontal process story with a live rail, ONE marquee, about/insights/contact, intake frame + `final-forms.css` (C8 semantics untouched), signature footer, brand opener ≤ 1.4 s, route transitions, admin visual coherence block (fonts, mark, datum, Quick Find name/icon), legacy purge (18 components, 3 stylesheets, 1,313 lines of `public.css`), screenshot-driven QA at 1440/390/768/1920/320/720@2× + admin 1440/390, axe serious = 0 on every public route | `docs/RENZ_DESIGN_FREEZE.md`, `docs/RENZ_FINAL_MEDIA_QUEUE.md`, `DESIGN.md`, `src/styles/final-*.css`, `src/components/motion/primitives.tsx`, `src/components/site/*`, `scripts/d1-screenshots.mjs`, `scripts/d1-axe.mjs`, `scripts/d1-admin-shots.mjs`, `tests/e2e/d1-visual.spec.ts`, updated `s6a-public` / `s9ap-public` / `s9bp-public` specs, `tests/component/public-states.test.tsx` |

## FUNCTIONAL BUILD: FROZEN

C1–C9 complete. See `docs/RENZ_FUNCTIONAL_FREEZE.md`: from here database /
domain changes require a bug or security justification.

| D1.5  | Premium completion pass (presentation + narrow authorized enhancements): two-zone auth experience (sign-in, MFA, enrolment) with segmented OTP; admin Control Room shell (glyph sidebar + rail, top bar, corrected mobile drawer, Command strip, grouped Quick Find, launch-readiness tally, finance/table/status refinements); signature navigation (numbered routes, measured active line, route readout, three-zone mega panel, mobile choreography); public completion (contact rail + form surface, Insights with three owner-authorized editorial articles published through `publish_post`, About/Services process navigator, measured project filters, procedural service openers, home datum continuity); RENZ document family — shared PDF engine for issued / DRAFT / VOID invoices, payment receipts and purchase orders with page X / Y, plus the paper-sheet admin preview and staff-only draft PDF download | `docs/RENZ_DESIGN_FREEZE.md` §7a, `src/components/admin/auth-shell.tsx`, `src/components/admin/admin-navigation.tsx`, `src/styles/admin-auth.css` / `admin-shell.css` / `documents.css`, `src/features/documents/pdf-engine.ts`, `src/features/public-content/editorial-insights.ts`, `scripts/content-publish-insights.mjs`, `scripts/d15-*.mjs`, `tests/e2e/d1-visual.spec.ts` (auth + finance captures) |

| CR1 / D1.5A | Owner Website Control System (client change request, functional-freeze exception for pages / sections / revisions / publications / content relationships / route aliases / CMS permissions): audit of what the owner could edit (`docs/RENZ_PUBLIC_CONTENT_CONTROL_MATRIX.md` §1); split sources eliminated (static services / studies / process / insights migrated into the registers by `scripts/website-seed-content.mjs`); `/admin/website` control center, page register, site map; typed page builder (static section registry, move up/down, duplicate, hide, variants/tones/spacing/motion, rich text grammar, tokens); draft → preview (real components, Edit-page shortcut) → atomic publish → revision history → non-destructive restore, optimistic concurrency; safe custom pages with reserved routes and redirects; services / projects / insights stay editable while published through `content_publications` snapshots with Publish changes / Restore; project evidence classes, auto-placement cycle, Feature on Home with fallback, service ↔ project links; media library (upload with provenance class, alt, caption, focal point, rights confirmation, usage, replace, archive-blocked-while-in-use); navigation with custom pages, footer options / groups, globals; content health, Launch Readiness + Quick Find extensions; WhatsApp green system (`--whatsapp`, dark text, messaging-only); `website.*` permissions with edit / publish separation | `docs/CLAUDE_OWNER_*.md`, `docs/RENZ_PUBLIC_CONTENT_CONTROL_MATRIX.md`, `supabase/migrations/20260917100000_establish_cr1_website_cms.sql` + `20260917110000_establish_cr1_content_revisions.sql` + `20260917120000_establish_cr1_owner_surfaces.sql` + `20260917130000_seed_cr1_website_pages.sql`, `supabase/tests/database/018_cr1_owner_cms.sql`, `tests/unit/cr1-owner-cms-contracts.test.ts`, `tests/component/public-states.test.tsx`, `tests/e2e/cr1-owner-cms.spec.ts`, `scripts/website-seed-content.mjs`, `src/features/website/*`, `src/components/site/sections/*` |

| D1.6 | Client final art direction (presentation + content, one function-only migration): plain-English rewrite of every public page (website_pages revision 2 via migration `20260920100000`, services / studies / insights as content revision 2 via `website-seed-content.mjs --rewrite-copy`, JSX form / label / error wording, public intake labels split from staff labels), bounded audit `scripts/d16-copy-audit.mjs`; typography audition (Poppins / Manrope / Plus Jakarta Sans) → **Manrope** as the one public family; **RENZ Measured Track** navigation (moving plate + preview mark, services mega panel with related study, "More" overflow for owner-added pages, full-screen mobile navigator with travelling rail); landing system with sixteen route concepts and procedural scenes, film-archive Projects opening, poster-first video engine with save-data / reduced-motion / offscreen rules, CMS video ingestion (media library, picker, hero video field; gate widened by migration `20260920110000`), one rendered concept loop for Home (`scripts/d16-render-loop.mjs`), motion sheet (button wipe, card blueprint hover, scroll-driven section datums, reading progress); useful 404; legacy nav CSS removed from `public.css`; CMS stress fixtures (`scripts/d16-cms-stress.mjs`: 8 nav links, Service #6, 12 studies); docs: `RENZ_PLAIN_ENGLISH_GUIDE.md`, `RENZ_CINEMATIC_MEDIA_GUIDE.md`, `RENZ_NAVIGATION_SYSTEM.md`, `RENZ_HERO_MEDIA_CONTACT_SHEET.md`, freeze §7c | `docs/RENZ_D16_CLIENT_ART_DIRECTION_REPORT.md`, `src/components/site/nav/*`, `src/components/site/landing/*`, `src/styles/final-landing.css` + `final-motion.css`, `.playwright/screenshots/d1-6/` |

| D1.7 | Owner experience + portfolio expansion + public completion (presentation, content, one evidence-class migration): git checkpoint `f69790b`; public composition repair (process ledger replaces the horizontal story, `margin-block` rule for container companions, balanced showcases); classic four-column footer; **Staff Login** in the footer and mobile navigator; centred sign-in / MFA column with a breathing survey mark; owner Admin IA (Work / Delivery / Money / Website / Business / System), plain wording, styled project editor + gallery workspace (thumbnails, Move up / down, generated-concept confirmation, `>1 MB` attach bug fixed); evidence class `context_study` (migration `20260921100000`); six Rwanda-context studies (07–12) generated with Higgsfield Seedream 5.0 Lite + four secondaries + sixty locally drawn diagrams; galleries (7 pieces each) for all twelve; tile-rhythm index with category filters and featured strip; project detail with per-chapter planes, sequences, full gallery and accessible lightbox; thumbnail derivatives (`?size=thumb`); split-plane posters; owner Project #13 + archive test through the Admin only; docs `RENZ_PROJECT_GALLERY_GUIDE.md`, freeze §7d | `docs/RENZ_D17_OWNER_PORTFOLIO_REPORT.md`, `src/components/site/project-gallery.tsx`, `src/features/client-preview/project-galleries.ts`, `scripts/d17-*.mjs`, `.playwright/screenshots/d1-7/` |
| C10 | Production hardening + release candidate (security and bug justifications only; product frozen): owner-controlled staff access (role templates super_admin / admin / project_manager / finance / content_editor / viewer, owner-only create / disable / reactivate / reset / rename / role change, temporary password shown once, first-login forced password change gated in `private.has_permission`, MFA unchanged, last-owner protection; migration `20260922100000`); permission-aware Help drawer, Getting started, capability summaries; System Health panel + `/api/health` (categories only; `ops_migration_state`, migration `20260922110000`); security headers (CSP, HSTS in https production, nosniff, frame deny, referrer, permissions policy); proxy-level 307 for anonymous staff routes; double-submit guard on every create/edit form; **bounded action queues** (scale test found the operations / finance / delivery queues rendering every item — migration `20260922120000`, pgTAP 020); admin field controls never exceed 320 px; root 404 / error surfaces in the public system state; fail-fast on test-only switches in production; dead exports removed (26); `.env.example` complete; backup → reset → restore rehearsed (`scripts/backup.mjs`); C10 test matrix, security probe (15), scale (500/1000/500/300/2500), admin a11y+responsive matrix (66 checks), `pnpm c10:verify` gate; runbooks `RENZ_BACKUP_RESTORE.md`, `RENZ_PRODUCTION_DEPLOYMENT.md`, `RENZ_ROLLBACK.md`, `RENZ_GO_LIVE_CHECKLIST.md`, `RENZ_INCIDENT_RESPONSE.md` | `docs/RENZ_C10_PRODUCTION_HARDENING_REPORT.md`, `docs/RENZ_C10_TEST_MATRIX.md`, `supabase/migrations/20260922*`, `supabase/tests/database/019_c10_staff_access.sql` + `020_c10_bounded_queues.sql`, `tests/e2e/c10-staff-access.spec.ts`, `scripts/verify-c10*.mjs`, `scripts/c10-*.mjs`, `scripts/backup.mjs`, `.playwright/screenshots/c10/` |
| D1.8 | Brand lock + pre-deployment visual completion (content and presentation only; no architecture, database, auth, permission or security change). Official slogan **"Brick by Brick."** locked to one owner-editable source and stated on the Home hero, footer headline, mobile menu tagline and staff auth panel; "From land to landmark." retired as an authoritative line (migration `20260924100000`, published revisions so the owner can restore). Insights rebuilt from documentation placeholders into an editorial surface: a six-mark "field note" family chosen from each guide's own topic (`src/components/site/field-note.tsx`) for the index featured figure, the index cards and a captioned article opener plate, so no two guides share an illustration; an owner-editable **Drawn mark** field added to the masthead section. Dead space removed: a step-less CTA is one measured column, the guide grid is `auto-fit`. Staff sign-in / MFA recomposed — the form sits on an optical centre inside a measured drawn field, the brand panel is signed with the slogan, mobile keeps form-first. Alignment audited at 320–1920 (`scripts/d18-align.mjs`: container centres at every width; only intentional full-bleed media reaches the frame, its copy stays on the container line) | `docs/RENZ_D18_VISUAL_COMPLETION_REPORT.md`, `docs/RENZ_DESIGN_FREEZE.md` §7e, `supabase/migrations/20260924100000_d18_brand_and_copy.sql`, `src/components/site/field-note.tsx`, `scripts/d18-shots.mjs`, `scripts/d18-align.mjs`, `.playwright/screenshots/d1-8/` |
| R1 (local half) | Production provisioning + cloud rehearsal + deployment validation. Done without cloud access: CR1 hydration flake root-caused (clicks on `type="button"` controls were lost before hydration — 4/4 lost at 1× CPU when clicked at `load`) and fixed (`Button` renders disabled until hydrated; 0/4 lost at 8× throttle); offline submits guarded (`guardAction` / `guardIntakeAction` on every server-action form: inline "nothing was sent" error, values kept, one record after reconnect — `tests/e2e/r1-network-failure.spec.ts`); forced-colours focus rings + opener bypass; sign-in and Security help state the owner-issued temporary-password recovery path; decisions inventory, environment inventory, scheduled-task inventory; `pnpm r1:verify` (= `r1:local`), `r1:cloud <base>`, `r1:smoke <base>`; bundle scan, public audit (crawl, robots, sitemap, 404s, WhatsApp, content), cross-browser smoke (Chromium/Firefox/WebKit), web vitals, slow network, log audit. Owner-approved infrastructure (same day) prepared in the repository: `netlify.toml` + build-time health metadata (no runtime filesystem), Cloudflare Workers cron for the sweep (`infra/cloudflare/notification-sweep/`), GitHub Actions encrypted backup to R2 (`.github/workflows/backup.yml`), Cloudflare Web Analytics adapter (cookieless, no banner; migration `20260923110000`, pgTAP 021), official slogan "Brick by Brick." seeded into the owner-editable business profile and read by the opener/footer (migration `20260923100000`); "From land to landmark." stays the homepage headline. **Still blocked on accounts/access (Netlify site, two Supabase projects, Cloudflare account, GitHub repository): every cloud step of the R1 brief §9–§48** | `docs/RENZ_R1_PRODUCTION_PROVISIONING_REPORT.md`, `docs/RENZ_R1_PRODUCTION_DECISIONS.md`, `docs/RENZ_ENVIRONMENT_VARIABLES.md`, `docs/RENZ_R1_SCHEDULED_TASKS.md`, `scripts/verify-r1.mjs`, `scripts/r1-*.mjs`, `tests/e2e/r1-network-failure.spec.ts`, `.playwright/screenshots/r1/` |

## DESIGN: FINAL VISUAL FREEZE

D1, D1.5, D1.6 and D1.7 complete — **FINAL PRODUCT FREEZE** (public art direction `docs/RENZ_DESIGN_FREEZE.md` §7c–§7d; functional freeze `docs/RENZ_FUNCTIONAL_FREEZE.md`). D1.7 was the last client-requested product/design revision. Visual changes after this
point follow the freeze's change control (screenshot round + axe census +
`d1-visual` capture + a line here). CR1 added one controlled exception under
that change control: the WhatsApp green system (`RENZ_DESIGN_FREEZE.md` §7b).

## NEXT

**R1 cloud half, then R2 owner acceptance** — gated on the owner decisions in
`docs/RENZ_GO_LIVE_CHECKLIST.md` (hosting, region, domain, owner email,
SMTP, backup location). The local release candidate is commit
`chore: prepare renz production release candidate`; it was not pushed and
nothing was deployed. Remaining backlog items that need a cloud
environment or a decision are listed in `docs/RENZ_C10_HARDENING_BACKLOG.md`
with their C10 disposition.

## LEFT

- Release (cloud rehearsal of backup/restore and rollback, scheduler adapter, Turnstile keys)

## Known open items carried forward (not blockers)

- D1.7: the Higgsfield free plan had 10 credits — six heroes and four
  secondaries were generated; the remaining gallery roles are drawn diagrams
  and labelled detail crops. Photographic secondaries for every study, MP4 /
  mobile video and any real footage remain media production (contact sheet).
- D1.7: media uploaded before 2026-09-20 has no thumbnail child; the media
  route falls back to the 2400 px derivative for `?size=thumb` until the
  assets are re-ingested (C10 backlog item 49).
- D1.7: the original six hero visuals are 1586 × 992 px; their labelled detail
  crops are soft at lightbox size until higher-resolution renders exist.

- D1.6: no generative video/image tool (Higgsfield) was connected, so the
  hero footage queue in `docs/RENZ_HERO_MEDIA_CONTACT_SHEET.md` is open; the
  Home loop is a rendered "living still" from the labelled concept image.
  The bundled ffmpeg encodes VP8/WebM only — MP4 fallbacks and mobile
  sources need an encoder with libx264 (C10 media production).
- D1.6: the intake "What you need" options still come from the protected C8
  vocabulary; a published Service #6 appears everywhere except as an intake
  option (C10 backlog item 36).
- D1.6: running `tsc` while `next dev` is up can fail on route types because
  `.next/dev/types/routes.d.ts` lags; `pnpm typecheck` (typegen first) with
  the dev server stopped is the gate.

- Client/Project "restore from archive" control: archive is reversible at
  the data level (nullable `archived_at`), but no restore button was built —
  the brief marked restore optional.
- Anonymous realtime sockets receive Realtime's empty `Unauthorized` frames
  for `realtime_events` inserts (no entity type/id/action/value — a
  content-free timing signal). Closing it would mean moving to private-channel
  broadcast; see `docs/CLAUDE_C4_REALTIME.md`.
- D1 deleted `s6a-visual`, `s9ap-visual` and `s9bp-visual`; the single
  visual baseline is now `tests/e2e/d1-visual.spec.ts` (public desktop /
  mobile / tablet, opener, wizard step 2, admin desktop / mobile). The
  `testIgnore` entries were removed from `playwright.config.ts`.
- D1: `/projects/experience-study` (S9A-P) now redirects to the first concept
  study; the S9A-P spec follows the redirect.
- D1: lazy `next/image` elements inside a fully clipped `clip-path` mask never
  load in Chromium (they never intersect). `ImageReveal` therefore uses a
  transform-only sliding cover, never a clip mask, over lazy media.
- D1: in `next dev` the material-moment `next/image` (inside `Parallax`) can
  stay unrequested at 390 px; the production build loads it. Treated as a
  dev-only optimizer quirk; E2E runs against the production server.
- C5 optional items not built: client-facing payment-receipt PDF (an admin
  print receipt exists) and draft autosave. Overpayments are rejected rather
  than modelled as credit.
- The local `invoice_number_counters` and `purchase_order_number_counters`
  rows advance during synthetic verification runs; the next local issue may
  therefore not be `…000001`. Production numbering is unaffected (counters
  start empty).
- C6 optional items not built: supplier payments / supplier payables (out of
  scope by brief), inventory or stock levels, a "restore from archive"
  control for partners and materials (reversible at the data level).
- A cancelled contractor assignment cannot be reopened (terminal by design);
  a completed one can be set back to active.
- C7: `src/lib/site/contact-details.ts` keeps the static authorized
  contact as the public fallback (used when no snapshot is published or the
  RPC fails); the S4 `published_site_settings` table is retained untouched
  for backward compatibility — C7 settings supersede it and nothing reads
  it for the public identity any more.
- C7: the public configuration is loaded once per request (React `cache()`)
  rather than through the persistent Next data cache, which served stale
  identity across database resets and `revalidateTag`; revisit only if the
  single anonymous RPC per request shows up in production profiles.
- C7: no contact channel, location, hours or social link is seeded — the
  owner enters and publishes them; until then the public site renders the
  static authorized email and WhatsApp texting link and omits location.
- C7 optional items not built: per-user notification preferences, a
  multi-language settings surface, and legal acceptance tracking (out of
  scope by brief). Email delivery does not exist, so the staff page manages
  existing accounts only (no invitations).
- C8: the S2 lead skeleton (`lead_stages`, `project_briefs`,
  `contact_messages`, `lead_services`, subtype triggers) was retired in
  place — it was never populated and had no intake path.
- C8: no malware scanner is integrated (adapter boundary only, C10). The
  safe launch policy is images-only; PDFs stay behind the
  `images_and_pdf` setting and Launch Readiness warns while it is on.
- C8: `RENZ_INTAKE_ALLOW_DEV_BYPASS` exists for the Playwright production
  server (Turnstile unconfigured); Launch Readiness reports it when set.
- C8→C9: contact-log time is now converted from the staff wall-clock entry
  with the configured business timezone (C9 §9); no calendar / scheduling
  was built for site visits (a `site_visit_at` timestamp plus contact log
  entries only).
- C8: leads are archived, never purged; retention / anonymization tooling
  is for C10.
- C8 optional items not built: proposal / quotation documents, email
  notifications, drag-and-drop pipeline (the compact link-based pipeline
  view exists), per-lead SLA timers beyond the two deterministic thresholds.
- `tests/e2e/s9ap-public.spec.ts` hero-contrast flake (axe sampling the
  hero entrance fade mid-animation) is fixed in C7 by waiting for finite
  animations to finish before the audit; the contrast assertion itself was
  not weakened.
- A dev-mode-only React hydration warning on `/` (diagnosed in C3.5, absent
  from production builds) remains documented rather than chased.
- C9: `contractor_assignments.completed_at` is new; pre-C9 completed
  assignments were backfilled from `updated_at`, so "completed in period"
  for those rows is approximate.
- C9: publishing after deployment is required once — the public
  configuration projection gained two analytics keys, so Launch Readiness
  shows "unpublished changes" until the owner republishes.
- C9: no deployment scheduler exists; timed notifications run through
  `pnpm notifications:sweep`, the `RENZ_TASK_TOKEN`-protected task endpoint
  or the super-admin "Run sweep now" button. Wiring the scheduler is a C10
  task and Launch Readiness warns until it runs.
- C9: the `umami` adapter expects the public site id as `host/website-id`;
  `other` has no adapter (first-party aggregates still work).
- C9 optional items not built: browser (desktop) Notification API, a
  Quick Find entry for notifications (deliberately not added), snapshot /
  warehouse tables (not justified at current scale).
- Verification: `pnpm s5a:verify` with no spec path runs every Playwright
  suite in one process (~30 min on the 8 GB machine; the runner timeout was
  raised to 60 min in C9). Three cross-suite state interactions surface only
  in that aggregated order (C6 project picker after C5, C8 "No purchase
  orders" after C6, S6A terms heading after C7 publishes terms); each suite
  is green on its own, which is how the phases are verified (`pnpm
  test:e2e:c4` … `test:e2e:c9`, public suites). Making the suites
  order-independent is a C10 item.
