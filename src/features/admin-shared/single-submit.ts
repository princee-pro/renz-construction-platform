"use client";

import { useEffect, useRef, type FormEvent } from "react";

/**
 * Double-submit guard (C10 §18). React queues a second form submission behind
 * a pending action and then runs it, which would create a second client /
 * project / order. The guard blocks any submission while one is in flight
 * (double click, Enter twice, impatient retry) and releases once the action
 * settles. Server-side invariants (unique numbering, versioned facades)
 * remain the authority; this removes the accidental duplicates at the source.
 */
export function useSingleSubmit(pending: boolean): {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
} {
  const locked = useRef(false);
  useEffect(() => {
    if (!pending) locked.current = false;
  }, [pending]);
  return {
    onSubmit(event) {
      if (locked.current || pending) {
        event.preventDefault();
        return;
      }
      locked.current = true;
    },
  };
}
