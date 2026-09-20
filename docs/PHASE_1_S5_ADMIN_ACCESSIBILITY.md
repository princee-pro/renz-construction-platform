# RENZ Phase 1 / S5A Admin Accessibility Record

**Status date:** 6 September 2026  
**Target:** WCAG 2.2 AA by construction; this record is not a certification

## 1. Semantic foundation

- Each route has one primary `main` landmark and one page `h1`.
- Breadcrumbs use labeled navigation and an ordered list.
- Services use an ordered register; the mobile transformation preserves DOM order.
- Forms use native labels, inputs, textareas, selects, fieldsets, legends, buttons, and links.
- Statuses always include text; color is supplementary.
- Definition lists represent record metadata.
- Evidence items and activity are lists, not clickable containers.
- No unnecessary ARIA, click-only `div`, custom checkbox, custom select, or inaccessible faux button was introduced.

## 2. Focus and keyboard behavior

All interactive controls retain a high-contrast `:focus-visible` outline. Form validation moves focus to the first invalid field, falling back to the form summary. Error messages are associated with controls through `aria-describedby` and `aria-invalid`.

The mobile navigation uses native `<dialog>.showModal()`, which supplies modal focus containment, background inertness, and Escape dismissal in the tested Chromium runtime. Open and close buttons have explicit accessible names and minimum 44px dimensions. Publish, archive, evidence-decision, unsaved-change, and reload confirmations also use native dialogs and actual buttons.

The editor intercepts only ordinary same-origin primary-button link navigation while dirty. Modified clicks and external destinations retain native behavior. The safeguard disappears after a successful save.

## 3. Announcements and validation

Action errors and important mutation results use alert/live-region primitives. Saving state and dirty/clean state are announced politely. Validation communicates a descriptive summary plus field-specific text; it does not expose raw Zod structures or SQL errors and does not rely on red alone.

Destructive/consequential actions have explicit confirmation language. Save, Publish, Unpublish, and Archive remain distinct controls with distinct descriptions.

## 4. Responsive and zoom-aware design

The browser matrix covers desktop, 768px tablet, and 390px mobile. CSS was additionally reviewed at 320px-compatible fluid widths. Below `64rem`, the desktop rail becomes a purpose-built drawer. Below `48rem`, the Services register becomes labeled stacked records and field groups reflow to one column. The narrow action bar is static so it cannot cover fields while zoomed or touched.

Playwright asserts no body overflow at 768px, and the 390px Services screen is scanned with axe-core. The layout uses logical properties, wrapping text, bounded widths, and no fixed content width that requires page-wide horizontal scrolling.

## 5. Motion, contrast, and alternate modes

S5A adds no animation dependency or background motion. Existing reduced-motion rules collapse transitions. The palette uses centralized semantic roles; the screenshot review corrected drawer foreground inheritance so identity and profile text remain readable on the dark surface. Forced-colors rules preserve system scrollbars and focus outlines.

No remote font, icon font, image-dependent label, or audio/video content exists in the admin.

## 6. Automated evidence

- Component tests verify semantic empty-state headings, permission-hidden controls, readiness language, exact preview headings/list/link semantics, create/editor/evidence value preservation, validation associations and focus, conflict preservation, save failure, save success, and retry copy.
- Playwright verifies AAL1 redirection, capability filtering, disabled-account behavior, form validation focus, link/sign-out dirty-state protection, native drawer behavior, full Services workflow, and two-actor conflict.
- `@axe-core/playwright` `4.13.0` reports no serious or critical violations for the authenticated desktop overview/editor and representative 390px Services register.
- Production route tests run against `next start`, not a mocked browser shell.

## 7. Manual visual evidence

Inspected screenshots include desktop Overview, Services, blocked editor, completed editor, publish confirmation, and conflict; 390px drawer, Services, editor, and validation; and the 768px editor. Three correction loops addressed:

1. client/server action-state leakage, drawer labeling, narrow sticky-action obstruction, mobile record ambiguity, activity spacing, and developer-oriented validation wording;
2. scroll-dependent full-page capture distortion, overlay capture framing, and dark-drawer text inheritance.
3. programmatic validation associations, controlled create/evidence error recovery, failed-modal feedback focus, dirty sign-out protection, text-only workspace identity, and identical visual/reading/keyboard order at tablet widths.

The artifacts remain under ignored `.playwright/screenshots/` and are test evidence only.

## 8. Limits and later checks

Automation cannot establish complete WCAG conformance. S5A did not perform a named assistive-technology lab session or claim production sign-off for NVDA/JAWS/VoiceOver, every 200% browser-zoom combination, every forced-colors theme, or every mobile browser. Those checks remain acceptance work for the production-like S5/S10 review environment; no known S5A defect is being hidden behind that deferral.
