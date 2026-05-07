/**
 * Client-side wrapper for the /api/phases endpoints.
 *
 * Hooks call these methods and TanStack Query takes care of caching +
 * invalidation. The DB schema and types are shared with the server so the
 * API responses round-trip through Phase, ApiSuccess<...> envelopes from
 * src/types/database.
 */
import { apiGet, apiPost, apiPatch } from "./api";
import type { Phase } from "@/types/database";
import type {
  CreatePhaseInput,
  UpdatePhaseCosmeticInput,
  PivotPhaseInput,
  EndPhaseInput,
} from "@/lib/validations/phases";

export const phasesService = {
  list: (status?: Phase["status"]) =>
    apiGet<Phase[]>(`/api/phases${status ? `?status=${status}` : ""}`),

  /** Convenience: get the single active phase or null. The endpoint returns
   *  an array (length 0 or 1, enforced by the unique partial index). */
  getActive: async (): Promise<Phase | null> => {
    const list = await apiGet<Phase[]>(`/api/phases?status=active`);
    return list[0] ?? null;
  },

  get: (id: string) => apiGet<Phase>(`/api/phases/${id}`),

  create: (input: CreatePhaseInput) => apiPost<Phase>(`/api/phases`, input),

  /** In-place edit — only name/notes/planned_end_date. Material edits
   *  must use pivot. */
  updateCosmetic: (id: string, input: UpdatePhaseCosmeticInput) =>
    apiPatch<Phase>(`/api/phases/${id}`, input),

  pivot: (id: string, input: PivotPhaseInput) =>
    apiPost<{ oldPhase: Phase; newPhase: Phase }>(`/api/phases/${id}/pivot`, input),

  end: (id: string, input: EndPhaseInput = {}) => apiPost<Phase>(`/api/phases/${id}/end`, input),
};
