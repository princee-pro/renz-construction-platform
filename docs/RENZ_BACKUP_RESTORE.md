# RENZ backup and restore

C10 §142–146. What is backed up, how, how it is restored, and the evidence
that the restore path works. Written 2026-09-20 against the local stack;
every cloud-specific line is marked **DECISION REQUIRED** until hosting is
assigned (Decision Register G5 is still SAFE-DEFERRED).

## What the system's state consists of

| Store | Holds | Backed up by |
| --- | --- | --- |
| Postgres `public` schema | every business record: content, website pages/revisions, clients, projects, leads, partners, invoices, payments, purchase orders, settings, notifications, audit log | data dump |
| Postgres `auth` schema | staff accounts, MFA factors, identities | data dump (Supabase includes it) |
| Postgres `storage` schema | bucket definitions and object **metadata** | data dump |
| Storage buckets `editorial-originals`, `editorial-derivatives`, `lead-intake` | the actual media bytes (originals, derivatives, intake attachments) | bucket copy — **not** in a database dump |
| Application | source code, migrations, `.env` values | Git + the hosting provider's environment store |

Nothing else holds state. There is no cache that must be preserved: the
Next.js public cache rebuilds from the database.

## Owner-approved backup architecture (R1, 2026-09-21)

- Execution: **GitHub Actions** (`.github/workflows/backup.yml`, daily
  02:17 UTC + manual dispatch).
- Format: `supabase db dump --data-only --use-copy` → encrypted with
  **age** to the operator's public key (private key offline) → SHA-256
  checksum.
- Storage: a **private Cloudflare R2 Standard bucket** (S3 API), prefixes
  `daily/` and `monthly/`.
- Retention: rolling **30 daily, 12 monthly**, pruned by the workflow.
- Restore rehearsal: **mandatory** on the STAGING Supabase project before
  any production restore; sequences must be reset (below).
- Media buckets: the workflow does not copy Storage objects yet — the
  bucket copy is documented below and is the next backup item to automate
  (R2 is the natural target).

## RPO / RTO (numbers still to be confirmed by the owner)

- RPO 24 h (daily automated database backup, plus point-in-time recovery if
  the Supabase plan includes it). Media buckets change only when staff upload
  or publish; a weekly bucket copy plus the daily database dump is adequate
  at RENZ's volume.
- RTO 4 h for a full restore by one operator following this document.

## Backup procedure

### Database (local rehearsal command and production equivalent)

```
# LOCAL: node scripts/backup.mjs dump .playwright/backup-rehearsal/data.sql
# PRODUCTION (linked project, operator machine, secret DB URL in the environment):
supabase db dump --db-url "$SUPABASE_DB_URL" --data-only --use-copy -f renz-data-YYYYMMDD.sql
```

The dump is the Supabase CLI's own data-only format (COPY blocks for
`auth`, `public`, `storage`). Keep the schema out of it: the schema is
reproduced by `supabase/migrations` and must never diverge from Git.

Store dumps encrypted, outside the hosting account, with the date and the
latest migration version in the file name. Dumps contain personal data
(staff emails, client contacts, lead messages) — treat them as production
data under the privacy policy, never attach them to tickets or chats.

### Media buckets

Copy every object of the three buckets to the backup location, preserving
the object path (the database `media_assets`/`lead_attachments` rows
reference objects by bucket + path). With the Supabase CLI:

```
supabase storage cp -r ss:///editorial-originals ./backup/editorial-originals --linked
supabase storage cp -r ss:///editorial-derivatives ./backup/editorial-derivatives --linked
supabase storage cp -r ss:///lead-intake ./backup/lead-intake --linked
```

`pnpm media:reconcile` (report-only) lists database rows without an object
and objects without a row; run it after a restore.

### Environment values

The `.env.example` inventory is complete (C10 §82). Record which values
are set where (hosting provider, Supabase project) in the go-live
checklist; the values themselves are never written to a file in this
repository.

## Restore procedure

