# RENZ Phase 1 / S5 Admin UX Architecture

**Status date:** 6 September 2026  
**Implemented boundary:** S5A — authenticated workspace shell and Services vertical  
**Overall S5 status:** In progress

## 1. Product boundary

S5A establishes the reference interaction and implementation pattern for later administration verticals. It does not implement Projects, a broad Media Library, Insights, Pages, Team, Testimonials, Credentials, Navigation, Website Settings, leads, orders, invoices, analytics, or public RENZ pages.

Only working capabilities appear in navigation:

```text
Overview
Services
Security
```

This is deliberate progressive disclosure, not authorization. Every route, Server Action, database function, row policy, and grant independently fails closed.

## 2. Route and layout model

Auth and assurance routes remain outside the workspace route group:

```text
/admin/sign-in
/admin/mfa
/admin/mfa/enroll

/admin                         authenticated workspace
/admin/content/services        bounded register
/admin/content/services/new    draft creation
/admin/content/services/[id]   editor
/admin/content/services/[id]/preview
/admin/security
```

The `(workspace)` route group shares an AAL2-gated layout without changing public URLs. It resolves the verified identity and capability set on the server, then composes a persistent desktop rail or a mobile native-dialog drawer. All admin routes are dynamic, non-indexable, and served with private no-store response policy.

## 3. Server and client boundaries

Server Components own:

- route authorization and redirects;
- bounded initial queries;
- overview, list, detail, readiness, and redacted activity payloads;
- metadata and noindex behavior;
- private preview data composition.

Client Components exist only for behavior requiring browser state:

- mobile navigation drawer;
- controlled draft editing and dirty-state protection;
- structured-block reordering and field editing;
- action feedback, dialogs, and focus recovery;
- evidence and publication controls;
- the required Next.js error boundary.

No site-wide client provider, query cache, global state library, rich-text runtime, or browser Supabase data client was added. Client modules call narrow Server Actions; those actions re-authorize before executing narrow database operations.

## 4. Information and visual hierarchy

The interface uses the provisional Datum & Mass direction only as a technical design influence. It does not claim final identity approval. Centralized admin semantic tokens define navigation, canvas, raised surface, rule, muted text, accent, success, warning, danger, and focus roles.

The hierarchy is intentionally structural:

- a dark, persistent workspace rail at wide widths;
- a cool neutral working canvas;
- square or tightly controlled geometry;
- rules and whitespace before cards;
- restrained gold for orientation, not decoration;
- status color paired with explicit words;
- system fonts and no remote assets.

Cards represent bounded objects such as evidence records or security state. Forms, filters, headings, and registers use direct grouping rather than nested card stacks. No gradients, glass effects, chart decoration, animation library, icon library, dashboard template, or final RENZ imagery was introduced.

## 5. Responsive composition

At widths above `64rem`, the navigation rail is persistent and the editor uses a main form plus a sticky record/readiness rail. At tablet and mobile widths, navigation becomes a modal drawer and the editor rail flows after the form in the same visual, reading, and keyboard order as the DOM. The status strip still establishes lifecycle context before editing. At `48rem` and below, the desktop register becomes labeled stacked records; fields, actions, definitions, and evidence flow to one column.

The save action is static below `64rem`, avoiding content obstruction on touch and zoomed layouts. The layout uses fluid widths and logical properties, prevents page-wide horizontal overflow, and preserves at least 44px navigation/dialog controls where practical.

## 6. State architecture

S5A gives explicit ownership to:

- route loading, error, not-found, denied, and disabled-account states;
- initial-empty and filtered-empty registers;
- idle, dirty, saving, failed, successful, re-authentication, and conflict editor states;
- blocked and ready publication states;
- unverified, in-review, verified, expired, and rejected evidence states;
- publish, unpublish, and archive confirmations;
- offline/retry copy without false success.

Recoverable Server Action results use a typed discriminated state. Controlled editor values remain in memory after validation, authorization, session, retryable, and conflict responses. No draft content is persisted to local storage.

## 7. Extensibility rules for S5B and later

Later verticals may reuse the shell and the small proven primitives (`Button`, `Field`, `Alert`, `StatusBadge`, `EmptyState`, `Breadcrumbs`, and `PageHeader`). They must not generalize Services database functions into arbitrary table APIs or turn the navigation registry into dead UI.

A shared abstraction should be extracted only after repeated domain use proves identical semantics. Project media, rights review, selection, replacement, and usage behavior remain S5B responsibilities; S5A introduces no placeholder implementation for them.

## 8. Performance and privacy posture

Initial workspace data is server-rendered. Lists are bounded to 25 records with a database maximum of 50, use keyset pagination, and do not hydrate the full dataset. Overview queries run in parallel. No analytics, third-party scripts, remote fonts, background animation, speculative prefetch service, or unrestricted client data API exists.

Private evidence references and audit detail are rendered only inside the authorized workspace. Preview is an authenticated, dynamic, no-store staff rendering and is not a public route or S6 content delivery implementation.
