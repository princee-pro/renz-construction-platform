# RENZ Phase 1 / S6 Responsive System

**Status date:** 8 September 2026  
**Scope:** S6A public routes and local client preview

## Composition model

The public system follows the provisional four/eight/twelve-column intent from `DESIGN.md`, implemented as fluid CSS Grid rather than a rigid layout library:

- **320–767px:** one reading column composed within a four-column mental model, compact edge space, reordered content, and full-value links/actions;
- **768–1279px:** eight-column editorial splits with wider breathing room and reduced simultaneous motion;
- **1280px and above:** twelve-column asymmetric compositions within the `108rem` maximum canvas.

Content widths use `min()`, `max()`, and `clamp()`; display type uses controlled wrapping and fluid sizing. Public sections are not desktop canvases scaled down. Registers, mastheads, the journey, project facts, contact/location, CTA, footer, and menu change composition at narrow widths.

## Tested matrix

The browser reflow loop exercises `/`, `/expertise`, `/projects`, and `/start-a-project` at:

`320, 360, 390, 430, 768, 1024, 1280, 1440, 1728, 1920`.

For every route/width pair, the test asserts that the body scroll width does not exceed the viewport. Dedicated visual evidence covers 320, 390, 768, 1440, and 1728 compositions.

## Mobile-specific decisions

- The desktop navigation becomes a near-full-screen architectural index, not a compressed horizontal list.
- The hero keeps both headline lines legible and immediately visible; its geometry becomes quieter and its sequence wraps safely.
- Editorial two-column sections become ordered single-column reading flows.
- Project, expertise, and insight registers retain numbering, labels, and real links without reducing to generic rounded cards.
- The preview study stacks its explanation and geometry rather than shrinking a desktop media plane.
- The location foundation remains a labelled geometric placeholder with no map, coordinates, or invented address.
- Pointer-following is absent, hover is never the only access path, and touch targets retain practical size.

## Reflow and zoom posture

The CSS avoids page-level horizontal scrolling, fixed reading widths, and viewport-locked section heights. Long titles use overflow-safe wrapping. A 320px production-browser pass proves narrow reflow; automated axe and keyboard/menu flows supplement but do not constitute a full device or screen-reader certification. A complete 200% zoom, real-device, landscape, and assistive-technology matrix remains a later release-quality gate.

## Media readiness

S6A loads no project image. Future rights-cleared media must preserve intrinsic geometry, responsive source selection, focal metadata, meaningful alt/decorative classification, and a mobile-appropriate crop. The current CSS/SVG architectural field stays legible without network media and cannot cause image layout shift.
