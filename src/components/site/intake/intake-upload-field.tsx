"use client";

import { useId, useRef, useState } from "react";

import {
  acceptedMimeTypes,
  intakeFileLimits,
  intakeFileTypes,
  type IntakeUploadPolicy,
} from "@/features/intake/intake-policy";

export type IntakeAttachment = Readonly<{ id: string; name: string; size: number; type: string }>;
export type IntakeUploadSession = Readonly<{ id: string; token: string }>;

type UploadResponse = {
  ok: boolean;
  reason?: string;
  message?: string;
  sessionId?: string;
  sessionToken?: string;
  attachment?: IntakeAttachment;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Supporting-file field (C8 §29–36). Files go straight to the private upload
 * route (never to Storage, never as base64 in the browser); the field keeps
 * only ids and names. The session token lives in component memory.
 */
export function IntakeUploadField({
  formToken,
  policy,
  attachments,
  session,
  onChange,
}: Readonly<{
  formToken: string;
  policy: IntakeUploadPolicy;
  attachments: readonly IntakeAttachment[];
  session: IntakeUploadSession | null;
  onChange: (next: {
    attachments: readonly IntakeAttachment[];
    session: IntakeUploadSession | null;
  }) => void;
}>) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const accepted = acceptedMimeTypes(policy);
  const acceptAttribute = accepted
    .map((mime) => `.${intakeFileTypes[mime].extension}${mime === "image/jpeg" ? ",.jpeg" : ""}`)
    .join(",");
  const acceptedLabel = accepted.map((mime) => intakeFileTypes[mime].label).join(", ");

  if (policy === "disabled") {
    return (
      <p className="intake-hint">
        Supporting files are not accepted at the moment. You can share them later on WhatsApp or by
        email.
      </p>
    );
  }

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    let currentSession = session;
    let current = [...attachments];
    for (const file of Array.from(files)) {
      if (current.length >= intakeFileLimits.maxFiles) {
        setError(`You can attach up to ${intakeFileLimits.maxFiles} files.`);
        break;
      }
      if (file.size > intakeFileLimits.maxBytes) {
        setError(`${file.name} is larger than ${intakeFileLimits.maxBytes / (1024 * 1024)} MB.`);
        continue;
      }
      const body = new FormData();
      body.set("file", file);
      body.set("formToken", formToken);
      if (currentSession) {
        body.set("sessionId", currentSession.id);
        body.set("sessionToken", currentSession.token);
      }
      setStatus(`Uploading ${file.name}…`);
      try {
        const response = await fetch("/api/intake/uploads", { method: "POST", body });
        const payload = (await response.json()) as UploadResponse;
        if (!response.ok || !payload.ok || !payload.attachment) {
          setError(payload.message ?? `${file.name} could not be uploaded.`);
          if (payload.reason === "expired_session") {
            currentSession = null;
            current = [];
          }
          continue;
        }
        if (payload.sessionId && payload.sessionToken) {
          currentSession = { id: payload.sessionId, token: payload.sessionToken };
        }
        current = [...current, payload.attachment];
        setStatus(`${file.name} added.`);
      } catch {
        setError(`${file.name} could not be uploaded. Check your connection and try again.`);
      }
    }
    onChange({ attachments: current, session: currentSession });
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (attachment: IntakeAttachment) => {
    if (!session) return;
    setBusy(true);
    try {
      await fetch("/api/intake/uploads", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          sessionToken: session.token,
          attachmentId: attachment.id,
        }),
      });
    } catch {
      // The cleanup job removes orphaned objects; the visitor still sees it gone.
    }
    onChange({ attachments: attachments.filter((item) => item.id !== attachment.id), session });
    setStatus(`${attachment.name} removed.`);
    setBusy(false);
  };

  return (
    <div className={`intake-field intake-upload${error ? " intake-field-invalid" : ""}`}>
      <label htmlFor={inputId}>Add site photos, sketches or drawings</label>
      <p className="intake-hint" id={`${inputId}-hint`}>
        {acceptedLabel}. Up to {intakeFileLimits.maxFiles} files,{" "}
        {intakeFileLimits.maxBytes / (1024 * 1024)} MB each. Files are stored privately and reviewed
        by RENZ; they are never published.
      </p>
      <input
        accept={acceptAttribute}
        aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
        aria-invalid={error ? true : undefined}
        disabled={busy || attachments.length >= intakeFileLimits.maxFiles}
        id={inputId}
        multiple
        onChange={(event) => void upload(event.currentTarget.files)}
        ref={inputRef}
        type="file"
      />
      <p aria-live="polite" className="intake-hint intake-upload-status">
        {busy ? status : status}
      </p>
      {error ? (
        <p className="intake-error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : null}
      {attachments.length > 0 ? (
        <ul aria-label="Attached files" className="intake-attachments">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <span className="intake-attachment-name">{attachment.name}</span>
              <span className="intake-attachment-meta">{formatSize(attachment.size)}</span>
              <button
                aria-label={`Remove ${attachment.name}`}
                className="intake-remove"
                disabled={busy}
                onClick={() => void remove(attachment)}
                type="button"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
