export function safeInternalRedirect(value: string | null | undefined, fallback = "/admin") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const candidate = new URL(value, "http://local.invalid");
    if (candidate.origin !== "http://local.invalid" || candidate.protocol !== "http:") {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return value;
}
