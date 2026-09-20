"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/admin/ui/button";
import { searchMediaAction } from "@/features/website/media-actions";
import type { MediaItem } from "@/features/website/media-contract";

export const classificationLabels: Readonly<Record<string, string>> = {
  renz_provided: "RENZ provided (own photograph or drawing)",
  licensed: "Licensed (RENZ holds a licence)",
  generated_concept: "Generated concept visual (never project evidence)",
  review_required: "Other / review required",
};

/**
 * Media picker (CR1 §32): choose an existing library image or upload a new
 * one. Uploads go through /api/admin/media (same S4 pipeline as project
 * media); rights are confirmed in the library before the image can be
 * published. Owner language throughout — no storage paths, no rights codes.
 */
export type MediaPickerKind = "image" | "video";

function MediaThumb({ id, kind }: Readonly<{ id: string; kind: MediaPickerKind }>) {
  if (kind === "video") {
    return (
      <span className="media-picker-thumb media-card-video">
        <video muted playsInline preload="metadata" src={`/api/media/website/${id}`} />
        <span className="media-kind-badge">Video</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" className="media-picker-thumb" src={`/api/media/website/${id}`} />;
}

export function MediaPicker({
  value,
  onChange,
  label = "Image",
  allowUpload = true,
  kind = "image",
}: Readonly<{
  value: string | null;
  onChange: (mediaId: string | null, item?: MediaItem) => void;
  label?: string;
  allowUpload?: boolean;
  /** D1.6: hero video fields list and upload videos only; everything else stays image-only. */
  kind?: MediaPickerKind;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<readonly MediaItem[]>([]);
  const [loading, startLoading] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    startLoading(async () => {
      const results = await searchMediaAction(query, "all");
      setItems(
        results.filter((item) =>
          kind === "video"
            ? item.mime_type.startsWith("video/")
            : !item.mime_type.startsWith("video/"),
        ),
      );
    });
  }, [open, query, kind]);

  function openPicker(): void {
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closePicker(): void {
    dialogRef.current?.close();
    setOpen(false);
  }

  async function upload(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setUploadError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setUploadError(
        kind === "video"
          ? "Choose a video file (MP4 or WebM)."
          : "Choose an image file (JPEG, PNG, WebP or AVIF).",
      );
      return;
    }
    setUploading(true);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: data });
      const result = (await response.json()) as { ok?: boolean; id?: string; reason?: string };
      if (!result.ok || !result.id) {
        setUploadError(
          kind === "video"
            ? "The video could not be uploaded. Confirm it is an MP4 or WebM file under 12 MB."
            : "The image could not be uploaded. Confirm it is a JPEG, PNG, WebP or AVIF file under 20 MB.",
        );
        return;
      }
      onChange(result.id);
      form.reset();
      closePicker();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="media-picker">
      <div className="media-picker-current">
        {value ? (
          <MediaThumb id={value} kind={kind} />
        ) : (
          <span className="media-picker-empty">{kind === "video" ? "No video" : "No image"}</span>
        )}
        <div className="media-picker-actions">
          <Button onClick={openPicker} tone="secondary">
            {value ? `Change ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
          </Button>
          {value ? (
            <Button onClick={() => onChange(null)} tone="quiet">
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <dialog
        aria-label="Choose an image"
        className="media-picker-dialog"
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        <div className="media-picker-panel">
          <header className="media-picker-header">
            <strong>Choose an image</strong>
            <Button onClick={closePicker} tone="quiet">
              Close
            </Button>
          </header>
          <label className="field-group" htmlFor="media-picker-search">
            <span className="field-label">Search the library</span>
            <input
              autoComplete="off"
              id="media-picker-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="File name, alt text or caption"
              type="search"
              value={query}
            />
          </label>
          <ul aria-busy={loading} className="media-picker-grid">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={`media-picker-item${item.ready ? "" : " media-picker-item-pending"}`}
                  onClick={() => {
                    onChange(item.id, item);
                    closePicker();
                  }}
                  type="button"
                >
                  {item.mime_type.startsWith("video/") ? (
                    <span className="media-card-video">
                      <video
                        muted
                        playsInline
                        preload="metadata"
                        src={`/api/media/website/${item.id}`}
                      />
                      <span className="media-kind-badge">Video</span>
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={item.alt_text ?? ""}
                      loading="lazy"
                      src={`/api/media/website/${item.id}`}
                    />
                  )}
                  <span className="media-picker-item-label">
                    {item.alt_text ?? item.filename ?? "Untitled image"}
                  </span>
                  {!item.ready ? (
                    <span className="status-badge status-review">Rights to confirm</span>
                  ) : null}
                </button>
              </li>
            ))}
            {!loading && items.length === 0 ? (
              <li className="quiet-empty">
                {kind === "video"
                  ? "No videos yet. Upload one below."
                  : "No images yet. Upload one below."}
              </li>
            ) : null}
          </ul>
          {allowUpload ? (
            <form className="media-picker-upload" onSubmit={(event) => void upload(event)}>
              <p className="field-label">
                {kind === "video" ? "Upload a new video" : "Upload a new image"}
              </p>
              <label className="field-group" htmlFor="media-picker-file">
                <span className="field-label">File</span>
                <input
                  accept={
                    kind === "video"
                      ? "video/mp4,video/webm"
                      : "image/jpeg,image/png,image/webp,image/avif"
                  }
                  id="media-picker-file"
                  name="file"
                  type="file"
                />
              </label>
              <label className="field-group" htmlFor="media-picker-classification">
                <span className="field-label">How RENZ holds the rights</span>
                <select
                  defaultValue="renz_provided"
                  id="media-picker-classification"
                  name="classification"
                >
                  <option value="renz_provided">{classificationLabels["renz_provided"]}</option>
                  <option value="licensed">{classificationLabels["licensed"]}</option>
                  <option value="generated_concept">
                    {classificationLabels["generated_concept"]}
                  </option>
                </select>
              </label>
              <label className="field-group" htmlFor="media-picker-alt">
                <span className="field-label">Alt text (what the image shows)</span>
                <input id="media-picker-alt" maxLength={300} name="altText" type="text" />
              </label>
              <p className="field-help">
                After uploading, confirm the rights in Website → Media so the image can go live.
              </p>
              {uploadError ? <p className="field-error">{uploadError}</p> : null}
              <Button disabled={uploading} tone="primary" type="submit">
                {uploading ? "Uploading…" : "Upload and use"}
              </Button>
            </form>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
