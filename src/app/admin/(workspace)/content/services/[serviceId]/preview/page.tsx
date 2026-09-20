import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { ServicePreview } from "@/features/services/components/service-preview";
import { loadServiceDetail } from "@/features/services/service-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private service preview | RENZ Administration",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

const serviceIdSchema = z.string().uuid();

export default async function ServicePreviewPage({
  params,
  searchParams,
}: PageProps<"/admin/content/services/[serviceId]/preview">) {
  await requirePermission("content.read");
  const route = await params;
  const id = serviceIdSchema.safeParse(route.serviceId);
  if (!id.success) notFound();
  const query = await searchParams;
  const rawLocale = query["locale"];
  const localeCandidate = Array.isArray(rawLocale) ? rawLocale[0] : rawLocale;
  const locale =
    localeCandidate && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(localeCandidate)
      ? localeCandidate
      : "en";
  const detail = await loadServiceDetail(id.data, locale);
  if (!detail || !detail.localization) notFound();

  return (
    <main className="workspace-page workspace-page-preview" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/content/services", label: "Services" },
          {
            href: `/admin/content/services/${detail.service.id}?locale=${encodeURIComponent(locale)}`,
            label: detail.localization.name,
          },
          { label: "Private preview" },
        ]}
      />
      <div className="preview-toolbar">
        <Link
          className="button button-secondary"
          href={`/admin/content/services/${detail.service.id}?locale=${encodeURIComponent(locale)}`}
        >
          Return to editor
        </Link>
      </div>
      <ServicePreview detail={{ ...detail, localization: detail.localization }} />
    </main>
  );
}
