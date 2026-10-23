# RENZ website CMS guide

**Checked against the source on 23 October 2026.** The Owner CMS lets authorized staff edit structured website content without changing source code. It does not make the site live or approve a claim merely because a field accepts it. Use only approved business facts and media with documented rights. The official slogan is **Brick by Brick.**

Start at **Website** (`/admin/website`) after sign-in and MFA. The control center links to Pages, Services, Projects, Insights, Media, Globals, Footer and the sitemap. Website pages are separate from private clients, operational projects, invoices and procurement. See [Admin guide](ADMIN_USER_GUIDE.md) for those workflows.

## The publishing rule

Visitors see the last **published snapshot**. You edit a private draft, save it, preview it, then an authorized publisher chooses **Publish changes**. Saving a field alone does not replace the published page. A published item can therefore show **Draft changes** while the old approved version remains visible.

Website pages, services/projects/articles and business/navigation configuration have separate publication controls. Publishing a page does not automatically publish the service it refers to or a changed phone number in Business settings. Review all affected domains when making a coordinated change.

Current role limits matter:

- **Owner / Super Admin** can edit/publish pages and editorial content, verify evidence/rights and manage business settings.
- **Admin** can prepare pages, services/projects/articles and media, and manage/publish C7 business/website configuration. It cannot publish pages/editorial records or verify their claims under its default template.
- **Content Editor** can edit and publish pages/editorial records and manage media. This is a publishing role in the current C10 model. It does not receive business-setting write or C7 public-configuration publication rights.
- **Project Manager** and **View Only** can read permitted website drafts; **Finance** has no general CMS authoring capability.

The C7 Navigation form still gates its controls on `settings.website.write`, although the underlying navigation RPC also accepts `website.navigation.write`. A default Content Editor can publish content/pages but cannot complete that navigation/configuration form through the current UI. Ask the Owner/Admin to apply and publish the configuration; do not grant owner access merely to work around it. Older Owner CMS docs describe the earlier role matrix and must be read with this correction.

## Where to change each part

| Change                                                            | Admin location                                             | How it goes public                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Official business slogan, public name/description, contact values | Settings → Business                                        | Save draft, then Publish public configuration                     |
| Home hero headline, introduction, images and buttons              | Website → Pages → Home → Hero                              | Save section, preview, Publish changes                            |
| Page heading, description, SEO, share image                       | Website → Pages → the page → section / Page settings & SEO | Publish page changes                                              |
| Service names/scope/sub-services/FAQ/order                        | Website → Services                                         | Review/evidence, then first Publish or Publish changes            |
| Public project/study story, category, gallery and placement       | Website → Projects                                         | Review/evidence/media, then Publish or Publish changes            |
| Article title/body/topic/placement                                | Website → Insights                                         | Save/review, then Publish or Publish changes                      |
| Common CTA/WhatsApp wording, process steps and menu wording       | Website → Globals                                          | Save, preview and publish global page                             |
| Footer headings, statement, groups and visibility                 | Website → Footer                                           | Save, preview and publish footer page                             |
| Header labels/order/visibility/custom-page links, global site SEO | Settings → Website                                         | Save and Publish public configuration                             |
| Privacy, Terms, Cookies                                           | Settings → Legal                                           | Separate legal revision publication with legal-publish permission |

Some text describes a page rather than the company identity. Changing `business_profile.tagline` does not automatically rewrite every page headline or global menu line. Follow the next section for slogan consistency.

## Change the official slogan

1. With business-write permission, open **Settings → Business** and edit **Tagline**. The approved current value is `Brick by Brick.`; change an official identity statement only with the owner's authority.
2. Save the business draft and choose **Publish public configuration**. This updates consumers of the published business tagline, including the footer's identity treatment where rendered.
3. If the intended change also affects the visual headline, edit **Pages → Home → Hero** headline lines, preview and publish Home. The current Home headline is independently stored, not an automatic mirror of Tagline.
4. Review **Globals** (including menu wording), **Footer** headline/statement and Home/page SEO. Change and publish the affected global/footer/page drafts separately. Check for consistent punctuation and deliberate line breaks.
5. Inspect desktop/mobile navigation, Home, Footer and metadata on the public side of the same environment. Do not replace the approved orange R logo to change wording: the logo is a separate identity asset governed by [RENZ_ORANGE_BRAND.md](RENZ_ORANGE_BRAND.md).