1. Provision the target database with the exact schema: `supabase db push`
   (or `supabase db reset` locally) at the Git commit whose migrations
   match the dump's `supabase_migrations.schema_migrations` rows.
2. Restore the data in ONE transaction:

   ```
   # LOCAL rehearsal:
   node scripts/backup.mjs restore .playwright/backup-rehearsal/data.sql
   # PRODUCTION: the same script against the linked database URL is not
   # provided on purpose (no automated production writes in C10). Run the
   # generated /tmp/renz-restore.sql through psql with
   #   --single-transaction --variable ON_ERROR_STOP=1
   ```

   The script does five things a plain `psql -f dump.sql` would get wrong,
   each found in the rehearsal:
   - migrations insert defaults (roles, permissions, settings singletons,
     section registries, website pages) → the script empties every table the
     dump repopulates first (`delete`, not `truncate ... cascade`, which
     reaches Supabase-owned tables);
   - the S4 publication/media guards are CHECK constraints keyed on session
     settings → the script sets `renz.s4.publication_command` and
     `renz.s4.media_command` for the restore session;
   - the CLI dumps every `auth`/`storage` table including platform-internal
     ones the app role cannot write → empty COPY blocks are dropped;
   - referential and history triggers (payments are never deleted, audit
     rows are append-only) → `session_replication_role = replica` for the
     restore session only;
   - COPY does not advance sequences → every serial/identity sequence in
     `auth`, `public` and `storage` is set past the restored maximum (the
     rehearsal restore looked complete, then every sign-in failed with a
     500 because Auth's refresh-token ids collided).
3. Copy the bucket objects back to the same bucket + path.
4. Verify: `node scripts/backup.mjs counts` must match the counts recorded
   at backup time; `pnpm media:reconcile` must report no orphans; sign in
   as the owner (password + authenticator) and open Overview, Website,
   Finance; open the public home page.
5. Republish the public configuration once (Settings → Website → Publish)
   so the public projection snapshot is regenerated on the restored
   database.

## Rehearsal evidence (local, 2026-09-20)

| Step | Result |
| --- | --- |
| `supabase db dump --local --data-only --use-copy` | 8,376 KB, 155 COPY blocks (22 auth, 123 public, 7 storage) |
| `supabase db reset --local --no-seed` | schema only; every count 0 |
| `node scripts/backup.mjs restore …` (first attempts) | failed on `brand_media_settings_pkey` (migration defaults), then on Supabase-owned `storage.buckets_vectors`, then on `projects_s4_publication_guard` — each fixed in the script as listed above; every failure rolled back cleanly |
| restore with the first working script | counts identical, owner sign-in **failed** afterwards: `duplicate key value violates unique constraint "refresh_tokens_pkey"` in the Auth service (sequence left at 15, max id 41) — sequences are now reset by the script |
| final restore | 62 tables restored in one transaction; `auth.refresh_tokens_id_seq` 42, `audit_logs` sequence 12,695 |
| counts before / after | identical: auth.users 7, mfa_factors 7, profiles 7, services 6, projects 13, posts 4, media_assets 254, website_pages 12, revisions 27, notifications 7,614, audit_logs 12,139, storage.buckets 3, storage.objects 254 |
| application after restore | public routes 200; owner sign-in with the restored password and authenticator succeeded; Overview, Clients, Projects, Finance, Website rendered (`scripts/c10-admin-perf.mjs`) |
| bucket bytes | not part of the rehearsal (the local volume was never emptied); the bucket copy step above is **NOT TESTED** against a cloud project — no cloud project exists |

## Not tested / decisions required

- Point-in-time recovery and automated daily backups depend on the
  Supabase plan (DECISION REQUIRED with hosting).
- Restore into a **different** Supabase project (project migration) also
  needs the Auth settings (site URL, redirect URLs, SMTP) and the storage
  bucket policies, which live in project configuration, not the database.
- Encrypted off-site storage location and retention (proposed: 30 daily,
  12 monthly) — DECISION REQUIRED.
