# Deployment handoff

Reviewed against repository source on **23 October 2026**. The GitHub migration is a source/documentation publication only. **Do not deploy, create provider resources, attach a domain, configure a paid service or switch the site Live as part of that mission.** This guide is for the incoming developer's separately authorized staging/release work.

The owner-approved direction is **private GitHub → Netlify application → Supabase database/Auth/MFA/Storage/Realtime → Cloudflare DNS and supporting services**. [R1 production decisions](RENZ_R1_PRODUCTION_DECISIONS.md) records that selection. Repository configuration is preparation, not proof that any account/site/project/Worker/bucket exists. The historical R1 report's early references to undecided hosting, Vercel Cron or no analytics provider are superseded by its owner-approved architecture update.

## Authoritative runbooks

- [RENZ_PRODUCTION_DEPLOYMENT.md](RENZ_PRODUCTION_DEPLOYMENT.md): detailed deployment/bootstrap/configuration steps.
- [RENZ_R1_PRODUCTION_DECISIONS.md](RENZ_R1_PRODUCTION_DECISIONS.md): owner choices and missing inputs.
- [RENZ_GO_LIVE_CHECKLIST.md](RENZ_GO_LIVE_CHECKLIST.md): acceptance and explicit release decision.
- [RENZ_BACKUP_RESTORE.md](RENZ_BACKUP_RESTORE.md), [RENZ_ROLLBACK.md](RENZ_ROLLBACK.md), [RENZ_INCIDENT_RESPONSE.md](RENZ_INCIDENT_RESPONSE.md): recovery and incident operation.
- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md), [TESTING_AND_QA_GUIDE.md](TESTING_AND_QA_GUIDE.md): exact current variables and verification boundaries.

Preserve their dated statements. The corrections below avoid treating old migration counts, optional-Turnstile wording or historical blockers as current configuration facts.

## Compatibility and cost review

