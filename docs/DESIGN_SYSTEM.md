# RENZ Design System Specification

Status: **Phase 1 / S0 provisional, revalidated 2026-08-30.** `DESIGN.md` was reconstructed from this surviving Phase 0 specification and recorded lint metadata—no byte-identical original was recovered—and now passes the official structural lint. No runtime token artifact or component implementation exists. The authenticated monogram raster and WhatsApp service screenshot are recovered, the expected AI reference board is absent, and production identity remains blocked by vector, rights, typography, testing, and written-approval gaps. See [`SOURCE_RECOVERY_AND_RECONCILIATION.md`](./SOURCE_RECOVERY_AND_RECONCILIATION.md).

## 1. North star

### Datum & Mass

The visual language begins with an architectural datum: one precise gold line that establishes level, sequence, and relationship. It passes through structural planes, imagery, labels, navigation, process, and selected states. Deep navy supplies mass; true white and concrete create measured negative space; photographs and drawings supply material truth.

The line is a system, not decoration. Each composition gets one dominant datum gesture. Ordinary borders remain quieter, so the signature never turns into gold striping.

### Desired impression

- Precise enough for technical and institutional buyers.
- Warm enough for a person planning a home.
- Contemporary without looking like a SaaS dashboard or architecture-fashion portfolio.
- Rwandan by factual context, people, places, projects, and materials—not unverified motifs or stereotypes.
- Premium through editing, proportion, image quality, and restraint rather than gloss effects.

### Anti-references

Avoid crane/roof clip-art logos, generic construction-template cards, luxury-real-estate brochure language, glassmorphism, glow, gradients, oversized pill controls, rounded bento grids, cream/brown lifestyle palettes, black/neon agency styling, fake blueprint wallpaper, and animation without informational purpose.

## 2. Evidence and identity gate

The palette, typography pairing, and Structural Fold R are recommendations derived from the written brief and concepting round. They do not overwrite the client's identity.

Before identity approval:

1. Recover the original vector/raster logo, brand board, WhatsApp services image, font sources/licenses, and known applications.
2. Compare proportions, symbol meaning, clear space, colors, and naming with this direction.
3. Reconstruct only with client permission; retain original evidence and an explicit change log.
4. Test the selected mark at 16–32px, one color, reverse, embroidery/signage scale, and narrow horizontal lockup.
5. Complete distinctiveness/trademark review appropriate to the client's jurisdiction and market.
6. Obtain written client approval.

## 3. Color system

| Token | Value | Primary role | Constraints |
|---|---:|---|---|
| `primary` (deep navy) | `#071523` | Dark public ground, main wordmark, admin sidebar | Default light text is white; do not crush photography with a navy wash. |
| `navy-raised` | `#0D2134` | Raised dark control/surface | Use tonal separation before shadow. |
| `gold` | `#C69A3A` | Datum, selected emphasis, action accent | Not long text; pair with navy where contrast allows. |
| `gold-hover` | `#B78728` | Gold control hover/active | State only, never a second decorative gold. |
| `white` | `#FFFFFF` | Main light surface and text on navy | True white; do not warm into cream. |
| `concrete` | `#F1F2EF` | Alternate editorial/admin canvas | Preserve cool neutrality. |
| `graphite` | `#303940` | Primary text on light surfaces | Default body text on white/concrete. |
| `steel` | `#7D8992` | Secondary/supporting information | Validate contrast at actual size; never use for essential tiny text without passing. |
| `border-light` | `#D8DCD8` | Light-surface structure | Ordinary borders stay quieter than the datum. |
| `border-dark` | `#294053` | Dark-surface structure | Avoid excessive panel boxing. |
| `success` | `#2F6F55` | Successful operational state | Always add text/icon, never color alone. |
| `warning` | `#9A6519` | Reversible risk or attention | Not a brand substitute. |
| `danger` | `#B33A3A` | Irreversible/security consequence | Reserve for genuine danger. |
| `info` | `#2D628B` | Neutral system information | Keep distinct from selected brand state. |
| `focus` | `#D7A73E` | High-contrast focus ring | Two-layer ring and offset; system color in forced-colors mode. |

