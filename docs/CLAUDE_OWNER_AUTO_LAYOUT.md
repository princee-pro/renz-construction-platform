# OWNER AUTO-LAYOUT (CR1 §37–45, §81)

The owner never lays out the Projects page. Every published project is
placed by a deterministic cycle; the owner influences prominence through
content and three switches (Featured, Feature on Home, Display order) and
may optionally give a **layout hint**. Whatever the count — 6, 7, 8, 9,
12 — the page stays composed, responsive and free of overlap.

## Compositions

`src/features/website/project-layout.ts` — `compositionCycle`:

| # | Composition | Visitor sees |
| --- | --- | --- |
| 1 | `monument` | full-width image-led study |
| 2 | `portrait` | tall card, image left |
| 3 | `landscape` | wide card, image right |
| 4 | `technical` | drawing-led / text-led card (no photograph required) |
| 5 | `strip` | low horizontal band |
| 6 | `wide` | full-width story |

The cycle repeats from #7 (`7 → monument`, `8 → portrait`, …).

## Rules (`placeProjects`)

1. Start from the project's `layout_hint`; **AUTO** (default) takes the
   cycle position for its index.
2. A project **without a public-eligible image** never takes an image-led
   composition; it becomes `technical`.
3. Two neighbours never share a composition, and two full-bleed
   compositions (`monument`, `wide`) never touch — the engine moves to the
   next cycle entry until the invariant holds.
4. Order is the owner's **Display order** (`sort_order`), never the hint.
5. The result is data (`PlacedProject[]`); `ProjectsIndex` renders
   `.studies-slot .studies-slot-<composition>` and the CSS grid
   (`src/styles/final-routes.css`) owns the ratios and the 320–1920px
   behaviour. On phones every slot stacks to one column.

`tests/unit/cr1-owner-cms-contracts.test.ts` proves the cycle for 6, 7, 8,
9 and 12 projects; `tests/e2e/cr1-owner-cms.spec.ts` (*Project #7*)
verifies seven slots without vertical overlap at 1440px and 390px.

## Evidence classes (§38)

| `evidence_class` | Publication needs | Label on the site |
| --- | --- | --- |
| `real_project` | reviewed evidence, public-safe location, RENZ-provided / licensed media, cleared rights | none (a real RENZ project) |
| `concept_study` | reviewed evidence claim, cleared rights; generated media allowed | *Concept study* badge on every card and page |
| `experience_study` | as concept study | *Experience study* badge |

The S4 kernel still refuses `concept_demo` / `generated_reference` media on
a real project; studies are labelled by the renderer from the class, not by
owner copy, so a label can never be removed by editing text.

## Home and showcases (§40–41, `selectShowcase`)

- **Home** (`project_showcase` in mode *home*): projects with **Feature on
  Home**, in display order; when none is ticked, the *Featured* projects;
  when none is featured, the first projects in display order. Home is never
  empty while a project is published.
- **Selected**: featured first, then the rest. **Recent**: display order.
- **Related projects on a service page**: projects related to the service
  through **Projects → Services**, rendered with the same placement engine;
  the section hides itself when there are none (§84).

## Filters (§39, `deriveProjectFilters`)

Filter chips are derived from the published projects' own `project_type`
values (counts included, "All" first). No invented taxonomy; a type
disappears with its last project.

## Slugs and redirects (§45)

A project's address is `/projects/<slug>`. Changing the slug records an
alias (`website_route_aliases`, entity `project`) and the old address
redirects permanently; the seed ships `/projects/experience-study →
/projects/ridge-residence`. Unpublish returns 404 (the alias still resolves
to the new path, which then 404s — nothing dangles).

## Owner controls (Projects → Website placement)

| Control | Effect |
| --- | --- |
| What this project is | `evidence_class` (publication rules above) |
| Feature on Home | `home_featured` |
| Featured / Display order (Overview) | `featured`, `sort_order` |
| Layout hint | `layout_hint` — AUTO recommended; the engine may adjust a hint that would clash |
| Materials, Tags | card facts |
| Related services | service ↔ project links used by the service page |

Everything else — grid, ratios, badges, spacing, motion — is
SYSTEM PROTECTED.
