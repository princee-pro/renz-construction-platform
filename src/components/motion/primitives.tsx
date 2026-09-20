"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
  type Variants,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/**
 * D1 motion primitives (brief §13–17). One vocabulary — MEASURE, DRAW, ALIGN,
 * REVEAL, ASSEMBLE, LOCK, BUILD, SHIFT, RESOLVE — implemented once with
 * Motion for React. Every primitive renders its FINAL state when the visitor
 * prefers reduced motion (no parallax, no scroll-linked transforms, no
 * choreography), and every animation uses transform/opacity/clip-path only.
 */

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  lock: [0.2, 0.9, 0.2, 1] as const,
};

export const duration = {
  micro: 0.18,
  content: 0.42,
  section: 0.7,
  cinematic: 0.95,
};

export type RevealVariant = "rise" | "assemble" | "measure" | "resolve" | "shift";

// Motion components are created once, at module scope (never in render).
const motionElements = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  footer: motion.footer,
  figure: motion.figure,
  ol: motion.ol,
  ul: motion.ul,
  li: motion.li,
  p: motion.p,
  aside: motion.aside,
  nav: motion.nav,
} as const;
type MotionTag = keyof typeof motionElements;
function motionKey(tag: ElementType): MotionTag {
  return (typeof tag === "string" && tag in motionElements ? tag : "div") as MotionTag;
}

const variants: Record<RevealVariant, Variants> = {
  // REVEAL: content settles upward into place.
  rise: {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0 },
  },
  // ASSEMBLE: pieces arrive from a slight offset and lock.
  assemble: {
    hidden: { opacity: 0, y: 12, scale: 0.985 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  // MEASURE: enters along the datum (left → right). A clip-path on the
  // observed element would stop it intersecting, so use a lateral settle;
  // ImageReveal owns true mask reveals.
  measure: {
    hidden: { opacity: 0, x: -28 },
    visible: { opacity: 1, x: 0 },
  },
  // RESOLVE: blur-free focus — a soft scale/opacity settle for media.
  resolve: {
    hidden: { opacity: 0, scale: 1.035 },
    visible: { opacity: 1, scale: 1 },
  },
  // SHIFT: lateral entry for split compositions.
  shift: {
    hidden: { opacity: 0, x: -18 },
    visible: { opacity: 1, x: 0 },
  },
};

type RevealProps = Readonly<{
  children: ReactNode;
  as?: ElementType;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  amount?: number;
  once?: boolean;
  style?: MotionStyle;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}>;

/** Reveal: one element animates into its final state when it enters the viewport. */
export function Reveal({
  children,
  as = "div",
  className,
  variant = "rise",
  delay = 0,
  duration: length = duration.section,
  amount = 0.2,
  once = true,
  style,
  id,
  ...aria
}: RevealProps) {
  const reduced = useReducedMotion();
  const Component = motionElements[motionKey(as)] as (typeof motionElements)["div"];
  if (reduced) {
    const Static = as as "div";
    return (
      <Static className={className} id={id} style={style as CSSProperties} {...aria}>
        {children}
      </Static>
    );
  }
  return (
    <Component
      className={className}
      id={id}
      initial="hidden"
      {...(style ? { style } : {})}
      transition={{ duration: length, delay, ease: ease.out }}
      variants={variants[variant]}
      viewport={{ once, amount, margin: "0px 0px -8% 0px" }}
      whileInView="visible"
      {...aria}
    >
      {children}
    </Component>
  );
}

type StaggerProps = Readonly<{
  children: ReactNode;
  as?: ElementType;
  className?: string;
  gap?: number;
  delay?: number;
  amount?: number;
  style?: MotionStyle;
  "aria-label"?: string;
  role?: string;
}>;

/** Stagger: children marked with <StaggerItem> assemble one after another. */
export function Stagger({
  children,
  as = "div",
  className,
  gap = 0.08,
  delay = 0,
  amount = 0.15,
  style,
  ...rest
}: StaggerProps) {
  const reduced = useReducedMotion();
  const Component = motionElements[motionKey(as)] as (typeof motionElements)["div"];
  if (reduced) {
    const Static = as as "div";
    return (
      <Static className={className} style={style as CSSProperties} {...rest}>
        {children}
      </Static>
    );
  }
  return (
    <Component
      className={className}
      initial="hidden"
      {...(style ? { style } : {})}
      transition={{ staggerChildren: gap, delayChildren: delay }}
      viewport={{ once: true, amount, margin: "0px 0px -6% 0px" }}
      whileInView="visible"
      {...rest}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  as = "div",
  className,
  variant = "assemble",
  style,
}: Readonly<{
  children: ReactNode;
  as?: ElementType;
  className?: string;
  variant?: RevealVariant;
  style?: MotionStyle;
}>) {
  const reduced = useReducedMotion();
  const Component = motionElements[motionKey(as)] as (typeof motionElements)["div"];
  if (reduced) {
    const Static = as as "div";
    return (
      <Static className={className} style={style as CSSProperties}>
        {children}
      </Static>
    );
  }
  return (
    <Component
      className={className}
      {...(style ? { style } : {})}
      transition={{ duration: duration.content, ease: ease.out }}
      variants={variants[variant]}
    >
      {children}
    </Component>
  );
}

/** LineDraw: a gold datum line draws from its origin when in view (DRAW). */
export function LineDraw({
  className,
  orientation = "horizontal",
  delay = 0,
  length = 0.9,
}: Readonly<{
  className?: string;
  orientation?: "horizontal" | "vertical";
  delay?: number;
  length?: number;
}>) {
  const reduced = useReducedMotion();
  const property = orientation === "horizontal" ? "scaleX" : "scaleY";
  const origin = orientation === "horizontal" ? "left center" : "center top";
  return (
    <motion.span
      aria-hidden="true"
      className={`line-draw line-draw-${orientation}${className ? ` ${className}` : ""}`}
      initial={reduced ? false : { [property]: 0 }}
      style={{ transformOrigin: origin }}
      transition={{ duration: length, delay, ease: ease.inOut }}
      viewport={{ once: true, amount: 0.6 }}
      whileInView={{ [property]: 1 }}
    />
  );
}

/**
 * ImageReveal: a mask opens over media while the image settles from a slight
 * zoom. The observed root is never clipped (a clipped box does not
 * intersect); the mask and the zoom are children driven by variants.
 */
export function ImageReveal({
  children,
  className,
  direction = "up",
  delay = 0,
}: Readonly<{
  children: ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
  delay?: number;
}>) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div className={`image-reveal ${className ?? ""}`.trim()}>
        <div className="image-reveal-inner">{children}</div>
      </div>
    );
  }
  // A solid cover slides off the image instead of clipping it: Chromium
  // treats a fully clipped <img> as non-intersecting, so a clip-path mask
  // would also stop lazy loading. The cover is transform-only (GPU cheap)
  // and the image underneath loads on its normal lazy schedule.
  const axis = direction === "up" ? "scaleY" : "scaleX";
  const origin = direction === "up" ? "50% 100%" : direction === "left" ? "100% 50%" : "0% 50%";
  return (
    <motion.div
      className={`image-reveal ${className ?? ""}`.trim()}
      initial="hidden"
      viewport={{ once: true, amount: 0.2 }}
      whileInView="visible"
    >
      <motion.div
        className="image-reveal-inner"
        transition={{ duration: duration.cinematic + 0.3, delay, ease: ease.out }}
        variants={{ hidden: { scale: 1.08 }, visible: { scale: 1 } }}
      >
        {children}
      </motion.div>
      <motion.span
        aria-hidden="true"
        className="image-reveal-cover"
        style={{ transformOrigin: origin }}
        transition={{ duration: duration.cinematic, delay, ease: ease.inOut }}
        variants={{ hidden: { [axis]: 1 }, visible: { [axis]: 0 } }}
      />
    </motion.div>
  );
}