Contrast is an implementation gate, not assumed from a token table. Phase 1 must test every foreground/background/state combination against WCAG 2.2 AA, including disabled/read-only, focus, semantic banners, charts, and imagery.

## 4. Typography

### Families

- **Display and short utility:** Montserrat, weights 600 and 700. This honors the brief's stated direction and provides geometric authority.
- **Body and UI:** Source Sans 3, weights 400, 500, and 600. Recommended for readability in articles, forms, tables, and admin workflows.
- **Technical metadata:** IBM Plex Mono 400/500, optional and sparse—for coordinates, revision IDs, or audit values only.
- **Fallbacks:** metric-tuned Arial/sans-serif and Consolas/monospace until verified per platform.

Self-host with `next/font`, subset to required scripts, define fallbacks, and initially load no more than four WOFF2 files. Font licensing and future Kinyarwanda/French support are publish/implementation gates.

### Scale and rhythm

| Role | Proposed value | Use |
|---|---|---|
| Display XL | `clamp(3.5rem, 7vw, 7.5rem)` | One hero/editorial moment only. |
| H1 | `clamp(2.75rem, 5vw, 5.5rem)` | Route title. |
| H2 | `clamp(2.25rem, 3.5vw, 4rem)` | Major chapter. |
| H3 | `clamp(1.5rem, 2vw, 2.25rem)` | Subsection. |
| Body large | `1.25rem / 1.55` | Proposition and high-value explanatory copy. |
| Body | `1rem / 1.65` | Public long-form baseline. |
| Admin body | `0.875rem / 1.5` | Dense operational views, with zoom/reflow verification. |
| Caption | `0.75rem / 1.4` | Nonessential metadata only. |

Display tracking may tighten modestly; it must never cause collisions. Body measures target 60–72 characters. Uppercase is restricted to short technical labels. All numeric tables use tabular figures.

## 5. Layout and responsive composition

### Grid

| Range | Grid | Outer margin | Behavior |
|---|---|---|---|
| 360–767px | 4 columns | 20–24px | One-column reading; structural offsets are small and deliberate. |
| 768–1279px | 8 columns | 32–48px | Editorial split compositions; short-landscape tested. |
| 1280px+ | 12 columns | 56–96px | Maximum page canvas `108rem`; wider screens gain negative space. |

Editorial text remains near `45rem`. Full-bleed media may escape the grid; text and controls do not. QA widths are 360, 390, 430, 768, 1024, 1280, 1440, 1728, and 1920px plus short landscape.

### Recomposition rules

- Expertise: editorial panels/diagram on wide view; semantic disclosure/list on mobile.
- Project transition: horizontal/cross-plane narrative on capable wide devices; vertical case-study chapters on mobile or reduced motion.
- Process: horizontal datum on desktop; vertical numbered line on narrow view.
- Navigation: accessible mega-menu on desktop; full-screen architectural menu on mobile.
- Admin: persistent sidebar where space allows; modal drawer plus natural document scrolling on narrow screens.
- Wizard: one question group per calm composition, one-column narrow layout, safe-area-aware navigation, preserved values.

Nothing important is available only on hover or animation. Responsive variants preserve the same actions, status, permission, ordering, and full value.

## 6. Spatial, shape, and surface tokens

### Spacing

The base set in `DESIGN.md` is `xs 4`, `sm 8`, `md 16`, `lg 24`, `xl 36`, `section 96` CSS pixels at the root default. Phase 1 may export a fuller 4px-derived scale, but it must retain named semantic intervals and avoid screen-local magic numbers.

### Radius

- `sharp` 2px: media/details that read as cut structural planes.
- `DEFAULT` 4px: public controls and frames.
- `admin` 8px: dense admin controls and panels.
- `overlay` 12px: dialogs/sheets/menus where containment needs emphasis.
- Fully rounded cards and pill buttons are prohibited unless an approved semantic variant requires them.

### Borders, depth, and imagery

- One-pixel structural rules carry most separation.
- Static public sections are flat; hierarchy comes from scale, crop, tone, and overlap.
- Admin overlays receive one subtle shadow level; normal panels use border/surface contrast.
- No glass blur, ambient glow, default gradient, or image-wide brand wash.
- Images reserve width/height or aspect ratio before loading. Recommended ratios: hero 16:9–2:1 by crop, project feature 4:3 or 3:2, project detail 16:10/4:3, portrait 4:5, square only where source content warrants it.

