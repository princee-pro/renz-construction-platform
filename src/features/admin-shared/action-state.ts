import { z } from "zod";

/** Shared server-action result shape for the C4 Clients + Operational Projects domains. */
export type AdminActionState = Readonly<{
  status: "idle" | "error" | "success" | "conflict" | "reauth";
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
  currentVersion: number | null;
  reauthHref: string | null;
  /** Id of a record a create action produced, so the form can land on it. */
  createdId: string | null;
  /** One-shot payload a command hands back exactly once (e.g. a freshly generated share token). */
  detail: string | null;
}>;

export const initialAdminActionState: AdminActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  currentVersion: null,
  reauthHref: null,
  createdId: null,
  detail: null,
};

export function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function formNumber(formData: FormData, key: string): number {
  const value = Number(formText(formData, key));
  return Number.isFinite(value) ? value : Number.NaN;
}

export function formOptionalText(formData: FormData, key: string): string | null {
  const value = formText(formData, key).trim();
  return value === "" ? null : value;
}

export function zodFieldErrors(error: z.ZodError): Readonly<Record<string, string>> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fields[field] ??= issue.message;
  }
  return fields;
}

const safePlainText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `Keep this field to ${maximum.toLocaleString("en")} characters or fewer.`)
    .refine((value) => !/[<>]/u.test(value), "Markup is not accepted in this field.")
    .refine(
      (value) => !/(?:javascript\s*:|data\s*:\s*text\/html|vbscript\s*:)/iu.test(value),
      "Executable protocols are not accepted in this field.",
    );

export const requiredText = (minimum: number, maximum: number) =>
  safePlainText(maximum).pipe(
    z
      .string()
      .min(minimum, minimum === 1 ? "Enter a value." : `Enter at least ${minimum} characters.`),
  );

export const optionalText = (maximum: number) =>
  safePlainText(maximum).transform((value) => (value === "" ? null : value));

/**
 * R1 §49: a server action that cannot reach the server (offline, dropped
 * connection, deploy in progress) rejects with a network error; React then
 * surfaces it to the route error boundary and the operator's unsaved edits
 * disappear. Wrapped through this guard the failure becomes an ordinary
 * error state on the form: nothing was sent, every value stays, and the
 * operator can press the button again once the connection is back.
 */
const unreachableMessage =
  "The server could not be reached, so nothing was saved. Check your connection and try again.";

export function guardAction<
  State extends { status: "idle" | "error" | "success" | "conflict" | "reauth"; message: string },
  Payload = FormData,
>(
  action: (previous: State, payload: Payload) => Promise<State>,
): (previous: State, payload: Payload) => Promise<State> {
  return async (previous, payload) => {
    try {
      return await action(previous, payload);
    } catch {
      return { ...previous, status: "error", message: unreachableMessage, fieldErrors: {} };
    }
  };
}
