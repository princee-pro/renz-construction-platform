"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/admin/ui/field";
import {
  searchProjectsForProcurementAction,
  type ProcurementProjectEntry,
} from "@/features/procurement/procurement-actions";

/** Bounded active-project picker for the supplier-first purchase order flow. */
export function ProcurementProjectPicker({
  error,
  onSelect,
}: Readonly<{
  error?: string | undefined;
  onSelect?: ((entry: ProcurementProjectEntry | null) => void) | undefined;
}>) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState<readonly ProcurementProjectEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchProjectsForProcurementAction(query));
      });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <Field
      error={error}
      hint="Search an active operational project. Approved requirements load once chosen."
      id="projectQuery"
      label="Project"
    >
      <input
        autoComplete="off"
        id="projectQuery"
        onChange={(event) => {
          setQuery(event.target.value);
          if (selectedId) onSelect?.(null);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        type="text"
        value={query}
      />
      <input name="projectId" type="hidden" value={selectedId} />
      {open && results.length > 0 ? (
        <ul className="client-picker-results" role="listbox">
          {results.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => {
                  setSelectedId(entry.id);
                  setQuery(entry.title);
                  setOpen(false);
                  onSelect?.(entry);
                }}
                type="button"
              >
                <strong>{entry.title}</strong>
                <span>{entry.client}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}
