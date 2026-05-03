"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { localDateStr } from "@/lib/utils/date";
import type { DailySummary } from "@/types/database";

export function useAnalytics(from?: string, to?: string) {
  return useQuery<DailySummary[]>({
    queryKey: ["analytics", "daily", from, to],
    queryFn: () => analyticsService.daily(from, to),
    staleTime: 60_000,
  });
}

/** Convenience: today's single row. */
export function useTodaySummary() {
  const today = localDateStr();
  const { data, ...rest } = useAnalytics(today, today);
  return { today: data?.[0] ?? null, ...rest };
}

/** Last 30 days for dashboard/analytics pages. */
export function useThirtyDaySummary() {
  // useState lazy initialisers are the React-sanctioned place for impure calls
  // (react-hooks/purity rule allows them here). Values are computed once at
  // mount so the 30-day window is stable across re-renders.
  const [to] = useState(() => localDateStr());
  const [from] = useState(() => localDateStr(new Date(Date.now() - 29 * 86_400_000)));
  return useAnalytics(from, to);
}
