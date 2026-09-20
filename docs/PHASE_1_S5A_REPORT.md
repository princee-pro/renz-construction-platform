# RENZ Phase 1 / S5A Implementation Report

**Execution date:** 6 September 2026  
**Final revalidation:** 7 September 2026  
**S5A status:** PASS  
**S5 overall:** IN PROGRESS

## 1. Outcome

S5A establishes a production-structured, local-only administration workspace and completes the synthetic Services authoring vertical. A verified AAL2 staff actor can enter the workspace, see capability-filtered navigation, list/filter/create/edit/preview Services, manage evidence, understand authoritative readiness, and—only with Super Admin authority—publish, unpublish, or archive. Recoverable failures and optimistic conflicts preserve local editor values.

This is not the final RENZ public site, a claim that real content is ready, or completion of the overall S5 roadmap. No cloud resource, deployment, public page, production upload, analytics integration, project editor, broad media library, order, quote, invoice, or real RENZ fact was created.

## 2. Tooling decisions

| Package | Exact version | Role | Decision |
| --- | --- | --- | --- |
| `@playwright/test` | `1.63.0` | Dev | Stable Chromium browser acceptance for real interactive admin workflows; Apache-2.0. |
| `@axe-core/playwright` | `4.13.0` | Dev | Serious/critical accessibility automation inside the real Playwright session; MPL-2.0. |

Version evidence was revalidated from the [Playwright release notes](https://playwright.dev/docs/release-notes), [Playwright package record](https://www.npmjs.com/package/@playwright/test), and [axe Playwright package record](https://www.npmjs.com/package/@axe-core/playwright) on 6 September 2026. Both packages are exact-pinned in the manifest and lockfile. Only Chromium is installed in local/CI browser setup. Browser binaries and output remain ignored.

No UI framework, dashboard template, headless component library, animation package, icon library, client query cache, or global state dependency was admitted. Native HTML dialogs were sufficient for modal focus, inertness, and Escape behavior.

## 3. Implementation inventory

- authenticated `(workspace)` route group with desktop rail and mobile drawer;
- Overview, Services register/create/editor/private-preview, Security, loading/error/not-found states;
- capability registry and exact application permission vocabulary;
- explicit Services contracts, server data layer, Server Actions, UI primitives, and editor components;
- forward migration `20260906133000_establish_s5a_services_admin.sql`;
- pgTAP suite `009_s5a_services_admin.sql` with 37 S5A assertions;
- unit/component tests plus four production-browser scenarios;
- deterministic Playwright setup/teardown with five synthetic MFA actors;
- isolated Linux S5A browser CI job;
- S5A architecture, workflow, accessibility, and implementation records.

## 4. Database boundary

S5A adds one admin-list index and eight narrow, permission-gated functions. All use explicit inputs/outputs, `security definer` only where required, an empty `search_path`, authenticated-only execution grants, fresh AAL2 permission evaluation, expected-version comparison, and redacted audit metadata. The register is bounded and keyset-paginated; detail/readiness/evidence is returned without application N+1 queries.

The ordered history now contains 27 migrations. The complete nine-file database suite passes 369/369 assertions, database lint returns zero findings, and generated TypeScript database types match the reset schema.

## 5. Authorization behavior

`admin` can read Services, create/update Draft records, and create/submit evidence. It cannot verify evidence, publish, unpublish, or archive. `super_admin` can perform those operations through separate `claims.verify`, `content.publish`, and `content.archive` permissions.

Navigation filtering is only a convenience. Direct routes call AAL2/permission guards; every Server Action rechecks authenticated identity, active profile, AAL2, and the exact permission; database commands and S4 publication functions enforce authority again. No application mutation uses the local operator key.

## 6. Browser and visual evidence

Playwright runs a production build on port 3100 against the isolated local Supabase stack. Global setup resets the schema, creates reserved `example.test` actors, assigns exact roles, enrolls and verifies TOTP, activates profiles, and writes credentials only to a mode-0600 ignored fixture. Teardown resets the schema and deletes that fixture.

Four scenarios cover AAL1 rejection; Admin capability filtering and disabled-account failure; the complete create/edit/evidence/verify/publish/anonymous-projection/unpublish/archive/two-actor lifecycle; and the 390px/768px responsive and axe matrix. Representative screenshots were inspected manually and corrected over three review loops. The final 7 September rerun completed warning-clean with retries disabled, and the strict premium-interface audit returned zero findings.

## 7. Verification record

| Verification | Result |
| --- | --- |
| Database rebuild/reset | PASS; repeated clean rebuilds through database/S4/browser harnesses |
| pgTAP | PASS; 9 files, 369 assertions |
| Database lint | PASS; zero warnings/errors |
| Generated DB types | PASS; no drift |
| Unit tests | PASS; 9 files, 39 tests |
| Component tests | PASS; 3 files, 15 tests |
| Browser tests | PASS; 4 Chromium scenarios |
| axe serious/critical scan | PASS; zero representative violations |
| Format / ESLint / TypeScript | PASS |
| Design contract / secret scan | PASS |
| Production build / production audit | PASS |
| S3 Auth regression | PASS |
| S4 regression | PASS |

The final command-by-command evidence is also reported in the S5A completion response. Exact repository pnpm `11.25.0` is used through Corepack because the host's plain pnpm is `11.19.0`. The compatible local Node runtime is `24.18.1`; CI remains the exact `24.20.0` runtime proof boundary.

## 8. Security findings

- Auth identity is validated with `getUser()` and AAL is read from verified JWT claims; no cookie-sourced user object is trusted.
- Private preview is dynamic, noindex, nofollow, and private/no-store.
- All identifiers and locale/cursor inputs are bounded and validated before query use.
- Evidence review requires the exact `in_review` state under row lock; null, stale, and unsubmitted direct commands fail without mutation.
- Raw markup, unknown blocks, executable protocols, malformed UUIDs, and unrecognized operations fail closed.
- Audit activity and command errors avoid field bodies, evidence contents, SQL detail, credentials, and staff-sensitive identity.
- Anonymous projection contains only S4-published eligible data; browser tests prove appearance after publish and withdrawal after unpublish/archive.
- The final client-bundle scan finds no local operator key, test password, TOTP secret, private evidence reference, database URL, or server-only operation module.

## 9. Accessibility and performance findings

The workspace is semantic, keyboard-operable, focus-visible, responsive, text-labeled, and reduced-motion safe. Native dialogs provide modal behavior without adding a runtime library. The mobile register is a labeled stacked composition rather than a squeezed table. Validation moves focus and retains input.

Server Components own initial reads and route authorization. Client JavaScript is limited to the drawer, forms/editors, dialogs, and error boundary. The Services register is bounded, overview reads are parallel, and no remote font/image, analytics, rich-text editor, animation runtime, or unbounded JSON hydration was added.

## 10. Reconciliation and stop boundary

Browser teardown restores the canonical synthetic seed, removes all S5A Auth actors, eliminates publication/audit fixture noise, and leaves no Storage objects. The test credential fixture is absent after completion. Screenshots and traces remain ignored local QA artifacts only.

S5A stops here. S5B may address Projects and Project Media administration after explicit authorization and entry review. S6 public content delivery, the final public visual experience, cloud resources, production data, uploads, analytics, orders/invoices, and deployment remain unimplemented.
