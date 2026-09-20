"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  actionState,
  authorize,
  commandId,
  commandReason,
  commandReasonCode,
  commandSucceeded,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { formNumber, formText, type AdminActionState } from "@/features/admin-shared/action-state";
import { archiveContent, publishContent, unpublishContent } from "@/lib/content/operations";
import { parseRichText } from "@/lib/content/rich-text";
import { contentBlocksSchema } from "@/lib/content/schemas";
import type { Json } from "@/lib/database/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const plain = (value: string) =>
  !/[<>]/u.test(value) && !/(?:javascript\s*:|data\s*:)/iu.test(value);

function conflictOrError(data: unknown): AdminActionState {
  const code = commandReasonCode(data);
  return actionState(code === "version_conflict" ? "conflict" : "error", commandReason(data), {
    currentVersion: commandVersion(data, "current_version"),
  });
}

function revalidateInsight(postId: string): void {
  revalidatePath("/admin/content/insights");
  revalidatePath(`/admin/content/insights/${postId}`);
  revalidatePath("/admin/website");
}

export async function createInsightAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const title = formText(formData, "title").trim();
  const slug = formText(formData, "slug").trim().toLowerCase();
  if (!slugPattern.test(slug) || slug.length > 120) {
    return actionState("error", "Choose an address with lowercase letters, numbers and hyphens.", {
      fieldErrors: { slug: "Lowercase letters, numbers and hyphens only." },
    });
  }
  if (title.length < 1 || title.length > 200 || !plain(title)) {
    return actionState("error", "Give the article a plain-text title.", {
      fieldErrors: { title: "Enter a title up to 200 characters." },
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_post_draft", {
    target_slug: slug,
    target_title: title,
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), {
      fieldErrors:
        commandReasonCode(data) === "duplicate_route" ? { slug: commandReason(data) } : {},
    });
  }
  const id = commandId(data);
  revalidatePath("/admin/content/insights");
  if (id) redirect(`/admin/content/insights/${id}`);
  return actionState("success", "Insight created.");
}

export async function saveInsightAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const postId = formText(formData, "postId");
  if (!uuid.safeParse(postId).success) return actionState("error", "Insight not found.");
  const slug = formText(formData, "slug").trim().toLowerCase();
  const title = formText(formData, "title").trim();
  const excerpt = formText(formData, "excerpt").trim();
  const seoTitle = formText(formData, "seoTitle").trim();
  const seoDescription = formText(formData, "seoDescription").trim();
  const topic = formText(formData, "topic").trim();
  const publicationDate = formText(formData, "publicationDate").trim();
  const relatedServiceId = formText(formData, "relatedServiceId").trim();
  const heroAssetId = formText(formData, "heroAssetId").trim();
  const bodyText = formText(formData, "body");
  const fieldErrors: Record<string, string> = {};
  if (!slugPattern.test(slug) || slug.length > 120)
    fieldErrors["slug"] = "Lowercase letters, numbers and hyphens only.";
  if (title.length < 1 || title.length > 200 || !plain(title))
    fieldErrors["title"] = "Enter a title up to 200 characters.";
  if (excerpt.length > 600 || !plain(excerpt))
    fieldErrors["excerpt"] = "Up to 600 characters of plain text.";
  if (seoTitle.length > 160 || !plain(seoTitle))
    fieldErrors["seoTitle"] = "Up to 160 characters of plain text.";
  if (seoDescription.length > 320 || !plain(seoDescription))
    fieldErrors["seoDescription"] = "Up to 320 characters of plain text.";
  if (topic.length > 80 || !plain(topic)) fieldErrors["topic"] = "Up to 80 characters.";
  if (publicationDate && !/^\d{4}-\d{2}-\d{2}$/u.test(publicationDate))
    fieldErrors["publicationDate"] = "Use a date.";
  if (relatedServiceId && !uuid.safeParse(relatedServiceId).success)
    fieldErrors["relatedServiceId"] = "Choose a service.";
  if (heroAssetId && !uuid.safeParse(heroAssetId).success)
    fieldErrors["heroAssetId"] = "Choose an image.";
  const blocks = contentBlocksSchema.safeParse(parseRichText(bodyText));
  if (!blocks.success)
    fieldErrors["body"] =
      "The text contains something that is not accepted (markup or an unsafe link).";
  if (Object.keys(fieldErrors).length > 0) {
    return actionState("error", "Some fields need attention.", { fieldErrors });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_post_draft", {
    target_id: postId,
    expected_version: formNumber(formData, "expectedVersion"),
    expected_localization_version: formNumber(formData, "expectedLocalizationVersion"),
    target_slug: slug,
    target_title: title,
    target_excerpt: (excerpt || null) as unknown as string,
    target_body_blocks: (blocks.success ? blocks.data : []) as unknown as Json,
    target_seo_title: (seoTitle || null) as unknown as string,
    target_seo_description: (seoDescription || null) as unknown as string,
    target_publication_date: (publicationDate || null) as unknown as string,
    target_topic: (topic || null) as unknown as string,
    target_related_service_id: (relatedServiceId || null) as unknown as string,
    target_featured: formText(formData, "featured") === "on",
    target_pinned: formText(formData, "pinned") === "on",
    target_sort_priority: Math.max(0, Math.min(100000, formNumber(formData, "sortPriority") || 0)),
    target_hero_asset_id: (heroAssetId || null) as unknown as string,
  });
  if (error || !commandSucceeded(data)) {
    const code = commandReasonCode(data);
    if (code === "duplicate_route")
      return actionState("error", commandReason(data), {
        fieldErrors: { slug: commandReason(data) },
      });
    return conflictOrError(data);
  }
  revalidateInsight(postId);
  return actionState("success", "Insight saved. It stays private until you publish.", {
    currentVersion: commandVersion(data),
    detail: String(commandVersion(data, "localization_version") ?? ""),
  });
}

export async function markInsightReviewedAction(
  postId: string,
  expectedVersion: number,
): Promise<AdminActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  if (!uuid.safeParse(postId).success) return actionState("error", "Insight not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("mark_post_reviewed", {
    target_id: postId,
    expected_version: expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateInsight(postId);
  return actionState("success", "Marked as reviewed.", { currentVersion: commandVersion(data) });
}

export async function changeInsightPublicationAction(
  postId: string,
  expectedVersion: number,
  operation: "publish" | "unpublish" | "archive",
): Promise<AdminActionState> {
  const denied = await authorize(operation === "archive" ? "content.archive" : "content.publish");
  if (denied) return denied;
  if (!uuid.safeParse(postId).success) return actionState("error", "Insight not found.");
  const command = { contentType: "post" as const, targetId: postId, expectedVersion };
  let result: unknown;
  try {
    result =
      operation === "publish"
        ? await publishContent(command, undefined, { cachePolicy: "read-your-own-writes" })
        : operation === "unpublish"
          ? await unpublishContent(command, undefined, { cachePolicy: "read-your-own-writes" })
          : await archiveContent(command, undefined, { cachePolicy: "read-your-own-writes" });
  } catch {
    return actionState("error", "Publishing is temporarily unavailable. Nothing changed.");
  }
  if (!commandSucceeded(result)) return conflictOrError(result);
  revalidateInsight(postId);
  revalidatePath("/insights");
  revalidatePath("/", "layout");
  return actionState(
    "success",
    operation === "publish"
      ? "Published. The article is on the website."
      : operation === "unpublish"
        ? "Unpublished. The article is no longer on the website; the draft is kept."
        : "Archived.",
    { currentVersion: commandVersion(result) },
  );
}
