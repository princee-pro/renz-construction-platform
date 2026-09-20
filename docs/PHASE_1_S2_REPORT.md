# RENZ Phase 1 / S2 Completion Report

**Database runtime evidence:** 2 September 2026. **Final closeout review:** 5 September 2026.

## 1. Final S2 status

**PASS**

S2 now passes every criterion within its explicitly authorized local-only boundary. The healthy Docker engine ran PostgreSQL 17, the complete migration/seed chain rebuilt deterministically, all database integrity/security tests and warning-failing lint passed, canonical generated types are stable, stack ownership is proven, and isolated Linux database CI is defined. No cloud resource, remote database operation, application database client, authentication behavior, policy-based authorization, or S3 capability was introduced.

## 2. Docker/local stack

| Item          | Verified result                                             |
| ------------- | ----------------------------------------------------------- |
| Docker client | `29.6.2`, build `dfc4efb`                                   |
| Docker server | `29.6.2`; selected `desktop-linux` Linux engine healthy     |
| Supabase CLI  | exact project dependency `2.116.0`                          |
| PostgreSQL    | `17.6` runtime; configured major `17`                       |
| Stack start   | PASS; all eleven migrations and the configured seed applied |
| Stack status  | PASS; local database and gateway reported healthy           |

Supabase lifecycle/status output can contain local development credentials. Those values were filtered or suppressed and were not persisted in this report.

The table records the successful 2 September runtime verification. During the 5 September closeout the Docker engine was stopped; no new database run is claimed for that date. The owned stack was shut down successfully after the verified runs.

## 3. Migration runtime

- **Migration count:** 11.
- **All applied:** yes, in filename order on every clean reset.
- **Runtime correction:** the first pgTAP run exposed that schema-scoped default-privilege revokes cannot subtract PostgreSQL's global default `PUBLIC EXECUTE` on future functions. Forward migration `20260902111728_deny_default_function_execute.sql` now revokes that global default for the migration owner.
- **Test correction:** the effective-default ACL assertion now evaluates global defaults plus schema-specific additions, matching PostgreSQL semantics rather than weakening the security expectation.
- **Historical migrations:** preserved. The runtime correction is a new migration.

## 4. Reset evidence

| Reset                                   | Result | Evidence                                                                                            |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| First clean reset after final migration | PASS   | Database recreated; eleven migrations and `supabase/seed.sql` applied; containers restarted healthy |
| Second consecutive clean reset          | PASS   | Identical ordered migration/seed replay completed from zero                                         |

The aggregate verifier independently repeated the same two-reset sequence in both existing-stack and cold-owner modes. No Studio, dashboard, manual SQL repair, remote schema, `db push`, or `db pull` step was used.

## 5. pgTAP execution

| File                           | Planned/executed | Result                              |
| ------------------------------ | ---------------: | ----------------------------------- |
| `001_schema_structure.sql`     |               99 | PASS                                |
| `002_constraints.sql`          |               25 | PASS                                |
| `003_relationships.sql`        |               22 | PASS                                |
| `004_lead_integrity.sql`       |               15 | PASS                                |
| `005_indexes.sql`              |               25 | PASS                                |
| `006_security_seeds_audit.sql` |               32 | PASS                                |
| **Total**                      |          **218** | **218 passed; 0 failed; 0 skipped** |

The previously planned 217 assertions all remain. One direct navigation self-cycle regression was added, raising the final executed total to 218. The initial runtime run failed one meaningful default-ACL assertion; the schema cause was fixed and every subsequent full run passed.

## 6. High-risk integrity tests

- **Version behavior:** application-style mutations without an explicit increment, or with a skipped increment, fail with `23514`; exactly `version + 1` succeeds. Nested `ON DELETE SET NULL` attribution maintenance advances affected mutable rows rather than being incorrectly rejected.
- **Profile attribution deletion:** deleting the referenced `auth.users` identity cascades through its profile, leaves the attributed historical row present, sets both attribution columns to null, and advances its version.
- **Project/stage/media:** a direct deletion of a referenced stage fails with `23503`; deleting the owning project can cascade the complete deferred stage/media graph and leaves no orphan rows.
- **Lead subtype:** mismatched, missing, moved, duplicate, and finalized-invalid subtype states fail closed. A bounded two-session test observed finalization waiting on the parent-row lock during subtype deletion, then required finalization to fail with `23514`; the lead remained unfinalized and valid.
- **Navigation cycles:** both a direct self-cycle and a two-node indirect cycle fail with `23514`.
- **Claims:** testimonial and credential rows cannot enter `published` state in S2, even when `published_at` is provided.
- **Page sections:** an enabled unregistered S2 section fails with `23514`; S2 sections remain disabled until a later approved registry migration.

## 7. Database lint

`corepack pnpm@11.25.0 db:lint` ran `supabase db lint --local --fail-on warning` across `extensions`, `private`, and `public`.

- **Result:** PASS.
- **Warnings:** 0.
- **Errors:** 0.
- **Waivers/false positives:** none.

## 8. Generated database types

