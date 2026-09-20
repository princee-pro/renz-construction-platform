# S4 Content and Evidence Model

**Status:** implemented local kernel; real RENZ facts remain unverified  
**Date:** 5 September 2026

## Design rule

The S4 database stores editorial material and the evidence that permits a particular public wording separately. A content row can exist as a draft without any evidence. It cannot become a public effective row merely because a status field says `published`.

The model does not infer RENZ facts from the creative boards, generated concepts, synthetic seeds, filenames, or an editor's assertion. A client-supplied source must be recorded, reviewed, and current before its wording can cross the public boundary.

## Content lifecycle

Existing content lifecycle remains intentionally small:

`draft → published → archived`  
`published → draft` for unpublication

S4 does not add `in_review`, `approved`, or `scheduled` to the publication status. Review is represented by evidence and review metadata. Scheduling and multi-person approval require an explicit later decision.

## Registries

Two bounded registries prevent arbitrary editor-defined public structure:

- `content_section_registry` contains structural keys such as `hero`, `proposition`, `expertise`, `selected_projects`, `process`, `proof`, `insights`, and `final_cta`. Registry rows describe allowed structure and its `homepage|page|any` scope; a forward trigger guard enforces that scope against the parent template. They contain no RENZ facts.
- `public_setting_registry` allow-lists structural namespaces/keys such as `brand.public`, `contact.public`, `social.public`, and `website.public`. The registry records type and whether evidence is required; it does not seed a phone number, address, URL, or social account.

Enabled page sections must exist in the registry. Because S4 has no approved per-section configuration schema, their JSON config must remain `{}`; a later slice must introduce each field through a reviewed forward migration rather than treating config as a generic component escape hatch. Public settings must be allow-listed, safe JSON, and HTTPS when the registered value type is a URL.

Localized body content is a database-enforced discriminated registry—not merely safe-looking JSON. Only exact `heading`, `paragraph`, `list`, and `link` shapes are admitted; raw markup, unknown keys/types, private admin/preview destinations, ambiguous backslash paths, and percent-encoded internal paths fail closed. TypeScript validates the same vocabulary before a caller reaches the database. At publication and every effective public read, a shared database predicate also checks every projected plain-text field; markup cannot bypass the block registry by moving into a title, summary, biography, attribution, credential wording, SEO field, navigation label, or other public column.

## Evidence records

`evidence_records` records:

- the bounded fact/claim being supported;
- `source_type` and `source_reference`;
- internal notes, owner, reviewer, and sensitivity;
- verification state, verified date, and review-due date;
- approved public wording;
- consent requirement, consent state, and consent reference;
- created/updated attribution and an optimistic `version`.

Required evidence is current only when it is `verified`, has a reviewer and verification date, is not past its review date, and has granted consent when consent is required. `expired` and `rejected` are explicit states, not missing data that can be silently treated as valid.

## Typed relationships

Evidence and claims use typed relationship tables:

| Domain | Evidence relationship | Claim relationship |
| --- | --- | --- |
| Service | `service_evidence` | `service_claims` |
| Project | `project_evidence` | `project_claims` |
| Insight | `post_evidence` | `post_claims` |
| Page | `page_evidence` | `page_claims` |
| Team member | `team_member_evidence` | `team_member_claims` |
| Testimonial | `testimonial_evidence` plus testimonial verification | — |
| Credential | `credential_evidence` plus credential verification | `credential_claims` |
| Navigation | `navigation_evidence` | — |
| Public setting | `setting_evidence` | — |

There is no generic `entity_type/entity_id` evidence table. Foreign keys prevent a relationship from pointing at an arbitrary string identity and make delete/review indexes inspectable.

## Claims

`material_claims` is for material wording that requires more than editorial taste: outcomes, metrics, savings, time, performance, safety, sustainability, compliance, credentials, or other consequential claims. `claim_evidence` connects each claim to required/current evidence. Public claim wording comes from `approved_public_wording`; raw internal claim text is not a public projection.

Claims are not automatically required for every paragraph. They become a publication dependency when a typed relationship marks them `required`.

## Domain readiness

The readiness functions are deliberately domain-specific:

- services require an English localization, meaningful scope/deliverables/exclusions/delivery wording, safe body blocks, SEO, current required evidence, and current hero media when present;
- projects require public-safe location granularity, project type/scope, RENZ role wording, review metadata, an English localization with SEO, a related publishable service, current evidence, and media/claim checks;
- insights require an English localization, body/SEO, publication date, review metadata, and required evidence when time-sensitive;
- pages require an approved template, an unambiguous literal public path, safe title/body/SEO, indexability, registered enabled sections, and current evidence;
- team records require approved localized content, review, consent, current evidence, and current portrait media when present;
- testimonials require exact approved wording, verification, consent, and approved attribution;
- credentials require exact identity, issuer/reference, verification, approved public wording, validity, and current typed evidence.

The readiness result is JSON with machine-readable reason codes. It is suitable for an eventual admin checklist but is not itself an admin UI.

## Provenance rule

Client originals remain byte-preserved under `references/client/originals/`. Creative references under `design/concepts/` and generated/demo/synthetic material can inform layout exploration only. They are not evidence for a completed RENZ project, service qualification, team record, testimonial, credential, or outcome.
