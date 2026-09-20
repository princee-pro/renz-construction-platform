import "server-only";

import { cache } from "react";

import {
  globalCopyDefaults,
  pageDetailSchema,
  pageListItemSchema,
  pageSnapshotSchema,
  processStepSchema,
  publicPageListSchema,
  revisionDetailSchema,
  sitemapRowSchema,
  websiteOverviewSchema,
  type FooterGroup,
  type FooterOptions,
  type GlobalCopy,
  type PageDetail,
  type PageListItem,
  type PageSnapshot,
  type RevisionDetail,
  type SitemapRow,
  type WebsiteGlobals,
  type WebsiteOverview,
} from "@/features/website/contracts";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

// ---------------------------------------------------------------------
// Public (anonymous) reads — the published revision only
// ---------------------------------------------------------------------

/**
 * One RPC per page per request, memoized across the request. No persistent
 * cache sits in front of it: a publish is visible on the next request.
 */
export const getPublicWebsitePage = cache(async (path: string): Promise<PageSnapshot | null> => {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc("public_website_page", { target_path: path });
  if (error || data === null) return null;
  const parsed = pageSnapshotSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
});

const defaultFooter: FooterOptions = {
  kicker: null,
  headline: "A clear first line changes everything that follows.",
  statement: null,
  services_label: "Services",
  company_label: "Company",
  contact_label: "Contact",
  show_services: true,
  show_company: true,
  show_contact: true,
  show_location: true,
  show_hours: true,
  show_social: true,
  show_legal: true,
  show_staff_signin: true,
  show_back_to_top: true,
  cta: null,
};

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sectionConfig(snapshot: PageSnapshot | null, type: string): Record<string, unknown> {
  return snapshot?.sections.find((section) => section.type === type)?.config ?? {};
}

export function globalsFromSnapshots(
  globals: PageSnapshot | null,
  footer: PageSnapshot | null,
): WebsiteGlobals {
  const copyConfig = sectionConfig(globals, "global_copy");
  const copy = Object.fromEntries(
    Object.entries(globalCopyDefaults).map(([key, fallback]) => [
      key,
      stringOr(copyConfig[key], fallback),
    ]),
  ) as GlobalCopy;
  const stepsConfig = sectionConfig(globals, "process_steps");
  const steps = z.array(processStepSchema).safeParse(stepsConfig["steps"]);
  const footerConfig = sectionConfig(footer, "footer_options");
  const ctaValue = footerConfig["cta"];
  const cta =
    typeof ctaValue === "object" &&
    ctaValue !== null &&
    typeof (ctaValue as { label?: unknown }).label === "string"
      ? {
          label: (ctaValue as { label: string }).label,
          destination_type: stringOr(
            (ctaValue as { destination_type?: unknown }).destination_type,
            "start_project",
          ),
          destination: nullableString((ctaValue as { destination?: unknown }).destination),
        }
      : null;
  const footerOptions: FooterOptions = {
    kicker: nullableString(footerConfig["kicker"]),
    headline: stringOr(footerConfig["headline"], defaultFooter.headline),
    statement: nullableString(footerConfig["statement"]),
    services_label: stringOr(footerConfig["services_label"], defaultFooter.services_label),
    company_label: stringOr(footerConfig["company_label"], defaultFooter.company_label),
    contact_label: stringOr(footerConfig["contact_label"], defaultFooter.contact_label),
    show_services: booleanOr(footerConfig["show_services"], true),
    show_company: booleanOr(footerConfig["show_company"], true),
    show_contact: booleanOr(footerConfig["show_contact"], true),
    show_location: booleanOr(footerConfig["show_location"], true),
    show_hours: booleanOr(footerConfig["show_hours"], true),
    show_social: booleanOr(footerConfig["show_social"], true),
    show_legal: booleanOr(footerConfig["show_legal"], true),
    show_staff_signin: booleanOr(footerConfig["show_staff_signin"], true),
    show_back_to_top: booleanOr(footerConfig["show_back_to_top"], true),
    cta,
  };
  const groupsConfig = sectionConfig(footer, "footer_groups");
  const groupsParsed = z
    .array(
      z.object({
        title: z.string(),
        links: z.array(z.object({ label: z.string(), href: z.string() })).catch([]),
      }),
    )
    .safeParse(groupsConfig["groups"]);
  const footerGroups: FooterGroup[] = groupsParsed.success ? groupsParsed.data : [];
  return {
    copy,
    processSteps: steps.success ? steps.data : [],
    footer: footerOptions,
    footerGroups,
  };
}

/** Global copy, process steps and footer options from the two global pages. */
export const getWebsiteGlobals = cache(async (): Promise<WebsiteGlobals> => {
  const [globals, footer] = await Promise.all([
    getPublicWebsitePage("/_globals"),
    getPublicWebsitePage("/_footer"),
  ]);
  return globalsFromSnapshots(globals, footer);
});

/** Published, routable pages (sitemap + custom page navigation). */
export const getPublicWebsitePages = cache(async () => {
  const client = createPublicSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.rpc("public_website_pages");
  if (error || data === null) return [];
  const parsed = publicPageListSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
});

/** Old address → new address, or null. */
export const resolveRouteAlias = cache(async (path: string): Promise<string | null> => {
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc("public_website_route_alias", { source: path });
  if (error || typeof data !== "string" || data === "" || data === path) return null;
  return data;
});

