import { createLocalAdminClient, createLocalClient, assert } from "./s4-local.mjs";

const MAX_EDITORIAL_FILE_SIZE = 25 * 1024 * 1024;
const ADMITTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
];
const EDITORIAL_BUCKETS = ["editorial-originals", "editorial-derivatives"];
// C8: private intake quarantine. Only the server credential reads or writes it;
// no storage.objects policy grants anon/authenticated anything here.
const INTAKE_BUCKET = "lead-intake";
const INTAKE_MAX_FILE_SIZE = 10 * 1024 * 1024;
const INTAKE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const FIXTURE_ASSET_ID = "00000000-0000-4000-8000-000000000004";
const FIXTURE_PATHS = {
  "editorial-originals": `${FIXTURE_ASSET_ID}/s4-original.jpg`,
  "editorial-derivatives": `${FIXTURE_ASSET_ID}/s4-derivative.jpg`,
};
const ANONYMOUS_PROBE_PATHS = {
  "editorial-originals": `${FIXTURE_ASSET_ID}/anonymous-probe-original.jpg`,
  "editorial-derivatives": `${FIXTURE_ASSET_ID}/anonymous-probe-derivative.jpg`,
};

function bucketOptions(bucketId) {
  if (bucketId === INTAKE_BUCKET) {
    return {
      public: false,
      fileSizeLimit: INTAKE_MAX_FILE_SIZE,
      allowedMimeTypes: INTAKE_MIME_TYPES,
    };
  }
  return {
    public: false,
    fileSizeLimit: MAX_EDITORIAL_FILE_SIZE,
    allowedMimeTypes: ADMITTED_MIME_TYPES,
  };
}

function jpegFixture() {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
}

function replacementJpegFixture() {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xd9]);
}

async function objectMatches(client, bucketId, path, expectedBytes) {
  const download = await client.storage.from(bucketId).download(path);
  if (download.error || !download.data) return false;
  const actual = new Uint8Array(await download.data.arrayBuffer());
  return (
    actual.byteLength === expectedBytes.byteLength &&
    actual.every((value, index) => value === expectedBytes[index])
  );
}

async function listBuckets(client) {
  const { data, error } = await client.storage.listBuckets();
  if (error) throw new Error("Storage bucket listing failed.");
  return data ?? [];
}

function bucketIssues(bucket) {
  const issues = [];
  if (!bucket) return ["missing"];
  const options = bucketOptions(bucket.id);
  if (bucket.public !== false) issues.push("must be private");
  if (Number(bucket.file_size_limit) !== options.fileSizeLimit)
    issues.push("file-size limit differs");
  const actual = [...(bucket.allowed_mime_types ?? [])].sort();
  const expected = [...options.allowedMimeTypes].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) issues.push("MIME allow-list differs");
  return issues;
}

async function provision() {
  const client = createLocalAdminClient();
  const existing = await listBuckets(client);
  const results = [];

  for (const bucketId of [...EDITORIAL_BUCKETS, INTAKE_BUCKET]) {
    const bucket = existing.find((candidate) => candidate.id === bucketId);
    if (!bucket) {
      const { error } = await client.storage.createBucket(bucketId, bucketOptions(bucketId));
      if (error) throw new Error(`Storage bucket ${bucketId} could not be created.`);
      results.push({ bucketId, action: "created" });
      continue;
    }

    const issues = bucketIssues(bucket);
    if (issues.length === 0) {
      results.push({ bucketId, action: "unchanged" });
      continue;
    }

    const { error } = await client.storage.updateBucket(bucketId, bucketOptions(bucketId));
    if (error) throw new Error(`Storage bucket ${bucketId} could not be hardened.`);
    results.push({ bucketId, action: "hardened", previousIssues: issues });
  }

  console.log(JSON.stringify({ ok: true, buckets: results }));
}

async function status() {
  const client = createLocalAdminClient();
  const buckets = await listBuckets(client);
  const details = [...EDITORIAL_BUCKETS, INTAKE_BUCKET].map((bucketId) => {
    const bucket = buckets.find((candidate) => candidate.id === bucketId);
    return bucket
      ? {
          id: bucket.id,
          public: bucket.public,
          fileSizeLimit: bucket.file_size_limit,
          allowedMimeTypes: bucket.allowed_mime_types,
          issues: bucketIssues(bucket),
        }
      : { id: bucketId, exists: false, issues: ["missing"] };
  });
  console.log(
    JSON.stringify({ ok: details.every((bucket) => bucket.issues.length === 0), buckets: details }),
  );
  if (details.some((bucket) => bucket.issues.length > 0)) process.exitCode = 1;
}

async function removeFixtureObjects(client) {
  for (const bucketId of EDITORIAL_BUCKETS) {
    const { error } = await client.storage
      .from(bucketId)
      .remove([FIXTURE_PATHS[bucketId], ANONYMOUS_PROBE_PATHS[bucketId]]);
    if (error) throw new Error(`Storage fixture cleanup failed for ${bucketId}.`);
  }
}

