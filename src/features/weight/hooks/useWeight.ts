"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { weightService } from "@/services/weight.service";

export const WEIGHT_KEY = ["weight"] as const;

export function useWeightEntries() {
  return useQuery({
    queryKey: WEIGHT_KEY,
    queryFn: () => weightService.list({ per_page: 90 }),
    staleTime: 60_000,
  });
}

export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: weightService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WEIGHT_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => weightService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WEIGHT_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] }); // keep dashboard weight stat fresh
    },
  });
}
