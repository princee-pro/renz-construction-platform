"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Optimistic-concurrency edit session for a versioned admin record (C4 §39).
 *
 * The `expected_version` a full edit form submits is pinned to the version
 * the form was OPENED with — never to whatever the page happens to hold
 * later. This matters because the Control Room refreshes Server Component
 * props under an open form whenever another staff member saves (realtime
 * invalidation): without pinning, the hidden version would silently advance
 * to theirs while the visible inputs still carried this actor's stale values,
 * and the next save would overwrite the other person's work with no conflict.
 *
 * The pin only advances through `reloadLatest()`, which re-fetches the route
 * and then remounts the form (`formKey`) so its defaults are the fresh record.
 */
export function usePinnedEdit(
  recordVersion: number,
  savedVersion: number | null,
): Readonly<{
  editing: boolean;
  openEdit: () => void;
  closeEdit: () => void;
  pinnedVersion: number;
  formKey: number;
  reloadLatest: () => void;
  reloading: boolean;
  /** True when the record changed underneath an open form. */
  outdated: boolean;
}> {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pinnedVersion, setPinnedVersion] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [reloadRequested, setReloadRequested] = useState(false);
  const [reloading, startReload] = useTransition();

  const currentVersion = Math.max(recordVersion, savedVersion ?? 0);

  // When the requested reload settles — the transition ends, or the fresh
  // record has already arrived — re-pin to it and remount the form (state
  // adjusted during render, not in an effect).
  const [prevReloading, setPrevReloading] = useState(reloading);
  const [prevRecordVersion, setPrevRecordVersion] = useState(recordVersion);
  const transitionSettled = reloading !== prevReloading && !reloading;
  const recordArrived = recordVersion !== prevRecordVersion;
  if (reloading !== prevReloading) setPrevReloading(reloading);
  if (recordArrived) setPrevRecordVersion(recordVersion);
  if (reloadRequested && (transitionSettled || recordArrived)) {
    setPinnedVersion(recordVersion);
    setFormKey((key) => key + 1);
    setReloadRequested(false);
  }

  return {
    editing,
    openEdit: () => {
      setPinnedVersion(currentVersion);
      setFormKey((key) => key + 1);
      setEditing(true);
    },
    closeEdit: () => {
      setEditing(false);
      setPinnedVersion(null);
    },
    pinnedVersion: pinnedVersion ?? currentVersion,
    formKey,
    reloadLatest: () => {
      setReloadRequested(true);
      startReload(() => router.refresh());
    },
    reloading,
    outdated: editing && pinnedVersion !== null && recordVersion > pinnedVersion,
  };
}
