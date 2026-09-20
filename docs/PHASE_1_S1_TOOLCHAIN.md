# RENZ Phase 1 / S1 Toolchain Record

**Decision date:** 31 August 2026

**Final verification date:** 1 September 2026

**Scope:** S1 application, developer-experience, test, security, and CI foundation only
**Risk posture:** production stability, exact pins, minimal runtime surface, and no experimental compiler path

## Selected platform

Exact patches were revalidated against first-party release/support material and registry metadata before installation.

| Technology    |    Exact version | Support status                  | Primary evidence                                                                                                                                                                                        | Selection and rejected alternative                                                                                                                                                                                                                                                                     |
| ------------- | ---------------: | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js       |        `24.20.0` | LTS                             | [Node release](https://nodejs.org/en/blog/release/v24.20.0), [release lines](https://nodejs.org/en/about/previous-releases)                                                                             | Latest patched Node 24 LTS on the decision date. Node 26 was rejected because it was Current, not the production-LTS line.                                                                                                                                                                             |
| pnpm          |        `11.25.0` | Supported v11                   | [pnpm v11](https://pnpm.io/blog/releases/11.0), [v11.25.0 release](https://github.com/pnpm/pnpm/releases/tag/v11.25.0)                                                                                  | Keeps the mature v11 major while taking current fixes. pnpm 12 was rejected because the new major and Rust rewrite had only just become stable.                                                                                                                                                        |
| Next.js       |         `16.3.3` | Active LTS                      | [support policy](https://nextjs.org/support-policy), [August security release](https://nextjs.org/blog/august-2026-security-release), [release](https://github.com/vercel/next.js/releases/tag/v16.3.3) | Current patched 16.3 production baseline and security floor. Canary/prerelease lines were rejected.                                                                                                                                                                                                    |
| React         |         `19.2.8` | Stable 19.2                     | [React versions](https://react.dev/versions), [release](https://github.com/facebook/react/releases/tag/v19.2.8)                                                                                         | Stable patch accepted by Next 16.3.3.                                                                                                                                                                                                                                                                  |
| React DOM     |         `19.2.8` | Stable 19.2                     | [release](https://github.com/facebook/react/releases/tag/v19.2.8)                                                                                                                                       | Matches React exactly and satisfies its peer contract.                                                                                                                                                                                                                                                 |
| TypeScript    |          `6.0.3` | Stable compatibility line       | [TypeScript 6](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/), [TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)                              | Normal supported compiler/API path. TypeScript 7.0.2 was rejected for S1; see the dedicated decision below.                                                                                                                                                                                            |
| Tailwind CSS  |          `4.3.3` | Stable 4.3                      | [Tailwind 4.3](https://tailwindcss.com/blog/tailwindcss-v4-3), [Next integration](https://tailwindcss.com/docs/installation/framework-guides/nextjs)                                                    | Current compatible patch with the v4 PostCSS adapter. Legacy v3 configuration was rejected.                                                                                                                                                                                                            |
| ESLint        |         `10.9.1` | Current supported line          | [version support](https://eslint.org/version-support/), [Next ESLint guidance](https://nextjs.org/docs/app/api-reference/config/eslint)                                                                 | Current ESLint with direct Next, TypeScript, and React Hooks flat plugins. ESLint 9 is EOL; `eslint-config-next@16.3.3` was rejected because its legacy React/import/a11y plugin peers still exclude ESLint 10 and have a [confirmed incompatibility](https://github.com/vercel/next.js/issues/89764). |
| Prettier      |          `3.9.6` | Stable                          | [installation guidance](https://prettier.io/docs/install)                                                                                                                                               | Exact formatter with no ESLint bridge/plugin duplication.                                                                                                                                                                                                                                              |
| Vitest        |         `4.1.11` | Stable 4.1                      | [Vitest 4.1](https://vitest.dev/blog/vitest-4-1.html)                                                                                                                                                   | Current compatible 4.1 patch. Vite is transitive; it is not duplicated as a direct dependency.                                                                                                                                                                                                         |
| Playwright    | `1.62.1` planned | Stable; deferred                | [release notes](https://playwright.dev/docs/release-notes), [release](https://github.com/microsoft/playwright/releases/tag/v1.62.1)                                                                     | Recorded for the later visual/browser slice. Installing the runner and browsers in S1 would add cost without an S1 acceptance need.                                                                                                                                                                    |
| design.md CLI |          `0.4.0` | Latest alpha; narrowly admitted | [upstream](https://github.com/google-labs-code/design.md)                                                                                                                                               | Exact local CLI makes `DESIGN.md` lint reproducible on Windows and Linux. A floating `npx` invocation was rejected. The npm manifest omits a license field; upstream is Apache-2.0.                                                                                                                    |

## TypeScript 6 versus 7

TypeScript 7.0.2 is stable as a language/compiler release, but Microsoft states that 7.0 does not yet provide a stable programmatic API and describes side-by-side TypeScript 6 use for tooling that needs that API. The selected `typescript-eslint@8.68.0` supports TypeScript `>=4.8.4 <6.1.0`; moving to TypeScript 7 would therefore require a dual/aliased compiler or another transitional arrangement that S1 does not need. Next's normal stable path works with TypeScript 6, so `6.0.3` is selected without experimental Next flags or an experimental compiler backend.

## Direct dependency inventory

Every entry below is exact. The lockfile pins the transitive graph.

### Production

| Package     |  Version | Purpose                                          | License |
| ----------- | -------: | ------------------------------------------------ | ------- |
| `next`      | `16.3.3` | App Router, server rendering, build, and runtime | MIT     |
| `react`     | `19.2.8` | Component runtime                                | MIT     |
| `react-dom` | `19.2.8` | DOM/server renderer                              | MIT     |

### Development

| Package                     |   Version | Purpose                                        | License/status note                              |
| --------------------------- | --------: | ---------------------------------------------- | ------------------------------------------------ |
| `@eslint/js`                |  `10.0.1` | Core flat recommended rules                    | MIT                                              |
| `@google/design.md`         |   `0.4.0` | Deterministic `DESIGN.md` lint                 | Upstream Apache-2.0; npm license metadata absent |
| `@next/eslint-plugin-next`  |  `16.3.3` | Next and core-web-vitals lint rules            | MIT                                              |
| `@tailwindcss/postcss`      |   `4.3.3` | Official Tailwind v4 PostCSS adapter           | MIT                                              |
| `@testing-library/dom`      |  `10.4.1` | Required semantic DOM query peer               | MIT                                              |
| `@testing-library/react`    |  `16.3.3` | React semantic/component tests                 | MIT                                              |
| `@types/node`               | `24.13.3` | Node 24 types                                  | MIT                                              |
| `@types/react`              | `19.2.18` | React types                                    | MIT                                              |
| `@types/react-dom`          |  `19.2.5` | React DOM types                                | MIT                                              |
| `eslint`                    |  `10.9.1` | Supported lint engine                          | MIT                                              |
| `eslint-plugin-react-hooks` |   `7.1.1` | Official Hooks/compiler rules                  | MIT                                              |
| `globals`                   | `17.11.0` | Node globals for config/security scripts       | MIT                                              |
| `jsdom`                     |  `30.0.1` | DOM runtime for component/error-boundary tests | MIT                                              |
| `postcss`                   |  `8.5.26` | Tailwind/PostCSS execution boundary            | MIT                                              |
| `prettier`                  |   `3.9.6` | Deterministic formatter                        | MIT                                              |
| `tailwindcss`               |   `4.3.3` | Utility CSS compiler                           | MIT                                              |
| `typescript`                |   `6.0.3` | Strict compiler and framework type checks      | Apache-2.0                                       |
| `typescript-eslint`         |  `8.68.0` | Typed ESLint parser/rules                      | MIT                                              |
| `vitest`                    |  `4.1.11` | Unit and component test runner                 | MIT                                              |

`typescript-eslint@8.69.0` was evaluated and rejected after pnpm showed that it had been published less than two hours before installation and requested release-age exceptions for its package family. The week-old `8.68.0` release is peer-compatible with ESLint 10 and TypeScript 6 without bypassing pnpm's release-age policy.

## Runtime and package-manager state

The repository and CI target Node `24.20.0` through `.node-version`, `.nvmrc`, and the workflow. The local host has Node `24.18.1`; it satisfies every selected package's engine floor and completed the S1 checks, but exact-target verification remains partial until Node `24.20.0` is used. No system runtime was changed.

The repository pins `pnpm@11.25.0`. The host's global `pnpm` is `11.19.0`, but Corepack executed `11.25.0` directly without replacing it. `pnpm-workspace.yaml` enables exact saves, strict peer checks, strict dependency-build review, and stale-install refusal. Only `pnpm-lock.yaml` is authoritative.

No installed published package declares a `preinstall`, `install`, or `postinstall` hook, and `node_modules/.modules.yaml` records no pending builds. No allow-list entry was required. The project adds no lifecycle hook of its own.

## Environment contract

S1 requires no runtime variables and therefore adds no schema package or provider-shaped placeholders. The pure `classifyEnvironmentVariable` helper records the boundary:

- names beginning with `NEXT_PUBLIC_` are public/browser-exposed;
- unprefixed names are server-only;
- future server readers must remain in server-only modules and must not be imported by Client Components.

Secret-bearing `.env*` files remain ignored; no `.env.example` is needed until a real integration introduces a named contract.

## Test strategy

- The Node project tests public/server-only name classification and invalid empty names.
- The jsdom project tests the foundation `<main>`/H1 semantics, loading semantics, and the narrow error boundary's retry behavior.
- Tests query accessible roles/text rather than internal component state.
- Coverage thresholds are intentionally deferred until application behavior exists.
- Playwright and browser binaries are deferred. Later visual work must use: **IMPLEMENT → BUILD → RENDER → SCREENSHOT → INSPECT → CORRECT → REPEAT**. Passing source checks alone will not complete a visual feature.

## CI design

`.github/workflows/ci.yml` is a portable quality harness, not deployment configuration.

- Linux (`ubuntu-24.04`) runs frozen install, formatting, lint, strict typecheck, unit and component tests, design lint, secret scan, production build, and production audit.
- Windows (`windows-2025`) exercises frozen install and the cross-platform source/test/scanner subset.
- `actions/checkout@v7.0.1` and `pnpm/setup@v2.1.0` are pinned to full immutable commit SHAs; comments retain the readable releases.
- `pnpm/setup` supplies exact pnpm `11.25.0` and Node `24.20.0`, restores only the lockfile-keyed pnpm cache, and does not install dependencies implicitly.
- Permissions are `contents: read`; checkout credentials are not persisted. There are no secrets, cloud credentials, provider calls, or deployment jobs.

## Upgrade policy

Upgrades are explicit reviewed changes: re-check first-party support/security status, peer ranges, engine floors, release age, licenses, lifecycle scripts, lockfile diff, audit, and the full verification gate. Do not float CLIs, adopt canary/prerelease packages, jump package-manager majors for novelty, or move to TypeScript 7 until Next and the lint/tooling stack support its normal production API path.
