import Link from "next/link";

/**
 * Admin-only preview bar (CR1 §27, §67). Rendered only on the authenticated
 * /preview route — public HTML never includes it. Offers the Edit page
 * shortcut, the published address and what is being previewed.
 */
export function PreviewBar({
  editHref,
  publishedHref,
  pageTitle,
  status,
  revisionNo,
}: Readonly<{
  editHref: string;
  publishedHref: string | null;
  pageTitle: string;
  status: string;
  revisionNo: number | null;
}>) {
  return (
    <div className="preview-bar" role="region" aria-label="Draft preview">
      <p>
        <strong>{revisionNo ? `Previewing revision ${revisionNo}` : "Previewing draft"}</strong>
        <span> · {pageTitle}</span>
        <span className="preview-bar-status">
          {" "}
          ·{" "}
          {status === "published"
            ? "Published page"
            : status === "archived"
              ? "Archived page"
              : "Not published yet"}
        </span>
      </p>
      <nav aria-label="Preview actions">
        <Link className="preview-bar-link preview-bar-edit" href={editHref}>
          Edit page
        </Link>
        {publishedHref && status === "published" ? (
          <a className="preview-bar-link" href={publishedHref} rel="noreferrer" target="_blank">
            View published
          </a>
        ) : null}
        <Link className="preview-bar-link" href="/admin/website">
          Back to Website
        </Link>
      </nav>
    </div>
  );
}
