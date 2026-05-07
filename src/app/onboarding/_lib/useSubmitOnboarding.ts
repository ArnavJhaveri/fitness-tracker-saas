"use client";

/**
 * Submit hook for the onboarding wizard.
 *
 * Wraps two API calls + cache invalidation + navigation in one async
 * action. Phase creation is best-effort: a failure there mustn't undo
 * the onboarding completion, because onboarding is the gate for the
 * dashboard banner and we never want a user stuck with `onboarded_at =
 * null` after they've answered every question.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/constants";
import { apiPost } from "@/services/api";
import { SETTINGS_KEY } from "@/features/settings/hooks/useSettings";
import type { CompleteOnboardingInput } from "@/lib/validations/settings";
import type { FirstPhaseValue } from "../_components/steps/FirstPhaseStep";

export function useSubmitOnboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(args: {
    payload: CompleteOnboardingInput;
    showFirstPhase: boolean;
    firstPhase: FirstPhaseValue;
  }) {
    setError(null);
    setSubmitting(true);
    try {
      // 1. Persist onboarding answers + mark onboarded_at
      await apiPost<{ onboarded_at: string }>("/api/onboarding", args.payload);

      // 2. Optional first phase — separate request so a phase failure
      //    doesn't undo the onboarding completion.
      if (args.showFirstPhase && args.firstPhase.phase) {
        try {
          await apiPost("/api/phases", args.firstPhase.phase);
        } catch {
          // Non-fatal — we still proceed to the dashboard. user_settings was
          // updated successfully and the user can create a phase later.
        }
      }

      // The dashboard banner reads from the cached useSettings query. Without
      // an explicit invalidation the cache still has onboarded_at = null
      // (staleTime = 5 min, refetchOnWindowFocus only fires on focus changes,
      // not in-app navigation), so the banner would linger after we navigate.
      await queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      router.replace(ROUTES.DASHBOARD);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      setSubmitting(false);
    }
  }

  return { submit, submitting, error };
}