`netlify.toml` uses Node **24.20.0**, pnpm **11.25.0**, a frozen install and Next build, with `@netlify/plugin-nextjs`. Next **16.4.1** and matching ESLint plugin **16.4.1** are pinned after the bounded dependency remediation; Sharp is **0.35.5** and the workspace override fixes `source-map-js` at **1.2.2**. The [OpenNext Netlify adapter](https://github.com/opennextjs/opennextjs-netlify) admits Next >=13.5, and [Netlify documents App Router/SSR/image integration](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). That supports the chosen direction; the precise deployed adapter/Next/runtime combination, Node proxy, signed media, caches and PDF font tracing must be observed on staging. The adapter is intentionally provider-updated rather than lockfile-pinned: record its actual version in deployment evidence.

Free-tier facts rechecked against official sources on 23 October 2026:

| Service                | Relevant current constraint                                                                                                                                                                                                                                                                                                                                                             | Deployment implication                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Netlify Free           | Credit-based Free plan has **300 credits/month**, hard limit and no auto recharge. [Plan documentation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)                                                                                                                                                        | Measure build/function/bandwidth usage. A free plan is not unlimited production capacity. Confirm actual account plan and private Git integration before connecting.                                           |
| Supabase Free          | **Two active projects** across eligible owner/admin organizations; **500 MB database**, **1 GB file storage** per project; automatic backups/PITR excluded; inactivity can pause projects. [Billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [pricing](https://supabase.com/pricing), [pausing](https://supabase.com/docs/guides/platform/free-project-pausing) | Staging + production uses the normal free active-project allowance. Inventory existing projects first; backups and availability need an explicit operating plan. Do not assume provider daily backups on Free. |
| Cloudflare R2 Standard | Free usage includes **10 GB-month**, 1 million Class A and 10 million Class B operations; usage beyond allowance is billable. [Pricing](https://developers.cloudflare.com/r2/pricing/)                                                                                                                                                                                                  | Daily/monthly retained database dumps **plus separate media backups** must be sized. No promise of perpetual zero cost.                                                                                        |
| R2 activation          | Requires an R2 subscription/checkout. [Setup](https://developers.cloudflare.com/r2/get-started/)                                                                                                                                                                                                                                                                                        | Enabling it is an owner account/billing action, outside this mission. Do not create it under implied free-tier permission.                                                                                     |

Confirm Worker/Turnstile/Web Analytics limits and GitHub Actions included minutes against the actual account before activation. Do not purchase upgrades, recharge credits or enable optional billable features without explicit owner approval.

The source repository is now the private [princee-pro/renz-construction-platform](https://github.com/princee-pro/renz-construction-platform). **Actions remains disabled**: the authenticated GitHub billing/quota API returned 404, so this mission could not ensure that runner usage would remain free. Local verification and workflow definitions are supplied. The owner must confirm a **$0 spending control** and included-minute availability before explicitly enabling Actions. Optional integration jobs are manually requested; the backup workflow also requires its separate opt-in. No cloud schedule is active.

## Missing authority and inputs

Before provisioning, obtain the actual domain name and DNS control, Netlify team/site access, Supabase organization/project access, Cloudflare access, first production owner's exact sign-in email, backup key custodian/operator, incident/data-protection contacts and release approver. Confirm the supplied business email spelling through the owner without silently changing it.

Staging region was approved as **eu-central-1 / Frankfurt**. Measure Netlify-function-to-Supabase latency there before choosing production region. Production domain, deployed host settings, provider account state and production region have no verified values in this repository.

Use different staging/production Supabase projects and credentials. Keep Netlify deploy-preview/branch contexts explicit so untrusted branches cannot access production secrets. Owner Site mode **Preview** controls noindex; it is distinct from `RENZ_CLIENT_PREVIEW`, which must be absent from all cloud candidates.

## Future staging sequence

1. **Select a reviewed commit.** Reproduce a clean install/static gate, then local C10/R1 checks. Record outstanding failures honestly, including host-limited timeouts. Review migrations, media provenance, Git history and the release diff. No automatic deploy-on-push configuration is needed for the GitHub handoff.
2. **Provision the authorized isolated staging project.** PostgreSQL 17, email/password provider enabled, public sign-ups disabled, TOTP enabled; configure actual Site URL and admin redirect allow-list. No public registration route exists. Owner/operator-assisted password recovery is the shipped decision; SMTP and self-service mail are a separate optional change.
3. **Apply schema only.** After independently verifying linked-project identity, use the pinned CLI. Commands in this block mutate the authorized remote database and are for that future task:

   ```powershell
   corepack pnpm@11.25.0 exec supabase link --project-ref <approved-staging-ref>
   corepack pnpm@11.25.0 exec supabase db push --dry-run
   corepack pnpm@11.25.0 exec supabase db push
   corepack pnpm@11.25.0 exec supabase db lint --linked --fail-on warning
   ```

   At inspection there are **50 migrations**, latest **20260924100000**. Compare remote history with exact filenames/versions, not an old report's count. Do not use `--include-seed`, `db reset --linked`, or `supabase/seed.sql` on production. Append-only migrations are the schema source; dashboard-only schema edits create drift.

4. **Provision three private buckets.** `editorial-originals`, `editorial-derivatives`, `lead-intake`, using the reviewed `scripts/storage.mjs` API provisioner with explicitly approved target URL/secret. The helper still reads local CLI status before environment overrides, so it currently needs a healthy local stack even for remote provisioning. Verify the effective target and use a dedicated private shell; the migration files do not create object bytes. The script may harden existing bucket options, so review current state first.
5. **Bootstrap the real owner.** Follow the production runbook's dashboard user creation and one-shot `private.bootstrap_super_admin` transaction exactly, with `profiles.must_change_password=true`. Hand over the generated temporary password privately. Owner enrolls their **own** authenticator, changes password and verifies Overview/Staff & Access/System Health. Do not use `local:owner`, synthetic fixture actors or a developer's saved TOTP factor. Never change the bootstrap's one-shot/last-owner guards.
6. **Configure the app environment.** Populate the assigned project URL/publishable key at build time and server secret, intake HMAC secret, matching Turnstile pair and optional task token at server runtime. **Enabled production-mode intake requires both Turnstile keys in current source.** `RENZ_CLIENT_PREVIEW` and `RENZ_INTAKE_ALLOW_DEV_BYPASS` must be absent. Build metadata is computed by `next.config.ts`; canonical URL/contact/legal/analytics settings belong in the owner-published configuration, not invented environment variables.
7. **Build an isolated Netlify candidate after authorization.** Use the committed `netlify.toml`. Observe Node `src/proxy.ts`, `/api/health`, private signed media redirects/range video, image optimization/cache behavior and all PDF routes. `pdfkit` is externalized and must carry its AFM files into the function trace. Serverless filesystems hold no durable state. Record adapter version, deployment id and source SHA.
8. **Populate approved staging content.** Rehearse using safe labeled concept studies and synthetic operational records. Review `website-seed-content.mjs` before any remote run: it can create a synthetic Super Admin when explicit publisher credentials are missing, and it publishes content/media. It is not a safe production bootstrap command. Use actual authorized owner actions for approved production content; local database seeds and Storage volumes are not included in Git.
9. **Connect jobs only when their targets/credentials are approved.** Notification Worker cron `5 * * * *` sends authenticated `POST /api/tasks/notifications-sweep`; origin and token must match the candidate. Verify manual/cron idempotency, run ledger and failure behavior. Weekly `intake:cleanup` is report-only; `intake:cleanup:purge` deletes expired unused upload sessions/objects and needs operator review. Neither is a public scheduler endpoint.
10. **Rehearse backup and recovery before production.** See below. Only then complete the hosted/manual acceptance scenarios from the QA guide.

## Backup, restore and rollback readiness

The prepared GitHub Actions backup design encrypts data-only dumps with age and writes checksum + ciphertext to private R2. Retention keeps the latest **30 encrypted dump objects under `daily/` and 12 under `monthly/`**, ordered by object modification time, with matching checksum files. These are **object counts, not guaranteed calendar-day/month coverage**: multiple manual runs, missed executions and the first-of-month prefix rule affect coverage. The current workflow is **manual and opt-in**, gated by repository variable `RENZ_BACKUP_ENABLED=true`; its cron was removed for this handoff, and repository Actions is disabled. A separately approved operator must configure and rehearse it before considering scheduled activation. Configuration secrets are `SUPABASE_DB_URL`, `BACKUP_AGE_PUBLIC_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Keep the decryption private key offline with its named custodian. A YAML file is not an executed backup.

Database backup contains public/Auth data and Storage metadata. **Storage object bytes need a separate copy for all three buckets.** Existing backup automation does not provide that object copy. A successful SQL dump cannot establish complete recovery. The dated local restore rehearsal deliberately retained the local object volume; cloud object restore remains unproven.

Use a fresh staging/scratch target with the matching migration set, restore in one transaction with sequence repair as the runbook describes, copy byte-preserved bucket paths, compare counts/checksums, run media reconciliation, and sign in with restored owner MFA. Verify finance balances, CMS revisions, galleries and signed delivery. Confirm RPO/RTO with the owner; the runbook's 24-hour/4-hour figures are proposed targets, not measured commitments.

Rehearse Netlify previous-deploy restoration and validate health/public/admin/PDF routes afterward. Review schema compatibility before relying on an older app build; the fact that previous migrations were additive is not a guarantee for a future release. Database changes use forward compensating migrations or an approved restore, never edited/deleted applied migrations. Preserve append-only payments/audit history.

## Hosted acceptance and production release

Read-only gate after a candidate exists:

```powershell
corepack pnpm@11.25.0 r1:cloud https://<approved-candidate>
```

This wrapper still requires local Supabase discovery; the QA guide lists standalone HTTP checks if the operator has no local stack. It verifies public/health/headers/browser behavior, not authenticated staff/finance writes. Conduct the separate authorized staging acceptance: owner/staff MFA/lifecycle/RLS, lead conversion, invoice/PDF/share/revoke/payments, procurement/receiving, stale saves/realtime, CMS revisions/gallery/media, scheduler and backup/object restore. Test real devices, screen reader, literal zoom, provider logs and actual hosting latency/quotas.

For production, repeat the approved schema/configuration/bootstrap sequence with a **different project**, reviewed content and no synthetic data. Review legal/privacy notices, intake upload policy (images-only absent an approved scanner), anti-abuse behavior, analytics token/disclosure, canonical URL, robots/sitemap and backups. Do not import local fixture accounts or local database contents.

The independent source-review limitations in [SECURITY_MODEL.md §26](SECURITY_MODEL.md#26-current-implementation-review--23-october-2026) remain explicit acceptance/review work: password-change completion RPC trust, Turnstile hostname/action binding, proxy identity/host trust and multipart perimeter limits, pending-file review, document-link lifetime/log redaction, realtime identifier/timing exposure and inline-script CSP. A passing build, configured provider or blocked health signal does not resolve them. The retained `premium-audit.json` also records 121 violations and 17 unresolved items (138 errors); it was not rerun for this mission and is not a clean design certification. No broad redesign was authorized.

Only after staging evidence, clean production backup/count snapshot and explicit go-live approval: attach the owner-supplied domain, configure apex canonical plus `www` redirect and managed TLS, verify HTTPS/no redirect loops/security headers, and have the owner switch Site mode **Live**. Run the public audit with `--expect-live`, confirm indexing excludes admin/preview/shared documents and retain rollback readiness. Domain/DNS changes and public indexing each require the appropriate owner authority. No step in this document was executed as part of writing it.
