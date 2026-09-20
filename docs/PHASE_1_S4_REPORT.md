# RENZ Phase 1 / S4 Report

**Execution window:** 5–6 September 2026  
**Repository:** `C:\Users\princ\source\repos\C-website`  
**Authorized boundary:** local content, evidence, media, and publication kernel only

## 1. S4 status

**PASS**

**S4 ENGINE READINESS: PASS.** The local kernel is migration-defined, fail-closed, typed, permissioned, resettable, and covered by database, Auth, publication, Storage, application, and supply-chain verification.

**REAL RENZ CONTENT READINESS: BLOCKED.** No real service scope, project proof, public contact data, team record, credential, testimonial, production media right, regulated claim, final identity, or legal/privacy package has been inferred or promoted. That distinction is intentional: missing client evidence blocks real publication without making the authorized S4 engine incomplete.

## 2. Safe gate override

The project lead accepted S3 and authorized S4 machinery while G1, G2, and the production-policy parts of G4 remain unresolved. S4 therefore implements schemas, exact permissions, local private Storage controls, evidence and rights states, synthetic fixtures, publication commands, public projections, verification, and reconciliation through safe omission. It does not approve a logo, convert the WhatsApp screenshot into a public service taxonomy, treat concept imagery as project evidence, invent client facts, create production upload policy, or expose real content.

Git history remained informational under the dated project-lead override. The repository is on `main` with no commit yet; existing staged S0 material and untracked S1–S4 work were preserved, and S4 did not rewrite or discard them.

## 3. Dependencies/toolchain changes

| Technology | Exact version/status | S4 reason |
| --- | --- | --- |
| Node.js | Repository/CI `24.20.0`; local `24.18.1` | Node 24 LTS line. The compatible local patch ran all checks; no system-wide runtime was changed. |
| pnpm | Repository `11.25.0`; invoked exactly through Corepack; host default `11.19.0` | Deterministic package-manager and lockfile behavior without mutating the global install. |
| Next.js | `16.3.4` | Existing application/server boundary and current cache APIs. |
| React / React DOM | `19.2.8` / `19.2.8` | Existing matched stable runtime pair. |
| TypeScript | `6.0.3` | Existing strict, non-experimental compatibility choice. |
| Supabase JS / SSR | `2.115.0` / `0.12.6` | Existing local Auth, PostgREST, and Storage clients. |
| Supabase CLI | `2.116.0` | Exact local migration, database-test, lint, type, and stack orchestration. |
| PostgreSQL | local `17.6` image | Migration and pgTAP execution runtime. |
| Zod | `4.5.4` | The only S4 direct dependency addition; validates publication commands, structured content, settings, and media metadata at real server boundaries. |
| Sharp | not installed | S4 governs derivatives but does not generate them; a native processor would be premature without production formats/limits/ownership. |
| Playwright | not installed | S4 has no public visual feature. Full render/screenshot inspection remains a later frontend gate. |

All 27 direct dependency entries remain exact—no caret, tilde, tag, Git range, canary, RC, or floating CLI was added. `pnpm-lock.yaml` remains the only package-manager lockfile. No install/postinstall script was added by the project. A frozen install passed with `strictDepBuilds: true`, and the lockfile contains no `requiresBuild` entry. `pnpm ignored-builds` returned an inconclusive “no node_modules found” message despite the verified installation, so that display is not misrepresented as lifecycle evidence; the fail-closed workspace policy, lockfile metadata, installed dependency inventory, and successful build are the recorded controls.

## 4. Database migration inventory

S4 adds fourteen forward-only migrations after the accepted S3 migration; no successful S1–S3 migration was edited.

| Migration | Responsibility |
| --- | --- |
| `20260905150000_establish_s4_evidence_publication.sql` | Bounded registries, evidence, typed evidence/claim links, rights/provenance, safe-content guards, readiness predicates, publication/media RPCs, audit hooks, indexes, RLS, and explicit function grants. |
| `20260905151000_establish_s4_public_projections.sql` | Effective-public predicates, authenticated read policies, initial explicit-column projections, and private evidence/claim read boundaries. |
| `20260905152000_establish_s4_storage_security.sql` | Policies on provider-managed `storage.objects` for only the two admitted private buckets. |
| `20260905153000_establish_s4_permissions.sql` | Nine S4 capabilities and reviewed `admin`/`super_admin` mappings. |
| `20260905154000_harden_s4_public_projection_boundaries.sql` | Owner-evaluated security-barrier views and removal of temporary anonymous base-table grants. |
| `20260905155000_establish_s4_public_setting_command.sql` | Allow-listed, typed, evidence-aware, versioned public-setting mutation command. |
| `20260905156000_harden_s4_trigger_security.sql` | Narrow integrity-trigger execution boundary with empty `search_path`. |
| `20260905157000_allow_media_projection_helper.sql` | Explicit execute grant for the boolean-only reviewed public-media predicate. |
| `20260905158000_close_s4_anonymous_base_grants.sql` | Final anonymous privilege revocation across editorial/evidence/media/settings base tables. |
| `20260905159000_add_s4_production_media_class.sql` | Adds bounded `production_asset` provenance without granting automatic eligibility. |
| `20260905160000_enforce_s4_section_scope.sql` | Senior-review correction that independently enforces registry scope against the parent page template. |
| `20260905161000_harden_s4_public_urls.sql` | Requires optional projected canonical overrides to be trimmed absolute HTTPS URLs. |
| `20260905162000_enforce_s4_media_metadata.sql` | Removes the synthetic-media bypass and enforces UUID-rooted paths plus admitted MIME/kind consistency for every provenance class. |
| `20260906081821_reject_s4_raw_markup.sql` | Enforces the exact four-type body-block registry, rejects raw markup/unknown keys across every projected public text field, keeps section config empty until versioned, applies strict path/URL/type guards, and prevents project-media metadata visibility before its parent project is publishable while preserving the one required boolean projection-helper grant. |

