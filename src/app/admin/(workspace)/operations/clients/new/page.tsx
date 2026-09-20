import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PageHeader } from "@/components/admin/ui/page-header";
import { CreateClientForm } from "@/features/clients/components/create-client-form";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New client | RENZ Administration",
  robots: { index: false, follow: false },
};

export default async function NewClientPage() {
  await requirePermission("clients.write");
  return (
    <main className="workspace-page" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/operations/clients", label: "Clients" },
          { label: "New client" },
        ]}
      />
      <PageHeader
        description="Full name, and at least one of email or phone, are required. Everything else is optional."
        eyebrow="Clients"
        title="Create client"
      />
      <CreateClientForm />
    </main>
  );
}
