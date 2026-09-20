import "server-only";

import {
  notificationListSchema,
  notificationPreferencesSchema,
  notificationSummarySchema,
  type NotificationList,
  type NotificationListFilters,
  type NotificationPreferences,
  type NotificationSummary,
} from "@/features/notifications/notification-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Header summary: unread count + latest few (own notifications only, by RLS-free facade). */
export async function loadNotificationSummary(): Promise<NotificationSummary | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_notifications_summary", { limit_count: 6 });
  if (error) return null;
  const parsed = notificationSummarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function loadNotificationList(
  filters: NotificationListFilters,
  pageSize = 25,
): Promise<NotificationList> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_notifications", {
    state_filter: filters.state,
    page_size: pageSize,
    ...(filters.category ? { category_filter: filters.category } : {}),
    ...(filters.severity ? { severity_filter: filters.severity } : {}),
    ...(filters.from ? { date_from: filters.from } : {}),
    ...(filters.to ? { date_to: filters.to } : {}),
    ...(filters.cursorCreatedAt && filters.cursorId
      ? { cursor_created_at: filters.cursorCreatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("Notifications could not be loaded.");
  return notificationListSchema.parse(data);
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_notification_preferences");
  if (error) return null;
  const parsed = notificationPreferencesSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