Two incompatible early S4 drafts remain disabled under `docs/_archive/phase-1-s4-drafts/` as audit evidence; they are not executable migration history.

## 5. Evidence architecture

Content lifecycle and evidence review remain separate. Content uses `draft`, `published`, and `archived`; evidence uses `unverified`, `in_review`, `verified`, `expired`, and `rejected`.

`evidence_records` captures source class/reference, the bounded fact supported, internal notes, owner, reviewer, verification date, review/expiry date, approved public wording, sensitivity, consent requirement/state/reference, attribution, and optimistic version. The controlled source taxonomy includes client-supplied/confirmed sources, contract/project/credential documents, media metadata, testimonial consent, public authoritative sources, reviewed internal records, and a bounded reviewed-other category. Source class alone never implies verification.

Relationships are foreign-key-safe: `service_evidence`, `project_evidence`, `post_evidence`, `page_evidence`, `team_member_evidence`, `testimonial_evidence`, `credential_evidence`, `navigation_evidence`, and `setting_evidence`. Material claims use a common reviewed claim row plus typed service/project/post/page/team/credential relationship tables and `claim_evidence`. There is no unconstrained `entity_type + entity_id` evidence escape hatch.

Sensitive source references, internal notes, consent references, reviewer identities, and evidence rows remain private even when approved public wording exists.

## 6. Content domain coverage

| Domain | S4 foundation |
| --- | --- |
| Services / expertise | Localized public fields, scope/deliverables/exclusions/client inputs/delivery wording/professional terminology, evidence, claims, SEO, and hero-media readiness. |
| Projects | Public-safe location, type/scope/RENZ role, review data, related services, evidence, claims, localized narrative/SEO, and governed media roles/stages. |
| Insights/posts | Localized slug/title/excerpt/body/SEO, publication date, time-sensitive review, evidence, and claims. |
| Pages | Bounded template keys, localized safe path/content/SEO/indexability, evidence, and approved section registry. |
| Team | Localized approved name/role/biography, consent, review, evidence/claims, and optional governed portrait. |
| Testimonials | Exact approved quote, attribution mode/presentation, source evidence, verification, consent, and reviewer. |
| Credentials | Exact identity/issuer/reference/validity, localization, verification, evidence/claims, and approved public wording. |
| Navigation | Bounded menus/items, safe resolved internal paths or HTTPS URLs, plain-text English labels for every visible item, evidence links, versioning, and website permission. |
| Public settings | Structural allow-list by namespace/key/type; current evidence where required; no arbitrary or secret-bearing key. |
| Homepage composition | Curated section registry and typed page-section relations; no arbitrary component, HTML, CSS, or JavaScript injection. |

S4 creates no admin editor and no public content route.

## 7. Publication readiness rules

- **Service:** English localization, canonical name/slug, meaningful summary, scope, deliverables, exclusions, delivery wording, safe structured blocks, SEO, current required evidence, and current hero media when present. Professional-capacity terms such as “Engineering” require current evidence.
- **Project:** title/summary, safe public location granularity, type, scope, RENZ role, reviewer/date, SEO, related publishable service, required evidence, claims, and eligible rights-cleared contextual media.
- **Post:** title/slug/excerpt/body/SEO, publication date, reviewer/date, and current required evidence for time-sensitive material.
- **Page:** approved template, safe title/path/body/SEO, indexability, current evidence, and enabled sections from the bounded registry.
- **Team member:** approved localized name/role/biography, reviewer/date, consent, current evidence, and eligible portrait when present.
- **Testimonial:** exact approved quote, approved attribution or anonymity, verified source, current consent, reviewer, and typed evidence.
- **Credential:** exact name, issuer/reference, approved wording, current verification/evidence, and non-expired validity.
- **Navigation:** published menu, reviewed plain-text English label for every visible item, and a safe resolved non-admin internal path or absolute HTTPS external URL.
- **Setting:** enabled allow-list entry, correct/safe JSON type, current review/evidence where configured, and eligible state.
- **Media/claim dependency:** only current reviewed evidence, cleared rights, granted public use/consent, admitted provenance, ready derivative, and required contextual text can cross the public boundary.

