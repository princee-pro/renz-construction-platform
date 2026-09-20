import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { MaterialForm } from "@/features/procurement/components/material-form";
import { loadMaterialDetail } from "@/features/procurement/procurement-data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit material | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function EditMaterialPage({
  params,
}: PageProps<"/admin/procurement/materials/[materialId]/edit">) {
  await requirePermission("procurement.materials.write");
  const route = await params;
  const parsed = idSchema.safeParse(route.materialId);
  if (!parsed.success) notFound();
  const detail = await loadMaterialDetail(parsed.data);
  if (!detail) notFound();
  const material = detail.material;
  if (material.archived_at) redirect(`/admin/procurement/materials/${material.id}`);

  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/materials", label: "Materials" },
          { href: `/admin/procurement/materials/${material.id}`, label: material.name },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        description="Catalog details only. Existing requirements and order lines keep the values they were created with."
        eyebrow="Procurement"
        title={`Edit ${material.name}`}
      />
      <MaterialForm
        initial={{
          name: material.name,
          unit: material.default_unit,
          code: material.internal_code ?? "",
          category: material.category ?? "",
          specification: material.specification ?? "",
          supplierId: material.preferred_supplier?.id ?? "",
          supplierLabel: material.preferred_supplier?.display_name ?? "",
          active: material.active,
        }}
        materialId={material.id}
        mode="edit"
        version={material.version}
      />
    </main>
  );
}
