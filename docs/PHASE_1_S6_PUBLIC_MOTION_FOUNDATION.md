# RENZ Phase 1 / S6 Public Motion Foundation

**Status date:** 8 September 2026  
**Creative principle:** Motion explains construction.

## Vocabulary

S6A admits five purposeful motion verbs:

1. **Measure** — the Living Datum draws across a known axis.
2. **Draw** — plan lines and registration marks resolve into the architectural field.
3. **Align** — small labels/arrows settle against shared baselines.
4. **Assemble** — restrained structural planes enter as one composition.
5. **Reveal** — short line, mask, or directional transitions expose content that is already present in HTML.

This vocabulary excludes decorative perpetual animation, generic repeated fade-up effects, parallax, scroll hijacking, pointer chasing, custom cursors, particles, WebGL, and page-transition infrastructure.

## Runtime model

Motion is CSS-first. SVG/CSS geometry supplies the hero field and visual study; transforms and opacity are the only animated properties used for entrance effects. Content is visible and usable without client JavaScript. No GSAP, Motion, Three.js, React Three Fiber, observer package, or animation provider was added.

The server-rendered hero headline and CTA are never gated behind animation. Normal browser scrolling and Next navigation remain authoritative.

## Direction and timing

- Datum lines draw left-to-right.
- Small technical labels use short upward resolution.
- Hero planes use limited opposing horizontal directions to create constructional assembly.
- CTA arrows use a small state response rather than continuous movement.
- Mobile uses shorter distance and fewer simultaneous movements.

The motion budget is intentionally below the more ambitious S9 signature system. S6A establishes a coherent grammar without locking in a heavy runtime.

## Reduced motion

Under `prefers-reduced-motion: reduce`:

- transitions and keyframes resolve effectively immediately;
- content and geometry remain at their final visible state;
- smooth scrolling is disabled;
- no essential relationship or control depends on movement;
- menu interaction, focus placement/restoration, and native dialog semantics remain intact.

Forced-colors mode keeps controls, text, and outlines operable while decorative geometry may simplify.

## Future admission gate

S9 may add a more advanced interaction only when it has a construction-specific explanatory purpose, an accessible static/reduced-motion equivalent, measured bundle/runtime cost, mobile behavior, and a real rendered screenshot correction loop. The required loop remains:

`IMPLEMENT → BUILD → RENDER → SCREENSHOT → INSPECT → CORRECT → REPEAT`.
