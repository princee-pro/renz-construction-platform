# RENZ Technical Architecture

Status: Phase 0 recommendation
Prepared: 27 August 2026
Scope: Production architecture for the public website, Start a Project flow, and administration application. This document defines direction; it does not claim that the application or infrastructure already exists.

Related documents:

- [Database Architecture](./DATABASE_ARCHITECTURE.md)
- [Security Model](./SECURITY_MODEL.md)

## 1. Decision language

This document uses three labels deliberately:

- **Recommendation** means the engineering baseline for Phase 1 unless new evidence changes it.
- **Conditional** means the capability should be admitted only after the stated gate is passed.
- **Open decision** means client, legal, operational, budget, or verified-content input is still required. It must not be silently assumed.

## 2. Verified starting point

At Phase 0 inspection there was no application package manifest, source tree, framework configuration, Supabase configuration, migration history, test suite, environment template, Git metadata, or deployment configuration to preserve. The technical implementation is therefore greenfield.

The following version facts were checked on 27 August 2026 and must be checked again when the repository is scaffolded:

| Area | Verified current state | Phase 1 recommendation |
| --- | --- | --- |
| Node.js | Node 24 is LTS; Node 20 is end-of-life | Node 24 LTS, pinned by major/minor in local and CI environments |
| Next.js | 16.x is Active LTS; current documentation reports 16.3.3 | Latest patched 16.3.x release available at scaffold time |
| React | Current stable documentation is on React 19.2 | React and React DOM 19.2.x, matched to Next.js |
| TypeScript | TypeScript 7.0 is current, but 7.0 has no stable programmatic API | TypeScript 6.0.x initially; reassess after 7.1 and toolchain validation |
| Tailwind CSS | Tailwind 4.3 is current | Tailwind 4.3.x |
| Supabase JS | Current client line requires Node 22 or later | Current pinned Supabase JS 2.x and server-rendering helper |
| PostgreSQL | Supabase is deploying PostgreSQL 17 for current new projects | Managed PostgreSQL 17, verified at project creation |

Primary sources:

- https://nodejs.org/en/about/previous-releases
- https://nextjs.org/docs
- https://nextjs.org/support-policy
- https://react.dev/versions
- https://tailwindcss.com/blog
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://supabase.com/changelog.md

## 3. Recommended system shape

**Recommendation:** one Next.js App Router application, one Supabase project per environment, and one source-controlled SQL migration history.

The public website and admin product belong in one application because they share authentication, content types, media, navigation, design tokens, deployment, and cache invalidation. A monorepo, separate CMS frontend, microservices, and a custom API gateway would add operational cost without a current boundary that justifies them.

The principal flows are:

    Public visitor
      -> cached or streamed Server Component
      -> stateless publishable Supabase client
      -> published-only RLS policy

    Administrator
      -> Server Action or Route Handler
      -> verified Supabase claims
      -> fresh permission check
      -> caller-scoped Supabase client
      -> RLS-controlled mutation
      -> audit record and cache invalidation

    Public form submitter
      -> coarse rate limit
      -> server-side Turnstile verification
      -> Zod validation
      -> narrow server-only intake operation
      -> transactional lead creation

    Public attachment upload
      -> pending lead and immutable upload slot
      -> signed direct upload to quarantine
      -> MIME, byte-size, signature, and malware checks
      -> promotion to private approved storage

### 3.1 Runtime placement

- Public pages should be static or server-cached where content semantics permit.
- Authenticated admin routes are dynamic and must never share user-specific cached output.
- Server Actions and upload finalization should use the Node.js runtime.
- Do not select the Edge runtime by default. It complicates dependency compatibility and does not remove the need to colocate server execution with PostgreSQL.
- CDN delivery handles static assets and cached public HTML close to visitors; stateful work executes near the selected Supabase region.

## 4. Application boundaries

**Recommendation:** organize by business capability, with route files acting as composition rather than business-logic containers.

    src/
      app/
        (marketing)/
        (admin)/admin/
        auth/
        api/
      features/
        services/
        projects/
        insights/
        pages/
        leads/
        media/
        identity-access/
        site-settings/
        audit/
      components/
        ui/
        site/
        admin/
      lib/
        supabase/
        auth/
        security/
        observability/
        env/
      styles/
    supabase/
      migrations/
      tests/
      seed.sql
    tests/

