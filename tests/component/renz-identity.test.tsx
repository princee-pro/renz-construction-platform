import { cleanup, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, describe, expect, it } from "vitest";

import { RenzIdentity } from "../../src/components/site/renz-identity";

afterEach(cleanup);

describe("Approved RENZ identity", () => {
  it("names a standalone symbol and reserves its image dimensions", () => {
    render(<RenzIdentity size={40} />);
    const identity = screen.getByRole("img", { name: "RENZ Construction" });
    const image = identity.querySelector("img")!;
    expect(image.getAttribute("src")).toBe("/media/brand/renz-construction-icon.svg");
    expect(image.getAttribute("width")).toBe("303");
    expect(image.getAttribute("height")).toBe("298");
    expect(image.getAttribute("loading")).toBe("eager");
    expect(image.hasAttribute("srcset")).toBe(false);
  });

  it("does not repeat a named home link to assistive technology", () => {
    render(
      <Link href="/" aria-label="RENZ home">
        <RenzIdentity decorative tone="dark" wordmark />
      </Link>,
    );
    expect(screen.getByRole("link", { name: "RENZ home" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("exposes one accessible name for the compact outlined wordmark", () => {
    render(<RenzIdentity wordmark />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(
      screen.getByRole("img", { name: "RENZ Construction" }).querySelectorAll("img"),
    ).toHaveLength(2);
  });

  it("uses the full reference composition on the opening and loading screens", () => {
    render(<RenzIdentity stacked size={600} tone="dark" />);
    const identity = screen.getByRole("img", { name: "RENZ Construction" });
    expect(identity.querySelector("img")?.getAttribute("src")).toBe(
      "/media/brand/renz-construction.svg",
    );
    expect(identity.className).toContain("renz-identity--stacked");
  });
});
