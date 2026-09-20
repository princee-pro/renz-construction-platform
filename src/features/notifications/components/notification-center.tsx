"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  archiveNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/notification-actions";
import {
  notificationCategoryLabels,
  notificationListUrl,
  notificationSeverityLabels,
  relativeTime,
  safeNotificationHref,
  type NotificationItem,
  type NotificationList,
  type NotificationListFilters,
} from "@/features/notifications/notification-contract";
import { formatInBusinessZone } from "@/lib/time/business-time";

/**
 * Notification register (C9 §82–83): filters live in the URL, the list is
 * keyset-paginated, and each row offers Open / Mark read / Mark unread /
 * Archive. At 390px each row stacks title, category, time and actions —
 * no table squeeze.
 */
export function NotificationCenter({
  result,
  filters,
}: Readonly<{ result: NotificationList; filters: NotificationListFilters }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function run(id: string | null, command: () => Promise<{ ok: boolean; message: string }>) {
    setBusyId(id);
    startTransition(async () => {
      const outcome = await command();
      setMessage(outcome.message);
      setBusyId(null);
      router.refresh();
    });
  }

  const last = result.items.at(-1);
  const nextHref = last
    ? notificationListUrl(filters, { cursorCreatedAt: last.created_at, cursorId: last.id })
    : null;

  return (
    <section aria-label="Notifications" className="notification-center">
      <div className="section-heading-row section-heading-compact">
        <p className="panel-copy" role="status">
          {result.unread_count === 0
            ? "No unread notifications."
            : `${result.unread_count} unread.`}{" "}
          {message}
        </p>
        {result.unread_count > 0 ? (
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => run(null, markAllNotificationsReadAction)}
            type="button"
          >
            Mark all read
          </button>
        ) : null}
      </div>
      {result.items.length === 0 ? (
        <p className="quiet-empty">
          {filters.state === "archived"
            ? "Nothing archived."
            : "No notifications match these filters. New enquiries, assignments, payments, issued orders and due-date alerts appear here as they happen."}
        </p>
      ) : (
        <ul className="notification-list">
          {result.items.map((item) => (
            <NotificationRow
              busy={busyId === item.id}
              item={item}
              key={item.id}
              onArchive={() => run(item.id, () => archiveNotificationAction(item.id))}
              onToggleRead={() =>
                run(item.id, () => markNotificationReadAction(item.id, !item.read_at))
              }
              timeZone={result.timezone}
            />
          ))}
        </ul>
      )}
      {result.has_more && nextHref ? (
        <div className="pagination-row">
          <Link className="button button-secondary" href={nextHref}>
            Older notifications
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function NotificationRow({
  item,
  busy,
  onToggleRead,
  onArchive,
  timeZone,
}: Readonly<{
  item: NotificationItem;
  busy: boolean;
  onToggleRead: () => void;
  onArchive: () => void;
  timeZone: string;
}>) {
  const href = safeNotificationHref(item.href);
  return (
    <li
      className={item.read_at ? "notification-item" : "notification-item notification-unread"}
      data-severity={item.severity}
    >
      <div className="notification-main">
        <span className="notification-meta">
          <span className="notification-category">{notificationCategoryLabels[item.category]}</span>
          <span
            className={`status-badge status-${item.severity === "info" ? "neutral" : item.severity === "attention" ? "review" : "blocked"}`}
          >
            {notificationSeverityLabels[item.severity]}
          </span>
          <time dateTime={item.created_at} title={formatInBusinessZone(item.created_at, timeZone)}>
            {relativeTime(item.created_at)}
          </time>
          <span className="notification-state">
            {item.archived_at ? "Archived" : item.read_at ? "Read" : "Unread"}
          </span>
        </span>
        <strong>{item.title}</strong>
        {item.body_short ? <span className="notification-body">{item.body_short}</span> : null}
      </div>
      <div className="notification-actions">
        {href ? (
          <Link className="button button-quiet" href={href}>
            Open
          </Link>
        ) : null}
        {!item.archived_at ? (
          <button
            className="button button-quiet"
            disabled={busy}
            onClick={onToggleRead}
            type="button"
          >
            {item.read_at ? "Mark unread" : "Mark read"}
          </button>
        ) : null}
        {!item.archived_at ? (
          <button className="button button-quiet" disabled={busy} onClick={onArchive} type="button">
            Archive
          </button>
        ) : null}
      </div>
    </li>
  );
}
