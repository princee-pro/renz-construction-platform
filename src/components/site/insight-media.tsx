import Image from "next/image";

const insightMedia = [
  {
    src: "/media/renz-preview/projects/ridge-residence/hero.webp",
    position: "50% 54%",
  },
  {
    src: "/media/renz-preview/projects/urban-workspace/detail-crop.webp",
    position: "50% 48%",
  },
  {
    src: "/media/renz-preview/projects/musanze-highlands-lodge/interior.webp",
    position: "54% 52%",
  },
] as const;

function mediaFor(seed: string, offset = 0) {
  const score = [...seed].reduce((total, character) => total + character.codePointAt(0)!, 0);
  return insightMedia[(score + offset) % insightMedia.length] ?? insightMedia[0];
}

/**
 * Editorial atmosphere for Insights. These images are generated concept
 * studies, never project evidence, so every visible use carries the label.
 */
export function InsightMedia({
  seed,
  offset = 0,
  className,
}: Readonly<{ seed: string; offset?: number; className?: string }>) {
  const media = mediaFor(seed, offset);
  return (
    <figure className={`insight-media${className ? ` ${className}` : ""}`}>
      <Image
        alt=""
        fill
        priority={offset === 0}
        sizes="(max-width: 64rem) 100vw, 50vw"
        src={media.src}
        style={{ objectPosition: media.position }}
      />
      <span aria-hidden="true" className="insight-media-grid" />
      <figcaption>Concept visual / not project evidence</figcaption>
    </figure>
  );
}