- **Path:** `src/lib/database/database.types.ts`.
- **Generation:** PASS from the reset local public schema using exact CLI `2.116.0`; the file was not handwritten.
- **Drift:** PASS. Regeneration is formatted through exact Prettier `3.9.6` in memory and compared without overwriting the canonical file.
- **Review:** 48 table blocks, each with `Row`, `Insert`, and `Update`; only the `public` database schema is emitted; no credentials, secret markers, or synthetic fixture constants appear.
- **Lint handling:** the file remains linted. Only `@typescript-eslint/no-redundant-type-constituents` is disabled for this file because Supabase's empty enum/composite generic helpers resolve schema keys to `never`.

No `@supabase/supabase-js` runtime dependency or application database client was added.

## 9. Runtime RLS/grant security

| Runtime assertion                                   | Result                                                    |
| --------------------------------------------------- | --------------------------------------------------------- |
| Public application tables                           | exactly 48                                                |
| Tables with RLS enabled                             | 48                                                        |
| Allow policies                                      | 0                                                         |
| `anon` table privileges                             | none on all 48                                            |
| `authenticated` table privileges                    | none on all 48                                            |
| PUBLIC/anon/authenticated sequence privileges       | none                                                      |
| PUBLIC/anon/authenticated access to private helpers | none                                                      |
| Forbidden effective future-function default grants  | 0                                                         |
| Private helper functions                            | exactly four, all `SECURITY INVOKER`, empty `search_path` |
| Public application functions/procedures/views       | none                                                      |
| Public lead insertion path                          | none                                                      |

Sensitive identity, lead, attachment, note, history, and audit tables therefore remain inaccessible to browser roles. S3 owns future allow policies and grants.

## 10. Synthetic seed runtime review

Exactly four business-facing identities exist after reset:

- `SYNTHETIC Service Alpha`;
- `SYNTHETIC Project Alpha`;
- `SYNTHETIC Draft Article`;
- `SYNTHETIC Foundation Page`.

All four are draft and unpublished; the page is also `noindex`. Runtime counts for published content, people, testimonials, credentials, leads, and audit rows are zero. The seed contains no real project, person, client, phone, email, address, statistic, credential, testimonial, or service claim.

## 11. Database verification script

`corepack pnpm@11.25.0 db:verify` passes and performs: silent local status probe, owned start when required, two clean resets, 218 pgTAP assertions, the two-session lead race, warning-failing lint, generated-type drift, and guarded cleanup.

- **Existing-stack mode:** detected the healthy stack, reused it, passed all checks, and left status healthy afterward.
- **Owner mode:** started from no running project stack, passed all checks, stopped in `finally`, and left status non-running with zero RENZ project containers.
- **5 September ownership correction:** a bounded inventory of containers bearing the validated local project label prevents an unhealthy pre-existing stack from being mistaken for a stack owned by the verifier. Fourteen mocked process regression cases cover this branch, normal reuse/startup, invalid configuration, probe errors, credential-output suppression, and failure cleanup. These are unit results; a further live database run was not performed with Docker stopped.
- **Boundary:** no credentials printed, no login/link/remote project ID/database URL, and no remote command. The local configuration's project identifier selects only this repository's containers.

## 12. Linux database CI

- **File/job:** `.github/workflows/ci.yml` / `database-integration`.
- **Runner/bound:** `ubuntu-24.04`, 30 minutes.
- **Tools:** exact Node `24.20.0`, pnpm `11.25.0`, and project-locked Supabase CLI `2.116.0`, all asserted before runtime.
- **Checks:** frozen install followed by `pnpm db:verify`, which owns local start, two resets, pgTAP, concurrency, warning-failing lint, type drift, and shutdown.
- **Security:** `contents: read`, immutable official action SHAs, no persisted checkout credentials, no database-volume cache, no artifacts, no deployment.
- **Credentials required:** **NO**.
- **Remote access:** **NONE**.

The workflow definition was parsed/formatted and independently reviewed locally. No GitHub-hosted execution is claimed without an actual remote workflow run.

## 13. S1 regression gate

| Command                                  | Result | Exact evidence                                               |
| ---------------------------------------- | ------ | ------------------------------------------------------------ |
| `corepack pnpm@11.25.0 format:check`     | PASS   | all matched files use Prettier formatting                    |
| `corepack pnpm@11.25.0 lint`             | PASS   | ESLint exit 0, zero warnings                                 |
| `corepack pnpm@11.25.0 typecheck`        | PASS   | Next route types generated; strict `tsc --noEmit` passed     |
| `corepack pnpm@11.25.0 test`             | PASS   | 3 files, 20 tests passed, including 14 lifecycle regressions |
| `corepack pnpm@11.25.0 design:lint`      | PASS   | 0 errors, 0 warnings, 1 informational token summary          |
| `corepack pnpm@11.25.0 scan:secrets`     | PASS   | 87 text-capable files scanned; no secret found               |
| `corepack pnpm@11.25.0 build`            | PASS   | Next `16.3.3`; `/` and `/_not-found` statically prerendered  |
| `corepack pnpm@11.25.0 audit:production` | PASS   | no known production vulnerability                            |
| `corepack pnpm@11.25.0 verify`           | PASS   | complete deterministic application aggregate passed          |

