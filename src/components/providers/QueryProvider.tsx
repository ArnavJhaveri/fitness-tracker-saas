"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * Wraps the app with TanStack Query context.
 *
 * QueryClient is created per-render (useState) so that each browser tab
 * gets its own cache and multiple test environments don't share state.
 *
 * Default config:
 * - staleTime 60 s   — avoids redundant fetches within a single session
 * - refetchOnWindowFocus true — when the user switches back to the tab (or
 *   picks up their phone after logging on desktop), stale queries are
 *   immediately refreshed from the server. This is the primary mechanism
 *   that keeps data in sync across multiple devices / tabs without needing
 *   WebSockets. All data lives in Supabase, so a refetch always reflects
 *   what every other device has written.
 * - retry 1 — surface real errors quickly; don't hammer a failing API
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            // Cross-device sync: when the user returns to this tab/window,
            // any query older than staleTime is re-fetched from the server.
            // Because all writes go to Supabase (single source of truth),
            // this guarantees Device B sees Device A's changes as soon as
            // the user switches focus — no WebSockets or polling required.
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
