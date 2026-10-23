# RENZ UX Contract

Status: Phase 0 behavioral proposal revalidated during Phase 1 / S0 on 2026-08-30. High-risk rules are blocked where client policy is missing. Visual values live in the S0-reconstructed and revalidated `DESIGN.md`; no byte-identical original design contract was recovered.

## Product context

- **Audience:** Public project buyers and partners; internal administrators, editors, and future sales/project-management roles.
- **Primary jobs:** Understand capability, evaluate verified work, prepare and submit a project brief, manage leads, publish evidence-led content, and administer access safely.
- **Target market:** Rwanda is brief-supplied; exact service areas and data-location requirements remain unresolved.
- **Active locale:** English first. Locale-aware content fields and formatting are required; future URL policy is open.
- **Timezone/calendar:** Store instants as UTC and display in a client-approved business timezone. Gregorian calendar. Rwanda/Africa-Kigali is not assumed as the final business policy merely from the current development environment.
- **Accessibility target:** WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Product and brand brief | `C:/Users/princ/.codex/attachments/699c3311-553a-4d7b-9c68-9d7282dcaabd/pasted-text.txt` | Client-supplied brief | 2026-08-27 |
| Existing visual identity | `references/client/originals/01-renz-brand-board.png` (payload is the 190×181 monogram; filename is misleading) | `client-original/source`; internal identity evidence only | 2026-08-30 |
| Existing service wording | `references/client/originals/02-whatsapp-services.png` | `client-original/source`; seven general phrases, confirmation required | 2026-08-30 |
| Expected AI brand/reference board | Not recovered; expected SHA-256 `010f606a6b41bdfe0dcb2ea27e9f79681f2cb8537bae082697b1d0b3a58582c4` | `client-supplied AI/reference`; never business evidence | 2026-08-30 |
| Permission model | Not supplied | **Phase 1 blocker** | — |
| Lead/content lifecycle | Not supplied; Phase 0 recommendation in `docs/ADMIN_PRODUCT.md` | **Client decision required** | — |
| Deletion and retention | Not supplied | **Privacy/legal blocker** | — |
| Legal/regulatory copy | Not supplied | **Qualified review required** | — |
| Market/content conventions | `docs/SEO_STRATEGY.md` and `docs/CONTENT_MODEL.md` | Phase 0 recommendation | 2026-08-27 |

No high-risk default in this contract overrides a later permission, privacy, retention, legal, or domain policy.

## Visual contract

- Project design context: `DESIGN.md`
- Detailed token guidance: `docs/DESIGN_SYSTEM.md`
- Token ownership: Phase 1 Model A—`DESIGN.md` generates the Tailwind v4/CSS token artifact.
- Runtime source: not implemented. Planned global CSS semantic variables plus shared component recipes.
- Drift gate: `designmd lint`, deterministic export diff, forbidden raw-token checks, component stories, and visual regression.
- Themes: public navy/light composition; admin light first. A user-toggleable theme is not approved.
- Durable design decisions require design owner review and corresponding token/component updates in the same change.

## Canonical UI Map

