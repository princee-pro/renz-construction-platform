# C8 — PUBLIC INTAKE

Four public entry points, one authoritative submission path, no visitor
account.

## Entry points

| Route                       | Lead type | Source            | Notes                                                   |
| --------------------------- | --------- | ----------------- | ------------------------------------------------------- |
| `/contact`                  | general   | `website_contact` | Compact form beside the existing email / WhatsApp block |
| `/enquire/service?service=` | service   | `service_page`    | Service preselected from the service page CTA           |
| `/start-a-project`          | project   | `start_a_project` | Seven-step wizard; success at `/start-a-project/success?ref=` |
| `/enquire/materials`        | material  | `material_enquiry`| Multiple visitor-stated items; an enquiry, not an order |

Service pages carry "Enquire about this service", "Start a Project"
(`?service=<slug>&source=service/<slug>`) and a WhatsApp link. Case studies
carry "Discuss a similar project" (`?source=project/<slug>`). URL
preselection is validated against the approved vocabularies
(`parseIntakePreselection`); anything else is ignored.

## Contact requirements

Full name plus at least one of email or phone / WhatsApp. Company is
optional. Values are trimmed and normalized in Postgres
(`private.normalize_email`, `private.normalize_phone`); the display form is
kept for staff. Nothing sensitive is requested (no IDs, dates of birth,
bank details).

## Start-a-Project steps

1. **Need** — Design, Executions, Hybrid, Supervision, Consultations, Not
   sure, Something else (no internal taxonomy required).
2. **Context** — project type (residential, commercial, hospitality,
   community, industrial, renovation, other), location / area (free text,
   no coordinates), site state, short description.
3. **Scale** — floor area, floors, rooms / units, site area, Small / Medium /
   Large / Not sure. Nothing is required.
4. **Parameters** — desired start / completion, current stage (idea →
   construction underway), budget: Not sure / Prefer not to say / a range
   with currency and optional min / max. No universal amounts are
   hard-coded.
5. **Supporting material** — optional images (policy-controlled; see
   `CLAUDE_C8_PUBLIC_UPLOAD_SECURITY.md`).
6. **Contact** — name, email, phone / WhatsApp, company, the visitor's
   preferred channel (WhatsApp / Email / Phone / No preference — this never
   creates a RENZ call CTA).
7. **Review & submit** — readable summary with per-section Edit, privacy
   acknowledgement, submit.

Values persist across Back / Continue. Non-sensitive draft fields (never
name, email, phone, files) survive a refresh through `sessionStorage` and
are cleared on success. Files are never held in the browser.

Accessibility: `<ol aria-label="Steps">` with `aria-current="step"`, a
polite live region announcing "Step N of 7", the step heading receives
focus on change, per-step error summary with links, field-level errors via
`aria-describedby`, no drag, no colour-only meaning, 320px-safe.

## Submission

Every form posts to a server action (`src/features/intake/intake-actions.ts`)
that:

1. checks intake is enabled (published `intake_settings` flag),
2. parses the FormData with zod (`intake-contract.ts`),
3. runs the anti-abuse chain (`CLAUDE_C8_ANTI_ABUSE.md`),
4. reads the published privacy revision (`public_legal_page('privacy')`),
5. calls `intake_submit_lead(payload)` with the server credential.

`intake_submit_lead` re-validates every field, verifies upload ownership,
creates the lead, the type-specific rows, binds attachments, records the
initial `null → new` stage row and the `submitted` event, audits a minimal
`lead.public_submit` (type, source, attachment count — never contact data
or text), emits the realtime pointer and returns **only** `{ reference,
lead_type, duplicate }`. A repeated idempotency key returns the same
reference and creates nothing; a concurrent duplicate is caught on the
unique constraint.

## Result and failure states

Success shows the reference (`RENZ-LEAD-YYYY-NNNNNN`), a copy button,
what happens next (no response-time promise) and "Continue on WhatsApp"
prefilled with the reference through `wa.me` only. Failure states keep the
entered values: validation (field errors + summary), zero-time submission,
expired form session, anti-bot failure, rate limit (polite message plus
WhatsApp and email fallback), intake paused, server unavailable.

## Privacy acknowledgement

Unchecked by default, links to `/privacy`, names the published revision.
The submission stores `consent_revision` (0 when no privacy page is
published yet) and `consented_at`; never the policy body. There is no
marketing consent.
