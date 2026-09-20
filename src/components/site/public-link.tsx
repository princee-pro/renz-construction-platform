import Link from "next/link";

import { ArrowMark } from "@/components/site/arrow-mark";

type PublicLinkProps = Readonly<{
  href: string;
  children: string;
  tone?: "gold" | "light" | "quiet";
  /** C9 first-party analytics CTA key (fixed vocabulary; never the destination). */
  analyticsCta?:
    "start_project" | "service_enquiry" | "view_project" | "contact" | "material_enquiry";
}>;

export function PublicLink({ href, children, tone = "gold", analyticsCta }: PublicLinkProps) {
  return (
    <Link
      className={`public-link public-link-${tone}`}
      href={href}
      {...(analyticsCta ? { "data-analytics-cta": analyticsCta } : {})}
    >
      <span>{children}</span>
      <ArrowMark />
    </Link>
  );
}
