# S4 Storage Security

**Status:** local/private foundation only  
**Date:** 5 September 2026

## Provider-managed schema rule

S4 treats Supabase's `storage` schema as provider-managed. Migrations do not insert or mutate object metadata records, ownership fields, or bucket rows. The migration only adds project policy on `storage.objects`; bucket creation/configuration and object lifecycle use the Storage API.

This preserves the distinction between editorial metadata (`public.media_assets`) and provider object metadata (`storage.objects`). The S4 database row is not proof that an object exists; reconciliation checks both sides.

## Bucket policy

Only `editorial-originals` and `editorial-derivatives` are in the S4 policy. Both are private. The policy uses current-session capability checks:

- `media.read` — authenticated reads;
- `media.upload` — controlled inserts with UUID-rooted safe paths;
- `media.manage` — controlled updates/deletes.

There is no anonymous Storage policy. S4 does not create signed-upload or signed-download endpoints yet; those require an approved production file policy, scanning/quarantine design, and operational owner.

## Local provisioner

`scripts/storage.mjs` obtains local credentials from `supabase status --output env` without printing them. It uses the service/secret key only in the local server-side process and performs API calls to create/update/inspect the two reserved buckets. It never accepts a bucket name from a general user argument.

Supported commands:

```powershell
node scripts/storage.mjs provision
node scripts/storage.mjs status
node scripts/storage.mjs verify
node scripts/storage.mjs cleanup-test-fixtures
```

The cleanup command is intentionally narrow and destructive only for its hard-coded UUID-rooted fixture-path allow-list. It accepts no arbitrary bucket/path/prefix and is not a production cleanup mechanism.

The integration checks evaluate resulting object state, not merely HTTP error shape. Anonymous upload probes remain absent, overwrite probes leave the original bytes unchanged, delete probes leave the original present, raw reads fail, and unknown buckets remain unavailable. A separate unassigned authenticated synthetic user is denied mutation, while an active AAL2 test operator with `media.upload`/`media.read` can upload and checksum the exact owned fixture. All probe paths and users are removed afterward.

## Credentials and logs

The secret key is never returned by the Storage scripts, stored in source, placed in a URL, or included in reconciliation output. The browser receives the publishable key only. A generic privileged client is not exposed in the application; local privileged credential handling is confined to operator scripts.

## Reconciliation boundary

`scripts/media-reconcile.mjs` is report-only. It deterministically paginates both admitted buckets, compares object paths with `media_assets`, reports missing/orphaned objects and invalid public eligibility, and performs no automatic deletion or repair. A local run fails closed above 10,000 listed entries rather than silently returning a partial inventory.

## Production gate

The local bucket/file policy is not production approval. Before production uploads, named owners must approve accepted types, byte/count/duration limits, malware scanning, quarantine, EXIF/metadata handling, derivative generation, rights evidence, backup/restore, retention, incident response, and signed delivery behavior.
