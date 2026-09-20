# RENZ Navigation System — the Measured Track

D1.6 (2026-09-19). The client liked the *principle* of a centred capsule
navigation with a clear active state and separate action buttons. RENZ
reinterprets it as a measuring instrument: a floating track on which a gold
plate marks the current route and a lighter mark follows the hand.

Files: `src/components/site/nav/measured-track.tsx` (header, track, plate,
overflow, hover intent), `services-mega-panel.tsx`, `mobile-navigator.tsx`,
`nav-types.ts`; server data in `src/components/site/public-header.tsx`;
styles in `src/styles/final-nav.css` (header, track, panel, navigator) and
`final-motion.css` (reading-progress datum).

## Desktop (≥ 64 rem)

| Zone | Content |
| --- | --- |
| Left | RENZ mark + wordmark (link to `/`), "Preview" label while the site is in preview mode |
| Centre | the **track**: owner-managed routes, each with a two-digit index (`01 Services` …) |
| Right | WhatsApp (green, messaging only) and the primary call to action from Settings → Website |

### Hero state

Over the landing media the header is transparent (a light ink gradient for
contrast). The track is a translucent ink rail with a hairline border.

### Scrolled state (> 32 px)

Same component, tightened: solid ink bar, gold datum draws along the bottom,
the mark scales to 86 %, the track padding and the CTA height reduce. A
thin **reading-progress datum** rides the bottom edge (CSS `scroll()`
timeline, no JS).

### Plate and preview mark

- **Plate** (`.nav-plate`): gold-tinted plate with a registration tick and a
  2 px underline under the current route. On navigation it glides to the new
  route (spring 420/38, ≈ 250 ms). If the current route is folded into
  "More", the plate sits on "More".
- **Preview mark** (`.nav-preview`): hover or keyboard focus moves a lighter
  plate with a hairline; on leave it fades. While the Services panel is open
  the preview stays on Services.
- Both are Motion values animated from measured layout; reduced motion
  snaps instead of gliding.

### Hover sequence (150–300 ms)

Index turns ochre → label shifts 1 px → preview plate glides → (Services)
panel opens after hover intent, closes 160 ms after leave. No bounce.

### Services mega panel

Opens on hover or focus of Services. An architectural sheet spanning the
viewport: **01** service index (published services, keyboard ↑/↓), **02**
what the highlighted service does, **03** what it includes, **04** one
related study (from the owner's project ↔ service links; falls back to the
technical field), **05** "View …" and "Ask about this service". Escape
closes and returns focus to Services (the panel stays closed until focus or
the pointer leaves). A sixth published service appears automatically.

### Overflow

The track measures the free space in the header row. Routes that do not fit
fold, in owner order, into a **More** disclosure (button + list, closes on
Escape, route change or focus leaving). Tested with 6 and 8 links at 1440
and 1120 px.

## Tablet (64–80 rem)

Track items tighten; the panel drops its media column.

## Mobile (< 64 rem)

Header: mark, WhatsApp, **Menu**. The navigator is a full-screen ink field
(`<dialog>`, `#public-navigation-dialog`, labelled "RENZ / Navigation"):

- large numbered routes; a gold **rail** travels to the focused / hovered
  route; the background field changes with the focused route (the Projects
  row shows a study image);
- Services expands in place (`+` / `−`, `aria-expanded`);
- contact routes (WhatsApp in green, email);
- the primary CTA is sticky at the foot; tagline from Website → Globals.

Focus: Close is focused on open; Tab and Shift+Tab wrap inside the panel;
Escape closes and returns focus to Menu; `html.public-menu-open` locks scroll.

## CMS behaviour

- Routes and labels: Settings → Website → Navigation (approved routes +
  custom pages as `page:<slug>`), published with the configuration.
- Primary CTA: Settings → Website.
- Services: the published Services register.
- Wording: Website → Globals → "Menu tagline", "WhatsApp button label",
  "See all services" link label.

## Accessibility

Landmarks (`nav` "Primary navigation", "Service index", "Primary mobile
navigation"); `aria-current="page"`; `aria-expanded` / `aria-controls` on
Services, More and Menu; arrow keys, Home/End across the track; visible
focus (gold ring); WCAG AA contrast on both header states; reduced motion
removes gliding, panel fades and rail travel. Axe serious/critical = 0 with
the panel and the navigator open.
