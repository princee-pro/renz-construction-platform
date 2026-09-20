"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/admin/ui/field";
import { searchMaterialsAction } from "@/features/procurement/procurement-actions";
import type { MaterialPickerEntry } from "@/features/procurement/procurement-contract";

/** Bounded catalog material picker; selecting one is optional (free text stays allowed). */
export function MaterialPickerField({
  name,
  label,
  initialId,
  initialLabel,
  error,
  hint,
  onSelect,
}: Readonly<{
  name: string;
  label: string;
  initialId?: string | undefined;
  initialLabel?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  onSelect?: ((entry: MaterialPickerEntry | null) => void) | undefined;
}>) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [selectedId, setSelectedId] = useState(initialId ?? "");
  const [results, setResults] = useState<readonly MaterialPickerEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputId = `${name}-query`;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchMaterialsAction(query));
      });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <Field
      error={error}
      hint={hint ?? "Optional. Search the catalog, or leave blank for a free-text item."}
      id={inputId}
      label={label}
    >
      <input
        autoComplete="off"
        id={inputId}
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
      <input name={name} type="hidden" value={selectedId} />
      {open && results.length > 0 ? (
        <ul className="client-picker-results" role="listbox">
          {results.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => {
                  setSelectedId(entry.id);
                  setQuery(entry.name);
                  setOpen(false);
                  onSelect?.(entry);
                }}
                type="button"
              >
                <strong>{entry.name}</strong>
                <span>
                  {entry.internal_code ?? "No code"} · {entry.default_unit}
                  {entry.category ? ` · ${entry.category}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}
