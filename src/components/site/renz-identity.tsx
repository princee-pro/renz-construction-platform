import Image from "next/image";
import type { CSSProperties } from "react";

import { RENZ_LOGO } from "@/lib/site/brand";

type RenzIdentityProps = Readonly<{
  size?: number;
  wordmark?: boolean;
  stacked?: boolean;
  decorative?: boolean;
  tone?: "light" | "dark" | "mono";
  className?: string;
}>;

/** Shared approved orange artwork; compact navigation and full reference lockup. */
export function RenzIdentity({
  size = 48,
  wordmark = false,
  stacked = false,
  decorative = false,
  tone = "light",
  className,
}: RenzIdentityProps) {
  const source = stacked ? RENZ_LOGO.src : RENZ_LOGO.icon;
  const style = {
    "--renz-symbol-size": `${size}px`,
    "--renz-symbol-url": `url("${source}")`,
    "--renz-wordmark-url": `url("${RENZ_LOGO.wordmark}")`,
  } as CSSProperties;

  return (
    <span
      className={[
        "renz-identity",
        `renz-identity--${tone}`,
        stacked && "renz-identity--stacked",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : RENZ_LOGO.alt}
      aria-hidden={decorative ? true : undefined}
      data-size={size}
      style={style}
    >
      <span className="renz-symbol">
        <Image
          alt=""
          aria-hidden="true"
          className="renz-symbol-image"
          height={stacked ? 306 : 298}
          loading="eager"
          src={source}
          unoptimized
          width={stacked ? 1183 : 303}
        />
      </span>
      {wordmark && !stacked ? (
        <span className="renz-wordmark" aria-hidden="true">
          <Image
            alt=""
            src={RENZ_LOGO.wordmark}
            width={842}
            height={237}
            loading="eager"
            unoptimized
          />
        </span>
      ) : null}
    </span>
  );
}
