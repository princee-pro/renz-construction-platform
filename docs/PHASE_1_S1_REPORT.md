# RENZ Phase 1 / S1 Report

## 1. S1 status

**PARTIAL**

Final verification completed on 1 September 2026. The application, exact dependency graph, local quality gate, static production build, production smoke, responsive checks, security controls, and portable CI foundation are implemented and passing on the compatible local Node `24.18.1` runtime. The repository target is Node `24.20.0`; because that exact patch is not installed locally and the developer runtime was not mutated, exact-runtime verification remains partial. Git history is informational only under the 31 August project-lead override and does not affect this status.

## 2. Toolchain decisions

| Technology   |    Exact version | Support status            | Primary source                                                                       | Reason                                    | Rejected alternative                                    |
| ------------ | ---------------: | ------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------- |
| Node.js      |        `24.20.0` | LTS                       | [release](https://nodejs.org/en/blog/release/v24.20.0)                               | Latest patched Node 24 LTS                | Node 26 was Current                                     |
| pnpm         |        `11.25.0` | Supported v11             | [release](https://github.com/pnpm/pnpm/releases/tag/v11.25.0)                        | Mature major with current fixes           | Newly stable pnpm 12 major                              |
| Next.js      |         `16.3.3` | Active LTS                | [security release](https://nextjs.org/blog/august-2026-security-release)             | Current patched 16.3 security baseline    | Canary/prerelease or older 16.3 patch                   |
| React        |         `19.2.8` | Stable                    | [versions](https://react.dev/versions)                                               | Compatible stable 19.2 patch              | Prerelease/current development line                     |
| React DOM    |         `19.2.8` | Stable                    | [release](https://github.com/facebook/react/releases/tag/v19.2.8)                    | Exact React match                         | Mismatched renderer patch                               |
| TypeScript   |          `6.0.3` | Stable compatibility line | [TypeScript 6](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/) | Normal Next/tooling API path              | TypeScript 7.0.2 transitional API path                  |
| Tailwind CSS |          `4.3.3` | Stable 4.3                | [release](https://tailwindcss.com/blog/tailwindcss-v4-3)                             | Current v4 integration                    | Legacy v3 boilerplate                                   |
| ESLint       |         `10.9.1` | Current                   | [support](https://eslint.org/version-support/)                                       | Supported engine with direct flat plugins | EOL ESLint 9 or incompatible `eslint-config-next` chain |
| Prettier     |          `3.9.6` | Stable                    | [docs](https://prettier.io/docs/install)                                             | Deterministic formatter                   | Floating CLI/plugin stack                               |
| Vitest       |         `4.1.11` | Stable 4.1                | [release](https://vitest.dev/blog/vitest-4-1.html)                                   | Current compatible runner                 | Vanity tests or a second runner                         |
| Playwright   | `1.62.1` planned | Stable; deferred          | [release](https://github.com/microsoft/playwright/releases/tag/v1.62.1)              | Later visual acceptance loop              | Browser binaries in S1 without a need                   |
| design.md    |          `0.4.0` | Latest alpha; exact       | [upstream](https://github.com/google-labs-code/design.md)                            | Reproducible Windows/Linux design lint    | Floating `npx` execution                                |

The full source, license, compatibility, and alternative record is in `PHASE_1_S1_TOOLCHAIN.md`.

## 3. TypeScript 6 vs 7 decision

TypeScript `6.0.3` is selected. Microsoft documents TypeScript 7.0 as stable but without a stable programmatic API in 7.0, while the selected supported typed-lint stack accepts TypeScript `<6.1.0`. TypeScript 7 would require a dual/aliased compiler or other transitional infrastructure that S1 does not need. No experimental Next flag, alternative compiler backend, type suppression, or `ignoreBuildErrors` setting was introduced.

## 4. Package inventory

All direct package versions are exact; no `^` or `~` range exists.

### Production dependencies

| Package     | Exact version | Purpose                                      |
| ----------- | ------------: | -------------------------------------------- |
| `next`      |      `16.3.3` | App Router, server rendering, build, runtime |
| `react`     |      `19.2.8` | Component runtime                            |
| `react-dom` |      `19.2.8` | DOM/server renderer                          |

### Development dependencies

| Package                     | Exact version | Purpose                            |
| --------------------------- | ------------: | ---------------------------------- |
| `@eslint/js`                |      `10.0.1` | Core flat rules                    |
| `@google/design.md`         |       `0.4.0` | Deterministic design-contract lint |
| `@next/eslint-plugin-next`  |      `16.3.3` | Next/core-web-vitals rules         |
| `@tailwindcss/postcss`      |       `4.3.3` | Tailwind v4 PostCSS adapter        |
| `@testing-library/dom`      |      `10.4.1` | Semantic DOM query peer            |
| `@testing-library/react`    |      `16.3.3` | React component tests              |
| `@types/node`               |     `24.13.3` | Node 24 types                      |
| `@types/react`              |     `19.2.18` | React types                        |
| `@types/react-dom`          |      `19.2.5` | React DOM types                    |
| `eslint`                    |      `10.9.1` | Lint engine                        |
| `eslint-plugin-react-hooks` |       `7.1.1` | Official Hooks rules               |
| `globals`                   |     `17.11.0` | Node globals for config/scripts    |
| `jsdom`                     |      `30.0.1` | DOM test environment               |
| `postcss`                   |      `8.5.26` | CSS processing boundary            |
| `prettier`                  |       `3.9.6` | Formatting                         |
| `tailwindcss`               |       `4.3.3` | Utility CSS compiler               |
| `typescript`                |       `6.0.3` | Strict compilation                 |
| `typescript-eslint`         |      `8.68.0` | Typed lint parser/rules            |
| `vitest`                    |      `4.1.11` | Unit/component test runner         |

## 5. Files created/changed

### Application

- `src/app/layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx`
- `src/components/foundation-status.tsx`
- `src/lib/env/visibility.ts`
- `src/styles/globals.css`

### Configuration

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- `.node-version`, `.nvmrc`
- `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`
- `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`

### Testing

- `tests/unit/environment-visibility.test.ts`
- `tests/component/foundation-states.test.tsx`

### Scripts/security

- `scripts/scan-secrets.mjs`
- `scripts/audit-production.mjs`

### CI

- `.github/workflows/ci.yml`

### Documentation

- `docs/PHASE_1_S1_TOOLCHAIN.md`
- `docs/PHASE_1_S1_REPORT.md`
- `docs/PHASE_1_S1_FRONTEND_AUDIT.json`
- updated `docs/PHASE_1_DECISION_REGISTER.md` and `README.md`

No S0 client original or generated concept was modified.

## 6. Application architecture

The root page, layout, loading state, not-found state, and neutral foundation component are Server Components. The only Client Component is `src/app/error.tsx`, where Next requires an interactive reset boundary. There is no global provider, client state, third-party script, remote font, image, API route, or service layer.

The route composes a single shared foundation component; no empty `features`, repository, service, manager, controller, database, or Supabase structure was created. Tailwind v4 uses the official PostCSS adapter and `@import "tailwindcss"`; the CSS adds only neutral shell, focus, overflow, forced-color, and scrollbar foundations. It does not export or replace the provisional RENZ design contract.

S1 has no runtime environment values. A pure helper classifies `NEXT_PUBLIC_` names as public and all unprefixed names as server-only; no provider placeholders or `.env.example` were invented. Actual future server readers must remain server-only.

## 7. CI architecture

The Linux quality job runs on fixed `ubuntu-24.04` and independently executes frozen install, format, lint, typecheck, unit tests, component tests, design lint, secret scan, production build, and production audit. A smaller `windows-2025` job verifies the frozen install, formatter, strict types, tests, and filesystem scanner across Windows.

Workflow permissions are `contents: read`; checkout credentials are not persisted. `actions/checkout@v7.0.1` and `pnpm/setup@v2.1.0` are pinned to full commit SHAs with readable version comments. The setup action supplies exact Node/pnpm and lockfile-keyed package-store caching; no workspace, secret, or environment cache exists. There is no deployment, cloud provider, Supabase, Vercel, credential, or `pull_request_target` path.

## 8. Security and supply-chain review

- The dependency-free scanner traverses text-capable repository files deterministically, skips generated/binary paths, detects high-confidence credential formats, reports normalized locations, and redacts findings.
- The production audit reports no known vulnerabilities at the configured high-severity failure threshold.
- Direct dependencies and the package manager are exact; only `pnpm-lock.yaml` exists.
- pnpm strict peer/build checks are enabled. Installed manifests contain no `preinstall`, `install`, or `postinstall`; dependency metadata records no pending build.
- `typescript-eslint@8.69.0` was removed because it was published less than two hours before installation and required supply-chain release-age exceptions; `8.68.0` is used without exceptions.
- No environment credential, dangerous HTML, eval/dynamic execution, fake authentication, public secret, privileged API utility, or user-controlled URL exists.
- The Client Component imports only React-compatible route code and contains no server environment/data access.

## 9. Accessibility and responsive foundation

Verified foundations include `lang="en"`, semantic body/main structure, one H1, a skip link, visible `:focus-visible` CSS, native button/link controls, an accessible retry label, loading `aria-busy`, no unnecessary ARIA, no animation, and forced-colors-aware focus. Component tests verify landmark/heading semantics and retry behavior.

The production route was rendered at 320, 360, 390, 430, 768, 1024, and 1280 CSS pixels. At every width, the browser reported one visible main, one H1, and `scrollWidth <= clientWidth`; the 320-pixel render was visually inspected. This is a foundation check, not WCAG certification or the later public-experience QA pass.

## 10. Build/performance baseline

Next `16.3.3` produced `/` and `/_not-found` as prerendered static routes. The public foundation content is server-rendered and does not appear in the client-reference manifest. The only application-authored client island is the required error reset boundary; its emitted authored chunk is 1,078 bytes, alongside a 13,963-byte compiled CSS asset in this build. There are no remote fonts/images, third-party scripts, analytics, motion libraries, WebGL, carousel, client query/state library, or avoidable application hydration.

The production smoke returned HTTP 200, one main, one expected H1, `noindex, nofollow`, no obvious contact/credential claim, and no `X-Powered-By` response header. The server was stopped after the check.

## 11. Verification commands and exact results

| Command                                                    | Result  | Notes                                                                 |
| ---------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `node --version`                                           | PARTIAL | `v24.18.1`; compatible, but target is `24.20.0`                       |
| `pnpm --version`                                           | PARTIAL | Global shell is `11.19.0`; it was not mutated                         |
| `corepack pnpm@11.25.0 --version`                          | PASS    | Exact pinned runner returned `11.25.0`                                |
| `pnpm install --frozen-lockfile` via exact Corepack runner | PASS    | Lockfile unchanged                                                    |
| `pnpm format:check`                                        | PASS    | All selected S1 files formatted                                       |
| `pnpm lint`                                                | PASS    | Zero warnings                                                         |
| `pnpm typecheck`                                           | PASS    | Next route types generated; strict TypeScript passed                  |
| `pnpm test`                                                | PASS    | Two files, six tests                                                  |
| `pnpm test:unit`                                           | PASS    | One file, three tests                                                 |
| `pnpm test:component`                                      | PASS    | One file, three tests                                                 |
| `pnpm design:lint`                                         | PASS    | Zero errors, zero warnings, one informational token summary           |
| `pnpm scan:secrets`                                        | PASS    | No high-confidence finding                                            |
| `pnpm build`                                               | PASS    | Static `/` and `/_not-found`                                          |
| `pnpm audit:production`                                    | PASS    | No known vulnerabilities                                              |
| `pnpm verify`                                              | PASS    | Complete aggregate gate passed                                        |
| `git diff --check`                                         | PASS    | No whitespace error                                                   |
| strict frontend audit                                      | PASS    | Zero errors/warnings/findings after one scrollbar fallback correction |
| production server smoke                                    | PASS    | HTTP/semantics/robots/header/content checks passed; process stopped   |

Commands labeled `pnpm` were executed by the exact pinned `11.25.0` runner through Corepack because the user's global pnpm was intentionally left unchanged.

## 12. Code-quality search results

| Search                    | Application/config finding             |
| ------------------------- | -------------------------------------- |
| `"use client"`            | 1 — required route error boundary only |
| explicit `any`            | 0                                      |
| `@ts-ignore`              | 0                                      |
| `eslint-disable`          | 0                                      |
| `dangerouslySetInnerHTML` | 0                                      |
| `ignoreBuildErrors`       | 0                                      |
| committed/working `.env`  | 0                                      |
| fabricated RENZ facts     | 0 in application source                |

Documentation legitimately discusses prohibited patterns and unresolved client facts; those prose references are not runtime matches. The sole Client Component imports no server-only module. No alternate package-manager lockfile exists.

## 13. S1 senior-review findings

- Rejected same-hour `typescript-eslint@8.69.0` and removed pnpm's automatically proposed release-age exceptions; selected peer-compatible `8.68.0`.
- Rejected ESLint 9 because it is EOL and rejected `eslint-config-next` because its current legacy plugin chain is not ESLint-10 compatible; composed supported direct flat plugins instead.
- Avoided a direct Vite or React transform plugin; Vitest already provides the compatible transform stack.
- Removed test-only path alias dependence rather than adding another resolver plugin.
- Replaced fragile nested global-pnpm calls with direct aggregate commands and an audit wrapper that reuses the exact invoking package-manager process.
- Moved `saveExact: true` to the supported workspace root after an effective-configuration check showed that its initial package-scoped placement was ignored; `pnpm config get save-exact` now returns `true`.
- Separated ESLint's generated-output ignores into a pure global-ignore config object after a post-build lint exposed that combining them with `linterOptions` made the ignores non-global.
- The strict frontend audit found a missing standards-based scrollbar width fallback; `scrollbar-width: thin` fixed it and the rerun returned zero findings.
- Replaced a `currentColor` focus outline after manual contrast review showed it could disappear against a dark control; the explicit blue outline remains visible against the neutral shell and has a forced-colors override.
- Restored the Phase-0 `premium-audit.json` byte-equivalent content after the audit tool rewrote its root metadata, and normalized the new S1 audit artifact to a portable `.` root instead of retaining a machine-specific absolute path.
- Revalidated all 12 inventoried S0 image hashes plus the S0 inventory hash after the restoration; every value still matches the reviewed Phase-0 record.
- Made cross-platform import casing enforcement explicit in TypeScript so Windows-local development and Linux CI resolve source names consistently.
- Tightened the error-state test so its name and assertions prove native button semantics plus reset behavior without overstating simulated keyboard coverage.
- Confirmed the only client island is the error boundary, all direct versions are exact, CI has least privilege, and no S2, cloud, database, identity, content, or premium-frontend work entered the change.

## 14. G0–G6 current status

| Gate | Status after S1   | Effect                                                                                                                                       |
| ---- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| G0   | **PASS**          | S1 explicitly authorized; later slices still require authorization                                                                           |
| G1   | **PARTIAL**       | Production identity/public visual approval remains gated                                                                                     |
| G2   | **BLOCKED**       | Verified business/proof content remains absent                                                                                               |
| G3   | **SAFE-DEFERRED** | Auth/admin/role/workflow behavior remains absent                                                                                             |
| G4   | **SAFE-DEFERRED** | Intake, files, privacy-sensitive operations, analytics, messaging remain absent                                                              |
| G5   | **SAFE-DEFERRED** | Cloud/platform/region/recovery decisions and resources remain absent                                                                         |
| G6   | **PARTIAL**       | S1 governance is implemented; exact Node `24.20.0` execution remains unverified locally. Git history is informational, not a readiness gate. |

## 15. Remaining real blockers

- Exact Node `24.20.0` verification is outstanding; local checks used compatible Node `24.18.1`.
- G5 platform ownership, region, and recovery direction is unresolved and is an S2 entry gate.
- G1–G4 remain unresolved for their later affected capabilities; S1 did not need or invent those answers.

Absent Git history is not listed as a blocker under the current project-lead override.

## 16. Manual user actions required

1. Install/select Node.js `24.20.0` with the user's preferred runtime-management method, then run `corepack pnpm@11.25.0 verify` from the repository.
2. Either keep using `corepack pnpm@11.25.0 <command>` or intentionally activate pnpm `11.25.0` before using the shorter `pnpm <command>` form. No global package-manager change was made automatically.
3. Before authorizing S2, assign/approve the G5 local-environment, region/data-location, ownership, backup, and recovery direction. Do not provide secrets for this action.

## 17. S2 readiness

**BLOCKED**

S1 is internally usable on the compatible local Node 24 runtime, but the exact pinned Node patch has not been exercised and the roadmap requires G5 environment/recovery direction before S2. No S2 work should begin until those gates are explicitly resolved and S2 is assigned.

## 18. Recommended S2 scope

After the S2 entry gate passes, implement only the local data platform and migration spine from the roadmap: pin the local Supabase tooling; create source-controlled, repeatable SQL migrations; establish reviewed schema conventions, constraints, indexes, and explicit grant/RLS plans; generate database types; add unmistakably synthetic seeds and pgTAP reset/constraint tests; and document database versus object-storage recovery. Do not create production cloud resources, authentication, admin workflows, public content, intake, uploads, or deployment during S2.
