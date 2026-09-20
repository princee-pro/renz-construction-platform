"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionState,
  authorize,
  commandReason,
  commandReasonCode,
  commandSucceeded,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { formNumber, formText, type AdminActionState } from "@/features/admin-shared/action-state";
import { loadMediaList } from "@/features/website/media-data";
import { mediaFilters, type MediaItem } from "@/features/website/media-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function conflictOrError(data: unknown): AdminActionState {
  if (commandReasonCode(data) === "version_conflict") {
    return actionState("conflict", "This image changed first. Reload and try again.", {
      currentVersion: commandVersion(data, "current_version"),
    });
  }
  return actionState("error", commandReason(data));
}

function revalidateMedia(mediaId?: string): void {
  revalidatePath("/admin/website/media");
  if (mediaId) revalidatePath(`/admin/website/media/${mediaId}`);
  revalidatePath("/admin/website");
}

/** Media picker search (page editor, project / insight hero pickers). */
export async function searchMediaAction(
  query: string,
  filter: string = "all",
): Promise<readonly MediaItem[]> {
  const denied = await authorize("media.read");
  if (denied) return [];
  const safeFilter = (mediaFilters as readonly string[]).includes(filter)
    ? (filter as (typeof mediaFilters)[number])
    : "all";
  const list = await loadMediaList(query.trim().slice(0, 100), safeFilter, 48);
  return list.items;
}

export async function updateMediaMetadataAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("media.manage");
  if (denied) return denied;
  const mediaId = formText(formData, "mediaId");
  if (!uuid.safeParse(mediaId).success) return actionState("error", "Media not found.");
  const alt = formText(formData, "altText").trim();
  const caption = formText(formData, "caption").trim();
  const focalX = formNumber(formData, "focalX");
  const focalY = formNumber(formData, "focalY");
  if (/[<>]/u.test(alt + caption))
    return actionState("error", "Markup is not accepted in alt text or captions.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_update_media_metadata", {
    target_id: mediaId,
    expected_version: formNumber(formData, "expectedVersion"),
    target_alt_text: (alt || null) as unknown as string,
    target_caption: (caption || null) as unknown as string,
    target_focal_x: Number.isFinite(focalX) ? Math.min(1, Math.max(0, focalX)) : 0.5,
    target_focal_y: Number.isFinite(focalY) ? Math.min(1, Math.max(0, focalY)) : 0.5,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateMedia(mediaId);
  return actionState("success", "Image details saved.", { currentVersion: commandVersion(data) });
}

export async function confirmMediaRightsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("media.manage");
  if (denied) return denied;
  const mediaId = formText(formData, "mediaId");
  const classification = formText(formData, "classification");
  const holder = formText(formData, "rightsHolder").trim();
  const source = formText(formData, "rightsSource").trim();
  const credit = formText(formData, "credit").trim();
  if (!uuid.safeParse(mediaId).success) return actionState("error", "Media not found.");
  if (!["renz_provided", "generated_concept", "licensed"].includes(classification)) {
    return actionState("error", "Choose how RENZ holds the rights to this image.", {
      fieldErrors: { classification: "Choose a classification." },
    });
  }
  if (holder.length < 1 || holder.length > 200 || /[<>]/u.test(holder + source + credit)) {
    return actionState("error", "Name who holds the rights (plain text, up to 200 characters).", {
      fieldErrors: { rightsHolder: "Enter the rights holder." },
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_confirm_media_rights", {
    target_id: mediaId,
    expected_version: formNumber(formData, "expectedVersion"),
    target_classification: classification,
    target_rights_holder: holder,
    ...(source ? { target_rights_source: source } : {}),
    ...(credit ? { target_credit: credit } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateMedia(mediaId);
  return actionState("success", "Rights confirmed. The image can now be used on the website.", {
    currentVersion: commandVersion(data),
  });
}

export async function archiveMediaAction(
  mediaId: string,
  expectedVersion: number,
): Promise<AdminActionState> {
  const denied = await authorize("media.manage");
  if (denied) return denied;
  if (!uuid.safeParse(mediaId).success) return actionState("error", "Media not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_media_asset", {
    target_id: mediaId,
    expected_version: expectedVersion,
  });
  if (error || !commandSucceeded(data)) {
    if (commandReasonCode(data) === "media_in_use") {
      return actionState(
        "error",
        "This image is still in use. Replace or unlink it everywhere before archiving.",
      );
    }
    return conflictOrError(data);
  }
  revalidateMedia(mediaId);
  return actionState("success", "Image archived.", { currentVersion: commandVersion(data) });
}

export async function replaceWebsiteMediaAction(
  oldId: string,
  newId: string,
): Promise<AdminActionState> {
  const denied = await authorize("website.pages.write");
  if (denied) return denied;
  if (!uuid.safeParse(oldId).success || !uuid.safeParse(newId).success)
    return actionState("error", "Choose a replacement image.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_replace_website_media", {
    target_old_id: oldId,
    target_new_id: newId,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateMedia(oldId);
  revalidatePath("/admin/website/pages");
  const pages = commandVersion(data, "pages") ?? 0;
  return actionState(
    "success",
    pages > 0
      ? `Replaced on ${pages} page draft(s). Publish those pages to update the website.`
      : "No page draft referenced this image.",
  );
}
