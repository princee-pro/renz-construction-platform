"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Field } from "@/components/admin/ui/field";
import { searchPartnersAction } from "@/features/partners/partner-actions";
import {
  availabilityLabels,
  type PartnerCapability,
  type PartnerPickerEntry,
} from "@/features/partners/partner-contract";

/** Bounded, capability-filtered trade-partner picker (contractor or supplier). */
export function PartnerPickerField({
  capability,
  name,
  label,
  initialId,
  initialLabel,
  error,
  onSelect,
}: Readonly<{
  capability: PartnerCapability;
  name: string;
  label: string;
  initialId?: string | undefined;
  initialLabel?: string | undefined;
  error?: string | undefined;
  onSelect?: ((entry: PartnerPickerEntry | null) => void) | undefined;
}>) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [selectedId, setSelectedId] = useState(initialId ?? "");
  const [results, setResults] = useState<readonly PartnerPickerEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputId = `${name}-query`;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchPartnersAction(capability, query));
      });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, capability]);

  return (
    <Field error={error} hint={`Search an active ${capability}.`} id={inputId} label={label}>
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
                  setQuery(entry.display_name);
                  setOpen(false);
                  onSelect?.(entry);
                }}
                type="button"
              >
                <strong>{entry.display_name}</strong>
                <span>
                  {entry.company_name ?? "No company"}
                  {capability === "contractor"
                    ? ` · ${availabilityLabels[entry.availability_status]}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!selectedId && query.trim() !== "" ? (
        <p className="field-help">Select a {capability} from the list.</p>
      ) : null}
    </Field>
  );
}
