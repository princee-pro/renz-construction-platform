# C8 — ANTI-ABUSE

C8 introduces anonymous writes. Several layers apply to every submission;
none is the sole defence, and the database facade remains the authority.

## Layers (in order, `screenSubmission`)

1. **Server validation** — zod contracts on the Next server, then full
   re-validation inside `intake_submit_lead`.
2. **Identity** — `sha256 HMAC(INTAKE_RATE_LIMIT_SECRET, request address)`.
   The address comes from `x-forwarded-for` / `x-real-ip` (or `local`); the
   raw address is never stored, logged or shown in Admin. Rate-limit rows
   and upload sessions carry only the hash (the table constraint refuses
   anything that is not a 64-hex digest).
3. **Signed form token** — issued at render (`issuedAt.nonce.HMAC`).
   Verification refuses tampering, tokens older than 24 hours (expired form
   session) and submissions under 3 seconds after render (zero-time
   automation). Timing is supplementary and never blocks assistive
   technology or autofill in practice — the wizard cannot be completed in
   under 3 seconds by a person. The nonce doubles as the **idempotency
   key**.
4. **Honeypot** — a visually hidden, `aria-hidden`, `tabindex="-1"`,
   `autocomplete="off"` field. A filled honeypot is accepted quietly with a
   plausible reference and stores nothing.
5. **Turnstile (optional)** — renders only when
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set; the server verifies the token
   with `TURNSTILE_SECRET_KEY` (never in the client bundle). Unconfigured
   Turnstile is bypassed **only outside production**; in production it
   marks intake unavailable unless `RENZ_INTAKE_ALLOW_DEV_BYPASS=true`, a
   flag that exists for the browser-test server and is reported by Launch
   Readiness when set.
6. **Rate limiting** — `intake_rate_limit_hit(identity, scope, max, window)`
   in Postgres (fixed windows, opportunistic pruning after two days):

   | Scope    | Limit / hour / identity |
   | -------- | ----------------------- |
   | contact  | 5                       |
   | service  | 5                       |
   | project  | 3                       |
   | material | 3                       |
   | upload   | 30                      |

   A refusal shows a polite message with the retry window in minutes and
   offers WhatsApp and email; internal rules are not spelled out. Values are
   centralized in `intake-policy.ts` and chosen so shared office networks
   still work. If the limiter is unavailable the form fails closed to the
   WhatsApp / email fallback.

## Idempotency

The form token nonce becomes `leads.idempotency_key` (unique). A repeated
submission returns the same reference with `duplicate: true`; a concurrent
duplicate is caught on the unique constraint inside the facade. Rapid
double clicks therefore cannot create two leads even though the button is
also disabled while pending.

## Origin / CSRF

Forms use Next Server Actions (origin-validated by Next); the global
Server Action origin policy is untouched. The upload route handler
validates method, `Origin` / `Sec-Fetch-Site` and content shape itself.

## Public RLS

No role other than `service_role` can execute `intake_*`; anonymous cannot
select, insert, update or delete any lead table, list attachments, read
assignments or resolve attachment paths. A public reference is not a
credential: it retrieves nothing anywhere.

## Logging

Ordinary application logs never carry the enquiry text, email, phone,
attachment names, addresses, Turnstile tokens or form tokens. Audit rows
for public submissions carry only type, source and attachment count.

## Launch Readiness

Required in production: `INTAKE_RATE_LIMIT_SECRET` set (live intake is
refused without it). Recommended: Turnstile configured, test bypass flag
absent. Info: scanner adapter (C10). These environment checks are merged
into the C7 readiness page and the site-mode switch on the Next server;
database checks (privacy covers intake, upload policy, public contact,
intake enabled) live in `private.launch_readiness()`.