All projected textual fields are rechecked as plain data at the shared publication predicate; only the exact structured-block registry carries richer structure. Optional unsupported project facts are omitted rather than fabricated. Effective-public predicates are re-evaluated on every projection query, so later evidence/rights expiry removes visibility even if a parent status remains `published`.

## 8. Publication operations

Narrow RPCs implement readiness, publication, unpublication, archive, navigation publication, evidence creation/transition, media registration/rights/promotion/archive/replacement, and allow-listed setting update. Each mutation derives the actor from the current Auth session and enforces active profile, AAL2, exact permission, bounded input, row lock, expected version, and redacted audit metadata.

Direct lifecycle toggles are blocked by database command guards. On success the command increments the row version exactly once. A real integration race sends the same expected service version concurrently from two independently authenticated AAL2 synthetic operators: exactly one succeeds and one receives `version_conflict`.

Unpublish moves effective content back to draft visibility; archive preserves history. The application adapter invalidates only bounded content tags/paths after a successful database command.

## 9. Publication failure codes

The stable safe vocabulary includes:

`missing_required_field`, `missing_verification`, `evidence_expired`, `evidence_rejected`, `rights_unknown`, `rights_expired`, `consent_missing`, `invalid_media_classification`, `media_not_ready`, `missing_alt_text`, `missing_related_service`, `seo_incomplete`, `invalid_url`, `unsafe_content`, `unsupported_block`, `unsupported_template`, `indexability_disabled`, `approved_wording_missing`, `missing_attribution`, `credential_expired`, `not_authorized`, `version_conflict`, `not_found`, `unknown_setting`, and `unsupported_content_type`.

Database transport errors are mapped to a redacted `rpc_error` by the server adapter; raw internal SQL/storage errors are not editorial response data.

## 10. S4 permission matrix

| Capability | `super_admin` | `admin` | Anonymous / ordinary authenticated account |
| --- | --- | --- | --- |
| `content.read` | Yes | Yes | No private read |
| `content.write` | Yes | Yes | No |
| `content.publish` | Yes | No | No |
| `content.archive` | Yes | No | No |
| `media.read` | Yes | Yes | No raw/private read |
| `media.upload` | Yes | Yes | No |
| `media.manage` | Yes | Yes | No |
| `claims.verify` | Yes | No | No |
| `website.manage` | Yes | No | No |

Every authenticated capability also requires an active profile and AAL2 through the fresh database permission helper. S4 does not invent an editor role or a production reviewer/publisher assignment.

## 11. RLS/grant matrix

| Surface | `anon` | Authenticated without capability / AAL1 | AAL2 `admin` | AAL2 `super_admin` |
| --- | --- | --- | --- | --- |
| Named `published_*` views | `SELECT` only | Same effective public rows | Same, plus capability-gated base reads | Same, plus capability-gated base reads |
| Editorial base tables | No grant | No qualifying policy | `content.read`; draft mutation only through admitted command paths | Exact content capabilities |
| Evidence/claims/verification | No grant | Denied | No `claims.verify`; bounded content-reader relationships only where designed | `claims.verify` plus reviewed reads/commands |
| Media metadata | No base grant | Denied | `media.read/upload/manage` as mapped | Same capabilities |
| Storage objects | No policy: upload/read/overwrite/delete denied | Denied | Private read/upload/manage within named buckets and UUID-rooted paths | Same capabilities |
| Navigation/settings | Projection-only | Public projections only | No `website.manage` | `website.manage` commands |
| Audit | No access | Denied | Existing permission-dependent access only | Existing exact audit capabilities |
| Future/unmapped tables/functions | Denied by default | Denied by default | Denied unless explicitly admitted | Denied unless explicitly admitted |

Anonymous callers have no `SELECT` privilege on S4 editorial, evidence, claims, registry, settings, or media base tables. Public views are explicit-column, owner-evaluated (`security_invoker=false`) security barriers; their reviewed predicates form the public API.

## 12. Public projections

