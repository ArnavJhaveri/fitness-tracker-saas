"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { waterService } from "@/services/water.service";
import type { WaterEntry } from "@/types/database";

/** Local calendar date as "YYYY-MM-DD" — correct in all timezones. */
function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Local midnight ISO string for start-of-day filtering. */
function startOfLocalDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Local end-of-day ISO string for end-of-day filtering. */
function endOfLocalDay(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

const today = () => localDateStr();

export const WATER_KEY = ["water"] as const;

export function useWaterEntries() {
  const date = today();
  return useQuery({
    queryKey: [...WATER_KEY, date],
    // Use local midnight/end-of-day so entries logged in non-UTC timezones
    // still appear under the correct local calendar date
    queryFn: () =>
      waterService.list({ from: startOfLocalDay(), to: endOfLocalDay(), per_page: 100 }),
    staleTime: 30_000,
  });
}

/** Sum of ml logged today. */
export function useTodayWaterTotal() {
  const { data, ...rest } = useWaterEntries();
  const total = data?.reduce((sum, e) => sum + e.amount_ml, 0) ?? 0;
  return { total, entries: data ?? [], ...rest };
}

export function useLogWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount_ml: number) =>
      waterService.create({ amount_ml, logged_at: new Date().toISOString() }),
    // Optimistic update: feel instant even on slow connections.
    // The cache key is captured once in onMutate and threaded through ctx so
    // that onError/onSettled use the *same* key even if the date rolls over
    // at midnight between the mutation firing and the callback running.
    onMutate: async (amount_ml) => {
      const key = [...WATER_KEY, today()]; // capture key at mutation time
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<WaterEntry[]>(key);
      qc.setQueryData<WaterEntry[]>(key, (old = []) => [
        ...old,
        {
          id: `optimistic-${Date.now()}`,
          user_id: "",
          amount_ml,
          logged_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
      return { prev, key }; // thread key through context
    },
    onError: (_err, _vars, ctx) => {
      // Roll back using the same key captured at mutation time.
      // Only restore if we had a previous value — don't overwrite a valid
      // cache with undefined if the query hadn't loaded yet when we mutated.
      if (ctx?.prev !== undefined) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_d, _e, _v, ctx) => {
      // Invalidate the specific day key + analytics; fall back to full WATER_KEY
      qc.invalidateQueries({ queryKey: ctx?.key ?? WATER_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => waterService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WATER_KEY });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