// ---------------------------------------------------------------------
// Admin reads (authorized session)
// ---------------------------------------------------------------------

export async function loadWebsitePages(): Promise<readonly PageListItem[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_website_pages");
  if (error) throw new Error("Website pages could not be loaded.");
  const parsed = z.array(pageListItemSchema).safeParse(data);
  return parsed.success ? parsed.data : [];
}

export async function loadWebsitePage(pageId: string): Promise<PageDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_website_page", { target_id: pageId });
  if (error) throw new Error("The page could not be loaded.");
  if (data === null) return null;
  const parsed = pageDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function loadWebsiteRevision(revisionId: string): Promise<RevisionDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_website_page_revision", {
    target_id: revisionId,
  });
  if (error) throw new Error("The revision could not be loaded.");
  if (data === null) return null;
  const parsed = revisionDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** The draft, in the public projection shape, for staff preview. */
export async function loadWebsitePreview(pageId: string): Promise<PageSnapshot | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_preview_website_page", { target_id: pageId });
  if (error || data === null) return null;
  const parsed = pageSnapshotSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Draft globals (for previewing pages against unpublished global copy). */
export async function loadWebsiteGlobalsPreview(): Promise<WebsiteGlobals> {
  const client = await createServerSupabaseClient();
  const pages = await loadWebsitePages();
  const globalsPage = pages.find((page) => page.page_key === "globals");
  const footerPage = pages.find((page) => page.page_key === "footer");
  const [globals, footer] = await Promise.all([
    globalsPage ? client.rpc("admin_preview_website_page", { target_id: globalsPage.id }) : null,
    footerPage ? client.rpc("admin_preview_website_page", { target_id: footerPage.id }) : null,
  ]);
  const parse = (value: unknown) => {
    const parsed = pageSnapshotSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  };
  return globalsFromSnapshots(parse(globals?.data), parse(footer?.data));
}

export async function loadWebsiteOverview(): Promise<WebsiteOverview | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_website_overview");
  if (error) throw new Error("The website overview could not be loaded.");
  const parsed = websiteOverviewSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function loadWebsiteSitemap(): Promise<readonly SitemapRow[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_website_sitemap");
  if (error) throw new Error("The site map could not be loaded.");
  const parsed = z.array(sitemapRowSchema).safeParse(data);
  return parsed.success ? parsed.data : [];
}

// ---------------------------------------------------------------------
// Media metadata for rendering (alt, caption, focal point)
// ---------------------------------------------------------------------

export type WebsiteMediaMeta = Readonly<{
  id: string;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  focalX: number;
  focalY: number;
  provenanceClass: string | null;
  mimeType: string | null;
}>;

const mediaMetaSchema = z.array(
  z.object({
    id: z.string().uuid(),
    alt_text: z.string().nullable().catch(null),
    caption: z.string().nullable().catch(null),
    width: z.number().int().nullable().catch(null),
    height: z.number().int().nullable().catch(null),
    focal_x: z.number().catch(0.5),
    focal_y: z.number().catch(0.5),
    provenance_class: z.string().nullable().catch(null),
    mime_type: z.string().nullable().catch(null),
  }),
);

function mapMediaMeta(value: unknown): ReadonlyMap<string, WebsiteMediaMeta> {
  const parsed = mediaMetaSchema.safeParse(value);
  const map = new Map<string, WebsiteMediaMeta>();
  if (!parsed.success) return map;
  for (const item of parsed.data) {
    map.set(item.id, {
      id: item.id,
      altText: item.alt_text,
      caption: item.caption,
      width: item.width,
      height: item.height,
      focalX: item.focal_x,
      focalY: item.focal_y,
      provenanceClass: item.provenance_class,
      mimeType: item.mime_type,
    });
  }
  return map;
}

/** Every media id a snapshot references (section configs + social image). */
export function snapshotMediaIds(snapshot: PageSnapshot): readonly string[] {
  const ids = new Set<string>();
  const walk = (value: unknown, key: string | null): void => {
    if (typeof value === "string") {
      if (key && key.endsWith("media_id") && /^[0-9a-f-]{36}$/iu.test(value)) ids.add(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, null);
      return;
    }
    if (value && typeof value === "object") {
      for (const [entryKey, entry] of Object.entries(value)) walk(entry, entryKey);
    }
  };
  walk(snapshot.sections, null);
  if (snapshot.page.seo?.og_media_id) ids.add(snapshot.page.seo.og_media_id);
  return [...ids];
}

/** Public metadata for eligible media only (one RPC). */
export const getPublicWebsiteMedia = cache(async (ids: readonly string[]) => {
  if (ids.length === 0) return new Map<string, WebsiteMediaMeta>();
  const client = createPublicSupabaseClient();
  if (!client) return new Map<string, WebsiteMediaMeta>();
  const { data, error } = await client.rpc("public_website_media", { target_ids: [...ids] });
  if (error) return new Map<string, WebsiteMediaMeta>();
  return mapMediaMeta(data);
});

/** Staff preview metadata (draft media may not be public yet). */
export async function loadWebsiteMediaForPreview(ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, WebsiteMediaMeta>();
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_website_media", { target_ids: [...ids] });
  if (error) return new Map<string, WebsiteMediaMeta>();
  return mapMediaMeta(data);
}