## 7. Token ownership and runtime mapping

Use **Model A: `DESIGN.md` generates runtime tokens**.

```text
DESIGN.md (human-reviewed design intent)
  → deterministic design-token export
  → generated Tailwind v4 / CSS custom properties (never hand-edited)
  → global semantic aliases and state mapping
  → shared primitives / shadcn adapters
  → public and admin compositions
```

Phase 1 requirements:

- Preserve the canonical section order and lint `DESIGN.md` in CI.
- Export deterministically and fail CI on uncommitted generated drift.
- Keep primitive values in the generated artifact; use semantic aliases such as `--surface-canvas`, `--text-primary`, `--action-brand`, and `--status-danger` in components.
- Do not duplicate raw hex/radius/space values in route components.
- Map shadcn variables deliberately; do not let a preset overwrite RENZ tokens.
- Maintain one component/state owner and a deprecation ledger for any renamed token.

## 8. Component register

### Shared foundations

- Button and icon button: emphasis × intent; stable dimensions; full pointer, keyboard, disabled, and busy states.
- Link and CTA: clear destination language; underline or line response; no unlabeled arrow-only primary actions.
- Field system: label, help, reserved error, prefix/suffix, description, busy, read-only, invalid, and first-error focus.
- Authored Select/Listbox and date primitives where browser-owned popup geometry is not acceptable; real-browser verification required.
- Dialog, alert dialog, sheet, popover, menu, tooltip, toast, banner, and upload built from maintained accessible primitives.
- Media frame, image metadata, datum line, section label, breadcrumb, pagination, status, empty/no-results/error, and stable loader.

### Public register

- Transparent-to-solid header, accessible Expertise mega-menu, full-screen mobile menu.
- Hero stage, proposition block, expertise explorer, selected-project sequence, process datum, proof gate, insight preview, closing CTA, and premium footer.
- Project header, fact rail, narrative chapter, media sequence, related project/expertise links.
- Project wizard stepper, summary, file queue, consent, and submission recovery.

### Admin register

- Shell, sidebar/drawer, route header, action queue, metric summary with honest provenance.
- Semantic data table with server pagination and URL-owned query state.
- Filter/search bar, status control, action menu, detail timeline, notes, attachment inspection, audit event.
- CMS editor, media picker/uploader, publication checklist, revision/conflict state, role/capability matrix.

Shadcn is used as a source/maintenance path for complex accessibility behavior, not as the site's visual language. Public editorial compositions remain custom.

## 9. Interaction states

Every applicable primitive covers:

`default → hover → focus-visible → active/selected → disabled/read-only → busy → success/warning/error → empty/no-results/stale/permission-limited`.

- Hover never owns essential information.
- Focus uses a visible two-layer treatment and survives dark/light/semantic surfaces.
- Loading or result changes never move the primary control unexpectedly.
- Destructive controls name the object and consequence; serious dialogs initially focus the least destructive action.
- Status always includes text or icon meaning.
- Scrollbars are globally tokenized and remain visible/operable; forced-colors uses system behavior.

Detailed behavior lives in root `UX-CONTRACT.md`.

## 10. Imagery and evidence policy

- Production portfolio media must belong to a verified RENZ project and have documented usage permission.
- Every asset records source, creator/owner, usage rights, alt text, focal point, caption, project relationship, and approval state.
- AI concept images remain in `design/concepts/`, carry an explicit concept status, and never populate the project CMS or structured data.
- Avoid stock imagery that could be mistaken for RENZ work. If contextual stock is temporarily approved, label and track it separately from project evidence.
- Preserve material color and realistic lighting. Do not force every photo through navy/gold duotone treatment.
- Alt text communicates purpose and visible evidence; captions can provide project context. Decorative plan marks remain hidden from assistive technology.

## 11. Accessibility contract

