import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "node_modules", "supabase", "dist", "supabase.js");
const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const secretKey = process.env["SUPABASE_SECRET_KEY"];
const emailArgumentIndex = process.argv.indexOf("--email");
const email =
  emailArgumentIndex >= 0 ? process.argv[emailArgumentIndex + 1]?.trim().toLowerCase() : undefined;

function usageError() {
  console.error(
    "Usage: pnpm auth:bootstrap -- --email invited.operator@example.test (local Auth only)",
  );
  process.exitCode = 2;
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || !url || !secretKey) {
  usageError();
  process.exit(2);
}

function maskEmail(value) {
  const [localPart, domain] = value.split("@");
  const visible = localPart?.slice(0, 1) ?? "";
  return `${visible}***@${domain ?? "example.test"}`;
}

function runLocalBootstrapSql(userId) {
  const sql = `select private.bootstrap_super_admin('${userId}'::uuid);`;
  const result = spawnSync(
    process.execPath,
    [cli, "db", "query", "--local", "--output", "json", sql],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DO_NOT_TRACK: "1" },
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    },
  );

  if (result.error || result.status !== 0) {
    throw new Error("The local Super Admin bootstrap transaction was rejected.");
  }
}

const admin = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

let invitedUserId;
try {
  const invitation = await admin.auth.admin.inviteUserByEmail(email);
  if (invitation.error || !invitation.data.user) {
    throw new Error("The bootstrap invitation could not be created.");
  }

  invitedUserId = invitation.data.user.id;
  runLocalBootstrapSql(invitedUserId);

  console.log(
    `Bootstrap invitation staged for ${maskEmail(email)}. The invited operator must complete TOTP enrollment before administration is active.`,
  );
} catch {
  if (invitedUserId) {
    await admin.auth.admin.deleteUser(invitedUserId);
  }
  console.error(
    "Super Admin bootstrap was not completed. No bootstrap credentials or secret values were written.",
  );
  process.exitCode = 1;
}
