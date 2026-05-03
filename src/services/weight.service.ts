import { apiGet, apiPost, apiPut, apiDelete, buildQuery } from "./api";
import type { WeightEntry } from "@/types/database";

interface ListParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}

export const weightService = {
  list: (p: ListParams = {}) =>
    apiGet<WeightEntry[]>(`/api/weight${buildQuery({ page: 1, per_page: 50, ...p })}`),

  create: (data: {
    weight_kg: number;
    body_fat_percentage?: number | null;
    logged_at: string;
    notes?: string | null;
  }) => apiPost<WeightEntry>("/api/weight", data),

  update: (
    id: string,
    data: Partial<{
      weight_kg: number;
      body_fat_percentage: number | null;
      logged_at: string;
      notes: string | null;
    }>,
  ) => apiPut<WeightEntry>(`/api/weight/${id}`, data),

  delete: (id: string) => apiDelete(`/api/weight/${id}`),
};
