"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";

export const SETTINGS_KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
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
      qc.setQueryData(SETTINGS_KEY, updated);
    },
  });
}
