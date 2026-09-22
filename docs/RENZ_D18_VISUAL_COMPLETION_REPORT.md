# RENZ D1.8 VISUAL COMPLETION REPORT

Date: 2026-09-22. Scope: brand lock, media, motion and page-by-page visual
completion on the R1 release candidate. Content and presentation only — no
architecture, database schema, authentication, MFA, RBAC/RLS, permission,
finance, CMS-ownership or security change. Nothing was deployed and no cloud
resource was created.

## 1. Status

**PASS, with one declared exception.** Every hard-failure condition in §38 of
the brief is cleared and every changed surface is verified by screenshot at
the review widths.

The regression gate is green on 30 of its 31 steps. The exception is the
final test of `e2e:c8-intake`, which exceeds its 240s wall-clock budget on
this host. Its assertions all pass when given clock (measured: 222s, full
suite `8 passed`), and admin suites D1.8 never touches slowed by 34–53% on
the same host, so the cause is machine capacity, not this change. The test
was left untouched rather than re-budgeted. §28 has the measurements.

No product defect is outstanding. Nothing was deployed; no cloud resource
was created.

## 2. Brand correction

"From land to landmark." is retired as RENZ's official slogan. A repository
sweep (`src/`, `tests/`, `scripts/`, database content) returns **zero**
occurrences as an authoritative brand line; the six remaining mentions are in
dated historical reports under `docs/`, which are preserved deliberately
(§35 permits historical documentation).

The line survives only as optional editorial copy the owner may choose to
write — it is not a default, not a fallback and not shipped anywhere.

## 3. "Brick by Brick." implementation

One authoritative, owner-editable source per surface — nothing hard-coded
across unrelated components:

| Surface | Source | Owner edits at |
| --- | --- | --- |
| Home hero headline | `website_page_sections` hero `headline_lines` | Website → Home → Hero → Headline lines |
| Footer headline | footer options `headline` | Website → Footer |
| Home browser/share title | `website_pages.seo_title` / `seo_description` | Website → Home → Page settings |
| Mobile menu tagline | globals `menu_tagline` | Website → Globals |
| Identity slogan (opener, footer slogan line) | `business_profile.tagline` | Settings → Business → Slogan |
| Staff auth brand panel | one signature line in the auth shell | — (workspace chrome, not public copy) |

The home page's `seo_title` was still `From Land to Landmark` (set in D1.6);
it is now `Brick by Brick`, written *before* the republish so the published
snapshot — which is what `websitePageMetadata()` reads — carries it.

Migration `20260924100000_d18_brand_and_copy.sql` writes the values and
publishes each page as a **new revision**, so Revision History keeps the
previous wording and the owner can restore it. The migration is idempotent.

The code default when the owner clears the hero is now the slogan
(`["Brick", "by Brick"]`) rather than the old line. The renderer appends the
decorative full stop, so the lines carry none — the heading reads
"Brick by Brick." and its accessible name is "Brick by Brick".

Duplicate-suppression: the footer prints the slogan line above its headline
only when the owner has written a *different* headline, so the slogan is
stated once (`normalise()` compares ignoring case and trailing punctuation).

## 4. Simple-English rewrite

The D1.6 plain-English pass already covers the public pages; D1.8 changed
only what the brand edit touched:

- Insights index title: "Simple guides for planning and building." →
  "Guides for planning and building."
- Insights index summary now names what the guides cover in plain words:
  "…briefs, site visits, drawings, pricing and checking work on site —
  written from how RENZ runs real projects."
