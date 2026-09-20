import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/public-server", () => ({ createPublicSupabaseClient: () => null }));

import {
  businessHoursInput,
  businessLocationInput,
  businessProfileInput,
  contactChannelInput,
  documentDefaultsInput,
  navigationSettingsInput,
  operationalSettingsInput,
  seoSettingsInput,
  websiteSettingsInput,
} from "@/features/settings/settings-contract";
import { adminNavigation } from "@/lib/admin/navigation";
import { adminPermissions } from "@/lib/auth/permissions";
import { siteIdentityFrom } from "@/lib/site/public-configuration";

function form(entries: Readonly<Record<string, string>>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("C7 business settings contracts", () => {
  it("validates the business profile", () => {
    const ok = businessProfileInput(
      form({
        expectedVersion: "1",
        displayName: "RENZ Construction Services Ltd",
        primaryEmail: "renzconstruuction@gmail.com",
        websiteUrl: "https://example.test",
      }),
    );
    expect(ok.success).toBe(true);
    expect(
      businessProfileInput(form({ expectedVersion: "1", displayName: "X", primaryEmail: "nope" }))
        .success,
    ).toBe(false);
    expect(
      businessProfileInput(
        form({
          expectedVersion: "1",
          displayName: "X",
          primaryEmail: "x@example.test",
          websiteUrl: "javascript:alert(1)",
        }),
      ).success,
    ).toBe(false);
  });

  it("keeps WhatsApp texting-only unless calling is explicitly enabled", () => {
    const channel = contactChannelInput(
      form({
        expectedVersion: "1",
        channelType: "whatsapp",
        label: "WhatsApp",
        value: "+44 7412 853143",
      }),
    );
    expect(channel.success).toBe(true);
    if (channel.success) {
      expect(channel.data.callingEnabled).toBe(false);
      expect(channel.data.isPublic).toBe(false);
      expect(channel.data.active).toBe(true);
    }
    expect(
      contactChannelInput(
        form({ expectedVersion: "1", channelType: "maps", label: "Map", value: "javascript:x" }),
      ).success,
    ).toBe(false);
  });

  it("requires coordinate pairs and https map links for the location", () => {
    expect(businessLocationInput(form({ expectedVersion: "1", latitude: "1.5" })).success).toBe(
      false,
    );
    expect(
      businessLocationInput(form({ expectedVersion: "1", mapsUrl: "http://maps.example.test" }))
        .success,
    ).toBe(false);
    const ok = businessLocationInput(
      form({
        expectedVersion: "1",
        publish: "on",
        city: "Kigali",
        latitude: "-1.95",
        longitude: "30.06",
        mapsUrl: "https://maps.example.test/renz",
      }),
    );
    expect(ok.success).toBe(true);
  });

  it("parses seven weekdays and rejects inverted hours", () => {
    const base: Record<string, string> = { expectedVersion: "1" };
    base["open_1"] = "on";
    base["opens_1"] = "08:00";
    base["closes_1"] = "17:00";
    expect(businessHoursInput(form(base)).success).toBe(true);
    base["closes_1"] = "07:00";
    expect(businessHoursInput(form(base)).success).toBe(false);
  });
});

describe("C7 website / SEO / system contracts", () => {
  it("accepts only approved CTA routes and origin-only canonical URLs", () => {
    expect(
      websiteSettingsInput(
        form({
          expectedVersion: "1",
          homepageCtaLabel: "Start a Project",
          homepageCtaRoute: "start-a-project",
          canonicalBaseUrl: "https://www.example.test/",
        }),
      ).success,
    ).toBe(true);
    expect(
      websiteSettingsInput(
        form({ expectedVersion: "1", homepageCtaLabel: "X", homepageCtaRoute: "admin" }),
      ).success,
    ).toBe(false);
    expect(
      websiteSettingsInput(
        form({
          expectedVersion: "1",
          homepageCtaLabel: "X",
          homepageCtaRoute: "contact",
          canonicalBaseUrl: "https://example.test/path",
        }),
      ).success,
    ).toBe(false);
  });

  it("requires %s in the SEO title template and bounded descriptions", () => {
    expect(
      seoSettingsInput(form({ expectedVersion: "1", siteName: "RENZ", titleTemplate: "RENZ" }))
        .success,
    ).toBe(false);
    expect(
      seoSettingsInput(form({ expectedVersion: "1", siteName: "RENZ", titleTemplate: "%s | RENZ" }))
        .success,
    ).toBe(true);
  });

  it("reads navigation overrides for the approved routes only", () => {
    const parsed = navigationSettingsInput(
      form({ expectedVersion: "1", label_about: "Studio", visible_about: "on", sort_about: "5" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(6);
      expect(parsed.data.items.find((i) => i.route_key === "about")).toMatchObject({
        label: "Studio",
        visible: true,
        sort_order: 5,
      });
      expect(parsed.data.items.find((i) => i.route_key === "contact")?.visible).toBe(false);
    }
  });

  it("validates document defaults and operational thresholds", () => {
    expect(
      documentDefaultsInput(
        form({
          expectedVersion: "1",
          defaultCurrency: "rwf",
          allowedCurrencies: "RWF, usd",
          invoiceTaxRate: "18",
          invoiceDueDays: "14",
          poTaxRate: "0",
          poExpectedDeliveryDays: "7",
        }),
      ).success,
    ).toBe(true);
    expect(
      documentDefaultsInput(
        form({
          expectedVersion: "1",
          defaultCurrency: "EUR",
          allowedCurrencies: "RWF",
          invoiceTaxRate: "0",
          invoiceDueDays: "14",
          poTaxRate: "0",
          poExpectedDeliveryDays: "7",
        }),
      ).success,
    ).toBe(false);
    expect(
      operationalSettingsInput(
        form({
          expectedVersion: "1",
          projectEndingSoonDays: "14",
          invoiceDueSoonDays: "7",
          staleDraftInvoiceDays: "14",
          assignmentEndingSoonDays: "14",
          materialRequiredSoonDays: "14",
          poExpectedSoonDays: "0",
        }),
      ).success,
    ).toBe(false);
  });
});

describe("C7 public identity", () => {
  it("falls back to the authorized contact and never renders tel: without calling enabled", () => {
    const identity = siteIdentityFrom({});
    expect(identity.configured).toBe(false);
    expect(identity.email).toBe("renzconstruuction@gmail.com");
    expect(identity.whatsappUrl).toBe("https://wa.me/447412853143");
    expect(identity.telHref).toBeNull();
    expect(identity.location).toBeNull();
    expect(identity.siteMode).toBe("preview");
    expect(identity.navigation.map((link) => link.href)).toContain("/contact");
  });

  it("maps a published configuration into navigation, CTA and contact", () => {
    const identity = siteIdentityFrom({
      business: { display_name: "SYNTHETIC LTD", short_name: "SYN", primary_email: "a@b.test" },
      contact: {
        primary_email: "a@b.test",
        whatsapp_digits: "250780000000",
        channels: [
          {
            id: "x",
            type: "phone",
            label: "Office",
            value: "+250 780 000 000",
            href: "tel:+250780000000",
            calling_enabled: true,
          },
        ],
      },
      navigation: [
        { route_key: "about", label: "Studio", visible: true, sort_order: 1 },
        { route_key: "insights", visible: false, sort_order: 2 },
        { route_key: "contact", visible: true, sort_order: 3 },
      ],
      website: { homepage_cta_label: "Talk to us", homepage_cta_route: "contact" },
      site_mode: "live",
    });
    expect(identity.configured).toBe(true);
    expect(identity.telHref).toBe("tel:+250780000000");
    expect(identity.navigation).toEqual([
      { href: "/about", label: "Studio" },
      { href: "/contact", label: "Contact" },
    ]);
    expect(identity.cta).toEqual({ label: "Talk to us", href: "/contact" });
    expect(identity.siteMode).toBe("live");
  });
});

describe("C7 wiring", () => {
  it("declares the eleven settings/staff permissions and the Settings navigation", () => {
    for (const key of [
      "settings.business.read",
      "settings.business.write",
      "settings.website.read",
      "settings.website.write",
      "settings.legal.read",
      "settings.legal.write",
      "settings.legal.publish",
      "settings.system.read",
      "settings.system.write",
      "staff.read",
      "staff.manage",
    ]) {
      expect(adminPermissions).toContain(key);
    }
    expect(adminNavigation.map((item) => item.href)).toContain("/admin/settings");
    expect(adminNavigation.map((item) => item.href)).toContain("/admin/settings/launch-readiness");
  });
});
