import { redirect } from "next/navigation";

/**
 * `/services` is now the canonical public destination for the RENZ service
 * taxonomy (see docs/CLIENT_PRODUCT_EXPANSION_2026-09-05.md). `/expertise`
 * is kept only as a compatibility entry for existing links/bookmarks so
 * nothing breaks — it carries no content of its own.
 */
export default function ExpertisePage() {
  redirect("/services");
}