- Home hero supporting line kept as the plain promise ("RENZ helps you plan,
  design, build and supervise your project — from the first idea to final
  handover.") so the slogan never stands alone as a claim.

No vague agency language was introduced. Nothing on the public site reads
"crafted excellence", "visionary spaces" or similar.

## 5. Homepage changes

First viewport now states **Brick by Brick.** over the existing cinematic
Rwanda-highland hero with its measured overlays, the plain supporting line,
Start a Project / See our services, the services and audience register, and
the retained `CONCEPT VISUAL / NOT PROJECT EVIDENCE` disclosure. Everything
else on Home is unchanged (the composition was already strong).

## 6. Navigation changes

None. The measured-track navigation, moving marker, section numbers, mega
panel, mobile navigator and Staff Login placement were reviewed against §13
and already satisfy it; changing them would have been churn.

## 7. Services changes

None required. The five service pages already carry distinct registers
(`REGISTERS` in `services/[slug]/page.tsx`: plan/drawing/paper,
structure/process/concrete, datum/comparison/limestone,
survey/checkpoints/paper, quiet/decisions/limestone) plus a per-service
landing concept. Round-2 captures confirm five visibly different pages
(page heights 8,003–9,073 px at 768, different opener geometry and tone).

## 8. Project changes

None. D1.7 delivered the twelve labelled concept studies, the tile-rhythm
index and the per-chapter detail experience; no new study was invented and
no concept study is presented as completed RENZ work.

## 9. Gallery system

Unchanged from D1.7 (upload, replace, reorder, caption, alt, focal point,
role, publish/unpublish through Admin; lightbox, keyboard, responsive
compositions).

## 10. About changes

None. The page already alternates narrative, services, method and a concept
study without fabricated people or credentials.

## 11. Insights index changes

The weakest public surface in the brief is rebuilt:

- **Field-note mark family** (`src/components/site/field-note.tsx`): six
  drawn marks — brief (written sheet), survey (plot section), coordination
  (registering drawing layers), detail (wall build-up), cost (measured
  band), handover (checked list + stamp). Inline SVG, `aria-hidden`,
  reduced-motion safe (the settled state is the full drawing).
- The mark is chosen from **each guide's own topic and slug**, so the choice
  follows owner content rather than a hard-coded per-article list.
- The featured figure now shows the article's own mark on the paper plate
  instead of a repeated project drawing.
- Every card in the guide list carries its own mark.
- **Dead space removed:** the guide grid is `auto-fit`, so two guides fill
  the row instead of leaving an empty third column; the closing CTA renders
  as one measured column when it has no steps (`[data-steps="false"]`),
  instead of a half-empty 7/5 grid.
- The masthead takes an owner-editable **Drawn mark** field (new
  `note_variant` select on the masthead section), set to `survey` for
  Insights.

## 12. Insight article changes

Each article opens with an **editorial plate**: a paper-toned sheet on the
dark field carrying that article's own mark and its topic as a caption.
Verified across all three published guides — brief sheet / site survey
section / drawing coordination, each with the gold accent reading correctly
(`.playwright/screenshots/d1-8/check/_articles-sheet.png`). The existing
body rhythm (table of contents, related-service card, section index) is
retained; reading is unchanged.

## 13. Contact changes

None. Channels remain WhatsApp (messaging-only, `wa.me`, no `tel:`) and
`renzconstruuction@gmail.com` — spelling untouched, owner confirmation still
required. No address invented, no call CTA.

## 14. Start-a-Project changes

None. The wizard remains the priority of its page.

## 15. Footer changes

Restrained and correct: wordmark, **Brick by Brick.** as the headline, the
plain company line, Start a Project, Services, Company, Contact (email,
WhatsApp, messages-only note), and the utility row with legal links, Staff
Login and back-to-top. The slogan is no longer printed twice. All of it
stays owner-managed.

## 16. Staff sign-in changes

Recomposed without touching the authentication model:

- The form column sits on an **optical centre** (`align-content: center`,
  three auto rows, tighter gap) — the large void between the step indicator
  and the heading is gone.
- A **drawn datum** composes the white field (a hairline with two gold
  registration ticks), so the panel reads as measured rather than empty.
- The brand panel is signed **BRICK BY BRICK.** under the Control Room
  kicker; its existing drawn structure already animates.
- Reduced motion now pins the panel drawing to its final state.

## 17. MFA / auth-shell changes

The MFA and password-change screens use the same shell, so they inherit the
composition automatically. Mobile keeps form-first with the visual panel
reduced below (verified at 390 px).

## 18. Media added

No photographic media was added. No image was scraped, hotlinked or copied;
no AI image is presented as completed RENZ work; every concept visual keeps
its provenance label. The new visual material is drawn (§20).

## 19. Video added

None. The existing poster-first video system (save-data, reduced-motion,
offscreen rules) is untouched.

## 20. Generated / custom visuals

Six custom SVG marks plus the article plate and the auth datum — all inline,
nothing downloaded, no new network weight.

## 21. Motion system

The marks assemble with a short staggered draw (`field-note-draw`, 700 ms,
110 ms steps) inside `prefers-reduced-motion: no-preference`; reduced motion
shows the completed drawing. No new fade-up, no parallax, no scroll
hijacking. The auth panel's existing draw animation is now explicitly
disabled under reduced motion.

## 22. CMS editability proof

Nothing introduced is developer-only:

- Slogan → Settings → Business → Slogan (`business_profile.tagline`).
- Hero lines, footer headline/statement, menu tagline, Insights title and
  summary → the owner's Website pages, published as revisions.
- The new **Drawn mark** is a registry `select` on the masthead section, so
  it appears in the Admin section editor like any other field, with an
  "auto" option meaning "use the landing concept".
- No parallel CMS was created; public rendering and Admin editing read the
  same sections.

## 23. Responsive fixes

`scripts/d18-align.mjs` audits 11 routes at 320/390/768/1024/1280/1440/1728/
1920. Result: the container centres correctly at every width (at 1920 the
content column is 1,472 px with 219 px margins); no route has horizontal
overflow (`documentElement.scrollWidth` ≤ viewport everywhere). The
remaining flags are intentional full-bleed media cards — their *copy* sits on
the container line (measured: x=219 at 1920), only the image reaches the
frame. The guide-grid and CTA fixes above also remove the two real dead-space
cases.

## 24. Accessibility

Marks are `aria-hidden` and decorative; the article plate's caption is a real
`figcaption`. Reduced motion is respected by the new animation and now also
by the auth drawing. No contrast, focus or keyboard behaviour changed. The
public a11y suites (s6a, s9ap, s9bp, c7, c8, c9) carry the axe assertions and
are part of §28.

## 25. Performance

No image, video, font or client component was added; the marks are inline
SVG. `next build` passes and the bundle audit step (`audit`) passed in the
gate, so no CMS or extra JavaScript reached the public routes.

## 26. Visual screenshot paths

- Round 1 (before): `.playwright/screenshots/d1-8/round1/` — 18 captures at 1440.
- Round 2 (after): `.playwright/screenshots/d1-8/round2/` — 54 captures at 1440/390/768 across 18 routes.
- Focused checks: `.playwright/screenshots/d1-8/check/` — including
  `_articles-sheet.png` (three distinct article heroes) and the reworked
  sign-in.
- Capture tool: `scripts/d18-shots.mjs` (suppresses the once-per-session
  brand opener so heroes are captured).

## 27. Tests

Updated only where the shipped wording genuinely changed — no test was
deleted or weakened:

- `tests/component/public-states.test.tsx` — hero lines and heading name.
- `tests/e2e/s6a-public.spec.ts`, `s9ap-public.spec.ts` — home heading name.
- `tests/e2e/cr1-owner-cms.spec.ts` — one assertion only: the *live* published
  home heading is now the slogan. The rollback assertion further down was
  deliberately left on the old wording, because that step restores **revision
  1** — preserved history — and proving the restore brings the original line
  back is the point of the test. Changing it would have hidden a real
  regression in the rollback control.

## 28. C10 regression result

On the D1.8 tree, run step by step with `scripts/verify-c10.mjs --only <step>`
(the machine cannot hold the whole 31-step run in memory at once):

| Step | Result |
| --- | --- |
| format, lint, typecheck, unit (159), component (20), design, secrets | pass |
| db:reset, db:test, db:lint, db:types | pass — the new migration applies to an empty database and pgTAP is green |
| build, audit | pass |
| network (headers, CSP, security probe) | pass |
| e2e s9ap-public | pass (6) |
| e2e s9bp-public | pass (14) |
| e2e d1-visual | pass (5) |
| e2e c7-settings | pass (5) |
| e2e s6a-public | pass (6) |
| e2e cr1-owner-cms | pass (10) |
| e2e c9-intelligence | pass (6) |
| e2e s5a-admin | pass (3) |
| e2e s5a-visual | pass (1) |
| e2e c10-staff-access | pass (3) |
| e2e c8-intake | 7 pass; the 8th exceeds its wall-clock budget — see below |

### The c8-intake exception, measured rather than assumed

`c8-intake.spec.ts:592` ("lays out intake and lead screens at 390 / 768 /
1440 (+320, 200%) with axe passing") failed three times with
`Test timeout of 240000ms exceeded`. It is **not** a D1.8 defect:

1. **Every assertion passes.** Re-run with the describe-level budget lifted,
   the full suite is `8 passed (8.9m)` and the test itself completes in
   **3.7m (222s)** with all overflow, axe and screenshot checks green
   (`.playwright/d18-c8-probe.log`). The probe change was reverted
   immediately; `tests/e2e/c8-intake.spec.ts` is unmodified in this slice.
2. **The budget was already marginal.** 222s against a 240s ceiling is ~8%
   headroom, and this is the longest test in the repository (36 axe scans,
   19 full-page screenshots, a seven-step wizard walked at three widths,
   then four admin routes at three widths).
3. **The machine is uniformly slower than at the R1 gate**, including in
   suites D1.8 never touches:

   | Suite (admin-only, untouched by D1.8) | R1 gate | now |
   | --- | --- | --- |
   | c7-settings | 5.3m | 8.1m (+53%) |
   | c9-intelligence | 5.2m | 7.2m (+38%) |
   | s5a-admin | 3.5m | 4.7m (+34%) |

   The host has 8 GB total with ~0.8 GB free while Docker/Supabase, Next and
   Chromium run together. A uniform ~35–50% slowdown across untouched
   admin suites is host capacity, not a change in the public site.

**Honest status:** the C10 gate is green on 30 of 31 steps; `e2e:c8-intake`
is green on content and red on clock on this host. It was left exactly as
the C8 slice wrote it — re-budgeting another slice's test to turn a gate
green is the owner's call, not a change to make quietly inside a visual
pass. The recommendation is to raise that describe's `test.setTimeout` from
240s (it has ~8% headroom even on a healthy machine), or to run the suite on
a host with more free memory, before the cloud gate.

Results land in `.playwright/d18-gate2-results.txt`,
`d18-gate3-results.txt` and `d18-c8-probe.log`.

## 29. Remaining missing assets

Photographic media for the media families named in §7 of the brief
(residential, urban, hospitality, civic, industrial, interior, progress,
structural detail, materials, drawings, site context). No generator was
available in this session, so none was invented; the drawn system carries
the pages intentionally until the owner supplies or approves real media.

## 30. Remaining owner-confirmation items

- The business email spelling `renzconstruuction@gmail.com`.
- Whether any real (non-concept) project evidence may replace a concept
  study.
- Optional: keeping "From land to landmark." as an editorial line anywhere.

## 31. Files changed

New: `src/components/site/field-note.tsx`,
`supabase/migrations/20260924100000_d18_brand_and_copy.sql`,
`scripts/d18-shots.mjs`, `scripts/d18-align.mjs`,
`docs/RENZ_D18_VISUAL_COMPLETION_REPORT.md`.

Modified: `src/components/site/sections/domain-sections.tsx`,
`content-sections.tsx`, `src/components/site/insight-article.tsx`,
`src/components/site/landing/landing.tsx`,
`src/components/site/public-footer.tsx`,
`src/components/admin/auth-shell.tsx`,
`src/features/website/section-registry.ts`, `src/features/website/contracts.ts`,
`src/styles/final-pages.css`, `src/styles/admin-auth.css`,
`tests/component/public-states.test.tsx`, `tests/e2e/s6a-public.spec.ts`,
`tests/e2e/s9ap-public.spec.ts`, `tests/e2e/cr1-owner-cms.spec.ts`,
`docs/RENZ_DESIGN_FREEZE.md` (§7e), `docs/RENZ_PHASE_STATUS.md`.

## 32. Commit hash

Recorded after the regression gate closes.

## 33. What is now ready for cloud staging

The public experience states the client's slogan from one owner-editable
place, Insights reads as an editorial section rather than documentation,
every article has its own opener, the staff auth shell is composed, and the
layout is audited from 320 to 1920. The release candidate is otherwise the
R1 tree: cloud provisioning still waits on the Netlify / Supabase /
Cloudflare accounts (`docs/RENZ_R1_PRODUCTION_PROVISIONING_REPORT.md` §80).

STOP. Not deployed. No cloud resource created. No production migration begun.
