# RENZ Phase 1 / S2 Recovery Architecture

**Status date:** 1 September 2026
**Boundary:** local schema/test-data reconstruction; no production recovery commitment

## Recovery domains are separate

Database recovery and object-storage recovery are different systems. A restored `media_assets` or `lead_attachments` row proves only that metadata was recovered; it does not prove that the referenced object, original, derivative, or quarantine copy exists.

## Local database reconstruction

The authoritative local reconstruction chain is:

1. exact project-pinned Supabase CLI;
2. `supabase/config.toml` with local PostgreSQL 17;
3. ordered SQL in `supabase/migrations/`;
4. synthetic-only `supabase/seed.sql`;
5. pgTAP tests in `supabase/tests/database/`;
6. database lint; and
7. generated TypeScript type consistency.

`pnpm db:reset` must recreate structure and synthetic fixtures without Studio clicks, remote state, or secret values. `pnpm db:verify` starts the local stack when necessary, resets twice, runs pgTAP, the two-session lead-integrity race, warning-failing lint, and generated-type drift checks, then stops only a stack it owns. The Docker engine was unavailable on 1 September 2026; after it became healthy on 2 September, the full reconstruction sequence passed from zero and the ownership behavior passed in both reuse and cold-start modes.

## Future hosted database recovery

A later cloud/platform decision must define and prove:

- selected Supabase organization, project, plan, and region;
- data-residency approval;
- database backup and point-in-time recovery capability;
- retention and encryption expectations;
- named backup, restore, incident, and release owners;
- restore-test cadence and acceptance evidence;
- migration rollback/forward-fix authority; and
- production RPO and RTO.

S2 assigns no values or owners to these decisions.

## Future object-storage recovery

Storage requires a separate approved design covering:

- backup of originals and published derivatives;
- object versioning/retention where supported;
- checksum reconciliation between database metadata and objects;
- detection and treatment of missing or orphaned objects;
- quarantine/scan state preservation;
- deletion ordering and retry behavior; and
- an independently tested restore procedure.

PostgreSQL cannot transactionally cascade a row deletion into object storage. Future purge operations must coordinate database and object deletion, tolerate partial failure, and preserve auditable recovery evidence. S2 creates no bucket, object, upload, Storage policy, or backup provider.

## Local operator procedure

Prerequisites are Node `24.x`, exact pnpm `11.25.0`, the frozen lockfile, and a healthy Docker-compatible engine with adequate resources.

```powershell
corepack pnpm@11.25.0 install --frozen-lockfile
corepack pnpm@11.25.0 db:start
corepack pnpm@11.25.0 db:reset
corepack pnpm@11.25.0 db:test
corepack pnpm@11.25.0 db:test:concurrency
corepack pnpm@11.25.0 db:lint
corepack pnpm@11.25.0 db:types
corepack pnpm@11.25.0 db:types:check
corepack pnpm@11.25.0 db:verify
corepack pnpm@11.25.0 db:stop
```

`db:start` and `db:status` can display local development credentials. Treat terminal output as sensitive and do not paste it into issues, CI logs, screenshots, or documentation. The local stack must never be exposed to an untrusted network.
