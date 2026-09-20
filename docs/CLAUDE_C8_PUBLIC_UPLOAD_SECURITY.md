# C8 — PUBLIC UPLOAD SECURITY

Public file upload is a major boundary. C8 keeps it narrow.

## Architecture

- **Dedicated private bucket** `lead-intake` (provisioned by
  `scripts/storage.mjs` and the browser-test global setup): private, 10 MB
  per object, MIME allow-list. No `storage.objects` policy grants anonymous
  or authenticated roles anything; only the server credential reads or
  writes it. `storage:verify` proves anonymous list / read / upload are
  denied. The editorial media buckets and their permissions are untouched.
- **Route, not Storage**: the browser posts to `/api/intake/uploads` (same-
  origin check via `Origin` / `Sec-Fetch-Site`, a valid signed form token,
  the upload rate limit). The server validates and stores; the browser never
  receives a Storage URL or path.
- **UUID object names**: `<session uuid>/<random uuid>.<ext>`. The original
  filename is private metadata; visitor name, email, phone or description
  never appear in a path.
- **Upload session**: the first file creates a `lead_upload_sessions` row
  with a 2-hour expiry; the server returns a random 32-byte token that stays
  in component memory. Only its HMAC (`hashUploadToken`) is stored. Every
  later upload, removal and the final submission must present the token;
  another visitor's token is refused (`not_authorized`), a consumed or
  expired session is refused (`expired_session`).

## Validation (server-side, signature first)

`validateIntakeFile` ignores the extension and browser MIME:

| Check                                  | Outcome                                   |
| -------------------------------------- | ----------------------------------------- |
| Empty                                  | 422 `empty`                               |
| > 10 MB                                | 413 / 422 `too_large`                     |
| Signature not JPEG / PNG / WebP / PDF  | 422 `unsupported_type` (SVG, HTML renamed `.jpg`, executables, archives, office files, unknown binaries) |
| Type outside the upload policy         | 422 `policy` (PDF under images-only)      |
| PDF with `/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFile`, `/OpenAction` | 422 `active_content` |
| 6th file in a session                  | 409 `too_many_files`                      |
| Foreign session token                  | 403 `not_authorized`                      |
| Expired session                        | 410 `expired_session`                     |
| Bad / missing form token               | 400 `form_session`                        |
| Cross-origin                           | 403 `origin`                              |
| Upload rate limit (30 / hour)          | 429 `rate_limited`                        |

Limits are centralized in `src/features/intake/intake-policy.ts`
(`maxFiles 5`, `maxBytes 10 MB`, session TTL 2 h) — technical safety limits,
not business promises.

## Upload policy (typed setting)

`intake_settings.upload_policy`: `disabled` | `images_only` (default) |
`images_and_pdf`. Images-only is the safe launch policy: images pass the
signature check and cannot execute content. Launch Readiness reports
`images_and_pdf` as a warning because no malware scanner is integrated.

## Quarantine and review

Every attachment starts as `pending_review`. Staff with
`leads.attachments.read` open files only through
`/api/leads/attachments/[id]`, which asks `admin_lead_attachment_path`
(permission, AAL2, attachment bound to a lead, not rejected) and then mints
a **120-second signed URL** with the server credential. Images may preview
inline; PDFs are always delivered with `Content-Disposition: attachment`
so nothing executes inside the Admin origin. Staff mark a file **safe** or
**reject** it with a reason (`review_lead_attachment`); rejected files stay
on record but are no longer served. Attachments belonging to a submitted
lead are never deleted by tooling; the row-level FK is `RESTRICT`.

## Scanner boundary (C10)

`src/features/intake/scanning.ts` defines `IntakeScanner`; C8 ships
`NoScanner` (everything stays `pending_review`). C10 can register an
adapter without touching the intake flow. No external scanning service is
installed or called.

## Orphans and cleanup

Sessions that expire without a submission are found by
`intake_expired_upload_sessions` and removed (objects + rows) by
`intake_purge_upload_session`; `scripts/intake-cleanup.mjs` reports by
default and purges with `purge`. It also reports submitted-lead attachments
whose object is missing and objects the database does not know about, and
never deletes unknown production files or submitted-lead attachments.