| View | Exact exposed columns |
| --- | --- |
| `published_services` | `id`, `locale`, `slug`, `name`, `summary`, `scope`, `deliverables`, `exclusions`, `client_inputs`, `delivery_wording`, `body_blocks`, `schema_version`, `seo_title`, `seo_description`, `sort_order`, `featured`, `published_at` |
| `published_projects` | `id`, `locale`, `slug`, `title`, `summary`, `challenge`, `approach`, `solution`, `outcomes`, `seo_title`, `seo_description`, `public_location`, `public_location_granularity`, `project_type`, `project_scope`, `renz_role`, `start_year`, `completion_year`, `delivery_status`, `sort_order`, `featured`, `published_at` |
| `published_project_media` | usage `id`, `project_id`, `media_asset_id`, `role`, `phase`, `sort_order`, `decorative`, `credit`, `focal_point`; asset `mime_type`, `width`, `height`; localization `locale`, `alt_text`, `caption` |
| `published_posts` | `id`, `locale`, `slug`, `title`, `excerpt`, `body_blocks`, `schema_version`, `seo_title`, `seo_description`, `publication_date`, `published_at` |
| `published_pages` | `id`, `page_key`, `template_key`, `locale`, `path`, `title`, `summary`, `body_blocks`, `schema_version`, `seo_title`, `seo_description`, `canonical_override`, `social_image_id`, `noindex`, `published_at` |
| `published_page_sections` | `id`, `page_id`, `section_type`, `schema_version`, `config`, `sort_order` |
| `published_team_members` | `id`, `locale`, `name`, `role_label`, `biography`, `portrait_asset_id`, `sort_order`, `published_at` |
| `published_testimonials` | `id`, `locale`, `quote`, `attribution_presentation`, `attribution_name`, `attribution_role`, `attribution_organization`, `attribution_mode`, `published_at` |
| `published_credentials` | `id`, `locale`, `name`, `description`, `issuer`, `reference`, `valid_from`, `valid_to`, `team_member_id`, `approved_public_wording`, `published_at` |
| `published_navigation_items` | `menu_id`, `id`, `parent_id`, `sort_order`, `link_type`, `internal_path`, `external_url`, `locale`, `label`, `accessibility_text` |
| `published_site_settings` | `namespace`, `key`, `value` |
| `published_project_claims` | `project_id`, claim `id`, `claim_type`, `approved_public_wording` |

No view exposes an object path, original filename, evidence source/reference, internal note, consent reference, rights note, reviewer identity, audit field, private setting, or raw-markup field. Project-media projection rows additionally require a currently publishable parent project, so an eligible usage cannot leak before the parent crosses its evidence gate. S4 wires no public UI to these projections.

## 13. Storage architecture

Local Supabase Storage owns two reserved private buckets:

| Bucket | Purpose | Local policy |
| --- | --- | --- |
| `editorial-originals` | Immutable/restricted source objects | Private; no anonymous object read |
| `editorial-derivatives` | Reviewed output candidates | Private; no anonymous object read |

`storage:provision` uses the Storage API and is idempotent; it creates or hardens only these names. It does not insert bucket/object metadata via SQL, overwrite unknown objects, remove objects outside its hard-coded UUID-rooted test-fixture allow-list, link a remote project, or create cloud resources. Both local buckets use a 25 MiB development limit and admit JPEG, PNG, WebP, AVIF, MP4, and WebM. The cleanup command accepts no arbitrary bucket or prefix.

## 14. Media provenance/classes

The bounded provenance classes are `client_original`, `client_derivative`, `production_asset`, `concept_demo`, `generated_reference`, and `synthetic_test`.

`concept_demo`, `generated_reference`, and `synthetic_test` are blocked from completed-project promotion by database/server invariants. `client_original` is not automatically public. `production_asset` means a future commissioned/captured source class, not rights clearance. `source_asset_id` records derivative ancestry.

## 15. Media rights model

Media records carry rights state, public-use permission, rights holder/source/notes, reviewer, verification/review-due dates, consent requirement/state/reference, provenance, source derivative, storage state, and version. Public eligibility requires `cleared` rights, `granted` public use, reviewer and verification date, a non-expired review, granted consent when required, admitted provenance, an eligible derivative in `editorial-derivatives`, and valid contextual usage metadata.

Unknown, in-review, expired, rejected, missing-consent, or not-granted states fail closed. Credit text never substitutes for evidence.

## 16. Media promotion pipeline

The explicit storage states are `registered`, `upload_pending`, `uploaded_private`, `processing`, `ready_private`, `promotion_pending`, `public_eligible`, `archived`, and `failed`. Registration and upload do not imply publication. A future workflow registers validated metadata, uploads through the Storage API, verifies object/checksum, creates/reviews a derivative, clears rights/consent, promotes the asset, and only then promotes a contextual project usage.

The database cannot claim an asset is public merely because an object exists. Conversely, an object operation is not treated as a PostgreSQL transaction. Failures remain detectable by the report-only reconciler.

## 17. Image derivative decision

S4 does not install Sharp or bind the project to a transformation provider. The kernel records immutable source/derivative relationships, dimensions, MIME, bytes, checksum, crop/focal guidance, and public status, which is the correct stable boundary before the client approves target sizes, quality, retention, and operating ownership. The local integration fixture uses known synthetic JPEG bytes as a prebuilt derivative to test governance, not image quality.

## 18. Video/media future compatibility

The schema admits MP4 and WebM metadata and project roles including `video`, `video_poster`, and `background`. It can record width/height, duration-ready metadata, poster usage, contextual caption/alt behavior, credit, stage, and derivative ancestry. Production transcoding, streaming, captions/transcripts, autoplay, reduced-motion fallbacks, file limits, and delivery provider remain later decisions; no fake captions or video assets were created.

