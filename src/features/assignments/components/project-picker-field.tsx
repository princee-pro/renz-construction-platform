"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/admin/ui/field";
import {
  searchActiveProjectsAction,
  type ProjectPickerEntry,
} from "@/features/assignments/assignment-actions";

/** Bounded active-project picker for the contractor-first assignment flow. */
export function ProjectPickerField({ error }: Readonly<{ error?: string | undefined }>) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [results, setResults] = useState<readonly ProjectPickerEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchActiveProjectsAction(query));
      });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <Field
      error={error}
      hint="Search an active operational project."
      id="projectQuery"
      label="Project"
    >
      <input
        autoComplete="off"
        id="projectQuery"
        onChange={(event) => {
          setQuery(event.target.value);
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
