---
version: alpha
name: "RENZ Construction Services Ltd"
description: "A hybrid brand and business-product system built from architectural datum lines, structural mass, and evidence-led content."
colors:
  primary: "#071523"
  navy-raised: "#0D2134"
  gold: "#C69A3A"
  gold-hover: "#B78728"
  white: "#FFFFFF"
  concrete: "#F1F2EF"
  graphite: "#303940"
  steel: "#5A656E"
  border-light: "#D8DCD8"
  border-dark: "#294053"
  success: "#2F6F55"
  warning: "#9A6519"
  danger: "#B33A3A"
  info: "#2D628B"
  focus: "#D7A73E"
  limestone: "#E9E5DC"
  stone: "#B9B3A6"
  charcoal: "#1B2126"
  bronze: "#775A30"
  timber: "#A8784B"
  ochre: "#D9B25C"
typography:
  display:
    fontFamily: "Manrope, Segoe UI, Arial, sans-serif"
  body:
    fontFamily: "Manrope, Segoe UI, Arial, sans-serif"
  utility:
    fontFamily: "Manrope, Arial, sans-serif"
  mono:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
rounded:
  DEFAULT: "0.25rem"
  sharp: "0.125rem"
  admin: "0.5rem"
  overlay: "0.75rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.25rem"
  section: "6rem"
  page-max: "108rem"
components:
  datum-line:
    backgroundColor: "{colors.gold}"
    height: "1px"
  structural-rule-light:
    backgroundColor: "{colors.border-light}"
    height: "1px"
  structural-rule-dark:
    backgroundColor: "{colors.border-dark}"
    height: "1px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.DEFAULT}"
    padding: "1rem"
  button-primary-hover:
    backgroundColor: "{colors.gold-hover}"
    textColor: "{colors.primary}"
  surface-dark-raised:
    backgroundColor: "{colors.navy-raised}"
    textColor: "{colors.white}"
  surface-canvas:
    backgroundColor: "{colors.concrete}"
    textColor: "{colors.graphite}"
  text-secondary:
    textColor: "{colors.steel}"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.admin}"
    height: "2.75rem"
  media-frame:
    backgroundColor: "{colors.concrete}"
    rounded: "{rounded.sharp}"
  data-table:
    backgroundColor: "{colors.white}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.admin}"
  dialog:
    backgroundColor: "{colors.white}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.overlay}"
  toast-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.white}"
  banner-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.white}"
  action-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
  banner-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.white}"
  focus-indicator:
    backgroundColor: "{colors.focus}"
    rounded: "{rounded.sharp}"
---

# RENZ Design System

Status: **Phase 1 / S0 provisional design contract, reconstructed and revalidated 30 August 2026.** The intended contract was reconstructed from the surviving Phase 0 design specification and recorded lint metadata; no byte-identical original was recovered. The client monogram raster and WhatsApp service screenshot are recovered and authenticated. The expected client-supplied AI reference board is not recovered. Identity selection and production-logo work remain blocked pending client approval and the evidence listed below.

## Overview

### Creative North Star: Datum & Mass

The visual language begins with an architectural datum: one precise gold line establishing level, sequence, and relationship. It passes through structural planes, imagery, labels, navigation, process, and selected states. Deep navy supplies mass; true white and cool concrete create measured negative space; verified photographs and drawings supply material truth. The line is a system, not decoration: each composition receives one dominant datum gesture while ordinary borders remain quiet.

### Product context and register

- **Audience:** people and organizations evaluating construction-related services, plus future internal operators.
- **Market context:** Rwanda is brief-supplied; service areas and professional capacity require confirmation.
- **Locale:** English first, with future locale-aware fields and formatting.
- **Mobile and accessibility:** semantic-first, touch-safe, keyboard operable, reduced-motion equivalent, 320px reflow, 200% zoom, and WCAG 2.2 AA verification.
- **Hybrid register:** public pages are editorial, spacious, and evidence-led; admin views are quiet, dense, and operational.
- **Signature device:** one restrained gold datum per composition. A gold diagonal load path may belong to a logo proposal but is not interchangeable with the horizontal UI datum.
- **Restraint:** premium quality comes from editing, proportion, crop, material truth, and interaction—not gloss, spectacle, or unsupported luxury language.
- **Anti-references:** no construction-template card grid, crane/roof clip-art identity, fake blueprint wallpaper, glassmorphism, glow, gradients, oversized pills, rounded bento system, cursor chasing, or decorative perpetual motion.
- **Token ownership:** this human-reviewed contract is the intended source for a deterministic runtime export in a future authorized slice.

### S6A runtime-token revalidation — 8 September 2026

S6A activates that intended ownership model without changing the provisional palette or identity status. `DESIGN.md` is now exported by the exact-pinned `@google/design.md` tool into `src/styles/design-tokens.generated.css`; Tailwind v4 and the public semantic aliases consume that generated artifact. `pnpm design:tokens:check` regenerates in memory and fails on drift. The generated file is not hand-edited, and the public layer does not establish a second token source.

## Colors

