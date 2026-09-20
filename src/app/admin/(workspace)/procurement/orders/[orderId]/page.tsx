import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Breadcrumbs } from "@/components/admin/ui/breadcrumbs";
import { PurchaseOrderCommandCenter } from "@/features/procurement/components/po-command-center";
import { loadPoDetail } from "@/features/procurement/procurement-data";
import { getCurrentAdminAccess } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchase order | RENZ Administration",
  robots: { index: false, follow: false },
};

const idSchema = z.string().uuid();

export default async function PurchaseOrderPage({
  params,
}: PageProps<"/admin/procurement/orders/[orderId]">) {
  await requirePermission("procurement.orders.read");
  const route = await params;
  const parsed = idSchema.safeParse(route.orderId);
  if (!parsed.success) notFound();
  const [detail, access] = await Promise.all([loadPoDetail(parsed.data), getCurrentAdminAccess()]);
  if (!detail) notFound();

  return (
    <main className="workspace-page workspace-page-wide" id="main-content">
      <Breadcrumbs
        items={[
          { href: "/admin", label: "Overview" },
          { href: "/admin/procurement/orders", label: "Purchase Orders" },
          { label: detail.purchase_order.purchase_order_number ?? "Draft" },
        ]}
      />
      <PurchaseOrderCommandCenter
        detail={detail}
        permissions={{
          write: access.permissions.includes("procurement.orders.write"),
          issue: access.permissions.includes("procurement.orders.issue"),
          receipts: access.permissions.includes("procurement.receipts.write"),
        }}
      />
    </main>
  );
}
