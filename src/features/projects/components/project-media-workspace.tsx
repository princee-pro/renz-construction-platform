"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/admin/ui/alert";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  attachMediaAction,
  promoteMediaAction,
  reorderMediaAction,
  removeMediaAction,
  updateMediaAction,
} from "@/features/projects/project-actions";
import {
  initialProjectActionState,
  mediaRoles,
  type ProjectMedia,
  type ProjectStage,
} from "@/features/projects/project-contract";

const roleLabels: Readonly<Record<(typeof mediaRoles)[number], string>> = {
  hero: "01 Hero (main image)",
  context: "02 Exterior / context",
  exterior: "03 Secondary exterior",
  interior: "04 Interior / space",
  detail: "05 Detail / material",
  process: "06 Construction / process",
  drawing: "07 Drawing / diagram",
  dusk: "08 Dusk / night",
  gallery: "Gallery (general)",
  before: "Before",
  during: "During",
  after: "After",
  video: "Video",
  video_poster: "Video poster",
  listing: "Listing image",
  background: "Background",
  social: "Social sharing image",
};

const provenanceLabels: Readonly<Record<string, string>> = {
  client_original: "Client photo (original)",
  client_derivative: "Client photo (edited)",
  production_asset: "RENZ record",
  production: "RENZ record",
  generated_reference: "Generated concept visual",
  concept_demo: "Concept visual",
  synthetic_test: "Test image",
};

function provenanceLabel(value: string | null): string {
  return (value && provenanceLabels[value]) ?? (value ?? "").replaceAll("_", " ");
}

function rightsTone(rightsStatus: string | null): "ready" | "blocked" | "review" {
  if (rightsStatus === "expired" || rightsStatus === "rejected") return "blocked";
  if (rightsStatus === "unknown" || rightsStatus === "in_review") return "review";
  return "ready";
}