“From land to landmark” appears in historical creative documents. Do not treat those dated references as the current official slogan.

## Edit a page or hero

Open **Website → Pages** (`/admin/website/pages`) and select the page. The editor has Sections, Edit and Publish areas; small screens use tabs. Choose a section, change its plain fields, save, then **Preview draft**. Section headings/introductory text are different from the page's **Page settings & SEO** title/search description.

For Home's hero, use the Hero section's available headline lines, supporting wording, CTA and media fields. Use the media picker to select a prepared library item, or upload through the supported picker flow. Choose the available hero concept/layout/height options deliberately; they are design presets. Do not paste code or image URLs into plain text to force a new layout.

Rich text accepts a restricted grammar: paragraphs, supported headings, emphasis, lists, quotes and safe links. Raw HTML, JavaScript, CSS, embeds and executable links are refused or rendered as plain text. Use CTA controls for internal pages, Contact, Start a Project, service/material enquiries, WhatsApp, email or HTTPS external destinations. Test the destination in preview.

## Add, remove, duplicate or reorder sections

Use **Add a section** and choose from the curated types, such as text/media, rich text, feature grid, gallery, process, FAQ, service/project showcase, insight feed, CTA or divider. Complete its fields and choose a permitted appearance: variant, tone, Compact/Standard/Generous spacing and Standard/Quiet/None motion.

**Move up / Move down** changes order with keyboard-accessible controls. **Duplicate** makes a starting copy; edit repeated content before publication. **Hide** omits an optional section from rendering. **Remove** removes the draft section after confirmation; published/revision snapshots retain earlier content for recovery. Save, preview and publish the whole page when the composition is ready.

Locked system modules, such as forms and domain indexes, cannot be arbitrarily removed/hidden. Empty optional fields collapse their element; supported empty sections may disappear. Adding a brand-new section _type_, arbitrary typography, breakpoints, colours or functionality needs a developer and design/security review. The CMS does not offer unrestricted canvas coordinates or custom CSS/JS.

For a new standalone page choose **New page**, enter a unique allowed slug/title, add sections, set SEO and preview/publish. Reserved system paths are refused. A custom page needs a search description to publish. Once published, an authorized configuration editor can add it to navigation and publish that configuration. A slug change creates a redirect; check inbound links after the change.

## Media library, replacements and video

Open **Website → Media** (`/admin/website/media`). Upload only material you are authorized to use and classify its real source: RENZ-provided, licensed or generated concept. Add helpful alt text for meaningful images, caption if needed and a focal point to guide cropping. Inspect where an asset is used before replacing or archiving it.

The current ingestion accepts JPEG, PNG, WebP, AVIF and short MP4/WebM loops. Images are limited to **20 MiB**, video to **12 MiB**; images around 2400 px are sufficient for the generated full derivative, with 960 px thumbnails generated for grids. Video is stored as supplied, not transcoded; prepare a suitable poster and test playback/reduced-motion/poor-network behavior. SVG/PDF/CAD/archive uploads are not this editorial-media workflow. Lead attachments use a separate restricted intake system.

Upload is only registration. **Confirm rights/public use** separately with the correct provenance and consent/reviewer information. A pending or expired right can prevent publication. Generated visuals are never real-project evidence; the application preserves their classification. Do not click a confirmation simply to clear an error if rights are unknown.

To change a page image, choose the new cleared asset in that section, save, preview and publish. The media detail also supports replacing uses in drafts; inspect all affected pages before publishing them. A replacement/metadata edit does not automatically republish every saved page/entity snapshot. Avoid archiving a currently used asset as a shortcut for replacement: live eligibility checks can withdraw it. Removing a gallery usage removes its relationship, not the underlying asset or its source original.

Uploaded originals/derivatives live in private Supabase Storage. They are not automatically files in GitHub. Follow the [asset register](ASSET_AND_LICENSE_REGISTER.md) and [backup/restore runbook](RENZ_BACKUP_RESTORE.md) so the next environment receives the actual objects as well as the database metadata.

## Add or edit a service

Open **Website → Services → New service**, create a draft and complete the fields for public name/slug, summary, scope, client inputs, deliverables, exclusions, delivery wording and relevant structured details (positioning, sub-services, use cases, process, coordination, FAQ, visual/SEO). Never add a qualification, regulated service or unsupported delivery promise merely because a field exists.

