"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sleepService } from "@/services/sleep.service";
import { queryKeys, invalidateWithAnalytics } from "@/lib/query-keys";

/** @deprecated Use `queryKeys.sleep()` from `@/lib/query-keys` instead. */
export const SLEEP_KEY = queryKeys.sleep();

export function useSleepEntries() {
  return useQuery({
    queryKey: queryKeys.sleep(),
    queryFn: () => sleepService.list({ per_page: 30 }),
    staleTime: 60_000,
  });
}

export function useLogSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sleepService.create,
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.sleep());
    },
  });
}

export function useDeleteSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sleepService.delete(id),
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.sleep());
    },
  });
}
