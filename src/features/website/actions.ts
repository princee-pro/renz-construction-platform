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
import { isAdmittedCustomSlug } from "@/features/website/routes";
import {
  sectionMotions,
  sectionSpacings,
  sectionTones,
  validateSectionConfig,
} from "@/features/website/section-registry";
import type { Json } from "@/lib/database/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function conflictOrError(data: unknown): AdminActionState {
  const code = commandReasonCode(data);
  if (code === "version_conflict") {
    return actionState(
      "conflict",
      "Another staff member changed this first. Reload to see their version; nothing was overwritten.",
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  return actionState("error", commandReason(data));
}

/** Public routes that must re-render after a publish, unpublish or restore. */
function revalidatePublicPage(path: string | null): void {
  if (path && !path.startsWith("/_")) revalidatePath(path);
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
}

function revalidateAdmin(pageId: string): void {
  revalidatePath("/admin/website");
  revalidatePath("/admin/website/pages");
  revalidatePath(`/admin/website/pages/${pageId}`);
  revalidatePath("/admin/settings/launch-readiness");
}

// ---------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------

export async function createWebsitePageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("website.pages.write");
  if (denied) return denied;
  const slug = formText(formData, "slug").trim().toLowerCase();
  const title = formText(formData, "title").trim();
  if (!isAdmittedCustomSlug(slug)) {
    return actionState(
      "error",
      "Choose an address that is not reserved: lowercase letters, numbers and hyphens.",
      {
        fieldErrors: { slug: "This address is reserved or not valid." },
      },
    );
  }
  if (title.length < 1 || title.length > 160 || /[<>]/u.test(title)) {
    return actionState("error", "Give the page a plain-text title (up to 160 characters).", {
      fieldErrors: { title: "Enter a title up to 160 characters." },
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_website_page", {
    target_slug: slug,
    target_title: title,
    target_page_type: "custom",
  });
  if (error || !commandSucceeded(data)) {
    const code = commandReasonCode(data);
    return actionState("error", commandReason(data), {
      fieldErrors:
        code === "reserved_route" || code === "duplicate_route"
          ? { slug: commandReason(data) }
          : {},
    });
  }
  const id = commandId(data);
  revalidatePath("/admin/website/pages");
  if (id) redirect(`/admin/website/pages/${id}`);
  return actionState("success", "Page created.");
}

const pageSettingsSchema = z.object({
  pageId: uuid,
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().max(80).nullable(),
  seoTitle: z.string().trim().max(160),
  seoDescription: z.string().trim().max(320),
  ogMediaId: z.string().uuid().nullable(),
  noindex: z.boolean(),
});

export async function updateWebsitePageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("website.pages.write");
  if (denied) return denied;
  const parsed = pageSettingsSchema.safeParse({
    pageId: formText(formData, "pageId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    title: formText(formData, "title"),
    slug: formText(formData, "slug").trim() || null,
    seoTitle: formText(formData, "seoTitle"),
    seoDescription: formText(formData, "seoDescription"),
    ogMediaId: formText(formData, "ogMediaId").trim() || null,
    noindex: formText(formData, "noindex") === "on",
  });
  if (!parsed.success) {
    return actionState("error", "Check the page settings.", {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
      ),
    });
  }
  const input = parsed.data;
  if (input.slug !== null && !isAdmittedCustomSlug(input.slug)) {
    return actionState("error", "This address is reserved or not valid.", {
      fieldErrors: { slug: "This address is reserved or not valid." },
    });
  }
  if (/[<>]/u.test(input.title + input.seoTitle + input.seoDescription)) {
    return actionState("error", "Markup is not accepted in page settings.");
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_website_page", {
    target_id: input.pageId,
    expected_version: input.expectedVersion,
    target_title: input.title,
    // Nullable SQL parameters: the generated types spell them as string.
    target_slug: input.slug as unknown as string,
    target_seo_title: (input.seoTitle || null) as unknown as string,
    target_seo_description: (input.seoDescription || null) as unknown as string,
    target_og_media_id: input.ogMediaId as unknown as string,
    target_noindex: input.noindex,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(input.pageId);
  return actionState("success", "Page settings saved. They go live when you publish.", {
    currentVersion: commandVersion(data),
  });
}

// ---------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------

const sectionSaveSchema = z.object({
  sectionId: uuid,
  sectionType: z.string().regex(/^[a-z][a-z0-9_]*$/u),
  expectedVersion: z.number().int().positive(),
  config: z.string().max(200_000),
  variant: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/u),
  tone: z.enum(sectionTones),
  spacing: z.enum(sectionSpacings),
  motion: z.enum(sectionMotions),
  hidden: z.boolean(),
  label: z.string().trim().max(80),
});

