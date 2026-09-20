"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Reveal } from "@/components/motion/primitives";

import { isApiMediaSrc } from "@/lib/media/public-src";

export type NarrativeChapter = Readonly<{
  index: string;
  key: string;
  title: string;
  copy: string;
  /** Optional media moment rendered after the chapter. */
  moment?: ReactNode;
}>;

/**
 * Sticky project narrative (D1 §33): a chapter index and a sticky media
 * plane on wide viewports, a linear story on mobile. Normal scrolling is
 * authoritative; the observer only records which chapter is being read so
 * the index and the media framing follow. No scroll hijack.
 */
export type NarrativePlane = Readonly<{
  src: string;
  alt: string;
  caption: string | null;
  /** Diagrams are shown whole (contain); photographs fill the plane (cover). */
  fit?: "cover" | "contain";
}>;

export function ChapterNarrative({
  chapters,
  image,
  imageAlt,
  provenance,
  framing,
  planes,
}: Readonly<{
  chapters: readonly NarrativeChapter[];
  image: string;
  imageAlt: string;
  provenance: string;
  /** object-position per chapter so the sticky plane "reads" the image. */
  framing: readonly string[];
  /** D1.7: an optional gallery image per chapter for the sticky plane (null → the hero). */
  planes?: readonly (NarrativePlane | null)[];
}>) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const hero: NarrativePlane = { src: image, alt: imageAlt, caption: null };
  const activePlane = planes?.[active] ?? hero;
  const distinctPlanes = [
    hero,
    ...(planes ?? []).filter((plane): plane is NarrativePlane => plane !== null),
  ].filter((plane, index, list) => list.findIndex((other) => other.src === plane.src) === index);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number((visible.target as HTMLElement).dataset["chapter"] ?? "0");
        setActive((current) => (current === index ? current : index));
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const element of refs.current) if (element) observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="narrative">
      <nav aria-label="Case-study chapters" className="narrative-index">
        <ol>
          {chapters.map((chapter, index) => (
            <li key={chapter.key}>
              <a
                aria-current={index === active ? "step" : undefined}
                href={`#chapter-${chapter.key}`}
              >
                <span className="index-mark">{chapter.index}</span>
                <span>{chapter.title}</span>
              </a>
            </li>
          ))}
        </ol>
        <span
          aria-hidden="true"
          className="narrative-index-datum"
          style={{ transform: `translateY(${active * 100}%)`, height: `${100 / chapters.length}%` }}
        />
      </nav>

      <div className="narrative-chapters">
        {chapters.map((chapter, index) => (
          <div key={chapter.key}>
            <Reveal
              amount={0.15}
              as="section"
              className="project-story-chapter"
              id={`chapter-${chapter.key}`}
              variant="rise"
            >
              <div
                data-chapter={index}
                ref={(element) => {
                  refs.current[index] = element;
                }}
              >
                <p className="kicker">
                  {chapter.index} / {chapter.title}
                </p>
                <h2>{chapter.title}</h2>
                <p className="narrative-copy">{chapter.copy}</p>
              </div>
            </Reveal>
            {chapter.moment ? <div className="narrative-moment">{chapter.moment}</div> : null}
          </div>
        ))}
      </div>

      <figure className="narrative-media" data-active={active}>
        <div className="narrative-media-frame">
          {distinctPlanes.map((plane) => (
            <Image
              alt={plane.alt}
              className="narrative-plane"
              data-active={plane.src === activePlane.src ? "true" : "false"}
              data-fit={plane.fit ?? "cover"}
              fill
              key={plane.src}
              loading={plane.src === image ? "eager" : "lazy"}
              quality={86}
              sizes="(max-width: 1024px) 100vw, 40vw"
              src={plane.src}
              unoptimized={isApiMediaSrc(plane.src)}
              style={{
                objectPosition: plane.src === image ? (framing[active] ?? "50% 50%") : "50% 50%",
              }}
            />
          ))}
        </div>
        <figcaption>
          <span className="datum-label">
            {chapters[active]?.index} / {chapters[active]?.title}
            {activePlane.caption ? ` · ${activePlane.caption}` : ""}
          </span>
          <span className="concept-badge">{provenance}</span>
        </figcaption>
      </figure>
    </div>
  );
}
