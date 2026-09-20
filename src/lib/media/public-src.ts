/**
 * Storage-backed media is delivered by `/api/media/*` routes that answer with
 * a redirect to a short-lived signed URL (S4: never proxy private bytes).
 * The Next image optimizer does not follow redirects, so those sources are
 * rendered unoptimized (derivatives are already capped at 2400px); static
 * `/media/*` assets keep the optimizer.
 */
export function isApiMediaSrc(src: string): boolean {
  return src.startsWith("/api/media/");
}
