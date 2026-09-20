import { createLocalAdminClient } from "./s4-local.mjs";

const editorialBuckets = ["editorial-originals", "editorial-derivatives"];
const storagePageSize = 100;
const maximumEntriesPerRun = 10_000;

async function listObjectPaths(client, bucketId, prefix = "", state = { entriesSeen: 0 }) {
  const paths = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(bucketId).list(prefix, {
      limit: storagePageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Storage listing failed for ${bucketId}.`);

    const entries = data ?? [];
    for (const entry of entries) {
      state.entriesSeen += 1;
      if (state.entriesSeen > maximumEntriesPerRun) {
        throw new Error(
          `Storage reconciliation exceeded its ${maximumEntriesPerRun}-entry safety bound for ${bucketId}.`,
        );
      }

      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id == null) {
        paths.push(...(await listObjectPaths(client, bucketId, path, state)));
      } else {
        paths.push(path);
      }
    }

    if (entries.length < storagePageSize) break;
    offset += storagePageSize;
  }

  return paths;
}

async function reconcile() {
  const client = createLocalAdminClient();
  const { data: assets, error } = await client
    .from("media_assets")
    .select(
      "id,bucket_id,object_path,source_asset_id,storage_state,provenance_class,rights_status,public_use_permission",
    );
  if (error) throw new Error("Media metadata reconciliation query failed.");

  const objectsByBucket = new Map();
  for (const bucketId of editorialBuckets) {
    objectsByBucket.set(bucketId, new Set(await listObjectPaths(client, bucketId)));
  }

  const knownObjectKeys = new Set();
  const issues = [];
  const assetIds = new Set((assets ?? []).map((asset) => asset.id));

  for (const asset of assets ?? []) {
    const objectKey = `${asset.bucket_id}/${asset.object_path}`;
    knownObjectKeys.add(objectKey);

    if (!editorialBuckets.includes(asset.bucket_id)) {
      issues.push({ code: "unexpected_bucket", assetId: asset.id, detail: asset.bucket_id });
    }

    if (!objectsByBucket.get(asset.bucket_id)?.has(asset.object_path)) {
      issues.push({ code: "missing_storage_object", assetId: asset.id, detail: objectKey });
    }

    if (asset.source_asset_id && !assetIds.has(asset.source_asset_id)) {
      issues.push({
        code: "missing_source_asset",
        assetId: asset.id,
        detail: asset.source_asset_id,
      });
    }

    if (asset.storage_state === "public_eligible") {
      if (
        ["concept_demo", "generated_reference", "synthetic_test"].includes(asset.provenance_class)
      ) {
        issues.push({
          code: "invalid_public_provenance",
          assetId: asset.id,
          detail: asset.provenance_class,
        });
      }
      if (asset.rights_status !== "cleared" || asset.public_use_permission !== "granted") {
        issues.push({ code: "public_rights_not_current", assetId: asset.id, detail: asset.id });
      }
    }
  }

  for (const bucketId of editorialBuckets) {
    for (const objectPath of objectsByBucket.get(bucketId) ?? []) {
      const objectKey = `${bucketId}/${objectPath}`;
      if (!knownObjectKeys.has(objectKey)) {
        issues.push({ code: "orphan_storage_object", bucketId, detail: objectPath });
      }
    }
  }

  const report = {
    ok: issues.length === 0,
    databaseAssetCount: assets?.length ?? 0,
    storageObjectCount: [...objectsByBucket.values()].reduce(
      (total, paths) => total + paths.size,
      0,
    ),
    issueCount: issues.length,
    issues,
    destructiveAction: "none",
  };
  console.log(JSON.stringify(report, null, 2));
  if (issues.length > 0) process.exitCode = 1;
}

try {
  await reconcile();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Media reconciliation failed.");
  process.exitCode = 1;
}
