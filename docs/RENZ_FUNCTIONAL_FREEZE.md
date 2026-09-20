# RENZ FUNCTIONAL FREEZE

Declared at C9 PASS, 2026-09-13.

## State

C1 (foundation, identity, RBAC, content kernel), C2 (services admin, media),
C3 (public case studies, public/operational boundary), C3.5 (public
functional rescue), C4 (Control Room: clients, operational projects,
realtime), C5 (invoices, client payments, secure links), C6 (delivery:
partners, contractor assignments and payments, materials, purchase orders,
receipts), C7 (business / website / system configuration, launch readiness,
legal governance), C8 (public intake, leads CRM, conversion, anti-abuse) and
C9 (analytics, notifications, website analytics, consent) are complete.

**The functional build is frozen.** No new business domain, table, RPC,
permission or workflow is added from this point without one of the
justifications below.

## What may still change

- **Bug fixes** to any phase, with a regression test.
- **Security fixes** (RLS, grants, validation, anti-abuse, headers) — C10
  hardening is explicitly allowed to add or tighten policies, indexes,
  rate limits, retention/purge tooling, scanning adapters and scheduler
  wiring, because those are hardening of existing behaviour, not new
  domains.
- **Migrations required by a fix.** Schema changes need a written bug or
  security justification in the migration header and the phase status
  "Known open items" list.

## What the Final Design phase may change

Visuals, layout, motion, responsive presentation, media, typography,
spacing, copy hierarchy, page transitions, micro-interactions, the public
header/footer/menu, buttons/cards/forms, imagery and video — across the
public site and, where useful, the admin surface.

It must **not**:

- redesign business domains, lifecycles, statuses, numbering, permissions
  or terminology (Invoiced / Collected / Outstanding …);
- change facade contracts (`admin_*`, `intake_*`, `public_*` RPC shapes);
- add tracking beyond the C9 vocabulary or weaken the consent rules;
- remove accessibility guarantees (WCAG 2.2 AA, focus order, live regions,
  data tables behind every chart);
- change the public/operational boundary (private records never render
  publicly).

Design backlog: `docs/RENZ_FINAL_DESIGN_BACKLOG.md`.
Hardening backlog: `docs/RENZ_C10_HARDENING_BACKLOG.md`.

## Verification baseline at freeze

`pnpm db:reset`, `pnpm db:test` (17 pgTAP files, 1,189 assertions),
`pnpm db:lint`, `pnpm db:types:check`, `pnpm auth:verify`, `pnpm s4:verify`,
`pnpm c4:verify`, `pnpm c4:verify:realtime`, `pnpm c5:verify`,
`pnpm c6:verify`, `pnpm c7:verify`, `pnpm c8:verify`, `pnpm c9:verify`,
`pnpm verify` (format, lint, typecheck, unit, component, design lint,
tokens, secret scan, production build, production dependency audit) and the
Playwright suites (C4–C9) are the regression gate every later change must
keep green.
