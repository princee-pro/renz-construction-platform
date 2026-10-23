# RENZ Construction — approved orange identity

Date: 28 September 2026 (later user clarification).

## Authority and provenance

After being asked to resolve the conflict between the pasted silver-logo brief and the orange attachments, the user selected the orange Renz Construction image with “this one”. This supersedes the earlier silver identity for website branding. The authorized scope remains logo assets, opening/loading screen, header, favicon and existing shared identity placements; no deployment or business-content changes.

- Source attachment: `codex-clipboard-a1ae2316-97e5-4fd9-970a-ac697a6aed7b.png`.
- Byte-preserved original: `references/client/originals/04-renz-orange-reference.png`, 1170 × 992 pixels.
- Original SHA-256: `c5a349fc21651758795081d364408a5b17694117b5e17022b898fdaae142f5b2`.
- Approval/allowed use: user-selected website logo, faithful preparation/vector reconstruction and integration, 28 September 2026.
- Rights state: user-supplied and user-authorized for this implementation; no independent ownership or trademark-clearance assertion.
- Derivation: the existing asset generator traces the actual orange symbol and lettering from the hash-verified raster. A 0.7-pixel prefilter removes compression noise, contour simplification has a 0.8-source-pixel tolerance, and one-pixel quadratic joins smooth the traced boundary. White margins are excluded and small clear space is added. The most frequent solid orange pixel is `#E7731E`; that sampled color is normalized across the artwork. This is a web vector derivative, not a recovered designer master or a new font substitution.
- Composition: retain the curved R at left and the actual two-line title-case Renz Construction lettering at right. The earlier instruction for stacked metallic towers no longer applies.

## Runtime ownership and placements

`src/lib/site/brand.ts` and `RenzIdentity` remain the single runtime owners. The full logo, icon and wordmark SVGs under `public/media/brand/` are transparent, contain vector paths only, and require no fonts. Existing names are retained so all shared consumers receive the new identity. The old generator has been replaced to prevent regeneration of the silver assets; its original reference and dated records remain intact.

The opening and loading screens use the full horizontal lockup, up to 920 CSS pixels wide and bounded to the viewport, on white. The header uses the traced symbol and two-line wordmark, links to `/` with accessible name “RENZ Construction home”, and retains the mobile menu behavior. Footer, menu, authentication/admin identity and conditional Organization logo inherit the approved orange artwork. The forced-colors masks use the same paths in system colors. Reduced-motion, Save-Data, repeat-session and restored-navigation bypasses remain; the intro stays skippable and clears within the existing 1.4-second budget.

Favicon (16/32/48 px) and Apple touch icon (180 px) derive from the same symbol on white. No new dependency, external asset host, CMS mutation, migration or deployment is needed. Unrelated page palettes and existing user changes are preserved.

## Verification

Fresh results and the derived asset hashes are appended after verification. Historical silver verification is not evidence for this orange update.

## Derived asset manifest

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `public/media/brand/renz-construction.svg` | 40609 | `24da7c1e212fa8642fc6c42d9875902e0e6783e536945e17b1742cf755e00323` |
| `public/media/brand/renz-construction-icon.svg` | 10536 | `018184fe0d8762dc48090c65fa4e1e6828a3a151ed2ee4ff40f6df07ec5950ac` |
| `public/media/brand/renz-construction-wordmark.svg` | 30224 | `de39c6b73226e7cd36f9fba3c55c5da9a19266623739a514adec69f40add601e` |
| `src/app/favicon.ico` | 2471 | `0cf426e01bd5b0e6389d047b0070c3fb9e8dbe86aef21db5743c5085962df84a` |
| `src/app/apple-icon.png` | 3420 | `fe4d827cd10613b94291fe1c29befaeaa78d0854f84c9738a7e272d0193feab3` |

## Verification results — 28 September 2026

