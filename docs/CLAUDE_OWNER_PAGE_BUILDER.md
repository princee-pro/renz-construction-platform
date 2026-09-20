# OWNER PAGE BUILDER (CR1 §9–24, §100–108)

Where: **Admin → Website → Pages** (`/admin/website/pages`). Every public
route is a page made of ordered, typed sections. The owner edits sections
with plain fields; the design system decides how they look.

## Page types

| Type | Examples | Address | Sections |
| --- | --- | --- | --- |
| **System page** | Home, Services, Projects, Insights, Contact, Start a Project (+ success), Service enquiry, Material enquiry | fixed | wording editable; the functional module (form, wizard, index, navigator) is a **locked system module** that cannot be hidden or removed |
| **Content page** | About | fixed | fully editable sections |
| **Custom page** | anything the owner creates (e.g. `/synthetic-approach`) | owner-chosen slug, reserved routes refused | fully editable, publish / unpublish / archive |
| **Global** | Globals (`/_globals`), Footer (`/_footer`) | none (no public route) | global section types only |

Reserved routes (refused by the database and mirrored in
`src/features/website/routes.ts`): `admin`, `api`, `services`, `projects`,
`insights`, `about`, `contact`, `start-a-project`, `enquire`, `privacy`,
`terms`, `cookies`, `i`, `po`, `brand-study`, `expertise`, `media`,
`preview`, `assets`, `static`, `sitemap`, `robots`, `sign-in`, `search`,
`invoice(s)`, `order(s)`, `lead(s)`, `client(s)`, `staff`, `settings`,
`analytics`, `notifications`, `home`, `index`, `page(s)`, `website`,
`globals`, `footer`, … Slugs are lowercase letters, digits and hyphens,
2–80 characters, never starting with `_`, never containing `.`.

## Editor layout (§101–102)

Three panes; on screens under 1024px they become **Sections / Edit /
Publish** tabs (verified at 390px).

- **Left — Sections.** Top-to-bottom order, `01`, `02`, … as visitors see
  them. **Move up / Move down** buttons (never drag-only), **Duplicate**,
  **Remove** (confirmation; the section stays in revision history), **Add a
  section** (curated list; system modules never appear), **Page settings &
  SEO**.
- **Centre — Edit.** The selected section's fields, then **Appearance**:
  section label (Admin only), layout variant, background tone, spacing,
  motion. Save status badge: *Unsaved changes → Saving… → Saved*. Leaving a
  dirty editor asks first (§104).
- **Right — Publish.** Status (Draft / Published / Draft changes), Preview
  draft, View published, *What changed* note, **Publish changes**, Content
  health, Revision history with **Preview** and **Restore as draft**.

Unsaved section edits are never lost by another panel's command; a stale
save is refused with *Someone else saved first* and the owner's text is
kept.

## Section types (static registry)

Content sections the owner may add to any page:
`hero`, `masthead`, `editorial_intro`, `rich_text`, `text_media`,
`full_media`, `feature_grid` (columns / numbered / principles),
`service_showcase`, `project_showcase`, `process`, `material_detail`,
`gallery`, `faq`, `insight_feed`, `cta`, `contact_strip`, `whatsapp_cta`,
`quote`, `testimonial`, `marquee`, `divider`.

System modules (provisioned with their page, locked, wording editable):
`services_navigator`, `projects_index`, `insights_index`,
`contact_channels`, `contact_form`, `start_project_wizard`,
`intake_success`, `service_enquiry_form`, `material_enquiry_form`,
`team_credentials`.

Global sections (global pages only): `global_copy`, `process_steps`,
`footer_options`, `footer_groups`.

Each type declares its fields in `src/features/website/section-registry.ts`
(`FieldSpec` DSL → zod schema → defaults → editor form → renderer). Adding a
type is a developer task: registry entry + renderer in
`src/components/site/sections/*` + DB row in `website_section_types`.

## Appearance without CSS (§18–19)

- **Variants** per type (e.g. hero: Signature / Editorial / Monument;
  feature grid: columns / numbered / principles; text + media: media left /
  right).
- **Tones**: Paper, Limestone, Ink, Concrete, Charcoal, Material, Survey,
  Plan, Structure, Datum, Quiet field — design tokens, never colours.
- **Spacing**: Compact / Standard / Generous. **Motion**: Standard / Quiet /
  None (also honours `prefers-reduced-motion`).
- Empty optional fields hide their element; an empty section hides itself
  (§84). Grid, typography and breakpoints are system-protected.

## Fields (§23–24)

- **Text / textarea** — plain text; `<` `>` and executable links are refused
  in the app and in the database.
- **Rich text** — headings (`##`, `###`), paragraphs, `**bold**`,
  `*italic*`, `[label](https://…)`, `- lists`, `> quotes`. Links render only
  for `http(s)`, `mailto`, `wa.me` and public internal paths; anything else
  degrades to plain text. No scripts, styles, iframes, raw HTML.
- **Lines / items** — repeatable rows with Move up / Move down / Remove.
- **Call to action** — label + destination type: page on this website,
  Start a Project, Service enquiry, Material enquiry, Contact, WhatsApp
  (messages only), Email, External (https only).
- **Media** — picks from the Media library; only public-eligible images
  publish (see `CLAUDE_OWNER_MEDIA_WORKFLOW.md`).
- **Tokens** — `{{services.count_words}}`, `{{services.names}}`,
  `{{projects.count}}`, `{{business.region}}`, `{{contact.email}}`, … keep
  wording truthful as content changes (§47).

## Content health (§66)

Shown in the Publish pane and on the control center
(`private.website_page_health`): `seo_title_missing`,
`seo_description_missing`, `og_image_missing`, `no_sections`,
`no_title_section`, `no_cta`, `alt_missing`, `media_not_ready`,
`not_in_navigation`. Health never blocks editing; only publish-blocking
items (unready media, a custom page without a search description) stop a
publish. Unpublishing a page that the navigation or another page links to
is refused with the dependency list (§78–79).

## Quick Find (§105)

`Ctrl/⌘ K` finds PAGE / SERVICE / PROJECT / INSIGHT records (plus the
operational kinds) and opens the right editor.

## In-product help (§115–116)

Every editor carries a short *how it works* line, field help under inputs,
and the "Changes stay private until you publish" reminder; the control
center (`/admin/website`) opens with counts, **Quick actions** (Edit Home,
Add Project, Add Service, Write Insight, Upload Media, Preview Website), a **Needs attention** list and the public page cards.
