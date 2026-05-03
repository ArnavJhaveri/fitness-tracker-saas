import { apiGet, apiPost, apiPut, apiDelete, buildQuery } from "./api";
import type { SleepEntry } from "@/types/database";

interface ListParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}

export const sleepService = {
  list: (p: ListParams = {}) =>
    apiGet<SleepEntry[]>(`/api/sleep${buildQuery({ page: 1, per_page: 30, ...p })}`),

  create: (data: {
    sleep_start: string;
    sleep_end: string;
    quality?: number | null;
    notes?: string | null;
  }) => apiPost<SleepEntry>("/api/sleep", data),

  update: (
    id: string,
    data: Partial<{
      sleep_start: string;
      sleep_end: string;
      quality: number | null;
      notes: string | null;
    }>,
  ) => apiPut<SleepEntry>(`/api/sleep/${id}`, data),

  delete: (id: string) => apiDelete(`/api/sleep/${id}`),
};