These are Phase 1 owners. S5A implements the bounded admin Form, Select/Listbox, Dialog/confirmation, Scrollbar, and Services CRUD decisions; unimplemented capabilities remain planned until their owning slice supplies browser evidence.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | Shared admin `DataTable` | URL + server query | page; all-results only with explicit scope | component + E2E |
| Select/Listbox | Native select for bounded S5A vocabularies; authored shared listbox only when product-owned popup behavior is required | form state/Zod | native bounded choice; authored searchable/composite choice | keyboard + open-popup QA |
| Date | Maintained authored picker or typed field | ISO date/domain type | typed/authored | locale + keyboard + E2E |
| Form | S5A `Field`/`Alert` adapters; extend only after proven repeated semantics | Zod + server constraints | admin create/edit; future public intake/wizard owners remain gated | validation E2E |
| Scrollbar | Global application stylesheet | design tokens | stable-gutter/density exceptions | computed style |
| Toast | One shared provider | mutation result | success/warning/info/error | live-region test |
| Dialog/confirmation | Native modal dialog for S5A drawer/confirmations; authored primitive only when native behavior is insufficient | operation risk | dialog; alert dialog; mobile sheet | focus + E2E |
| CRUD | Services feature data layer and narrow Server Actions; domain-specific equivalents for later verticals | database + authorization policy | return-to-list; stay-inline; continue-wizard | full-flow E2E |

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | intent × emphasis | clear contrast/line response | visible 2-layer ring | pressed without size change | native disabled + reason when useful | stable spinner/label geometry | persistent scoped message |
| Icon button | accessible name | surface response + tooltip when needed | visible ring | pressed | native disabled | stable icon/spinner | adjacent status |
| Input | label + help | border response | ring + caret | n/a | value readable | adornment slot reserved | text + `aria-invalid` |
| Secret input | masked | reveal control response | ring on field/control | reveal state announced | disabled | n/a | never echoes secret |
| Search | explicit clear; committed query debounced 300ms | control response | input ring | Enter submits unless IME commit | reason | reserved loader | no-results or retry state |
| Textarea | `resize: none`; adequate height/autogrow | border response | ring | n/a | readable | stable | inline text |
| Table/list | semantic name, header, range | row/action affordance | row control/header focus | selected/current distinct | action-specific | stable frame/loader | retry without losing query state |

## Dataset navigation

- **Admin tables:** Server pagination by default. Do not load an unbounded lead, audit, user, content, or media set.
- **Exploratory public lists:** Explicit `Load more` when a bounded initial page is insufficient. No infinite scroll at launch.
- **URL state:** Committed search, filters, sort, page, and page size are URL-owned. Sensitive draft/form values are never placed in the URL.
- **Page size:** Proposed default 25 with controlled 10/25/50 options; verify against actual API and user volume.
- **States:** Loading preserves the frame; empty explains the first action; no-results offers clear filters; failure offers retry; partial refresh preserves stale usable content.
- **Back restoration:** Restore query, filters, page, sort, and practical scroll position.
- **Selection:** Page scope by default. “All matching results” requires explicit opt-in, exact count, bulk consequence, and server support.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create content | `Create …` | stable busy action | owning list | `… created` | preserve values + map errors | new row/list heading | Recommendation |
| Edit content | `Save changes` | stable busy action | owning list unless explicitly inline | `Changes saved` | stay on form, preserve safe values | updated row/list heading | Recommendation |
| Publish | `Publish` | pessimistic | remain on record/preview | `Published` | keep draft and publish checks | status heading | Publish workflow proposal |
| Search | Search field | cancel stale request | same route/query | result count announcement | keep committed query + retry | input or results heading | Premium baseline |
| Bulk action | named verb + count | pessimistic for risk | current valid list | exact outcome counts | preserve failed selection | next logical row/heading | Permission policy pending |
| Upload | `Choose files` / `Upload` | per-file progress | same form | file-specific success | retain valid files, retry failed | file row/status | Storage policy pending |
| Cancel/back | `Cancel` / `Back` | none | origin with state | usually none | unsaved dialog when dirty | originating context | Recommendation |
| Archive | `Archive` | pessimistic confirmation | valid list/detail | `Archived` + Restore when honest | dialog remains open | next logical row | Retention policy pending |
| Hard delete | `Delete forever` | **blocked** until policy | policy-defined | acknowledgement only | policy-defined | policy-defined | Privacy/legal blocker |

## Navigation and responsive behavior

