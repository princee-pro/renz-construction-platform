# Approved RENZ symbol — website integration

Date: 2026-09-25

## Authority and provenance

The user approved the Renz logo in Figma as the brand source of truth and explicitly requested website integration on 25 September 2026. This supersedes the earlier provisional Datum R selection for operational website branding. It authorizes this source change, not a deployment or unrelated redesign.

- Figma file: https://www.figma.com/design/W1epFP3XY4oxdQ9JiW4kfF
- Approved master export node: `3:319` (frame 07); geometry review frame: `2:6`.
- Supplied original reference: `codex-clipboard-0edbec27-c666-424e-9d62-0fc1d98b535a.png`; SHA-256 `F585B1D3A6B4069D6522E95D8F60E95EF05B376575B58E9AA68C6B2D8CBD4128`.
- Export: `renz-r-master.svg`, isolated Figma vector export from the preceding approved task. Repository SHA-256 `5C945A98309428A30D338D65419E8D8D3D42067E26156C51A182151047B8EB2F`; byte-identical to that export.
- Approval/allowed use: user-approved production website symbol, navbar, favicon and existing logo/loading applications. Independent ownership/trademark documentation was not supplied; no trademark or legal-clearance claim is made.
- Source recovery: Figma MCP remains at its Starter-plan quota. The saved export's hash was checked against the prior export manifest; no new geometry was invented or re-traced.
- Derivation: Figma's `preserveAspectRatio` was normalized to `xMidYMid meet` during the approved export pass. Thirteen paths, their coordinates and colors remain unchanged. The website integration does not alter the SVG.

## Runtime ownership

`public/media/brand/renz-r-master.svg` is the only website geometry asset. `src/lib/site/brand.ts` owns its public URL. `RenzIdentity` uses that SVG in the existing public header, mobile menu, footer, intro, home loading state and admin authentication/navigation. Existing text and responsive layout are preserved.

Light surfaces use the full-color master. Dark surfaces use the identical alpha silhouette in white through CSS, avoiding a duplicated white SVG. Monochrome and Windows forced-colors use the same SVG as a CSS mask. Image boxes reserve their dimensions, preserve aspect ratio, and load eagerly; repeated uses share one same-origin asset. Decorative images have empty alt text; standalone informative symbols use `RENZ`. Existing labelled home links retain their accessible names.

`scripts/generate-brand-favicon.mjs` derives one ICO containing 16, 32 and 48 px images from that same SVG. The white favicon tile protects the graphite silhouette on both light and dark browser chrome. Next.js discovers `src/app/favicon.ico` directly. No remote logo provider or new dependency is used.

The approved source takes precedence over the previous conditional CMS favicon and organization-logo slots for these website identity surfaces. The media settings API, rights/publication checks, document logo, sharing images and other CMS fields remain unchanged. Organization structured data points to the same public SVG only when the existing published identity and canonical URL conditions are met.

The gated `/brand-study` route retains its historical experiments, explicitly labelled as archived. It is not a second production identity. Historical audit records and client originals remain intact. UI colors, typography, navigation and other design decisions are not changed by the terracotta/graphite colors embedded in this logo.

## Verification

Checks run on 25 September 2026 against the local production build and existing local Supabase content. No database reset, seed, sign-in, publication or deployment was performed.

| Check | Command / method | Result |
| --- | --- | --- |
| Formatting | `corepack pnpm format:check` | Passed |
| Lint | `corepack pnpm lint` | Passed; subsequent changed TypeScript files also passed focused ESLint |
| Strict types | `corepack pnpm typecheck` | Passed |
| Unit/component tests | `corepack pnpm exec vitest run --maxWorkers=2` | 27 files, 182 tests passed |
| Production build | `corepack pnpm build` | Passed, including Next.js TypeScript validation |
| Secret scan | `corepack pnpm scan:secrets` | Passed, 848 text-capable files |
| Production dependencies | `corepack pnpm audit:production` | No known vulnerabilities found |
| Canonical tokens | `corepack pnpm design:tokens:check` | Passed |
| Design document | `corepack pnpm design:lint` | Exit 0; six existing orphan-token warnings, no errors |
| Diff hygiene | `git diff --check`, `git diff --cached --stat` | Clean whitespace; nothing staged |
| Browser suite | `node scripts/verify-renz-brand.mjs --skip-build` | Blocked before page assertions: bundled Chromium failed to spawn. Installed Chrome fallback also failed with Windows `EACCES`. These are not passing browser tests. |

The connected Codex browser successfully loaded the same local production build for direct visual and DOM verification:

- Desktop 1440 px, tablet 768 px, phones 390 px and 320 px: SVG loaded, correct proportions, white symbol on dark navigation, no horizontal overflow. Mobile wordmark visibility follows the existing breakpoints.
- Tablet and phone menus: approved symbol visible; Escape closes the dialog and returns focus to Menu.
- 320 px header: named home link receives keyboard focus; minimum target is 52 × 52 px, becoming 44.72 × 44.72 px in the scrolled state. The visible symbol remains compact.
- Footer and intro: approved white symbol inspected in the existing compositions.
- Sign-in at 1440 and 390 px: full-color symbol on the light form surface, white symbol on the desktop dark panel, no horizontal overflow. No credentials entered.
- 640 CSS-pixel layout, equivalent in layout width to a 1280 px window at 200% zoom: no horizontal overflow and the home control fits. This is reflow verification, not a claim of literal browser-zoom or assistive-technology coverage.
- Browser metadata contains a single derived favicon URL. No browser console errors were observed on the inspected sign-in page.