- `node scripts/verify-renz-brand.mjs`: initial production build passed, including strict TypeScript; browser launch was blocked because another process owned port 3101. That process was preserved.
- `node .local/build-orange.mjs`: final production build passed. This ignored helper extracts the build portion of the existing verifier and uses the same discovered local Supabase publishable configuration, without printing credentials. It invokes `node node_modules/next/dist/bin/next build`. A separate local preview on port 3107 uses that build.
- `$env:RENZ_FRONTEND_BASE_URL='http://127.0.0.1:3107'; node scripts/verify-renz-brand.mjs --skip-build`: all 14 Chromium tests passed. An earlier run found a 4.6 px brand/Menu overlap at 320 px; the narrow wordmark width was corrected, then the full suite passed. The final subsequent source edit only added the dated clarification on the archived brand-study page; the final build and focused browser check verified that text.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 27 files / 183 tests passed.
- `node node_modules/typescript/bin/tsc --noEmit`: passed; the final production build also passed TypeScript.
- `node node_modules/eslint/bin/eslint.js . --max-warnings 0`: passed after renaming ignored backup copies to `.snapshot` so TypeScript ESLint did not treat them as application modules. Final edited study/generator files also passed focused ESLint.
- `node node_modules/prettier/bin/prettier.cjs . --check`: passed; final study text also passed focused formatting.
- `node scripts/scan-secrets.mjs`: passed, 856 text-capable files at the final source scan.
- `corepack pnpm audit:production`: no known vulnerabilities. Calling the audit script directly was correctly rejected because it requires the pinned package-manager environment; the proper command above passed.
- `node scripts/design-tokens.mjs check`: passed.
- `node node_modules/@google/design.md/dist/index.js lint DESIGN.md`: zero errors, six existing orphan-token warnings. Loading controls use graphite on white; orange remains within the approved logo paths, not ordinary body text.
- `git diff --check`: passed. `git diff --cached --stat`: no staged content. No commit or deployment.
- `node .local/validate-orange-assets.mjs`: original byte hash matches the attachment; all three SVGs use orange vector paths and contain no script, raster embedding, event handlers, foreignObject or metallic gradients; nine new document links resolve. Rasterized silhouette intersection-over-union against the supplied image is 98.24%, a geometric preparation check rather than a claim of an exact original vector master.
- `node .local/verify-orange-extra.mjs`: passed on the final production build: 844 × 390 short landscape (logo/skip control remain separate), 2.2-second delayed logo requests at 320 px (content remains accessible), JavaScript-disabled CSS intro dismissal, and the updated archived-study clarification.

Browser matrix: 320, 390, 768, 1024 and 1440 px; header before/after scrolling; mobile menu Escape/focus return; footer; home link from Contact; full opener at 320/768/1440; keyboard Skip intro, repeat-session bypass and automatic dismissal within 1.4 seconds; forced colors; reduced motion; 640 CSS-pixel reflow equivalent to a 1280 px window at 200% zoom; sign-in at desktop/mobile; favicon response and size entries. Scoped axe checks reported no serious or critical violations in header, footer and menu. Captures of the logo, desktop/mobile header and opening screen were visually inspected.

Limits: Chromium was exercised, not Firefox/WebKit or manual screen readers. Reflow is not a literal browser-zoom certification. Authenticated admin views were updated through the existing shared component but were not signed into. Database/RLS, cloud/provider, deployment and release checks are inapplicable to this source-only branding change. Existing business content, user changes and historical originals are preserved.

## Files changed by this orange update

- Source evidence: `references/client/originals/04-renz-orange-reference.png`.
- Website assets: the three SVGs and two app-icon files in the manifest above.
- Asset generation: `scripts/generate-renz-brand-assets.mjs`, `scripts/generate-brand-favicon.mjs`.
- Shared ownership/rendering: `src/lib/site/brand.ts`, `src/components/site/renz-identity.tsx`.
- Opening/loading: `src/components/site/brand-opener.tsx`, `src/app/(public)/(home)/loading.tsx`.
- Styles: `src/styles/final-nav.css`, `src/styles/public.css`.
- Archived study clarification: `src/components/site/provisional-brand-study.tsx`.
- Existing assertions updated for the approved source proportions: `tests/component/renz-identity.test.tsx`, `tests/e2e/renz-brand.spec.ts`.
- Canonical contract and dated corrections: `DESIGN.md`, `UX-CONTRACT.md`, `docs/PHASE_1_DECISION_REGISTER.md`, `docs/DESIGN_SYSTEM.md`, `docs/RENZ_PHASE_STATUS.md`, `docs/RENZ_LOGO_INTEGRATION.md`, `docs/RENZ_SILVER_BRAND.md`, `docs/S9A_MOTION_CHOREOGRAPHY.md`, `docs/CLAUDE_C7_PUBLIC_CONFIGURATION.md`, and this new report.

The token export was regenerated and checked; this update uses existing white/graphite/black/silver tokens and adds no second styling system. Existing public-header, footer, admin-navigation/auth and Organization-schema consumers inherit the new artwork without new changes to those files in this turn. The working tree already contained unrelated uncommitted changes, so a whole-repository Git diff includes more than this manifest.
