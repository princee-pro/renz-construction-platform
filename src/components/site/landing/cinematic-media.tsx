"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { isApiMediaSrc } from "@/lib/media/public-src";

export type VideoSource = Readonly<{ src: string; type?: "video/webm" | "video/mp4" }>;

export type CinematicVideo = Readonly<{
  /** Desktop sources, WebM first where practical, MP4 fallback. */
  sources: readonly VideoSource[];
  /** Smaller sources for narrow viewports; when absent phones keep the poster. */
  mobileSources?: readonly VideoSource[];
}>;

export type CinematicPoster = Readonly<{
  src: string;
  alt: string;
  focalX?: number;
  focalY?: number;
  width?: number | null;
  height?: number | null;
}>;

type CinematicMediaProps = Readonly<{
  poster: CinematicPoster | null;
  video?: CinematicVideo | null;
  /** Slow scale/drift over the poster when no video plays (never under reduced motion). */
  kenBurns?: boolean;
  /** Scroll-linked drift so the media hands over to the page (never under reduced motion). */
  parallax?: boolean;
  /** Tone of the wash drawn over the media so copy stays readable (brief §74). */
  wash?: "strong" | "soft" | "none";
  className?: string;
}>;

type Connection = Readonly<{ saveData?: boolean; effectiveType?: string }>;

/**
 * Poster-first cinematic media (D1.6 brief §43–48, §102, §105–106).
 *
 * The poster paints immediately and is the LCP candidate; the <video> is
 * only created after the page has settled, only when the visitor has not
 * asked for reduced motion or reduced data, only on a connection that is
 * not 2G, and only with sources that fit the viewport. It is muted, inline,
 * looped, preloads nothing until it is on screen, fades in once it can play,
 * and pauses when it leaves the viewport or the tab is hidden. Nothing here
 * is required for the page to read: the poster is the complete state.
 */
export function CinematicMedia({
  poster,
  video = null,
  kenBurns = true,
  parallax = true,
  wash = "strong",
  className,
}: CinematicMediaProps) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"poster" | "video">("poster");
  const [ready, setReady] = useState(false);
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);

  // Decide once, after paint, whether video is appropriate at all.
  useEffect(() => {
    if (!video || video.sources.length === 0 || reduced) return;
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && /(^|-)2g$/u.test(connection.effectiveType)) return;
    const narrow = window.matchMedia("(max-width: 47.99rem)").matches;
    if (narrow && (!video.mobileSources || video.mobileSources.length === 0)) return;
    // After the page has settled (never on the critical path of the poster).
    const timer = window.setTimeout(() => setMode("video"), 600);
    return () => window.clearTimeout(timer);
  }, [video, reduced]);

  // Play only while on screen and while the tab is visible.
  useEffect(() => {
    const element = videoRef.current;
    if (mode !== "video" || !element) return;
    let onScreen = false;
    const sync = () => {
      if (onScreen && document.visibilityState === "visible") {
        if (element.paused) void element.play().catch(() => undefined);
      } else if (!element.paused) {
        element.pause();
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = Boolean(entry?.isIntersecting);
        if (onScreen && element.preload === "none") {
          element.preload = "auto";
          element.load();
        }
        sync();
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      element.pause();
    };
  }, [mode]);

  const narrowSources = video?.mobileSources?.length ? video.mobileSources : null;
  const objectPosition = poster
    ? `${Math.round((poster.focalX ?? 0.5) * 100)}% ${Math.round((poster.focalY ?? 0.5) * 100)}%`
    : undefined;

  return (
    <motion.div
      className={`cinematic${className ? ` ${className}` : ""}`}
      data-kenburns={kenBurns && !reduced && mode !== "video" ? "true" : undefined}
      data-mode={mode}
      data-ready={ready ? "true" : undefined}
      ref={rootRef}
      style={parallax && !reduced ? { y } : {}}
    >
      {poster ? (
        <Image
          alt={poster.alt}
          className="cinematic-poster"
          fill
          loading="eager"
          priority
          quality={86}
          sizes="100vw"
          src={poster.src}
          style={objectPosition ? { objectPosition } : undefined}
          unoptimized={isApiMediaSrc(poster.src)}
        />
      ) : (
        <span className="cinematic-empty" />
      )}
      {mode === "video" && video ? (
        <video
          aria-hidden="true"
          autoPlay
          className="cinematic-video"
          disablePictureInPicture
          loop
          muted
          onCanPlay={() => setReady(true)}
          playsInline
          preload="none"
          ref={videoRef}
          style={objectPosition ? { objectPosition } : undefined}
          tabIndex={-1}
        >
          {narrowSources
            ? narrowSources.map((source) => (
                <source
                  key={source.src}
                  media="(max-width: 47.99rem)"
                  src={source.src}
                  type={source.type}
                />
              ))
            : null}
          {video.sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </video>
      ) : null}
      {wash !== "none" ? <span className={`cinematic-wash cinematic-wash-${wash}`} /> : null}
    </motion.div>
  );
}
