"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { initialAdminActionState } from "@/features/admin-shared/action-state";
import { publishPublicConfigurationAction } from "@/features/settings/settings-actions";

function formatDateTime(value: string | null): string {
  if (!value) return "never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

/**
 * Atomic publish of the coherent public configuration (business, contact,
 * location, hours, social, website, navigation, brand, SEO). Drafts never
 * reach the public site until this runs; the snapshot is all-or-nothing.
 */
export function PublishPanel({
  hasUnpublishedChanges,
  publishedAt,
  canPublish,
  changedDomains,
}: Readonly<{
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  canPublish: boolean;
  changedDomains?: readonly string[] | undefined;
}>) {
  const [state, action, pending] = useActionState(
    publishPublicConfigurationAction,
    initialAdminActionState,
  );
  const [confirming, setConfirming] = useState(false);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") setConfirming(false);
  }
  return (
    <section aria-labelledby="publish-heading" className="admin-panel settings-panel publish-panel">
      <div className="section-heading-row section-heading-compact">
        <div>
          <h2 id="publish-heading">Public configuration</h2>
          <p className="panel-copy">
            Last published {formatDateTime(publishedAt)}. Drafts stay private until published; a
            publish writes one coherent snapshot the public site reads.
          </p>
        </div>
        <StatusBadge tone={hasUnpublishedChanges ? "review" : "ready"}>
          {hasUnpublishedChanges ? "Unpublished changes" : "Published"}
        </StatusBadge>
      </div>
      {changedDomains && changedDomains.length > 0 ? (
        <p className="field-help">Changed since last publish: {changedDomains.join(", ")}.</p>
      ) : null}
      {state.status === "success" ? (
        <Alert live tone="success">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      {state.status === "error" ? (
        <Alert live tone="danger">
          <p>{state.message}</p>
        </Alert>
      ) : null}
      {canPublish ? (
        confirming ? (
          <form action={action} className="admin-form">
            <Field
              hint="Optional, kept in the publish history."
              id="publishNote"
              label="Publish note"
            >
              <input id="publishNote" maxLength={300} name="note" type="text" />
            </Field>
            <div className="form-actions">
              <Button onClick={() => setConfirming(false)} tone="quiet" type="button">
                Cancel
              </Button>
              <Button disabled={pending} tone="primary" type="submit">
                {pending ? "Publishing…" : "Confirm publish"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="form-actions form-actions-start">
            <Button onClick={() => setConfirming(true)} tone="primary" type="button">
              Publish public configuration
            </Button>
          </div>
        )
      ) : null}
    </section>
  );
}
