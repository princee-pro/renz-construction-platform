import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceSupabaseClient: () => null }));
vi.mock("@/lib/supabase/public-server", () => ({ createPublicSupabaseClient: () => null }));

import {
  contactInput,
  materialEnquiryInput,
  parseIntakePreselection,
  projectIntakeInput,
  serviceEnquiryInput,
} from "@/features/intake/intake-contract";
import { detectIntakeMimeType, validateIntakeFile } from "@/features/intake/intake-files";
import {
  acceptedMimeTypes,
  continueOnWhatsAppMessage,
  intakeRateLimits,
} from "@/features/intake/intake-policy";
import {
  hashUploadToken,
  honeypotTripped,
  intakeEnvironmentChecks,
  issueFormToken,
  verifyFormToken,
} from "@/features/intake/intake-server";
import {
  leadAge,
  leadConvertClientInput,
  leadCreateInput,
  leadRequirementsInput,
  leadStatusInput,
} from "@/features/leads/lead-contract";
import { adminNavigation } from "@/lib/admin/navigation";
import { adminPermissions } from "@/lib/auth/permissions";
import { siteIdentityFrom } from "@/lib/site/public-configuration";

function form(entries: Readonly<Record<string, string>>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const base = { fullName: "SYNTHETIC VISITOR", privacy: "on", formToken: "t" };

describe("C8 public intake contracts", () => {
  it("requires a name, one contact method and the privacy acknowledgement", () => {
    expect(
      contactInput(form({ ...base, subject: "Hello", message: "A long enough message." })).success,
    ).toBe(false);
    expect(
      contactInput(
        form({
          ...base,
          email: "a@example.test",
          subject: "Hello",
          message: "A long enough message.",
        }),
      ).success,
    ).toBe(true);
    expect(
      contactInput(
        form({
          ...base,
          phone: "+250 780 000 111",
          subject: "Hello",
          message: "A long enough message.",
        }),
      ).success,
    ).toBe(true);
    expect(
      contactInput(
        form({
          fullName: "X",
          email: "a@example.test",
          subject: "Hello",
          message: "A long enough message.",
          formToken: "t",
        }),
      ).success,
    ).toBe(false);
    expect(
      contactInput(
        form({
          ...base,
          email: "a@example.test",
          subject: "<script>",
          message: "A long enough message.",
        }),
      ).success,
    ).toBe(false);
  });

  it("accepts only approved service keys for service enquiries", () => {
    const ok = serviceEnquiryInput(
      form({
        ...base,
        email: "a@example.test",
        serviceKey: "design",
        requirement: "SYNTHETIC requirement text.",
      }),
    );
    expect(ok.success).toBe(true);
    expect(
      serviceEnquiryInput(
        form({
          ...base,
          email: "a@example.test",
          serviceKey: "admin",
          requirement: "SYNTHETIC requirement text.",
        }),
      ).success,
    ).toBe(false);
  });

  it("collects material items and refuses an empty enquiry", () => {
    expect(materialEnquiryInput(form({ ...base, email: "a@example.test" })).success).toBe(false);
    const ok = materialEnquiryInput(
      form({
        ...base,
        email: "a@example.test",
        item_0_description: "Cement 42.5",
        item_0_quantity: "200",
        item_0_unit: "bags",
        item_3_description: "Rebar",
      }),
    );
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.items).toHaveLength(2);
      expect(ok.data.items[0]?.quantity).toBe(200);
      expect(ok.data.items[1]?.quantity).toBeNull();
    }
    expect(
      materialEnquiryInput(
        form({
          ...base,
          email: "a@example.test",
          item_0_description: "Cement",
          item_0_quantity: "-1",
        }),
      ).success,
    ).toBe(false);
  });

  it("validates the project intake: budget shape, uploads pairing, controlled vocabularies", () => {
    const valid = {
      ...base,
      email: "a@example.test",
      needKey: "design",
      projectType: "residential",
      description: "SYNTHETIC description long enough.",
      budgetPreference: "not_sure",
      budgetCurrency: "",
      uploadSessionId: "",
      uploadSessionToken: "",
    };
    expect(projectIntakeInput(form(valid)).success).toBe(true);
    expect(projectIntakeInput(form({ ...valid, projectType: "castle" })).success).toBe(false);
    expect(projectIntakeInput(form({ ...valid, budgetPreference: "range" })).success).toBe(false);
    expect(
      projectIntakeInput(
        form({
          ...valid,
          budgetPreference: "range",
          budgetCurrency: "RWF",
          budgetMin: "100",
          budgetMax: "50",
        }),
      ).success,
    ).toBe(false);
    expect(
      projectIntakeInput(
        form({ ...valid, budgetPreference: "range", budgetCurrency: "RWF", budgetMin: "100" }),
      ).success,
    ).toBe(true);
    expect(
      projectIntakeInput(
        form({ ...valid, uploadSessionId: "3f6a2b1c-0000-4000-8000-000000000001" }),
      ).success,
    ).toBe(false);
    expect(projectIntakeInput(form({ ...valid, floors: "0" })).success).toBe(false);
  });

  it("only trusts approved URL preselection", () => {
    expect(
      parseIntakePreselection({
        service: "design",
        project_type: "residential",
        source: "project/villa-1",
      }),
    ).toEqual({
      needKey: "design",
      projectType: "residential",
      sourceContext: "project/villa-1",
    });
    expect(
      parseIntakePreselection({
        service: "../admin",
        project_type: "<b>",
        source: "javascript:alert(1)",
      }),
    ).toEqual({
      needKey: null,
      projectType: null,
      sourceContext: null,
    });
  });

  it("prefills the WhatsApp continuation with the public reference only", () => {
    expect(continueOnWhatsAppMessage("RENZ-LEAD-2026-000001", "RENZ")).toContain(
      "RENZ-LEAD-2026-000001",
    );
    expect(intakeRateLimits.contact.maxHits).toBe(5);
    expect(acceptedMimeTypes("images_only")).not.toContain("application/pdf");
    expect(acceptedMimeTypes("disabled")).toHaveLength(0);
  });
});

