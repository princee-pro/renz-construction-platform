# C8 LEADS — ARCHITECTURE

Entry point for public intake and the Lead CRM. Read this first, then
`CLAUDE_C8_PUBLIC_INTAKE.md`, `CLAUDE_C8_LEAD_PIPELINE.md`,
`CLAUDE_C8_CONVERSION.md`, `CLAUDE_C8_PUBLIC_UPLOAD_SECURITY.md` and
`CLAUDE_C8_ANTI_ABUSE.md`.

## What C8 is

The public website stops being informational. A visitor with no account can
send a general contact enquiry, a service enquiry, a real seven-step
Start-a-Project brief or a material enquiry, optionally attach supporting
files, and receive a human-readable reference. Staff receive the lead in
the Control Room immediately and handle it through one connected chain:

```
PUBLIC VISITOR → LEAD → QUALIFICATION → CLIENT → OPERATIONAL PROJECT
                                                   ├── case study (C3/C4)
                                                   ├── invoices (C5)
                                                   ├── contractors (C6)
                                                   └── procurement (C6)
```

There is no separate public-contact database: leads live beside C4 clients
and projects, and a converted lead points at the client and project it
produced. Nothing is emailed or messaged automatically (C9 owns the
Notification Center); realtime Control Room arrival is the delivery.

## Domain

`supabase/migrations/20260915100000_establish_c8_leads.sql` retires the
empty S2 lead skeleton (`lead_stages`, `project_briefs`, `contact_messages`,
`lead_services`, the subtype triggers) and creates:

| Table                     | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `leads`                   | Shared identity/contact/status; `lead_type`, `source_channel`, `status`, assignee, `client_id`, `operational_project_id`, stage timestamps, consent revision, idempotency key |
| `lead_project_details`    | Start-a-Project answers (need, type, scale, timing, budget, stage)       |
| `lead_service_details`    | Service enquiry (service key, context, requirement, timing)             |
| `lead_material_items`     | Visitor-stated material needs (description, quantity, unit, spec)       |
| `lead_attachments`        | Private quarantine metadata (`scan_status`, UUID object path)           |
| `lead_upload_sessions`    | Temporary upload ownership (token hash, expiry, consumed)               |
| `lead_notes`              | Private staff notes                                                     |
| `lead_contact_logs`       | Lightweight interaction log (call, WhatsApp, email, meeting, site visit) |
| `lead_stage_history`      | Authoritative stage transitions (`from_status`, `to_status`, reason)    |
| `lead_events`             | Bounded activity timeline (assigned, converted, reviewed, …)            |
| `lead_reference_counters` | `RENZ-LEAD-YYYY-NNNNNN` numbering (race-safe upsert)                    |
| `intake_settings`         | Typed singleton: intake enabled, upload policy, lead thresholds         |
| `intake_rate_limits`      | Anti-abuse counters keyed by an HMAC identity                           |

Every table is default-deny with forced RLS and revoked privileges. Access
is only through `SECURITY DEFINER` facades with an empty `search_path`.

## Two boundaries

1. **Public submission** — the Next server (server actions and the upload
   route handler) validates, screens for abuse and calls the `intake_*`
   facades with the server credential. Those facades are granted to
   `service_role` only; anonymous and authenticated roles cannot execute
   them, and no table accepts anonymous inserts. See
   `CLAUDE_C8_PUBLIC_INTAKE.md` and `CLAUDE_C8_ANTI_ABUSE.md`.
2. **Staff CRM** — `admin_*` reads and the write facades require AAL2, an
   active profile and an exact permission: `leads.read`, `leads.write`,
   `leads.assign`, `leads.convert`, `leads.attachments.read` (admin and
   super admin hold all five). Every write takes `expected_version`, returns
   `version_conflict` with `current_version`, audits with
   `private.s4_audit` and emits a value-free realtime pointer
   (`entity_type = 'lead'`).

## Frontend

```
src/features/intake/      policy (limits, vocabularies), contracts (zod),
                          server primitives (identity hash, form token,
                          honeypot, Turnstile, rate limit), files (signature
                          validation, quarantine storage), scanning boundary,
                          server actions, page context
src/components/site/intake/ contact / service / material forms, the seven-step
                          wizard, upload field (lazy), Turnstile widget,
                          shared accessible fields
src/app/(public)/contact, /enquire/service, /enquire/materials,
src/app/(public)/start-a-project (+ /success)
src/app/api/intake/uploads          public upload route (POST / DELETE)
src/features/leads/       contract, data, actions, components (register +
                          pipeline, Lead 360, create form, Control Room module)
src/app/admin/(workspace)/operations/leads{,/new,/[leadId]}
src/app/api/leads/attachments/[attachmentId]  permission-checked signed delivery
```

## Integrations

- Control Room: `LeadOverviewSection` (exact counts, recent submissions,
  deterministic lead action queue) and `lead` in the realtime entity list.
- Quick Find: `LEAD` kind by reference, name, company (`leads.read`).
- Client 360: originating leads; Project command center: "From lead" link.
- Settings → System: intake enabled, upload policy, thresholds
  (`intake_settings`, `settings.system.write`).
- Launch Readiness: real intake checks (privacy covers intake, upload
  policy, public contact, anti-abuse secret, Turnstile, scanner, test
  bypass flag); Preview → Live is refused while a required check blocks.
- Privacy: the C7 privacy starter draft is replaced by a DRAFT revision that
  describes real intake; it is never auto-published.

## Verification

- `supabase/tests/database/016_c8_leads.sql` (112 assertions) and the
  rewritten `004_lead_integrity.sql` (24); inventories `001/003/005/006/007`.
- `scripts/verify-c8.mjs` (`pnpm c8:verify`) and
  `scripts/verify-lead-concurrency.mjs` (two-session conversion race, run
  by `db:verify`).
- `tests/e2e/c8-intake.spec.ts` (`pnpm test:e2e:c8`, 8 tests).
- `tests/unit/c8-intake-contracts.test.ts`.
- `scripts/intake-cleanup.mjs` (`pnpm intake:cleanup[:purge]`).
