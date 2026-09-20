"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { ease } from "@/components/motion/primitives";

/**
 * Scene kit: the small vocabulary every landing scene is drawn with. All
 * scenes are decorative (aria-hidden) inline SVG so nothing is downloaded,
 * strokes use currentColor, and every primitive renders its final state
 * under reduced motion. Timing is relative to a scene "t0" so a route reads
 * as one choreography: MEASURE (datum draws) → REGISTER (marks land) →
 * RESOLVE (form appears).
 */

export type SceneTone = "gold" | "paper" | "hair" | "ink";

export function Scene({
  children,
  className,
  viewBox = "0 0 1200 800",
  fit = "slice",
}: Readonly<{
  children: ReactNode;
  className?: string;
  viewBox?: string;
  fit?: "slice" | "meet" | "none";
}>) {
  return (
    <svg
      aria-hidden="true"
      className={`scene${className ? ` ${className}` : ""}`}
      focusable="false"
      preserveAspectRatio={fit === "none" ? "none" : `xMidYMid ${fit}`}
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}

const toneClass: Readonly<Record<SceneTone, string>> = {
  gold: "scene-gold",
  paper: "scene-paper",
  hair: "scene-hair",
  ink: "scene-ink",
};

/** DRAW: a path draws along its length. */
export function Draw({
  d,
  delay = 0,
  duration = 1,
  tone = "paper",
  weight = 1.35,
  dashed = false,
  opacity = 1,
  className,
}: Readonly<{
  d: string;
  delay?: number;
  duration?: number;
  tone?: SceneTone;
  weight?: number;
  dashed?: boolean;
  opacity?: number;
  className?: string;
}>) {
  const reduced = useReducedMotion();
  return (
    <motion.path
      animate={{ pathLength: 1, opacity }}
      className={`${toneClass[tone]}${className ? ` ${className}` : ""}`}
      d={d}
      fill="none"
      initial={reduced ? false : { pathLength: 0, opacity: 0 }}
      strokeDasharray={dashed ? "6 9" : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={weight}
      transition={{ duration, delay: reduced ? 0 : delay, ease: ease.inOut }}
      vectorEffect="non-scaling-stroke"
    />
  );
}

/** REGISTER: a group lands (fade + settle) at its own time. */
export function Register({
  children,
  delay = 0,
  duration = 0.5,
  from = "up",
}: Readonly<{
  children: ReactNode;
  delay?: number;
  duration?: number;
  from?: "up" | "down" | "none" | "scale";
}>) {
  const reduced = useReducedMotion();
  const hidden =
    from === "scale"
      ? { opacity: 0, scale: 0.6 }
      : from === "none"
        ? { opacity: 0 }
        : { opacity: 0, y: from === "up" ? 14 : -14 };
  return (
    <motion.g
      animate={{ opacity: 1, y: 0, scale: 1 }}
      initial={reduced ? false : hidden}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      transition={{ duration, delay: reduced ? 0 : delay, ease: ease.out }}
    >
      {children}
    </motion.g>
  );
}

/** FILL: a rectangle fills from its base (or side). */
export function Fill({
  x,
  y,
  width,
  height,
  delay = 0,
  duration = 0.7,
  tone = "paper",
  opacity = 0.16,
  axis = "y",
}: Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  delay?: number;
  duration?: number;
  tone?: SceneTone;
  opacity?: number;
  axis?: "x" | "y";
}>) {
  const reduced = useReducedMotion();
  return (
    <motion.rect
      animate={{ scaleX: 1, scaleY: 1, opacity }}
      className={`${toneClass[tone]} scene-fill`}
      height={height}
      initial={
        reduced ? false : axis === "y" ? { scaleY: 0, opacity: 0 } : { scaleX: 0, opacity: 0 }
      }
      style={{
        transformBox: "fill-box",
        transformOrigin: axis === "y" ? "center bottom" : "left center",
      }}
      transition={{ duration, delay: reduced ? 0 : delay, ease: ease.inOut }}
      width={width}
      x={x}
      y={y}
    />
  );
}

/** DIM: a measured dimension with end ticks and an optional mono label. */
export function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  delay = 0,
  tone = "gold",
}: Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  delay?: number;
  tone?: SceneTone;
}>) {
  const vertical = x1 === x2;
  const tick = 8;
  return (
    <g className={toneClass[tone]}>
      <Draw d={`M${x1} ${y1}L${x2} ${y2}`} delay={delay} duration={0.7} tone={tone} />
      <Draw
        d={
          vertical
            ? `M${x1 - tick} ${y1}h${tick * 2}M${x2 - tick} ${y2}h${tick * 2}`
            : `M${x1} ${y1 - tick}v${tick * 2}M${x2} ${y2 - tick}v${tick * 2}`
        }
        delay={delay + 0.5}
        duration={0.3}
        tone={tone}
      />
      {label ? (
        <Register delay={delay + 0.7} from="none">
          <text
            className="scene-label"
            textAnchor="middle"
            x={vertical ? x1 + 16 : (x1 + x2) / 2}
            y={vertical ? (y1 + y2) / 2 : y1 - 10}
          >
            {label}
          </text>
        </Register>
      ) : null}
    </g>
  );
}

/** MARK: a survey / registration cross that lands and (optionally) breathes. */
export function Mark({
  x,
  y,
  size = 14,
  delay = 0,
  tone = "gold",
  pulse = false,
}: Readonly<{
  x: number;
  y: number;
  size?: number;
  delay?: number;
  tone?: SceneTone;
  pulse?: boolean;
}>) {
  return (
    <Register delay={delay} from="scale">
      <g className={toneClass[tone]}>
        <path
          d={`M${x - size} ${y}h${size * 2}M${x} ${y - size}v${size * 2}`}
          fill="none"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={x} cy={y} fill="currentColor" r={2.4} />
        {pulse ? (
          <circle className="scene-pulse" cx={x} cy={y} fill="none" r={size} strokeWidth={1} />
        ) : null}
      </g>
    </Register>
  );
}

/** LABEL: a small mono note. */
export function Label({
  x,
  y,
  children,
  delay = 0,
  tone = "paper",
  anchor = "start",
}: Readonly<{
  x: number;
  y: number;
  children: ReactNode;
  delay?: number;
  tone?: SceneTone;
  anchor?: "start" | "middle" | "end";
}>) {
  return (
    <Register delay={delay} from="none">
      <text className={`scene-label ${toneClass[tone]}`} textAnchor={anchor} x={x} y={y}>
        {children}
      </text>
    </Register>
  );
}

/** HATCH: diagonal hatch pattern definition (call once per scene). */
export function HatchDefs({ id = "scene-hatch" }: Readonly<{ id?: string }>) {
  return (
    <defs>
      <pattern
        height="10"
        id={id}
        patternTransform="rotate(45)"
        patternUnits="userSpaceOnUse"
        width="10"
      >
        <path d="M0 0v10" stroke="currentColor" strokeWidth="1" />
      </pattern>
      <pattern height="12" id={`${id}-cross`} patternUnits="userSpaceOnUse" width="12">
        <path d="M0 0h12M0 0v12" stroke="currentColor" strokeWidth="0.8" />
      </pattern>
    </defs>
  );
}