function MediaCard({
  item,
  projectId,
  stages,
  studyProject,
  position,
  canWrite,
  onMove,
  isFirst,
  isLast,
}: Readonly<{
  item: ProjectMedia;
  projectId: string;
  stages: readonly ProjectStage[];
  canWrite: boolean;
  onMove: (direction: "up" | "down") => void;
  /** The project is a concept / context study (generated visuals may be confirmed). */
  studyProject: boolean;
  position: number;
  isFirst: boolean;
  isLast: boolean;
}>) {
  const [state, action, pending] = useActionState(updateMediaAction, initialProjectActionState);
  const [removeState, removeAction, removePending] = useActionState(
    removeMediaAction,
    initialProjectActionState,
  );
  const [promoteState, promoteAction, promotePending] = useActionState(
    promoteMediaAction,
    initialProjectActionState,
  );
  const isEligible = item.public_status === "eligible";
  const generated =
    item.provenance_class === "concept_demo" || item.provenance_class === "generated_reference";
  // CR1 relaxed the S5C rule: a concept / context study may confirm generated
  // visuals (they stay labelled); a real project never can.
  const canPromote =
    item.provenance_class !== "synthetic_test" &&
    (!generated || studyProject) &&
    (item.storage_state === "ready_private" ||
      item.storage_state === "promotion_pending" ||
      item.storage_state === "public_eligible");
  const preview = `/api/media/project/${item.id}?size=thumb`;

  return (
    <li className="media-card">
      <div className="media-card-preview">
        {item.mime_type?.startsWith("video/") ? (
          <span className="media-card-preview-note">Video</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- private signed redirect; not optimised
          <img alt="" loading="lazy" src={preview} />
        )}
        <span className="media-card-preview-note">
          {String(position + 1).padStart(2, "0")} ·{" "}
          {roleLabels[item.role as (typeof mediaRoles)[number]] ?? item.role}
          {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
        </span>
      </div>
      <div className="media-card-meta">
        <div className="media-card-heading">
          <StatusBadge tone={rightsTone(item.rights_status)}>
            {(item.rights_status ?? "unknown").replaceAll("_", " ")}
          </StatusBadge>
          <span className="media-provenance">{provenanceLabel(item.provenance_class)}</span>
          {canWrite ? (
            <div className="rail-actions media-order-actions">
              <Button disabled={isFirst} onClick={() => onMove("up")} tone="quiet" type="button">
                Move up
              </Button>
              <Button disabled={isLast} onClick={() => onMove("down")} tone="quiet" type="button">
                Move down
              </Button>
              {item.role === "hero" ? (
                <StatusBadge tone="ready">Hero</StatusBadge>
              ) : (
                <span className="media-hero-hint">
                  To make this the hero, set its role to 01 Hero.
                </span>
              )}
            </div>
          ) : null}
        </div>
        <StatusBadge tone={isEligible ? "ready" : "review"}>
          {isEligible ? "Shown on the website" : "Not on the website yet"}
        </StatusBadge>
        {canWrite && !isEligible ? (
          canPromote ? (
            <form action={promoteAction} className="media-rights-form" noValidate>
              <input name="projectMediaId" type="hidden" value={item.id} />
              <input name="projectId" type="hidden" value={projectId} />
              <input name="expectedMediaVersion" type="hidden" value={item.version} />
              <div className="field-grid field-grid-two">
                <Field id={`rights-holder-${item.id}`} label="Rights holder">
                  <input
                    id={`rights-holder-${item.id}`}
                    maxLength={200}
                    name="rightsHolder"
                    type="text"
                  />
                </Field>
                <Field id={`rights-source-${item.id}`} label="Rights source">
                  <input
                    id={`rights-source-${item.id}`}
                    maxLength={200}
                    name="rightsSource"
                    type="text"
                  />
                </Field>
              </div>
              <p className="section-description">
                {generated
                  ? 'This is a generated concept visual. Confirming it shows it on the website with a "generated concept" label. It never counts as project evidence.'
                  : "Confirming rights means RENZ has permission to show this image publicly. It then appears on the website in the role chosen below."}
              </p>
              <div className="rail-actions">
                <Button disabled={promotePending} tone="secondary" type="submit">
                  {promotePending
                    ? "Confirming…"
                    : generated
                      ? "Confirm as generated concept visual"
                      : "Confirm rights & show on website"}
                </Button>
              </div>
              {promoteState.status !== "idle" && promoteState.status !== "success" ? (
                <Alert live tone="danger">
                  <p>{promoteState.message}</p>
                </Alert>
              ) : null}
            </form>
          ) : (
            <p className="quiet-empty">
              {generated
                ? "A real RENZ project cannot show generated or concept visuals. Replace it with a RENZ photograph, or change the project to a concept study."
                : item.provenance_class === "synthetic_test"
                  ? "Test images are never shown on the website."
                  : "This file is still being prepared; try again shortly."}
            </p>
          )
        ) : null}
        <form action={action} className="media-edit-form" noValidate>
          <input name="projectMediaId" type="hidden" value={item.id} />
          <input name="projectId" type="hidden" value={projectId} />
          <input name="expectedMediaVersion" type="hidden" value={item.version} />
          <input
            name="expectedLocalizationVersion"
            type="hidden"
            value={item.localization_version ?? 1}
          />
          <div className="field-grid field-grid-two">
            <Field id={`role-${item.id}`} label="Role">
              <select defaultValue={item.role} id={`role-${item.id}`} name="role">
                {mediaRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`stage-${item.id}`} label="Story chapter">
              <select defaultValue={item.stage_id ?? ""} id={`stage-${item.id}`} name="stageId">
                <option value="">None</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id={`alt-${item.id}`} label="Alt text (describe the image)">
            <input
              defaultValue={item.alt_text ?? ""}
              id={`alt-${item.id}`}
              maxLength={300}
              name="altText"
              type="text"
            />
          </Field>
          <Field id={`caption-${item.id}`} label="Caption">
            <input
              defaultValue={item.caption ?? ""}
              id={`caption-${item.id}`}
              maxLength={600}
              name="caption"
              type="text"
            />
          </Field>
          <Field id={`credit-${item.id}`} label="Credit">
            <input
              defaultValue={item.credit ?? ""}
              id={`credit-${item.id}`}
              maxLength={200}
              name="credit"
              type="text"
            />
          </Field>
          <label className="check-field">
            <input defaultChecked={item.decorative} name="decorative" type="checkbox" />
            <span>Decorative only (no description needed)</span>
          </label>
          {canWrite ? (
            <div className="rail-actions">
              <Button disabled={pending} tone="secondary" type="submit">
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : null}
          {state.status !== "idle" && state.status !== "success" ? (
            <Alert live tone="danger">
              <p>{state.message}</p>
            </Alert>
          ) : null}
        </form>
        {canWrite ? (
          <form action={removeAction}>
            <input name="projectMediaId" type="hidden" value={item.id} />
            <input name="projectId" type="hidden" value={projectId} />
            <input name="expectedMediaVersion" type="hidden" value={item.version} />
            <Button disabled={removePending} tone="danger" type="submit">
              Remove from project
            </Button>
          </form>
        ) : null}
        {removeState.status !== "idle" && removeState.status !== "success" ? (
          <Alert live tone="danger">
            <p>{removeState.message}</p>
          </Alert>
        ) : null}
      </div>
    </li>
  );
}

export function ProjectMediaWorkspace({
  projectId,
  projectVersion,
  media,
  stages,
  canWrite,
  studyProject = false,
}: Readonly<{
  projectId: string;
  projectVersion: number;
  media: readonly ProjectMedia[];
  stages: readonly ProjectStage[];
  canWrite: boolean;
  /** D1.7: concept / context studies may confirm generated concept visuals. */
  studyProject?: boolean;
}>) {
  const router = useRouter();
  const [order, setOrder] = useState(() => media.map((item) => item.id).slice());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();

  // A fresh server render (upload, detach, rights change) carries the
  // authoritative list: keep the local order for known items, append new
  // ones and drop removed ones.
  const [seenMedia, setSeenMedia] = useState(media);
  if (seenMedia !== media) {
    setSeenMedia(media);
    const ids = new Set(media.map((item) => item.id));
    setOrder((current) => [
      ...current.filter((id) => ids.has(id)),
      ...media.map((item) => item.id).filter((id) => !current.includes(id)),
    ]);
  }

  const ordered = order
    .map((id) => media.find((item) => item.id === id))
    .filter((item): item is ProjectMedia => Boolean(item));

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setUploadError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const provenanceField = new FormData(form).get("provenance");
      const uploadForm = new FormData();
      uploadForm.set("file", file);
      uploadForm.set(
        "provenance",
        typeof provenanceField === "string" ? provenanceField : "production_asset",
      );
      const response = await fetch("/api/admin/projects/media", {
        method: "POST",
        body: uploadForm,
      });
      const result: unknown = await response.json();
      const ok =
        typeof result === "object" && result !== null && (result as { ok?: unknown }).ok === true;
      if (!ok) {
        setUploadError(
          "The image could not be validated or uploaded. Confirm it is a JPEG, PNG, WebP, or AVIF file.",
        );
        return;
      }
      const mediaAssetId = (result as { id: string }).id;
      const attachForm = new FormData(form);
      // The file already went to the upload route; the attach action carries
      // only the small fields (server actions refuse bodies over 1 MB).
      attachForm.delete("file");
      attachForm.set("mediaAssetId", mediaAssetId);
      attachForm.set("projectId", projectId);
      attachForm.set("expectedVersion", String(projectVersion));
      const attachResult = await attachMediaAction(initialProjectActionState, attachForm);
      if (attachResult.status !== "success") {
        setUploadError(attachResult.message);
        return;
      }
      form.reset();
      startTransition(() => router.refresh());
    } finally {
      setUploading(false);
    }
  }

  function move(id: string, direction: "up" | "down") {
    setOrder((current) => {
      const index = current.indexOf(id);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= current.length) return current;
      const next = current.slice();
      [next[index], next[swapWith]] = [next[swapWith] as string, next[index] as string];
      void reorderMediaAction(projectId, next);
      return next;
    });
  }

  return (
    <div className="project-media-workspace">
      <p className="section-description">
        The gallery in order, top to bottom. Upload an image, give it a role (01 Hero is the main
        image), a short caption and a description, then confirm it to show it on the website. Use
        Move up / Move down to change the order.
      </p>

      <ol className="media-card-list">
        {ordered.map((item, index) => (
          <MediaCard
            canWrite={canWrite}
            isFirst={index === 0}
            isLast={index === ordered.length - 1}
            item={item}
            key={item.id}
            onMove={(direction) => move(item.id, direction)}
            position={index}
            projectId={projectId}
            stages={stages}
            studyProject={studyProject}
          />
        ))}
      </ol>
      {ordered.length === 0 ? (
        <p className="quiet-empty">No images yet. Add the first one below.</p>
      ) : null}
      {canWrite ? (
        <details className="media-upload-details" open={ordered.length === 0}>
          <summary>Add an image</summary>
          <form
            className="media-upload-form"
            noValidate
            onSubmit={(event) => {
              void handleUpload(event);
            }}
            ref={formRef}
          >
            <Field hint="JPEG, PNG, WebP, or AVIF. Up to 20MB." id="media-file" label="Image file">
              <input
                accept="image/jpeg,image/png,image/webp,image/avif"
                id="media-file"
                name="file"
                type="file"
              />
            </Field>
            <div className="field-grid field-grid-two">
              <Field id="media-provenance" label="Where this image comes from">
                <select
                  defaultValue={studyProject ? "generated_reference" : "production_asset"}
                  id="media-provenance"
                  name="provenance"
                >
                  <option value="production_asset">RENZ record (our own photo or drawing)</option>
                  <option value="client_original">Client photo (original)</option>
                  <option value="client_derivative">Client photo (edited)</option>
                  <option value="generated_reference">
                    Generated concept visual (never evidence)
                  </option>
                </select>
              </Field>
              <Field id="media-role" label="Role in the gallery">
                <select defaultValue="context" id="media-role" name="role">
                  {mediaRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="field-grid field-grid-two">
              <Field id="media-stage" label="Story chapter">
                <select defaultValue="" id="media-stage" name="stageId">
                  <option value="">None</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="media-phase" label="Stage of work (optional)">
                <input id="media-phase" maxLength={40} name="phase" type="text" />
              </Field>
            </div>
            <Field
              hint="One sentence that describes the image for people who cannot see it."
              id="media-alt"
              label="Alt text (describe the image)"
            >
              <input id="media-alt" maxLength={300} name="altText" type="text" />
            </Field>
            <Field id="media-caption" label="Caption">
              <input id="media-caption" maxLength={600} name="caption" type="text" />
            </Field>
            <Field id="media-credit" label="Photo credit (optional)">
              <input id="media-credit" maxLength={200} name="credit" type="text" />
            </Field>
            <label className="check-field">
              <input name="decorative" type="checkbox" />
              <span>Decorative only (no description needed)</span>
            </label>
            <div className="form-actions">
              <Button disabled={uploading} tone="primary" type="submit">
                {uploading ? "Uploading…" : "Upload & attach"}
              </Button>
            </div>
            {uploadError ? (
              <Alert live tone="danger">
                <p>{uploadError}</p>
              </Alert>
            ) : null}
          </form>
        </details>
      ) : null}
    </div>
  );
}
