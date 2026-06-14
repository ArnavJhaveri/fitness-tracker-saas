"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { weightService } from "@/services/weight.service";
import { queryKeys, invalidateWithAnalytics } from "@/lib/query-keys";

/** @deprecated Use `queryKeys.weight()` from `@/lib/query-keys` instead. */
export const WEIGHT_KEY = queryKeys.weight();

export function useWeightEntries() {
  return useQuery({
    queryKey: queryKeys.weight(),
    queryFn: () => weightService.list({ per_page: 90 }),
    staleTime: 60_000,
  });
}

export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: weightService.create,
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.weight());
    },
  });
}

export function useDeleteWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => weightService.delete(id),
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.weight());
    },
  });
}
