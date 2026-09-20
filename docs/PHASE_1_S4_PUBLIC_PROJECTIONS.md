# S4 Public Projections

**Status:** local anonymous/public-read boundary  
**Date:** 5 September 2026

## Projection set

S4 exposes only these named views to `anon` and `authenticated` callers:

`published_services`, `published_projects`, `published_project_media`, `published_posts`, `published_pages`, `published_page_sections`, `published_team_members`, `published_testimonials`, `published_credentials`, `published_navigation_items`, `published_site_settings`, and `published_project_claims`.

Every view uses explicit columns. There is no `SELECT *`. The projection set is intentionally boring: a future UI can consume stable public fields without receiving reviewer notes, evidence source references, rights notes, or arbitrary settings.

## Execution and RLS

The final views are owner-evaluated (`security_invoker=false`) and `security_barrier=true` on PostgreSQL 17. Their explicit predicates call the S4 fail-closed eligibility helpers, while anonymous callers receive no `SELECT` privilege on editorial, evidence, claim, registry, settings, or media base tables. The public API is therefore the named projection surface only; no temporary base-table grant is required for a view query.

Authenticated content/media readers receive the explicit editorial read grants gated by `content.read`/`media.read`. Evidence, claims, rights, and verification tables are additionally gated by `claims.verify` or their bounded read capability. No browser role receives direct content/evidence/media writes.

## View safety

The public views omit:

- source object paths and raw Storage keys;
- internal evidence notes, source references, owners, reviewers, and consent references;
- rights-holder, rights-source, rights-note, and review metadata;
- raw credential/testimonial verification records;
- private setting namespaces/keys and non-allow-listed values;
- audit actor, request, or metadata fields.

Credential projections join only the approved public wording from `credential_verifications`; the owner-evaluated view does not expose the verification table as an anonymous API. The site-settings projection joins the structural allow-list and returns only namespace, key, and value.

## Effective-read predicates

The view predicates use the same functions as publication:

- `private.is_public_content` checks status, effective date, domain readiness, safe public paths, and every projected plain-text/structured value;
- `private.is_public_media_usage` checks eligible usage, current rights/provenance, safe English contextual metadata, and a currently publishable parent project;
- `private.is_public_navigation_item` checks a published menu, resolved safe internal/external URL, visible item, and safe English label;
- `private.is_public_setting` checks the allow-list, exact type/safe value, eligibility, and evidence/review when required;
- `private.is_public_claim` checks current verification, required evidence, and nonblank safe approved wording.

The boolean-only media-usage predicate has an explicit narrow grant to `anon` and `authenticated` for the reviewed public-read boundary. It returns no media fields and cannot mutate Storage or editorial rows; the final owner-evaluated projection does not depend on anonymous access to the private media tables.

The result is fail-closed effective content. A published row with a newly expired evidence record does not remain visible merely because no operator changed its lifecycle field.

## No public frontend yet

The views are the S6 delivery contract, not a live public website. No route is wired to expose them in S4, and no real RENZ record is seeded or promoted.
