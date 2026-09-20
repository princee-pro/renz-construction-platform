import { notFound, redirect } from "next/navigation";

import { loadWebsitePages } from "@/features/website/data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/** Shortcut to the footer content editor (a global page). */
export default async function WebsiteFooterPage() {
  await requirePermission("website.read");
  const pages = await loadWebsitePages();
  const page = pages.find((entry) => entry.page_key === "footer");
  if (!page) notFound();
  redirect(`/admin/website/pages/${page.id}`);
}
