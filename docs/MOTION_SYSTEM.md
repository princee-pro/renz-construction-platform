# RENZ Motion System

Status: Phase 0 specification. No runtime animation is implemented. Every sequence is provisional until tested with real content, representative Rwanda network/device conditions, and the performance/accessibility budgets below.

## 1. Motion principle

**Motion explains construction.** A line establishes datum; a plane is set; a frame gains mass; content is revealed in the order a person can understand it. Motion must support hierarchy, continuity, causality, or feedback. If removing an effect does not reduce understanding or brand recognition, omit it.

The system favors line draw, clip/mask reveal, measured translation, plane transition, and short cross-fade. It rejects ambient drift, cursor-chasing, decorative particles, perpetual parallax, excessive scale, elastic UI, page-long scroll hijacking, and cinematic delay before useful content.

## 2. Motion tiers and ownership

| Tier | Technology | Approved work | Admission rule |
|---|---|---|---|
| 0 | No animation | Reduced-motion and constrained-device baseline | Complete, immediately understandable content. |
| 1 | CSS | Color, border, underline, short opacity/transform, focus/pressed state | Default for simple state transitions. |
| 2 | Motion | React presence, layout continuity, menu/sheet, controlled reveal, gesture-safe state | Use only in client islands; no site-wide client wrapper. |
| 3 | GSAP + ScrollTrigger | At most one signature scrubbed/pinned editorial sequence | Admit only after a prototype proves narrative value and passes budgets on mid-range mobile. |
| 4 | Three.js/WebGL | None at baseline | Deferred. Requires a separately approved concept, static fallback, asset budget, battery/GPU evidence, and measurable value. |

Do not load GSAP, Motion, video controls, or any signature sequence on routes that do not use them. Dynamic import noncritical motion after meaningful content is available.

## 3. Timing and easing tokens

| Token | Proposed value | Use |
|---|---:|---|
| `instant` | 0–100ms | Reduced-motion opacity support or direct feedback. |
| `micro` | 160ms | Press, border, icon, compact disclosure response. |
| `control` | 220ms | Hover/focus/selected transition and small presence. |
| `overlay` | 280ms | Menu, sheet, dialog, backdrop. |
| `section` | 360–500ms | One editorial reveal or plane change. |
| `opener-max` | 1,400ms | Entire optional brand opener, including exit. |

Default productive easing is a restrained ease-out comparable to `cubic-bezier(.22,1,.36,1)`. State reversal should feel immediate and should not replay a long entrance. Spring motion is allowed only for direct manipulation where overshoot cannot reduce precision; it is not the brand signature.

Stagger is rare: 30–60ms between a maximum of four closely related items. Do not serialize reading through long cascades.

## 4. Signature opener

### Storyboard

1. A vertical navy column appears on a navy/near-black field through contrast and edge definition.
2. A horizontal gold datum draws once across the field.
3. A roof/fold plane sets against the column.
4. The geometry resolves into the provisional RENZ R/wordmark lockup.
5. The field opens directly into the hero without a blank interstitial.

### Contract

- Maximum total duration approximately 1.4 seconds.
- First eligible session only; use a lightweight session flag, not tracking identity.
- Persistent, keyboard-accessible `Skip intro` from the first frame.
- Screen readers receive the page heading/landmarks, not a narrated decorative SVG sequence.
- `prefers-reduced-motion: reduce`, Save-Data, constrained device heuristics, restored navigation, bfcache, and repeat visit bypass it completely.
- No blocking network request; critical hero content exists underneath and remains semantically first.
- If the final approved mark differs, redesign this sequence—do not force the provisional R animation onto it.

## 5. Homepage motion choreography

### Hero: blueprint to built

- Start with content and the most useful image already reserved and progressively available.
- A restrained blueprint/section line may align with the photograph, then yield to the built surface through a single mask or opacity transition.
- Heading, qualifier, and CTAs appear immediately or in one short grouped reveal; never wait for the image sequence.
- No autoplay audio. Background video is not the default and requires poster, controls where appropriate, reduced-data fallback, and proof that it does not compromise LCP.

### Expertise

- Desktop selection moves the datum to the active group and changes one supporting media/diagram plane.
- Focus and click have identical access; hover only previews when useful.
- Preserve content height or animate layout without jump. On mobile use an accessible disclosure with short CSS/Motion presence.

### Selected projects

- Recommended wide-screen experiment: one project plane exits as the next establishes a new datum, making comparison feel like moving across adjacent sheets.
- Do not scroll-jack the page or hide scrollbar progress. Normal wheel/touch navigation remains predictable.
- Mobile and reduced-motion render a vertical sequence with stable images and direct links.
- Project facts and names are never revealed solely through motion.

### Process

- The line grows only as the corresponding stage enters the reading region; completed stages remain visible.
- Desktop may use a horizontal chapter composition without trapping the viewport. Mobile uses a vertical line beside normal document flow.
- Stage labels, descriptions, and next action are present without scrubbing.

### Quality, safety, sustainability, proof

- Use quiet line/number transitions only when the values are verified.
- Do not count from zero merely for spectacle. Never animate placeholder metrics in a way that implies evidence.
- Icons, diagrams, and labels can reveal together within one section transition.

### Final CTA

- One datum line resolves into the CTA boundary or button emphasis.
- No fake magnetic cursor, proximity escape, or continuous glow.

## 6. Navigation and route transitions

### Header

