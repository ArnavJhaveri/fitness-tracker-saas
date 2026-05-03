import { apiGet, apiPost, apiDelete, buildQuery } from "./api";
import type { WaterEntry } from "@/types/database";

interface ListParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}

export const waterService = {
  list: (p: ListParams = {}) =>
    apiGet<WaterEntry[]>(`/api/water${buildQuery({ page: 1, per_page: 100, ...p })}`),

  create: (data: { amount_ml: number; logged_at: string }) =>
    apiPost<WaterEntry>("/api/water", data),

  delete: (id: string) => apiDelete(`/api/water/${id}`),
};
