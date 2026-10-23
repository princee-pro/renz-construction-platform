# RENZ S9A-P Motion Choreography

**Status date:** 8 September 2026  
**Decision:** native browser controls, CSS, and SVG only; no new motion dependency

## Choreography principle

Motion follows the existing Measure → Draw → Align → Assemble → Reveal vocabulary. It clarifies a change in state or the assembly of a construction field; it never hides content, hijacks scroll, auto-advances reading, follows the pointer, or becomes the only way to understand a relationship.

## Brand opener

The opener lasts 1.36 seconds and is limited to the homepage’s first navigation in a browser session:

| Window | Move | Purpose |
| --- | --- | --- |
| 0–350 ms | registration frame resolves | establish measure and boundary |
| 120–820 ms | dark mass rises into place | establish depth without media |
| 220–870 ms | provisional mark resolves | connect the mass to the preview identity |
| 350–1070 ms | gold datum draws across the field | carry orientation toward header/hero |
| 980–1360 ms | opener clears | expose the already-rendered experience |

The page and primary CTA render underneath immediately. The overlay has no pointer ownership except for its explicit `Skip intro` button, so it is not a content gate. Session Storage records only the boolean `renz-s9ap-opener-seen`; no identity, analytics, or persistent tracking is involved. The opener is bypassed for repeat session views, browser back/forward restoration, Save-Data, and reduced-motion preference.

## Route and interaction motion

- Hero geometry draws once from static SVG paths while mass resolves in place.
- Navigation uses a native modal `<dialog>`, a 220 ms opacity/translation reveal, Escape cancellation, explicit close, focus entry, scroll lock, and trigger-focus restoration.
- Native `<details>` own expertise and process disclosure state; no custom accordion state machine is introduced.
- Drawing → Reality uses the browser’s native range semantics and one CSS custom property. Mobile exposes a full-width binary toggle; keyboard input remains native at larger widths.
- Project chapters use ordinary document scroll and sticky positioning only. There is no scroll timeline that changes meaning, no pinned sequence, and no transformed reading order.
- Hover/focus arrows and datum rules move only a few pixels and preserve equivalent static focus treatment.

## Dependency revalidation

The current registry candidate for Motion is `13.2.0` (MIT; React 18/19 peer range). Motion’s public changelog showed the 13.1.1 line on 18 August 2026 when reviewed. GSAP’s current registry candidate is `3.15.0`, distributed under GreenSock’s standard no-charge license. Official references: [Motion for React](https://motion.dev/docs/react), [Motion changelog](https://motion.dev/changelog?lib=motion), and [GSAP installation](https://gsap.com/docs/v3/Installation/).

Neither dependency is admitted. S9A-P’s accepted choreography does not need spring physics, layout animation, orchestration state, ScrollTrigger, timeline composition, or canvas/WebGL. Adding Motion would duplicate CSS/native roles; GSAP would be materially larger and would solve no accepted interaction. Three.js and React Three Fiber remain outside the baseline because no approved 3D scene or measured value case exists.

## Reduced motion and constrained paths

At `prefers-reduced-motion: reduce`:

- the opener is not rendered visibly;
- drawing paths resolve immediately;
- every reveal is fully opaque and in its final position;
- transition duration collapses to the established minimal override;
- Drawing → Reality changes layers instantaneously while retaining its labelled desktop range and binary control;
- the narrow/mobile path hides the redundant range but keeps the visible binary comparison button;
- no content, label, or navigation target is removed.

Save-Data bypasses the opener. No remote fonts, videos, 3D, analytics, or third-party scripts are loaded in either path.

## Future admission rule

Motion or GSAP may enter a later approved slice only when a named interaction cannot be expressed accessibly and maintainably with the current stack, a prototype proves the benefit, bundle/interaction budgets remain within limits, reduced-motion equivalence is complete, licensing is accepted, and the dependency has one non-duplicated owner. Novelty is not evidence.


## Approved silver architectural identity — 28 September 2026

The user explicitly revoked the terracotta/brick R direction and approved the attached black-and-silver RENZ CONSTRUCTION twin-tower logo as the new website source of truth. This decision supersedes the 25 September identity decision for all operational logo uses. The original is byte-preserved at `references/client/originals/03-renz-construction-silver-reference.png`; faithful vector derivatives, allowed use, hashes and checks are recorded in [RENZ_SILVER_BRAND.md](./RENZ_SILVER_BRAND.md). The opening and loading screens use the large stacked lockup on black; the responsive header uses a compact silver lockup linked to `/`. The approved opener now applies to the public homepage independently of preview mode, retaining its session, skip, reduced-motion, forced-colors and Save-Data bypasses. Existing business facts, historical audit records and unrelated UI colors remain under their existing contracts. This is source implementation authority, not deployment or general release approval.


## Orange identity clarification — 28 September 2026 (superseding update)

The user resolved the conflicting brief by explicitly selecting the orange curved R with the two-line Renz Construction wordmark. This later instruction supersedes the silver tower identity above for operational website branding. The supplied composition and traced lettering are retained in transparent SVGs; the full opening/loading logo appears on white, the responsive header logo links to the homepage, and existing shared identity placements and app icons use the same source. Provenance, preparation and current verification are recorded in [RENZ_ORANGE_BRAND.md](./RENZ_ORANGE_BRAND.md). Earlier dated decisions and checks remain historical; this bounded correction does not authorize deployment or change business facts.
