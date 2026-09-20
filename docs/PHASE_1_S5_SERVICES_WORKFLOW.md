# RENZ Phase 1 / S5A Services Workflow

**Status date:** 6 September 2026  
**Content readiness:** Synthetic engineering fixtures only; real RENZ facts remain blocked

## 1. Workflow contract

S5A implements one complete administration vertical:

```text
bounded register
  → private draft identity
  → structured draft editing
  → evidence registration
  → evidence review
  → authoritative readiness
  → private preview
  → publish
  → unpublish or archive
```

Save and publish are independent operations. A draft save never changes publication state. Publication always re-evaluates the S4 database readiness contract and cannot be achieved by changing a form field.

## 2. Register

`admin_list_services` returns explicit JSON fields from one bounded database call. It supports normalized search over name/slug, exact status, exact locale, stable `updated_at DESC, id DESC` ordering, and an opaque `(updated_at,id)` keyset cursor. The application requests 25 items; the database rejects sizes outside 1–50 and fetches at most `page_size + 1` to establish a next cursor.

One lateral localization selection prevents duplicate Services rows when no locale filter is provided. Readiness and blocker count are produced within the database payload, avoiding per-row application queries. The UI distinguishes a genuinely empty register from filters with no matches.

## 3. Draft creation

The create form accepts only the initial private identity:

- name;
- normalized public slug;
- BCP 47 locale.

`createServiceAction` requires an authenticated, active, AAL2 actor with `content.write`, validates the exact input, and calls `create_admin_service_draft`. The database creates a Draft service and its localization atomically, records a redacted creation event, and returns the identifier. Duplicate route identity fails without clearing entered values.

## 4. Editor model

The editor exposes public/editorial fields already owned by S4:

- name, slug, locale, sort order, and featured intent;
- summary;
- scope, deliverables, exclusions, client inputs, delivery wording, and professional terminology;
- structured body blocks;
- SEO title and description.

System identifiers, actor UUIDs, timestamps, raw publication status, publication timestamps, arbitrary JSON, and audit metadata are not editable. Published and archived records are read-only; a published record must be explicitly unpublished before editing.

## 5. Structured body contract

Only four exact block types are admitted:

| Block | Fields |
| --- | --- |
| Heading | `level` (`2` or `3`), plain `text` |
| Paragraph | plain `text` |
| List | bounded array of plain items |
| Link | plain `label`, approved internal or HTTPS `href` |

The editor supports add, remove, move up/down, and allowed-field editing. Zod rejects unknown fields, unknown block types, raw markup, and executable protocols. Preview renders each block through an explicit React branch; it does not use `contenteditable`, Markdown HTML, or `dangerouslySetInnerHTML`.

## 6. Draft save and concurrency

Each save submits both the service and localization expected versions. `update_admin_service_draft` locks the target rows, refuses non-Draft records, compares both versions, applies explicit fields, increments both versions exactly once, and records only allow-listed changed-field names in the audit event.

When either expected version is stale:

- no submitted field overwrites the authoritative row;
- the UI returns `conflict`, not a generic success/failure;
- the editor keeps all local values;
- current safe version metadata is returned;
- a native confirmation dialog offers an explicit reload;
- no automatic merge or resubmission occurs.

The browser acceptance uses two independent Super Admin contexts. Actor A saves first; Actor B's stale save is rejected, Actor A remains authoritative, and Actor B's typed value remains visible.

## 7. Recoverable failure and dirty state

Controlled values are held only for the lifetime of the editor page. Server Action results can represent validation error, authorization error, re-authentication requirement, retryable error, conflict, or success. Errors include a form summary and field messages, and focus moves to the first invalid control or summary.

`beforeunload` is registered only while the serialized editor differs from its last clean snapshot. Same-origin link navigation while dirty opens a native confirmation dialog. Successful save advances both version fields, establishes a new clean snapshot, announces success, and refreshes server-owned data.

## 8. Evidence workflow

Editors with `content.write` may register a bounded evidence reference against the current service. The operation accepts the exact supported source type, reference, fact claim, sensitivity, required flag, consent requirement, and purpose. It does not accept an upload or arbitrary target type.

Evidence proceeds independently:

```text
Unverified → In review → Verified
                       ↘ Rejected
Expired or Rejected → In review
```

Draft editors can create and submit; only an actor with `claims.verify` can verify or reject. The review facade row-locks the evidence and accepts a decision only from the exact `in_review` state, so direct RPC use cannot bypass submission. Evidence verification and consent remain separate facts: when consent is required, publication readiness remains blocked until consent is explicitly recorded as granted. Every command checks that the evidence belongs to the named service and uses its expected version.

## 9. Readiness and publication

The editor displays `content_readiness('service', id)` without duplicating readiness rules in React. Reasons remain actionable, field-specific when applicable, and fail closed for missing overview/scope/deliverables/exclusions/delivery copy/SEO/structured content or current required evidence.

| Operation | Required permission | Result |
| --- | --- | --- |
| Save draft | `content.write` | Draft fields only |
| Register/submit evidence | `content.write` | Evidence lifecycle only |
| Verify/reject evidence | `claims.verify` | Evidence decision only |
| Publish/unpublish | `content.publish` | S4 atomic publication command |
| Archive | `content.archive` | Retained, non-editable record |

The current conservative role mapping means `admin` can read/write drafts and evidence but cannot verify claims, publish, unpublish, or archive. `super_admin` holds those S5A authorities. UI visibility reflects this, while direct Server Actions and database functions enforce it again.

## 10. Preview and activity

Private preview requires AAL2 plus `content.read`, is dynamic with zero revalidation, emits noindex metadata, and uses only the explicit service/localization payload. It is labeled `DRAFT PREVIEW / NOT PUBLIC`. Anonymous projection behavior remains exclusively the S4 published projection; Draft, unpublished, and archived content are absent.

Overview activity is bounded to eight events and service detail activity to twelve. Rendering exposes action, outcome, and time; sensitive field values, credentials, evidence bodies, and staff identity are not placed in audit metadata.

## 11. Database command surface

The forward S5A migration adds one list index and eight narrow functions:

- `admin_service_overview()`;
- `admin_list_services(...)`;
- `admin_get_service(...)`;
- `create_admin_service_draft(...)`;
- `update_admin_service_draft(...)`;
- `create_service_evidence(...)`;
- `submit_service_evidence_for_review(...)`;
- `review_service_evidence(...)`.

Each function has an empty `search_path`, revokes default execution from `PUBLIC`/`anon`, grants only `authenticated`, and evaluates the S3 fresh-AAL2 permission helper. No privileged service key is used by application mutations.

## 12. Out-of-scope content

All committed seed and acceptance values are conspicuously `SYNTHETIC`. S5A does not assert actual RENZ services, scope, qualifications, delivery language, projects, media, contacts, credentials, or proof. No synthetic record is left published after browser teardown.
