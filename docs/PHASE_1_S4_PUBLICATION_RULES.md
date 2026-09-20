# S4 Publication Rules

**Status:** implemented local command and database boundary  
**Date:** 5 September 2026

## The public rule

An item is public only when all of these are true:

1. its content lifecycle is `published`;
2. `published_at` is present and not in the future;
3. its domain readiness function returns an empty reason list;
4. required evidence is current;
5. required claim wording is current and approved;
6. media is an admitted provenance class with current rights, consent, derivative, and contextual text;
7. URLs, paths, sections, SEO, locale, and indexability pass the domain checks.

The projection predicates call the same readiness functions used by publication commands. A stale or expired dependency therefore disappears from effective public reads even if an operator forgot to change its parent status.

## Reason codes

The stable reason-code vocabulary is intentionally plain:

`missing_required_field`, `missing_verification`, `evidence_expired`, `evidence_rejected`, `rights_unknown`, `rights_expired`, `consent_missing`, `invalid_media_classification`, `media_not_ready`, `missing_alt_text`, `missing_related_service`, `seo_incomplete`, `invalid_url`, `unsafe_content`, `unsupported_block`, `unsupported_template`, `indexability_disabled`, `approved_wording_missing`, `missing_attribution`, `credential_expired`, `not_authorized`, `version_conflict`, `not_found`, and `unsupported_content_type`.

The server adapter never exposes raw database error text as an editorial response. Transport failures map to a redacted `rpc_error`; domain failures retain the database reason code and safe detail.

## Commands

The database exposes narrow commands rather than a generic privileged update endpoint:

- `check_publication_readiness` — read the structured checklist;
- `publish_content` and named publish facades — evidence-gated publication;
- `unpublish_content` and `archive_content` — hide/retire with expected version;
- `publish_navigation_menu` / `unpublish_navigation_menu` — bounded navigation changes;
- evidence creation/transition commands;
- media registration, rights update, asset promotion, and project-media promotion commands.

Every mutation is caller-aware, AAL2-aware, active-profile-aware, exact-permission-aware, version-aware, input-bounded, and audited with redacted metadata. Direct table writes remain denied to browser roles. The database also has publication GUC guards with `coalesce(current_setting(...), '')` so an absent session marker cannot pass a check through SQL `NULL` semantics.

## Concurrency

Mutable rows use explicit optimistic versions. A command locks the target, compares the caller's `expected_version`, returns `version_conflict` when the row changed, and increments the version exactly once on success. The command owns the publication session marker; callers cannot publish by setting a status field directly.

## Unpublication and expiry

Unpublication clears effective visibility through the publication status boundary and invalidates the affected collection/item tags. Archive preserves history and prevents a future public read. When evidence or rights pass their review date, the item is no longer eligible even before a manual archive operation; reconciliation and a future admin workflow can then flag the owner.

## S4 server adapter

`src/lib/content/operations.ts` is server-only and uses the caller-scoped Supabase SSR client. It does not import the secret client and does not accept a user id, role, or permission from the browser. Its inputs are parsed by the bounded Zod schemas in `src/lib/content/schemas.ts`; successful mutations call the centralized invalidation boundary in `src/lib/content/invalidation.ts`, using the tag vocabulary from `src/lib/content/cache-tags.ts`.

The local publication integration harness also executes a real optimistic-concurrency race: two independently authenticated AAL2 synthetic operators submit the same service version concurrently. Exactly one publication succeeds and the other returns `version_conflict`; the fixtures are then unpublished/archived and removed.

## Explicit omissions

S4 does not add a scheduler, revision diff UI, two-person approval, editor role, customer portal, public upload endpoint, visitor-saved draft, notification workflow, or public frontend. Those capabilities require separate authorization, policy, and UX decisions.