/** Parallax: a gentle scroll-linked vertical drift for media (disabled when reduced). */
export function Parallax({
  children,
  className,
  distance = 40,
}: Readonly<{ children: ReactNode; className?: string; distance?: number }>) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  return (
    <div className={`parallax ${className ?? ""}`.trim()} ref={ref}>
      <motion.div className="parallax-inner" style={reduced ? {} : { y }}>
        {children}
      </motion.div>
    </div>
  );
}

/** Counter: an index or figure counts up when it enters the viewport. */
export function Counter({
  value,
  prefix = "",
  suffix = "",
  className,
}: Readonly<{ value: number; prefix?: string; suffix?: string; className?: string }>) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (!inView || reduced) return;
    const start = performance.now();
    const total = 900;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / total);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, value]);
  return (
    <span className={className} ref={ref}>
      {prefix}
      {reduced ? value : shown}
      {suffix}
    </span>
  );
}

/** ScrollProgress: a thin datum that fills as a container (or the page) is read. */
export function ScrollProgress({
  target,
  className,
}: Readonly<{ target?: React.RefObject<HTMLElement | null>; className?: string }>) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll(
    target ? { target, offset: ["start start", "end end"] } : undefined,
  );
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });
  return (
    <motion.span
      aria-hidden="true"
      className={`scroll-progress ${className ?? ""}`.trim()}
      style={reduced ? {} : { scaleX, transformOrigin: "left center" }}
    />
  );
}

/**
 * HorizontalStory (brief §36): ONE controlled horizontal sequence. Vertical
 * scrolling drives the track; the browser scroll stays authoritative (no
 * hijack). Reduced motion or narrow viewports render the panels vertically.
 */
export function HorizontalStory({
  children,
  panels,
  className,
  label,
  rail,
}: Readonly<{
  children: ReactNode;
  panels: number;
  className?: string;
  label: string;
  /** Optional persistent strip inside the sticky viewport (index, progress). */
  rail?: ReactNode;
}>) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 64rem)");
    const apply = () => setWide(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${((panels - 1) / panels) * 100}%`]);
  const smooth = useSpring(x, { stiffness: 120, damping: 30, mass: 0.6 });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.6 });
  const horizontal = wide && !reduced;
  return (
    <section
      aria-label={label}
      className={`horizontal-story ${className ?? ""}`.trim()}
      data-mode={horizontal ? "horizontal" : "vertical"}
      ref={ref}
      style={horizontal ? { height: `${panels * 72}vh` } : undefined}
    >
      <div className="horizontal-story-viewport">
        <motion.div
          className="horizontal-story-track"
          style={horizontal ? { x: smooth, width: `${panels * 100}%` } : {}}
        >
          {children}
        </motion.div>
        {rail ? (
          <div aria-hidden="true" className="horizontal-story-rail">
            {rail}
            <motion.span
              className="horizontal-story-progress"
              style={horizontal ? { scaleX: progress } : { scaleX: 1 }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
