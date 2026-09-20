"use client";

import { useState, type ChangeEvent } from "react";

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Controlled edit-form values for a versioned admin record.
 *
 * React 19 resets an uncontrolled `<form action>` after its Server Action
 * settles, which would silently replace what a staff member typed with the
 * (possibly newer) server values the moment a save is rejected as a version
 * conflict. Holding the draft here keeps their edits on screen through a
 * conflict (C4 §39); `resetKey` re-seeds the draft from the record when the
 * form is (re)opened or explicitly reloaded.
 */
export function useDraftFields(
  initial: Readonly<Record<string, string>>,
  resetKey: number,
): Readonly<{
  values: Readonly<Record<string, string>>;
  field: (name: string) => Readonly<{
    name: string;
    value: string;
    onChange: (event: ChangeEvent<FieldElement>) => void;
  }>;
}> {
  const [values, setValues] = useState(initial);
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setValues(initial);
  }
  return {
    values,
    field: (name) => ({
      name,
      value: values[name] ?? "",
      onChange: (event) => {
        const next = event.target.value;
        setValues((current) => ({ ...current, [name]: next }));
      },
    }),
  };
}
