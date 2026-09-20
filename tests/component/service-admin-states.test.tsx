import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createServiceAction: vi.fn(),
  createEvidenceAction: vi.fn(),
  saveServiceAction: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/content/services",
}));

vi.mock("@/features/services/service-actions", async () => {
  const contract = await import("@/features/services/service-contract");
  return {
    initialServiceActionState: contract.initialServiceActionState,
    saveServiceAction: mocks.saveServiceAction,
    createServiceAction: mocks.createServiceAction,
    createEvidenceAction: mocks.createEvidenceAction,
    submitEvidenceAction: vi.fn(),
    reviewEvidenceAction: vi.fn(),
    changeServicePublicationAction: vi.fn(),
  };
});

import { Alert } from "@/components/admin/ui/alert";
import { CreateServiceForm } from "@/features/services/components/create-service-form";
import { EvidenceWorkspace } from "@/features/services/components/evidence-workspace";
import { PublicationControls } from "@/features/services/components/publication-controls";
import { ServiceEditor } from "@/features/services/components/service-editor";
import { ServiceList } from "@/features/services/components/service-list";
import { ServicePreview } from "@/features/services/components/service-preview";
import type { ServiceDetail, ServiceListResult } from "@/features/services/service-contract";

const serviceId = "95000000-0000-4000-8000-000000000100";

const detail: ServiceDetail & { localization: NonNullable<ServiceDetail["localization"]> } = {
  service: {
    id: serviceId,
    publication_status: "draft",
    published_at: null,
    sort_order: 0,
    featured: false,
    created_at: "2026-09-06T10:00:00.000Z",
    updated_at: "2026-09-06T10:00:00.000Z",
    version: 2,
  },
  localization: {
    locale: "en",
    slug: "synthetic-s5a-service",
    name: "SYNTHETIC S5A Service",
    summary: "SYNTHETIC summary used only for a component test.",
    body_blocks: [
      { type: "heading", level: 2, text: "SYNTHETIC section" },
      { type: "paragraph", text: "SYNTHETIC safe paragraph" },
      { type: "list", items: ["SYNTHETIC item"] },
      { type: "link", label: "SYNTHETIC safe link", href: "/contact" },
    ],
    schema_version: 1,
    seo_title: null,
    seo_description: null,
    scope: null,
    deliverables: null,
    exclusions: null,
    client_inputs: null,
    delivery_wording: null,
    professional_terminology: null,
    version: 2,
  },
  available_locales: ["en"],
  evidence: [],
  readiness: {
    ready: false,
    reasons: [
      { code: "missing_required_field", field: "scope", detail: "Service scope is required." },
    ],
  },
};

const emptyResult: ServiceListResult = { items: [], has_more: false, next_cursor: null };
const defaultFilters = { query: "", status: "all", locale: "", cursor: "" } as const;

beforeEach(() => {
  mocks.refresh.mockReset();
  mocks.createServiceAction.mockReset();
  mocks.createEvidenceAction.mockReset();
  mocks.saveServiceAction.mockReset();
});

afterEach(cleanup);

