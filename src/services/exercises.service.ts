/**
 * Custom exercise CRUD wrapper. Search lives on `workoutService` for now
 * because it predates the split; this file owns the management actions.
 */
import { apiDelete, apiGet, apiPatch, apiPost, buildQuery } from "./api";
import type { Exercise } from "@/types/database";
import type { CreateExerciseInput, UpdateExerciseInput } from "@/lib/validations";

export interface ListExercisesParams {
  q?: string;
  category?: string;
  muscle?: string;
  page?: number;
  per_page?: number;
  /** Include archived rows. Defaults to false (active-only). The manage page
   *  passes true on the "Archived" tab. The exercise picker NEVER passes true. */
  include_archived?: boolean;
}

export const exercisesService = {
  list: (params: ListExercisesParams = {}) =>
    apiGet<Exercise[]>(
      `/api/exercises${buildQuery({
        page: 1,
        per_page: 50,
        ...params,
        include_archived: params.include_archived ? "true" : undefined,
      })}`,
    ),

  get: (id: string) => apiGet<Exercise>(`/api/exercises/${id}`),

  create: (input: CreateExerciseInput) => apiPost<Exercise>("/api/exercises", input),

  update: (id: string, input: UpdateExerciseInput) =>
    apiPatch<Exercise>(`/api/exercises/${id}`, input),

  /** Soft delete — archives the exercise (preserves historical workouts). */
  archive: (id: string) => apiDelete(`/api/exercises/${id}`),

  /** Undo archive. */
  restore: (id: string) => apiPost<Exercise>(`/api/exercises/${id}/restore`, {}),
};