describe("C8 upload validation by signature", () => {
  const jpeg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff,
    0xd9,
  ]);
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
  ]);
  const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF");
  const pdfWithScript = new TextEncoder().encode(
    "%PDF-1.4\n1 0 obj<</OpenAction<</S/JavaScript/JS(app.alert(1))>>>>endobj",
  );
  const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
  const svg = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
  );

  it("detects real types regardless of the declared name", () => {
    expect(detectIntakeMimeType(jpeg)).toBe("image/jpeg");
    expect(detectIntakeMimeType(png)).toBe("image/png");
    expect(detectIntakeMimeType(webp)).toBe("image/webp");
    expect(detectIntakeMimeType(pdf)).toBe("application/pdf");
    expect(detectIntakeMimeType(html)).toBeNull();
    expect(detectIntakeMimeType(svg)).toBeNull();
  });

  it("applies the upload policy and refuses active content and oversize files", () => {
    expect(validateIntakeFile(jpeg, "images_only").ok).toBe(true);
    expect(validateIntakeFile(pdf, "images_only")).toMatchObject({ ok: false, reason: "policy" });
    expect(validateIntakeFile(pdf, "images_and_pdf").ok).toBe(true);
    expect(validateIntakeFile(pdfWithScript, "images_and_pdf")).toMatchObject({
      ok: false,
      reason: "active_content",
    });
    expect(validateIntakeFile(html, "images_and_pdf")).toMatchObject({
      ok: false,
      reason: "unsupported_type",
    });
    expect(validateIntakeFile(new Uint8Array(0), "images_only")).toMatchObject({
      ok: false,
      reason: "empty",
    });
    const huge = new Uint8Array(10 * 1024 * 1024 + 1);
    huge.set(jpeg);
    expect(validateIntakeFile(huge, "images_only")).toMatchObject({
      ok: false,
      reason: "too_large",
    });
    expect(validateIntakeFile(jpeg, "disabled")).toMatchObject({ ok: false, reason: "policy" });
  });
});

