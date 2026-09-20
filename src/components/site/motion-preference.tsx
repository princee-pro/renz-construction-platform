"use client";

import { useEffect } from "react";

/**
 * Mirrors prefers-reduced-motion onto the public root as data-motion so
 * styles, tests and analytics can read one authoritative state. Reduced
 * motion always shows final states (D1 §54).
 */
export function MotionPreference() {
  useEffect(() => {
    const root = document.getElementById("site-top");
    if (!root) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => root.setAttribute("data-motion", query.matches ? "reduced" : "full");
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return null;
}
