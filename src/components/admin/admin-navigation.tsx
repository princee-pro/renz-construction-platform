"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { signOutAction } from "@/app/admin/actions";
import { QuickFind } from "@/components/admin/quick-find";
import { PreviewRenzIdentity } from "@/components/site/preview-renz-identity";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { NotificationSummary } from "@/features/notifications/notification-contract";
import { groupedAdminNavigation, type AdminNavigationItem } from "@/lib/admin/navigation";

type AdminNavigationProps = Readonly<{
  displayName: string;
  roleLabel: string;
  items: readonly AdminNavigationItem[];
  /** null when the actor lacks notifications.read (no bell is rendered). */
  notifications: NotificationSummary | null | undefined;
}>;

const railStorageKey = "renz-admin-rail";

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/admin/finance") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * One consistent 16 px glyph set (D1.5 §23): functional strokes only,
 * keyed by route so `lib/admin/navigation.ts` stays a pure data module.
 */
const glyphs: Readonly<Record<string, ReactNode>> = {
  "/admin": <path d="M2 8.5 8 3l6 5.5V14H9.5v-4h-3v4H2z" />,
  "/admin/notifications": <path d="M4 11V7a4 4 0 0 1 8 0v4l1.5 1.5h-11zM6.5 14h3" />,
  "/admin/analytics": <path d="M2 14h12M4 11V7m4 4V4m4 7V6" />,
  "/admin/operations/leads": <path d="M2 3h12l-4.5 5.5V13l-3 1V8.5z" />,
  "/admin/operations/clients": (
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5.5 6a5.5 5.5 0 0 1 11 0" />
  ),
  "/admin/operations/projects": <path d="M2 14V6l6-3 6 3v8M6 14v-4h4v4" />,
  "/admin/operations/contractors": <path d="M3 13l3-3m0 0 5.5-5.5L13 6 7.5 11.5M6 10l2 2" />,
  "/admin/procurement/materials": <path d="M2 5l6-3 6 3-6 3zm0 0v6l6 3m0-6v6m6-9v6l-6 3" />,
  "/admin/procurement/suppliers": <path d="M2 12V5h8v7zm8-4h3l1 2v2h-4M4 14h1m6 0h1" />,
  "/admin/procurement/orders": <path d="M3 2h10v12H3zM6 6h4M6 9h4M6 12h2" />,
  "/admin/finance": <path d="M2 4h12v8H2zm3 4h.01M11 8h.01M8 6.5v3" />,
  "/admin/finance/invoices": <path d="M4 2h6l2 2v10H4zM6 7h4M6 10h4" />,
  "/admin/finance/contractor-payables": <path d="M2 4h12v8H2zM5 8h6" />,
  "/admin/website": <path d="M2 3h12v10H2zm0 3h12M5 3v3" />,
  "/admin/content/services": <path d="M2 3h12M2 7h8M2 11h12M2 15h6" />,
  "/admin/content/insights": <path d="M4 2h8v12H4zM6 5h4M6 8h4M6 11h2" />,
  "/admin/website/media": <path d="M2 3h12v10H2zm2 7 3-3 2 2 3-3 2 2M5 6h.01" />,
  "/admin/content/projects": <path d="M2 3h12v10H2zm2 7 3-3 2 2 3-3 2 2" />,
  "/admin/settings": (
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1v2m0 10v2M1 8h2m10 0h2" />
  ),
  "/admin/settings/launch-readiness": <path d="M8 2l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" />,
  "/admin/security": <path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4zm-2 6 1.5 1.5L10 6.5" />,
};

function Glyph({ href }: Readonly<{ href: string }>) {
  return (
    <svg aria-hidden="true" className="admin-nav-glyph" focusable="false" viewBox="0 0 16 16">
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      >
        {glyphs[href] ?? <circle cx="8" cy="8" r="2" />}
      </g>
    </svg>
  );
}