describe("C8 anti-abuse primitives", () => {
  it("signs form tokens, enforces minimum interaction and expiry, and never accepts tampering", () => {
    const token = issueFormToken();
    expect(verifyFormToken(token)).toMatchObject({ ok: false, reason: "too_fast" });
    const [issuedAt, nonce, signature] = token.split(".") as [string, string, string];
    const aged = `${Number(issuedAt) - 10_000}.${nonce}.${signature}`;
    expect(verifyFormToken(aged)).toMatchObject({ ok: false, reason: "invalid" });
    expect(verifyFormToken("garbage")).toMatchObject({ ok: false, reason: "invalid" });
    expect(verifyFormToken(`${issuedAt}.${nonce}.${"0".repeat(64)}`)).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    const data = new FormData();
    data.set("website_url", "http://spam.example");
    expect(honeypotTripped(data)).toBe(true);
    expect(honeypotTripped(new FormData())).toBe(false);
    expect(hashUploadToken("a".repeat(64))).toMatch(/^[0-9a-f]{64}$/u);
    expect(hashUploadToken("a".repeat(64))).not.toBe(hashUploadToken("b".repeat(64)));
  });

  it("reports environment presence by name only", () => {
    const checks = intakeEnvironmentChecks();
    expect(checks.map((check) => check.key)).toEqual(
      expect.arrayContaining([
        "intake_rate_limit_secret",
        "turnstile",
        "intake_test_bypass",
        "intake_scanner",
      ]),
    );
    expect(JSON.stringify(checks)).not.toContain("placeholder-intake-secret");
  });
});

describe("C8 lead CRM contracts and wiring", () => {
  it("parses staff forms with controlled vocabularies", () => {
    expect(
      leadCreateInput(
        form({
          leadType: "general",
          sourceChannel: "manual",
          fullName: "SYNTHETIC",
          summary: "Call",
          phone: "+250780000000",
        }),
      ).success,
    ).toBe(true);
    expect(
      leadCreateInput(
        form({
          leadType: "general",
          sourceChannel: "start_a_project",
          fullName: "SYNTHETIC",
          summary: "Call",
          phone: "+250780000000",
        }),
      ).success,
    ).toBe(false);
    const lost = leadStatusInput(
      form({
        id: "3f6a2b1c-0000-4000-8000-000000000001",
        expectedVersion: "2",
        status: "lost",
        reasonCode: "",
      }),
    );
    expect(lost.success).toBe(false);
    expect(
      leadStatusInput(
        form({
          id: "3f6a2b1c-0000-4000-8000-000000000001",
          expectedVersion: "2",
          status: "lost",
          reasonCode: "budget",
        }),
      ).success,
    ).toBe(true);
    const convert = leadConvertClientInput(
      form({
        id: "3f6a2b1c-0000-4000-8000-000000000001",
        expectedVersion: "1",
        existingClientId: "",
        clientTier: "",
      }),
    );
    expect(convert.success && convert.data.clientTier).toBe("standard");
    const requirements = leadRequirementsInput(
      form({
        id: "3f6a2b1c-0000-4000-8000-000000000001",
        expectedVersion: "3",
        select_0: "on",
        item_0_name: "Cement",
        item_0_quantity: "200",
        item_0_unit: "bags",
        item_1_name: "Ignored (not selected)",
      }),
    );
    expect(requirements.success && requirements.data.items).toHaveLength(1);
    expect(leadAge(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe("3h");
    expect(leadAge(new Date(Date.now() - 49 * 3_600_000).toISOString())).toBe("2d");
  });

  it("declares the lead permissions, navigation and public intake flags", () => {
    for (const key of [
      "leads.read",
      "leads.write",
      "leads.assign",
      "leads.convert",
      "leads.attachments.read",
    ]) {
      expect(adminPermissions).toContain(key);
    }
    const hrefs = adminNavigation.map((item) => item.href);
    expect(hrefs.indexOf("/admin/operations/leads")).toBeLessThan(
      hrefs.indexOf("/admin/operations/clients"),
    );
    expect(siteIdentityFrom({}).intake).toEqual({ enabled: true, uploadPolicy: "images_only" });
    expect(
      siteIdentityFrom({ intake: { enabled: false, upload_policy: "disabled" } }).intake,
    ).toEqual({
      enabled: false,
      uploadPolicy: "disabled",
    });
  });
});
