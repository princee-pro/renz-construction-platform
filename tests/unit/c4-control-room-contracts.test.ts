import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

import {
  commandId,
  commandReasonCode,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { clientCreateInput, clientEditInput } from "@/features/clients/client-contract";
import { normalizeClientListFilters } from "@/features/clients/client-data";
import {
  caseStudyDraftFromProjectInput,
  operationsOverviewSchema,
  projectCreateInput,
  projectEditInput,
  projectHealth,
} from "@/features/operational-projects/project-contract";
import { normalizeProjectListFilters } from "@/features/operational-projects/project-data";
import { adminNavigation, visibleAdminNavigation } from "@/lib/admin/navigation";

const clientId = "97000000-0000-4000-8000-000000000201";
const projectId = "97000000-0000-4000-8000-000000000202";

function form(entries: Readonly<Record<string, string>>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("C4 client contract", () => {
  it("requires a full name and at least one contact method", () => {
    const missing = clientCreateInput(form({ fullName: "SYNTHETIC C4 Client" }));
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues.map((issue) => issue.path[0])).toContain("email");
    }
    const withPhone = clientCreateInput(
      form({ fullName: "SYNTHETIC C4 Client", phone: "+250 780 000 001" }),
    );
    expect(withPhone.success).toBe(true);
    const withEmail = clientCreateInput(
      form({ fullName: "SYNTHETIC C4 Client", email: "synthetic@example.test" }),
    );
    expect(withEmail.success).toBe(true);
    const unnamed = clientCreateInput(form({ fullName: "   ", email: "synthetic@example.test" }));
    expect(unnamed.success).toBe(false);
  });

  it("defaults the tier to standard and rejects tiers outside the canonical set", () => {
    const defaulted = clientCreateInput(
      form({ fullName: "SYNTHETIC C4 Client", email: "synthetic@example.test" }),
    );
    expect(defaulted.success && defaulted.data.clientTier).toBe("standard");
    const invalid = clientCreateInput(
      form({ fullName: "SYNTHETIC", email: "synthetic@example.test", clientTier: "gold" }),
    );
    expect(invalid.success).toBe(false);
  });

  it("rejects markup and executable protocols in free text", () => {
    const markup = clientCreateInput(
      form({ fullName: "<b>SYNTHETIC</b>", email: "synthetic@example.test" }),
    );
    expect(markup.success).toBe(false);
    const protocol = clientEditInput(
      form({
        clientId,
        expectedVersion: "2",
        fullName: "SYNTHETIC",
        email: "synthetic@example.test",
        address: "javascript:alert(1)",
      }),
    );
    expect(protocol.success).toBe(false);
  });

  it("requires a positive integer expected version on edit", () => {
    const stale = clientEditInput(
      form({ clientId, expectedVersion: "0", fullName: "SYNTHETIC", email: "s@example.test" }),
    );
    expect(stale.success).toBe(false);
    const malformed = clientEditInput(
      form({ clientId: "not-a-uuid", expectedVersion: "1", fullName: "S", email: "s@x.test" }),
    );
    expect(malformed.success).toBe(false);
  });

  it("normalizes register filters to the admitted scopes only", () => {
    expect(normalizeClientListFilters({ status: "archived", tier: "vip" }).statusScope).toBe(
      "archived",
    );
    expect(normalizeClientListFilters({ status: "deleted" }).statusScope).toBe("active");
    expect(normalizeClientListFilters({ q: ["  padded  ", "second"] }).search).toBe("padded");
  });
});