## 19. Media usage/deletion/replacement

Project usage is a separate versioned relationship with role, phase/stage, ordering, caption, contextual alt text, decorative flag, credit, focal point, and eligibility. Non-decorative public media requires meaningful alt text; an empty alt is allowed only through an explicit decorative decision. Anonymous usage metadata remains hidden until the parent project itself is currently publishable, and every projected media text/JSON field is rechecked for the data-only content contract.

In-use media cannot be hard-deleted through the normal workflow. Archive preserves history. Replacement is a command with expected-version and reference checks; source assets/derivatives use restrictive foreign keys so a dangling derivative or usage cannot be created silently.

## 20. Storage reconciliation

`media:reconcile` compares the public metadata model with both reserved buckets and reports database rows missing objects, objects missing database rows, derivatives missing source metadata, unexpected bucket use, public-eligible concept/synthetic assets, and assets eligible without current rights. Storage listing is deterministically paginated and fails closed above an explicit 10,000-entry local-run bound instead of silently truncating. It is report-only: it performs no repair or unknown-object deletion.

The final clean verification found zero database assets, zero storage objects, zero issues, and `destructiveAction: none` after the owned synthetic fixtures were removed.

## 21. Contact/settings future readiness

The `public_setting_registry` provides a bounded structural vocabulary for `brand.public`, `contact.public`, `social.public`, and `website.public`, with per-key type and evidence requirements. `update_public_site_setting` rejects unknown keys, unsafe content, bad URL types, missing evidence, stale versions, AAL1, disabled actors, and callers without `website.manage`.

No RENZ email, phone, WhatsApp, hours, address, directions, coordinates, social account, descriptor, or domain value was added. The only positive integration value is the unmistakably structural synthetic `website.public/default_locale = en`; a private `.example.test` directions value exists only long enough to test URL denial. Cleanup removes both.

## 22. Homepage composer foundation

`content_section_registry` bounds future curated homepage chapters: `hero`, `proposition`, `expertise`, `selected_projects`, `audiences`, `process`, `quality_responsibility`, `proof`, `insights`, and `final_cta`; page templates also admit bounded `rich_text`, `contact_details`, and `legal_content` sections. Section relations can reference reviewed projects, services, or media in a deliberate order.

The database rejects unregistered/disabled section types and keeps section config at `{}` until a reviewed versioned schema exists. No arbitrary HTML, component names, CSS, JavaScript, animation code, final homepage content, renderer, or builder UI was added.

## 23. Cache tag/invalidation architecture

`src/lib/content/cache-tags.ts` defines the bounded domain and item tag vocabulary. `src/lib/content/invalidation.ts` is server-only and uses current Next.js 16 semantics: `revalidateTag(tag, "max")` and `revalidatePath` after ordinary successful commands; `updateTag` appears only in the server-action-only read-your-own-write helper. `src/lib/content/operations.ts` invokes these helpers only after a successful caller-scoped RPC.

No S4 route is cached or exposed. S6 must attach the same tags to projection reads before this becomes runtime public-cache behavior.

## 24. Audit coverage

Successful evidence transitions; media registration, rights update, promotion, archive, and replacement; content publish/unpublish/archive; navigation publish/unpublish; and setting updates write actor-derived, outcome-tagged audit events. Metadata is bounded/redacted and prohibits credential-like fields. The client cannot supply actor, role, permission, or a privileged user ID.

Failed readiness is returned as safe structured reasons rather than dumping internal evidence or SQL text. Existing S3 security audit and last-super-admin protections remain in force.

## 25. Synthetic fixture inventory

- Existing S2 seed: one unmistakably synthetic draft service, project, post, and page; no team, testimonial, credential, navigation, setting, or public record.
- S4 publication integration: synthetic service/project/post/page/team/testimonial/credential, typed evidence, navigation, two structural setting fixtures (one positive and one URL-denial probe), one rights-cleared production-class derivative, one concept original, negative media/usage variants, four synthetic local Auth identities (two full-S4 operators, one limited admin, and one unassigned denial probe), and one temporary full-S4 test role.
- Storage: two four-byte JPEG-signature test objects at exact UUID-rooted paths.
- Unit tests: in-memory structured content, media signatures, paths, tags, and environment values only.

Every S4 integration identity uses reserved UUIDs and `SYNTHETIC`/`.example.test` markers. The publication harness removes its rows, objects, users, role mappings, and role. Content verification then sees empty public projections; reconciliation sees no residual object or asset.

## 26. Negative publication tests

The integration harness proves failure for all required scenarios and additional boundaries:

1. service missing scope;
2. service using unverified professional wording;
3. required evidence missing;
4. evidence expired;
5. evidence rejected;
6. raw markup in both structured blocks and projected plain-text content;
7. eligible project media before its parent project is published (must remain anonymous-invisible);
8. project missing RENZ role;
9. project missing related service;
10. project using concept media;
11. project using media with unknown rights;
12. non-decorative project media missing alt text;
13. unverified testimonial;
14. testimonial with revoked/missing consent;
15. credential without verification;
16. expired credential;
17. page with a disabled/unapproved section;
18. unsafe JavaScript navigation URL;
19. unknown public setting;
20. ambiguous/backslash public-setting URL, with stable `invalid_url` output;
21. stale optimistic version;
22. real concurrent same-version publication conflict;
23. AAL1 actor with otherwise sufficient permissions;
24. AAL2 actor missing `content.publish`;
25. disabled actor;
26. anonymous RPC caller.

Storage-specific tests additionally reject anonymous upload/read/overwrite/delete, unauthorized authenticated mutation, unknown buckets/paths, traversal, invalid MIME/signature pairs, SVG/HTML, concept promotion, and incomplete rights.

## 27. Positive publication tests

Fully supported synthetic examples prove publication for service, project, insight/post, page, team member, testimonial, and credential. The same run proves navigation publication, one allow-listed setting, rights-cleared derivative promotion, project-media promotion, pre-parent media invisibility followed by correct post-publication visibility, and denial of private evidence.

It then unpublishes the service and archives the post, proves both disappear anonymously, and removes every temporary row/object/account. No real RENZ data is involved.

## 28. pgTAP/database results

Two clean local resets rebuilt all 26 ordered migrations and the safe seed. Eight pgTAP files passed **332/332 assertions**. The suite covers schema/constraints/relationships/indexes, lead integrity/concurrency, default-deny grants, S3 authorization, S4 evidence/publication/media/RLS/projection/section-scope/public-URL/public-path/exact-block/raw-markup rules, explicit function security, and synthetic-seed safety.

`supabase db lint --local --fail-on warning` reported no schema errors or warnings. Canonical database types regenerated deterministically and matched `src/lib/database/database.types.ts`; the generator now rejects/retries a transient empty schema response instead of accepting an invalid file.

## 29. Storage integration results

Both buckets were provisioned idempotently and verified private with the exact 25 MiB/MIME policy. The integrated publication harness uploaded synthetic bytes through the Storage API, downloaded the derivative, matched SHA-256, denied raw anonymous download, registered matching database metadata, rejected concept and unknown-rights promotion, promoted the reviewed derivative/usage, proved its metadata stayed hidden until the parent project was published, exposed only safe public metadata afterward, and removed only its known fixtures.

The standalone storage suite also proved anonymous upload/read/overwrite/delete denial, authorized scope, bad bucket/path/traversal rejection, MIME/magic mismatch rejection, and SVG/HTML rejection. Final status and reconciliation were clean.

## 30. Auth regression results

The S3 local verification passed after S4 migrations. Public signup remained disabled; unknown/nonstaff/AAL1/disabled access stayed fail-closed; password plus TOTP/AAL2 activation worked; exact role permissions, invitation lifecycle, audit redaction, role assignment/removal, and last-super-admin protection remained intact. Publication integration independently exercised AAL1, AAL2 limited admin, two AAL2 publishers, disabled actor, and anonymous caller behavior.

No customer account, production user, or real email was created. All `.example.test` users were removed.

## 31. Application regression results

| Check | Result |
| --- | --- |
| Frozen exact install | PASS |
| Prettier | PASS |
| ESLint, zero warnings | PASS |
| Strict TypeScript / Next route types | PASS |
| Unit tests | PASS — 32 tests in 8 files |
| Component tests | PASS — 5 tests in 2 files |
| `designmd lint DESIGN.md` | PASS — 0 errors, 0 warnings |
| Secret scan | PASS — 168 text-capable repository files inspected; no candidate value printed |
| Next production build | PASS |
| Production dependency audit | PASS — independent rerun reported no known vulnerability at the configured high threshold |
| Aggregate `pnpm verify` | PASS |
| Aggregate `pnpm s4:verify` | PASS |

The existing neutral public shell and S3 routes remain; no S4 debug/test/browser route was added. Final production HTTP smoke verification returned 200 for `/`, `/admin/sign-in`, `/admin/mfa`, `/admin/mfa/enroll`, `/admin/security`, and `/admin`; each response contained semantic `<main>` content and `noindex`, while `/` also carried `nofollow`, the expected neutral H1/copy, and no `X-Powered-By` header. The server was stopped afterward. These are local results: the immutable, least-privilege GitHub Actions definition was inspected, but no hosted CI execution is claimed because the repository still has no commit/remote execution evidence.

## 32. Security review

