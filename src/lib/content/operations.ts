import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  expireContentAfterServerAction,
  invalidatePublishedContent,
} from "@/lib/content/invalidation";
import type { Database } from "@/lib/database/database.types";
import { parsePublicationCommand } from "@/lib/content/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = SupabaseClient<Database>;
type PublicationResult = Database["public"]["Functions"]["publish_content"]["Returns"];
type ReadinessResult = Database["public"]["Functions"]["check_publication_readiness"]["Returns"];
type PublicationCachePolicy = "stale-while-revalidate" | "read-your-own-writes";

type PublicationOptions = Readonly<{
  cachePolicy?: PublicationCachePolicy;
}>;

function publicationSucceeded(result: PublicationResult): boolean {
  return (
    typeof result === "object" && result !== null && !Array.isArray(result) && result["ok"] === true
  );
}

async function getClient(client?: DatabaseClient): Promise<DatabaseClient> {
  return client ?? (await createServerSupabaseClient());
}

export async function checkPublicationReadiness(
  commandInput: unknown,
  client?: DatabaseClient,
): Promise<ReadinessResult> {
  const command = parsePublicationCommand(commandInput);
  const supabase = await getClient(client);
  const { data, error } = await supabase.rpc("check_publication_readiness", {
    content_type: command.contentType,
    target_id: command.targetId,
  });
  if (error || data === null) {
    throw new Error("Publication readiness could not be evaluated.");
  }
  return data;
}

export async function publishContent(
  commandInput: unknown,
  client?: DatabaseClient,
  options?: PublicationOptions,
): Promise<PublicationResult> {
  return changePublication("publish_content", commandInput, client, options);
}

export async function unpublishContent(
  commandInput: unknown,
  client?: DatabaseClient,
  options?: PublicationOptions,
): Promise<PublicationResult> {
  return changePublication("unpublish_content", commandInput, client, options);
}

export async function archiveContent(
  commandInput: unknown,
  client?: DatabaseClient,
  options?: PublicationOptions,
): Promise<PublicationResult> {
  return changePublication("archive_content", commandInput, client, options);
}

async function changePublication(
  operation: "publish_content" | "unpublish_content" | "archive_content",
  commandInput: unknown,
  client?: DatabaseClient,
  options: PublicationOptions = {},
): Promise<PublicationResult> {
  const command = parsePublicationCommand(commandInput);
  const supabase = await getClient(client);
  const { data, error } = await supabase.rpc(operation, {
    content_type: command.contentType,
    target_id: command.targetId,
    expected_version: command.expectedVersion,
  });
  if (error || data === null) {
    throw new Error("The publication operation could not be completed.");
  }

  if (publicationSucceeded(data)) {
    if (options.cachePolicy === "read-your-own-writes") {
      expireContentAfterServerAction(command.contentType, command.targetId);
    } else {
      invalidatePublishedContent(command.contentType, command.targetId);
    }
  }

  return data;
}

/**
 * CR1 "Publish changes": a new current snapshot for an already-published
 * service / project / insight after the same readiness gate.
 */
export async function republishContent(
  commandInput: unknown,
  summary: string | null,
  client?: DatabaseClient,
): Promise<PublicationResult> {
  const command = parsePublicationCommand(commandInput);
  const supabase = await getClient(client);
  const { data, error } = await supabase.rpc("republish_content", {
    content_type: command.contentType,
    target_id: command.targetId,
    expected_version: command.expectedVersion,
    ...(summary ? { summary } : {}),
  });
  if (error || data === null) {
    throw new Error("The publication operation could not be completed.");
  }
  if (publicationSucceeded(data)) {
    expireContentAfterServerAction(command.contentType, command.targetId);
  }
  return data;
}

/** CR1 rollback: restore a stored revision into the draft (never destroys history). */
export async function restoreContentRevision(
  commandInput: unknown,
  revisionId: string,
  client?: DatabaseClient,
): Promise<PublicationResult> {
  const command = parsePublicationCommand(commandInput);
  const supabase = await getClient(client);
  const { data, error } = await supabase.rpc("restore_content_revision", {
    content_type: command.contentType,
    target_id: command.targetId,
    expected_version: command.expectedVersion,
    target_revision_id: revisionId,
  });
  if (error || data === null) {
    throw new Error("The restore operation could not be completed.");
  }
  return data;
}
