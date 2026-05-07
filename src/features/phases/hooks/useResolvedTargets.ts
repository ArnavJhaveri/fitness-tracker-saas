"use client";

import { useMemo } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useActivePhase } from "./usePhases";
import { applyResolution } from "@/lib/targets/resolveDailyTargets";
import type { ResolvedDailyTargets } from "@/types/database";

/**
 * Compose the user's daily targets for TODAY from their settings + active
 * phase. Phase overrides settings per-field; missing data falls through.
 *
 * Why client-side composition instead of a /api/targets endpoint:
 *   - We already have useSettings cached on the dashboard
 *   - Adding useActivePhase costs one extra request, vs. an API endpoint that
 *     would re-query the same two rows server-side
 *   - applyResolution is a pure function that we already test in isolation,
 *     so behaviour is identical to the server's resolveDailyTargets
 *
 * For HISTORICAL date queries (analytics over past days, where the active
 * phase at the time may differ from today's), use the server-side
 * resolveDailyTargets() — historical reads need the SQL-side date filter.
 */
export function useResolvedTargets(): {
  data: ResolvedDailyTargets | null;
  isLoading: boolean;
} {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: phase, isLoading: phaseLoading } = useActivePhase();

  const isLoading = settingsLoading || phaseLoading;

  const data = useMemo<ResolvedDailyTargets | null>(() => {
    // While either underlying query is loading, hold off on resolution —
    // surface null so callers can render a skeleton rather than transient
    // "no targets" copy.
    if (isLoading) return null;
    return applyResolution(settings ?? null, phase ?? null);
  }, [isLoading, settings, phase]);

  return { data, isLoading };
}
