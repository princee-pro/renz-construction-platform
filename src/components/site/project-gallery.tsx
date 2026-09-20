"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";

import { Reveal } from "@/components/motion/primitives";
import { isApiMediaSrc, projectMediaSrc } from "@/lib/media/public-src";

/** One gallery piece of a published project (D1.7 §19–20, §31). */
export type GalleryMedia = Readonly<{
  id: string;
  role: string;
  kind: "image" | "video";
  alt: string;
  caption: string | null;
  /** Evidence wording shown with the item, e.g. "Generated concept visual". */
  evidence: string;
  width: number | null;
  height: number | null;
  focalX: number;
  focalY: number;
  /** Poster media id for a video item (its own project_media row). */
  posterId?: string | null;
}>;

/** Plain-English role labels (D1.7 §20). Unknown roles fall back to the raw role. */
export const galleryRoleLabels: Readonly<Record<string, string>> = {
  hero: "Hero",
  context: "Context",
  exterior: "Exterior",
  interior: "Interior",
  detail: "Detail / material",
  process: "Construction / process",
  drawing: "Drawing / diagram",
  dusk: "Dusk",
  video: "Video",
  video_poster: "Video poster",
};

export function galleryRoleLabel(role: string): string {
  return galleryRoleLabels[role] ?? role.replace(/[_-]+/gu, " ");
}

/** Feature frames get the larger slots: hero, context, exterior, interior, dusk, video. */
const featureRoles = new Set(["hero", "context", "exterior", "interior", "dusk", "video"]);

function srcFor(item: GalleryMedia, size: "thumb" | "full"): string {
  if (item.kind === "video") {
    return projectMediaSrc(item.posterId ?? item.id, size);
  }
  return projectMediaSrc(item.id, size);
}

function ratioStyle(item: GalleryMedia): React.CSSProperties {
  return item.width && item.height
    ? { aspectRatio: `${item.width} / ${item.height}` }
    : { aspectRatio: "3 / 2" };
}

/**
 * Accessible lightbox (D1.7 §24, §79–80): a native <dialog> (focus is
 * trapped and Escape closes it by the platform), previous / next / close,
 * the index "03 / 07", caption, role and evidence label. Left / Right keys,
 * pointer swipe, and the full-size asset is requested only when an item is
 * shown. `#gallery-3` in the URL reopens the same item (D1.7 §25).
 */
