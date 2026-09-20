"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import type { AdminActionState } from "@/features/admin-shared/action-state";
import {
  republishContentAction,
  restoreContentRevisionAction,
} from "@/features/content-revisions/revision-actions";
import type {
  ContentRevisions,
  RevisionContentType,
} from "@/features/content-revisions/revision-data";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

/**
 * Draft changes / Publish changes / Revision history for a published
 * service, project or insight (CR1 §25–30, §77). The record's own
 * publication controls handle the first publish, unpublish and archive.
 */
export function ContentRevisionsPanel({
  contentType,
  targetId,
  version,
  status,
  ready,
  revisions,
  canPublish,
  onVersionChange,
}: Readonly<{
  contentType: RevisionContentType;
  targetId: string;
  version: number;
  status: "draft" | "published" | "archived";
  ready: boolean;
  revisions: ContentRevisions;
  canPublish: boolean;
  onVersionChange?: (version: number) => void;
}>) {
  const router = useRouter();
  const [state, setState] = useState<AdminActionState | null>(null);
  const [summary, setSummary] = useState("");
  const [pending, startTransition] = useTransition();
  const label =
    contentType === "service" ? "service" : contentType === "project" ? "project" : "insight";

  function run(action: () => Promise<AdminActionState>): void {
    startTransition(async () => {
      const result = await action();
      setState(result);
      if (result.currentVersion && onVersionChange) onVersionChange(result.currentVersion);
      if (result.status === "success" || result.status === "conflict") router.refresh();
    });
  }

  return (
    <section aria-labelledby="revisions-heading" className="rail-panel content-revisions">
      <div className="section-heading-row section-heading-compact">
        <h2 id="revisions-heading">Published version</h2>
        {status === "published" ? (
          revisions.has_draft_changes ? (
            <StatusBadge tone="review">Draft changes</StatusBadge>
          ) : (
            <StatusBadge tone="published">Up to date</StatusBadge>
          )
        ) : (
          <StatusBadge tone="draft">Not published</StatusBadge>
        )}
      </div>
      {status === "published" ? (
        <p className="panel-copy">
          {revisions.has_draft_changes
            ? `Visitors still see the last published version. Publish changes to update the ${label} on the website.`
            : `The website shows exactly what is saved here.`}
        </p>
      ) : (
        <p className="panel-copy">
          Publish this {label} from the Publication panel; every later change is private until you
          publish it again.
        </p>
      )}
      {status === "published" && canPublish ? (
        <div className="rail-actions">
          <label className="field-group" htmlFor="republish-summary">
            <span className="field-label">What changed (optional)</span>
            <input
              id="republish-summary"
              maxLength={300}
              onChange={(event) => setSummary(event.target.value)}
              type="text"
              value={summary}
            />
          </label>
          <Button
            disabled={pending || !revisions.has_draft_changes || !ready}
            onClick={() =>
              run(() => republishContentAction(contentType, targetId, version, summary))
            }
            tone="primary"
          >
            Publish changes
          </Button>
          {!ready && revisions.has_draft_changes ? (
            <p className="permission-note">Resolve the readiness blockers first.</p>
          ) : null}
        </div>
      ) : null}
      {state && state.status !== "idle" ? (
        <Alert
          live
          tone={
            state.status === "success"
              ? "success"
              : state.status === "conflict"
                ? "warning"
                : "danger"
          }
        >
          <p>{state.message}</p>
        </Alert>
      ) : null}
      <h3 className="rail-subheading">Revision history</h3>
      {revisions.revisions.length === 0 ? (
        <p className="panel-copy">No revisions yet — the first publish creates one.</p>
      ) : (
        <ol className="content-revision-list">
          {revisions.revisions.map((revision) => (
            <li key={revision.id}>
              <div>
                <strong>
                  Revision {revision.revision_no}
                  {revision.is_current ? " · Live" : ""}
                  {revision.kind === "restore_point" ? " · Restore point" : ""}
                </strong>
                <small>
                  {formatDate(revision.created_at)}
                  {revision.created_by ? ` · ${revision.created_by}` : ""}
                  {revision.summary ? ` · ${revision.summary}` : ""}
                </small>
              </div>
              {canPublish && !revision.is_current ? (
                <Button
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Restore revision ${revision.revision_no} as the draft? The current draft is kept as a restore point.`,
                      )
                    ) {
                      run(() =>
                        restoreContentRevisionAction(contentType, targetId, version, revision.id),
                      );
                    }
                  }}
                  tone="quiet"
                >
                  Restore as draft
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
