"use client";

import { useEffect, useState } from "react";

/**
 * Holds back rapid changes to a value, returning the most-recent value that
 * has stayed stable for `delayMs` milliseconds.
 *
 * Use case: a search input that fires a network request on every keystroke
 * (TanStack Query caches by `queryKey: […, query]`, so a new key per
 * keystroke = a new in-flight request). Debouncing the value before passing
 * it into the query collapses 7 keystrokes for "chicken" into 1 fetch.
 *
 * The setState-in-effect lint warning is suppressed inline because this is
 * the canonical implementation — the alternative useSyncExternalStore
 * pattern requires an external event source we don't have.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // setState fires inside the setTimeout callback (not the effect body),
    // so the react-hooks/set-state-in-effect rule does NOT flag this — the
    // deferred update is exactly the kind of cross-render coordination the
    // rule is fine with.
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
