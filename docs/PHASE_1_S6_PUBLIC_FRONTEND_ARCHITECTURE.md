# RENZ Phase 1 / S6 Public Frontend Architecture

**Status date:** 8 September 2026  
**Implemented slice:** S6A — public experience foundation and local client preview  
**Boundary:** read-only public delivery; no intake, anonymous mutation, privileged key, deployment, or final brand/content approval

## 1. Architectural decision

The public experience is a single Next.js App Router surface under `src/app/(public)`. Route files remain Server Components and compose narrow public components. The public layout owns the header, footer, and server-only client-preview flag; it does not introduce a site-wide provider or hydration boundary.

`PublicMenu` is the only public application/navigation client island. It exists because the native modal dialog needs open/close state, focus placement/restoration, and scroll-lock cleanup. The route error boundary is the only other public Client Component, narrowly because Next requires interactive error recovery. Static page content, public registers, metadata, structural geometry, and motion styling remain server-rendered.

## 2. Route ownership

| Route | Data owner | Empty/missing behavior |
| --- | --- | --- |
| `/` | `getPublicHomepageSnapshot` | Optional projects, testimonials, and insights collapse; expertise has an honest inline empty state. |
| `/expertise` | `getPublishedServices` | Intentional evidence-gated empty state. |
| `/expertise/[slug]` | `getPublishedServiceBySlug` | Missing or unpublished slug returns a real 404. |
| `/projects` | `getPublishedProjects` | Intentional evidence/rights-gated empty state; local preview may add a clearly labelled geometric study. |
| `/projects/[slug]` | `getPublishedProjectBySlug`, `getPublishedProjectClaims` | Missing or unpublished slug returns a real 404; only populated fact/chapter fields render. |
| `/insights` | `getPublishedPosts` | Intentional editorial-review empty state. |
| `/insights/[slug]` | `getPublishedPostBySlug` | Missing or unpublished slug returns a real 404. |
| `/about` | published page, team, and credential projections | Company narrative has an honest empty state; team/credentials collapse independently. |
| `/contact` | published page and allow-listed public settings | No invented channel, address, or map; verified values render only when projected. |
| `/start-a-project` | published page projection | Non-collecting entry preview; no form, write, upload, or lead creation. |
| `/privacy`, `/terms` | published page projection | Honest not-yet-published legal-content state; no fabricated legal text. |

Root and public route groups own their loading, error, and not-found states. Homepage loading lives inside `(public)/(home)` so an ancestor loading boundary cannot flush a success status before a detail route resolves `notFound()`.

## 3. Public data boundary

`src/features/public-content/data.ts` is server-only and creates a stateless anonymous Supabase client only when the two public connection values are available. Absence of local connection configuration resolves to empty public collections rather than a privileged fallback.

Every query:

- targets one of the S4 `published_*` projections;
- lists columns explicitly;
- applies the English locale where the projection is localized;
- has an explicit upper bound;
- maps through a typed fail-closed adapter;
- throws a neutral server error without query details or credentials;
- never reads editorial base tables, evidence internals, private media, identity, audit, leads, or admin data.

The public bundle never imports the service/secret key. `SUPABASE_SECRET_KEY` remains an admin/test-harness server boundary and is not used by the public adapter.

## 4. Cache model

Public reads use Next.js `unstable_cache` with a one-hour safety revalidation and the existing S4 tag vocabulary:

- `contentCollectionTag("service" | "project" | "post" | "page" | ...)`;
- `homepageTag()` for homepage collections;
- `publicSettingsTag()` for the public settings projection.

S4 publish/unpublish/archive invalidation therefore reaches the routes that now consume those tags. Generic server mutation boundaries use stale-while-revalidate invalidation; the S5A Server Action additionally uses `updateTag` for collection/item/homepage scopes so publish or removal has read-your-own-writes correctness and cannot serve the just-invalidated public record once more. React `cache` deduplicates identical reads during a render. Admin, authentication, private preview, and personal data remain outside this public cache path.

## 5. Content and rendering contracts

Projection rows are converted into immutable public types. Required identity, slug, title/name, summary, and locale fields fail closed when blank. Structured blocks pass through the existing safe Heading/Paragraph/List/Link schema and renderer; raw HTML is neither accepted nor rendered.

The project detail layout is future-capable without inventing content: a definition-list facts rail and optional Scope/Challenge/Approach/Solution/Outcomes sections render only for approved non-empty fields. Media slots are not synthesized while S5B project/media administration and rights-cleared public assets remain outstanding.

## 6. Design-system ownership

`DESIGN.md` is the human-reviewed source. S6A activates the intended Model A mapping:

`DESIGN.md → designmd lint/export → src/styles/design-tokens.generated.css → Tailwind v4/runtime CSS → shared public components`

`scripts/design-tokens.mjs` regenerates or verifies the committed export. The generated file is not hand-edited. Public semantic aliases in `public.css` derive from those generated variables; the one light-surface accent alias is derived with `color-mix` to retain the approved gold family while meeting text contrast.

## 7. Security and scope

Public routes are read-only. The public adapter preserves the S4 URL constraint by admitting only unambiguous, credential-free HTTPS canonical overrides and allow-listed URL settings; invalid values fail closed even if an upstream projection regresses. S6A adds no public endpoint, Server Action, form submit, Storage write, privileged client, analytics, third-party script, remote font, remote image, structured business schema, sitemap submission, deployment, or cloud resource. Concept imagery remains outside the runtime; the preview study is CSS/SVG geometry labelled as non-evidentiary.

Desktop navigation and the modal architectural index share one small client island so route state has one owner. Exact and descendant paths receive a visible state plus semantic `aria-current="page"`; no site-wide provider or client layout is introduced.

Public-project browser acceptance uses a separate build/reset phase. After the empty-state server stops, the harness removes only its ignored generated Next data cache and builds afresh. The fixture creates a reserved `SYNTHETIC` service, project, verified evidence, relation, AAL2 publisher, and normal S4 `publish_content` transitions, then proves the anonymous projection before the browser runs; it never writes a public projection directly and the global teardown resets it before the run succeeds. A verifier-level `finally` also removes the generated data cache so neither a passing nor failing test can leak that fixture into a later local preview.

S6A does not resolve G1–G5. It provides durable delivery architecture for later approved content without converting recommendations, creative language, or synthetic fixtures into RENZ facts.
