import { createClient } from "@supabase/supabase-js";

import { getLocalSupabaseCredentials } from "./s4-local.mjs";

// C8 intake reconciliation + bounded cleanup (§121–122).
//
//   node scripts/intake-cleanup.mjs           report only (no changes)
//   node scripts/intake-cleanup.mjs purge     remove expired, never-submitted
//                                             upload sessions and their objects
//
// Attachments that belong to a submitted lead are never touched. Objects the
// database does not know about are only reported, never deleted (they may be
// production files this script cannot reason about).

const BUCKET = "lead-intake";
const mode = process.argv[2] ?? "report";
if (mode !== "report" && mode !== "purge") {
  throw new Error("Usage: intake-cleanup.mjs [report|purge]");
}

function serviceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && secret) {
    return createClient(url, secret, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
  }
  const local = getLocalSupabaseCredentials();
  return createClient(local.url, local.secretKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function listAllObjects(client) {
  const paths = [];
  const { data: folders, error } = await client.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw new Error("Intake bucket listing failed.");
  for (const folder of folders ?? []) {
    if (folder.id) {
      paths.push(folder.name);
      continue;
    }
    const { data: files } = await client.storage.from(BUCKET).list(folder.name, { limit: 1000 });
    for (const file of files ?? []) paths.push(`${folder.name}/${file.name}`);
  }
  return paths;
}

async function main() {
  const client = serviceClient();
  const report = {
    mode,
    bucket: BUCKET,
    expiredSessions: [],
    removed: [],
    missingObjects: [],
    unknownObjects: [],
    rejectedAwaitingReview: 0,
  };

  const { data: expired, error } = await client.rpc("intake_expired_upload_sessions", {
    limit_count: 200,
  });
  if (error) throw new Error("Expired upload sessions could not be listed.");
  const objects = new Set(await listAllObjects(client));
  const known = new Set();

  for (const session of expired ?? []) {
    report.expiredSessions.push({
      id: session.id,
      expiresAt: session.expires_at,
      files: session.file_count,
    });
    for (const path of session.object_paths ?? []) known.add(path);
    if (mode === "purge") {
      const paths = (session.object_paths ?? []).filter((path) => objects.has(path));
      if (paths.length > 0) {
        const { error: removeError } = await client.storage.from(BUCKET).remove(paths);
        if (removeError) throw new Error(`Objects for session ${session.id} could not be removed.`);
      }
      const { data: purged, error: purgeError } = await client.rpc("intake_purge_upload_session", {
        target_session_id: session.id,
      });
      if (purgeError || purged?.ok !== true)
        throw new Error(`Session ${session.id} could not be purged.`);
      report.removed.push({
        sessionId: session.id,
        objects: paths.length,
        attachments: purged.removed_attachments,
      });
    }
  }

  // Submitted-lead attachments: report objects missing from storage (never delete).
  const { data: attachments } = await client
    .from("lead_attachments")
    .select("id, object_path, lead_id, scan_status")
    .limit(5000);
  for (const attachment of attachments ?? []) {
    known.add(attachment.object_path);
    if (attachment.lead_id && !objects.has(attachment.object_path)) {
      report.missingObjects.push({
        attachmentId: attachment.id,
        objectPath: attachment.object_path,
      });
    }
    if (attachment.lead_id && attachment.scan_status === "rejected")
      report.rejectedAwaitingReview += 1;
  }
  for (const path of objects) {
    if (!known.has(path)) report.unknownObjects.push(path);
  }

  console.log(JSON.stringify({ ok: true, ...report }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Intake cleanup failed.");
  process.exit(1);
});