async function verify() {
  const admin = createLocalAdminClient();
  const anonymous = createLocalClient("anonymous");
  const buckets = await listBuckets(admin);
  for (const bucketId of EDITORIAL_BUCKETS) {
    const bucket = buckets.find((candidate) => candidate.id === bucketId);
    const issues = bucketIssues(bucket);
    assert(
      issues.length === 0,
      `${bucketId} storage policy is not compliant: ${issues.join(", ")}.`,
    );
  }

  const bytes = jpegFixture();
  try {
    for (const bucketId of EDITORIAL_BUCKETS) {
      const path = FIXTURE_PATHS[bucketId];
      const upload = await admin.storage.from(bucketId).upload(path, bytes, {
        contentType: "image/jpeg",
        upsert: false,
      });
      assert(!upload.error, `Synthetic upload failed for ${bucketId}.`);

      const download = await admin.storage.from(bucketId).download(path);
      assert(!download.error && download.data, `Service-side download failed for ${bucketId}.`);

      const anonymousDownload = await anonymous.storage.from(bucketId).download(path);
      assert(
        Boolean(anonymousDownload.error),
        `Anonymous raw Storage read unexpectedly succeeded for ${bucketId}.`,
      );

      await anonymous.storage.from(bucketId).upload(ANONYMOUS_PROBE_PATHS[bucketId], bytes, {
        contentType: "image/jpeg",
        upsert: false,
      });
      assert(
        !(await objectMatches(admin, bucketId, ANONYMOUS_PROBE_PATHS[bucketId], bytes)),
        `Anonymous upload created an object in ${bucketId}.`,
      );

      await anonymous.storage.from(bucketId).update(path, replacementJpegFixture(), {
        contentType: "image/jpeg",
        upsert: true,
      });
      assert(
        await objectMatches(admin, bucketId, path, bytes),
        `Anonymous overwrite changed an object in ${bucketId}.`,
      );

      await anonymous.storage.from(bucketId).remove([path]);
      assert(
        await objectMatches(admin, bucketId, path, bytes),
        `Anonymous delete removed an object from ${bucketId}.`,
      );
    }
    const unknownBucket = await anonymous.storage
      .from("s4-unknown-bucket")
      .download(`${FIXTURE_ASSET_ID}/unknown.jpg`);
    assert(Boolean(unknownBucket.error), "An unknown Storage bucket was readable anonymously.");
    // C8 quarantine: anonymous cannot list, read or write the intake bucket.
    const intakeList = await anonymous.storage.from(INTAKE_BUCKET).list("", { limit: 1 });
    assert(
      Boolean(intakeList.error) || (intakeList.data ?? []).length === 0,
      "The intake quarantine bucket listed objects anonymously.",
    );
    const intakeProbePath = `${FIXTURE_ASSET_ID}/${FIXTURE_ASSET_ID}.jpg`;
    const intakeUpload = await admin.storage
      .from(INTAKE_BUCKET)
      .upload(intakeProbePath, bytes, { contentType: "image/jpeg", upsert: false });
    assert(!intakeUpload.error, "Service-side intake upload failed.");
    try {
      const intakeAnonRead = await anonymous.storage.from(INTAKE_BUCKET).download(intakeProbePath);
      assert(Boolean(intakeAnonRead.error), "An intake object was readable anonymously.");
      await anonymous.storage
        .from(INTAKE_BUCKET)
        .upload(`${FIXTURE_ASSET_ID}/anon-intake.jpg`, bytes, { contentType: "image/jpeg" });
      assert(
        !(await objectMatches(admin, INTAKE_BUCKET, `${FIXTURE_ASSET_ID}/anon-intake.jpg`, bytes)),
        "Anonymous upload created an intake object.",
      );
    } finally {
      await admin.storage
        .from(INTAKE_BUCKET)
        .remove([intakeProbePath, `${FIXTURE_ASSET_ID}/anon-intake.jpg`]);
    }
    console.log(
      JSON.stringify({
        ok: true,
        buckets: [...EDITORIAL_BUCKETS, INTAKE_BUCKET],
        intakeQuarantine: "anonymous list/read/upload denied",
        anonymousRead: "denied",
        anonymousUpload: "denied",
        anonymousOverwrite: "denied",
        anonymousDelete: "denied",
        unknownBucket: "denied",
      }),
    );
  } finally {
    await removeFixtureObjects(admin);
  }
}

async function cleanupTestFixtures() {
  const client = createLocalAdminClient();
  await removeFixtureObjects(client);
  console.log(
    JSON.stringify({
      ok: true,
      removed: EDITORIAL_BUCKETS.flatMap((bucket) => [
        `${bucket}/${FIXTURE_PATHS[bucket]}`,
        `${bucket}/${ANONYMOUS_PROBE_PATHS[bucket]}`,
      ]),
    }),
  );
}

const command = process.argv[2] ?? "";
try {
  if (command === "provision") await provision();
  else if (command === "status") await status();
  else if (command === "verify") await verify();
  else if (command === "cleanup-test-fixtures") await cleanupTestFixtures();
  else
    throw new Error(
      "Usage: node scripts/storage.mjs <provision|status|verify|cleanup-test-fixtures>",
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Storage command failed.");
  process.exitCode = 1;
}