Boundary rules:

1. **app/** owns routing, layouts, loading, error, not-found, metadata, and composition. It must not become the data-access layer.
2. Each **features/** module owns its validation schemas, server queries, commands, permission requirements, and feature UI.
3. **components/ui/** contains owned primitives, including reviewed shadcn-derived source. It cannot import feature or server modules.
4. **lib/** contains only cross-cutting adapters: Supabase clients, authentication, environment parsing, security helpers, and telemetry.
5. Server-only modules must import the server-only guard so a future client import fails at build time.
6. Do not create broad barrel exports that pull server code or large UI libraries into client bundles. Use direct imports.
7. Database-generated TypeScript types are generated from the migration-defined schema and committed for review.
8. Complex multi-table writes live in narrow database functions or transactional server services, not a sequence of unrelated browser calls.

## 5. Server and client responsibilities

### 5.1 Server-first rendering

React Server Components are the default for public content, project pages, service pages, SEO metadata, navigation, and admin read views. Client Components are limited to genuine interaction: navigation state, filters, dialogs, rich form behavior, and motion.

This reduces browser JavaScript, prevents database credentials from moving into UI code, and makes cache behavior explicit.

### 5.2 Supabase client separation

Create four local adapters with intentionally different capability:

| Adapter | Credential and identity | Allowed use |
| --- | --- | --- |
| Public server client | Publishable key, no user session | Cacheable reads of published public content |
| Browser client | Publishable key and user session | Login/MFA UI and explicitly approved signed uploads |
| Authenticated server client | Publishable key plus request cookies through Supabase SSR | All normal admin reads and writes; RLS remains active |
| Privileged server client | Secret key, server-only | Narrow intake RPC, Auth administration, and controlled media promotion only |

The privileged client must not be exported as a general database utility. It bypasses RLS and should appear only in a small reviewed module with allow-listed operations.

Current Supabase guidance distinguishes cookie-backed Next.js use of the SSR package from stateless bearer-token use of the server package:

- https://supabase.com/docs/guides/auth/choosing-a-server-package
- https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs

### 5.3 Server Actions

Treat every Server Action as a public POST endpoint:

1. Validate identity with Supabase claims.
2. Check the exact permission from the database.
3. Parse untrusted input with Zod.
4. Call one domain operation.
5. Emit a redacted audit event for material changes.
6. Invalidate the smallest relevant cache tag/path.
7. Return a typed, user-safe result with a correlation identifier.

Do not rely on a hidden button, a hidden admin route, client-side role state, or the route proxy for secure authorization. Next.js explicitly advises authenticating and authorizing every Server Function:

- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/getting-started/mutating-data

### 5.4 Route Handlers

Use Route Handlers only where HTTP behavior is the product boundary: Auth callbacks, signed-upload issuance/finalization, external webhooks, health checks, or provider callbacks. Server Components should call the feature data layer directly instead of fetching the application’s own handlers.

## 6. Dependency decisions

All production packages must be exact-pinned and the lockfile committed. Dependency updates should arrive as reviewed automated pull requests, with immediate handling of security releases.

| Dependency or capability | Decision | Why |
| --- | --- | --- |
| Next.js and React | **Recommendation** | Full-stack App Router, Server Components, actions, metadata, images, fonts, streaming, and deployment support |
| TypeScript strict mode | **Recommendation** | Compile-time contracts across CMS, database types, actions, and UI |
| TypeScript 7.0 | **Deferred** | Official 7.0 release has no stable programmatic API; use 6.0.x until lint/test/editor tooling is verified |
| Tailwind CSS | **Recommendation** | Token-driven design implementation without a runtime styling system |
| shadcn/ui | **Recommendation, selective** | Owned accessible primitives for the admin; not a public-site visual template |
| Motion | **Recommendation** | React-native component, state, SVG, menu, and reduced-motion animation |
| GSAP and ScrollTrigger | **Conditional** | Install only if an approved signature scene genuinely needs advanced scrub/pin orchestration |
| Three.js / React Three Fiber | **Conditional, not baseline** | Admit only after a prototype proves visual value and passes mobile/bundle/reduced-motion budgets |
| Supabase JS and SSR helper | **Recommendation** | Typed access to Auth, Data API, and Storage with cookie session integration |
| Zod | **Recommendation** | Runtime validation at environment, form, CMS block, and mutation boundaries |
| React Hook Form and Zod resolver | **Recommendation for complex forms** | Multi-step wizard and dense admin forms; simple forms should use native actions |
| ORM such as Prisma or Drizzle | **Do not add initially** | It would create a second migration/type/query abstraction over Supabase without a current need |
| Redux, Zustand | **Do not add initially** | No global client state problem has been demonstrated |
| TanStack Query or SWR | **Do not add initially** | Server-first reads and actions cover current requirements; add only for proven live client caching needs |
| Headless CMS | **Do not add** | The requested admin is the system of record; a second CMS duplicates workflow and authorization |
| External search engine | **Do not add initially** | Current information architecture does not require it; PostgreSQL search is sufficient if search is later approved |
| OpenTelemetry adapter | **Recommendation** | Provider-neutral server traces through Next.js instrumentation |
| Sentry | **Recommended default, client approval required** | Error aggregation, source maps, releases, and traces; configure with PII redaction |

Motion guidance:

- Use CSS transitions for self-contained hover/focus/color effects.
- Use Motion for component-state and interaction animation.
- Dynamically import GSAP only inside the approved scene that needs it.
- Do not use scroll smoothing or scroll hijacking.
- Every animated composition has a content-equivalent reduced-motion path.

Sources:

- https://motion.dev/docs/react-installation
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- https://ui.shadcn.com/docs/tailwind-v4
- https://zod.dev/v4

## 7. Public content and cache architecture

Public data is read with the stateless publishable server client under anonymous RLS. This avoids reading request cookies and allows public rendering to remain cacheable.

Recommended cache rules:

- Cache only published content and public settings.
- Tag content by domain and entity, for example projects plus project identifier, rather than invalidating the whole application.
- Publish/unpublish operations invalidate list, detail, sitemap, navigation, and relevant homepage tags in the same domain command.
- Never cache session claims, permission results, leads, notes, attachments, audit records, or admin result sets across requests.
- Use per-request deduplication for repeated server reads.
- Start independent I/O together and await it late; do not create avoidable sequential waterfalls.
- Stream non-critical sections behind meaningful Suspense boundaries rather than a page-wide spinner.

## 8. Start a Project and contact intake

### 8.1 Form submission

**Recommendation:** do not grant anonymous users direct INSERT on lead tables. The public publishable key is necessarily discoverable, so a direct table grant would allow bypassing application-level Turnstile and rate limiting.

The intake sequence is:

1. Apply a coarse provider/firewall rate limit.
2. Validate the Turnstile token on the server, including expected hostname and action.
3. Validate and normalize the complete payload with Zod.
4. Use a narrow privileged RPC or server operation that accepts only allow-listed fields.
5. Create the lead, subtype record, selected services, stage history, and intake audit record transactionally.
6. Return a non-sequential reference suitable for the confirmation UI.

Turnstile tokens require server validation, expire after five minutes, and are single use:

- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

### 8.2 Attachment sequence

The UI may let a visitor choose files before final submission, but upload should start only after valid contact/brief data and bot verification create a pending lead.

1. Create immutable UUID object paths and signed upload slots.
2. Upload directly to a private quarantine bucket.
3. Verify object existence, declared and detected MIME type, byte size, checksum, extension, and count.
4. Run the approved malware-check process.
5. Move or copy approved content into the private lead-attachments bucket.
6. Mark the lead submitted only after finalization; report partial upload failure clearly.
7. Purge abandoned pending records and quarantine objects after the approved retention window.

Resumable TUS upload should be used only if approved file sizes or unreliable networks justify it:

- https://supabase.com/docs/guides/storage/uploads/resumable-uploads

## 9. Performance and delivery budgets

Field performance is evaluated at the 75th percentile, separately for mobile and desktop:

| Metric | Target |
| --- | --- |
| Largest Contentful Paint | 2.5 seconds or less |
| Interaction to Next Paint | 200 milliseconds or less |
| Cumulative Layout Shift | 0.1 or less |

These are the current good Core Web Vitals thresholds:

- https://web.dev/articles/defining-core-web-vitals-thresholds

Provisional engineering budgets, to be measured and adjusted after the scaffold:

| Budget | Phase 1 target |
| --- | --- |
| Initial compressed JavaScript on principal public routes | 170 KiB or less |
| Mobile LCP image | 250 KiB or less |
| Desktop LCP image | 450 KiB or less |
| Initial fonts | No more than two families and four WOFF2 files |
| Cached public TTFB | 300 ms or less at the selected Rwanda test point |
| Dynamic admin/form TTFB, p75 | 800 ms or less at the selected Rwanda test point |
| Lighthouse CI, key public routes | Performance 90+, Accessibility 95+, SEO 95+ |

Implementation requirements:

- Use Next Image with explicit width/height or fill container dimensions, accurate sizes, and allow-listed remote patterns.
- Preload or assign high fetch priority only to the actual viewport LCP image.
- Provide art-directed mobile crops where the composition requires them.
- Use AVIF/WebP where visual comparison approves the result.
- Use Next Font, self-hosting and subsetting the final licensed fonts.
- Lazy-load below-fold media and third-party scripts.
- Dynamically import heavy motion and any future WebGL.
- Avoid broad Client Component boundaries and duplicate serialization of large records.
- Use content-visibility only after browser and accessibility verification.
- Test 360, 390, 430, 768, 1024, 1280, 1440, 1728, and 1920 widths, touch, landscape, reduced motion, and constrained networks.

Next Image source:

- https://nextjs.org/docs/app/api-reference/components/image

## 10. Accessibility engineering

Accessibility is a release criterion, not a final audit:

- Semantic landmarks and heading order are owned by route compositions.
- All interactive controls work by keyboard with visible focus.
- Dialogs, menus, tabs, tooltips, and comboboxes use reviewed accessible primitives.
- Wizard errors are associated with fields and announced in an aria-live summary.
- Focus moves intentionally between wizard steps and after validation failures.
- MotionConfig and CSS media queries implement reduced motion.
- Touch targets and spacing are verified at the requested mobile widths.
- Media usage records carry contextual, localizable alt text; decorative assets use empty alt text.
- Color-token contrast is tested in every state, not just default text.

Automated axe checks support, but do not replace, keyboard and screen-reader review.

## 11. Observability and analytics

### 11.1 Operational telemetry

Create **src/instrumentation.ts** and register an OpenTelemetry-compatible provider. Next.js documents this entry point at:

- https://nextjs.org/docs/app/guides/instrumentation

Recommended signals:

- Request/operation duration, result class, route, environment, release, and request ID.
- Server Action and Route Handler failures.
- Supabase and external-provider latency.
- Lead submission and upload finalization success/failure counts.
- Cache invalidation failures.
- Auth/MFA failure anomalies.
- Slow database queries and connection pressure.

Never include lead field values, file contents, access/refresh tokens, API keys, Turnstile tokens, passwords, or raw authorization headers in logs.

### 11.2 Error monitoring

**Recommendation:** Sentry is the default candidate, subject to data-processing and budget approval. Configure:

- separate development, staging, and production environments;
- release/source-map association;
- default PII collection disabled;
- request-body and sensitive-header redaction;
- bounded trace and replay sampling;
- alerts for sustained server errors and failed lead intake.

### 11.3 Product analytics

Define a provider-neutral event adapter before selecting a vendor. Minimum events:

- project_request_started, completed, and failed;
- contact_completed;
- whatsapp_clicked;
- project_viewed and project_engaged;
- service_cta_clicked;
- form_step_viewed and validation_failed;
- Core Web Vitals.

Events must contain stable IDs and categories, not free-text form values or document names. Analytics must load after rendering and after consent where required.

## 12. Testing strategy

| Layer | Tooling and required coverage |
| --- | --- |
| Static analysis | Strict TypeScript, ESLint Next/TypeScript/accessibility rules, formatting, dependency and secret scanning |
| Unit | Vitest for Zod schemas, normalization, permission mapping, content transitions, and analytics mapping |
| Component | Testing Library and user-event for dialogs, wizard behavior, validation announcements, focus, and reduced motion |
| Database | Local Supabase plus pgTAP for migrations, grants, constraints, functions, and every RLS operation |
| Integration | Server Actions and Route Handlers against local Supabase and Turnstile test credentials |
| End-to-end | Playwright for public navigation, admin auth/MFA, role denial, draft/publish visibility, lead lifecycle, and uploads |
| Accessibility | axe automation plus manual keyboard, focus, zoom, contrast, and screen-reader checks |
| Visual | Playwright screenshot baselines for concept-critical public/admin views across representative widths |
| Performance | Lighthouse CI, bundle reports, RUM Core Web Vitals, and explicit image/font budgets |
| Security | Dependency review, secret scanning, static analysis, abuse tests, RLS tests, and header/CSP checks |

CI must prove that a clean database reset can apply the full migration history. Tests must use synthetic data that is unmistakably separate from real client content.

## 13. Deployment and environments

### 13.1 Hosting recommendation

**Recommendation:** Vercel for Next.js and hosted Supabase for PostgreSQL/Auth/Storage, subject to commercial approval.

Reasons:

- Native App Router, image, cache, preview, and server-function integration.
- Managed Supabase migrations, Auth, Storage, RLS, backups, and environment tooling.
- Low operational burden for a small product team.

This is not a requirement to use Vercel forever. Domain logic and telemetry adapters should avoid unnecessary platform coupling.

### 13.2 Region selection

Supabase currently lists no African project region. Choose an exact region only after:

1. Rwanda-origin latency tests for candidate regions;
2. review of where personal data and uploaded documents may be stored;
3. confirmation of client/vendor contractual requirements;
4. confirmation of the corresponding Vercel function region.

The application runtime that performs database work should be colocated with the selected database:

- https://supabase.com/docs/guides/platform/regions
- https://vercel.com/docs/functions/configuring-functions/region

### 13.3 Environment isolation

- Local: Supabase CLI and synthetic seeds.
- Preview: isolated Supabase branch when the selected plan supports it, otherwise a safe shared staging project with no production data.
- Staging: production-like Auth, Storage, migrations, and provider test credentials.
- Production: separate project, credentials, Turnstile widget, telemetry environment, and storage.

No preview deployment may use production Supabase credentials or production data.

### 13.4 Migration delivery

- SQL migrations under **supabase/migrations/** are the schema source of truth.
- Create migration files with the Supabase CLI, review them, reset locally, run database tests and advisors, then deploy through CI.
- No unrecorded dashboard-only production schema changes.
- Use expand, migrate, contract changes so old and new application releases can overlap safely.
- Deploy backward-compatible schema before code that requires it.
- Roll back application code and use reviewed compensating migrations; do not automate destructive down migrations.

Supabase environment guidance:

- https://supabase.com/docs/guides/deployment/managing-environments
- https://supabase.com/docs/guides/deployment

### 13.5 Backup and recovery

Database and Storage recovery are separate. Supabase documents that database backups do not include Storage objects:

- https://supabase.com/docs/guides/platform/backups

The launch checklist therefore requires:

- approved database recovery point and recovery time objectives;
- the paid backup/PITR tier required to meet them;
- an independent export/replication plan for irreplaceable Storage originals and lead documents;
- a rehearsed restore procedure;
- documented credential rotation after a restore;
- tested orphan reconciliation between storage metadata and objects.

## 14. Open decisions

The following must be resolved before production implementation is considered complete:

1. Hosting provider, Supabase plan, budget, domain/DNS/CDN ownership, and vendor account owners.
2. Data-location requirements and the measured Supabase/Vercel region.
3. Database and Storage recovery objectives, retention, and restore responsibilities.
4. Exact administrator role and permission matrix, including Editor publishing and lead export.
5. Admin login method, mandatory MFA rollout, account recovery, invitation, and custom SMTP provider.
6. Lead, note, audit, and attachment retention/anonymization requirements.
7. Accepted attachment types, count, size, CAD/archive support, and malware-scanning provider.
8. Analytics, error-monitoring, consent-management, and WhatsApp attribution providers.
9. Initial and future locales, locale URL structure, and translation workflow.
10. Need for editorial review, revisions, scheduled publication, approvals, and rollback.
11. CRM, email, SMS, WhatsApp, or project-management integrations.
12. Expected public traffic, administrator count, project/media volume, and lead volume.
13. Verified credentials/compliance approval workflow.
14. Audit retention and access-review frequency.

These decisions must be recorded before they influence schema, user-facing claims, pricing, or operational guarantees.
