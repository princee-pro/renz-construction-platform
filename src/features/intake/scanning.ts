import "server-only";

import type { IntakeMimeType } from "@/features/intake/intake-policy";

/**
 * Malware-scanning adapter boundary (C8 §35). C8 ships no scanner: every
 * attachment stays in private quarantine as `pending_review` until a staff
 * member marks it safe or rejected in Lead 360. C10 may register a real
 * adapter here (and flip the readiness check) without touching the intake
 * flow. Nothing here installs or calls an external service.
 */
export type ScanVerdict = "pending_review" | "safe" | "rejected";

export type IntakeScanner = Readonly<{
  name: string;
  configured: boolean;
  scan(bytes: Uint8Array, mime: IntakeMimeType): Promise<ScanVerdict>;
}>;

const noScanner: IntakeScanner = {
  name: "none",
  configured: false,
  scan() {
    return Promise.resolve<ScanVerdict>("pending_review");
  },
};

export function getIntakeScanner(): IntakeScanner {
  // Future adapters select on INTAKE_SCANNER; "none" is the only C8 value.
  return noScanner;
}
