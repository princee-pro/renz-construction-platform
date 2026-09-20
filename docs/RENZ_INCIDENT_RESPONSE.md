# RENZ incident response

C10 §148. Short, executable playbooks for the incidents this system can
plausibly meet. Every action here uses only product controls or the
Supabase dashboard; none require a developer at the keyboard except where
marked. Written 2026-09-20; owners of each role are DECISION REQUIRED
until go-live.

## Roles

| Role | Who (DECISION REQUIRED) | Does |
| --- | --- | --- |
| Product owner | RENZ owner (Super Admin) | decides, disables accounts, sets Preview mode, talks to clients |
| Platform operator | engineer with Supabase + hosting access | rotates keys, restores, redeploys |
| Data protection contact | named in the published privacy notice | handles a data-subject request or breach notification |

## A. Staff account compromised (lost phone, shared password, leaver)

1. Owner → Staff & Access → **Disable** the account. Effect is immediate:
   Supabase Auth bans the user, every session is refused by the workspace
   guard on the next request, and every database facade checks the
   profile status server-side.
2. If the person is coming back: **Reset password** (a new temporary
   password is shown once; give it privately) and **Reactivate**. They
   will be forced to choose a new password and to re-enrol the
   authenticator only if their factor was removed (Supabase dashboard →
   Authentication → Users → user → MFA factors → delete).
3. Review what they did: the Overview activity feed and the activity
   panels on the affected records (client, project, invoice) show who did
   what and when. Audit rows cannot be deleted by anyone.

## B. Owner lockout (lost authenticator, forgotten password)

- Password: the sign-in page's reset flow works only when SMTP is
  configured; otherwise the platform operator sets a new password from
  Supabase dashboard → Authentication → Users → **Reset password** and
  hands it over privately; the owner then sets their own from Security →
  Change my password.
- Lost authenticator: platform operator deletes the MFA factor in the
  Supabase dashboard; the owner is sent to enrolment at the next sign-in.
- The database refuses to disable or demote the last active Super Admin
  (trigger, proven by pgTAP and E2E), so no product action can lock the
  owner out completely.

## C. Secret leaked (service-role key, intake secret, task token)

1. Supabase dashboard → Settings → API → **rotate** the secret key (JWT
   secret rotation invalidates every session; publishable key rotation is
   only needed if it was misused).
2. Update `SUPABASE_SECRET_KEY` on the app host; redeploy (the app reads
   it at request time — a restart is enough).
3. Rotate `INTAKE_RATE_LIMIT_SECRET` and `RENZ_TASK_TOKEN` the same way
   (any 32+ character values). In-flight public form tokens become invalid
   for a few minutes; visitors simply resubmit.
4. Check the activity feeds for actions in the exposure window and the
   Supabase dashboard logs for API calls; check Storage for unexpected
   objects.
5. Purge the secret from wherever it leaked (chat, ticket, screenshot).

## D. Public form abuse (spam, floods, malicious uploads)

- Symptoms: Leads fills with junk; Notifications show intake spikes.
- The pipeline already rate-limits per visitor hash, checks a honeypot,
  verifies signed form tokens, limits files to 10 MB and sniffs their
  content, and stores attachments in a private bucket that only staff can
  fetch through a signed route.
- Actions: owner archives junk leads one by one from the lead page (there
  is no bulk "spam" action — a known gap, listed in the C10 report); if a
  flood continues, switch **Online intake** off (Settings → System →
  Online intake) — the public forms show the contact alternatives instead
  — and configure Cloudflare Turnstile if it was not set at launch.
- Attachments start as `pending_review`; staff mark each `safe` or
  `rejected` after looking at it in the browser. Never download or open
  one in another program before it is marked safe (Launch Readiness shows
  whether an automated scanner is wired; at the release candidate there
  is none, so review is manual).

## E. Site down or degraded

1. `https://<domain>/api/health` — the categories say which dependency
   failed (auth config, database, content, storage, signing, migrations)
   without exposing internals. The owner sees the same list under Settings
   → System → System health.
2. Database or storage `blocked`: check the Supabase status page and
   project dashboard; the app fails closed (public pages render the calm
   error state; admin shows "could not be loaded" states, never partial
   writes).
3. App error after a deploy: `RENZ_ROLLBACK.md` § 1.
4. Everything green but pages slow: Analytics → Website for traffic; the
   registers are paginated at 25 rows and the attention queues bounded
   (C10 scale test), so slowness at RENZ's volume points at the platform,
   not the product.

## F. Data loss or corruption

`RENZ_ROLLBACK.md` § 3 → `RENZ_BACKUP_RESTORE.md`. Take a dump of the
current state first; it is the only copy of what happened since the last
backup.

## G. Personal-data breach (client/lead data exposed)

1. Contain (A–C as applicable), record the timeline.
2. Establish scope from the audit log and access logs (Supabase dashboard).
3. The data protection contact establishes, with counsel, which law
   applies (the published privacy notice names the governing law) and
   what the notification deadlines are. This document deliberately
   records no statute or deadline: none has been verified for RENZ.
4. Inform affected people in plain language.

## Communication template (owner → clients/staff)

> We had a problem with our online system between HH:MM and HH:MM on
> DD Month. [What happened in one sentence.] [What we did.] [What, if
> anything, you need to do.] Your invoices, project records and messages
> are safe / were affected as follows: … Questions: renzconstruuction@gmail.com
> or WhatsApp.

(The email address above is the client-supplied spelling; do not "correct" it.)
