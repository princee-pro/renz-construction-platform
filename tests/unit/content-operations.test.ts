import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
  updateTag: mocks.updateTag,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { publishContent } from "../../src/lib/content/operations";

const command = {
  contentType: "service" as const,
  targetId: "10000000-0000-4000-8000-000000000001",
  expectedVersion: 1,
};

describe("S4 publication operation cache boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates bounded content tags only after a successful publication command", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        content_type: "service",
        id: command.targetId,
        version: 2,
        publication_status: "published",
      },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(publishContent(command)).resolves.toMatchObject({ ok: true });

    expect(rpc).toHaveBeenCalledWith("publish_content", {
      content_type: "service",
      target_id: command.targetId,
      expected_version: 1,
    });
    expect(mocks.revalidateTag.mock.calls).toEqual([
      ["content:services", "max"],
      [`content:service:${command.targetId}`, "max"],
      ["homepage", "max"],
    ]);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("does not invalidate cache tags when publication is rejected", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: false,
        reasons: [{ code: "missing_verification" }],
      },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(publishContent(command)).resolves.toMatchObject({ ok: false });

    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("uses only immediate tag expiry for a read-your-own-writes Server Action", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        content_type: "service",
        id: command.targetId,
        version: 2,
        publication_status: "published",
      },
      error: null,
    });
    mocks.createServerSupabaseClient.mockResolvedValue({ rpc });

    await expect(
      publishContent(command, undefined, { cachePolicy: "read-your-own-writes" }),
    ).resolves.toMatchObject({ ok: true });

    expect(mocks.updateTag.mock.calls).toEqual([
      ["content:services"],
      [`content:service:${command.targetId}`],
      ["homepage"],
    ]);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
