import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { MaterialForm, emptyMaterialForm } from "@/features/procurement/components/material-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New material | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewMaterialPage() {
  await requirePermission("procurement.materials.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/materials", label: "Materials" },
          { label: "New material" },
        ]}
      />
      <PageHeader
        description="A catalog entry is reusable across projects. Give it the unit you buy it in; project requirements can still override the unit."
        eyebrow="Procurement"
        title="New material"
      />
      <MaterialForm initial={emptyMaterialForm} mode="create" />
    </main>
  );
}
