import type { IntakeFormContext } from "@/components/site/intake/contact-form";
import type { SnapshotSection } from "@/features/website/contracts";
import type { WebsiteMediaMeta } from "@/features/website/data";
import type { PublicPageContext } from "@/features/website/public-context";

/** Request-specific data a system module needs (search params, the C8 form context). */
export type RouteData = Readonly<{
  searchParams: Readonly<Record<string, string | string[] | undefined>>;
  intake: IntakeFormContext | null;
}>;

export type RenderContext = PublicPageContext &
  Readonly<{
    media: ReadonlyMap<string, WebsiteMediaMeta>;
    route: RouteData;
    /** The page being rendered (system pages derive their landing concept from it). */
    pageKey: string | null;
  }>;

export type SectionRenderProps = Readonly<{
  /** Section with its configuration already token-interpolated. */
  section: SnapshotSection;
  context: RenderContext;
}>;
