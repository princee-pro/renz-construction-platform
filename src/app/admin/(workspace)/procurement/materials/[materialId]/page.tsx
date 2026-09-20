import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { Material360 } from "@/features/procurement/components/material-360";
import { loadMaterialDetail } from "@/features/procurement/procurement-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Material | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function MaterialPage({
  params,
}: PageProps<"/admin/procurement/materials/[materialId]">) {
  await requirePermission("procurement.materials.read");
  const route = await params;
  const parsed = idSchema.safeParse(route.materialId);
  if (!parsed.success) notFound();
  const [detail, access] = await Promise.all([
    loadMaterialDetail(parsed.data),
    getCurrentAdminAccess(),
  ]);
  if (!detail) notFound();

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/materials", label: "Materials" },
          { label: detail.material.name },
        ]}
      />
      <Material360
        canWrite={access.permissions.includes("procurement.materials.write")}
        detail={detail}
      />
    </main>
  );
}
