import localFont from "next/font/local";

/**
 * D1.6 typography (self-hosted, subset, variable). One public family:
 * Manrope carries display and body (the client asked for a clean, geometric,
 * very readable face; Manrope won the D1.6 audition on actual pixels). IBM
 * Plex Mono remains only for tiny technical labels: indices, measurements,
 * drawing references. Exposed as CSS variables on <html>; `--font-display`
 * and `--font-body` are kept as names so every existing sheet keeps working.
 */
export const sansFont = localFont({
  src: "../fonts/manrope.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "200 800",
  style: "normal",
  fallback: ["Segoe UI", "Arial", "sans-serif"],
});

export const monoFont = localFont({
  src: [
    { path: "../fonts/plexmono.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plexmono-medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  fallback: ["Consolas", "Courier New", "monospace"],
});

export const fontClassName = `${sansFont.variable} ${monoFont.variable}`;
