import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface ProcessResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

const mocks = vi.hoisted(() => ({
  spawnSync: vi.fn<(executable: string, args: readonly string[]) => ProcessResult>(),
  readFileSync: vi.fn<() => string>(),
}));

vi.mock("node:child_process", () => ({ spawnSync: mocks.spawnSync }));
vi.mock("node:fs", () => ({ readFileSync: mocks.readFileSync }));

const originalExitCode = process.exitCode;
const projectId = "renz-construction-local";
const diagnosticSentinel = "private diagnostic sentinel";

function result(status: number | null = 0, stdout = ""): ProcessResult {
  return { status, stdout, stderr: "" };
}

function steps() {
  return mocks.spawnSync.mock.calls.map(([executable, args]) => {
    if (executable === "docker" && args[0] === "ps") return "inventory";
    if (executable === "docker" && args[0] === "inspect") return "health";
    if (args[0]?.endsWith("verify-lead-concurrency.mjs")) return "concurrency";
    if (args[0]?.endsWith("database-types.mjs")) return "types";
    return args.slice(1).join(" ");
  });
}

const requiredServiceHealthChecks = Array.from({ length: 7 }, () => "health");
const stackStabilization = ["status --output json", ...requiredServiceHealthChecks];
const resetStabilization = ["db reset --local", ...stackStabilization];

const verificationSteps = [
  ...resetStabilization,
  ...resetStabilization,
  "test db --local",
  ...resetStabilization,
  "concurrency",
  "db lint --local --fail-on warning",
  "types",
];

async function executeVerifier() {
  // A computed import executes the CLI module afresh without inventing a typed API for it.
  const script = "../../scripts/verify-database.mjs";
  await import(script);
}

beforeEach(() => {
  vi.resetModules();
  mocks.spawnSync.mockReset().mockImplementation((executable, args) => {
    if (executable === "docker" && args[0] === "inspect") {
      return result(0, "running|healthy");
    }
    return result();
  });
  mocks.readFileSync.mockReset().mockReturnValue(`project_id = "${projectId}"\n[db]\n`);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  process.exitCode = 0;
});

afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});

describe("database verifier lifecycle ownership", () => {
  it("reuses a healthy existing stack, performs every check, and never stops it", async () => {
    mocks.spawnSync.mockReturnValueOnce(result(0, "abc123\n"));
    mocks.spawnSync.mockReturnValueOnce(result(0, diagnosticSentinel));

    await executeVerifier();

    expect(steps()).toEqual([
      "inventory",
      "status --output json",
      ...stackStabilization,
      ...verificationSteps,
    ]);
    expect(process.exitCode).toBe(0);
    expect(mocks.spawnSync.mock.calls[0]?.[1]).toEqual([
      "ps",
      "--all",
      "--filter",
      `label=com.supabase.cli.project=${projectId}`,
      "--format",
      "{{.ID}}",
    ]);
    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain(diagnosticSentinel);
  }, 15_000);

  it("owns and stops a stack only after confirming no project containers exist", async () => {
    mocks.spawnSync.mockReturnValueOnce(result());
    mocks.spawnSync.mockReturnValueOnce(result(1));

    await executeVerifier();

    expect(steps()).toEqual([
      "inventory",
      "status --output json",
      "start",
      ...verificationSteps,
      "stop",
    ]);
    expect(process.exitCode).toBe(0);
  }, 15_000);

  it("leaves an unhealthy or partially stopped existing stack untouched", async () => {
    mocks.spawnSync.mockReturnValueOnce(result(0, "abc123\ndef456\n"));
    mocks.spawnSync.mockReturnValueOnce({ ...result(1), stderr: diagnosticSentinel });

    await executeVerifier();

    expect(steps()).toEqual(["inventory", "status --output json"]);
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("not healthy"));
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(diagnosticSentinel);
  });

  it.each([
    { ...result(1), stderr: diagnosticSentinel },
    { ...result(null), error: new Error(diagnosticSentinel) },
    result(0, diagnosticSentinel),
  ])(
    "fails before any stack operation when Docker inventory cannot be trusted",
    async (inventory) => {
      mocks.spawnSync.mockReturnValueOnce(inventory);

      await executeVerifier();

      expect(steps()).toEqual(["inventory"]);
      expect(process.exitCode).toBe(1);
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(diagnosticSentinel);
    },
  );

  it.each([
    "[db]\n",
    'project_id = ""\n',
    'project_id = "unsafe/value"\n',
    `project_id = "${projectId}"\nproject_id = "another-project"\n`,
    `[db]\nproject_id = "${projectId}"\n`,
  ])("fails before probing or mutating an invalid local project configuration", async (config) => {
    mocks.readFileSync.mockReturnValue(config);

    await executeVerifier();

    expect(mocks.spawnSync).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("does not claim ownership when the status process fails to execute", async () => {
    mocks.spawnSync.mockReturnValueOnce(result());
    mocks.spawnSync.mockReturnValueOnce({ ...result(null), error: new Error(diagnosticSentinel) });

    await executeVerifier();

    expect(steps()).toEqual(["inventory", "status --output json"]);
    expect(process.exitCode).toBe(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(diagnosticSentinel);
  });

  it("cleans an owned failed startup without printing lifecycle diagnostics", async () => {
    mocks.spawnSync.mockReturnValueOnce(result());
    mocks.spawnSync.mockReturnValueOnce(result(1));
    mocks.spawnSync.mockReturnValueOnce({ ...result(1), stderr: diagnosticSentinel });

    await executeVerifier();

    expect(steps()).toEqual(["inventory", "status --output json", "start", "stop"]);
    expect(process.exitCode).toBe(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(diagnosticSentinel);
  });

  it("preserves an existing stack when a verification check fails", async () => {
    mocks.spawnSync.mockImplementation((executable, args) => {
      if (executable === "docker" && args[0] === "ps") return result(0, "abc123\n");
      if (executable === "docker" && args[0] === "inspect") {
        return result(0, "running|healthy");
      }
      if (args.slice(1).join(" ") === "db reset --local") return result(1);
      return result();
    });

    await executeVerifier();

    expect(steps()).toEqual([
      "inventory",
      "status --output json",
      ...stackStabilization,
      "db reset --local",
    ]);
    expect(process.exitCode).toBe(1);
  });
});
