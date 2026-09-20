# C9 NOTIFICATION CENTER

In-app staff notifications: a bell with an unread badge in the admin shell
(sidebar header and mobile bar), a compact non-modal panel, the full
register at `/admin/notifications`, and per-staff preferences at
`/admin/settings/notifications`. In-app only: no email provider is
configured (the preferences page says so), WhatsApp is never used for staff
notifications, browser Notification API is not used.

## Model

`public.notifications`: `id`, `recipient_profile_id`, `category`
(`leads | projects | finance | contractors | procurement | website | security | system`),
`severity` (`info | attention | urgent`), `title` (≤ 120), `body_short`
(≤ 240), `entity_type`, `entity_id`, `href` (admin-relative only, validated
by check constraint and again by `safeNotificationHref` before navigation),
`dedupe_key` (unique per recipient), `created_at`, `read_at`, `archived_at`.
No hard delete. Default-deny RLS with FORCE; every read/write goes through
own-rows-only facades.

`public.notification_preferences (profile_id, category, in_app_enabled)` —
security and system are mandatory and cannot be stored as disabled.

`public.notification_sweep_runs` — history of timed sweeps (manual /
scheduled / verification) for Launch Readiness.

## Privacy of payloads

Payloads are deliberately small: document numbers, references, stage names,
dates, a truncated project title or partner name, and — for finance
recipients only, who hold `finance.invoices.read` — the payment currency and
amount. Never a lead message, email, address, note, attachment or private
contractor note. Recipients are resolved by permission, so nobody receives a
payload their permission does not cover.

## Facades

| Function                                  | Purpose                                        |
| ----------------------------------------- | ---------------------------------------------- |
| `admin_notifications_summary(limit)`      | unread count + latest (bell / Control Room)    |
| `admin_list_notifications(state, category, severity, from, to, cursor…, page_size)` | register, keyset paginated, own rows only |
| `mark_notification_read(id, read)`        | read / unread                                  |
| `mark_all_notifications_read()`           | audited `notification.mark_all_read`           |
| `archive_notification(id)`                | archive (also marks read)                      |
| `admin_get_notification_preferences()`    | categories, mandatory flags, email state, last sweep |
| `update_notification_preferences(jsonb)`  | audited `notification.preference_update`       |
| `admin_run_notification_sweep()`          | `notifications.manage`, audited `notification.sweep_run` |
| `run_notification_sweep(kind)`            | service_role only (script / task endpoint)     |

## Realtime

`private.notify` emits a value-free pointer `('notification', <id>, 'created')`
into `realtime_events` (the C4 channel). The bell subscribes with
`useRealtimePointers(["notification"])` and refetches the summary through a
server action (`notificationSummaryAction`); it never renders anything from
the socket. Bursts are coalesced (300 ms). When the socket is down the bell
refetches on window focus. The register mounts `RealtimeRefresh` for
`notification` pointers. Mark read / archive from the register call
`router.refresh()`, and the bell adopts the refreshed server summary.

## UX

- Bell: `aria-expanded`, `aria-haspopup="dialog"`, unread announced through
  a polite live region; the panel is a `role="dialog"` popover (not modal),
  Escape closes and returns focus to the bell, outside click closes.
- Panel: latest six with category, relative time, title, short body; Open
  marks read and routes to the record; Archive; Mark all read; links to the
  register and preferences.
- Register: All / Unread / Archived, category (with unread counts), severity
  and date filters in the URL; keyset "Older notifications"; each row: Open,
  Mark read/unread, Archive. At 390 px rows stack; no table.
- Control Room: an attention summary (unread count, up to five unread
  attention/urgent items) with links to the Notification Center and Analytics.

## Security

Analytics and notifications require an authenticated, active, AAL2 profile
with the exact permission (`requirePermission` / `authorize` in TypeScript
and `private.has_permission` in every RPC). A staff member can only read,
mark or archive their own rows; direct table access is denied for anon and
authenticated (pgTAP + `verify-c9.mjs` prove it as real roles).

## Scheduler boundary

Timed notifications need the sweep to run: `pnpm notifications:sweep`
(service credential; `SUPABASE_URL` + `SUPABASE_SECRET_KEY` in deployment,
local stack otherwise) or `POST /api/tasks/notifications-sweep` with
`Authorization: Bearer $RENZ_TASK_TOKEN` (404 while the token is unset,
never linked from the UI). Launch Readiness warns when no sweep finished in
the last 26 hours and when `RENZ_TASK_TOKEN` is not configured. Connecting
the deployment scheduler is a C10/Release task.