Direct Node HTTP assertions also passed: SVG HTTP 200, SVG MIME type, exact master hash, 13 paths, absence of script/raster/foreign-object/event-handler content; favicon HTTP 200 and ICO entries at 16, 32 and 48 px. The final sign-in logo and its reserved box both measure 36 × 36 px after isolating the auth text selector.

The dedicated Playwright suite additionally covers reduced motion, forced colors and scoped axe audits, but those automated assertions remain unverified because the browser process could not launch. Authenticated admin navigation was updated through the shared component but not visually checked behind login. Database/migration, cloud-provider and deployment checks are inapplicable to this source-only asset integration.

Favicon SHA-256: `B6C23825BB088CB32BB5522FF4A3400BA5383281608DC377CF3AE2B47D82C07E`. Regenerate with `node scripts/generate-brand-favicon.mjs`. One ICO contains the 16, 32 and 48 px derivatives; no duplicate white/black SVG or presentation PNG is shipped.

## File manifest

Added:

- `public/media/brand/renz-r-master.svg` — canonical approved source.
- `src/app/favicon.ico` — browser-sized derivatives.
- `src/lib/site/brand.ts` — canonical asset URL and accessible name.
- `src/components/site/renz-identity.tsx` — shared responsive rendering.
- `scripts/generate-brand-favicon.mjs` — reproducible favicon generation.
- `scripts/verify-renz-brand.mjs` — read-only local production/browser verification.
- `tests/component/renz-identity.test.tsx` — accessible-name and image behavior coverage.
- `tests/e2e/renz-brand.spec.ts` — responsive/asset/accessibility browser coverage.
- `docs/RENZ_LOGO_INTEGRATION.md` — this provenance and integration record.

Modified:

- `src/components/site/public-header.tsx`, `public-footer.tsx`, `brand-opener.tsx` — operational public identity uses, including mobile menu.
- `src/app/(public)/(home)/loading.tsx` — approved loading mark.
- `src/components/admin/auth-shell.tsx`, `admin-navigation.tsx` — authentication, sidebar, topbar and mobile drawer symbols.
- `src/app/layout.tsx` — derived favicon metadata ownership.
- `src/components/site/organization-structured-data.tsx` — same approved source for the published organization logo.
- `src/components/site/provisional-brand-study.tsx` — labels retained experiments as historical.
- `src/styles/final-nav.css` — canonical sizing, white/mono rendering, forced-colors support, responsive wordmark and home-link target.
- `src/styles/admin-auth.css`, `admin-shell.css`, `globals.css` — updated selectors; isolate auth text styles from logo internals.
- `src/styles/public.css` — removes obsolete generic loading illustration rules.
- `playwright.frontend.config.ts` — includes the dedicated logo test suite.
- `DESIGN.md`, `UX-CONTRACT.md`, `docs/PHASE_1_DECISION_REGISTER.md`, `docs/CLAUDE_C7_PUBLIC_CONFIGURATION.md`, `docs/RENZ_PHASE_STATUS.md` — dated approval/source-ownership updates; historical records preserved.

No dependencies or lockfiles changed. No commit or deployment was created.


## Approved silver architectural identity — 28 September 2026

The user explicitly revoked the terracotta/brick R direction and approved the attached black-and-silver RENZ CONSTRUCTION twin-tower logo as the new website source of truth. This decision supersedes the 25 September identity decision for all operational logo uses. The original is byte-preserved at `references/client/originals/03-renz-construction-silver-reference.png`; faithful vector derivatives, allowed use, hashes and checks are recorded in [RENZ_SILVER_BRAND.md](./RENZ_SILVER_BRAND.md). The opening and loading screens use the large stacked lockup on black; the responsive header uses a compact silver lockup linked to `/`. The approved opener now applies to the public homepage independently of preview mode, retaining its session, skip, reduced-motion, forced-colors and Save-Data bypasses. Existing business facts, historical audit records and unrelated UI colors remain under their existing contracts. This is source implementation authority, not deployment or general release approval.


## Orange identity clarification — 28 September 2026 (superseding update)

The user resolved the conflicting brief by explicitly selecting the orange curved R with the two-line Renz Construction wordmark. This later instruction supersedes the silver tower identity above for operational website branding. The supplied composition and traced lettering are retained in transparent SVGs; the full opening/loading logo appears on white, the responsive header logo links to the homepage, and existing shared identity placements and app icons use the same source. Provenance, preparation and current verification are recorded in [RENZ_ORANGE_BRAND.md](./RENZ_ORANGE_BRAND.md). Earlier dated decisions and checks remain historical; this bounded correction does not authorize deployment or change business facts.