function currentSection(pathname: string, items: readonly AdminNavigationItem[]) {
  const matches = items.filter((item) => isCurrent(pathname, item.href));
  return matches.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

function NavigationList({
  items,
  onNavigate,
}: Readonly<{ items: readonly AdminNavigationItem[]; onNavigate?: () => void }>) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration">
      {groupedAdminNavigation(items).map(([group, groupItems]) => (
        <div className="admin-nav-group" key={group}>
          <p className="nav-section-label">
            <span>{group}</span>
          </p>
          <ul className="admin-nav-list">
            {groupItems.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    aria-current={current ? "page" : undefined}
                    className={current ? "admin-nav-link admin-nav-link-current" : "admin-nav-link"}
                    href={item.href}
                    title={item.label}
                    {...(onNavigate ? { onClick: onNavigate } : {})}
                  >
                    <Glyph href={item.href} />
                    <span className="admin-nav-text">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Account({ displayName, roleLabel }: Readonly<{ displayName: string; roleLabel: string }>) {
  return (
    <div className="admin-account">
      <div>
        <span className="admin-avatar" aria-hidden="true">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <p>
          <strong>{displayName}</strong>
          <span>{roleLabel}</span>
        </p>
      </div>
      <form action={signOutAction} data-navigation-form="true" noValidate>
        <button className="admin-sign-out" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}

/**
 * D1.5 admin shell (§21–§26): a desktop sidebar that collapses to a glyph
 * rail (preference kept in localStorage only), one operational top bar at
 * every width (section, Quick Find, bell, account) and a mobile drawer that
 * owns focus, scroll lock and a visible close. Routes, permissions and data
 * are unchanged.
 */
export function AdminNavigation({
  displayName,
  roleLabel,
  items,
  notifications,
}: AdminNavigationProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  // Lazy initial read keeps the preference out of the effect body; the
  // server renders the full sidebar and the client adopts the stored state.
  const [rail, setRail] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(railStorageKey) === "rail";
    } catch {
      return false;
    }
  });
  const section = currentSection(pathname, items);

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-admin-rail", rail);
    return () => document.documentElement.removeAttribute("data-admin-rail");
  }, [rail]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const sync = () => document.documentElement.classList.toggle("admin-drawer-open", dialog.open);
    dialog.addEventListener("close", sync);
    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    return () => {
      dialog.removeEventListener("close", sync);
      observer.disconnect();
      document.documentElement.classList.remove("admin-drawer-open");
    };
  }, []);

  function toggleRail(): void {
    setRail((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(railStorageKey, next ? "rail" : "full");
      } catch {
        // Preference storage is optional.
      }
      return next;
    });
  }

  return (
    <>
      <aside
        className="admin-sidebar"
        data-rail={rail ? "true" : undefined}
        suppressHydrationWarning
      >
        <div className="admin-navigation-content">
          <div className="admin-identity-row">
            <Link aria-label="RENZ Control Room" className="admin-identity-mark" href="/admin">
              <PreviewRenzIdentity decorative size={32} tone="dark" />
              <span className="admin-identity-text">
                <strong>RENZ</strong>
                <small>Control Room</small>
              </span>
            </Link>
            <button
              aria-label={rail ? "Expand navigation" : "Compact navigation"}
              aria-pressed={rail}
              className="admin-rail-toggle"
              onClick={toggleRail}
              type="button"
            >
              <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
                <path
                  d="M2 3h12M2 8h12M2 13h12"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.4"
                />
              </svg>
            </button>
          </div>
          <NavigationList items={items} />
          <Account displayName={displayName} roleLabel={roleLabel} />
        </div>
      </aside>

      <header className="admin-topbar">
        <button
          aria-label="Open administration menu"
          aria-haspopup="dialog"
          className="admin-menu-button"
          onClick={() => dialogRef.current?.showModal()}
          type="button"
        >
          <span aria-hidden="true" className="menu-glyph">
            <i />
            <i />
          </span>
          <span className="admin-menu-button-text">Menu</span>
        </button>
        <div className="admin-topbar-context">
          <span className="admin-topbar-brand">
            <PreviewRenzIdentity decorative size={22} tone="dark" />
            <strong>RENZ</strong>
          </span>
          <span className="admin-topbar-section">
            <small>{section?.group ?? "Control Room"}</small>
            <strong>{section?.label ?? "Overview"}</strong>
          </span>
        </div>
        <div className="admin-topbar-tools">
          <QuickFind />
          {notifications !== undefined ? (
            <NotificationBell compact initial={notifications} />
          ) : null}
          <span className="admin-topbar-account" title={`${displayName} · ${roleLabel}`}>
            <span className="admin-avatar" aria-hidden="true">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="admin-topbar-account-text">
              <strong>{displayName}</strong>
              <small>{roleLabel}</small>
            </span>
          </span>
        </div>
      </header>

      <dialog aria-label="Administration menu" className="admin-drawer" ref={dialogRef}>
        <div className="admin-drawer-panel">
          <div className="admin-drawer-head">
            <span className="admin-identity-mark">
              <PreviewRenzIdentity decorative size={28} tone="dark" />
              <span className="admin-identity-text">
                <strong>RENZ</strong>
                <small>Control Room</small>
              </span>
            </span>
            <button
              aria-label="Close administration menu"
              className="drawer-close"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <span aria-hidden="true">×</span>
              <span className="drawer-close-text">Close</span>
            </button>
          </div>
          <NavigationList items={items} onNavigate={() => dialogRef.current?.close()} />
          <Account displayName={displayName} roleLabel={roleLabel} />
        </div>
      </dialog>
    </>
  );
}
