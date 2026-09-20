# S4 Media Architecture

**Status:** local metadata, rights, policy, and reconciliation kernel  
**Date:** 5 September 2026

## Ownership boundary

`media_assets` is editorial metadata. Supabase's `storage` schema is provider-managed metadata. S4 never inserts, updates, or deletes `storage.objects` rows as an object-operation shortcut. Bucket configuration and object operations use the supported Storage API.

## Buckets

The local provisioner owns only these private buckets:

| Bucket | Purpose | Public URL policy |
| --- | --- | --- |
| `editorial-originals` | Restricted source uploads and immutable originals. | Private; no anonymous read. |
| `editorial-derivatives` | Reviewed/resized delivery variants derived from a source asset. | Private; served later through an authorized/signed delivery boundary. |

The migration creates Storage RLS policies but not bucket rows. `storage:provision` is idempotent and hardens only the two named buckets. `storage:cleanup-test-fixtures` can remove only its hard-coded UUID-rooted fixture-path allow-list; it does not accept an arbitrary prefix or bucket argument.

The development limit is 25 MiB per object. The admitted type set is JPEG, PNG, WebP, AVIF, MP4, and WebM. SVG, HTML, JavaScript, XML, executables, archives, and unknown types are excluded until a separately approved production scanning policy exists.

## Identity and paths

Every editorial asset has a UUID identity. Object paths are rooted by that UUID and contain one traversal-free filename, for example:

`<asset-uuid>/original.jpg`  
`<asset-uuid>/hero.webp`

The Storage insert/update policy rejects dot-segment traversal, backslashes, and paths that are not rooted at the asset UUID. `src/lib/media/validation.ts` applies the same rule before a future upload command reaches Storage.

## Content validation

The server-side validation adapter and database metadata trigger share/enforce:

- admitted MIME type;
- positive safe byte size;
- UUID-rooted object name;
- magic bytes that match the claimed type.

UUID-rooted paths and admitted MIME/media-kind consistency apply to every provenance class, including `synthetic_test`; synthetic classification is never a validation bypass.

Client file extensions and MIME labels are not evidence. The current pure unit tests cover JPEG signature acceptance, SVG/MIME rejection, PNG/JPEG mismatch, and path traversal rejection. Image dimensions, video duration, malware scanning, EXIF handling, and production quotas remain policy decisions for a later upload slice.

## Media classification

`provenance_class` distinguishes `client_original`, `client_derivative`, `production_asset`, `concept_demo`, `generated_reference`, and `synthetic_test`. The latter three are never valid completed-project public evidence. `production_asset` is an explicit future capture/commissioned-production class; it still requires a reviewed derivative, current rights, consent where applicable, and a successful promotion command. `source_asset_id` records derivative ancestry; the reconciliation report flags a derivative whose source metadata is absent.

Media usage has explicit role/stage fields such as hero, listing, gallery, before, during, after, detail, drawing, video, poster, background, and social. Project usage also stores phase, decorative state, credit, focal point, and localized contextual alt text.

## Rights and consent

Public eligibility requires:

- rights state `cleared`;
- public-use permission `granted`;
- rights reviewer and verification date;
- non-expired rights review;
- granted consent when consent is required;
- an approved derivative in `editorial-derivatives`;
- admitted non-concept provenance.

Unknown, in-review, expired, rejected, not-granted, or missing-consent states fail closed. A credit line is safe plain text; it is not a substitute for rights approval.

## RLS boundary

Storage policies are limited to authenticated callers with `media.read`, `media.upload`, or `media.manage`. They do not grant the anonymous role. Bucket privacy is checked by the local status/verify script, not assumed from a public URL convention. The separate boolean public-usage predicate exposes no metadata by itself and admits an eligible project-media row only when its parent project is currently publishable and its English presentation data is safe.

## Reconciliation

`media:reconcile` compares database metadata with objects in the two reserved buckets and reports:

- database rows whose object is missing;
- storage objects with no database row;
- derivatives with missing source metadata;
- unexpected buckets;
- public-eligible concept/synthetic assets;
- public-eligible assets without current rights.

The command is report-only. It deletes nothing and does not attempt to repair uncertain ownership.

The publication integration test joins the two sides of this boundary: it uploads synthetic JPEG bytes through the Storage API, downloads the private derivative and verifies its SHA-256 checksum, proves raw anonymous object access fails, registers matching database metadata, rejects incomplete/concept promotion, promotes only the cleared derivative and its project usage, proves eligible usage metadata remains invisible before parent publication, verifies the projection after parent publication, and removes only its two known object paths during cleanup.
