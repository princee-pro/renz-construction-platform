# RENZ Construction — approved silver website identity

Date: 28 September 2026.

## Authority and source

The user explicitly rejected the former terracotta/brick R and approved the attached silver architectural logo for reconstruction and website integration. This supersedes the 25 September identity decision. The user instruction authorizes the website assets, opening/loading screens, header, favicon and existing identity placements; it does not authorize deployment or new business claims.

- Source: user attachment `codex-clipboard-8f6ff9f0-5ca8-42c2-ad32-182d6ae0e1d4.png`.
- Byte-preserved original: `references/client/originals/03-renz-construction-silver-reference.png`.
- Original SHA-256: `d9952de6efd5e0c1fb8be8ca308ea62d40ad92bf667a9066529c68b48c21b6cc`.
- Approval/allowed use: explicitly approved website identity and faithful vector reconstruction by the user on 28 September 2026.
- Rights state: user-supplied and user-authorized for this implementation; independent ownership, trademark clearance and third-party rights documentation were not supplied. No legal-clearance assertion is made.
- Derivation: manually reconstructed SVG geometry following the supplied raster, retaining two unequal architectural tower faces, vertical ribs, roof/base chevron, four-pane window, geometric RENZ lettering and spaced CONSTRUCTION. This is a clean web reconstruction, not an assertion that an original designer's vector was recovered. All lettering is paths; no additional font or font license is required by the assets.

## Assets and single source

`scripts/generate-renz-brand-assets.mjs` owns the shared geometry and generates three transparent, font-independent SVGs:

- `public/media/brand/renz-construction.svg`: full stacked reference composition, symbol above RENZ above widely spaced CONSTRUCTION.
- `public/media/brand/renz-construction-icon.svg`: symbol only, used in compact lockups and browser/app icons.
- `public/media/brand/renz-construction-wordmark.svg`: compact outlined RENZ / CONSTRUCTION lettering for navigation; descriptor spacing is tightened to retain mobile readability.

`scripts/generate-brand-favicon.mjs` derives `src/app/favicon.ico` (16, 32, 48 px) and `src/app/apple-icon.png` (180 px) from the same symbol on black. No PNG of the full logo is shipped. The retired SVG is preserved outside the public directory at `references/client/superseded/renz-r-master-2026-09-25.svg`, with no operational reference to its URL.

`src/lib/site/brand.ts` owns asset URLs. `RenzIdentity` renders full, compact and icon-only placements. Silver shading is retained on dark surfaces; light contexts receive a black tile. System-color masks preserve both icon and outlined wordmark under forced colors. Informative identities expose one accessible name, “RENZ Construction”; decorative identities do not repeat the surrounding link label.

## Placement and behavior

- Public header: prominent compact lockup, 64 px symbol on desktop and 48 px on narrow screens, with both name lines visible. Link target `/`; accessible name “RENZ Construction home”. No scroll shrink.
- Opening screen: centered stacked logo up to 600 px wide, bounded by viewport width and short-screen height, on black. Complete identity is visible immediately with a subtle opacity entrance and short dissolve. Session and preference bypasses remain. No additional tagline competes with the logo.
- Home loading fallback: same full lockup with a short Loading status.
- Existing mobile menu, footer, admin authentication, admin navigation and conditional Organization structured data use the same new assets through their existing shared owner.
- Historical brand-study experiments remain explicitly archived, never presented as current identity.

Canonical black/silver brand-surface tokens are added to `DESIGN.md` and generated using the existing token pipeline. Other page content and the general site design are outside this bounded update.

## Verification

Fresh commands and results are recorded below after implementation verification. Historical checks in `RENZ_LOGO_INTEGRATION.md` apply to the superseded identity only.


## Derived asset manifest

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `public/media/brand/renz-construction.svg` | 2528 | `d42ed9596f79f2e133ed8d86a7cc6089e05596858ddfeb21f94fc7bda7c22e09` |
| `public/media/brand/renz-construction-icon.svg` | 997 | `7a0c0c9df2c5b6aaae74c0299ac744aa59bd9255e9935e03a394b08eceaed7b6` |
| `public/media/brand/renz-construction-wordmark.svg` | 1813 | `efb8ad6839bab0bf419a80f9a02fd60d2a1a6f27df141dae24168ef6f2d6f0e2` |
| `src/app/favicon.ico` | 5107 | `440895ae80d91d9d720c66e657acd04d547eeb1a4a849094e7baed83117202d3` |
| `src/app/apple-icon.png` | 16457 | `78ec59397728bd393be24c3c4ec6801030ec90a2e174aa5208038072a2a4f88e` |


## Verification results — 28 September 2026