The generated-type formatting conflict exposed during this gate was corrected at the generator boundary; no check was weakened.

## 14. Static security review

- 0 migration `SECURITY DEFINER` statements; 0 migration `CREATE POLICY` statements; 0 migration `GRANT` statements.
- 48 explicit RLS enablements and 29 revoke/default-ACL statements across the migration chain.
- 0 executable `service_role` references, 0 uppercase `SUPABASE_*` environment references, 0 remote Supabase command forms, and 0 runtime Supabase client imports.
- 0 repository `.env*` files outside ignored/generated paths.
- Exactly one package-manager lockfile: `pnpm-lock.yaml`.
- All 23 direct dependencies are exact; 0 non-exact ranges.
- Terms such as credentials, tokens, password, and `SECURITY DEFINER` occur only in scanner rules, schema/table names, tests, and security documentation. No value-bearing credential match exists.
- The seed contains only four `SYNTHETIC` labels and no contact/claim markers.

## 15. Senior database review findings

Runtime and closeout reviews found and corrected three integration defects:

1. PostgreSQL's global function default ACL was still effectively granting `PUBLIC EXECUTE`; a forward migration now removes it and the test models effective defaults correctly.
2. Raw generated types and repository formatting were not canonicalized identically; generation/check now share exact Prettier normalization.
3. A nonzero status from an unhealthy existing stack was previously treated as permission to own startup and shutdown. Project-container inventory now rejects that case before mutation, with fourteen mocked lifecycle regressions.

The review also strengthened evidence with a direct self-cycle assertion and an actual competing-session lead test. Final review found no unnecessary dependency, fragile migration-order workaround, accidental allow policy, server/client leak, cloud operation, unresolved fact encoded as content, or S3 implementation. The eleven-migration chain remains forward-only and repeatable.

## 16. Files changed during completion

- **Database:** added `supabase/migrations/20260902111728_deny_default_function_execute.sql`; updated `supabase/tests/database/003_relationships.sql` and `006_security_seeds_audit.sql`.
- **Verification:** added `scripts/verify-lead-concurrency.mjs` and `tests/unit/database-lifecycle.test.ts`; updated `scripts/verify-database.mjs` and `scripts/database-types.mjs`.
- **Types/configuration:** generated `src/lib/database/database.types.ts`; updated `package.json` and the narrow generated-file ESLint override in `eslint.config.mjs`.
- **CI:** added the isolated `database-integration` job to `.github/workflows/ci.yml`.
- **Documentation:** updated this report, `PHASE_1_S2_TOOLCHAIN.md`, `PHASE_1_S2_RECOVERY.md`, `PHASE_1_DECISION_REGISTER.md`, `IMPLEMENTATION_ROADMAP.md`, and `README.md`.

No S1 application route/component/style was changed, and no S3 file or cloud resource was created.

## 17. G0-G6 after runtime verification

| Gate | Status            | S2 disposition                                                                                                              |
| ---- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| G0   | **PASS**          | Explicit local-only S2 authorization completed; S3 remains unauthorized                                                     |
| G1   | **PARTIAL**       | Brand/source approval unchanged; S2 promoted no identity asset                                                              |
| G2   | **BLOCKED**       | No verified business/proof facts; synthetic drafts only                                                                     |
| G3   | **SAFE-DEFERRED** | Empty structural identity/role tables; no Auth, role catalog, permission helper, MFA, or admin behavior                     |
| G4   | **SAFE-DEFERRED** | Empty/default-denied lead/media structures; no intake, upload, retention, export, analytics, or provider behavior           |
| G5   | **SAFE-DEFERRED** | Local unlinked stack only; no cloud account/project/region/backup promise/deployment                                        |
| G6   | **PARTIAL**       | S2 local reproducibility and CI definition pass; broader ownership and future hosted-runtime/release governance remain open |

## 18. Remaining real blockers

There is no remaining blocker inside the completed local S2 boundary. S3 remains blocked on explicit G3 administrator/role/MFA/recovery/session decisions and the relevant G4 security decisions, as well as separate user authorization for that slice. G1/G2 evidence and G5 hosted-platform decisions continue to block their later public-content, brand, cloud, recovery, and release capabilities.

## 19. S3 readiness

**BLOCKED**

The S2 database substrate is technically ready, but S3 cannot safely define identity and authorization without approved administrator ownership, role/capability vocabulary, MFA and recovery policy, session/security behavior, and authorization to execute S3. Empty structural tables are not permission to invent those decisions.

## 20. Recommended S3 scope

After G3 and the required security portions of G4 are approved and S3 is explicitly assigned, implement only the identity + MFA + RBAC + grants + RLS spine: server-rendered session handling, invited administrator lifecycle, approved role/capability seeds, fresh permission evaluation, least-privilege grants/policies, negative and positive authorization tests, recovery controls, and audited privileged access.

Do not implement CMS/content workflows, public read policies, lead intake, uploads, analytics, cloud provisioning, or deployment as part of S3.
