"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  guardAction,
  initialAdminActionState,
  type AdminActionState,
} from "@/features/admin-shared/action-state";
import { classificationLabels, MediaPicker } from "@/features/website/components/media-picker";
import {
  archiveMediaAction,
  confirmMediaRightsAction,
  replaceWebsiteMediaAction,
  updateMediaMetadataAction,
} from "@/features/website/media-actions";
import type { MediaDetail } from "@/features/website/media-contract";

function Notice({ state }: Readonly<{ state: AdminActionState | null }>) {
  if (!state || state.status === "idle") return null;
  return (
    <Alert
      live
      title={
        state.status === "success"
          ? "Done"
          : state.status === "conflict"
            ? "Changed elsewhere"
            : "Not saved"
      }
      tone={
        state.status === "success" ? "success" : state.status === "conflict" ? "warning" : "danger"
      }
    >
      {state.message}
    </Alert>
  );
}

/**
 * One image (CR1 §32–36): alt text, caption, focal point (click the image),
 * rights confirmation, everywhere it is used, replace on pages, archive
 * (blocked while in use).
 */
export function MediaDetailView({
  media,
  canManage,
  canReplace,
}: Readonly<{ media: MediaDetail; canManage: boolean; canReplace: boolean }>) {
  const router = useRouter();
  const [metaState, metaAction, metaPending] = useActionState(
    guardAction(updateMediaMetadataAction),
    initialAdminActionState,
  );
  const [rightsState, rightsAction, rightsPending] = useActionState(
    guardAction(confirmMediaRightsAction),
    initialAdminActionState,
  );
  const [focal, setFocal] = useState({ x: media.focal_x, y: media.focal_y });
  const [notice, setNotice] = useState<AdminActionState | null>(null);
  const [replacement, setReplacement] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const version = metaState.currentVersion ?? rightsState.currentVersion ?? media.version;

  function pickFocal(event: React.MouseEvent<HTMLButtonElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    setFocal({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 1000,
      y: Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 1000,
    });
  }

  return (
    <div className="media-detail">
      <div className="media-detail-grid">
        <section aria-labelledby="media-preview-title" className="register-section">
          <h2 id="media-preview-title">
            {media.mime_type.startsWith("video/") ? "Video" : "Image and focal point"}
          </h2>
          <p className="field-help">
            Click the point that must stay visible when the image is cropped for different screens
            (a face, a corner of the building, the horizon).
          </p>
          <button
            aria-label="Set the focal point"
            className="media-focal-picker"
            onClick={pickFocal}
            type="button"
          >
            {}
            {media.mime_type.startsWith("video/") ? (
              <video
                controls
                muted
                playsInline
                preload="metadata"
                src={`/api/media/website/${media.id}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={media.alt_text ?? ""} src={`/api/media/website/${media.id}`} />
            )}
            <span
              aria-hidden="true"
              className="media-focal-mark"
              style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
            />
          </button>
          <p className="field-help">
            {media.filename ?? "Image"}
            {media.width && media.height ? ` · ${media.width}×${media.height}` : ""} ·{" "}
            {Math.round(media.byte_size / 1024)} KB
          </p>
          <form action={metaAction} className="media-meta-form">
            <input name="mediaId" type="hidden" value={media.id} />
            <input name="expectedVersion" type="hidden" value={version} />
            <input name="focalX" type="hidden" value={focal.x} />
            <input name="focalY" type="hidden" value={focal.y} />
            <div className="field-group">
              <label htmlFor="media-alt-text">Alt text</label>
              <input
                defaultValue={media.alt_text ?? ""}
                id="media-alt-text"
                maxLength={300}
                name="altText"
                type="text"
              />
              <p className="field-help">
                Describe what the image shows for people who cannot see it and for search engines.
              </p>
            </div>
            <div className="field-group">
              <label htmlFor="media-caption">Caption</label>
              <input
                defaultValue={media.caption ?? ""}
                id="media-caption"
                maxLength={600}
                name="caption"
                type="text"
              />
            </div>
            <Notice state={metaState} />
            <Button disabled={!canManage || metaPending} tone="primary" type="submit">
              Save image details
            </Button>
          </form>
        </section>

        <section aria-labelledby="media-rights-title" className="register-section">
          <h2 id="media-rights-title">Rights and readiness</h2>
          <p className="media-state">
            {media.storage_state === "archived" ? (
              <StatusBadge tone="archived">Archived</StatusBadge>
            ) : media.ready ? (
              <StatusBadge tone="ready">Ready for the website</StatusBadge>
            ) : (
              <StatusBadge tone="review">Rights to confirm</StatusBadge>
            )}
            <StatusBadge tone="neutral">
              {classificationLabels[media.classification] ?? media.classification}
            </StatusBadge>
            {media.evidence_eligible ? (
              <StatusBadge tone="published">May serve as project evidence</StatusBadge>
            ) : null}
          </p>
          {media.rights_holder ? (
            <p className="field-help">
              Rights held by {media.rights_holder}
              {media.rights_source ? ` (${media.rights_source})` : ""}.
            </p>
          ) : null}
          {media.storage_state !== "archived" ? (
            <form action={rightsAction} className="media-rights-form">
              <input name="mediaId" type="hidden" value={media.id} />
              <input name="expectedVersion" type="hidden" value={version} />
              <div className="field-group">
                <label htmlFor="media-classification">How RENZ holds the rights</label>
                <select
                  defaultValue={
                    media.classification === "review_required"
                      ? "renz_provided"
                      : media.classification
                  }
                  id="media-classification"
                  name="classification"
                >
                  <option value="renz_provided">{classificationLabels["renz_provided"]}</option>
                  <option value="licensed">{classificationLabels["licensed"]}</option>
                  <option value="generated_concept">
                    {classificationLabels["generated_concept"]}
                  </option>
                </select>
                {rightsState.fieldErrors["classification"] ? (
                  <p className="field-error">{rightsState.fieldErrors["classification"]}</p>
                ) : null}
              </div>
              <div className="field-group">
                <label htmlFor="media-rights-holder">Who holds the rights</label>
                <input
                  defaultValue={media.rights_holder ?? "RENZ Construction Services Ltd"}
                  id="media-rights-holder"
                  maxLength={200}
                  name="rightsHolder"
                  required
                  type="text"
                />
                {rightsState.fieldErrors["rightsHolder"] ? (
                  <p className="field-error">{rightsState.fieldErrors["rightsHolder"]}</p>
                ) : null}
              </div>
              <div className="field-group">
                <label htmlFor="media-rights-source">Where the rights come from (optional)</label>
                <input
                  defaultValue={media.rights_source ?? ""}
                  id="media-rights-source"
                  maxLength={300}
                  name="rightsSource"
                  placeholder="e.g. RENZ site photograph, 2026"
                  type="text"
                />
              </div>
              <div className="field-group">
                <label htmlFor="media-credit">Credit shown publicly (optional)</label>
                <input
                  defaultValue={media.credit ?? ""}
                  id="media-credit"
                  maxLength={200}
                  name="credit"
                  type="text"
                />
              </div>
              <p className="field-help">
                Confirming means RENZ may publish this image. Generated concept visuals are cleared
                for labelled illustration only and never become project evidence.
              </p>
              <Notice state={rightsState} />
              <Button disabled={!canManage || rightsPending} tone="primary" type="submit">
                {media.ready ? "Update rights" : "Confirm rights"}
              </Button>
            </form>
          ) : null}
        </section>
      </div>

      <section aria-labelledby="media-usage-title" className="register-section">
        <h2 id="media-usage-title">Where this image is used</h2>
        {media.usage.length === 0 ? (
          <p className="quiet-empty">Not used anywhere yet.</p>
        ) : (
          <ul className="media-usage">
            {media.usage.map((usage, index) => (
              <li key={`${usage.kind}-${usage.id ?? index}-${usage.role ?? ""}`}>
                <Link href={usage.href}>{usage.label}</Link>
                <small>
                  {usage.kind === "project"
                    ? "Project"
                    : usage.kind === "service"
                      ? "Service"
                      : usage.kind === "insight"
                        ? "Insight"
                        : usage.kind === "page"
                          ? "Page"
                          : "Brand"}
                  {usage.role ? ` · ${usage.role}` : ""}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="media-replace-title" className="register-section">
        <h2 id="media-replace-title">Replace or archive</h2>
        <Notice state={notice} />
        {canReplace && media.storage_state !== "archived" ? (
          <div className="media-replace">
            <p className="field-help">
              Replace this image everywhere it is used on website pages (drafts). Publish those
              pages afterwards. Project media is replaced from the project itself.
            </p>
            <MediaPicker
              allowUpload
              label="replacement image"
              onChange={(id) => setReplacement(id)}
              value={replacement}
            />
            <Button
              disabled={pending || !replacement}
              onClick={() =>
                startTransition(async () => {
                  const result = await replaceWebsiteMediaAction(media.id, replacement ?? "");
                  setNotice(result);
                  if (result.status === "success") router.refresh();
                })
              }
              tone="secondary"
            >
              Replace on pages
            </Button>
          </div>
        ) : null}
        {canManage && media.storage_state !== "archived" ? (
          <div className="media-archive">
            <p className="field-help">
              {media.usage.length > 0
                ? "This image is in use and cannot be archived until it is replaced or unlinked everywhere."
                : "Archiving removes the image from the library. It never breaks a page because unused images are not referenced anywhere."}
            </p>
            <Button
              disabled={pending || media.usage.length > 0}
              onClick={() => {
                if (!window.confirm("Archive this image?")) return;
                startTransition(async () => {
                  const result = await archiveMediaAction(media.id, version);
                  setNotice(result);
                  if (result.status === "success") router.push("/admin/website/media");
                });
              }}
              tone="danger"
            >
              Archive image
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