describe("C4 operational project contract", () => {
  const valid = {
    clientId,
    title: "SYNTHETIC C4 PROJECT",
    status: "planning",
    phase: "design",
    priority: "high",
    startDate: "2026-10-01",
    endDate: "2027-03-31",
    budgetAmount: "125000000",
    budgetCurrency: "rwf",
  } as const;

  it("accepts a complete project and upper-cases the currency", () => {
    const parsed = projectCreateInput(form(valid));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.budgetCurrency).toBe("RWF");
      expect(parsed.data.budgetAmount).toBe("125000000");
    }
  });

  it("requires a client and rejects unknown status/phase/priority", () => {
    expect(projectCreateInput(form({ ...valid, clientId: "" })).success).toBe(false);
    expect(projectCreateInput(form({ ...valid, status: "cancelled" })).success).toBe(false);
    expect(projectCreateInput(form({ ...valid, phase: "handover" })).success).toBe(false);
    expect(projectCreateInput(form({ ...valid, priority: "urgent" })).success).toBe(false);
  });

  it("enforces end_date >= start_date and never invents dates", () => {
    const inverted = projectCreateInput(
      form({ ...valid, startDate: "2027-01-01", endDate: "2026-01-01" }),
    );
    expect(inverted.success).toBe(false);
    const open = projectCreateInput(form({ ...valid, startDate: "", endDate: "" }));
    expect(open.success && open.data.startDate).toBeNull();
    expect(open.success && open.data.endDate).toBeNull();
  });

  it("pairs budget amount with currency and rejects negatives or floats-as-text", () => {
    expect(projectCreateInput(form({ ...valid, budgetCurrency: "" })).success).toBe(false);
    expect(projectCreateInput(form({ ...valid, budgetAmount: "" })).success).toBe(false);
    expect(projectCreateInput(form({ ...valid, budgetAmount: "-1" })).success).toBe(false);
    expect(projectCreateInput(form({ ...valid, budgetAmount: "1e6" })).success).toBe(false);
    expect(projectCreateInput(form({ ...valid, budgetCurrency: "RWFR" })).success).toBe(false);
    const none = projectCreateInput(form({ ...valid, budgetAmount: "", budgetCurrency: "" }));
    expect(none.success).toBe(true);
  });

  it("keeps the edit contract versioned", () => {
    const edit = projectEditInput(
      form({
        projectId,
        expectedVersion: "3",
        title: "SYNTHETIC RENAMED",
        budgetAmount: "42000",
        budgetCurrency: "usd",
      }),
    );
    expect(edit.success && edit.data.expectedVersion).toBe(3);
    expect(edit.success && edit.data.budgetCurrency).toBe("USD");
    expect(projectEditInput(form({ projectId, expectedVersion: "x", title: "S" })).success).toBe(
      false,
    );
  });

  it("only carries public-safe fields across the case-study bridge", () => {
    const draft = caseStudyDraftFromProjectInput(
      form({
        projectId,
        expectedVersion: "1",
        slug: "synthetic-c4-case-study",
        title: "SYNTHETIC C4 CASE STUDY",
        clientName: "SYNTHETIC LEAK",
        budgetAmount: "1",
      }),
    );
    expect(draft.success).toBe(true);
    if (draft.success) {
      expect(Object.keys(draft.data).sort()).toEqual(
        ["expectedVersion", "locale", "projectId", "slug", "title"].sort(),
      );
    }
  });

  it("derives deterministic health labels", () => {
    const base = { priority: "medium", end_date: null } as const;
    expect(projectHealth({ ...base, status: "in_progress" })).toBe("on_track");
    expect(projectHealth({ ...base, status: "in_progress", priority: "high" })).toBe("attention");
    expect(projectHealth({ ...base, status: "in_progress", end_date: "2000-01-01" })).toBe(
      "overdue",
    );
    expect(projectHealth({ ...base, status: "completed", end_date: "2000-01-01" })).toBeNull();
    expect(
      projectHealth({ ...base, status: "planning", archived_at: "2026-01-01T00:00:00Z" }),
    ).toBeNull();
  });

  it("normalizes register filters, including the case-study scope", () => {
    const filters = normalizeProjectListFilters({ scope: "all", caseStudy: "unlinked" });
    expect(filters.statusScope).toBe("all");
    expect(filters.caseStudy).toBe("unlinked");
    expect(normalizeProjectListFilters({ caseStudy: "maybe" }).caseStudy).toBe("");
  });

  it("models budget summaries grouped by currency, never as one total", () => {
    const overview = operationsOverviewSchema.parse({
      client_count: 2,
      active_count: 3,
      archived_count: 1,
      status_counts: { planning: 1, in_progress: 2 },
      phase_counts: { design: 3 },
      priority_counts: { high: 1 },
      ending_soon_count: 0,
      past_due_count: 0,
      without_case_study_count: 3,
      ending_soon_window_days: 14,
      budget_by_currency: [
        { currency: "RWF", total: "125000000" },
        { currency: "USD", total: "42000" },
      ],
    });
    expect(overview.budget_by_currency.map((entry) => entry.currency)).toEqual(["RWF", "USD"]);
    expect(Object.keys(overview)).not.toContain("budget_total");
  });
});

describe("C4 shared action helpers", () => {
  it("reads sanitized command results defensively", () => {
    expect(commandId({ ok: true, id: clientId, version: 1 })).toBe(clientId);
    expect(commandId({ ok: true, id: "drop table clients" })).toBeNull();
    expect(commandVersion({ ok: true, version: 4 })).toBe(4);
    expect(commandVersion({ ok: false, current_version: 7 }, "current_version")).toBe(7);
    expect(commandVersion({ ok: true, version: -1 })).toBeNull();
    expect(commandReasonCode({ ok: false, reasons: [{ code: "version_conflict" }] })).toBe(
      "version_conflict",
    );
    expect(commandReasonCode({ ok: false, reasons: [{ code: "<script>" }] })).toBe(
      "operation_failed",
    );
  });
});

describe("C4 admin information architecture", () => {
  it("groups Operations apart from Website and hides items the actor cannot read", () => {
    const groups = new Set(adminNavigation.map((item) => item.group));
    expect([...groups]).toEqual([
      "Overview",
      "Operations",
      "Procurement",
      "Finance",
      "Website",
      "Settings",
      "Security",
    ]);
    // Invoices (C5), Contractors / Procurement (C6) and Leads (C8) are real pages;
    // Leads sits above Clients because it comes first in the customer lifecycle.
    const labels = adminNavigation.map((item) => item.label);
    expect(labels.indexOf("Leads")).toBeLessThan(labels.indexOf("Clients"));
    // C9 adds Notifications and Analytics to the Overview group (permission-gated).
    expect(labels).toContain("Analytics");
    expect(labels).toContain("Notifications");
    const contentOnly = visibleAdminNavigation(["content.read"]);
    expect(contentOnly.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/content/services",
      "/admin/content/projects",
      "/admin/content/insights",
    ]);
    const operations = visibleAdminNavigation(["clients.read", "operations.projects.read"]);
    expect(operations.map((item) => item.href)).toEqual([
      "/admin/operations/clients",
      "/admin/operations/projects",
    ]);
  });
});
