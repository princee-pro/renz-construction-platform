# RENZ Phase 1 / S6A Implementation Report

**Status date:** 8 September 2026  
**Status:** **PASS within the authorized local client-preview boundary**  
**Ordering decision:** S6A was deliberately accelerated ahead of S5B for the imminent client-facing preview. S5B Projects + Project Media administration remains mandatory and unimplemented.

## Outcome

The neutral S1 homepage has been replaced by a production-capable, server-first public route system with a restrained Datum & Mass identity, accessible architectural navigation, Living Datum, CSS/SVG construction field, responsive editorial layouts, honest empty states, technical SEO adapters, and direct S4 published-projection reads. The experience is noindex/nofollow, uses no invented RENZ proof or contact data, makes no anonymous mutation, and creates no deployment or cloud resource.

The implementation is designed to survive real content rather than hide its absence. Projects, services, posts, team, credentials, testimonials, public settings, and safe page content appear only from S4 publication projections. Project/media administration remains a separate S5B responsibility.

## Delivery inventory

### Public routes

`/`, `/expertise`, `/projects`, `/about`, `/insights`, `/contact`, `/start-a-project`, `/privacy`, and `/terms`, plus safe detail foundations at `/expertise/[slug]`, `/projects/[slug]`, and `/insights/[slug]`.

### Public experience

- Header/footer and full-screen architectural navigation
- Cinematic but immediately readable server-rendered hero
- Living Datum and architectural geometry field
- Homepage editorial sequence with data-dependent modules
- Journey-oriented expertise register
- Editorial projects/insights registers and detail foundations
- Evidence-gated About, Contact/location, legal, and project-entry routes
- Loading, error, not-found, reduced-motion, forced-colors, and narrow-reflow behavior
- Local-only preview indicator and explicitly labelled non-evidentiary project composition study

### Engineering

- Server-only anonymous projection adapter with explicit columns, limits, immutable contracts, and safe structured blocks
- S4 cache tags connected to real public reads
- Dynamic metadata, safe canonical override support, noindex/nofollow and restrictive robots output
- `DESIGN.md` → generated Tailwind v4 token export with deterministic drift check
- Public unit/component tests, Playwright route/keyboard/reduced-motion/axe coverage, screenshot matrix, and S5A publish/unpublish regression
- Linux CI browser job upgraded to the combined S6A public + S5A regression gate

## Verification evidence

The completion gate includes:

- formatting, zero-warning ESLint, strict TypeScript;
- 47 unit tests and 17 component tests;
- design lint and generated-token drift check;
- redacted repository secret scan and production dependency audit;
- Next.js production build and route-mode review;
- public production-browser coverage including real 404s, noindex, one H1, empty/populated synthetic paths, modal keyboard behavior, reduced motion, axe, and the full reflow width matrix;
- S5A production-browser regression;
- S4 database/Auth/content/media/publication regression under the local stack;
- strict premium project audit and manual anti-pattern searches.

The base visual matrix is retained under the ignored `.playwright/screenshots/` workspace and contains the 1440px homepage, open menu, expertise, and empty Projects captures; 390px homepage/hero, navigation, expertise, and empty Projects captures; plus 320px, 768px, and 1728px homepage captures. The isolated evidence-publication phase adds `s6a-1440-projects-populated-synthetic.png` and `s6a-1440-project-detail-populated-synthetic.png`. These two captures are test evidence only: every fixture value is visibly labelled `SYNTHETIC`, no image is rendered, and neither capture is client content or a demo asset.

## Visual QA corrections made

1. A root loading boundary was found to flush a `200` before detail `notFound()`; homepage loading was moved into a dedicated route group, restoring real `404` status.
2. Generated Tailwind tokens were initially imported outside the runtime CSS graph; the export is now imported by `globals.css`, and the built CSS contains the intended variables.
3. Gold microcopy on concrete failed automated contrast; light-surface accent text now uses a derived darker semantic alias while dark surfaces retain the approved gold.
4. Early menu/large-screen captures caught entrance motion before resolution; screenshot settlement and final opacity assertions now capture the intended state.
5. Mobile/tablet/large compositions were inspected and the 320px homepage was added as explicit evidence in addition to overflow assertions.
6. The combined Admin/public regression exposed an ambiguous Playwright `Publish` locator matching `Confirm unpublish` and allowing navigation to cancel the in-flight action. The lifecycle test now waits for the exact success message and exact action control, then verifies the base row, anonymous projection, and public `404`; completed Server Actions also use immediate `updateTag` expiration, backed by a unit contract.
7. Public URL values were already constrained by the S4 database publication boundary; S6A now preserves that invariant in the TypeScript projection adapter as defense in depth for canonical overrides and allow-listed public URL settings.
8. Final requirement reconciliation found that current public navigation state was not yet programmatically exposed. Desktop and architectural-index navigation now share the existing client island and mark the exact current section with `aria-current="page"`, with a browser assertion across every represented public route.
9. Project browser coverage is split into two clean builds and data resets: the main phase proves the intentional zero-project composition, then the stopped server's generated data cache is removed before an isolated AAL2/evidence/publication fixture proves the anonymous projection, populated index, and server-rendered detail. Teardown removes every synthetic row.
10. The final production-server smoke found that Next's persistent generated data cache could outlive the populated-project database teardown. The S6A verifier now reconciles that cache in a `finally` boundary on success or failure; a repeated two-phase gate and clean-preview smoke prove that no test publication leaks into the client preview.

## Risk and readiness

G1 identity approval, G2 real content/proof, G3 remaining operating ownership, G4 intake/privacy/upload policy, and G5 platform/deployment ownership remain unresolved or safely deferred. The exact Node `24.20.0` runtime is enforced in CI; the local host remains on compatible Node `24.18.1`.

S6A is complete; S9A is only **PARTIAL** in readiness because final identity, fonts, rights-cleared project media, and real approved copy are absent. Based on the current evidence, S5B Projects + Project Media administration is the recommended next slice because it supplies the governed workflow needed to populate the strongest public storytelling surfaces without bypassing evidence or rights controls.

No S7, S8, S9 implementation, deployment, Vercel project, Supabase cloud resource, analytics provider, public form, upload, or lead record was created.
