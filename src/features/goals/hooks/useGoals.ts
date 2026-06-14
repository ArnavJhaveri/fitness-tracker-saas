"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsService } from "@/services/goals.service";
import { queryKeys, invalidateWithAnalytics } from "@/lib/query-keys";

/** @deprecated Use `queryKeys.goals()` from `@/lib/query-keys` instead. */
export const GOALS_KEY = queryKeys.goals();

export function useGoals(status?: string) {
  return useQuery({
    queryKey: queryKeys.goals_filtered(status),
    queryFn: () => goalsService.list(status),
    staleTime: 60_000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsService.create,
    onSuccess: () => {
      // Goals feed into the analytics adherence score — invalidate both.
      invalidateWithAnalytics(qc, queryKeys.goals());
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof goalsService.update>[1] }) =>
      goalsService.update(id, data),
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.goals());
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsService.delete(id),
    onSuccess: () => {
      invalidateWithAnalytics(qc, queryKeys.goals());
    },
  });
}
