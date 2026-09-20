"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { quickFindAction } from "@/features/operational-projects/project-actions";
import type { QuickFindResult } from "@/features/operational-projects/project-contract";

const kindLabel: Readonly<Record<QuickFindResult[number]["kind"], string>> = {
  lead: "LEAD",
  client: "CLIENT",
  project: "PROJECT",
  invoice: "INVOICE",
  contractor: "CONTRACTOR",
  supplier: "SUPPLIER",
  material: "MATERIAL",
  purchase_order: "PURCHASE ORDER",
  case_study: "CASE STUDY",
  setting: "SETTING",
  page: "PAGE",
  service: "SERVICE",
  insight: "INSIGHT",
};

const settingHrefs: Readonly<Record<string, string>> = {
  "00000000-0000-4000-8000-0000000000a1": "/admin/settings/business",
  "00000000-0000-4000-8000-0000000000a2": "/admin/settings/business?section=contact",
  "00000000-0000-4000-8000-0000000000a3": "/admin/settings/website",
  "00000000-0000-4000-8000-0000000000a4": "/admin/settings/website?section=seo",
  "00000000-0000-4000-8000-0000000000a5": "/admin/settings/legal",
  "00000000-0000-4000-8000-0000000000a6": "/admin/settings/system",
  "00000000-0000-4000-8000-0000000000a7": "/admin/settings/launch-readiness",
  "00000000-0000-4000-8000-0000000000a8": "/admin/settings/staff",
};

function kindHref(kind: QuickFindResult[number]["kind"], id: string): string {
  if (kind === "lead") return `/admin/operations/leads/${id}`;
  if (kind === "client") return `/admin/operations/clients/${id}`;
  if (kind === "project") return `/admin/operations/projects/${id}`;
  if (kind === "invoice") return `/admin/finance/invoices/${id}`;
  if (kind === "contractor") return `/admin/operations/contractors/${id}`;
  if (kind === "supplier") return `/admin/procurement/suppliers/${id}`;
  if (kind === "material") return `/admin/procurement/materials/${id}`;
  if (kind === "purchase_order") return `/admin/procurement/orders/${id}`;
  if (kind === "setting") return settingHrefs[id] ?? "/admin/settings";
  if (kind === "page") return `/admin/website/pages/${id}`;
  if (kind === "service") return `/admin/content/services/${id}`;
  if (kind === "insight") return `/admin/content/insights/${id}`;
  return `/admin/content/projects/${id}`;
}

export function QuickFind() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuickFindResult>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuery("");
        setResults([]);
        dialogRef.current?.showModal();
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) return;
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const matches = await quickFindAction(query);
        setResults(matches);
      });
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const visibleResults = query.trim().length < 2 ? [] : results;
  // D1.5 §32: results grouped by kind in a fixed operational order; the
  // flat order (for arrow-key navigation) follows the groups.
  const groupOrder: readonly QuickFindResult[number]["kind"][] = [
    "lead",
    "client",
    "project",
    "invoice",
    "contractor",
    "supplier",
    "material",
    "purchase_order",
    "case_study",
    "page",
    "service",
    "insight",
    "setting",
  ];
  const groups = groupOrder
    .map((kind) => [kind, visibleResults.filter((result) => result.kind === kind)] as const)
    .filter(([, entries]) => entries.length > 0);
  const ordered = groups.flatMap(([, entries]) => entries);
  const [activeIndex, setActiveIndex] = useState(0);
  const boundedIndex = Math.min(activeIndex, Math.max(ordered.length - 1, 0));

  function open(href: string) {
    dialogRef.current?.close();
    router.push(href);
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (ordered.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((boundedIndex + 1) % ordered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((boundedIndex - 1 + ordered.length) % ordered.length);
    } else if (event.key === "Enter" && document.activeElement === inputRef.current) {
      const target = ordered[boundedIndex];
      if (target) {
        event.preventDefault();
        open(kindHref(target.kind, target.id));
      }
    }
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label="Quick find"
        className="admin-quick-find-trigger"
        onClick={() => {
          setQuery("");
          setResults([]);
          dialogRef.current?.showModal();
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="admin-quick-find-glyph"
          focusable="false"
          viewBox="0 0 20 20"
        >
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12.8 12.8 17 17"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
        <span>Quick Find</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog aria-label="Quick find" className="admin-quick-find-dialog" ref={dialogRef}>
        <div className="admin-quick-find-panel" onKeyDown={onListKeyDown}>
          <p className="admin-quick-find-label">
            <span>Quick Find</span>
            <kbd>↑ ↓ to move · Enter to open · Esc to close</kbd>
          </p>
          <input
            aria-label="Search clients, projects, and case studies"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search leads, clients, projects, invoices, orders, settings…"
            ref={inputRef}
            type="text"
            value={query}
          />
          <ul role="listbox" aria-label="Results">
            {groups.map(([kind, entries]) => (
              <li className="admin-quick-find-group" key={kind} role="presentation">
                <p className="admin-quick-find-group-label">
                  {kindLabel[kind]}
                  <span>{entries.length}</span>
                </p>
                <ul role="presentation">
                  {entries.map((result) => {
                    const position = ordered.indexOf(result);
                    return (
                      <li
                        aria-selected={position === boundedIndex}
                        key={`${result.kind}-${result.id}`}
                        role="option"
                      >
                        <button
                          data-active={position === boundedIndex ? "true" : undefined}
                          onClick={() => open(kindHref(result.kind, result.id))}
                          onMouseEnter={() => setActiveIndex(position)}
                          tabIndex={-1}
                          type="button"
                        >
                          <span className="admin-quick-find-kind">{kindLabel[result.kind]}</span>
                          <span>
                            <strong>{result.label}</strong>
                            {result.detail ? <em>{result.detail}</em> : null}
                          </span>
                          <span aria-hidden="true" className="admin-quick-find-enter">
                            ↵
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          {query.trim().length >= 2 && visibleResults.length === 0 ? (
            <p className="admin-quick-find-empty">No matches.</p>
          ) : null}
          <button
            aria-label="Close quick find"
            className="admin-quick-find-close"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            ×
          </button>
        </div>
      </dialog>
    </>
  );
}
