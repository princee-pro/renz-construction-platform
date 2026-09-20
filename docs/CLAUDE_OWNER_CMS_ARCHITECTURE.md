# OWNER CMS ARCHITECTURE (CR1 / D1.5A)

The RENZ owner runs the public website from Admin. A developer is needed
only for new section *types*, new system modules, design-system changes and
security work. Everything the visitor reads — pages, sections, services,
projects, insights, media, navigation, footer, globals, SEO — is structured
data with a draft → preview → publish → rollback lifecycle.

## Principles

- **One controlled renderer.** Every public route renders a *published page
  snapshot* through `WebsitePage` (`src/components/site/sections/render-page.tsx`)
  and a **static** renderer map (`renderers`). A section type not in the map
  renders nothing; there is no dynamic component lookup, no raw HTML, no
  owner CSS or JS.
- **Structured, not raw.** Owners edit typed fields (text, rich text with a
  small safe grammar, lists, items, calls to action, media references,
  selects). Validation runs twice: in the app (`section-registry.ts` zod
  schemas) and in the database (`private.content_json_is_safe`,
  `private.safe_public_text`, the section-registry trigger).
- **Published snapshots only.** The public site never reads draft rows. A
  publish freezes a JSON snapshot (`website_page_revisions`) and the public
  facades (`public_website_page`, `published_*` views built from
  `content_publications`) serve that snapshot until the next publish.
- **Functional freeze respected.** CRM, Finance, Lead logic, Procurement,
  Contractor finance, Analytics semantics and Auth security are untouched.
  CR1 migrations add pages, sections, revisions, publications, content
  relationships, route aliases and CMS permissions only.
- **Nothing is deleted.** Pages, services, projects and insights are
  unpublished or archived; revisions are kept; slug changes create redirects.

## Domains and where they live

| Domain | Storage | Facade (RPC) | Admin surface |
| --- | --- | --- | --- |
| Pages + sections | `website_pages`, `website_page_sections`, `website_page_revisions`, `website_route_aliases`, `website_section_types` | `admin_*_website_page*`, `create/update/move/duplicate/delete_website_section`, `publish/unpublish/archive_website_page`, `restore_website_page_revision`, `public_website_page(s)`, `public_website_route_alias` | `/admin/website`, `/admin/website/pages/[id]`, `/admin/website/sitemap` |
| Global content (globals, footer) | global pages (`page_type = 'global'`) with global section types | same as pages | `/admin/website/globals`, `/admin/website/footer` |
| Services | S5A tables + CR1 columns (`positioning`, `sub_services`, `use_cases`, `process_steps`, `coordination`, `faqs`, `hero_asset_id`) | `update_admin_service_details`, `republish_content`, `restore_content_revision`, `published_services` | `/admin/content/services/[id]` |
| Projects | S5C tables + CR1 columns (`evidence_class`, `layout_hint`, `home_featured`, `materials`, `tags`) | `update_admin_project_presentation`, `republish_content`, `published_projects`, `published_project_media` | `/admin/content/projects/[id]` (Website placement tab) |
| Insights | `posts` + CR1 columns (`topic`, `related_service_id`, `featured`, `pinned`, `sort_priority`, `hero_asset_id`) | `admin_list_posts`, `create_admin_post_draft`, `update_admin_post_draft`, `mark_post_reviewed`, `published_posts` | `/admin/content/insights/[id]` |
| Media | `media_assets` + CR1 metadata (`alt_text`, `caption`, `focal_x`, `focal_y`, `provenance_class`) | `admin_list_media`, `admin_get_media`, `admin_update_media_metadata`, `admin_confirm_media_rights`, `archive_media_asset`, `admin_replace_website_media`, `public_website_media` | `/admin/website/media`, `/admin/website/media/[id]` |
| Navigation | C7 `navigation_settings` (+ `page:<slug>` keys) | `update_navigation_settings`, `publish_public_configuration` | `/admin/settings/website?section=navigation` |
| Content revisions | `content_publications` (services / projects / posts snapshots) | `admin_list_content_revisions`, `admin_get_content_revision`, `restore_content_revision`, `republish_content` | revision panels in each editor |

