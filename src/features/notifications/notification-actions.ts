"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionState,
  authorize,
  commandReason,
  commandSucceeded,
} from "@/features/admin-shared/action-helpers";
import { type AdminActionState } from "@/features/admin-shared/action-state";
import {
  notificationCategories,
  notificationSummarySchema,
  type NotificationSummary,
} from "@/features/notifications/notification-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

function unreadCount(data: unknown): number | null {
  const value =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as { unread_count?: unknown }).unread_count
      : undefined;
  return typeof value === "number" ? value : null;
}

/** Header/panel refresh on a realtime pointer: the bell never trusts the socket payload. */
export async function notificationSummaryAction(): Promise<NotificationSummary | null> {
  const denied = await authorize("notifications.read");
  if (denied) return null;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_notifications_summary", { limit_count: 6 });
  if (error) return null;
  const parsed = notificationSummarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export type NotificationCommandResult = Readonly<{
  ok: boolean;
  message: string;
  unreadCount: number | null;
}>;

export async function markNotificationReadAction(
  id: string,
  read = true,
): Promise<NotificationCommandResult> {
  const denied = await authorize("notifications.read");
  if (denied) return { ok: false, message: denied.message, unreadCount: null };
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, message: "Notification not found.", unreadCount: null };
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("mark_notification_read", {
    target_id: parsed.data,
    target_read: read,
  });
  if (error || !commandSucceeded(data)) {
    return { ok: false, message: commandReason(data), unreadCount: null };
  }
  revalidatePath("/admin/notifications");
  return {
    ok: true,
    message: read ? "Marked read." : "Marked unread.",
    unreadCount: unreadCount(data),
  };
}

export async function markAllNotificationsReadAction(): Promise<NotificationCommandResult> {
  const denied = await authorize("notifications.read");
  if (denied) return { ok: false, message: denied.message, unreadCount: null };
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("mark_all_notifications_read");
  if (error || !commandSucceeded(data)) {
    return { ok: false, message: commandReason(data), unreadCount: null };
  }
  revalidatePath("/admin/notifications");
  return { ok: true, message: "All notifications marked read.", unreadCount: 0 };
}

export async function archiveNotificationAction(id: string): Promise<NotificationCommandResult> {
  const denied = await authorize("notifications.read");
  if (denied) return { ok: false, message: denied.message, unreadCount: null };
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, message: "Notification not found.", unreadCount: null };
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_notification", { target_id: parsed.data });
  if (error || !commandSucceeded(data)) {
    return { ok: false, message: commandReason(data), unreadCount: null };
  }
  revalidatePath("/admin/notifications");
  return { ok: true, message: "Archived.", unreadCount: unreadCount(data) };
}

export async function updateNotificationPreferencesAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("notifications.read");
  if (denied) return denied;
  const preferences: Record<string, boolean> = {};
  for (const category of notificationCategories) {
    if (category === "security" || category === "system") continue;
    preferences[category] = formData.get(`category:${category}`) === "on";
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_notification_preferences", { preferences });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidatePath("/admin/settings/notifications");
  return actionState("success", "Notification preferences saved.");
}

export async function runNotificationSweepAction(): Promise<AdminActionState> {
  const denied = await authorize("notifications.manage");
  if (denied) return denied;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_run_notification_sweep");
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  const produced =
    typeof data === "object" && data !== null && "produced" in data
      ? Number((data as { produced?: unknown }).produced ?? 0)
      : 0;
  revalidatePath("/admin/settings/notifications");
  revalidatePath("/admin/settings/launch-readiness");
  return actionState(
    "success",
    produced === 1
      ? "Sweep finished: 1 new notification."
      : `Sweep finished: ${produced} new notifications.`,
  );
}
