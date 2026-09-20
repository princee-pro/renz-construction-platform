# RENZ FINAL DESIGN BACKLOG

Carried forward from C3.5 ("public experience functional rescue"), the S9A/S9B
signature-preview studies and every later phase. **None of this was
implemented in C9.** D1 (2026-09-13) worked this list inside the constraints
of `docs/RENZ_FUNCTIONAL_FREEZE.md`; the result is frozen in
`docs/RENZ_DESIGN_FREEZE.md`.

**D1 status:** items 1–9, 11–15, 19–22 done. Item 10 (seventh study), 16
(real media), 17 (video — replaced by scroll-linked SVG/parallax, no video
planned) and 18 (brand media slots) are production-media tasks recorded in
`docs/RENZ_FINAL_MEDIA_QUEUE.md`. Item 6's `living-datum` /
`architectural-field` components were retired in favour of `fields.tsx`;
item 7's preview choreography was retired in favour of the motion primitives.

## Navigation and shell

1. Premium navigation: transparent-to-solid header, wordmark treatment,
   scroll state, reduced-motion behaviour (`docs/VISUAL_CONCEPTS.md` #01).
2. Mega-menu refinement for Services (`services-nav-panel.tsx`,
   `services-navigator.tsx`): grouping, previews, keyboard model.
3. Final footer: datum line, index structure, legal links, contact block.
4. Page transitions between public routes (respecting `prefers-reduced-motion`).

## Signature interactions

5. Signature Services interaction (the "Datum & Mass" direction).
6. Animated backgrounds / living datum (`living-datum.tsx`,
   `architectural-field.tsx`) — final tuning and performance budget.
7. Scroll choreography (`preview-choreography.css`, `section-reveal.tsx`,
   `datum-journey.tsx`) — promote from preview to production or retire.
8. Stronger project interactions on the case-study index and detail
   (`project-experience-study.tsx`, comparison interaction, drawing↔mass).
9. Process storytelling section (concept #04) with real RENZ steps.
10. The seventh concept study if still desired (S9A inventory item).

## Components and system

11. Motion primitives (durations, easings, stagger tokens) as design tokens;
    reconcile `DESIGN.md`, `design-tokens.generated.css` and `MOTION_SYSTEM.md`.
12. Micro-interactions: buttons, links, form focus, arrow marks, copy
    buttons, WhatsApp float.
13. Buttons / cards / forms: unify public `public-link`, intake fields,
    consent buttons (C9) and error summaries.
14. Typography scale and spacing rhythm across public routes; hero and
    section masthead hierarchy.
15. Mobile polish at 320–390 px: menu drawer, hero, wizard steps, tables
    inside `overflow-x` containers, consent layer placement (C9).

## Media

16. Media generation and public imagery review: replace every concept
    reference with licensed / verified RENZ media (`CLIENT_EVIDENCE_BACKLOG.md`).
17. Video: hero / process loops with poster, reduced-data behaviour.
18. Brand media slots (C7): final logo, reversed logo, favicon, OG image.

## Admin surface (light touch)

19. Analytics charts: final palette mapping to brand tokens (keep the
    validated CVD-safe pair), table styling, print stylesheet polish.
20. Notification bell / panel visual refinement; empty-state illustrations
    for Analytics and Notification Center.
21. Dashboard density review (Control Room + Analytics overview) at 1440.

## Visual regression debt

22. `tests/e2e/s6a-visual.spec.ts` and `s9ap-visual.spec.ts` target the
    pre-C3.5 home and are `testIgnore`d; rewrite or delete them against the
    final design (`s9bp-visual.spec.ts` is the current baseline).
