"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import {
  guardAction,
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";

type SettingsAction = (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;

/**
 * Shared settings form shell: pinned expected_version, dirty tracking with a
 * leave warning (only while dirty), success / error / conflict alerts, and a
 * "Reload latest" recovery that re-fetches server data and remounts the fields.
 */
export function SettingsForm({
  action,
  version,
  title,
  description,
  submitLabel,
  successNote,
  danger = false,
  children,
  hidden,
}: Readonly<{
  action: SettingsAction;
  version: number;
  title: string;
  description?: string | undefined;
  submitLabel: string;
  successNote?: string | undefined;
  danger?: boolean;
  children: (state: AdminActionState) => ReactNode;
  hidden?: Readonly<Record<string, string>> | undefined;
}>) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(guardAction(action), initialAdminActionState);
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [reloading, setReloading] = useState(false);
  // The version this form is editing. A realtime refresh may deliver a newer
  // server version while the operator is typing: the fields are NOT replaced
  // (C4 pinned-edit rule) — an "outdated" cue offers Reload latest instead.
  const [pinnedVersion, setPinnedVersion] = useState(version);
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "success") {
      setDirty(false);
      if (state.currentVersion) setPinnedVersion(state.currentVersion);
    }
  }
  const outdated = version > pinnedVersion && state.status !== "success";

  // After our own save, remount once the server props carry the saved version
  // so uncontrolled fields show exactly what was stored.
  const [adoptedVersion, setAdoptedVersion] = useState(version);
  if (
    state.status === "success" &&
    state.currentVersion !== null &&
    version === state.currentVersion &&
    adoptedVersion !== version
  ) {
    setAdoptedVersion(version);
    setFormKey((key) => key + 1);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const reloadLatest = () => {
    setReloading(true);
    router.refresh();
    setTimeout(() => {
      setPinnedVersion(version);
      setFormKey((key) => key + 1);
      setDirty(false);
      setReloading(false);
    }, 400);
  };

  return (
    <section
      aria-labelledby={`${title.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}-heading`}
      className={`admin-panel settings-panel${danger ? " settings-panel-danger" : ""}`}
    >
      <div className="section-heading-row section-heading-compact">
        <div>
          <h2 id={`${title.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}-heading`}>{title}</h2>
          {description ? <p className="panel-copy">{description}</p> : null}
        </div>
        {dirty ? <span className="settings-dirty">Unsaved changes</span> : null}
      </div>
      <form
        className="admin-form"
        key={formKey}
        noValidate
        onChange={() => setDirty(true)}
        onSubmit={(event) => {
          // Submitting through the transition (not the form `action` prop)
          // keeps React 19 from resetting the fields after a rejected save,
          // so a conflict or validation error never wipes the operator's edits.
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <input name="expectedVersion" type="hidden" value={pinnedVersion} />
        {hidden
          ? Object.entries(hidden).map(([name, value]) => (
              <input key={name} name={name} type="hidden" value={value} />
            ))
          : null}
        {children(state)}
        {outdated && state.status !== "conflict" ? (
          <Alert live tone="warning">
            <p>
              Another staff member updated these settings while you were editing. Reload to see
              their changes first; saving now will be rejected.
            </p>
            <Button disabled={reloading} onClick={reloadLatest} tone="secondary" type="button">
              {reloading ? "Reloading…" : "Reload latest"}
            </Button>
          </Alert>
        ) : null}
        {state.status === "conflict" ? (
          <Alert live tone="warning">
            <p>
              Another staff member saved these settings first. Your edits are still shown but have
              not been saved.
            </p>
            <Button disabled={reloading} onClick={reloadLatest} tone="secondary" type="button">
              {reloading ? "Reloading…" : "Reload latest"}
            </Button>
          </Alert>
        ) : null}
        {state.status === "error" || state.status === "reauth" ? (
          <Alert live tone="danger">
            <p>{state.message}</p>
            {state.reauthHref ? (
              <Link className="button button-secondary" href={state.reauthHref}>
                Re-authenticate
              </Link>
            ) : null}
          </Alert>
        ) : null}
        {state.status === "success" ? (
          <Alert live tone="success">
            <p>{successNote ?? state.message}</p>
          </Alert>
        ) : null}
        <div className="form-actions">
          <Button disabled={pending} tone={danger ? "danger" : "primary"} type="submit">
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
