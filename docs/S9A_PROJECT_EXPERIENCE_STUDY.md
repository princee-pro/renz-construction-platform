# RENZ S9A-P Project Experience Study

**Status date:** 8 September 2026  
**Runtime boundary:** local client preview only  
**Public claim status:** none; all media are concept references, not RENZ work

## Purpose

S9A-P demonstrates how future rights-cleared project material could be composed without inserting a fictional project into S4 public projections. The preview uses three distinct presentation modes and one normal-scroll story route. It does not create a project record, migration, publication bypass, media object, admin workflow, contact channel, or public claim.

The route `/projects/experience-study` exists only when server-only `RENZ_CLIENT_PREVIEW=true`. With the flag off it resolves through the real 404 boundary. The project index’s studies disappear as well; real projects continue to come only from `published_projects` through the existing typed S4 adapter.

## Concept asset register

| Source | Dimensions | Bytes | SHA-256 | Runtime use |
| --- | ---: | ---: | --- | --- |
| `design/concepts/01-homepage-hero.png` | 1672 × 941 | 1,971,230 | `80A2527510A24A4BA8E815D382D641447FEA5DF0E8EA3A0F905B90C3CF0E5280` | Monument study and Design chapter |
| `design/concepts/03-homepage-selected-projects.png` | 1402 × 1122 | 1,793,013 | `22C07B7F19E2CDD0EAB9221590F3D53F28175A4ED456624D30E82A4D96F20634` | Split study |
| `design/concepts/06-project-detail.png` | 1536 × 1024 | 1,852,453 | `B93AA8685CAC85A579E787612A80DC41D81633F09E6CD3F997C2AA46B4F14E39` | Drawing–Mass study, Construction chapter, and comparison interaction |

Every runtime image has explanatory alt text and a visible `Concept visual / not project evidence` or equivalent label. Embedded concept-board wording is reference material, not data and not promoted into public metadata or content records.

## Presentation family

1. **Monument** — one decisive 16:8 visual plane followed by a compact editorial caption and the only link into the interaction study.
2. **Split** — an offset image/narrative composition that demonstrates how future verified facts can sit beside media without becoming a uniform card.
3. **Drawing + Mass** — a wide technical strip that pairs the drawing register with a resolved concept plane.

The homepage uses only the compact Monument expression. The full Projects route contains all three studies so the route has varied rhythm without misrepresenting the concepts as a portfolio.

## Story architecture

The preview route is one semantic `<article>` with nine ordered chapters:

1. Brief
2. Site
3. Challenge
4. Approach
5. Design
6. Structure
7. Construction
8. Detail
9. Result

The desktop chapter index is sticky navigation, not a scroll controller. Every chapter remains in DOM/document order, anchor-addressable, keyboard reachable, and readable with CSS or JavaScript unavailable. At mobile width the index becomes a horizontally scrollable static register. No pinned scene, auto-advance, scroll lock, transform-based reading order, or history mutation exists.

## Drawing → Reality

The comparison is a narrow client island because a browser-owned range value is the behavior. It uses a native range input with a label, output value, and keyboard behavior. A visible button provides a binary mobile path. The component changes only a CSS clipping position; it never loads a new record or submits data.

For `prefers-reduced-motion: reduce`, both labelled layers remain available and the comparison changes instantaneously instead of transitioning. The desktop range/output and binary control remain operable; at the compact mobile width the redundant range/output are hidden while the visible binary control remains. Content does not depend on the transition.

## Claims and safety boundary

The studies never name a real client, project, location, date, cost, service, role, statistic, outcome, qualification, award, or delivery claim. The route is noindex/nofollow through the existing metadata owner. It uses no analytics, third-party script, remote image, remote font, upload, form, or data mutation.

Production project storytelling remains blocked until S5B provides the required Projects + Project Media administration and each public case has verified facts, evidence, rights, consent where required, reviewer state, and publication approval. S9A-P demonstrates presentation quality only.
