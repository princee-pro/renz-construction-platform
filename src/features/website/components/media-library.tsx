"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { classificationLabels } from "@/features/website/components/media-picker";
import { mediaFilters, type MediaFilter, type MediaList } from "@/features/website/media-contract";

const filterLabels: Readonly<Record<MediaFilter, string>> = {
  all: "All",
  ready: "Ready to use",
  needs_rights: "Rights to confirm",
  needs_alt: "Missing alt text",
  unused: "Not used anywhere",
  archived: "Archived",
};

/** Media library (CR1 §32): the owner's images with their readiness, usage and an upload form. */
export function MediaLibrary({
  list,
  query,
  filter,
  canUpload,
  canManage,
}: Readonly<{
  list: MediaList;
  query: string;
  filter: MediaFilter;
  canUpload: boolean;
  canManage: boolean;
}>) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setUploadError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setUploadError("Choose an image file (JPEG, PNG, WebP or AVIF).");
      return;
    }
    setUploading(true);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: data });
      const result = (await response.json()) as { ok?: boolean; id?: string };
      if (!result.ok || !result.id) {
        setUploadError(
          "The image could not be uploaded. Confirm it is a JPEG, PNG, WebP or AVIF file under 20 MB.",
        );
        return;
      }
      form.reset();
      router.push(`/admin/website/media/${result.id}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="media-library">
      <form action="/admin/website/media" className="service-filters" method="get" role="search">
        <div className="field-group filter-search">
          <label htmlFor="media-search">Search images</label>
          <input
            autoComplete="off"
            defaultValue={query}
            id="media-search"
            maxLength={100}
            name="q"
            placeholder="File name, alt text or caption"
            type="search"
          />
        </div>
        <div className="field-group">
          <label htmlFor="media-filter">Show</label>
          <select defaultValue={filter} id="media-filter" name="filter">
            {mediaFilters.map((value) => (
              <option key={value} value={value}>
                {filterLabels[value]}
                {list.counts[value] !== undefined && list.counts[value] !== null
                  ? ` (${list.counts[value]})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <button className="button button-secondary" type="submit">
          Apply
        </button>
      </form>

      {canUpload ? (
        <form
          className="media-upload-form register-section"
          onSubmit={(event) => void upload(event)}
        >
          <h2>Upload an image or a short video</h2>
          <div className="field-grid field-grid-two">
            <div className="field-group">
              <label htmlFor="media-file">File</label>
              <input
                accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
                id="media-file"
                name="file"
                required
                type="file"
              />
            </div>
            <div className="field-group">
              <label htmlFor="media-classification">How RENZ holds the rights</label>
              <select defaultValue="renz_provided" id="media-classification" name="classification">
                <option value="renz_provided">{classificationLabels["renz_provided"]}</option>
                <option value="licensed">{classificationLabels["licensed"]}</option>
                <option value="generated_concept">
                  {classificationLabels["generated_concept"]}
                </option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="media-alt">Alt text (what the image shows)</label>
              <input id="media-alt" maxLength={300} name="altText" type="text" />
            </div>
            <div className="field-group">
              <label htmlFor="media-caption">Caption (optional)</label>
              <input id="media-caption" maxLength={600} name="caption" type="text" />
            </div>
          </div>
          <p className="field-help">
            After uploading you confirm the rights once; the file is then ready for pages, projects
            and insights. Videos are short muted loops for page openings (MP4 or WebM, 5–8 seconds,
            up to 12 MB); always add a still image as the poster. Generated concept visuals are
            always labelled and never count as project evidence.
          </p>
          {uploadError ? <p className="field-error">{uploadError}</p> : null}
          <Button disabled={uploading} tone="primary" type="submit">
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
      ) : null}

      <section aria-label="Images" className="register-section">
        {list.items.length === 0 ? (
          <p className="quiet-empty">No images match. Upload one above.</p>
        ) : (
          <ul className="media-grid">
            {list.items.map((item) => (
              <li className="media-card" key={item.id}>
                <Link href={`/admin/website/media/${item.id}`}>
                  {item.mime_type.startsWith("video/") ? (
                    <span className="media-card-video" aria-label="Video">
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
                  <span className="media-card-body">
                    <strong>{item.alt_text ?? item.filename ?? "Untitled image"}</strong>
                    <small>
                      {classificationLabels[item.classification] ?? item.classification}
                      {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
                    </small>
                    <span className="media-card-state">
                      {item.storage_state === "archived" ? (
                        <StatusBadge tone="archived">Archived</StatusBadge>
                      ) : item.ready ? (
                        <StatusBadge tone="ready">Ready</StatusBadge>
                      ) : (
                        <StatusBadge tone="review">Rights to confirm</StatusBadge>
                      )}
                      {!item.alt_text ? (
                        <StatusBadge tone="blocked">No alt text</StatusBadge>
                      ) : null}
                      <StatusBadge tone="neutral">
                        {item.usage_count === 0 ? "Not used" : `Used ${item.usage_count}×`}
                      </StatusBadge>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {!canManage ? (
        <p className="field-help">
          Confirming rights and archiving need the media management permission.
        </p>
      ) : null}
    </div>
  );
}
