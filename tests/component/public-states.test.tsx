import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ImageProps } from "next/image";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt }: ImageProps) => <span aria-label={alt} role="img" />,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/public-server", () => ({ createPublicSupabaseClient: () => null }));

import PublicError from "../../src/app/(public)/error";
import PublicLoading from "../../src/app/(public)/(home)/loading";
import { PreviewRenzIdentity } from "../../src/components/site/preview-renz-identity";
import { WebsitePage } from "../../src/components/site/sections/render-page";
import { conceptProject, renderContext, section, snapshot } from "./website-fixtures";

// jsdom has neither media queries nor intersection observers; the motion
// primitives guard both, but React still calls them during mount.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(window, "IntersectionObserver", { writable: true, value: ObserverStub });
Object.defineProperty(window, "ResizeObserver", { writable: true, value: ObserverStub });

afterEach(cleanup);

/** The home page as the owner-managed snapshot renders it (CR1). */
const homeSnapshot = snapshot([
  section("hero", {
    kicker: "Architecture-led construction",
    headline_lines: ["Brick", "by Brick"],
    summary: "RENZ designs, builds and supervises buildings.",
    primary_cta: null,
    secondary_cta: null,
    media_id: null,
    register: [],
  }),
  section("service_showcase", {
    kicker: "Services",
    heading: "{{services.count_words}} ways to work with RENZ.",
    intro: null,
    link_label: "All services",
    mode: "compact",
  }),
  section("project_showcase", {
    kicker: "Projects",
    heading: "Selected work",
    intro: null,
    link_label: "All projects",
    mode: "home",
    limit: 4,
  }),
  section("insight_feed", {
    kicker: "Insights",
    heading: "Insights",
    link_label: "All insights",
    limit: 3,
  }),
  section("testimonial", { kicker: "Clients", heading: "Approved client feedback" }),
]);

describe("Public experience states", () => {
  it("renders one semantic main landmark and one text-first public heading", () => {
    render(<WebsitePage context={renderContext()} snapshot={homeSnapshot} />);

    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { level: 1, name: "Brick by Brick" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("collapses evidence-dependent homepage modules when nothing is published", () => {
    render(<WebsitePage context={renderContext()} snapshot={homeSnapshot} />);

    expect(screen.queryByRole("heading", { name: /Selected work/iu })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Concept stud/iu })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Insights/iu })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Approved client feedback/iu })).toBeNull();
    expect(screen.queryByText(/Concept study/iu)).toBeNull();
  });

  it("labels every concept study as a study, never delivered RENZ work", () => {
    render(
      <WebsitePage
        context={renderContext({ projects: [conceptProject()] })}
        snapshot={homeSnapshot}
      />,
    );

    expect(screen.getAllByText(/Concept study/iu).length).toBeGreaterThan(0);
    expect(screen.queryByText(/completed project|delivered by RENZ|our client/iu)).toBeNull();
  });

  it("uses clearly labelled published media to complete an unassigned preview hero", () => {
    const project = conceptProject();
    render(
      <WebsitePage
        context={renderContext({ previewEnabled: true, projects: [project] })}
        snapshot={homeSnapshot}
      />,
    );

    expect(
      screen.getAllByRole("img", {
        name: "Generated concept study; not RENZ project evidence",
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Concept visual / not project evidence")).toBeTruthy();
  });

  it("never renders placeholder testimonial or credential trust modules (C3.5)", () => {
    render(
      <WebsitePage
        context={renderContext({ projects: [conceptProject()] })}
        snapshot={homeSnapshot}
      />,
    );

    // Fabricated-trust placeholders ("Approved client feedback will appear...",
    // "Verified profiles will appear here...") must never render — real
    // testimonials/credentials only appear once Admin publishes them, and the
    // preview home experience must not fill the gap with fake social proof.
    expect(screen.queryByText(/Approved client feedback will appear/iu)).toBeNull();
    expect(screen.queryByText(/Verified profiles.*will appear/iu)).toBeNull();
    expect(screen.queryByText(/Sample — not published content/iu)).toBeNull();
    expect(screen.getAllByText(/Concept study/iu).length).toBeGreaterThan(0);
  });

  it("renders the datum mark at every required small size without losing the label", () => {
    const sizes = [16, 24, 32, 40, 48] as const;
    const { container } = render(
      <>
        {sizes.map((size) => (
          <PreviewRenzIdentity key={size} size={size} tone="light" />
        ))}
      </>,
    );

    for (const size of sizes) {
      expect(container.querySelector(`[data-size="${size}"]`)).toBeTruthy();
    }
    expect(container.querySelectorAll("[data-mark-option]")).toHaveLength(sizes.length);
  });

  it("exposes an honest loading state", () => {
    render(<PublicLoading />);

    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading")).toBeTruthy();
    expect(screen.getByRole("img", { name: "RENZ Construction" })).toBeTruthy();
  });

  it("provides an accessible route-recovery control", () => {
    const reset = vi.fn();
    render(<PublicError reset={reset} />);

    const retryButton = screen.getByRole("button", { name: "Try again" });
    expect(retryButton.getAttribute("type")).toBe("button");
    fireEvent.click(retryButton);
    expect(reset).toHaveBeenCalledOnce();
  });
});
