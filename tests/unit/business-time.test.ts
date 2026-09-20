import { describe, expect, it } from "vitest";

import { leadContactLogInput } from "@/features/leads/lead-contract";
import {
  addCalendarDays,
  businessDate,
  calendarDaysBetween,
  describeTimeZone,
  formatInBusinessZone,
  isValidTimeZone,
  localDateTimeToInstant,
  zoneOffsetMinutes,
} from "@/lib/time/business-time";

// C9 §9 regression: the C8 contact log converted `datetime-local` values
// with the server's own clock. The canonical instant must come from the
// configured business timezone, and historical instants stay untouched.
describe("business-time", () => {
  it("converts a Kigali wall-clock time to the UTC+2 instant regardless of the server zone", () => {
    const instant = localDateTimeToInstant("2026-09-12T10:30", "Africa/Kigali");
    expect(instant?.toISOString()).toBe("2026-09-12T08:30:00.000Z");
  });

  it("does not equal the naive Date.parse interpretation on a non-UTC server", () => {
    // Whatever zone this test host runs in, the business conversion is fixed.
    const instant = localDateTimeToInstant("2026-01-15T00:15", "Africa/Kigali");
    expect(instant?.toISOString()).toBe("2026-01-14T22:15:00.000Z");
  });

  it("resolves DST correctly for a zone that observes it", () => {
    expect(localDateTimeToInstant("2026-07-01T12:00", "Europe/London")?.toISOString()).toBe(
      "2026-07-01T11:00:00.000Z",
    );
    expect(localDateTimeToInstant("2026-01-01T12:00", "Europe/London")?.toISOString()).toBe(
      "2026-01-01T12:00:00.000Z",
    );
  });

  it("accepts seconds and rejects malformed input", () => {
    expect(localDateTimeToInstant("2026-09-12T10:30:45", "Africa/Kigali")?.toISOString()).toBe(
      "2026-09-12T08:30:45.000Z",
    );
    expect(localDateTimeToInstant("12/09/2026 10:30", "Africa/Kigali")).toBeNull();
    expect(localDateTimeToInstant("", "Africa/Kigali")).toBeNull();
  });

  it("reports zone offsets and labels", () => {
    expect(zoneOffsetMinutes(new Date("2026-09-12T00:00:00Z"), "Africa/Kigali")).toBe(120);
    expect(describeTimeZone("Africa/Kigali", new Date("2026-09-12T00:00:00Z"))).toBe(
      "Africa/Kigali (UTC+02:00)",
    );
    expect(isValidTimeZone("Africa/Kigali")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });

  it("keeps historical UTC instants as they are and only formats them in the business zone", () => {
    const stored = "2026-06-30T22:30:00.000Z"; // written by C8 exactly like this
    expect(businessDate(new Date(stored), "Africa/Kigali")).toBe("2026-07-01");
    expect(formatInBusinessZone(stored, "Africa/Kigali")).toMatch(/Jul 1, 2026/u);
    expect(formatInBusinessZone(stored, "UTC")).toMatch(/Jun 30, 2026/u);
    expect(formatInBusinessZone(null, "Africa/Kigali")).toBe("—");
  });

  it("does calendar arithmetic without timezone drift", () => {
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(calendarDaysBetween("2026-06-01", "2026-06-30")).toBe(29);
  });

  it("the lead contact-log contract keeps the local wall-clock string for server conversion", () => {
    const form = new FormData();
    form.set("id", "11111111-1111-4111-8111-111111111111");
    form.set("contactType", "whatsapp");
    form.set("occurredAt", "2026-09-12T10:30");
    const parsed = leadContactLogInput(form);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.occurredAt).toBe("2026-09-12T10:30");
    form.set("occurredAt", "not-a-time");
    expect(leadContactLogInput(form).success).toBe(false);
    form.set("occurredAt", "");
    const blank = leadContactLogInput(form);
    expect(blank.success && blank.data.occurredAt).toBeNull();
  });
});
