// Publishes the RENZ editorial insights (src/features/public-content/
// editorial-insights.ts) into the posts domain so Admin, the sitemap and
// analytics see them as real published content. Owner-authorized starter
// content (D1.5 §40–§41); idempotent by slug; needs SUPABASE_URL +
// SUPABASE_SECRET_KEY (local: taken from `supabase status`). The reviewer is
// the first active super_admin profile — publication metadata is honest:
// the owner delegated and reviewed this content.
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import {
  client,
  createActor,
  credentials as localCredentials,
  rpc,
  signInAndActivate,
} from "./c4-local.mjs";

async function loadInsights() {
  // Node strips the TypeScript types natively; the only import in the
  // article module is type-only, so no bundler is needed.
  return import(pathToFileURL("src/features/public-content/editorial-insights.ts").href);
}

/**
 * A staff session with content.publish. Production: the owner passes their
 * own credentials (RENZ_PUBLISH_EMAIL / RENZ_PUBLISH_PASSWORD / RENZ_PUBLISH_TOTP,
 * the current authenticator code). Local: a synthetic super_admin is created
 * for the run, exactly as the verifiers do.
 */
async function staffSession() {
  const email = process.env.RENZ_PUBLISH_EMAIL;
  const password = process.env.RENZ_PUBLISH_PASSWORD;
  const code = process.env.RENZ_PUBLISH_TOTP;
  if (email && password && code) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishable) throw new Error("SUPABASE URL / publishable key are required.");
    const session = createClient(url, publishable, { auth: { persistSession: false } });
    const signedIn = await session.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw new Error("Sign-in failed.");
    const factors = await session.auth.mfa.listFactors();
    const factor = factors.data?.totp.find((entry) => entry.status === "verified");
    if (!factor) throw new Error("A verified authenticator is required.");
    const verified = await session.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verified.error) throw new Error("Authenticator code was rejected.");
    return { session, userId: signedIn.data.user.id };
  }
  const runId = crypto.randomBytes(2).toString("hex");
  const localEmail = `synthetic-insights-publisher-${runId}@example.test`;
  const localPassword = ["SYNTHETIC", "Insights", "Local", "Only", "2026!"].join("-");
  const userId = await createActor(localEmail, localPassword, "super_admin");
  const session = await signInAndActivate(localEmail, localPassword);
  return { session, userId };
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const admin =
    url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : client(localCredentials.secretKey);
  const { editorialInsights } = await loadInsights();
  const { session, userId: reviewer } = await staffSession();

  const results = [];
  for (const insight of editorialInsights) {
    const existing = await admin
      .from("post_localizations")
      .select("post_id")
      .eq("locale", "en")
      .eq("slug", insight.slug)
      .maybeSingle();
    if (existing.data) {
      results.push({ slug: insight.slug, status: "exists" });
      continue;
    }
    // Same requirements the publication readiness check enforces.
    for (const field of ["title", "excerpt", "seoTitle", "seoDescription", "publicationDate"]) {
      if (!insight[field] || !String(insight[field]).trim()) {
        throw new Error(`${insight.slug} is missing ${field}.`);
      }
    }
    if (insight.bodyBlocks.length === 0) throw new Error(`${insight.slug} has no body.`);
    const now = new Date().toISOString();
    // Draft first; publication goes through the reviewed publish command so
    // the readiness checks and audit trail apply exactly as in Admin.
    const post = await admin
      .from("posts")
      .insert({
        publication_status: "draft",
        publication_date: insight.publicationDate,
        reviewed_by: reviewer,
        reviewed_at: now,
        created_by: reviewer,
        updated_by: reviewer,
      })
      .select("id")
      .single();
    if (post.error || !post.data) throw new Error(`Post insert failed: ${post.error?.message}`);
    const localization = await admin.from("post_localizations").insert({
      post_id: post.data.id,
      locale: "en",
      slug: insight.slug,
      title: insight.title,
      excerpt: insight.excerpt,
      body_blocks: insight.bodyBlocks,
      schema_version: 1,
      seo_title: insight.seoTitle,
      seo_description: insight.seoDescription,
      created_by: reviewer,
      updated_by: reviewer,
    });
    if (localization.error) {
      await admin.from("posts").delete().eq("id", post.data.id);
      throw new Error(`Localization insert failed: ${localization.error.message}`);
    }
    const published = await rpc(session, "publish_post", {
      target_id: post.data.id,
      expected_version: 1,
    });
    if (published?.ok !== true) {
      throw new Error(`publish_post refused ${insight.slug}: ${JSON.stringify(published)}`);
    }
    results.push({ slug: insight.slug, status: "published", id: post.data.id });
  }
  console.log(JSON.stringify({ ok: true, results }));
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
