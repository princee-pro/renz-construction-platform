"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import {
  guardAction,
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import {
  runNotificationSweepAction,
  updateNotificationPreferencesAction,
} from "@/features/notifications/notification-actions";
import {
  notificationCategoryLabels,
  type NotificationPreferences,
} from "@/features/notifications/notification-contract";
import { formatInBusinessZone } from "@/lib/time/business-time";

function ActionAlert({ state }: Readonly<{ state: AdminActionState }>) {
  if (state.status === "idle") return null;
  const tone =
    state.status === "success" ? "success" : state.status === "reauth" ? "warning" : "danger";
  return (
    <Alert live tone={tone}>
      <p>{state.message}</p>
      {state.reauthHref ? <Link href={state.reauthHref}>Verify session</Link> : null}
    </Alert>
  );
}

const categoryHelp: Readonly<Record<string, string>> = {
  leads: "New public enquiries, leads assigned to you, stage changes, stale leads.",
  projects: "Project status changes, ending soon, behind planned end date.",
  finance: "Payments recorded or reversed, invoices paid, overdue and due soon.",
  contractors: "Assignments completed or cancelled, assignments ending soon.",
  procurement:
    "Purchase orders issued, goods receipts, delayed or expected deliveries, materials due.",
  website: "Public configuration published.",
  security: "Staff accounts and roles (always on).",
  system: "Site mode changes (always on).",
};

/**
 * Per-staff in-app notification preferences (C9 §77–79). Security and
 * system categories are mandatory. Email is shown as a future channel with
 * the provider explicitly "not configured" — nothing is faked.
 */
export function NotificationPreferencesForm({
  preferences,
  timeZone,
}: Readonly<{ preferences: NotificationPreferences; timeZone: string }>) {
  const [state, formAction, pending] = useActionState(
    guardAction(updateNotificationPreferencesAction),
    initialAdminActionState,
  );
  const [sweepState, sweepAction, sweepPending] = useActionState(
    guardAction(runNotificationSweepAction),
    initialAdminActionState,
  );

  return (
    <div className="overview-grid analytics-grid">
      <form action={formAction} className="admin-panel admin-form">
        <div className="section-heading-row section-heading-compact">
          <h2 id="preferences-heading">In-app notifications</h2>
        </div>
        <fieldset className="settings-fieldset">
          <legend className="visually-hidden">Categories</legend>
          <ul className="preference-list">
            {preferences.categories.map((entry) => (
              <li key={entry.category}>
                <label className="checkbox-row">
                  <input
                    defaultChecked={entry.in_app_enabled}
                    disabled={entry.mandatory}
                    name={`category:${entry.category}`}
                    type="checkbox"
                  />
                  <span>
                    <strong>{notificationCategoryLabels[entry.category]}</strong>
                    {entry.mandatory ? <em> · always on</em> : null}
                    <small>{categoryHelp[entry.category]}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <div className="form-actions">
          <Button disabled={pending} tone="primary" type="submit">
            {pending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
        <ActionAlert state={state} />
      </form>

      <section aria-labelledby="channels-heading" className="admin-panel">
        <div className="section-heading-row section-heading-compact">
          <h2 id="channels-heading">Channels</h2>
        </div>
        <dl className="definition-register">
          <div>
            <dt>In-app</dt>
            <dd>Active · realtime</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>Provider not configured</dd>
          </div>
          <div>
            <dt>WhatsApp</dt>
            <dd>Not used for staff notifications</dd>
          </div>
        </dl>
        <p className="panel-copy">{preferences.email.detail}</p>

        <h3 className="panel-subheading">Timed alerts</h3>
        <p className="panel-copy">
          Overdue invoices, due-soon invoices, delayed and expected deliveries, materials due,
          assignments and projects ending soon, and stale leads are produced by a deterministic
          sweep. Running it twice never duplicates an alert.
        </p>
        <dl className="definition-register">
          <div>
            <dt>Last sweep</dt>
            <dd>
              {preferences.last_sweep
                ? `${formatInBusinessZone(preferences.last_sweep.finished_at ?? preferences.last_sweep.started_at, timeZone)} · ${preferences.last_sweep.produced_count} new · ${preferences.last_sweep.trigger_kind}`
                : "Never run"}
            </dd>
          </div>
        </dl>
        {preferences.can_run_sweep ? (
          <form action={sweepAction}>
            <div className="form-actions">
              <Button disabled={sweepPending} tone="secondary" type="submit">
                {sweepPending ? "Running…" : "Run sweep now"}
              </Button>
            </div>
            <ActionAlert state={sweepState} />
          </form>
        ) : (
          <p className="field-help">
            A super administrator can run the sweep manually; the deployment scheduler is wired in
            C10.
          </p>
        )}
      </section>
    </div>
  );
}
