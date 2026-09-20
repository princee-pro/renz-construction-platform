import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ContentRevisionsPanel } from "@/features/content-revisions/components/content-revisions-panel";
import { loadContentRevisions } from "@/features/content-revisions/revision-data";
import { ServiceDetailsForm } from "@/features/services/components/service-details-form";
import { ServiceEditor } from "@/features/services/components/service-editor";
import { loadAuditActivity, loadServiceDetail } from "@/features/services/service-data";
import { loadServiceDetails } from "@/features/services/service-details";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Service editor | RENZ Administration",
  robots: { index: false, follow: false },
};

const serviceIdSchema = z.string().uuid();

function localeFrom(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(candidate) ? candidate : "en";
}

export default async function ServiceEditorPage({
  params,
  searchParams,
}: PageProps<"/admin/content/services/[serviceId]">) {
  await requirePermission("content.read");
  const route = await params;
  const parsedId = serviceIdSchema.safeParse(route.serviceId);
  if (!parsedId.success) notFound();
  const query = await searchParams;
  const locale = localeFrom(query["locale"]);
  const [detail, access, activity, details, revisions] = await Promise.all([
    loadServiceDetail(parsedId.data, locale),
    getCurrentAdminAccess(),
    loadAuditActivity({ entityId: parsedId.data, limit: 12 }),
    loadServiceDetails(parsedId.data),
    loadContentRevisions("service", parsedId.data),
  ]);
  if (!detail || !detail.localization) notFound();
  const typedDetail = { ...detail, localization: detail.localization };

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/content/services", label: "Services" },
          { label: detail.localization.name },
        ]}
      />
      <PageHeader
        actions={
          <Link className="button button-secondary" href="/admin/content/services">
            Back to register
          </Link>
        }
        description="Edit the service, preview it, then publish. A published service stays online while you work; changes go live when you publish them."
        eyebrow="Service editor"
        title={detail.localization.name}
      />
      <ServiceEditor
        canArchive={access.permissions.includes("content.archive")}
        canPublish={access.permissions.includes("content.publish")}
        canVerify={access.permissions.includes("claims.verify")}
        canWrite={access.permissions.includes("content.write")}
        detail={typedDetail}
        detailsPanel={
          details ? (
            <ServiceDetailsForm
              canWrite={
                access.permissions.includes("content.write") &&
                detail.service.publication_status !== "archived"
              }
              details={details}
              serviceId={detail.service.id}
            />
          ) : null
        }
        revisionsPanel={
          <ContentRevisionsPanel
            canPublish={access.permissions.includes("content.publish")}
            contentType="service"
            ready={detail.readiness.ready}
            revisions={revisions}
            status={detail.service.publication_status}
            targetId={detail.service.id}
            version={detail.service.version}
          />
        }
      />

      <section
        aria-labelledby="service-activity-heading"
        className="activity-section service-activity"
      >
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Redacted audit trail</p>
            <h2 id="service-activity-heading">Service activity</h2>
          </div>
        </div>
        {activity.length > 0 ? (
          <ol className="activity-list">
            {activity.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.action.replaceAll(".", " · ")}</strong>
                  <span>{item.outcome}</span>
                </div>
                <time dateTime={item.occurredAt}>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(item.occurredAt))}{" "}
                  UTC
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="quiet-empty">No service activity is available yet.</p>
        )}
      </section>
    </main>
  );
}