export function Lightbox({
  items,
  title,
  open,
  index,
  onClose,
  onNavigate,
}: Readonly<{
  items: readonly GalleryMedia[];
  title: string;
  open: boolean;
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const item = items[index];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const previous = useCallback(
    () => onNavigate((index - 1 + items.length) % items.length),
    [index, items.length, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % items.length),
    [index, items.length, onNavigate],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLDialogElement>): void {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    swipe.current = { x: event.clientX, y: event.clientY };
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>): void {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else previous();
    }
  }

  if (!item) return null;
  const full = srcFor(item, "full");
  return (
    <dialog
      aria-label={`${title} gallery`}
      className="lightbox"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
      ref={ref}
    >
      {/* Nothing inside the dialog is rendered (or fetched) until it opens (D1.7 §80). */}
      <div className="lightbox-inner" hidden={!open}>
        {open ? (
          <>
            <header className="lightbox-head">
              <p className="lightbox-index" aria-live="polite">
                <span>{String(index + 1).padStart(2, "0")}</span> /{" "}
                {String(items.length).padStart(2, "0")}
              </p>
              <p className="lightbox-title">{title}</p>
              <button className="lightbox-close" onClick={onClose} type="button">
                Close <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="lightbox-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
              <button
                aria-label="Previous image"
                className="lightbox-arrow lightbox-arrow-previous"
                disabled={items.length < 2}
                onClick={previous}
                type="button"
              >
                <span aria-hidden="true">←</span>
              </button>
              <figure className="lightbox-figure" key={item.id}>
                {item.kind === "video" ? (
                  <video
                    className="lightbox-video"
                    controls
                    muted
                    playsInline
                    poster={item.posterId ? projectMediaSrc(item.posterId, "full") : undefined}
                    preload="metadata"
                    src={projectMediaSrc(item.id, "full")}
                  >
                    {item.alt}
                  </video>
                ) : (
                  <Image
                    alt={item.alt}
                    className="lightbox-image"
                    height={item.height ?? 1200}
                    priority
                    quality={88}
                    sizes="100vw"
                    src={full}
                    unoptimized={isApiMediaSrc(full)}
                    width={item.width ?? 1800}
                  />
                )}
                <figcaption>
                  {item.caption ? <strong>{item.caption}</strong> : null}
                  <span className="datum-label">{galleryRoleLabel(item.role)}</span>
                  <span className="concept-badge">{item.evidence}</span>
                </figcaption>
              </figure>
              <button
                aria-label="Next image"
                className="lightbox-arrow lightbox-arrow-next"
                disabled={items.length < 2}
                onClick={next}
                type="button"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
            <ol aria-label="Gallery index" className="lightbox-strip">
              {items.map((entry, position) => (
                <li key={entry.id}>
                  <button
                    aria-current={position === index ? "true" : undefined}
                    aria-label={`${String(position + 1).padStart(2, "0")} ${entry.caption ?? galleryRoleLabel(entry.role)}`}
                    className="lightbox-thumb"
                    onClick={() => onNavigate(position)}
                    type="button"
                  >
                    <Image
                      alt=""
                      fill
                      loading="lazy"
                      sizes="96px"
                      src={srcFor(entry, "thumb")}
                      unoptimized
                    />
                  </button>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

/**
 * Editorial gallery grid (D1.7 §23): feature frames large, detail frames
 * small, deterministic from the media roles; mobile stacks. Every frame is a
 * button that opens the lightbox at that item. Thumbnails only — the full
 * asset loads on demand.
 */
export function ProjectGallery({
  items,
  title,
  sequence,
  label,
}: Readonly<{
  items: readonly GalleryMedia[];
  title: string;
  /** A short inline sequence (2–3 frames) rather than the full grid. */
  sequence?: boolean;
  label?: string;
}>) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const id = useId();

  // Deep link (D1.7 §25): #gallery-N opens the Nth item once, on arrival.
  useEffect(() => {
    if (sequence) return;
    const match = /^#gallery-(\d+)$/u.exec(window.location.hash);
    if (!match) return;
    const position = Number(match[1]) - 1;
    if (position < 0 || position >= items.length) return;
    const timer = setTimeout(() => {
      setIndex(position);
      setOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [items.length, sequence]);

  const show = useCallback(
    (position: number) => {
      setIndex(position);
      setOpen(true);
      if (!sequence) window.history.replaceState(null, "", `#gallery-${position + 1}`);
    },
    [sequence],
  );
  const close = useCallback(() => {
    setOpen(false);
    if (!sequence && window.location.hash.startsWith("#gallery-")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [sequence]);
  const navigate = useCallback(
    (position: number) => {
      setIndex(position);
      if (!sequence) window.history.replaceState(null, "", `#gallery-${position + 1}`);
    },
    [sequence],
  );

  if (items.length === 0) return null;
  return (
    <>
      <ol
        aria-label={label ?? `${title} gallery`}
        className={sequence ? "gallery-sequence" : "gallery-grid"}
      >
        {items.map((item, position) => {
          const feature = featureRoles.has(item.role);
          const portrait = Boolean(item.width && item.height && item.height > item.width);
          const diagram = item.role === "drawing" || item.role === "process";
          return (
            <Reveal
              as="li"
              className={`gallery-frame gallery-frame-${feature ? "feature" : "detail"} gallery-frame-${item.role}${portrait ? " gallery-frame-portrait" : ""}${diagram ? " gallery-frame-contain" : ""}`}
              delay={(position % 3) * 0.05}
              key={item.id}
              variant="assemble"
            >
              <button
                aria-controls={`${id}-lightbox`}
                aria-label={`Open ${item.caption ?? galleryRoleLabel(item.role)} (${String(position + 1).padStart(2, "0")} of ${String(items.length).padStart(2, "0")})`}
                className="gallery-frame-button card-hover-media"
                onClick={() => show(position)}
                type="button"
              >
                <span className="gallery-frame-media" style={ratioStyle(item)}>
                  <Image
                    alt={item.alt}
                    fill
                    loading="lazy"
                    quality={82}
                    sizes={
                      feature ? "(max-width: 768px) 100vw, 60vw" : "(max-width: 768px) 100vw, 30vw"
                    }
                    src={srcFor(item, "thumb")}
                    unoptimized
                    style={{
                      objectPosition: `${Math.round(item.focalX * 100)}% ${Math.round(item.focalY * 100)}%`,
                    }}
                  />
                  {item.kind === "video" ? (
                    <span aria-hidden="true" className="gallery-frame-play">
                      ▶
                    </span>
                  ) : null}
                </span>
                <span className="gallery-frame-caption">
                  <span className="index-mark">{String(position + 1).padStart(2, "0")}</span>
                  <span>{item.caption ?? galleryRoleLabel(item.role)}</span>
                  <small>{galleryRoleLabel(item.role)}</small>
                </span>
              </button>
            </Reveal>
          );
        })}
      </ol>
      <div id={`${id}-lightbox`}>
        <Lightbox
          index={index}
          items={items}
          onClose={close}
          onNavigate={navigate}
          open={open}
          title={title}
        />
      </div>
    </>
  );
}
