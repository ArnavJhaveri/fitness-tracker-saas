"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants";
import type { CompleteOnboardingInput } from "@/lib/validations/settings";
import { apiPost } from "@/services/api";
import { SETTINGS_KEY } from "@/features/settings/hooks/useSettings";
import { StepIndicator } from "./StepIndicator";
import { WelcomeStep } from "./steps/WelcomeStep";
import { AboutYouStep, type AboutYouValue, ftInToCm } from "./steps/AboutYouStep";
import { NutritionStep, type NutritionValue } from "./steps/NutritionStep";
import { DefaultsStep, type DefaultsValue } from "./steps/DefaultsStep";
import { FirstPhaseStep, type FirstPhaseValue } from "./steps/FirstPhaseStep";
import type { ActivityLevel, PrimaryIntent, SexAtBirth } from "@/types/database";

interface Props {
  defaultTimezone: string;
  defaultWeightUnit: "kg" | "lbs";
  defaultHeightUnit: "cm" | "ft";
}

/**
 * Multi-step onboarding wizard with skippable steps.
 *
 * Each step renders its own form; this component owns the unified state
 * across all steps so that "Back" preserves answers and the final POST has
 * everything in one shot.
 *
 * The nutrition step is conditionally shown based on step 1's intents —
 * users who only want to track workouts shouldn't be asked about dairy.
 */
export function OnboardingWizard({ defaultTimezone, defaultWeightUnit, defaultHeightUnit }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Per-step state ────────────────────────────────────────────────────
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

  // ─── Step structure (some are conditional) ─────────────────────────────
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

  const stepDefs = useMemo(() => {
    const defs: { key: string; label: string }[] = [
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

  // ─── Submission ────────────────────────────────────────────────────────

  /**
   * Convert the client-side state into the API payload. Numbers are parsed
   * here (after unit conversion) so the API receives canonical kg/cm values.
   *
   * Height handling: the form has separate cm and ft+in input shapes, so we
   * use `ftInToCm` for the imperial path. Earlier versions used a single
   * decimal-feet input, which produced a silent ~5 cm error when users typed
   * "5.9" expecting 5'9" but getting 5.9 ft (≈ 5'10.8").
   */
  function buildPayload(): CompleteOnboardingInput {
    const heightCm =
      aboutYou.height_unit === "ft"
        ? ftInToCm(aboutYou.height_ft_value, aboutYou.height_in_value)
        : (() => {
            const n = parseFloat(aboutYou.height_cm_value);
            return Number.isFinite(n) ? n : null;
          })();

    const weightNum = parseFloat(aboutYou.weight_value);
    const weightKg = !Number.isFinite(weightNum)
      ? null
      : aboutYou.weight_unit === "lbs"
        ? Math.round((weightNum / 2.20462) * 100) / 100
        : weightNum;

    const payload: CompleteOnboardingInput = {};
    if (aboutYou.full_name.trim()) payload.full_name = aboutYou.full_name.trim();
    if (aboutYou.date_of_birth) payload.date_of_birth = aboutYou.date_of_birth;
    if (aboutYou.sex_at_birth) payload.sex_at_birth = aboutYou.sex_at_birth as SexAtBirth;
    if (heightCm != null) payload.height_cm = heightCm;
    if (weightKg != null) payload.current_weight_kg = weightKg;
    if (aboutYou.activity_level) {
      payload.activity_level = aboutYou.activity_level as ActivityLevel;
    }
    payload.weight_unit = aboutYou.weight_unit;
    payload.height_unit = aboutYou.height_unit;

    if (showNutrition && nutrition.dietary_pattern) {
      payload.dietary_pattern = nutrition.dietary_pattern;
    }
    if (showNutrition && nutrition.excluded_foods.length > 0) {
      payload.excluded_foods = nutrition.excluded_foods;
    }

    payload.week_starts_on = defaults.week_starts_on;
    payload.timezone = defaults.timezone;
    // Always send notifications_enabled so the user's explicit "off" choice
    // overrides any server-side default. Earlier the field was collected but
    // never reached the server because buildPayload omitted it.
    payload.notifications_enabled = defaults.notifications_enabled;

    if (intents.length > 0) payload.primary_intents = intents;

    return payload;
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      // 1. Persist onboarding answers + mark onboarded_at
      await apiPost<{ onboarded_at: string }>("/api/onboarding", buildPayload());

      // 2. Optional first phase — separate request so a phase failure
      //    doesn't undo the onboarding completion.
      if (showFirstPhase && firstPhase.phase) {
        try {
          await apiPost("/api/phases", firstPhase.phase);
        } catch {
          // Non-fatal — surface a soft warning but still continue to dashboard
          // because user_settings was updated successfully and they can create
          // a phase from the dashboard later.
        }
      }

      // The dashboard banner reads from the cached useSettings query. Without
      // an explicit invalidation the cache still has onboarded_at = null
      // (staleTime = 5 min, refetchOnWindowFocus only fires on focus changes,
      // not in-app navigation), so the banner would linger after we navigate.
      // Invalidating forces the query to refetch on next mount.
      await queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      router.replace(ROUTES.DASHBOARD);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      setSubmitting(false);
    }
  }

  // ─── Step rendering ────────────────────────────────────────────────────
  function renderCurrent() {
    switch (currentKey) {
      case "welcome":
        return <WelcomeStep value={intents} onChange={setIntents} />;
      case "you":
        return <AboutYouStep value={aboutYou} onChange={setAboutYou} />;
      case "nutrition":
        return <NutritionStep value={nutrition} onChange={setNutrition} />;
      case "defaults":
        return <DefaultsStep value={defaults} onChange={setDefaults} />;
      case "phase":
        return (
          <FirstPhaseStep
            value={firstPhase}
            onChange={setFirstPhase}
            context={{
              sex: (aboutYou.sex_at_birth || null) as SexAtBirth | null,
              dob: aboutYou.date_of_birth || null,
              height_cm:
                aboutYou.height_unit === "ft"
                  ? ftInToCm(aboutYou.height_ft_value, aboutYou.height_in_value)
                  : (() => {
                      const n = parseFloat(aboutYou.height_cm_value);
                      return Number.isFinite(n) ? n : null;
                    })(),
              weight_kg: (() => {
                const n = parseFloat(aboutYou.weight_value);
                if (!Number.isFinite(n)) return null;
                return aboutYou.weight_unit === "lbs" ? n / 2.20462 : n;
              })(),
              activity: (aboutYou.activity_level || null) as ActivityLevel | null,
            }}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-3">
        <StepIndicator
          current={safeStep}
          total={stepDefs.length}
          labels={stepDefs.map((s) => s.label)}
        />
      </div>

      <section
        aria-live="polite"
        className="flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-900"
      >
        {renderCurrent()}
      </section>

      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
        >
          {error}
        </p>
      )}

      <footer className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={safeStep === 0 || submitting}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={submit}
            isLoading={submitting}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Skip for now
          </Button>
          {isLast ? (
            <Button onClick={submit} isLoading={submitting} className="flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              Finish
            </Button>
          ) : (
            <Button onClick={goNext} disabled={submitting} className="flex items-center gap-1.5">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
