import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/sign-in/actions", () => ({
  signInAction: () => undefined,
}));

import AdminError from "../../src/app/admin/error";
import { SignInForm } from "../../src/components/admin/sign-in-form";

afterEach(cleanup);

describe("S3 administrator interface states", () => {
  it("keeps staff sign-in labelled and password-manager compatible", () => {
    render(<SignInForm next="/admin" />);

    expect(
      screen.getByRole("textbox", { name: "Email address" }).getAttribute("autocomplete"),
    ).toBe("username");
    expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe("current-password");
    expect(screen.getByRole("button", { name: "Sign in" }).getAttribute("type")).toBe("submit");
  });

  it("provides a keyboard-available recovery action for admin failures", () => {
    const reset = () => undefined;
    render(<AdminError reset={reset} />);

    expect(screen.getByRole("main")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "The secure workspace is unavailable" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" }).getAttribute("type")).toBe("button");
  });
});
