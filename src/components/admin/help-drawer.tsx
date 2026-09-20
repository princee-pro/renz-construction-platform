"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { helpFor } from "@/lib/admin/help-content";
import { summariseCapabilities } from "@/lib/auth/capabilities";

/**
 * The "?" control in the Admin shell (C10 §29–31, §128, §159): a native
 * dialog drawer that knows the current route, explains the page in plain
 * English, adds permission-aware notes for what this staff member cannot do
 * here, and shows "Your access". Opens only when asked; never a popup.
 */
export function HelpDrawer({
  permissions,
  roleLabel,
}: Readonly<{ permissions: readonly string[]; roleLabel: string }>) {
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const entry = helpFor(pathname);
  const set = new Set(permissions);
  const missing = entry.permissionNotes.filter((note) => !set.has(note.permission));
  const access = summariseCapabilities(permissions).filter((group) => group.can.length > 0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label="Help for this page"
        className="admin-help-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span aria-hidden="true">?</span>
        <span className="admin-help-button-text">Help</span>
      </button>
      <dialog
        aria-labelledby="admin-help-title"
        className="admin-help-drawer"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        ref={ref}
      >
        {open ? (
          <div className="admin-help-panel">
            <header className="admin-help-head">
              <p className="eyebrow">Help · {entry.title}</p>
              <button className="admin-help-close" onClick={() => setOpen(false)} type="button">
                Close <span aria-hidden="true">×</span>
              </button>
            </header>
            <h2 id="admin-help-title">What this page is for</h2>
            <p>{entry.purpose}</p>
            {entry.actions.length > 0 ? (
              <>
                <h3>What you can do here</h3>
                <ul>
                  {entry.actions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {entry.nextSteps.length > 0 ? (
              <>
                <h3>Common next steps</h3>
                <ul>
                  {entry.nextSteps.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {entry.publicEffect ? (
              <>
                <h3>What changes the public website</h3>
                <p>{entry.publicEffect}</p>
              </>
            ) : null}
            {entry.cautions.length > 0 ? (
              <>
                <h3>Take care</h3>
                <ul>
                  {entry.cautions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {missing.length > 0 ? (
              <section aria-labelledby="admin-help-limits" className="admin-help-limits">
                <h3 id="admin-help-limits">On this page, your role</h3>
                <ul>
                  {missing.map((note) => (
                    <li key={note.permission}>{note.without}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section aria-labelledby="admin-help-access" className="admin-help-access">
              <h3 id="admin-help-access">Your access</h3>
              <p>
                <strong>{roleLabel}</strong>
              </p>
              <ul>
                {access.map((group) => (
                  <li key={group.group}>
                    <strong>{group.group}:</strong> can {group.can.join(", ")}.
                  </li>
                ))}
              </ul>
              <p className="field-help">
                Full detail: <Link href="/admin/security">Security → Your access</Link>.
                {entry.guide ? ` Guide: ${entry.guide}` : ""}
              </p>
            </section>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
