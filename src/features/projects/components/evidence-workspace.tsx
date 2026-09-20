"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  createEvidenceAction,
  reviewEvidenceAction,
  submitEvidenceAction,
} from "@/features/projects/project-actions";
import {
  initialProjectActionState,
  type ProjectActionState,
  type ProjectEvidence,
} from "@/features/projects/project-contract";

function evidenceTone(state: ProjectEvidence["verification_state"]) {
  if (state === "verified") return "ready" as const;
  if (state === "rejected" || state === "expired") return "blocked" as const;
  return "review" as const;
}

function evidenceLabel(state: ProjectEvidence["verification_state"]): string {
  const labels: Readonly<Record<ProjectEvidence["verification_state"], string>> = {
    unverified: "Unverified",
    in_review: "In review",
    verified: "Verified",
    expired: "Expired",
    rejected: "Rejected",
  };
  return labels[state];
}

function RefreshOnSuccess({ state }: Readonly<{ state: ProjectActionState }>) {
  const router = useRouter();
  const handled = useRef(state);
  useEffect(() => {
    if (handled.current !== state) {
      handled.current = state;
      if (state.status === "success") router.refresh();
    }
  }, [router, state]);
  return null;
}

function InlineActionState({ state }: Readonly<{ state: ProjectActionState }>) {
  if (state.status === "idle") return null;
  if (state.status === "success") {
    return (
      <p aria-live="polite" className="form-success">
        {state.message}
      </p>
    );
  }
  return (
    <Alert live tone={state.status === "reauth" ? "warning" : "danger"}>
      <p>{state.message}</p>
      {state.reauthHref ? (
        <a className="text-link" href={state.reauthHref}>
          Continue to secure sign-in
        </a>
      ) : null}
    </Alert>
  );
}

function SubmitEvidenceControl({
  projectId,
  evidence,
}: Readonly<{ projectId: string; evidence: ProjectEvidence }>) {
  const [state, action, pending] = useActionState(submitEvidenceAction, initialProjectActionState);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle" && state.status !== "success") {
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }, [state]);

  return (
    <form action={action} className="evidence-inline-action" noValidate>
      <RefreshOnSuccess state={state} />
      <input name="projectId" type="hidden" value={projectId} />
      <input name="evidenceId" type="hidden" value={evidence.id} />
      <input name="expectedVersion" type="hidden" value={evidence.version} />
      <Button disabled={pending} tone="secondary" type="submit">
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
      <div ref={feedbackRef} tabIndex={state.status === "idle" ? undefined : -1}>
        <InlineActionState state={state} />
      </div>
    </form>
  );
}

