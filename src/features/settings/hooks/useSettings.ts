"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "@/lib/query-keys";

/** @deprecated Use `queryKeys.settings()` from `@/lib/query-keys` instead. */
export const SETTINGS_KEY = queryKeys.settings();

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: () => settingsService.get(),
    staleTime: 5 * 60_000, // settings change rarely
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: settingsService.update,
    onSuccess: (updated) => {
      // Write updated data directly into the cache — no refetch needed
      qc.setQueryData(queryKeys.settings(), updated);
    },
  });
}