describe("S5A administration states", () => {
  it("preserves draft identity values after a recoverable create error", async () => {
    mocks.createServiceAction.mockResolvedValue({
      status: "error",
      message: "That locale and slug are already in use.",
      fieldErrors: { slug: "This locale and slug must be unique." },
      serviceVersion: null,
      localizationVersion: null,
      reauthHref: null,
    });
    const { container } = render(<CreateServiceForm />);
    const name = screen.getByRole("textbox", { name: "Service name" });
    const slug = screen.getByRole("textbox", { name: "Public slug" });
    fireEvent.change(name, { target: { value: "SYNTHETIC preserved draft" } });
    fireEvent.change(slug, { target: { value: "synthetic-preserved-draft" } });
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    if (form) fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText("Draft not created")).toBeTruthy());
    expect((name as HTMLInputElement).value).toBe("SYNTHETIC preserved draft");
    expect((slug as HTMLInputElement).value).toBe("synthetic-preserved-draft");
    expect(slug.getAttribute("aria-describedby")).toContain("slug-error");
  });

  it("preserves evidence values and focuses a field after a recoverable error", async () => {
    mocks.createEvidenceAction.mockResolvedValue({
      status: "error",
      message: "Correct the evidence fields before registering it.",
      fieldErrors: { sourceReference: "Enter a value." },
      serviceVersion: null,
      localizationVersion: null,
      reauthHref: null,
    });
    const { container } = render(
      <EvidenceWorkspace canVerify={false} canWrite evidence={[]} serviceId={serviceId} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Register evidence" }));
    const claim = screen.getByRole("textbox", { name: "Supported fact" });
    const reference = screen.getByRole("textbox", { name: "Source reference" });
    fireEvent.change(claim, { target: { value: "SYNTHETIC preserved evidence fact" } });
    const form = container.querySelector("form.evidence-create-form");
    expect(form).not.toBeNull();
    if (form) fireEvent.submit(form);

    await waitFor(() => expect(document.activeElement).toBe(reference));
    expect((claim as HTMLTextAreaElement).value).toBe("SYNTHETIC preserved evidence fact");
    expect(reference.getAttribute("aria-describedby")).toContain("sourceReference-error");
  });

  it("distinguishes initial and filtered-empty service registers", () => {
    const { rerender } = render(
      <ServiceList canCreate filters={defaultFilters} result={emptyResult} />,
    );
    expect(screen.getByRole("heading", { name: "No service drafts yet" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create first draft" })).toBeTruthy();

    rerender(
      <ServiceList
        canCreate
        filters={{ ...defaultFilters, query: "no-match" }}
        result={emptyResult}
      />,
    );
    expect(screen.getByRole("heading", { name: "No services match these filters" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Clear filters" })).toBeTruthy();
  });

  it("presents blocked readiness while hiding publish/archive from an admin", () => {
    render(
      <PublicationControls
        canArchive={false}
        canPublish={false}
        onVersionChange={vi.fn()}
        readiness={detail.readiness}
        serviceId={serviceId}
        serviceVersion={2}
        status="draft"
      />,
    );

    expect(screen.getByText("Blocked")).toBeTruthy();
    expect(screen.getByText("Service scope is required.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect(screen.getByText(/prepare drafts but cannot publish/i)).toBeTruthy();
  });

  it("presents ready Super Admin actions without conflating save and publish", () => {
    render(
      <PublicationControls
        canArchive
        canPublish
        onVersionChange={vi.fn()}
        readiness={{ ready: true, reasons: [] }}
        serviceId={serviceId}
        serviceVersion={2}
        status="draft"
      />,
    );

    expect(screen.getByText("Ready")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archive" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
  });

  it("renders only the exact structured preview vocabulary", () => {
    render(<ServicePreview detail={detail} />);
    expect(screen.getByRole("heading", { level: 1, name: "SYNTHETIC S5A Service" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "SYNTHETIC section" })).toBeTruthy();
    expect(screen.getByRole("listitem", { name: "" }).textContent).toBe("SYNTHETIC item");
    expect(screen.getByRole("link", { name: "SYNTHETIC safe link" }).getAttribute("href")).toBe(
      "/contact",
    );
    expect(screen.getByText("DRAFT PREVIEW / NOT PUBLIC")).toBeTruthy();
  });

  it("keeps edited values visible after an optimistic conflict", async () => {
    mocks.saveServiceAction.mockResolvedValue({
      status: "conflict",
      message: "A newer version exists. Your entered values remain below.",
      fieldErrors: {},
      serviceVersion: 3,
      localizationVersion: 3,
      reauthHref: null,
    });
    const { container } = render(
      <ServiceEditor canArchive canPublish canVerify canWrite detail={detail} />,
    );
    const name = screen.getByRole("textbox", { name: "Service name" });
    fireEvent.change(name, { target: { value: "SYNTHETIC preserved editor value" } });
    const form = container.querySelector("form.editor-form");
    expect(form).not.toBeNull();
    if (form) fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText("Newer version detected")).toBeTruthy());
    expect((name as HTMLInputElement).value).toBe("SYNTHETIC preserved editor value");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("keeps edited values visible after a recoverable save failure", async () => {
    mocks.saveServiceAction.mockResolvedValue({
      status: "error",
      message: "The service draft could not be saved. Retry when the connection returns.",
      fieldErrors: { summary: "Summary must be 600 characters or fewer." },
      serviceVersion: null,
      localizationVersion: null,
      reauthHref: null,
    });
    const { container } = render(
      <ServiceEditor canArchive canPublish canVerify canWrite detail={detail} />,
    );
    const summary = screen.getByRole("textbox", { name: "Summary" });
    fireEvent.change(summary, { target: { value: "SYNTHETIC preserved after failure" } });
    const form = container.querySelector("form.editor-form");
    expect(form).not.toBeNull();
    if (form) fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText("Draft not saved")).toBeTruthy());
    expect((summary as HTMLTextAreaElement).value).toBe("SYNTHETIC preserved after failure");
    expect(summary.getAttribute("aria-describedby")).toBe("summary-error");
    expect(document.getElementById("summary-error")?.textContent).toBe(
      "Summary must be 600 characters or fewer.",
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("reconciles versions and the clean state after a successful save", async () => {
    mocks.saveServiceAction.mockResolvedValue({
      status: "success",
      message: "Draft saved.",
      fieldErrors: {},
      serviceVersion: 3,
      localizationVersion: 3,
      reauthHref: null,
    });
    const { container } = render(
      <ServiceEditor canArchive canPublish canVerify canWrite detail={detail} />,
    );
    const name = screen.getByRole("textbox", { name: "Service name" });
    fireEvent.change(name, { target: { value: "SYNTHETIC saved value" } });
    const form = container.querySelector("form.editor-form");
    expect(form).not.toBeNull();
    if (form) fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText("Draft saved.")).toBeTruthy());
    expect(screen.getByText("Service v3")).toBeTruthy();
    expect(screen.getByText("Locale v3")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("All changes saved")).toBeTruthy());
    expect((name as HTMLInputElement).value).toBe("SYNTHETIC saved value");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("provides explicit retry language for an offline/recoverable failure", () => {
    render(
      <Alert live tone="danger" title="Draft not saved">
        Connection unavailable. Your values remain in this editor; retry when the network returns.
      </Alert>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Your values remain");
  });
});
