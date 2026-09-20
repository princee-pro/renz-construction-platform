"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ease } from "@/components/motion/primitives";
import { isApiMediaSrc } from "@/lib/media/public-src";

export type FilmFrame = Readonly<{
  id: string;
  href: string;
  title: string;
  category: string | null;
  src: string;
  alt: string;
  focalX: number;
  focalY: number;
  provenance: string | null;
}>;

/**
 * PROJECT FILM ARCHIVE (D1.6 brief §61): the published studies as a film
 * strip. One frame is "in the gate" and slowly drifts; the strip below shows
 * the sequence and advances every few seconds (paused under reduced motion,
 * on hover, and while a frame has focus). Every frame is a link and keeps
 * its concept label — nothing here claims delivered work.
 */
export function FilmStrip({
  frames,
  label,
}: Readonly<{ frames: readonly FilmFrame[]; label: string }>) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const current = frames[index % Math.max(1, frames.length)];

  useEffect(() => {
    if (reduced || held || frames.length < 2) return;
    const id = setInterval(() => setIndex((value) => (value + 1) % frames.length), 4200);
    return () => clearInterval(id);
  }, [reduced, held, frames.length]);

  if (!current) return null;

  return (
    <div
      className="film"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
      }}
      onFocus={() => setHeld(true)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <div aria-hidden="true" className="film-gate">
        <AnimatePresence initial={false}>
          <motion.div
            animate={{ opacity: 1, scale: reduced ? 1 : 1.04 }}
            className="film-gate-frame"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, scale: 1 }}
            key={current.id}
            transition={{
              opacity: { duration: reduced ? 0 : 0.7, ease: ease.out },
              scale: { duration: 4.4, ease: "linear" },
            }}
          >
            <Image
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              src={current.src}
              style={{
                objectPosition: `${Math.round(current.focalX * 100)}% ${Math.round(current.focalY * 100)}%`,
              }}
              unoptimized={isApiMediaSrc(current.src)}
            />
          </motion.div>
        </AnimatePresence>
        <span className="cinematic-wash cinematic-wash-strong" />
        <span className="film-gate-marks" />
      </div>
      <div className="container film-caption">
        <p className="film-counter">
          <span className="index-mark">{String(index + 1).padStart(2, "0")}</span>
          <span className="film-counter-total">/ {String(frames.length).padStart(2, "0")}</span>
          <span className="film-counter-title">{current.title}</span>
          {current.category ? (
            <span className="film-counter-category">{current.category}</span>
          ) : null}
          {current.provenance ? <span className="concept-badge">{current.provenance}</span> : null}
        </p>
      </div>
      <nav aria-label={label} className="film-strip">
        <ol>
          {frames.map((frame, frameIndex) => (
            <li key={frame.id}>
              <Link
                aria-current={frameIndex === index ? "true" : undefined}
                className="film-frame"
                href={frame.href}
                onFocus={() => setIndex(frameIndex)}
                onMouseEnter={() => setIndex(frameIndex)}
              >
                <span className="film-frame-media">
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 768px) 40vw, 200px"
                    src={frame.src}
                    unoptimized={isApiMediaSrc(frame.src)}
                  />
                </span>
                <span className="film-frame-label">
                  <span className="index-mark">{String(frameIndex + 1).padStart(2, "0")}</span>
                  <span>{frame.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
