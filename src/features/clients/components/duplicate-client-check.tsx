"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { checkDuplicateClientsAction } from "@/features/clients/client-actions";

type DuplicateMatch = Readonly<{
  id: string;
  full_name: string;
  company: string | null;
  email: string | null;
  phone_display: string | null;
  archived_at: string | null;
  match_reason: string;
}>;

/**
 * Bounded, non-blocking duplicate awareness (C4 §10). Debounced client-side
 * lookup against the same clients.read-gated RPC the register uses; never
 * blocks submission and never auto-merges — it only shows enough context for
 * a human to decide whether this is genuinely a new client.
 */
export function DuplicateClientCheck({
  fullName,
  email,
  phone,
  excludeId,
}: Readonly<{ fullName: string; email: string; phone: string; excludeId?: string }>) {
  const [matches, setMatches] = useState<readonly DuplicateMatch[]>([]);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const result = await checkDuplicateClientsAction(fullName, email, phone, excludeId);
        setMatches(result);
      });
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fullName, email, phone, excludeId]);

  if (matches.length === 0) return null;

  return (
    <div className="duplicate-client-panel" role="status">
      <p className="section-kicker">Possible existing clients</p>
      <ul>
        {matches.map((match) => (
          <li key={match.id}>
            <strong>{match.full_name}</strong>
            <span>
              {match.company ?? "No company"} · matched by {match.match_reason}
              {match.archived_at ? " · archived" : ""}
            </span>
            <span>{match.email ?? match.phone_display ?? "No contact on file"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
