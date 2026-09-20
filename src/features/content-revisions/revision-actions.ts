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
import type { AdminActionState } from "@/features/admin-shared/action-state";
import type { RevisionContentType } from "@/features/content-revisions/revision-data";
import { republishContent, restoreContentRevision } from "@/lib/content/operations";

const uuid = z.string().uuid();
const types = new Set<RevisionContentType>(["service", "project", "post"]);

function adminPath(contentType: RevisionContentType, targetId: string): string {
  return contentType === "service"
    ? `/admin/content/services/${targetId}`
    : contentType === "project"
      ? `/admin/content/projects/${targetId}`
      : `/admin/content/insights/${targetId}`;
}

function outcome(result: unknown): AdminActionState | null {
  if (commandSucceeded(result)) return null;
  const code = commandReasonCode(result);
  return actionState(code === "version_conflict" ? "conflict" : "error", commandReason(result), {
    currentVersion: commandVersion(result, "current_version"),
  });
}

/** "Publish changes" for a published service / project / insight (CR1 §25, §28). */
export async function republishContentAction(
  contentType: RevisionContentType,
  targetId: string,
  expectedVersion: number,
  summary: string,
): Promise<AdminActionState> {
  const denied = await authorize("content.publish");
  if (denied) return denied;
  if (!types.has(contentType) || !uuid.safeParse(targetId).success)
    return actionState("error", "Record not found.");
  let result: unknown;
  try {
    result = await republishContent(
      { contentType, targetId, expectedVersion },
      summary.trim().slice(0, 300) || null,
    );
  } catch {
    return actionState("error", "Publishing is temporarily unavailable. Nothing changed.");
  }
  const failure = outcome(result);
  if (failure) return failure;
  revalidatePath(adminPath(contentType, targetId));
  revalidatePath("/admin/website");
  revalidatePath("/", "layout");
  return actionState(
    "success",
    `Changes published as revision ${commandVersion(result, "revision_no") ?? ""}. Visitors see them now.`,
    {
      currentVersion: commandVersion(result),
    },
  );
}

/** Restore a revision as the new draft (CR1 §29–30). */
export async function restoreContentRevisionAction(
  contentType: RevisionContentType,
  targetId: string,
  expectedVersion: number,
  revisionId: string,
): Promise<AdminActionState> {
  const denied = await authorize("content.publish");
  if (denied) return denied;
  if (
    !types.has(contentType) ||
    !uuid.safeParse(targetId).success ||
    !uuid.safeParse(revisionId).success
  ) {
    return actionState("error", "Revision not found.");
  }
  let result: unknown;
  try {
    result = await restoreContentRevision({ contentType, targetId, expectedVersion }, revisionId);
  } catch {
    return actionState("error", "The restore is temporarily unavailable. Nothing changed.");
  }
  const failure = outcome(result);
  if (failure) return failure;
  revalidatePath(adminPath(contentType, targetId));
  return actionState(
    "success",
    `Revision ${commandVersion(result, "restored_revision_no") ?? ""} restored as the draft. Review it, then publish changes.`,
    {
      currentVersion: commandVersion(result),
    },
  );
}
