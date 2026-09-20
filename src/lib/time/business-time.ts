/**
 * Business-timezone helpers (C9 §8–9).
 *
 * The RENZ business timezone is configured in the C7 business profile
 * (seeded `Africa/Kigali`). Staff enter wall-clock times in that zone; the
 * database stores canonical `timestamptz` instants; every display formats
 * the instant back into the configured zone. Nothing here depends on the
 * server's own timezone, and historical UTC values are never reinterpreted —
 * an instant is an instant.
 */

export const DEFAULT_BUSINESS_TIMEZONE = "Africa/Kigali";

const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/u;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of an instant in a zone (no DST guessing: Intl decides). */
export function zonedParts(
  instant: Date,
  timeZone: string,
): Readonly<{
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

/** Offset (minutes east of UTC) that `timeZone` applies at `instant`. */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * Converts a staff-entered local wall-clock value (`YYYY-MM-DDTHH:mm`, the
 * shape `datetime-local` produces) in `timeZone` into the UTC instant it
 * denotes. Returns null for malformed input. DST is resolved by evaluating
 * the zone's offset at the candidate instant and re-applying it, so a value
 * across a transition still lands on the correct instant.
 */
export function localDateTimeToInstant(local: string, timeZone: string): Date | null {
  const match = localDateTimePattern.exec(local.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const naive = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  if (Number.isNaN(naive)) return null;
  // First guess: treat the wall clock as UTC, then correct by the zone's
  // offset at that guess; correct once more in case the first guess crossed
  // a transition boundary.
  let instant = naive - zoneOffsetMinutes(new Date(naive), timeZone) * 60_000;
  instant = naive - zoneOffsetMinutes(new Date(instant), timeZone) * 60_000;
  const check = zonedParts(new Date(instant), timeZone);
  if (
    check.year !== Number(year) ||
    check.month !== Number(month) ||
    check.day !== Number(day) ||
    check.hour !== Number(hour) ||
    check.minute !== Number(minute)
  ) {
    // Non-existent local time inside a DST gap: keep the corrected instant
    // rather than failing — it is the closest real moment.
    return new Date(instant);
  }
  return new Date(instant);
}

/** `YYYY-MM-DD` of an instant in the zone (the business calendar day). */
export function businessDate(instant: Date, timeZone: string): string {
  const parts = zonedParts(instant, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** The instant formatted for staff in the business zone, zone name included. */
export function formatInBusinessZone(
  value: string | Date | null,
  timeZone: string,
  options: Readonly<{ dateStyle?: "medium" | "short"; timeStyle?: "short" | null }> = {},
): string {
  if (!value) return "—";
  const instant = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(instant.getTime())) return "—";
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone,
    dateStyle: options.dateStyle ?? "medium",
    ...(options.timeStyle === null ? {} : { timeStyle: options.timeStyle ?? "short" }),
  });
  return formatter.format(instant);
}

/** Short zone label for UI hints, e.g. "Africa/Kigali (UTC+02:00)". */
export function describeTimeZone(timeZone: string, at: Date = new Date()): string {
  const offset = zoneOffsetMinutes(at, timeZone);
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${timeZone} (UTC${sign}${hours}:${minutes})`;
}

/** Adds whole days to a `YYYY-MM-DD` calendar date (pure calendar arithmetic). */
export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function calendarDaysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = to.split("-").map(Number) as [number, number, number];
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}
