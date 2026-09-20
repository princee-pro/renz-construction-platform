export default function PublicLoading() {
  return (
    <main id="main-content" className="public-loading" aria-busy="true" aria-live="polite">
      <div className="public-loading-frame" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>Assembling published content</p>
    </main>
  );
}
