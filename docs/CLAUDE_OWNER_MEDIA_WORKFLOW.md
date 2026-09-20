# OWNER MEDIA WORKFLOW (CR1 §32–36, §82)

Where: **Admin → Website → Media** (`/admin/website/media`), plus the media
picker inside every section and entity editor. One library, one delivery
path, the S4 rights gates unchanged.

## Upload

`POST /api/admin/media` (permission `media.upload`) accepts JPEG, PNG, WebP
and AVIF up to 20 MB, sniffs the real MIME, stores the original in
`editorial-originals` and a ≤ 2400px derivative in `editorial-derivatives`,
registers both through `register_media_asset` + `finalize_media_upload`
(`src/lib/media/upload-image.ts`, shared with the project media route).
The owner chooses a **classification** at upload:

| Classification | Provenance (original → derivative) | May illustrate |
| --- | --- | --- |
| RENZ provided (own photograph or drawing) | `client_original` → `client_derivative` | anything, including real projects |
| Licensed (RENZ holds a licence) | `production_asset` → `production_asset` | pages, services, insights, concept/experience studies |
| Generated concept visual | `generated_reference` → `generated_reference` | pages and studies only — **never a real project**, always labelled |
| Other / review required | derived label (`private.media_classification`) for assets whose provenance or rights are not yet settled | nothing until rights are confirmed with a classification |

## Metadata (§33)

`admin_update_media_metadata` — **alt text** (required unless decorative),
**caption**, **credit**, **focal point** (`focal_x`, `focal_y` 0–1, set by
clicking the preview). Renderers apply the focal point as
`object-position`; the layout owns the ratio, so one image serves hero,
card and gallery crops without re-uploading (§82). Every public image
renders through `WebsiteImage` with `sizes` and lazy loading.

## Rights (§34, S4)

An image can be published only when `private.website_media_is_current`
holds: derivative bucket, finalized state, `rights_status = cleared`,
`public_use_permission = granted`, reviewer + verification date, review not
overdue, consent granted when required, not `synthetic_test`.
**Confirm rights** (`admin_confirm_media_rights`, permission `media.manage`)
records classification, rights holder, source and the reviewer. Draft
previews may show unconfirmed images; **publish is blocked** until every
image on the page is rights-clear (`media_not_ready`), and a right revoked
later withdraws the image at read time.

Real projects additionally refuse `concept_demo` / `generated_reference`
media (S5C `admin_clear_and_promote_project_media`); concept and experience
studies accept them and carry the provenance badge.

## Usage, replace, archive (§35–36)

- **Where used** (`private.media_usage`): pages (draft and published
  revisions), services (hero), projects (project media), posts (hero),
  brand slots. Shown on the media detail page with links to each editor.
- **Replace everywhere** (`admin_replace_website_media`, permission
  `website.pages.write`): swaps every draft page reference to a new asset;
  the public site changes when those pages are published.
- **Archive** (`archive_media_asset`): refused with `media_in_use` and the
  usage list while anything references the asset; archived assets stay in
  storage, are hidden from the picker and never deleted.

## Delivery

`/api/media/website/[mediaAssetId]` → `resolve_website_media_path` decides
eligibility in the database (public when a **published revision** or a
published entity references the asset; staff previews allowed with
`website.read` / `content.read`) and returns a short-lived signed Storage
URL with cache headers. Nothing in a private bucket is ever exposed by
path guessing. Project media keeps its S5C route (`/api/media/project/…`).

## Library views

Filters: All · Ready · Needs rights · Needs alt text · Unused · Archived
(`admin_list_media(search_query, filter, limit_count)`); the control center counts
"need alt text" and "need rights". Provenance classes are shown as owner
words (RENZ PROVIDED / LICENSED / GENERATED CONCEPT / REVIEW REQUIRED).

## Local development

`node scripts/storage.mjs provision` creates the private buckets;
`node scripts/website-seed-content.mjs` uploads the approved preview images
from `public/media/renz-preview` as generated concept references for the
six studies. Clear `.next/dev/cache/fetch-cache` after seeding while
`next dev` runs.
