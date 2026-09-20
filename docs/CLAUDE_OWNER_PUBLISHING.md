# OWNER PUBLISHING (CR1 §25–31, §76–79)

One rule everywhere: **visitors see the last published snapshot; the owner
edits a private draft; publish is atomic; every publish is a revision that
can be restored.**

## Pages (`website_pages`)

| State | Meaning |
| --- | --- |
| **Draft** | never published (custom pages), or unpublished. Not routable. |
| **Published** | `published_revision_id` points at the frozen snapshot visitors read. |
| **Published · Draft changes** | rows differ from the snapshot; the public site is unchanged until *Publish changes*. |
| **Archived** | hidden from the register's default view; never deleted. |

Commands (all `security definer` RPCs, permission `website.publish`, AAL2):

- `publish_website_page(page, expected_version, summary)` — builds the
  snapshot (`private.website_page_snapshot`), checks every referenced image is
  public-eligible (`private.website_media_is_current`) and that a custom page
  has a search description, inserts `website_page_revisions` (kind
  `published`, next `revision_no`, `media_ids`), flips the page in the same
  transaction, audits `page.publish`, and revalidates the route.
- `unpublish_website_page` — refused for system / global pages and while
  the navigation or another page links to it (`dependency_blocked` with the
  list); otherwise status → draft. Route returns 404 immediately.
- `restore_website_page_revision(page, expected_version, revision)` — copies
  the chosen snapshot's sections back into the draft rows (non-destructive:
  the current draft is first captured as a `restore_point` revision), never
  publishes by itself. Restore → Preview → Publish is the rollback path.
- `archive_website_page` — custom pages only, after unpublish.

Preview: `/preview/website/[pageId]` (staff, `website.read`, metadata
`robots: noindex, nofollow, nocache`) renders the **draft** — or a specific revision with
`?revision=` — through the same components as the public route, with a
preview bar (Draft / Published toggle and the **Edit page** shortcut).

Optimistic concurrency: every page and section carries a `version`; a stale
save returns `version_conflict` (*Someone else saved first*) and nothing is
overwritten. Two sessions editing the same section are covered by
`tests/e2e/cr1-owner-cms.spec.ts` (*Two sessions*).

## Services, projects, insights (`content_publications`)

Published entities stay editable (S5A/S5C editors no longer lock on
publish). Reads and writes:

- The first **Publish** (S4 `publish_record`) triggers
  `private.capture_on_publish_trigger`, which freezes a snapshot row in
  `content_publications` (`revision_no` 1) and marks it current.
- Later edits change the draft rows only; `published_services`,
  `published_projects`, `published_posts`, `published_project_media` are
  views over the **current snapshot**, so the public site is unchanged.
- **Publish changes** = `republish_content(kind, id, expected_version,
  summary)`: re-runs the S4 publication gates (`private.publication_failures`,
  evidence / claims / media rights), captures revision *n+1*, makes it
  current, audits `content.publish` with the new revision number. Draft and snapshot are equal again
  (*Up to date*).
- **Unpublish / Archive** — S4 commands unchanged; the snapshot stays for
  history but `is_public_content` fails, so the entity disappears from every
  public surface (index, mega menu, home showcase, related lists, sitemap).
- **Restore** = `restore_content_revision(kind, id, expected_version,
  revision)`: copies a revision's fields back into the draft (title,
  summary, body, SEO, owner detail fields, placement flags). Media
  relations are not restored (known limitation; the Media tab remains the
  source of truth). Then *Publish changes*.
- `admin_list_content_revisions` / `admin_get_content_revision` feed the
  **Revision history** panel with Preview and Restore per revision.

Live failures still withdraw content: if an evidence record, claim or
media right is revoked, `private.content_live_failures` makes
`is_public_content` false at read time — publication never freezes a
compliance state (S4 invariant kept).

## Public configuration (C7)

Navigation, footer visibility, business/contact facts and SEO globals go
live through **Settings → Website → Publish public configuration**
(`publish_public_configuration`), one coherent snapshot. Custom pages can
join the navigation only when published (`update_navigation_settings`
refuses otherwise); renaming a page's address rewrites its navigation key
and leaves a redirect.

## Redirects (§45, §80)

Changing a page, service, project or insight slug inserts a
`website_route_aliases` row (old → new, `entity_type` page / service /
project / post) via `private.record_slug_alias_trigger`. Public routes
resolve aliases with a permanent redirect (`permanentRedirect`, 308); an alias can never point at itself or at a reserved route, and
a new page cannot claim an address that is currently an alias.

## What the owner sees

| Surface | Wording |
| --- | --- |
| Section save | *Section saved. Changes stay private until you publish.* |
| Publish | *Published as revision N. Visitors see it now.* |
| Republish (entity) | *Changes published as revision N. Visitors see them now.* |
| Restore | *Revision N restored as the new draft. Preview it, then publish.* |
| Conflict | *Someone else saved first. Reload to see their version; nothing was overwritten.* |
| Blocked unpublish | *This page is linked from the navigation or another page. Remove those links first…* |