function EvidenceDecisionControls({
  projectId,
  evidence,
}: Readonly<{ projectId: string; evidence: ProjectEvidence }>) {
  const [state, action, pending] = useActionState(reviewEvidenceAction, initialProjectActionState);
  const [decision, setDecision] = useState<"verified" | "rejected">("verified");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const handled = useRef(state);
  const router = useRouter();

  useEffect(() => {
    if (handled.current !== state) {
      handled.current = state;
      if (state.status === "success") {
        dialogRef.current?.close();
        router.refresh();
      } else if (state.status !== "idle") {
        requestAnimationFrame(() => feedbackRef.current?.focus());
      }
    }
  }, [router, state]);

  return (
    <div className="evidence-review-controls">
      <div className="rail-actions">
        <Button
          onClick={() => {
            setDecision("verified");
            dialogRef.current?.showModal();
          }}
          tone="primary"
          type="button"
        >
          Verify
        </Button>
        <Button
          onClick={() => {
            setDecision("rejected");
            dialogRef.current?.showModal();
          }}
          tone="danger"
          type="button"
        >
          Reject
        </Button>
      </div>
      {state.status === "success" ? <InlineActionState state={state} /> : null}
      <dialog className={`confirm-dialog confirm-${decision}`} ref={dialogRef}>
        <form action={action} className="confirm-dialog-panel" noValidate>
          <input name="projectId" type="hidden" value={projectId} />
          <input name="evidenceId" type="hidden" value={evidence.id} />
          <input name="expectedVersion" type="hidden" value={evidence.version} />
          <input name="decision" type="hidden" value={decision} />
          <p className="eyebrow">Evidence decision</p>
          <h2>{decision === "verified" ? "Verify this evidence?" : "Reject this evidence?"}</h2>
          <p>
            {decision === "verified"
              ? "This records reviewer authority and may remove a publication blocker. Confirm only against the cited source."
              : "This marks the evidence unusable for publication until it is reviewed again."}
          </p>
          {state.status !== "idle" && state.status !== "success" ? (
            <div ref={feedbackRef} tabIndex={-1}>
              <InlineActionState state={state} />
            </div>
          ) : null}
          {decision === "verified" && evidence.consent_required ? (
            <label className="check-field">
              <input name="consentState" type="checkbox" value="granted" />
              <span>Consent is documented as granted in the cited source</span>
            </label>
          ) : null}
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
              tone={decision === "rejected" ? "danger" : "primary"}
              type="submit"
            >
              {pending
                ? "Recording…"
                : decision === "verified"
                  ? "Confirm verification"
                  : "Confirm rejection"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export function EvidenceWorkspace({
  projectId,
  evidence,
  canWrite,
  canVerify,
}: Readonly<{
  projectId: string;
  evidence: readonly ProjectEvidence[];
  canWrite: boolean;
  canVerify: boolean;
}>) {
  const [state, action, pending] = useActionState(createEvidenceAction, initialProjectActionState);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState({
    factClaim: "",
    sourceType: "client_supplied",
    sensitivity: "private",
    sourceReference: "",
    purpose: "",
    required: true,
    consentRequired: false,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error" || state.status === "reauth") {
      requestAnimationFrame(() => {
        const firstInvalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
        (firstInvalid ?? feedbackRef.current)?.focus();
      });
    }
  }, [state]);

  const describedBy = (field: string, hint = false) =>
    [hint ? `${field}-hint` : "", state.fieldErrors[field] ? `${field}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <section aria-labelledby="project-evidence-workspace-heading" className="evidence-workspace">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Publication evidence</p>
          <h2 id="project-evidence-workspace-heading">Evidence workspace</h2>
          <p className="section-description">
            References remain private operational records. Registration does not equal verification.
          </p>
        </div>
        {canWrite ? (
          <Button onClick={() => setShowForm((current) => !current)} tone="secondary" type="button">
            {showForm ? "Close form" : "Register evidence"}
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <form action={action} className="evidence-create-form" noValidate ref={formRef}>
          <RefreshOnSuccess state={state} />
          <input name="projectId" type="hidden" value={projectId} />
          <Field
            error={state.fieldErrors["factClaim"]}
            hint="Describe the exact fact this source supports."
            id="factClaim"
            label="Supported fact"
          >
            <textarea
              aria-describedby={describedBy("factClaim", true)}
              aria-invalid={Boolean(state.fieldErrors["factClaim"])}
              className="resize-none"
              id="factClaim"
              maxLength={1_000}
              name="factClaim"
              onChange={(event) =>
                setValues((current) => ({ ...current, factClaim: event.target.value }))
              }
              rows={3}
              value={values.factClaim}
            />
          </Field>
          <div className="field-grid field-grid-two">
            <Field error={state.fieldErrors["sourceType"]} id="sourceType" label="Source type">
              <select
                aria-describedby={describedBy("sourceType")}
                aria-invalid={Boolean(state.fieldErrors["sourceType"])}
                id="sourceType"
                name="sourceType"
                onChange={(event) =>
                  setValues((current) => ({ ...current, sourceType: event.target.value }))
                }
                value={values.sourceType}
              >
                <option value="client_supplied">Client supplied</option>
                <option value="client_confirmation">Client confirmation</option>
                <option value="contract_document">Contract document</option>
                <option value="project_document">Project document</option>
                <option value="public_authoritative_source">Public authoritative source</option>
                <option value="internal_record">Internal record</option>
                <option value="other_reviewed_source">Other reviewed source</option>
              </select>
            </Field>
            <Field error={state.fieldErrors["sensitivity"]} id="sensitivity" label="Sensitivity">
              <select
                aria-describedby={describedBy("sensitivity")}
                aria-invalid={Boolean(state.fieldErrors["sensitivity"])}
                id="sensitivity"
                name="sensitivity"
                onChange={(event) =>
                  setValues((current) => ({ ...current, sensitivity: event.target.value }))
                }
                value={values.sensitivity}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </Field>
          </div>
          <Field
            error={state.fieldErrors["sourceReference"]}
            hint="Use a bounded document reference, register identifier, or authoritative HTTPS location."
            id="sourceReference"
            label="Source reference"
          >
            <input
              aria-describedby={describedBy("sourceReference", true)}
              aria-invalid={Boolean(state.fieldErrors["sourceReference"])}
              autoComplete="off"
              id="sourceReference"
              maxLength={1_000}
              name="sourceReference"
              onChange={(event) =>
                setValues((current) => ({ ...current, sourceReference: event.target.value }))
              }
              type="text"
              value={values.sourceReference}
            />
          </Field>
          <Field error={state.fieldErrors["purpose"]} id="purpose" label="Review purpose">
            <input
              aria-describedby={describedBy("purpose")}
              aria-invalid={Boolean(state.fieldErrors["purpose"])}
              autoComplete="off"
              id="purpose"
              maxLength={500}
              name="purpose"
              onChange={(event) =>
                setValues((current) => ({ ...current, purpose: event.target.value }))
              }
              type="text"
              value={values.purpose}
            />
          </Field>
          <div className="check-grid">
            <label className="check-field">
              <input
                checked={values.required}
                name="required"
                onChange={(event) =>
                  setValues((current) => ({ ...current, required: event.target.checked }))
                }
                type="checkbox"
              />
              <span>Required for publication</span>
            </label>
            <label className="check-field">
              <input
                checked={values.consentRequired}
                name="consentRequired"
                onChange={(event) =>
                  setValues((current) => ({ ...current, consentRequired: event.target.checked }))
                }
                type="checkbox"
              />
              <span>Consent record required</span>
            </label>
          </div>
          <div ref={feedbackRef} tabIndex={state.status === "idle" ? undefined : -1}>
            <InlineActionState state={state} />
          </div>
          <div className="form-actions">
            <Button disabled={pending} tone="primary" type="submit">
              {pending ? "Registering…" : "Register as Unverified"}
            </Button>
          </div>
        </form>
      ) : null}

      {evidence.length > 0 ? (
        <ol className="evidence-list">
          {evidence.map((item) => (
            <li key={item.id}>
              <div className="evidence-item-heading">
                <div>
                  <StatusBadge tone={evidenceTone(item.verification_state)}>
                    {evidenceLabel(item.verification_state)}
                  </StatusBadge>
                  {item.required ? <span className="required-marker">Required</span> : null}
                </div>
                <span className="service-version">v{item.version}</span>
              </div>
              <h3>{item.fact_claim}</h3>
              <dl className="evidence-meta">
                <div>
                  <dt>Source</dt>
                  <dd>{item.source_type.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Reference</dt>
                  <dd>{item.source_reference}</dd>
                </div>
                <div>
                  <dt>Sensitivity</dt>
                  <dd>{item.sensitivity}</dd>
                </div>
                <div>
                  <dt>Review due</dt>
                  <dd>
                    {item.review_due_at
                      ? new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        }).format(new Date(item.review_due_at))
                      : "No date set"}
                  </dd>
                </div>
              </dl>
              {item.purpose ? <p className="evidence-purpose">Purpose: {item.purpose}</p> : null}
              {canWrite &&
              ["unverified", "expired", "rejected"].includes(item.verification_state) ? (
                <SubmitEvidenceControl evidence={item} projectId={projectId} />
              ) : null}
              {canVerify && item.verification_state === "in_review" ? (
                <EvidenceDecisionControls evidence={item} projectId={projectId} />
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="evidence-empty">
          <p>No evidence is linked to this project.</p>
          <span>Publication remains blocked until a required record is reviewed and current.</span>
        </div>
      )}
    </section>
  );
}