- WCAG 2.2 AA target with semantic HTML before authored widgets.
- Approximately 44px important touch targets, visible labels, accessible names, correct heading order, skip link, landmarks, and stable focus.
- Product validation uses `noValidate`, associated text errors, summary for long forms, and first-error focus.
- Accessible mega-menu/disclosure, mobile dialog navigation, wizard stepper, tables, file upload, dialogs, and live feedback.
- Reduced motion is a content-equivalent mode, not a lesser experience.
- Verify keyboard-only, 200% zoom/reflow, touch/no-hover, forced colors, current screen readers, long content, and future locales.

## 12. Public versus admin register

The same tokens and primitives support two densities:

| Dimension | Public | Admin |
|---|---|---|
| Rhythm | Fewer, larger editorial intervals | Compact, recurring operational rhythm |
| Hierarchy | Crop, scale, chapters, negative space | Labels, columns, status, sequence |
| Radius | 2–4px | 4–8px; 12px overlays |
| Motion | Selective narrative transitions | Fast feedback and state continuity |
| Surfaces | Flat structural planes | Bordered panels; overlay shadow only |
| Data | Evidence-led narratives | Dense comparison, auditability, recovery |

An admin dark theme is deferred until every state, chart, overlay, form, and semantic token is mapped and tested. The public site's navy/light compositions do not imply a global theme toggle.

## 13. Design acceptance gate

Before implementation is considered design-complete:

1. Client source identity is reconciled and the chosen mark approved.
2. `DESIGN.md` passes official lint and token export has zero drift.
3. Component stories demonstrate every applicable state and both registers.
4. Representative public and admin flows match the concept's hierarchy without treating PNGs as exact pixels.
5. Browser inspection covers required widths, short viewport, 200% zoom, keyboard, touch/no-hover, locale, forced colors, and reduced motion.
6. Automated accessibility is supplemented with manual keyboard/screen-reader review.
7. Photography, copy, statistics, credentials, and testimonials pass the evidence/publish workflow.
8. Motion and media pass the budgets in `MOTION_SYSTEM.md` and `TECHNICAL_ARCHITECTURE.md`.

## 14. Concept references

- `design/concepts/01-homepage-hero.png`
- `design/concepts/02-homepage-expertise.png`
- `design/concepts/03-homepage-selected-projects.png`
- `design/concepts/04-homepage-process.png`
- `design/concepts/05-homepage-quality-sustainability-cta.png`
- `design/concepts/06-project-detail.png`
- `design/concepts/07-start-a-project-wizard.png`
- `design/concepts/08-admin-dashboard.png`
- `design/concepts/09-logo-exploration.png`
- `design/concepts/10-logo-structural-fold-refinement.png`

These boards are a coherent direction and composition study. They are not production screens, final copy, verified RENZ project imagery, or an excuse to implement screenshot-shaped markup.


## Approved silver architectural identity — 28 September 2026

The user explicitly revoked the terracotta/brick R direction and approved the attached black-and-silver RENZ CONSTRUCTION twin-tower logo as the new website source of truth. This decision supersedes the 25 September identity decision for all operational logo uses. The original is byte-preserved at `references/client/originals/03-renz-construction-silver-reference.png`; faithful vector derivatives, allowed use, hashes and checks are recorded in [RENZ_SILVER_BRAND.md](./RENZ_SILVER_BRAND.md). The opening and loading screens use the large stacked lockup on black; the responsive header uses a compact silver lockup linked to `/`. The approved opener now applies to the public homepage independently of preview mode, retaining its session, skip, reduced-motion, forced-colors and Save-Data bypasses. Existing business facts, historical audit records and unrelated UI colors remain under their existing contracts. This is source implementation authority, not deployment or general release approval.


## Orange identity clarification — 28 September 2026 (superseding update)

The user resolved the conflicting brief by explicitly selecting the orange curved R with the two-line Renz Construction wordmark. This later instruction supersedes the silver tower identity above for operational website branding. The supplied composition and traced lettering are retained in transparent SVGs; the full opening/loading logo appears on white, the responsive header logo links to the homepage, and existing shared identity placements and app icons use the same source. Provenance, preparation and current verification are recorded in [RENZ_ORANGE_BRAND.md](./RENZ_ORANGE_BRAND.md). Earlier dated decisions and checks remain historical; this bounded correction does not authorize deployment or change business facts.