- `node scripts/verify-renz-brand.mjs`: final production build (including Next.js strict TypeScript validation) passed; 14 Chromium browser tests passed against the existing local Supabase stack. No database mutation, seed, sign-in or publication was performed.
- `node node_modules/prettier/bin/prettier.cjs . --check`: passed.
- `node node_modules/eslint/bin/eslint.js . --max-warnings 0`: passed. Final browser-test changes also received focused ESLint verification.
- `node node_modules/typescript/bin/tsc --noEmit`: passed again on the final implementation; the final production build also revalidated TypeScript.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2`: 27 files, 183 tests passed. The existing loading-text assertion was updated to the approved simplified Loading label and new identity.
- `node scripts/scan-secrets.mjs`: passed, 853 text-capable files.
- `corepack pnpm audit:production`: no known vulnerabilities.
- `node scripts/design-tokens.mjs check`: passed.
- `node node_modules/@google/design.md/dist/index.js lint DESIGN.md`: zero errors; six existing orphan-token warnings. The two new brand tokens are referenced by the canonical brand-surface component.
- `git diff --check`: passed. `git diff --cached --name-only`: no staged content. No commit made.
- Direct Node checks: original attachment SHA-256 matches; retired public SVG absent; eight new provenance-document links resolve; all three brand SVGs contain no script, raster image, event handler or foreignObject.

Browser coverage: 320, 390, 768, 1024 and 1440 px; unscrolled/scrolled header; no horizontal overflow or logo/action overlap; both compact name lines visible; footer; mobile menu and Escape/focus return; navigation from Contact back to the root via the logo; 640 CSS-pixel reflow equivalent to a 1280 px window at 200% zoom; reduced motion; forced-color symbol mask; favicon response/ICO sizes; sign-in at desktop/mobile widths; full intro at 320/768/1440 px, centered within the screen excluding the reserved scrollbar gutter; keyboard skip, repeat-session bypass and automatic dismissal within 1.4 seconds. Scoped axe checks found no serious or critical violations in header, footer or mobile menu.

Captures were visually reviewed. This review found and corrected a 320 px logo/WhatsApp overlap by omitting the duplicate header shortcut below 400 px while retaining the floating/menu action, and increased compact descriptor height for readability. The first new centering assertion incorrectly counted the reserved scrollbar gutter; it was corrected to compare against the actual opening-screen bounds. All 14 final assertions passed. The test server emitted early destination-stream closure messages during navigation/reload; no browser assertions failed. These checks do not claim literal browser zoom, screen-reader certification or authenticated admin visual coverage.

The local Node runtime is 24.18.1; the final build and checks ran on that installed runtime. No dependencies or lockfiles changed. Database/RLS, cloud/provider, deployment and release checks are inapplicable to this source-only branding update.

## Files changed in this update

- Assets/source archive: the three generated SVGs, favicon, Apple touch icon, byte-preserved new original and archived former SVG listed above.
- Asset ownership/generation: `src/lib/site/brand.ts`, `src/components/site/renz-identity.tsx`, `scripts/generate-renz-brand-assets.mjs`, `scripts/generate-brand-favicon.mjs`.
- Public integration: `src/components/site/public-header.tsx`, `src/components/site/brand-opener.tsx`, `src/components/site/provisional-brand-study.tsx`, `src/app/(public)/layout.tsx`, `src/app/(public)/(home)/loading.tsx`.
- Styles/tokens: `src/styles/final-nav.css`, `src/styles/public.css`, `src/styles/design-tokens.generated.css`, `DESIGN.md`.
- Tests: `tests/component/renz-identity.test.tsx`, `tests/component/public-states.test.tsx`, `tests/e2e/renz-brand.spec.ts`.
- Dated contract corrections: `UX-CONTRACT.md`, `docs/PHASE_1_DECISION_REGISTER.md`, `docs/RENZ_LOGO_INTEGRATION.md`, `docs/RENZ_PHASE_STATUS.md`, `docs/DESIGN_SYSTEM.md`, `docs/S9A_MOTION_CHOREOGRAPHY.md`, `docs/CLAUDE_C7_PUBLIC_CONFIGURATION.md`, and this record.

The working tree already contained the earlier integration and unrelated edits. Existing footer, admin and organization-schema consumers receive the new identity through the shared component/URL owner; their pre-existing changes were preserved.


## Orange identity clarification — 28 September 2026 (superseding update)

The user resolved the conflicting brief by explicitly selecting the orange curved R with the two-line Renz Construction wordmark. This later instruction supersedes the silver tower identity above for operational website branding. The supplied composition and traced lettering are retained in transparent SVGs; the full opening/loading logo appears on white, the responsive header logo links to the homepage, and existing shared identity placements and app icons use the same source. Provenance, preparation and current verification are recorded in [RENZ_ORANGE_BRAND.md](./RENZ_ORANGE_BRAND.md). Earlier dated decisions and checks remain historical; this bounded correction does not authorize deployment or change business facts.
