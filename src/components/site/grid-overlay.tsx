"use client";

import { useEffect, useState } from "react";

/**
 * Surprise-me (D1 §97): press "g" anywhere outside a form field to toggle
 * the 12-column construction grid and the header datum over the page —
 * the same lines the layout was drawn on. Purely visual; nothing is stored.
 */
export function GridOverlay() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "g" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      setVisible((state) => !state);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!visible) return null;
  return (
    <div aria-hidden="true" className="grid-overlay">
      <div className="container grid-overlay-columns">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <span className="grid-overlay-label">Construction grid · press g to hide</span>
    </div>
  );
}
