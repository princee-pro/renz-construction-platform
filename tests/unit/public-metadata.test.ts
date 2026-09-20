import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/public-server", () => ({ createPublicSupabaseClient: () => null }));

import { createPublicMetadata, robotsFor } from "@/lib/seo/public-metadata";
import { siteIdentityFrom } from "@/lib/site/public-configuration";

describe("public metadata by site mode", () => {
  it("keeps every public route out of search indexes while the site is in preview", async () => {
    const metadata = await createPublicMetadata({
      title: "Synthetic public title",
      description: "Synthetic public description",
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: false, nocache: true });
    expect(metadata.alternates).toBeUndefined();
  });

  it("includes a canonical only when editorial data provides one", async () => {
    const metadata = await createPublicMetadata({
      title: "Synthetic canonical title",
      description: "Synthetic canonical description",
      canonical: "https://example.test/synthetic",
    });
    expect(metadata.alternates).toEqual({ canonical: "https://example.test/synthetic" });
  });

  it("allows indexing only when the published configuration says live", () => {
    expect(robotsFor(siteIdentityFrom({ site_mode: "preview" }))).toMatchObject({ index: false });
    expect(robotsFor(siteIdentityFrom({ site_mode: "live" }))).toMatchObject({ index: true });
  });
});