export async function saveWebsiteSectionAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("website.pages.write");
  if (denied) return denied;
  const parsed = sectionSaveSchema.safeParse({
    sectionId: formText(formData, "sectionId"),
    sectionType: formText(formData, "sectionType"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    config: formText(formData, "config"),
    variant: formText(formData, "variant") || "default",
    tone: formText(formData, "tone") || "paper",
    spacing: formText(formData, "spacing") || "standard",
    motion: formText(formData, "motion") || "standard",
    hidden: formText(formData, "hidden") === "on",
    label: formText(formData, "label"),
  });
  if (!parsed.success) return actionState("error", "Check the section settings.");
  let config: unknown;
  try {
    config = JSON.parse(parsed.data.config);
  } catch {
    return actionState("error", "The section content could not be read. Reload and try again.");
  }
  const validated = validateSectionConfig(parsed.data.sectionType, config);
  if (!validated.ok) {
    return actionState("error", "Some fields need attention before this section can be saved.", {
      fieldErrors: validated.errors,
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_website_section", {
    target_section_id: parsed.data.sectionId,
    expected_section_version: parsed.data.expectedVersion,
    target_config: validated.config as Json,
    target_variant: parsed.data.variant,
    target_tone: parsed.data.tone,
    target_spacing: parsed.data.spacing,
    target_motion: parsed.data.motion,
    target_hidden: parsed.data.hidden,
    target_label: (parsed.data.label || null) as unknown as string,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  const pageId = formText(formData, "pageId");
  if (uuid.safeParse(pageId).success) revalidateAdmin(pageId);
  return actionState("success", "Section saved. Changes stay private until you publish.", {
    currentVersion: commandVersion(data),
    detail: String(commandVersion(data, "page_version") ?? ""),
  });
}

export async function addWebsiteSectionAction(
  pageId: string,
  expectedPageVersion: number,
  sectionType: string,
  position: number | null,
): Promise<AdminActionState> {
  const denied = await authorize("website.layout.write");
  if (denied) return denied;
  if (!uuid.safeParse(pageId).success || !/^[a-z][a-z0-9_]*$/u.test(sectionType)) {
    return actionState("error", "That section type is not available.");
  }
  const { defaultSectionConfig, getSectionType } =
    await import("@/features/website/section-registry");
  const definition = getSectionType(sectionType);
  if (!definition || definition.systemModule || definition.scope !== "any") {
    return actionState("error", "That section type cannot be added.");
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_website_section", {
    target_page_id: pageId,
    expected_page_version: expectedPageVersion,
    target_section_type: sectionType,
    target_config: defaultSectionConfig(sectionType) as Json,
    target_variant: definition.variants[0]?.value ?? "default",
    target_tone: "paper",
    target_spacing: "standard",
    ...(position !== null ? { target_position: position } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  return actionState("success", `${definition.label} added.`, {
    createdId: commandId(data),
    currentVersion: commandVersion(data, "page_version"),
  });
}

export async function moveWebsiteSectionAction(
  pageId: string,
  sectionId: string,
  expectedPageVersion: number,
  direction: "up" | "down",
): Promise<AdminActionState> {
  const denied = await authorize("website.layout.write");
  if (denied) return denied;
  if (!uuid.safeParse(sectionId).success) return actionState("error", "Section not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("move_website_section", {
    target_section_id: sectionId,
    expected_page_version: expectedPageVersion,
    direction,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  return actionState("success", direction === "up" ? "Moved up." : "Moved down.", {
    currentVersion: commandVersion(data, "page_version"),
  });
}

export async function reorderWebsiteSectionsAction(
  pageId: string,
  expectedPageVersion: number,
  orderedIds: readonly string[],
): Promise<AdminActionState> {
  const denied = await authorize("website.layout.write");
  if (denied) return denied;
  if (!uuid.safeParse(pageId).success || !orderedIds.every((id) => uuid.safeParse(id).success)) {
    return actionState("error", "The order could not be read.");
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("reorder_website_sections", {
    target_page_id: pageId,
    expected_page_version: expectedPageVersion,
    ordered_ids: [...orderedIds],
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  return actionState("success", "Order saved.", {
    currentVersion: commandVersion(data, "page_version"),
  });
}

export async function duplicateWebsiteSectionAction(
  pageId: string,
  sectionId: string,
  expectedPageVersion: number,
): Promise<AdminActionState> {
  const denied = await authorize("website.layout.write");
  if (denied) return denied;
  if (!uuid.safeParse(sectionId).success) return actionState("error", "Section not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("duplicate_website_section", {
    target_section_id: sectionId,
    expected_page_version: expectedPageVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  return actionState("success", "Section duplicated below the original.", {
    createdId: commandId(data),
    currentVersion: commandVersion(data, "page_version"),
  });
}

export async function deleteWebsiteSectionAction(
  pageId: string,
  sectionId: string,
  expectedPageVersion: number,
): Promise<AdminActionState> {
  const denied = await authorize("website.layout.write");
  if (denied) return denied;
  if (!uuid.safeParse(sectionId).success) return actionState("error", "Section not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("delete_website_section", {
    target_section_id: sectionId,
    expected_page_version: expectedPageVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  return actionState(
    "success",
    "Section removed from the draft. Publish to remove it from the website.",
    {
      currentVersion: commandVersion(data, "page_version"),
    },
  );
}

// ---------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------

export async function publishWebsitePageAction(
  pageId: string,
  pagePath: string,
  expectedVersion: number,
  summary: string,
): Promise<AdminActionState> {
  const denied = await authorize("website.publish");
  if (denied) return denied;
  if (!uuid.safeParse(pageId).success) return actionState("error", "Page not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("publish_website_page", {
    target_id: pageId,
    expected_version: expectedVersion,
    ...(summary.trim() ? { summary: summary.trim().slice(0, 300) } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  revalidatePublicPage(pagePath);
  return actionState(
    "success",
    `Published as revision ${commandVersion(data, "revision_no") ?? ""}. Visitors see it now.`,
    {
      currentVersion: commandVersion(data),
    },
  );
}

export async function unpublishWebsitePageAction(
  pageId: string,
  pagePath: string,
  expectedVersion: number,
): Promise<AdminActionState> {
  const denied = await authorize("website.publish");
  if (denied) return denied;
  if (!uuid.safeParse(pageId).success) return actionState("error", "Page not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("unpublish_website_page", {
    target_id: pageId,
    expected_version: expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  revalidatePublicPage(pagePath);
  return actionState(
    "success",
    "Unpublished. The address no longer resolves publicly; the draft and its history are kept.",
    {
      currentVersion: commandVersion(data),
    },
  );
}

export async function archiveWebsitePageAction(
  pageId: string,
  expectedVersion: number,
): Promise<AdminActionState> {
  const denied = await authorize("website.publish");
  if (denied) return denied;
  if (!uuid.safeParse(pageId).success) return actionState("error", "Page not found.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_website_page", {
    target_id: pageId,
    expected_version: expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  return actionState("success", "Page archived. Its history is kept.", {
    currentVersion: commandVersion(data),
  });
}

export async function restoreWebsiteRevisionAction(
  pageId: string,
  expectedVersion: number,
  revisionId: string,
): Promise<AdminActionState> {
  const denied = await authorize("website.publish");
  if (denied) return denied;
  if (!uuid.safeParse(pageId).success || !uuid.safeParse(revisionId).success) {
    return actionState("error", "Revision not found.");
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("restore_website_page_revision", {
    target_id: pageId,
    expected_version: expectedVersion,
    target_revision_id: revisionId,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAdmin(pageId);
  return actionState(
    "success",
    `Revision ${commandVersion(data, "restored_revision_no") ?? ""} restored as the new draft. Preview it, then publish to make it live.`,
    { currentVersion: commandVersion(data) },
  );
}