Complete the evidence/factual review and media requirements shown by the editor. Preview the service, then an authorized publisher chooses **Publish**. Existing published services remain live while draft edits are made; **Publish changes** selects the next snapshot. Display order and related projects come from the managed domains.

The public Services index, service detail, Home showcase, menu and footer use the published service register. Adding an approved service does not require a source edit. **The fixed intake “need” choices are a current exception:** adding a service does not add a new form vocabulary option. A developer must extend the validated intake mapping when needed; do not relabel a different choice as a workaround.

## Add a project, category and gallery

This is a **public project/study**, separate from Operations → Projects. Follow the more detailed [project gallery guide](RENZ_PROJECT_GALLERY_GUIDE.md) with the source clarifications here.

1. Choose **Website → Projects → New case study** and enter a working title/slug; create the draft.
2. In **Overview**, write the public summary, known public-safe location, type/category, scope/RENZ role and SEO. Use only supported claims. The type/category drives Projects-page filters; keep names consistent rather than making near-duplicates.
3. In **Website placement**, choose the honest evidence class before uploading concepts: **Real RENZ project**, **Concept study**, **Rwanda context concept study** or **Experience study**. Select **Feature on Home**, order, materials/tags and optional layout hint if useful; Auto is suitable for normal placement.
4. In **Story**, add/reorder the editorial chapters and write the narrative. A construction-sequence study is not a report of completed work. Editorial story chapters do not change an operational project's stage.
5. In **Services**, choose the relevant published services and save the relationships.
6. In **Media**, upload/attach the hero and gallery pieces, selecting their source, role, alt/caption and order. Suitable roles include hero, exterior/context, secondary exterior, interior, detail/material, process/construction, drawing and dusk. Confirm rights or generated-concept use appropriately. **Move up/down** controls gallery order.
7. Review **Evidence**, mark the factual content reviewed where authorized, inspect **Publication** readiness and the private preview. Resolve any genuine rights/evidence problems.
8. Choose **Publish**, or **Publish changes** for an existing item. Open the public Projects index and detail route on the same environment to confirm the title/category/hero/story/gallery/lightbox and related services.

For a **real_project**, documentary evidence and rights-cleared real media are required; generated visuals cannot satisfy them. For concept/context/experience studies the visible study badge is derived from evidence class and cannot be edited away in wording. Never describe a study as a completed RENZ commission or use a borrowed real-building photograph as its own proof. Changing a study to a real project is a deliberate review involving actual evidence and replacing generated media; it is not an automatic promotion button.

### What happens when a new approved project is published

Publication freezes the project's next approved snapshot. The public query includes it in its ordered, bounded published results, and the Projects renderer builds the card, derived type filters, detail page and gallery from those data. Related-service lists and eligible Home placement update without code changes. Home's selection rules still apply: **Feature on Home** and the available layout/selection determine prominence. This does not promise unlimited records on one page; current public queries are bounded (the main project list reads up to 36 records), so a growing portfolio eventually needs a deliberate pagination/selection review.

Unpublish withdraws the project from public queries while preserving its record/history. Archive closes it further without deleting media relationships. A no-longer-published detail resolves as unavailable/404. Check dependent page/navigation links when withdrawing any content.

## Articles and insights

Open **Website → Insights → New article**, create the draft, enter title/slug, excerpt and supported body content, choose topic/related service, and set search metadata. Featured/Pinned/Sort priority guide selection; newest published content is a fallback. Review wording and rights, mark reviewed, preview and publish. Later edits remain private until **Publish changes**. Do not place legal/professional advice or invented project facts into an article without the appropriate approval.

**Current image limitation:** the article editor can save a hero selection (`posts.hero_asset_id`), but the public article renderer does not yet consume that selection. Its `InsightArticleView` has no hero field; both the public article and its staff preview use fixed generated concept imagery selected by article wording. The Insights index's featured/supporting images also use the fixed `InsightMedia` set. Saving or publishing a different article hero therefore does **not** replace those displayed images. Treat the selection as stored metadata until a developer connects the public rendering path, then verify both preview and publication.

**Current film limitation:** the Insights index inserts the “Ideas become structure.” film block, its supporting copy and its poster/video directly in the renderer. These are not fields in the Insights index section configuration. The owner cannot independently edit or hide that insert through the CMS; changing it requires a developer. It appears when the index has published articles and keeps its visible generated-concept label.

