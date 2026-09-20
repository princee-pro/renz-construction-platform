# RENZ FINAL MEDIA QUEUE

D1 audit of every image the public experience renders, what it is, whether it
was kept, and what still has to be produced. No image generator or video
pipeline was available in the D1 environment, so every item that needs new
pixels is queued here with its exact brief instead of being faked.

## Provenance rule (unchanged)

- Every concept image is labelled **Concept study / Generated visual — not
  RENZ project evidence** wherever it appears (cards, heroes, media plane,
  comparison, gallery crops).
- Real project media only enters through Admin → Content → Projects with the
  C3/C4 evidence gate. Nothing in this queue bypasses that.
- No stock photography, no Google imagery, no fabricated logos, people or
  testimonials.

## Audit — what ships in D1

| Asset                                                          | Bytes   | Use                                                                          | Decision                                                                                                                                                                                                                        |
| -------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/media/renz-preview/projects/ridge-residence/hero.webp` | 334,192 | Home hero, monument card, case-study hero + sticky plane + gallery crops     | **Keep.** Strong light, legible massing, works at 16:8, 4:5 and as three detail crops. Also the Drawing ↔ Built resolved layer.                                                                                                  |
| `…/courtyard-house/hero.webp`                                  | 299,916 | Portrait card, case study                                                    | **Keep.** Vertical composition suits the portrait card.                                                                                                                                                                         |
| `…/urban-workspace/hero.webp`                                  | 358,744 | Landscape card, case study                                                   | **Keep.**                                                                                                                                                                                                                       |
| `…/lake-retreat/hero.webp`                                     | 453,072 | Technical card (drawing + image), case study                                 | **Keep.** Largest file — served through `next/image` at ≤ 60 vw so the encoded payload is well under the source size.                                                                                                           |
| `…/community-pavilion/hero.webp`                               | 382,310 | Strip card, case study                                                       | **Keep.**                                                                                                                                                                                                                       |
| `…/industrial-campus/hero.webp`                                | 288,554 | Wide card, case study                                                        | **Keep.**                                                                                                                                                                                                                       |
| `public/media/renz-preview/home/material-detail.webp`          | —       | Home material moment (concrete / timber / stone)                             | **Keep.** Labelled "Concept material study".                                                                                                                                                                                    |
| Drawing layers                                                 | 0       | Drawing ↔ Built, technical cards, service pages, hover lifts                 | **Procedural** — `src/components/site/study-drawing.tsx` draws an elevation per study slug from a small profile table; no raster needed, scales to any width, animates as line-draw and shows the final state in reduced motion. |
| Fields (survey / plan / structure / datum / material / quiet)  | 0       | Section backgrounds, mastheads, service cues                                 | **Procedural SVG** (`fields.tsx`).                                                                                                                                                                                              |
| Brand mark                                                     | 0       | Header, footer, opener, admin sidebar                                        | **Code-native Datum R** (`preview-renz-identity.tsx`) — still provisional; the approved master stays a C7 brand-slot upload.                                                                                                     |
| `design/concepts/*.png`                                        | —       | Reference only                                                               | **Not rendered** anywhere on the public site (verified by `scripts/verify-s9ap-preview-off.mjs` and the S9BP local-media assertion).                                                                                            |

Video: none. Every "video" idea in the backlog (hero loop, process loop) was
replaced by scroll-linked SVG and image parallax so the reduced-data and
reduced-motion contracts hold without a poster pipeline. `video` elements
remain asserted to be absent (`s9bp-public.spec.ts`).

## Queue — media still to produce (in priority order)

1. **Seventh concept study — "Terraced Housing" (residential, stepped
   section).** Brief: late-afternoon light, three stepped terraces on a slope,
   concrete bands with timber screens, planted roofs; camera slightly above eye
   level looking along the terraces; 3:2 master at ≥ 3000 px plus a 4:5 crop.
   Needs: hero.webp, `previewProjects` entry with nine chapters, a
   `StudyDrawing` profile. Reason: the studies index composition sequence has
   seven slots (monument, portrait, landscape, technical, strip, wide, +1
   split) and currently repeats after six.
2. **Detail crops per study.** Today every study reuses crops of its own hero
   (`--crop` positions). A dedicated 1:1 detail (junction, threshold, material
   edge) per study would let the gallery stop re-cropping the same frame.
3. **Material register.** Three honest material close-ups (board-marked
   concrete, oiled hardwood, local stone) for the home material moment and the
   service pages, replacing the single concept detail.
4. **Service page openers.** One 21:9 image per service (Design: drawing
   table; Executions: setting-out on site; Hybrid: drawing and site together;
   Supervision: inspection; Consultations: a conversation over plans) —
   generated or photographed, always labelled as concept until RENZ supplies
   real site photography.
5. **Real RENZ evidence.** Site photographs, drawings and completion records
   supplied by the client and published through Admin. This is the only path
   that removes the concept label; it is a client evidence task, not a design
   task (`docs/CLIENT_EVIDENCE_BACKLOG.md`).
6. **Brand media slots (C7).** Approved logo master, reversed logo, favicon
   set and OG image once the Datum R is signed off.

## Performance notes

- All heroes are served through `next/image` with `sizes` tuned per card
  (`100vw` monument/wide, `40vw` portrait, `50–60vw` landscape/technical).
- Fonts: three self-hosted variable subsets (Archivo wdth+wght, Source Sans 3,
  IBM Plex Mono) under `src/fonts/`, preloaded by `next/font/local`.
- No third-party media, scripts or fonts load on any public route (asserted by
  `s6a-public.spec.ts` and `s9bp-public.spec.ts`).
