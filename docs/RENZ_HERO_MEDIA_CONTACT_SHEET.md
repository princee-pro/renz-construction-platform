# RENZ Hero Media Contact Sheet (D1.6)

What opens each public route today, where the file lives, its provenance,
size and mobile behaviour. Read with `docs/RENZ_CINEMATIC_MEDIA_GUIDE.md`.
"Queued" means the route uses its procedural scene and (where set) a poster
image until footage is produced; the CMS fields already exist.

| Route | Concept | Poster (CMS media) | Video | Provenance | Size / duration | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | land | Ridge Residence concept image (preview fallback until the owner sets a Hero image) | `home-land-to-landmark.webm`, 1280×720, VP8 | Generated concept visual (rendered loop from the concept image) | 1.20 MB · 7 s · 24 fps | poster + scene (no mobile source) |
| `/services` | stages | — (split plane, no media) | — | — | — | scene |
| `/services/design` | drawing-form | — (split plane) | queued | — | — | scene |
| `/services/executions` | plan-build | lead study image (Urban Workspace) | queued: construction sequence | Concept study | — | poster + scene |
| `/services/hybrid-service` | split-morph | lead study image (Ridge Residence) | queued | Concept study | — | poster, drawing plane |
| `/services/supervision` | checkpoints | lead study image (Ridge Residence) | queued: detail footage | Concept study | — | poster + scene |
| `/services/consultations` | site-decision | — (split plane) | queued: aerial / contour | — | — | scene |
| `/projects` | film-archive | published study images (film strip) | queued: montage | Concept studies | — | strip below copy |
| `/projects/[slug]` | study hero / project | the study's own hero; real projects: `hero` / `video_poster` + `video` roles | per project | per project | — | image |
| `/about` | how-we-work | — (split plane) | queued | — | — | scene |
| `/insights` | drawing-board | — (editorial plane) | — | — | — | copy only |
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

Production queue for C10 / media production (in priority order): Home
footage, Executions construction sequence, Supervision detail, Projects
montage, Consultations aerial, Design plan-to-form, Hybrid drawing-to-built,
About, Contact dusk; then mobile sources (720×1280) for the ones kept on
phones; MP4 (H.264) fallbacks once an encoder with libx264 is available
(the bundled ffmpeg encodes VP8 only).
