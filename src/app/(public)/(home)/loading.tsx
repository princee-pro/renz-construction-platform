import { RenzIdentity } from "@/components/site/renz-identity";

export default function PublicLoading() {
  return (
    <main id="main-content" className="public-loading" aria-busy="true" aria-live="polite">
      <RenzIdentity size={920} tone="light" stacked />
      <p>Loading</p>
    </main>
  );
}
