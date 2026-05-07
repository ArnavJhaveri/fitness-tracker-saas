"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants";
import type { CompleteOnboardingInput } from "@/lib/validations/settings";
import { apiPost } from "@/services/api";
import { StepIndicator } from "./StepIndicator";
import { WelcomeStep } from "./steps/WelcomeStep";
import { AboutYouStep, type AboutYouValue } from "./steps/AboutYouStep";
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
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Per-step state ────────────────────────────────────────────────────
  const [intents, setIntents] = useState<PrimaryIntent[]>([]);
  const [aboutYou, setAboutYou] = useState<AboutYouValue>({
    full_name: "",
    date_of_birth: "",
    sex_at_birth: "",
    height_value: "",
    weight_value: "",
    height_unit: defaultHeightUnit,
    weight_unit: defaultWeightUnit,
    activity_level: "",
  });
  const [nutrition, setNutrition] = useState<NutritionValue>({
    dietary_pattern: "",
    excluded_foods: [],
  });
  // Try to detect timezone from the browser (Intl) but only on the client —
  // SSR doesn't have Intl in the user's locale.
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : defaultTimezone;
  const [defaults, setDefaults] = useState<DefaultsValue>({
    week_starts_on: 1,
    timezone: browserTz || defaultTimezone,
    notifications_enabled: false,
  });
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

  const isLast = step === stepDefs.length - 1;
  const currentKey = stepDefs[Math.min(step, stepDefs.length - 1)]?.key ?? "welcome";

  // ─── Submission ────────────────────────────────────────────────────────

  /**
   * Convert the client-side state into the API payload. Numbers are parsed
   * here (after unit conversion) so the API receives canonical kg/cm values.
   */
  function buildPayload(): CompleteOnboardingInput {
    const heightNum = parseFloat(aboutYou.height_value);
    const weightNum = parseFloat(aboutYou.weight_value);

    const heightCm = !Number.isFinite(heightNum)
      ? undefined
      : aboutYou.height_unit === "ft"
        ? Math.round(heightNum * 30.48 * 10) / 10 // 5.9 ft → 179.8 cm
        : heightNum;
    const weightKg = !Number.isFinite(weightNum)
      ? undefined
      : aboutYou.weight_unit === "lbs"
        ? Math.round((weightNum / 2.20462) * 100) / 100
        : weightNum;

    const payload: CompleteOnboardingInput = {};
    if (aboutYou.full_name.trim()) payload.full_name = aboutYou.full_name.trim();
    if (aboutYou.date_of_birth) payload.date_of_birth = aboutYou.date_of_birth;
    if (aboutYou.sex_at_birth) payload.sex_at_birth = aboutYou.sex_at_birth as SexAtBirth;
    if (heightCm !== undefined) payload.height_cm = heightCm;
    if (weightKg !== undefined) payload.current_weight_kg = weightKg;
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

      // The settings query is cached; partial settings update means the
      // dashboard banner needs the new onboarded_at value. Query refetches
      // on focus so navigation alone will pick it up; if not, the banner
      // logic also defensively re-checks.
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
              height_cm: (() => {
                const n = parseFloat(aboutYou.height_value);
                if (!Number.isFinite(n)) return null;
                return aboutYou.height_unit === "ft" ? n * 30.48 : n;
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
          current={step}
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
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
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
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={submitting}
              className="flex items-center gap-1.5"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
