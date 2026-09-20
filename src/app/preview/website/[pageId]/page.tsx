import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { GridOverlay } from "@/components/site/grid-overlay";
import { MotionPreference } from "@/components/site/motion-preference";
import { PublicFooter } from "@/components/site/public-footer";
import { PublicHeader } from "@/components/site/public-header";
import { PreviewBar } from "@/components/site/preview-bar";
import { WebsitePage } from "@/components/site/sections/render-page";
import { loadWebsiteRevision } from "@/features/website/data";
import { loadDraftPage, loadRevisionPage } from "@/features/website/render";
import { interpolate } from "@/features/website/tokens";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft preview | RENZ",
  robots: { index: false, follow: false, nocache: true },
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Staff draft preview (CR1 §26–27, §67): the DRAFT (or a chosen revision)
 * rendered with the REAL public component system inside the real header and
 * footer, plus a slim Admin-only bar. Requires an authorized staff session;
 * anonymous visitors never reach it and public HTML never includes it.
 */
export default async function WebsitePreviewPage({
  params,
  searchParams,
}: PageProps<"/preview/website/[pageId]">) {
  await requirePermission("website.read");
  const [{ pageId }, query] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(pageId).success) notFound();
  const revisionId = first(query["revision"]);
  const revision = z.string().uuid().safeParse(revisionId).success
    ? await loadWebsiteRevision(revisionId)
    : null;
  const render =
    revision && revision.page_id === pageId
      ? await loadRevisionPage(revision)
      : await loadDraftPage(pageId);
  if (!render) notFound();
  const { context, snapshot } = render;
  const whatsappMessage = interpolate(context.globals.copy.whatsapp_message, context.tokens);
  return (
    <div className="public-site public-site-preview" id="site-top">
      <MotionPreference />
      <GridOverlay />
      <PreviewBar
        editHref={`/admin/website/pages/${pageId}`}
        pageTitle={snapshot.page.title}
        publishedHref={snapshot.page.page_type === "global" ? null : snapshot.page.path}
        revisionNo={revision?.revision_no ?? null}
        status={snapshot.status ?? "draft"}
      />
      <PublicHeader
        copy={{
          whatsappLabel: context.globals.copy.whatsapp_cta_label,
          menuTagline: context.globals.copy.menu_tagline,
          allServicesLabel: context.globals.copy.all_services_label,
          staffLoginLabel: context.globals.copy.staff_signin_label,
          whatsappMessage,
        }}
        identity={context.identity}
        projectServiceLinks={context.projectServiceLinks}
        projects={context.projects}
        services={context.services}
      />
      <WebsitePage context={context} snapshot={snapshot} />
      <PublicFooter
        copy={{
          whatsappMessage,
          kicker: context.globals.footer.kicker
            ? interpolate(context.globals.footer.kicker, context.tokens)
            : null,
        }}
        globals={context.globals}
        identity={context.identity}
        previewEnabled={context.previewEnabled}
        services={context.services}
      />
      <FloatingWhatsApp
        digits={context.identity.whatsappDigits}
        label={context.globals.copy.floating_whatsapp_label}
        message={whatsappMessage}
        shortName={context.identity.shortName}
      />
    </div>
  );
}
