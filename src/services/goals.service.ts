import { apiGet, apiPost, apiPut, apiDelete, buildQuery } from "./api";
import type { Goal } from "@/types/database";

export const goalsService = {
  list: (status?: string) =>
    apiGet<Goal[]>(`/api/goals${buildQuery({ per_page: 50, ...(status ? { status } : {}) })}`),

  get: (id: string) => apiGet<Goal>(`/api/goals/${id}`),

  create: (data: {
    type: string;
    title: string;
    description?: string | null;
    target_value?: number | null;
    unit?: string | null;
    target_date?: string | null;
  }) => apiPost<Goal>("/api/goals", data),

  update: (
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      target_value: number | null;
      current_value: number | null;
      unit: string | null;
      target_date: string | null;
      status: string;
    }>,
  ) => apiPut<Goal>(`/api/goals/${id}`, data),

  delete: (id: string) => apiDelete(`/api/goals/${id}`),
};
