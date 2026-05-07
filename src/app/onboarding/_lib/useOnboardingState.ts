"use client";

/**
 * State container for the onboarding wizard.
 *
 * Owns:
 *   - per-step form values (intents, aboutYou, nutrition, defaults, firstPhase)
 *   - the dynamic step list (some steps are conditional on intents)
 *   - the cursor (with safe-clamping when the visible step list shrinks)
 *
 * Pulled out of the wizard component so the component itself becomes
 * mostly rendering. Tests for this hook can drive the navigation logic
 * without mounting the whole DOM tree.
 */

import { useEffect, useMemo, useState } from "react";
import type { PrimaryIntent } from "@/types/database";
import type { AboutYouValue } from "../_components/steps/AboutYouStep";
import type { NutritionValue } from "../_components/steps/NutritionStep";
import type { DefaultsValue } from "../_components/steps/DefaultsStep";
import type { FirstPhaseValue } from "../_components/steps/FirstPhaseStep";

export interface OnboardingDefaults {
  defaultTimezone: string;
  defaultWeightUnit: "kg" | "lbs";
  defaultHeightUnit: "cm" | "ft";
}

export interface StepDef {
  key: "welcome" | "you" | "nutrition" | "defaults" | "phase";
  label: string;
}

export function useOnboardingState({
  defaultTimezone,
  defaultWeightUnit,
  defaultHeightUnit,
}: OnboardingDefaults) {
  const [step, setStep] = useState(0);
  const [intents, setIntents] = useState<PrimaryIntent[]>([]);

  const [aboutYou, setAboutYou] = useState<AboutYouValue>({
    full_name: "",
    date_of_birth: "",
    sex_at_birth: "",
    height_cm_value: "",
    height_ft_value: "",
    height_in_value: "",
    weight_value: "",
    height_unit: defaultHeightUnit,
    weight_unit: defaultWeightUnit,
    activity_level: "",
  });

  const [nutrition, setNutrition] = useState<NutritionValue>({
    dietary_pattern: "",
    excluded_foods: [],
  });

  // Initial timezone defaults to whatever the server passed in (typically the
  // existing user_settings.timezone or "UTC"). We then update it from the
  // browser's resolved zone post-mount — doing this synchronously in the
  // initial state would diverge between SSR (Node's UTC) and the client's
  // local zone, triggering a hydration mismatch warning + visual flicker.
  const [defaults, setDefaults] = useState<DefaultsValue>({
    week_starts_on: 1,
    timezone: defaultTimezone,
    notifications_enabled: false,
  });
  // Read-from-browser-API-on-mount is the textbook case for setState-in-effect
  // even though the lint rule discourages it generally. The alternative
  // (useSyncExternalStore) doesn't compose with controlled-input state that
  // the user can later edit. Calling setState ONCE on mount is benign.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount sync, see comment above
      if (tz) setDefaults((prev) => ({ ...prev, timezone: tz }));
    } catch {
      // Older browsers without full Intl support — leave defaultTimezone in place.
    }
  }, []);

  const [firstPhase, setFirstPhase] = useState<FirstPhaseValue>({ phase: null });

  // Nutrition step shown only if user picked any nutrition-relevant intent.
  // First-phase step shown only if user picked weight or muscle related intents.
  const showNutrition = useMemo(
    () =>
      intents.some((i) =>
        ["track_nutrition", "lose_weight", "gain_muscle", "improve_endurance"].includes(i),
      ),
    [intents],
  );
  const showFirstPhase = useMemo(
    () =>
      intents.some((i) =>
        ["lose_weight", "gain_muscle", "improve_endurance", "general_fitness"].includes(i),
      ),
    [intents],
  );

  const stepDefs = useMemo<StepDef[]>(() => {
    const defs: StepDef[] = [
      { key: "welcome", label: "About" },
      { key: "you", label: "Profile" },
    ];
    if (showNutrition) defs.push({ key: "nutrition", label: "Diet" });
    defs.push({ key: "defaults", label: "Defaults" });
    if (showFirstPhase) defs.push({ key: "phase", label: "Phase" });
    return defs;
  }, [showNutrition, showFirstPhase]);

  // `step` is the user-controlled index. If the user goes back and deselects
  // an intent that made a later step visible, stepDefs shrinks and `step` may
  // temporarily exceed the new bound. Rather than reset state in an effect
  // (cascading render), we clamp on read and clamp at the click sites.
  const safeStep = Math.min(step, stepDefs.length - 1);
  const isLast = safeStep === stepDefs.length - 1;
  const currentKey = stepDefs[safeStep]?.key ?? "welcome";

  function goNext() {
    const cap = stepDefs.length - 1;
    setStep((s) => Math.min(cap, Math.min(s, cap) + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, Math.min(s, stepDefs.length - 1) - 1));
  }

  return {
    // step navigation
    safeStep,
    isLast,
    currentKey,
    stepDefs,
    goNext,
    goBack,

    // form values + setters
    intents,
    setIntents,
    aboutYou,
    setAboutYou,
    nutrition,
    setNutrition,
    defaults,
    setDefaults,
    firstPhase,
    setFirstPhase,

    // derived flags (also needed by buildPayload + submit)
    showNutrition,
    showFirstPhase,
  };
}
