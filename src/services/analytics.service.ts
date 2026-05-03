import { apiGet, buildQuery } from "./api";
import type { DailySummary } from "@/types/database";

export const analyticsService = {
  daily: (from?: string, to?: string) =>
    apiGet<DailySummary[]>(
      `/api/analytics/daily${buildQuery({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`,
    ),
};
