#!/usr/bin/env bash
# Runs one Playwright suite, retrying once if the Supabase reset in global setup hiccups.
spec="$1"; log=".playwright/d1-$(basename "$spec" .spec.ts).log"
for attempt in 1 2; do
  corepack pnpm exec playwright test "$spec" > "$log" 2>&1
  if grep -q "fixture reset failed\|container is not ready" "$log"; then sleep 20; continue; fi
  break
done
grep -E "^  [0-9]+ (passed|failed|did not run|flaky|skipped)" "$log"
