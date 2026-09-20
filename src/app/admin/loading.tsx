export default function AdminLoading() {
  return (
    <main className="admin-page" id="main-content">
      <section aria-busy="true" aria-labelledby="admin-loading-heading" className="admin-panel">
        <p className="eyebrow">Administration</p>
        <h1 id="admin-loading-heading">Loading secure workspace…</h1>
      </section>
    </main>
  );
}