## Runtime flow

```
owner edits draft ──► preview (real components, staff-only, noindex)
        │
        ▼ publish (atomic, one transaction)
website_page_revisions.snapshot  ──► public_website_page(path)
content_publications.snapshot    ──► published_services / projects / posts
        │
        ▼ Next.js
loadPublishedPage(path) ─► buildPublicPageContext ─► tokens ─► WebsitePage
```

- `src/features/website/render.ts` — `loadPublishedPage`, `loadDraftPage`,
  `loadRevisionPage`, `websitePageMetadata`.
- `src/features/website/public-context.ts` — one context per request:
  identity (C7), published services / projects / posts / media, globals,
  token table.
- `src/features/website/tokens.ts` — `{{services.count_words}}` and friends
  keep copy truthful when content is added.
- `src/app/(public)/[slug]/page.tsx` — custom pages; reserved routes are
  refused in the DB (`private.website_reserved_slugs()`) and mirrored in
  `src/features/website/routes.ts`.

Caching: public loaders use `unstable_cache` with content tags; every
publish / unpublish / restore server action revalidates the affected public
paths and the `/` layout. In local `next dev` the fetch cache persists on
disk (`.next/dev/cache/fetch-cache`) — clear it after seeding outside the
app.

## Permissions (S3 naming)

| Permission | Grants | Default roles |
| --- | --- | --- |
| `website.read` | control center, drafts, previews, revisions | admin, super_admin |
| `website.pages.write` | page settings + section content | admin, super_admin |
| `website.layout.write` | add / move / duplicate / hide / remove sections | admin, super_admin |
| `website.publish` | publish, unpublish, archive, restore | super_admin |
| `website.navigation.write` | header / footer / navigation | super_admin |
| `website.seo.write` | titles, descriptions, OG image, noindex | admin, super_admin |
| `content.*`, `media.*`, `claims.verify` | existing S4/S5 domain rights | unchanged |

Edit and publish are separate rights: an editor prepares, the owner
publishes. Every command needs AAL2 and an active account
(`private.has_permission`). Anonymous access is only through the public
facades; every CMS table is default-deny RLS (`supabase/tests/database/018_cr1_owner_cms.sql`).

## Audit

Page and section commands write `audit_logs` rows (`page.create`,
`page.update`, `page.publish`, `page.unpublish`, `page.archive`,
`revision.restore`, `section.create`, `section.update`, `section.reorder`,
`section.remove`, `navigation.update`, `media.*`). Metadata carries ids,
paths and revision numbers — never section bodies.

## Files

- Registry: `src/features/website/section-registry.ts`
- Contracts / loaders: `src/features/website/{contracts,data,media-contract,media-data}.ts`
- Server actions: `src/features/website/{actions,media-actions}.ts`
- Renderers: `src/components/site/sections/*`
- Admin UI: `src/features/website/components/*`, `src/app/admin/(workspace)/website/*`
- Migrations: `supabase/migrations/20260917{100000,110000,120000,130000}_*.sql`
- Seed (local content migration): `scripts/website-seed-content.mjs`
- Tests: `tests/unit/cr1-owner-cms-contracts.test.ts`, `tests/component/public-states.test.tsx`, `tests/e2e/cr1-owner-cms.spec.ts`, `supabase/tests/database/018_cr1_owner_cms.sql`

Related: `CLAUDE_OWNER_PAGE_BUILDER.md`, `CLAUDE_OWNER_PUBLISHING.md`,
`CLAUDE_OWNER_MEDIA_WORKFLOW.md`, `CLAUDE_OWNER_AUTO_LAYOUT.md`,
`RENZ_PUBLIC_CONTENT_CONTROL_MATRIX.md`.
