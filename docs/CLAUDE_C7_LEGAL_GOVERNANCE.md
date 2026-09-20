# C7 — LEGAL GOVERNANCE

`/admin/settings/legal` — the Legal Center for Privacy, Terms and Cookies.

## Model

`legal_pages` (slug `privacy` | `terms` | `cookies`) holds one **draft**
(`draft_title`, `draft_body`, `draft_is_starter`, `version`) and the
**published** copy (`published_title`, `published_body`,
`published_revision`, `published_at`, `published_by`).
`legal_page_revisions` is append-only and stores every published revision
with its number, title, body, publisher and timestamp. The public site
reads only the published copy through `public_legal_page(slug)`.

## Starter drafts

The migration seeds three starter drafts, each opening with "DRAFT — …
not legal advice and must be reviewed and published by the RENZ owner".
They describe what the system actually does:

- **Privacy**: the site currently collects no visitor data; contact runs
  through WhatsApp and email; a Start-a-Project intake is planned (C8);
  invoices and purchase orders are shared through secure expiring links
  without a login; no analytics run yet; staff data is limited to accounts
  and audit trails.
- **Terms**: use of the website and of the shared document links.
- **Cookies**: no analytics or advertising cookies; only strictly necessary
  session cookies for staff sign-in; what would change if analytics were
  enabled later.

No jurisdiction, governing law, registration number, tax status or company
address is asserted. Those are for the owner (and their adviser) to add.

## Workflow

1. `update_legal_page_draft(slug, expected_version, title, body)`
   (`settings.legal.write`) replaces the draft, clears the starter flag and
   bumps the version. Audit `legal_page.update` records the page slug,
   version and actor — never the body.
2. `publish_legal_page(slug, expected_version)` (`settings.legal.publish`,
   Super Admin) refuses an untouched starter draft or an empty draft
   (`invalid_state`), copies the draft into a new revision, sets the
   published columns, audits `legal_page.publish` with slug and revision
   number, and emits the settings realtime pointer. The UI requires a
   second "Confirm publish" click.
3. `public_site_configuration()` reports which slugs are published; launch
   readiness requires Privacy and Terms to be published before
   Preview → Live.

Badges in the editor: "Starter draft", "Published · revision N", "Draft
differs from published". The editor is keyed by slug and version, so a
concurrent save shows the C4 outdated cue rather than overwriting edits.

## What is deliberately not built

- No free-form HTML: bodies are plain text rendered with paragraph and
  simple heading/list handling (`LegalBody`).
- No per-country variants, e-signature, acceptance tracking or consent log.
- No cookie banner (analytics arrives in C9; `consent_required` is a flag).
