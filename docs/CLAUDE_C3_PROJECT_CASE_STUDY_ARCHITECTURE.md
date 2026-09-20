# RENZ C3 project case-study architecture

Written during Phase C3 ("Projects + Media Command Center + Public Content Source
Integration"). Describes the real, schema-grounded shape of a public project case
study, the admin layer that authors it, and how it reaches the public site.

## Domain model (already existed from S4; C3 added the admin facade only)

```
projects                 -- scalar/public-safe fields: public_location,
                             public_location_granularity, project_type,
                             project_scope, renz_role, delivery_status,
                             start_year, completion_year, reviewed_by,
                             reviewed_at, hero_asset_id, sort_order, featured
project_localizations     -- per-locale: title, slug, summary, challenge,
                             approach, solution, outcomes, seo_title,
                             seo_description
project_categories(_assignments)
project_services          -- controlled M:N to services (service_id, scope_label)
project_stages             -- reusable as "story chapters" (see below)
project_media              -- role/phase/stage_id/sort_order/public_status
project_media_localizations -- alt_text/caption per locale
project_evidence           -- required/verified factual evidence (S4 kernel)
```

No new tables were added in C3. Every admin operation layers on top of this
existing schema through a new **S5C facade** migration
(`supabase/migrations/20260910120000_establish_s5c_projects_admin.sql`), which
mirrors the S5A Services admin facade function-for-function:
`admin_project_overview`, `admin_list_projects` (keyset-paginated), `admin_get_project`,
`create_admin_project_draft`, `update_admin_project_draft`, `mark_project_factually_reviewed`,
`set_admin_project_services`, `create/update/delete_admin_project_stage`,
`admin_attach/update/reorder/remove_project_media`, `create/submit/review_project_evidence`,
plus two functions added later in the same phase once the media-eligibility gap below
was found: `finalize_media_upload` and `admin_clear_and_promote_project_media`
(see `CLAUDE_C3_PROJECT_MEDIA_WORKFLOW.md`).

All publish/unpublish/archive/readiness logic is the **pre-existing generic S4
kernel** (`publish_content`, `unpublish_content`, `archive_content`,
`check_publication_readiness`, all keyed by `content_type = 'project'`) — C3 added
no new business rules here, only the admin-facing draft-editing layer in front of it.

## The "chapters" tradeoff (documented per the brief's explicit instruction)

The C3 brief asked for a rich, named-chapter narrative model. The real schema does
**not** have a flexible `body_blocks`-style column on `project_localizations` (unlike
`service_localizations`, which does). Two things exist instead:

1. **Four fixed narrative fields** — `challenge`, `approach`, `solution`, `outcomes`,
   plus `project_scope` (labeled "Scope" in the UI). These are what
   `private.project_publication_failures` and the public projections actually
   understand, so they are the **authoritative chapters** rendered by
   `RealProjectCaseStudy` (`src/components/site/real-project-case-study.tsx`) both in
   the admin private preview and on the real public project page.
2. **`project_stages`** — used in the admin Story section as free-form editorial
   chapters (title/description/sort_order) with **per-chapter media**
   (`project_media.stage_id`). These are genuinely useful for internal editorial
   organization and media grouping, but they are **not** part of the public readiness
   contract and are **not** rendered as public narrative chapters — only their
   attached media inherits a role/alt/caption that can appear in the public gallery.

This is a deliberate, bounded reuse of existing schema rather than a new JSON-blob
column invented "because it was easy." The six hand-authored concept studies (C2,
`src/features/client-preview/projects.ts`) have a richer 9–10 chapter editorial
system; that richness is intentionally **not** matched for real Admin-authored
projects in this phase. A future phase could add an actual flexible chapter column to
`project_localizations` if the five-field model proves limiting — that is a schema
change, not a frontend one, and is out of scope here.

## One shared public rendering system (not two)

`RealProjectCaseStudy` is the single component used for:

- `src/app/admin/(workspace)/content/projects/[projectId]/preview/page.tsx` (private
  draft preview, `draftPreview: true`, staff-only, noindex)
- `src/app/(public)/projects/[slug]/page.tsx` (real published project detail)

Both build a `RealProjectView` from their respective data source (admin detail RPC
vs. `published_projects`/`published_project_media`/`published_project_services`) and
hand it to the same component. This satisfies the brief's "avoid two visual systems"
requirement for **real** project data. The **concept studies** (`PreviewProjectIndex`,
`PreviewProjectCaseStudy`) remain their own, deliberately separate premium visual
system — they are demo content, not real case studies, and were never meant to share
a renderer with production data.

## Media delivery without exposing raw Storage paths

`published_project_media` (and the admin detail RPC) never expose `bucket_id` /
`object_path` to a browser. A single dual-mode SECURITY DEFINER function,
`resolve_project_media_path(target_id)`, decides eligibility (public via
`private.is_public_media_usage`, OR an authorized `content.read` staff reader for
draft preview) and returns the path only when appropriate. A thin Route Handler
(`src/app/api/media/project/[projectMediaId]/route.ts`) calls it, mints a 5-minute
signed URL via the Storage API, and 302-redirects. This is the one code path that
serves both the public site and the admin draft preview — see
`CLAUDE_C3_PROJECT_MEDIA_WORKFLOW.md` for the full upload/rights/promotion chain that
makes an asset eligible for it in the first place.

## Public content source (three-state rule)

Applied identically to Services (`src/features/services/service-source.ts`, fully
wired through `/services`, `/services/[slug]`, home, nav mega panel, and footer) and
to Projects:

- **Preview off**: only real published records may ever power a public page. Static/
  concept content never becomes public truth.
- **Preview on, real records exist**: real records render through the real production
  components (`RealProjectCaseStudy` for Projects).
- **Preview on, nothing published yet**: the static/concept content is a clearly
  labeled fallback so the client-preview experience is never empty.

For Services this is centralized in one adapter function
(`getPublicServiceCategories`/`getPublicServiceCategoryBySlug`). For Projects, the
existing C2-era `/projects` and `/projects/[slug]` routes already implemented this
three-state branching inline (`isClientPreviewEnabled()` + `getPreviewProject(slug)`
+ `getPublishedProjectBySlug`) with only two consumers, so C3 did not extract a
separate `project-source.ts` adapter file — the branching stayed in the two route
files, but the **rendering** side was fixed so the "real" branch stopped duplicating
public case-study markup and started using `RealProjectCaseStudy`. This is a
narrower refactor than the Services adapter and is a deliberate scope decision, not
an oversight: revisit if a third public Projects consumer appears.

One deviation from the Services fallback rule, kept intentionally: on `/projects`,
when preview is on, the six concept studies are always shown (clearly badged "Concept
study" / "not RENZ project evidence") **and** any real published projects render in a
separate "Published records" section beneath them, rather than the concept studies
disappearing the moment one real project exists. The brief's wording for Projects
("real published case studies render if present, the six concept studies may fill in
as explicitly labeled studies") is looser than the Services wording ("static
taxonomy is a controlled fallback"), and this reading was chosen because the six
concept studies are a deliberate, labeled design showcase (C2's monument/split/detail
compositions) rather than a content placeholder — unlike the static services list,
which exists purely to avoid an empty page. `/projects/[slug]` still applies the
strict three-state rule: a concept slug renders only while preview is on, a real
published slug always renders via `RealProjectCaseStudy`, and preview off shows only
real published projects (never a concept study), so no concept URL can become an
indexable production case study.

## Concurrency

`update_admin_project_draft` uses the same dual optimistic-version pattern as
Services (`expected_version` for `projects.version`, `expected_localization_version`
for `project_localizations.version`), returning `version_conflict` with the current
version rather than silently overwriting. Verified with two concurrent
`publish_content` calls against the same starting version in
`scripts/verify-publication-local.mjs` (generic kernel, already covered) and with a
direct stale-version `update_admin_project_draft` call in
`supabase/tests/database/010_s5c_projects_admin.sql`.