- Transparent-over-hero to compact-solid is driven by an explicit intersection state.
- Transition surface, border, and height within 160–240ms while reserving layout to avoid CLS.
- The Expertise disclosure uses predictable open/close, Escape, outside interaction, and focus restoration. Animating its opacity/translate must not delay focus.

### Mobile menu

- Full-screen architectural sheet: one structural plane enters, then navigation content appears as a group.
- Modal semantics, inert background, scroll lock, safe areas, Escape, close button, and focus return are mandatory.
- Reduced motion opens/closes immediately or with ≤100ms opacity only.

### Page changes

- Default to native Next.js navigation and instant content availability.
- Optional route continuity may fade a shared datum/media plane for 180–300ms where both routes support it.
- Never delay navigation to finish an exit animation. Back/forward, hash, restored scroll, loading, error, and bfcache behavior must remain correct.
- Native View Transitions are an enhancement only after support/behavior testing; no dependency on them for comprehension.

## 7. Admin and wizard motion

The admin uses motion for continuity, not theater:

- drawers/dialogs/popovers: 160–280ms, focus available at open, stable actions;
- row mutation: preserve frame, mark pending, then announce success/failure without collapse;
- filter/search: no animated result churn; use stable feedback and cancel stale work;
- toast/banner: enter quietly, remain long enough to act, no bouncing stack;
- drag/reorder: only where necessary, with keyboard/non-drag alternative and clear saved state;
- charts: no long draw-on animation; direct labels and table alternative.

The project wizard changes step with a modest directional plane or opacity cue, while heading focus, error focus, browser history policy, saved values, and action placement remain deterministic. Direction never carries the only meaning of progress.

## 8. Reduced-motion and constrained-mode matrix

| Experience | Full motion | Reduced motion / constrained fallback |
|---|---|---|
| Opener | Column → datum → fold → mark, ≤1.4s | Bypassed; hero immediately present. |
| Hero | Single plan-to-built mask | Static optimized poster/image. |
| Expertise | Datum/media plane transition | Instant selected state; optional ≤100ms opacity. |
| Projects | Controlled plane/cross-fade experiment | Normal vertical list/chapter flow. |
| Process | Progressing line | Complete static line and stages. |
| Parallax/depth | Only if separately admitted | Removed. |
| Scroll scrub/pin | One admitted sequence at most | Normal document flow. |
| Menu/dialog | Short transform + opacity | Immediate or opacity-only. |
| Page transition | Optional shared-plane continuity | Native instant navigation. |
| Loader | Stable low-motion indicator | Static text/progress where measurable. |

Reduced-motion is detected in CSS and JavaScript through the platform preference and Motion's `useReducedMotion`/global configuration. The server-rendered baseline must not flash a motion-heavy state before hydration.

## 9. Performance admission budgets

Motion shares the overall performance budget; it does not receive an exception.

- LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile for mobile and desktop.
- Public first-route JavaScript target ≤170 KiB compressed; any motion library cost is included.
- No long main-thread task over 50ms during common input on the tested mid-range mobile profile.
- Prefer compositor-friendly `transform` and `opacity`; avoid animating layout/paint-heavy properties across large regions.
- Measure layer promotion; do not scatter `will-change` or retain large GPU layers.
- Decode/reserve media before transitions depend on it. Never hide a late image behind a long animation.
- Disable/degrade nonessential effects for Save-Data, reduced motion, constrained GPU/device evidence, and background tabs.
- A GSAP signature prototype must show no material Core Web Vitals regression, no scroll loss, no focus obstruction, and no hydration mismatch before admission.

## 10. Accessibility and input contract

- Motion never changes DOM or visual order in a way that conflicts with reading/focus order.
- Focus is not placed in an element that is visually offscreen during an entrance.
- Pausable/controllable rules apply to any moving content that persists; the baseline contains none.
- No flashing or repeated high-contrast transition near seizure thresholds.
- Keyboard, touch, pointer, screen-reader, and browser Back behavior produce equivalent results.
- Hover effects have focus/touch equivalents. Drag/gesture has a control-based alternative.
- Announcements describe state/result, not decorative animation.

## 11. Verification matrix

Before admitting a sequence:

1. Test no-JavaScript/server baseline where the route is public and indexable.
2. Test `prefers-reduced-motion`, Save-Data, repeat visit, restored navigation, background/foreground, and interrupted animation.
3. Verify keyboard and focus at start, mid-transition, cancellation, close, error, and back navigation.
4. Test 360/390/430px mobile, tablet, desktop, short landscape, touch/no-hover, and 200% zoom.
5. Profile on a representative mid-range Android/Chromium configuration and current desktop Chromium/Firefox/WebKit.
6. Record bundle delta, LCP/INP/CLS, long tasks, dropped frames, memory/layer behavior, and CPU/network profiles.
7. Compare the static fallback and confirm all content/actions remain available.
8. Run Playwright reduced-motion cases and visual regression at stable animation endpoints; avoid timing-fragile screenshots.

## 12. Kill criteria

Remove or simplify an effect when it:

- delays content, navigation, focus, or a primary action;
- causes measurable budget failure or unreliable behavior on target devices;
- requires scroll hijacking or breaks restored position;
- communicates an unsupported claim;
- lacks an equivalent reduced-motion/static state;
- becomes the only way to discover content;
- adds a substantial dependency for one minor flourish;
- conflicts with the approved final identity or real project imagery;
- creates recurrent maintenance or visual-regression instability.

The strongest Phase 1 result may use fewer effects than the concepts. Restraint is a successful outcome when structure, evidence, and interaction remain memorable.