Deep navy `#071523` is the primary ground and wordmark color. Gold `#C69A3A` is a datum and selected-action accent, not a long-copy color. White and concrete `#F1F2EF` carry editorial space. Graphite `#303940` is the default light-surface text color; steel `#5A656E` is supporting information (measured ≥ 4.7:1 on limestone, concrete and white for small text). Semantic colors communicate operational state with text or icon meaning, never color alone.

Every foreground/background/state pair must be measured at implementation time. The palette table does not itself prove WCAG conformance, especially for gold or steel on light surfaces.

## Typography

Montserrat 600/700 is the provisional display and short-utility family. Source Sans 3 400/500/600 is the provisional body and product family. IBM Plex Mono 400/500 is optional and sparse for coordinates, revision identifiers, or audit values. Fonts must be licensed, self-hosted, subsetted, and supplied with reliable fallbacks before release.

Proposed scale:

- Display XL: `clamp(3.5rem, 7vw, 7.5rem)` for one editorial moment.
- H1: `clamp(2.75rem, 5vw, 5.5rem)`.
- H2: `clamp(2.25rem, 3.5vw, 4rem)`.
- H3: `clamp(1.5rem, 2vw, 2.25rem)`.
- Body large: `1.25rem / 1.55`.
- Public body: `1rem / 1.65`.
- Admin body: `0.875rem / 1.5`, subject to zoom and reflow testing.
- Caption: `0.75rem / 1.4` for nonessential metadata only.

Body measures target 60–72 characters. Uppercase is reserved for short technical labels. Numeric tables use tabular figures.

## Layout

- 360–767px: four columns, 20–24px outer margin, one-column reading.
- 768–1279px: eight columns, 32–48px outer margin, restrained editorial splits.
- 1280px and above: twelve columns, 56–96px outer margin, maximum canvas `108rem`.
- Editorial copy remains near `45rem`; media may escape the grid, but text and controls do not.
- Test 320, 360, 390, 430, 768, 1024, 1280, 1440, 1728, and 1920px, including short landscape.

Wide expertise, project, process, navigation, admin, and wizard compositions must recompose semantically on narrow screens. No action or information may exist only on hover or animation.

## Elevation & Depth

Static public sections are flat. Hierarchy comes from scale, crop, tone, line, and structural overlap. Normal admin panels use border and surface contrast; overlays receive one restrained shadow level. Blur, ambient glow, default gradients, and image-wide color washes are prohibited.

## Shapes

Use 2px radii for cut structural media, 4px for public controls, 8px for dense admin controls, and 12px for dialogs or sheets. Fully rounded cards and pill buttons require a specific approved semantic reason. One-pixel rules provide most separation.

## Components

### Foundational states

Every applicable primitive covers default, hover, focus-visible, active/selected, disabled/read-only, busy, success/warning/error, empty/no-results, stale, and permission-limited states. Focus uses a visible two-layer treatment. Status always includes text or icon meaning. Loading must not move a primary control unexpectedly.

### Buttons and actions

Buttons use stable dimensions, visible labels, and approximately 44px important touch targets. Busy and disabled states retain meaning. Destructive actions name the object and consequence; serious confirmations focus the least destructive action first.

### Navigation and data

Public navigation uses an accessible disclosure or modal menu. Admin navigation becomes a modal drawer on narrow screens. Data tables retain comparison semantics through scrolling, priority columns, or detail navigation instead of silently becoming unrelated cards.

### Forms and overlays

Fields provide persistent labels, help, reserved error space, read-only/invalid/busy behavior, and first-error focus. Dialogs, sheets, listboxes, menus, popovers, toasts, and upload controls must use maintained accessible primitives. Public intake, uploads, authentication, and operational overlays remain omitted until their policy gates pass.

### Iconography

Icons are geometric, restrained, and secondary to labels. Unlabeled icons require an accessible name; decorative plan marks are hidden from assistive technology. Avoid a parallel illustrative icon language that competes with the datum.

### Motion

Motion explains construction, sequence, or state. It never hijacks scrolling, delays useful content, chases the cursor, or runs perpetually. Reduced motion preserves all content and relationships. See `docs/MOTION_SYSTEM.md` for budgets and fallbacks.

### Content and data visualization

Project imagery, statistics, credentials, testimonials, and claims appear only after evidence and publication approval. AI and Phase 0 concept images stay clearly labeled and never enter the production project library. Charts use semantic labels, text summaries, and non-color differentiation.

## Do’s and Don’ts

Do:

- preserve recognizable navy/gold and architectural equity while identity decisions remain open;
- use one dominant datum gesture per composition;
- lead with verified evidence and honest empty states;
- reserve dimensions to prevent media layout shift;
- keep public and admin density distinct while sharing foundations;
- verify real browsers, keyboard, touch, zoom, forced colors, reduced motion, and poor networks.

Do not:

- silently replace the client monogram with the Structural Fold R or another generated mark;
- treat the missing AI board or any generated image as business evidence;
- fabricate projects, qualifications, statistics, testimonials, contact details, or operational promises;
- duplicate raw token values inside route components;
- add motion, shadow, gold, or curvature without a defined role;
- claim design completion from static boards or lint alone.

The detailed component register, responsive rules, evidence policy, and design acceptance gate live in `docs/DESIGN_SYSTEM.md`; behavioral ownership lives in `UX-CONTRACT.md`.