- Document title: `{Page} — RENZ` publicly and `{Page} — RENZ Admin` internally. Loading, 404, 403, and errors set honest localized titles without PII.
- Public 404 distinguishes missing content. Admin 403 explains the needed access and links to an allowed destination. Route errors retain usable shell navigation and a retry.
- Breadcrumbs represent hierarchy, not history. Route-backed admin tabs use URL state. The public Expertise mega-menu is an accessible disclosure.
- Desktop admin uses a persistent sidebar; narrow admin uses a modal navigation drawer. Public mobile uses the full-screen architectural menu.
- Tables keep comparison semantics through horizontal scroll, priority columns, or detail navigation. Do not silently convert every table to cards.
- Important values wrap. Ellipsis is allowed only when the full value has a focus/click path.
- Sticky UI must not obscure focus; use safe areas, `scroll-padding`, and `scroll-margin`.

## Overlays and feedback

- Use maintained accessible dialog/sheet/popover primitives, never browser-native alert/confirm/prompt.
- Reversible routine changes favor immediate feedback/Undo when technically honest. Irreversible, permission, privacy, bulk, or external-side-effect actions require named confirmation and server acknowledgement.
- Toast placement is top-right on desktop and safe-area-aware top/bottom on mobile after testing; routine duration 4–6s, errors persist. Deduplicate repeats and cap the visible stack.
- Inline alerts belong to fields/forms; page banners describe page conditions; global banners are reserved for app-wide conditions.
- Tooltips open on hover and focus after a consistent short delay, dismiss with Escape, and never contain required instructions.
- Dirty forms use an app-owned in-app discard dialog and a narrow `beforeunload` handler only for real unload.
- Planned layer order: sticky 100; dropdown 200; popover 300; drawer 500; backdrop 600; dialog 700; command 800; toast 900. Shared primitives map to tokens; arbitrary z-index values are forbidden.

## Async and resilience

- Default mutation strategy is pessimistic for content publishing, roles, permissions, leads, attachments, destructive actions, and external notifications. Optimism is admitted only for low-risk idempotent operations with exact rollback.
- Prevent duplicate submit. Use idempotency keys for lead finalization and other replayable external boundaries when supported.
- Start-a-Project progress is session-local by default. Server-saved drafts require explicit consent, expiry, ownership, and privacy approval.
- Offline visitors may continue reading cached public content. Public/admin writes remain blocked with preserved safe input and explicit retry; no write queue is assumed.
- Retries are bounded, cancellable, and limited to safe/idempotent work. Timeouts with uncertain completion trigger status/refetch before retry.
- Mutations use version/timestamp checks where concurrent edits matter. Never silently overwrite newer content.
- On session expiry, preserve non-sensitive drafts, re-authenticate, and return to the interrupted task. Role changes stop unauthorized mutations immediately.
- Cancel or ignore stale list/search work. Older responses cannot clear newer pending state or overwrite newer results.
- A failing dialog/form mutation stays open with input and an actionable error.

## Validation

- Zod validates client/server boundaries; database constraints and RLS remain authoritative.
- Validate on submit, then on change/blur for fields already in error. The wizard validates the current step before advancing.
- Long forms show a summary plus associated inline errors and focus/scroll the first invalid field.
- Map server field errors to fields and global failures to persistent form status; never expose raw backend payloads.
- Passwords, tokens, and secrets are masked, omitted from telemetry/URLs/toasts, and cleared where required after failure.
- Product forms use `noValidate`, preserve safe values, block duplicate submit, and recover from server errors without losing context.

## Permission and clipboard

- Server authorization and database RLS are the source of truth. Hide features irrelevant to a role, disable and explain discoverable-but-unavailable actions, and use 403 for direct forbidden navigation.
- Permission checks are capability-based, not scattered role-name comparisons.
- Sensitive values show a masked/truncated preview and explicit copy/reveal control only when policy permits. Copy feedback never includes the value.
- Exact role capabilities, export rights, lead/file visibility, and publish rights are Phase 1 blockers.

## Verification

### Media-rich public and authentication surfaces — 28 September 2026

