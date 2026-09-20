"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PreviewRenzIdentity } from "@/components/site/preview-renz-identity";

const sessionKey = "renz-s9ap-opener-seen";

type OpenerState = "playing" | "leaving" | "complete";

function shouldBypassOpener(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
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
      // 1.05 s of MEASURE → ASSEMBLE → LOCK, then a 0.3 s RESOLVE lift-off.
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
      <span aria-hidden="true" className="brand-opener-grid" />
      <div className="brand-opener-stage" aria-hidden="true">
        <span className="brand-opener-datum" />
        <div className="brand-opener-lockup">
          <span className="brand-opener-mark">
            <PreviewRenzIdentity size={96} tone="dark" decorative />
          </span>
          <span className="brand-opener-word">
            <span>RENZ</span>
            <small>Construction Services Ltd</small>
          </span>
        </div>
        <span className="brand-opener-caption">From land to landmark</span>
      </div>
      <button className="brand-opener-skip" type="button" onClick={skip}>
        Skip intro
      </button>
    </div>
  );
}
