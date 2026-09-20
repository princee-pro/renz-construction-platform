# RENZ C2 media manifest

Tracks every media asset the public site references, where it lives, and what still
needs a real (owned or properly licensed) file. Written during Phase C2.

## Available now (owned, in repo)

All under `public/media/renz-preview/`. Every one of these is a **generated concept
study** — none depicts a completed RENZ project, client, site, or commission. Each
usage in the UI carries an explicit "concept study" / "not RENZ project evidence"
label; do not remove that labeling when reusing a file.

| Path | Dimensions | Used as |
| --- | --- | --- |
| `home/material-detail.webp` | 1586×992 | Insights masthead backdrop, home material-register break, project case-study detail chapter |
| `projects/ridge-residence/hero.webp` | 1586×992 | Ridge Residence concept study (hero, home monument, projects index) |
| `projects/courtyard-house/hero.webp` | 1586×992 | Courtyard House concept study; also backs the Start-a-Project masthead |
| `projects/urban-workspace/hero.webp` | 1586×992 | Urban Workspace concept study; also backs the Contact masthead |
| `projects/lake-retreat/hero.webp` | 1586×992 | Lake Retreat concept study; also backs the Consultations service masthead |
| `projects/community-pavilion/hero.webp` | 1586×992 | Community Pavilion concept study; also backs the About masthead and Supervision service masthead |
| `projects/industrial-campus/hero.webp` | 1586×992 | Industrial Campus concept study; also backs the Services index masthead and Executions service masthead |

These seven files are deliberately reused across pages (masthead backdrops, home
sections, project cards) rather than duplicated — one coherent, limited photo set
read consistently, per the "coherent premium visual collection" principle. Reuse is
intentional design, not a placeholder shortcut.

## Directory contract for future drops

Predictable slots so newly generated or licensed files can be dropped in without
touching component code — just the two lines wiring a path in.

```
public/media/renz/
  home/            hero, secondary/video-poster, material break
  services/        one hero per category: design, executions, hybrid-service,
                   supervision, consultations (1920×1080 min, 16:9)
  projects/        additional angles per concept study — alternate exterior,
                   interior, construction/progress, detail, dusk/night, poster
  about/           opening image, team/values break
  contact/         hero/background
  details/         material/joint close-up crops (reusable across pages)
  video/           5–8s muted loops + poster stills
```

Naming convention: `<slug>/<role>.webp` (e.g. `services/design/hero.webp`,
`projects/ridge-residence/interior.webp`). Prefer `.webp`, 16:9 or 4:5 depending on
slot, minimum 1600px on the long edge.

## Missing-media handling

Every image consumer in this codebase either:

1. receives a required `src` from a static content module (current state — always
   resolvable, never missing), or
2. will need an explicit fallback once slots start pointing at not-yet-generated
   files (see `s9b-missing-media` pattern already used in
   `preview-project-case-study.tsx` chapter 07: an honest "asset pending" panel,
   not a broken `<img>` or a fabricated placeholder photo).

When wiring a new slot from the directory contract above, follow that same pattern:
check the file exists (or gate behind a content flag) and render the elegant
missing-state instead of a broken image if it doesn't.

## Art direction (for anyone generating new assets)

Match the existing seven: premium architectural editorial photography — physically
plausible structure, real material joints (concrete / timber / stone / glass /
steel / warm plaster), natural landscaping, credible daylight, human scale, 35–50mm
framing, restrained saturation, subtle filmic contrast.

Avoid: implausible cantilevers, warped/melted geometry, duplicated trees, fake
text/signage, luxury-mansion cliché, orange/teal grading, extreme HDR, watermarks.

If a generated image doesn't clear this bar, don't use it to fill space — fall back
to the existing `ArchitecturalField` SVG system, a material-tone background, or
typography. A bad image reads worse than an honest absence.
