"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { RenzIdentity } from "@/components/site/renz-identity";

const sessionKey = "renz-s9ap-opener-seen";

type OpenerState = "playing" | "leaving" | "complete";

function shouldBypassOpener(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  // R1 §53: under forced colours the drawn mark disappears and the opener
  // is a blank sheet for a second; go straight to the page.
  if (window.matchMedia("(forced-colors: active)").matches) return true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return true;
  const navigationEntry = performance.getEntriesByType("navigation")[0];
  if (navigationEntry && "type" in navigationEntry && navigationEntry.type === "back_forward") {
    return true;
  }

  try {
    return window.sessionStorage.getItem(sessionKey) === "true";
  } catch {
    return false;
  }
}

function recordOpenerSeen(): void {
  try {
    window.sessionStorage.setItem(sessionKey, "true");
  } catch {
    // Storage can be unavailable in privacy modes; the opener still remains skippable.
  }
}

export function BrandOpener() {
  const pathname = usePathname();
  const [state, setState] = useState<OpenerState>("playing");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname !== "/" || shouldBypassOpener()) {
      timerRef.current = setTimeout(() => setState("complete"), 0);
    } else {
      recordOpenerSeen();
      // Hold the complete identity, then dissolve within the existing 1.4 s budget.
      timerRef.current = setTimeout(() => {
        setState("leaving");
        timerRef.current = setTimeout(() => setState("complete"), 320);
      }, 1_050);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  function skip(): void {
    if (timerRef.current) clearTimeout(timerRef.current);
    recordOpenerSeen();
    setState("complete");
  }

  if (pathname !== "/" || state === "complete") return null;

  return (
    <div className="brand-opener" data-state={state}>
      <div className="brand-opener-stage" aria-hidden="true">
        <div className="brand-opener-lockup">
          <RenzIdentity size={920} tone="light" stacked decorative />
        </div>
      </div>
      <button className="brand-opener-skip" type="button" onClick={skip}>
        Skip intro
      </button>
    </div>
  );
}
