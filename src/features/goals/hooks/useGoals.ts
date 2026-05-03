"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsService } from "@/services/goals.service";

export const GOALS_KEY = ["goals"] as const;

export function useGoals(status?: string) {
  return useQuery({
    queryKey: [...GOALS_KEY, status],
    queryFn: () => goalsService.list(status),
    staleTime: 60_000,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS_KEY }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof goalsService.update>[1] }) =>
      goalsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS_KEY }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS_KEY }),
  });
}
