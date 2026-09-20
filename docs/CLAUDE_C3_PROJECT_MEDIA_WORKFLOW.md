# RENZ C3 project media workflow

Written during Phase C3. Describes the real upload → rights → promotion → publish
chain for project media, including a gap found and fixed in the pre-existing S4
Storage kernel while building the Media Command Center.

## A pre-existing kernel gap this phase found and fixed

`register_media_asset` (S4, prior phase) leaves a newly registered asset in
`storage_state = 'registered'`. `promote_media_asset` (S4, prior phase) requires
`storage_state in ('ready_private', 'promotion_pending')`. **Nothing in the S4
kernel transitioned an asset from `registered` to `ready_private`** — the only place
that state ever appeared was hand-inserted directly by
`scripts/verify-publication-local.mjs`'s raw SQL fixtures, bypassing
`register_media_asset` entirely. In other words: before this phase, a real upload
through the supported RPC path could never become promotable, and therefore could
never become publication-ready. This was already broken prior to C3; it was not
introduced by the new admin CRUD, but it blocked the C3 Media Command Center from
functioning for real (non-fixture) uploads, so it is fixed here as a forward
migration rather than deferred, per the brief's "genuine schema gaps require a
forward migration" allowance.

The fix: `public.finalize_media_upload(target_id, expected_version)` (S5C migration),
`media.upload`-gated, moves `registered → ready_private` after a successful Storage
upload+registration. The upload Route Handler calls it immediately after
registering each asset.

## Two-asset (original + derivative) model

The brief requires "private originals, derivative model." `promote_media_asset`
itself enforces this at the database level — it only accepts an asset whose
`bucket_id = 'editorial-derivatives'`. So a single-bucket upload could never be
promoted either. `src/app/api/admin/projects/media/route.ts` now does, per upload:

1. Validate magic bytes (JPEG/PNG/WebP/AVIF only — SVG/HTML/XML/script/archive are
   never in the signature table, so they fail closed regardless of declared MIME).
2. Upload the raw bytes unchanged to `editorial-originals/<uuid>/<name>` and register
   them (`register_media_asset`, provenance as selected by the uploader, restricted
   to `client_original | client_derivative | production_asset` — this is the
   real-project upload path, so `concept_demo` / `generated_reference` /
   `synthetic_test` are never offered here).
3. Resize with Sharp (`fit: inside`, max 2400×2400, no upscaling — "no raw 6000px
   uploads to mobile") and upload the result to
   `editorial-derivatives/<uuid>/<name>`, registered with
   `target_source_asset_id` pointing at the original and the same provenance class
   (the derivative inherits the trustworthiness classification of its source; it is
   a system-generated resize, not a client-supplied derivative).
4. Finalize both rows (`registered → ready_private`).
5. Return the **derivative's** id. `project_media.media_asset_id` always points at
   the derivative — the original exists purely for provenance/rights lineage via
   `source_asset_id` and is never directly served.

Rollback: if any later step fails, previously uploaded Storage objects are removed
(`rollback()` in the route). DB rows left in `registered` state on a rare
finalize failure are not rolled back; they are inert (never promotable, never
public) and are caught by the existing `scripts/media-reconcile.mjs` integrity
audit if they accumulate.

## Rights and promotion

`media_assets` rights fields (`rights_status`, `public_use_permission`,
`consent_state`, `rights_holder`, `rights_source`, `credit`, `rights_reviewer_id`,
`rights_verified_at`) are exactly the S4 kernel's existing rights model — C3 did not
add new rights states. The Media Command Center exposes them per project-media card
(`src/features/projects/components/project-media-workspace.tsx`) with a status badge
(`rightsTone`: ready / review / blocked) and, while not yet public-eligible, a
"Clear rights & mark eligible" form.

That form calls one new bounded admin command,
`admin_clear_and_promote_project_media` (`media.manage`-gated), which in a single
transaction: sets rights to `cleared`/`granted` (and `consent_state = 'granted'` only
if the asset requires consent), sets the derivative's `storage_state =
'public_eligible'` (mirroring `promote_media_asset`'s own precondition checks —
concept/generated/synthetic provenance and non-derivative-bucket assets are rejected
with the same reason codes), and sets the `project_media` usage row's
`public_status = 'eligible'` (mirroring `promote_project_media`). This is a UX
convenience over three separate kernel calls (`update_media_rights` →
`promote_media_asset` → `promote_project_media`), not a new business rule — the
underlying eligibility predicate remains `private.public_media_is_current` /
`private.is_public_media_usage`, unchanged.

**Concept, generated, and synthetic media can never be promoted** — enforced at the
database level in both `promote_media_asset` (kernel) and
`admin_clear_and_promote_project_media` (S5C), independently of what the admin UI
shows. This was not weakened to make the C2 concept-image workflow easier; the
C2 concept studies remain entirely outside the real Media Command Center (see
`CLAUDE_C3_PROJECT_CASE_STUDY_ARCHITECTURE.md`).

## Roles, reordering, deletion

- Roles are the existing S4 vocabulary (`hero`, `listing`, `gallery`, `before`,
  `during`, `after`, `detail`, `drawing`, `video`, `video_poster`, `background`,
  `social`) — not all are forced on every project.
- Reordering is keyboard-accessible "Move up" / "Move down" buttons
  (`admin_reorder_project_media`), not a drag-and-drop library — ten-ish images per
  project do not justify installing one.
- `admin_remove_project_media` deletes only the `project_media` **junction row**. The
  underlying `media_assets` row is never hard-deleted by this action — "in-use media
  must not be hard-deleted" applies to the asset, and the asset may be attached
  elsewhere or retained for provenance even after a specific usage is removed.
  `archive_media_asset` (existing kernel function, `media.manage`) is the only path
  that retires an asset, and it already checks usage count before allowing it.

## Video

No transcoding pipeline exists or was built. `video` / `video_poster` roles are
accepted by the role vocabulary and the readiness/rights model, but the upload Route
Handler only accepts image MIME types today — video registration would need its own
upload path (the kernel's `register_media_asset` already accepts
`video/mp4`/`video/webm`, but no derivative/thumbnail generation exists for it).
This is an explicit gap, not a silent omission: video upload UI was not built in C3.
