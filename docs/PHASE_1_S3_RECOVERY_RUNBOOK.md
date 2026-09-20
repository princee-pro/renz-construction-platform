# RENZ Phase 1 / S3 recovery runbook

## Local developer recovery

1. Confirm the local Docker engine is healthy.
2. Use the exact project CLI: `corepack pnpm@11.25.0 db:start`.
3. Never stop or reset an unhealthy project stack without inspecting its project label and ownership.
4. Use `corepack pnpm@11.25.0 db:reset` only for synthetic local data.
5. Run `corepack pnpm@11.25.0 db:verify` and `corepack pnpm@11.25.0 auth:verify`.

## Administrator recovery policy

- There is no bypass query parameter, environment bypass, hardcoded account, or master password.
- For a local installation with no existing Super Admin assignment, an operator may run `pnpm auth:bootstrap -- --email operator@example.test` after loading the local URL and server secret privately. The command invites exactly one pending-MFA identity and uses the one-shot database transaction; it refuses subsequent bootstrap attempts. It never stores the email or prints credentials.
- A lost authenticator requires the approved operational recovery owner and an audited factor reset. S3 does not invent recovery codes.
- The last active `super_admin` cannot be disabled or removed by database trigger.
- If an administrator is compromised, disable the profile, revoke sessions through the approved Auth operation, rotate affected credentials, and inspect redacted audit events.
- Password recovery must use the configured Auth recovery flow and must not assign roles or bypass MFA.

## Production prerequisites not yet executed

Production SMTP, recovery ownership, incident contacts, secret rotation cadence, session revocation procedure, backup/restore ownership, and legal notification obligations require G4/G5 decisions. No production account or provider secret is requested or stored by S3.
