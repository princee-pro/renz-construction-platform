import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="workspace-page" id="main-content">
      <section className="empty-state">
        <p className="eyebrow">Not found</p>
        <h1>This administration record is unavailable</h1>
        <p>
          The identifier may be malformed, the record may not exist, or the requested localization
          may be unavailable.
        </p>
        <Link className="button button-primary" href="/admin/content/services">
          Return to Services
        </Link>
      </section>
    </main>
  );
}
