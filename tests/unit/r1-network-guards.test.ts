import { describe, expect, it } from "vitest";

import { guardAction, initialAdminActionState } from "@/features/admin-shared/action-state";
import { guardIntakeAction, initialIntakeActionState } from "@/features/intake/intake-contract";

/** R1 §49: a rejected server action becomes an inline error, never a thrown one. */
describe("R1 network guards", () => {
  it("turns an admin action network failure into an error state and keeps the result otherwise", async () => {
    const failing = guardAction<typeof initialAdminActionState>(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    );
    const result = await failing(initialAdminActionState, new FormData());
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/could not be reached/u);
    const passing = guardAction<typeof initialAdminActionState>(() =>
      Promise.resolve({ ...initialAdminActionState, status: "success", message: "Saved." }),
    );
    expect((await passing(initialAdminActionState, new FormData())).status).toBe("success");
  });

  it("turns an intake network failure into a fallback error with the WhatsApp/email hint", async () => {
    const failing = guardIntakeAction(() => Promise.reject(new TypeError("Failed to fetch")));
    const result = await failing(initialIntakeActionState, new FormData());
    expect(result.status).toBe("unavailable");
    expect(result.fallback).toBe(true);
    expect(result.reference).toBeNull();
  });
});
