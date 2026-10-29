# Security reporting and change policy

RENZ is a client platform shared as source code for review and handoff. The current branch is the review baseline; no production deployment or staffed public vulnerability-response service is claimed. Read [the current security model](docs/SECURITY_MODEL.md#26-current-implementation-review--23-october-2026) for implemented controls, historical context and known limitations.

## Report privately

No approved public security email or disclosure contact has been supplied. Do not invent or use an unverified contact. If the repository's GitHub Security tab offers **Report a vulnerability**, use that private reporting flow. Otherwise contact the repository owner through an existing, owner-approved private channel and request a secure report location. Feature availability must be checked on the actual repository; this file does not imply that private vulnerability reporting is enabled.

Do not create a public issue or public proof of concept containing an exploitable vulnerability, credential, bearer document link, MFA secret, staff account detail, private client record or attachment. Ordinary non-sensitive regressions may use the normal repository issue/PR process.

Include the affected commit, source path or redacted route pattern, prerequisites/role/assurance level, synthetic reproduction steps, expected versus actual behavior, impact and a proposed containment if known. Use the local synthetic stack. Never test production, other users' data or provider accounts without explicit authority. Do not paste a working invoice/PO token into a report; use `/i/[redacted]` or `/po/[redacted]`.

The owner must confirm receipt, investigation ownership and any coordinated disclosure schedule. This repository does not promise an unapproved response deadline or bug bounty.

## Handle a suspected credential exposure

Stop the affected publication/push and notify the owner privately with affected paths, commits and credential type; never repeat the credential value. Preserve evidence. Revoke/rotate through the authorized provider and inspect access/audit scope. Replacing a current file does not remove an exposed secret from history. History rewriting, force-push, destructive data repair or production changes require the owner's explicit authorization.

For an account incident, disable the affected staff profile, revoke Auth sessions using the approved operator flow and check fresh database denial. For data/media recovery use [the backup/restore runbook](docs/RENZ_BACKUP_RESTORE.md) and the current deployment handoff. Database backups do not include Storage objects automatically.

## Security expectations for contributors

- Keep real environment files, credentials, session fixtures, temporary staff passwords, TOTP/recovery secrets, database dumps and confidential exports out of Git, logs, URLs, screenshots and issue attachments. Use placeholders and clearly synthetic local records.
- Preserve per-request caller-scoped clients, current AAL2/profile/permission checks, explicit grants/RLS, narrow reviewed definer facades, financial constraints and append-only history. A hidden button or an authenticated session alone is not authorization.
- Review every new caller of the server-only service client because it bypasses RLS. Never expose that key through `NEXT_PUBLIC_`, client imports, generic errors or telemetry.
- Keep media provenance, rights/consent and concept-versus-real-project controls intact. See [the asset/licence register](docs/ASSET_AND_LICENSE_REGISTER.md).
- Add forward-only reviewed database migrations for schema/security changes and verify a clean local reset, types and allow/deny contracts. Do not edit applied migrations or bypass a denial just to make a UI flow succeed.
- Run applicable repository checks and record exact results. `node scripts/scan-secrets.mjs` scans committable text, not all binary files or Git history; review the staged files and history separately before publication.
- Keep staging/production isolated from local test data, remove development bypass switches, use least-privilege provider access and obtain explicit deployment/go-live approval.

Known source-review items and remaining operational decisions are listed in [Security Model §26](docs/SECURITY_MODEL.md#26-current-implementation-review--23-october-2026). A passing local test suite does not close those items automatically.
