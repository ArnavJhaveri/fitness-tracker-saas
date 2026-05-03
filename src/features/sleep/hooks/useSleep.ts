"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sleepService } from "@/services/sleep.service";

export const SLEEP_KEY = ["sleep"] as const;

export function useSleepEntries() {
  return useQuery({
    queryKey: SLEEP_KEY,
    queryFn: () => sleepService.list({ per_page: 30 }),
    staleTime: 60_000,
  });
}

export function useLogSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sleepService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SLEEP_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof sleepService.update>[1] }) =>
      sleepService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SLEEP_KEY });
      // Updating duration changes daily sleep totals — keep analytics fresh
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sleepService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SLEEP_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
