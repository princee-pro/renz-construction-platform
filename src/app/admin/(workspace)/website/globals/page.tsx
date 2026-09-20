import { notFound, redirect } from "next/navigation";

import { loadWebsitePages } from "@/features/website/data";
import { requirePermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

/** Shortcut to the globals content editor (a global page). */
export default async function WebsiteGlobalsPage() {
  await requirePermission("website.read");
  const pages = await loadWebsitePages();
  const page = pages.find((entry) => entry.page_key === "globals");
  if (!page) notFound();
  redirect(`/admin/website/pages/${page.id}`);
}
