"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phasesService } from "@/services/phases.service";
import { queryKeys, invalidateWithAnalytics } from "@/lib/query-keys";
import type { Phase } from "@/types/database";
import type {
  CreatePhaseInput,
  UpdatePhaseCosmeticInput,
  PivotPhaseInput,
  EndPhaseInput,
} from "@/lib/validations/phases";

/**
 * Cache key namespace for phase queries.
 *
 * - PHASES_KEY                 — all phase-related queries (prefix invalidation)
 * - PHASES_KEY + ['active']    — the user's currently-active phase (or null)
 * - PHASES_KEY + ['list', s?]  — full or status-filtered list
 *
 * Mutation invalidations always target PHASES_KEY (the prefix) so every
 * derived query refetches in lock-step. We also invalidate SETTINGS_KEY
 * because target resolution depends on the phase override taking effect.
 *
 * @deprecated Use `queryKeys.phases()` from `@/lib/query-keys` instead.
 */
export const PHASES_KEY = queryKeys.phases();

export function useActivePhase() {
  return useQuery<Phase | null>({
    queryKey: [...queryKeys.phases(), "active"],
    queryFn: () => phasesService.getActive(),
    staleTime: 60_000,
  });
}

export function usePhases(status?: Phase["status"]) {
  return useQuery<Phase[]>({
    queryKey: [...queryKeys.phases(), "list", status ?? null],
    queryFn: () => phasesService.list(status),
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidatePhaseDerivedQueries(qc: ReturnType<typeof useQueryClient>) {
  // Phase data feeds the dashboard's resolveDailyTargets — every phase change
  // can shift targets, so settings-shaped queries must refetch alongside.
  // Analytics summaries can't change instantaneously from a phase mutation
  // (they read raw logs, not targets), but the *target overlay* on charts
  // does. The analytics query key is ["analytics", ...] — invalidate if the
  // page reads target-aware data.
  invalidateWithAnalytics(qc, queryKeys.phases(), queryKeys.settings());
}

export function useCreatePhase() {
  const qc = useQueryClient();
  return useMutation<Phase, Error, CreatePhaseInput>({
    mutationFn: phasesService.create,
    onSuccess: () => invalidatePhaseDerivedQueries(qc),
  });
}

export function useUpdatePhaseCosmetic() {
  const qc = useQueryClient();
  return useMutation<Phase, Error, { id: string; input: UpdatePhaseCosmeticInput }>({
    mutationFn: ({ id, input }) => phasesService.updateCosmetic(id, input),
    onSuccess: () => invalidatePhaseDerivedQueries(qc),
  });
}

export function usePivotPhase() {
  const qc = useQueryClient();
  return useMutation<
    { oldPhase: Phase; newPhase: Phase },
    Error,
    { id: string; input: PivotPhaseInput }
  >({
    mutationFn: ({ id, input }) => phasesService.pivot(id, input),
    onSuccess: () => invalidatePhaseDerivedQueries(qc),
  });
}

export function useEndPhase() {
  const qc = useQueryClient();
  return useMutation<Phase, Error, { id: string; input?: EndPhaseInput }>({
    mutationFn: ({ id, input }) => phasesService.end(id, input ?? {}),
    onSuccess: () => invalidatePhaseDerivedQueries(qc),
  });
}