- The public header is visually transparent at the top of every public route and changes to the canonical black surface after scrolling; link semantics, focus order, mobile menu behavior, and the home-linked identity remain unchanged.
- Insights cards and article heroes use generated concept imagery with a visible `Concept visual / not project evidence` caption. The index film is poster-first and follows the shared reduced-motion, Save-Data, slow-network, and offscreen-pause behavior.
- The shared sign-in and MFA shell may display the same labeled concept film behind its explanatory side panel. Authentication forms, field names, submissions, MFA sequencing, errors, and destinations retain their existing behavior.

- Required static checks after implementation: format, lint, strict typecheck, unit/component tests, production build, Supabase reset/migration/RLS tests, design-token drift, and premium UI audit.
- Browser matrix: current Chromium/Firefox/WebKit; 360, 390, 430, 768, 1024, 1280, 1440, 1728, 1920 widths; short landscape; touch/no-hover; slow network; reduced motion.
- Accessibility: keyboard-only, 200% zoom/reflow, contrast, focus visibility, open composite controls, NVDA/VoiceOver, axe, and manual screen-reader review.
- Visual regression targets the hero, expertise, selected projects, process, closing CTA, project detail, wizard, and admin dashboard concepts.
- Required failure evidence includes invalid forms, expired Turnstile, upload rejection, empty/no-results, 401, 403, stale conflict, server error, and retry.
- Phase 0 has no runnable application, canonical sibling flow, or CRUD implementation to verify. Those checks are explicitly deferred to Phase 1.
- S5A dated evidence (6 September 2026): native bounded selects and dialogs, Services CRUD, validation/failure/conflict behavior, responsive composition, and representative axe checks pass in the production Chromium workflow. This does not pre-approve a native control when a later capability requires owned search, virtualization, locale, or composite interaction.

## Logo source update — 25 September 2026

The user approved the Figma R symbol and requested website integration. `RenzIdentity` and the source URL in `src/lib/site/brand.ts` now own operational identity rendering; provenance is in [the logo integration record](docs/RENZ_LOGO_INTEGRATION.md). Decorative marks are silent, named home links retain their names and keyboard focus, and standalone informative marks use the accessible name RENZ. The symbol reserves its dimensions, maintains aspect ratio, and adapts to forced colors. The existing typography and responsive wordmark visibility remain unchanged. The archived brand-study route is explicitly historical.


## Approved silver architectural identity — 28 September 2026

The user explicitly revoked the terracotta/brick R direction and approved the attached black-and-silver RENZ CONSTRUCTION twin-tower logo as the new website source of truth. This decision supersedes the 25 September identity decision for all operational logo uses. The original is byte-preserved at `references/client/originals/03-renz-construction-silver-reference.png`; faithful vector derivatives, allowed use, hashes and checks are recorded in [RENZ_SILVER_BRAND.md](docs/RENZ_SILVER_BRAND.md). The opening and loading screens use the large stacked lockup on black; the responsive header uses a compact silver lockup linked to `/`. The approved opener now applies to the public homepage independently of preview mode, retaining its session, skip, reduced-motion, forced-colors and Save-Data bypasses. Existing business facts, historical audit records and unrelated UI colors remain under their existing contracts. This is source implementation authority, not deployment or general release approval.


## Orange identity clarification — 28 September 2026 (superseding update)

The user resolved the conflicting brief by explicitly selecting the orange curved R with the two-line Renz Construction wordmark. This later instruction supersedes the silver tower identity above for operational website branding. The supplied composition and traced lettering are retained in transparent SVGs; the full opening/loading logo appears on white, the responsive header logo links to the homepage, and existing shared identity placements and app icons use the same source. Provenance, preparation and current verification are recorded in [RENZ_ORANGE_BRAND.md](docs/RENZ_ORANGE_BRAND.md). Earlier dated decisions and checks remain historical; this bounded correction does not authorize deployment or change business facts.
