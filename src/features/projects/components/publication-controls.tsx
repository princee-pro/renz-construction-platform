"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { guardAction } from "@/features/admin-shared/action-state";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { changeProjectPublicationAction } from "@/features/projects/project-actions";
import {
  initialProjectActionState,
  type PublicationStatus,
  type ReadinessReason,
} from "@/features/projects/project-contract";

type PublicationOperation = "publish" | "unpublish" | "archive";

export function PublicationControls({
  projectId,
  projectVersion,
  status,
  readiness,
  canPublish,
  canArchive,
  onVersionChange,
}: Readonly<{
  projectId: string;
  projectVersion: number;
  status: PublicationStatus;
  readiness: Readonly<{ ready: boolean; reasons: readonly ReadinessReason[] }>;
  canPublish: boolean;
  canArchive: boolean;
  onVersionChange: (version: number) => void;
}>) {
  const [state, action, pending] = useActionState(
    guardAction(changeProjectPublicationAction),
    initialProjectActionState,
  );
  const [operation, setOperation] = useState<PublicationOperation>("publish");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
      if (state.projectVersion) onVersionChange(state.projectVersion);
      router.refresh();
    } else if (state.status !== "idle") {
      dialogRef.current?.close();
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }, [onVersionChange, router, state]);

  const open = (nextOperation: PublicationOperation) => {
    setOperation(nextOperation);
    dialogRef.current?.showModal();
  };
  const heading =
    operation === "publish"
      ? "Publish this project?"
      : operation === "unpublish"
        ? "Return this project to Draft?"
        : "Archive this project?";
  const copy =
    operation === "publish"
      ? "The reviewed public case study will become available. Readiness is checked again at the database boundary."
      : operation === "unpublish"
        ? "The public case study will be withdrawn and the project will return to Draft."
        : "The project will leave the active editorial register. Its audit history is retained; this is not deletion.";

  return (
    <section aria-labelledby="project-publication-heading" className="rail-panel">
      <div className="section-heading-row section-heading-compact">
        <h2 id="project-publication-heading">Publication</h2>
        <StatusBadge tone={readiness.ready ? "ready" : "blocked"}>
          {readiness.ready ? "Ready" : "Blocked"}
        </StatusBadge>
      </div>
      {readiness.ready ? (
        <p className="panel-copy">All authoritative S4 publication gates currently pass.</p>
      ) : (
        <ul className="readiness-list">
          {readiness.reasons.map((reason, index) => (
            <li key={`${reason.code}-${reason.field ?? "general"}-${index}`}>{reason.detail}</li>
          ))}
        </ul>
      )}
      <div className="rail-actions">
        {status === "draft" && canPublish ? (
          <Button
            disabled={!readiness.ready}
            onClick={() => open("publish")}
            tone="primary"
            type="button"
          >
            Publish
          </Button>
        ) : null}
        {status === "published" && canPublish ? (
          <Button onClick={() => open("unpublish")} tone="secondary" type="button">
            Unpublish
          </Button>
        ) : null}
        {status !== "archived" && canArchive ? (
          <Button onClick={() => open("archive")} tone="danger" type="button">
            Archive
          </Button>
        ) : null}
        {!canPublish && status !== "archived" ? (
          <p className="permission-note">Your role can prepare drafts but cannot publish.</p>
        ) : null}
      </div>
      {state.status !== "idle" && state.status !== "success" ? (
        <div ref={feedbackRef} tabIndex={-1}>
          <Alert live tone={state.status === "reauth" ? "warning" : "danger"}>
            <p>{state.message}</p>
            {state.reauthHref ? (
              <a className="text-link" href={state.reauthHref}>
                Continue to secure sign-in
              </a>
            ) : null}
          </Alert>
        </div>
      ) : null}
      {state.status === "success" ? (
        <p aria-live="polite" className="form-success">
          {state.message}
        </p>
      ) : null}

      <dialog className={`confirm-dialog confirm-${operation}`} ref={dialogRef}>
        <form action={action} className="confirm-dialog-panel" noValidate>
          <input name="projectId" type="hidden" value={projectId} />
          <input name="expectedVersion" type="hidden" value={projectVersion} />
          <input name="operation" type="hidden" value={operation} />
          <p className="eyebrow">Confirm {operation}</p>
          <h2>{heading}</h2>
          <p>{copy}</p>
          <div className="confirm-actions">
            <Button
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              tone="quiet"
              type="button"
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              tone={operation === "archive" ? "danger" : "primary"}
              type="submit"
            >
              {pending ? "Applying…" : `Confirm ${operation}`}
            </Button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