- Anonymous reads are confined to explicit owner-evaluated security-barrier projections; base tables and private Storage have no anonymous privilege.
- All privileged commands derive the actor from Auth, require active AAL2 and an exact permission, lock rows, compare versions, validate input, and audit success.
- RLS, grants, function execution, trigger `search_path`, command guards, and default-deny future surfaces are tested.
- Structured JSON and every projected plain-text field reject raw markup, script/event-handler patterns, JavaScript/data URLs, arbitrary section types, and unsafe navigation.
- Media paths are UUID-rooted and traversal-free; MIME labels must match magic bytes; SVG/HTML/XML/executable/archive classes are outside the admitted set.
- Concept/generated/synthetic project media and unknown/expired/rejected rights cannot reach public eligibility; eligible usage metadata also remains hidden until its parent project is currently publishable.
- Evidence source, internal notes, consent references, rights metadata, object paths, and audit details do not appear in public projections.
- Settings are registry allow-listed and cannot accept arbitrary secret-bearing keys.
- Service/secret keys stay in local server scripts and are never exposed to a client module, committed file, URL, report, or test output.

No `dangerouslySetInnerHTML`, dynamic code execution, public upload route, client-side privileged helper, broad service-role utility, CSP weakening, analytics, or cloud secret was introduced.

## 33. Accessibility/SEO data integrity

S4 treats accessibility and SEO as publication data invariants. Non-decorative project media needs contextual alt text; decorative status must be explicit. Page/service/project/post readiness requires the applicable locale, safe slug/path, title/summary/body, SEO title and description, and indexability state. Social/hero media must be independently eligible. Navigation stores accessible text and accepts only safe destinations.

The schema is compatible with future posters/captions/transcripts and reduced-motion alternatives, but those assets and UX are not fabricated or claimed as tested. No public SEO route, sitemap, structured data, final locale policy, or WCAG certification is part of S4.

## 34. Performance/bundle impact

S4 adds server-only TypeScript adapters and Zod but no browser-facing route or provider, no image processor, no media payload, no analytics, and no client state library. The production build remains the S1/S3 route set: static `/` and `/_not-found`, dynamic `/admin`, `/admin/mfa`, `/admin/mfa/enroll`, `/admin/security`, and `/admin/sign-in`, plus the existing proxy boundary.

No S4 client component or avoidable hydration path was added. Storage, publication, reconciliation, service-key, and database code remains outside public client bundles.

## 35. Senior review findings

The final review removed duplicate unused content modules so there is one cache/publication boundary, connected successful publication results to that boundary while proving rejected commands do not invalidate, made structured block and command schemas strict, enforced the same exact block registry in PostgreSQL, kept unversioned section config empty, closed raw-markup gaps across both structured blocks and every projected plain-text field, rejected private/ambiguous content links and page paths, required each visible navigation item to resolve and carry safe English text, prevented eligible project-media metadata from appearing before its parent project is publishable, consolidated upload validation onto one canonical path/signature implementation, removed an unused secret-bearing signed-URL helper, corrected documentation that referenced removed paths, added the explicit `production_asset` provenance class, closed the last anonymous base-table grants, hardened trigger execution, fixed independent homepage/page section scope enforcement, constrained canonical overrides to HTTPS, made database type generation reject transient empty output, made stack verification tolerate only known bounded container-reset races, and replaced a silent 1,000-object reconciliation ceiling with deterministic pagination plus an explicit fail-closed bound.

The review also found that the initial integration summary underrepresented required negative cases and did not tie Storage objects to publication metadata. The harness was strengthened to cover all required negative categories plus missing evidence, structured and plain-text safety, parent-gated media visibility, a real concurrent race, and an ambiguous setting URL with a stable failure code; it now uses actual Storage API objects/checksums and proves cleanup. Cleanup errors set a failing exit code without masking a primary test error.

No dependency, abstraction, public route, content fact, client provider, or later-slice feature remained without an S4 reason.

## 36. Files created/changed

**Database/configuration**

- Fourteen S4 forward migrations from `20260905150000` through `20260906081821`.
- `supabase/tests/database/008_s4_publication_media.sql` plus necessary S2/S3 expectation updates.
- `supabase/config.toml` for local Storage enablement/policy only.
- Canonical generated `src/lib/database/database.types.ts`.
- `.github/workflows/ci.yml` with an isolated Linux S4 integration job.
- `package.json` and `pnpm-lock.yaml` for exact Zod and S4 scripts.

**Server/application kernel**

- `src/lib/content/cache-tags.ts`
- `src/lib/content/invalidation.ts`
- `src/lib/content/operations.ts`
- `src/lib/content/schemas.ts`
- `src/lib/media/paths.ts`
- `src/lib/media/signatures.ts`
- `src/lib/media/validation.ts`

**Verification/security**

- `scripts/s4-local.mjs`
- `scripts/verify-content-local.mjs`
- `scripts/verify-publication-local.mjs`
- `scripts/storage.mjs`
- `scripts/media-reconcile.mjs`
- `scripts/verify-s4.mjs`
- hardened `scripts/database-types.mjs`, `scripts/verify-database.mjs`, and `scripts/verify-auth-local.mjs`
- S4 unit tests under `tests/unit/`

**Documentation**

