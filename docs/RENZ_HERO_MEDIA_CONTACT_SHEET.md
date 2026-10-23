# RENZ Hero Media Contact Sheet (D1.6)

What opens each public route today, where the file lives, its provenance,
size and mobile behaviour. Read with `docs/RENZ_CINEMATIC_MEDIA_GUIDE.md`.
"Queued" means the route uses its procedural scene and (where set) a poster
image until footage is produced; the CMS fields already exist.

| Route | Concept | Poster (CMS media) | Video | Provenance | Size / duration | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | land | Ridge Residence concept image (preview fallback until the owner sets a Hero image) | `home-land-to-landmark.webm`, 1280×720, VP8 | Generated concept visual (rendered loop from the concept image) | 1.20 MB · 7 s · 24 fps | poster + scene (no mobile source) |
| `/services` | stages | — (split plane, no media) | — | — | — | scene |
| `/services/design` | drawing-form | lead study image, muted under the drawing (D1.7 split-plane poster) | queued | Concept study | — | scene over photo |
| `/services/executions` | plan-build | lead study image (Urban Workspace) | queued: construction sequence | Concept study | — | poster + scene |
| `/services/hybrid-service` | split-morph | lead study image (Ridge Residence) | queued | Concept study | — | poster, drawing plane |
| `/services/supervision` | checkpoints | lead study image (Ridge Residence) | queued: detail footage | Concept study | — | poster + scene |
| `/services/consultations` | site-decision | lead study image, muted under the drawing | queued: aerial / contour | Concept study | — | scene over photo |
| `/projects` | film-archive | featured study thumbnails (film strip, ≤ 6) + tile index of all twelve | queued: montage | Concept / Rwanda context studies | thumbs ≤ 960 px | strip below copy, stacked tiles |
| `/projects/[slug]` | study hero / project | the study's own hero; gallery of 7 pieces (see below); real projects: `hero` / `video_poster` + `video` roles | per project (poster-first, optional) | per project | hero ≤ 2400 px, gallery thumbs 960 px | image, stacked gallery |
| `/about` | how-we-work | — (split plane) | queued | — | — | scene |
| `/insights` | editorial field film | `home-land-to-landmark.poster.webp` plus generated concept study cards | `home-land-to-landmark.webm`, 1280×720, VP8 | Generated concept visual, visibly labeled as not project evidence | 1.20 MB · 7 s · 24 fps | poster + stacked concept cards |
| `/contact` | direct-line | Industrial Campus concept image | queued: dusk | Concept study | — | poster |
| `/start-a-project` | first-brief | — (split plane) | — | — | — | scene |
| `/enquire/service` | service-cue | study image | — | Concept study | — | poster |
| `/enquire/materials` | material-register | — (split plane) | — | — | — | scene |
| `/privacy`, `/terms`, `/cookies`, 404 | calm | — | — | — | — | — |

Files: `public/media/renz/heroes/` holds the rendered loop, its poster and a
JSON manifest per loop. The CMS copy of the loop is media asset
`333ddc98-…` (Website → Media, "Video"). Replace it there; the page inherits
the change on publish. Posters and crops for the concept studies remain in
`public/media/renz-preview/` (seeded into the Media library by
`scripts/website-seed-content.mjs`).

The shared `/admin/sign-in` and `/admin/mfa` presentation panel also uses the
same poster-first generated concept loop with a visible provenance label. It
is presentation only; authentication behavior and security flows do not
depend on the media.

Production queue for C10 / media production (in priority order): Home
footage, Executions construction sequence, Supervision detail, Projects
montage, Consultations aerial, Design plan-to-form, Hybrid drawing-to-built,
About, Contact dusk; then mobile sources (720×1280) for the ones kept on
phones; MP4 (H.264) fallbacks once an encoder with libx264 is available
(the bundled ffmpeg encodes VP8 only).

## Project galleries (D1.7)

Every study holds seven pieces. Generated pieces were made with Higgsfield
(Seedream 5.0 Lite, 2026-09-20, ten free credits); the prompts and job ids are
in `docs/RENZ_D17_MEDIA_PROMPTS.json` and
`public/media/renz-preview/projects/d17-generation-manifest.json`. Diagrams
are drawn by `scripts/d17-diagrams.mjs`. Nothing is a photograph of a real
building; nothing is RENZ project evidence.

| Study | Hero | Photographic secondary | Diagrams (site · plan · section · materials · sequence) | Detail crop |
| --- | --- | --- | --- | --- |
| 01 Ridge Residence (Residential) | D1 concept visual, 1586 × 992 | — | 5 | yes |
| 02 Courtyard House (Residential) | D1 concept visual | — | 5 | yes |
| 03 Urban Workspace (Workplace) | D1 concept visual | — | 5 | yes |
| 04 Lake Retreat (Hospitality) | D1 concept visual | — | 5 | yes |
| 05 Community Pavilion (Community) | D1 concept visual | — | 5 | yes |
| 06 Industrial Campus (Industrial) | D1 concept visual | — | 5 | yes |
| 07 Kigali Infill Apartments (Mixed Use · Kigali context) | overcast street, 3:4, 2688 × 3584 | interior + balcony (4:3) | 5 | — |
| 08 Musanze Highlands Lodge (Hospitality · Musanze context) | misty morning, 16:9, 4096 × 2304 | lounge interior (4:3) | 5 | — |
| 09 Bugesera Logistics Hub (Industrial · Bugesera context) | midday drone, 16:9 | construction stage (16:9) | 5 | — |
| 10 Huye Learning Courtyard (Education · Huye context) | dappled arcade, 16:9 | brick screen detail (3:4) | 5 | — |
| 11 Rubavu Lakeside Residences (Residential · Rubavu context) | soft afternoon lake, 16:9 | — | 5 | yes |
| 12 Rwamagana Production Yard (Industrial · Rwamagana context) | blue hour, 16:9 | — | 5 | yes |

Production queue (media): photographic secondaries for 01–06, 11 and 12
(exterior, interior, detail, dusk); higher-resolution re-renders of the six
D1 heroes; optional dusk / video loops per study; then the hero footage queue
above.
