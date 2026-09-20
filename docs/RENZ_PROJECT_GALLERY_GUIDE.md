# RENZ Project Gallery Guide (D1.7)

How the owner adds a project study, builds its gallery and keeps the evidence
rules honest — using the Admin only (Website → Projects). No developer is
needed for a new project; the website places it, builds its page, gallery,
lightbox, related studies and filters automatically.

## The three evidence classes

Every project carries one of these, chosen in **Website placement**. The
website prints the label on every card and page; visitors never have to read
fine print.

| Class in the Admin                    | Label on the website           | Use it when                                                                                                                    |
| ------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Real RENZ project                     | _(no study label)_ Case study  | RENZ did the work and can prove it: reviewed evidence, rights-cleared photographs, a public-safe location. Generated visuals are refused. |
| Rwanda context concept study          | Rwanda context concept study   | A concept designed for a named Rwandan place (Kigali, Musanze …) that is **not** built RENZ work.                               |
| Concept study                         | Concept study                  | A general study of approach with no named place.                                                                               |
| Experience study                      | Experience study               | An illustrative story; always labelled.                                                                                        |

Never write "completed in", "built in" or "RENZ delivered" on a study. Use
"Kigali context study" as the public location, never an address.

## Where images come from

Pick this for each upload ("Where this image comes from"):

- **Generated concept visual (never evidence)** — anything made with an AI tool
  or drawn as a concept diagram. Shown with a "generated concept" label.
- **RENZ record** — RENZ's own photograph or drawing of real work.
- **Client photo (original / edited)** — supplied by the client.

A study may show generated visuals once you press **Confirm as generated
concept visual**. A real project cannot: replace generated images with RENZ
photographs before changing the class (the Admin refuses otherwise).

Do not download a photograph of a real building in Rwanda and add it to a
study. Licensed context photography (landscape, city atmosphere) is for
editorial support only and is not part of this release.

## Gallery roles (5–8 pieces per project)

| Role in the Admin       | What it is                                                    |
| ----------------------- | ------------------------------------------------------------- |
| 01 Hero (main image)    | The one image the cards, strip and page top use               |
| 02 Exterior / context   | The building in its setting                                   |
| 03 Secondary exterior   | Another outside view                                          |
| 04 Interior / space     | Inside, or a courtyard                                        |
| 05 Detail / material    | A close view, or the material study                           |
| 06 Construction / process | Construction stage or the construction sequence study       |
| 07 Drawing / diagram    | Site diagram, plan study, section study                       |
| 08 Dusk / night         | Optional evening view                                         |
| Video                   | Optional short loop (poster first, never autoplay with sound) |

The public page reads the roles: the sticky plane beside the story shows the
context image while you read "The site", the interior for "Design", a drawing
for "Structure", the sequence for "Construction plan" and the detail for
"Materials". The full gallery, with the lightbox, comes after the story.

Plain captions only: "Main courtyard", "Street-facing elevation", "Shaded
walkway", "Material study", "Site access study", "Construction sequence
study".

## Adding Project #13 (tested in D1.7 through the Admin only)

1. Website → Projects → **New case study**: working title and slug → **Create draft**.
2. **Overview**: public summary, project type (one of the categories below), public
   location ("Huye context study"), SEO title and description → **Save draft**.
3. **Website placement**: choose the evidence class (and "Feature on Home" if
   wanted) → **Save placement**. Do this before uploading generated visuals.
4. **Story**: add chapters in order — the brief, the site, the challenge, our
   approach, design, structure, construction plan, materials and details, final idea.
5. **Services**: tick the related services → **Save related services**.
6. **Media**: **Add an image** for the hero and each gallery piece (role,
   caption, alt text), then **Confirm** each one. Use Move up / Move down to
   order them. The hero is whichever image has the role "01 Hero".
7. **Overview** → **Mark factually reviewed**; **Publication** → **Publish**.

The project then appears on the Projects index (count updates automatically),
in the film strip if featured, on its own route with gallery and lightbox,
under its related services and in "Related studies" of similar projects.

## Categories (filters)

Residential · Hospitality · Workplace · Industrial · Community · Education ·
Mixed Use · Commercial. Filters on the Projects page are built from the
categories in use; do not invent near-duplicates ("Housing" next to
"Residential").

## Archive and unpublish

**Unpublish** takes a project off the website but keeps everything.
**Archive** does the same and closes the record (D1.7 test: the public route
answers 404, the index count drops, the Admin record still opens, media
relationships stay intact).

## Promotion path (future case studies)

Concept study → evidence supplied → owner review → change the class to Real
RENZ project → replace generated media with RENZ photographs → publish.
Nothing is promoted automatically.

## Performance rules the site applies for you

Thumbnails (960 px) for cards, strips and gallery grids; the full image only
in the lightbox; lazy loading below the fold; one priority image per page.
Keep uploads under 20 MB; 2400 px wide is enough.