- `docs/PHASE_1_S4_CONTENT_EVIDENCE_MODEL.md`
- `docs/PHASE_1_S4_PUBLICATION_RULES.md`
- `docs/PHASE_1_S4_MEDIA_ARCHITECTURE.md`
- `docs/PHASE_1_S4_PUBLIC_PROJECTIONS.md`
- `docs/PHASE_1_S4_STORAGE_SECURITY.md`
- `docs/PHASE_1_S4_REPORT.md`
- `docs/CLIENT_EVIDENCE_BACKLOG.md`
- dated implementation notes in the decision register, roadmap, security/content/database contracts, and README
- disabled early drafts under `docs/_archive/phase-1-s4-drafts/`

Existing client originals, concepts, S0 historical evidence, and S1–S3 contracts were preserved.

## 37. Client evidence backlog

The generated `docs/CLIENT_EVIDENCE_BACKLOG.md` tracks these categories only: **Company, Contact, Brand, Services, Projects, Team, Credentials, Testimonials, Quality / Safety / Sustainability, Legal / Privacy, and Media Rights.** Each category separates needed, received, verified, approved, and blocked status; it contains no invented answer.

## 38. G0-G6 after S4

| Gate | Status | S4 effect |
| --- | --- | --- |
| G0 — authorization | **PASS** | S4 was explicitly authorized and stops at its kernel boundary. |
| G1 — source/brand | **PARTIAL** | Originals preserved; no logo or identity promoted; rights/selection/fonts/vector masters remain unresolved. |
| G2 — business/proof facts | **BLOCKED** | Engine works, but real services/projects/team/credentials/testimonials/contact/claims remain absent until evidenced. |
| G3 — admin authority/operations | **PARTIAL** | Exact S4 permissions work; `admin` cannot publish; named production owners, reviewer flow, and S5 UI remain unresolved. |
| G4 — privacy/security/file policy | **PARTIAL** | Local private Storage/media governance works; production uploads, scanning, retention, consent operations, and incident ownership remain unresolved. |
| G5 — platform/region/recovery | **SAFE-DEFERRED** | Local only; no cloud project, remote link, production bucket, region, backup promise, DNS, or deployment. |
| G6 — repository/toolchain | **PARTIAL** | Exact pnpm/Supabase pins, lockfile, CI, resets, tests, and build pass; local Node is `24.18.1` versus pinned `24.20.0`, plain pnpm is `11.19.0`, Git has no baseline commit, and hosted ownership remains open. |

G1–G5 have not been silently upgraded by synthetic evidence or implementation capability.

## 39. Remaining REAL blockers

- Client/business evidence and approved wording for every real public record.
- Brand selection, vector sources, ownership/right-to-use, and font licensing.
- Project permissions and asset-specific media rights/consent.
- Named factual, qualified, content, privacy/legal, security, Storage, incident, and release owners.
- Production upload limits, scanning/quarantine, derivative generation, EXIF handling, backup, retention/deletion, signed delivery, and recovery objectives.
- Final role/reviewer/publisher workflow and whether two-person approval/revisions/scheduling are needed.
- Cloud account/region/plan/secret/DNS/deployment/recovery decisions for later authorized slices.
- Exact local Node patch parity (`24.20.0`) for workstation parity with CI.

Intentionally deferred S5/S6 UI is not counted as a defect in the S4 kernel.

## 40. Manual user/client actions

1. Supply evidence through the checklist in `docs/CLIENT_EVIDENCE_BACKLOG.md`; do not send secrets.
2. Name authorized business/content/qualified-review/privacy/security/media/release owners and record who may approve which public wording.
3. Resolve final identity selection and rights, including vector masters and font licences.
4. Approve per-asset project/media public use, rights, consent, attribution, and expiry/review dates.
5. Approve production upload/scanning/quarantine/derivative/retention/backup/incident policy before enabling real uploads.
6. Upgrade the workstation to Node `24.20.0` when convenient for exact CI parity; no global pnpm change is required because `corepack pnpm@11.25.0` is deterministic.
7. Decide when the accumulated S0–S4 repository should receive its first reviewed commit; S4 did not invent Git identity, commit, or push.

## 41. S5 readiness

**READY for an explicitly authorized, synthetic-first admin content vertical slice.** The S4 engine supplies exact permissions, caller-scoped AAL2 commands, readiness reasons, typed data, private media governance, audit, version conflicts, and deterministic integration tests. Missing real content does not block building an admin workflow that visibly preserves draft/private/blocked states; it does block production publication and any real-content acceptance claim.

## 42. Recommended S5 scope

Implement one bounded admin content vertical slice—preferably **services/expertise**—using the existing S3 staff shell and S4 commands. It should include a permission-gated list, draft editor for approved structured fields, evidence/readiness checklist, optimistic-conflict handling, accessible save/publish feedback, audit visibility appropriate to the role, and tests for AAL1/permission/validation/conflict states. Use conspicuous synthetic records only; do not add a universal page builder, media library, real client content, S6 public rendering, uploads, scheduling, analytics, cloud resources, or deployment.

**S5 was not executed.**
