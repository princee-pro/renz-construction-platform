"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/admin/ui/field";
import { searchActiveClientsAction } from "@/features/clients/client-actions";

type PickerEntry = Readonly<{ id: string; full_name: string; company: string | null }>;

export function ClientPickerField({
  initialClientId,
  initialClientLabel,
  error,
  onSelect,
}: Readonly<{
  initialClientId?: string | undefined;
  initialClientLabel?: string | undefined;
  error?: string | undefined;
  /** Notifies the host form when the selection changes (null when cleared). */
  onSelect?: ((entry: PickerEntry | null) => void) | undefined;
}>) {
  const [query, setQuery] = useState(initialClientLabel ?? "");
  const [selectedId, setSelectedId] = useState(initialClientId ?? "");
  const [results, setResults] = useState<readonly PickerEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const matches = await searchActiveClientsAction(query);
        setResults(matches);
      });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <Field error={error} hint="Search an existing active client." id="clientQuery" label="Client">
      <input
        autoComplete="off"
        id="clientQuery"
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
      <input name="clientId" type="hidden" value={selectedId} />
      {open && results.length > 0 ? (
        <ul className="client-picker-results" role="listbox">
          {results.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => {
                  setSelectedId(entry.id);
                  setQuery(entry.full_name);
                  setOpen(false);
                  onSelect?.(entry);
                }}
                type="button"
              >
                <strong>{entry.full_name}</strong>
                <span>{entry.company ?? "No company"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!selectedId && query.trim() !== "" ? (
        <p className="field-help">Select a client from the list to attach this project.</p>
      ) : null}
    </Field>
  );
}