## Contact information, globals, footer and legal

**Settings → Business** owns the actual public email, WhatsApp, location, hours and social values. Save/verify the values and **Publish public configuration**. Publishing an address/map is a factual disclosure; leave unknown/unapproved fields absent. RENZ's WhatsApp treatment is messaging-oriented; enabling phone calling is a separate explicit control, not an assumption from a number's presence.

**Website → Globals** owns shared WhatsApp wording, menu tagline, insight note, common link labels, staff sign-in wording and process steps. The public company description remains in Business settings. Reorder repeatable steps with the accessible controls. Tokens such as service names/counts and contact values resolve from the current published context; use supported tokens rather than hardcoding counts that become stale.

**Website → Footer** opens the global footer page editor for headline/statement/link groups and visibility options. Contact/social values still come from Business. Save, preview and publish the footer draft. Header/navigation labels/order/visibility and a published custom-page link belong in **Settings → Website**, followed by public-configuration publication. Functional destinations stay protected.

Legal pages remain **Settings → Legal** revisions. Page-builder rights do not give legal-publish rights. Preview/noindex safeguards and the environment's site/indexing mode also remain separate from setting a page SEO checkbox; publishing content does not authorize search indexing or a production launch.

## Preview, publication failures, conflicts and recovery

**Preview draft** uses the real public components in a protected, noindex staff preview. A revision can also be previewed from Revision history. It is not a shareable anonymous approval link. Check text, links, mobile wrapping, alt/captions, image crops, contrast and whether study labels remain visible. Do not rely solely on the thumbnail in the editor.

Read **Content health** and publication reasons. Missing SEO/OG/CTA/navigation may be advice; unsafe media and a custom page without a search description can block publication. Unpublishing a page can be refused when navigation or another page still links to it. Resolve dependencies through the proper editor and republish. System/global pages cannot be withdrawn/archived like custom pages.

If **Someone else saved first / version conflict** appears, your stale write was refused. Your typed values are preserved; copy what you need, reload the latest version, compare and save deliberately. Do not refresh blindly while carrying an unsaved edit. Check save/publish success and the actual public page after a network interruption before retrying.

For a mistaken page edit, open **Revision history**, preview the desired revision and **Restore as draft**. The current draft is captured as a restore point. Inspect the restored draft, then publish it; restoration alone is not a live rollback. Services/projects/articles have the same restore-then-publish principle, with an important limit: **content revision restore does not restore media relationships**. Review the Media tab and related usages manually. Restoring wording cannot recreate a missing Storage object or reinstate an expired/revoked right.

If a permission unexpectedly blocks a legitimate action, ask the owner to inspect the person's actual capabilities. For a reproducible failure give the authorized developer the environment, route, record reference, non-sensitive error and steps. Keep credentials, client data and share links out of public reports. The [current status](CURRENT_STATUS_AND_OPEN_ITEMS.md) and [testing guide](TESTING_AND_QA_GUIDE.md) separate implemented features from remaining staging/production validation.

## Developer boundaries and detailed contracts

The current CMS supplies curated types, structured text, media, entity relationships, draft preview, snapshots, revisions, redirects and bounded presentation options. It does not provide unrestricted forms, new modules, arbitrary code, a general permission builder, automatic translation, automatic legal/factual approval, bulk project imports, automatic payment processing or guaranteed delivery of email/WhatsApp. New form choices, section types, domain functions and design/security changes need a developer.

For implementation detail preserve [Owner architecture](CLAUDE_OWNER_CMS_ARCHITECTURE.md), [page builder](CLAUDE_OWNER_PAGE_BUILDER.md), [publishing](CLAUDE_OWNER_PUBLISHING.md), [media](CLAUDE_OWNER_MEDIA_WORKFLOW.md), [auto-layout](CLAUDE_OWNER_AUTO_LAYOUT.md) and the [public content control matrix](RENZ_PUBLIC_CONTENT_CONTROL_MATRIX.md). They contain useful historical acceptance evidence; current role, cache and media behavior is clarified in this guide and the [architecture overview](ARCHITECTURE_OVERVIEW.md). This documentation source review does not claim a fresh browser run of those earlier acceptance tests.
