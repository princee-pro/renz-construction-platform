"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "renz-admin-getting-started-dismissed";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const tasks = [
  ["Add your first client", "/admin/operations/clients/new"],
  ["Create a project", "/admin/operations/projects/new"],
  ["Check the website contact details", "/admin/settings/business"],
  ["Create a staff account", "/admin/settings/staff"],
  ["Review the website content", "/admin/website"],
  ["Create an invoice", "/admin/finance/invoices/new"],
] as const;

/**
 * Owner "Getting started" (C10 §33): six links, dismissible once, remembered
 * in this browser (a preference, not data). Rendered as dismissed on the
 * server so it never flashes for a returning owner.
 */
export function GettingStarted() {
  const dismissed = useSyncExternalStore(subscribe, read, () => true);
  if (dismissed) return null;
  function dismiss(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    for (const listener of listeners) listener();
  }
  return (
    <section aria-labelledby="getting-started-heading" className="admin-panel getting-started">
      <div className="section-heading-row section-heading-compact">
        <h2 id="getting-started-heading">Getting started</h2>
        <button className="button button-quiet" onClick={dismiss} type="button">
          Dismiss
        </button>
      </div>
      <p className="panel-copy">
        Six things most owners do first. You can hide this list at any time.
      </p>
      <ol className="getting-started-list">
        {tasks.map(([label, href]) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
