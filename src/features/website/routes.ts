/**
 * Reserved public routes (CR1 §12). Mirrors private.website_reserved_slugs()
 * in the database so the renderer and the editor refuse the same addresses.
 */
export const reservedSlugs: readonly string[] = [
  "admin",
  "api",
  "services",
  "projects",
  "insights",
  "about",
  "contact",
  "start-a-project",
  "enquire",
  "privacy",
  "terms",
  "cookies",
  "i",
  "po",
  "brand-study",
  "expertise",
  "media",
  "preview",
  "assets",
  "static",
  "fonts",
  "images",
  "icons",
  "sitemap",
  "robots",
  "favicon",
  "manifest",
  "opengraph-image",
  "twitter-image",
  "icon",
  "apple-icon",
  "sign-in",
  "login",
  "logout",
  "search",
  "feed",
  "rss",
  "share",
  "invoice",
  "invoices",
  "order",
  "orders",
  "lead",
  "leads",
  "client",
  "clients",
  "staff",
  "settings",
  "analytics",
  "notifications",
  "null",
  "undefined",
  "index",
  "home",
  "page",
  "pages",
  "website",
  "globals",
  "footer",
];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function isAdmittedCustomSlug(candidate: string): boolean {
  return (
    slugPattern.test(candidate) &&
    candidate.length >= 2 &&
    candidate.length <= 80 &&
    !candidate.includes(".") &&
    !candidate.startsWith("_") &&
    !reservedSlugs.includes(candidate)
  );
}

/** Turns a title into a safe slug suggestion. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
}
