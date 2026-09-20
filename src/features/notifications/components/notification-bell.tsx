"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";

import { useRealtimePointers } from "@/features/admin-shared/use-realtime-pointers";
import {
  archiveNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  notificationSummaryAction,
} from "@/features/notifications/notification-actions";
import {
  notificationCategoryLabels,
  relativeTime,
  safeNotificationHref,
  type NotificationSummary,
} from "@/features/notifications/notification-contract";

/**
 * Header notification indicator (C9 §63, §84): a bell with an unread badge
 * and a compact non-modal panel of the latest notifications. Realtime
 * pointers (value-free) trigger a server-action refetch; nothing from the
 * socket is rendered. Keyboard: Enter/Space opens, Escape closes and returns
 * focus to the bell, Tab moves through the panel.
 */
export function NotificationBell({
  initial,
  compact = false,
}: Readonly<{ initial: NotificationSummary | null; compact?: boolean }>) {
  const router = useRouter();
  const [summary, setSummary] = useState<NotificationSummary | null>(initial);
  // A server refresh (router.refresh after Mark read / Archive in the
  // Notification Center) delivers a new server-rendered summary: adopt it.
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setSummary(initial);
  }
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await notificationSummaryAction();
      if (next) {
        setSummary((current) => {
          if (current && next.unread_count > current.unread_count) {
            setAnnouncement(
              next.unread_count === 1
                ? "1 unread notification"
                : `${next.unread_count} unread notifications`,
            );
          }
          return next;
        });
      }
    });
  }, []);

  const connectionState = useRealtimePointers(["notification"], () => {
    // Coalesce bursts (one event may notify several rules) into one refetch.
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refresh, 300);
  });

  useEffect(() => {
    // Fallback while the socket is down: refetch when the tab regains focus.
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const unread = summary?.unread_count ?? 0;
  const latest = summary?.latest ?? [];

  function applyResult(result: { ok: boolean; unreadCount: number | null }) {
    if (!result.ok) return;
    refresh();
  }

  function openNotification(id: string, href: string | null, read: boolean) {
    setOpen(false);
    startTransition(async () => {
      if (!read) applyResult(await markNotificationReadAction(id, true));
      const target = safeNotificationHref(href);
      router.push(target ?? "/admin/notifications");
    });
  }

  return (
    <div className={compact ? "notification-bell notification-bell-compact" : "notification-bell"}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread === 0 ? "Notifications, none unread" : `Notifications, ${unread} unread`}
        className="notification-bell-button"
        data-unread={unread}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) refresh();
        }}
        ref={buttonRef}
        type="button"
      >
        <span aria-hidden="true" className="bell-glyph">
          <svg fill="none" focusable="false" height="20" viewBox="0 0 24 24" width="20">
            <path
              d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
        {unread > 0 ? (
          <span aria-hidden="true" className="notification-badge">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
        {!compact ? <span className="notification-bell-text">Notifications</span> : null}
      </button>
      <span aria-live="polite" className="visually-hidden" role="status">
        {announcement}
      </span>
      {open ? (
        <div
          aria-label="Latest notifications"
          className="notification-panel"
          id={panelId}
          ref={panelRef}
          role="dialog"
        >
          <div className="notification-panel-head">
            <strong>{unread === 0 ? "No unread notifications" : `${unread} unread`}</strong>
            {unread > 0 ? (
              <button
                className="text-link"
                onClick={() =>
                  startTransition(async () => applyResult(await markAllNotificationsReadAction()))
                }
                type="button"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {connectionState === "disconnected" ? (
            <p className="notification-panel-note">Live updates paused; refreshed on focus.</p>
          ) : null}
          {latest.length === 0 ? (
            <p className="notification-panel-note">
              Nothing yet. New enquiries, assignments, payments and due-date alerts appear here.
            </p>
          ) : (
            <ul className="notification-list notification-list-compact">
              {latest.map((item) => (
                <li
                  className={
                    item.read_at ? "notification-item" : "notification-item notification-unread"
                  }
                  data-severity={item.severity}
                  key={item.id}
                >
                  <button
                    className="notification-open"
                    onClick={() => openNotification(item.id, item.href, Boolean(item.read_at))}
                    type="button"
                  >
                    <span className="notification-meta">
                      <span className="notification-category">
                        {notificationCategoryLabels[item.category]}
                      </span>
                      <time dateTime={item.created_at}>{relativeTime(item.created_at)}</time>
                      {!item.read_at ? <span className="visually-hidden">Unread.</span> : null}
                    </span>
                    <strong>{item.title}</strong>
                    {item.body_short ? (
                      <span className="notification-body">{item.body_short}</span>
                    ) : null}
                  </button>
                  <button
                    aria-label={`Archive: ${item.title}`}
                    className="notification-archive"
                    onClick={() =>
                      startTransition(async () =>
                        applyResult(await archiveNotificationAction(item.id)),
                      )
                    }
                    type="button"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="notification-panel-foot">
            <Link href="/admin/notifications" onClick={() => setOpen(false)}>
              Open Notification Center
            </Link>
            <Link href="/admin/settings/notifications" onClick={() => setOpen(false)}>
              Preferences
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
