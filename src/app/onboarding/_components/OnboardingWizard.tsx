"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StepIndicator } from "./StepIndicator";
import { WelcomeStep } from "./steps/WelcomeStep";
import { AboutYouStep, ftInToCm } from "./steps/AboutYouStep";
import { NutritionStep } from "./steps/NutritionStep";
import { DefaultsStep } from "./steps/DefaultsStep";
import { FirstPhaseStep } from "./steps/FirstPhaseStep";
import { useOnboardingState, type OnboardingDefaults } from "../_lib/useOnboardingState";
import { useSubmitOnboarding } from "../_lib/useSubmitOnboarding";
import { buildOnboardingPayload } from "../_lib/buildPayload";
import type { ActivityLevel, SexAtBirth } from "@/types/database";

/**
 * Multi-step onboarding wizard with skippable steps.
 *
 * Each step renders its own form; this component composes them and owns
 * the navigation chrome. State, navigation logic, and the API submit
 * flow are split into hooks (`useOnboardingState`, `useSubmitOnboarding`)
 * + a pure transform (`buildOnboardingPayload`) so each piece is
 * independently testable.
 *
 * The nutrition + first-phase steps are conditionally shown based on
 * the intents the user picked on welcome — see `useOnboardingState` for
 * the rules.
 */
export function OnboardingWizard(props: OnboardingDefaults) {
  const state = useOnboardingState(props);
  const { submit, submitting, error } = useSubmitOnboarding();

  function handleSubmit() {
    const payload = buildOnboardingPayload({
      intents: state.intents,
      aboutYou: state.aboutYou,
      nutrition: state.nutrition,
      defaults: state.defaults,
      showNutrition: state.showNutrition,
    });
    void submit({
      payload,
      showFirstPhase: state.showFirstPhase,
      firstPhase: state.firstPhase,
    });
  }

  function renderCurrent() {
    switch (state.currentKey) {
      case "welcome":
        return <WelcomeStep value={state.intents} onChange={state.setIntents} />;
      case "you":
        return <AboutYouStep value={state.aboutYou} onChange={state.setAboutYou} />;
      case "nutrition":
        return <NutritionStep value={state.nutrition} onChange={state.setNutrition} />;
      case "defaults":
        return <DefaultsStep value={state.defaults} onChange={state.setDefaults} />;
      case "phase":
        // FirstPhaseStep needs derived TDEE-context fields. Computing them
        // here (rather than in the hook) keeps the hook free of conversion
        // utilities and means TDEE math lives next to the buildPayload
        // module that owns the same conversions.
        return (
          <FirstPhaseStep
            value={state.firstPhase}
            onChange={state.setFirstPhase}
            context={{
              sex: (state.aboutYou.sex_at_birth || null) as SexAtBirth | null,
              dob: state.aboutYou.date_of_birth || null,
              height_cm:
                state.aboutYou.height_unit === "ft"
                  ? ftInToCm(state.aboutYou.height_ft_value, state.aboutYou.height_in_value)
                  : (() => {
                      const n = parseFloat(state.aboutYou.height_cm_value);
                      return Number.isFinite(n) ? n : null;
                    })(),
              weight_kg: (() => {
                const n = parseFloat(state.aboutYou.weight_value);
                if (!Number.isFinite(n)) return null;
                return state.aboutYou.weight_unit === "lbs" ? n / 2.20462 : n;
              })(),
              activity: (state.aboutYou.activity_level || null) as ActivityLevel | null,
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
          current={state.safeStep}
          total={state.stepDefs.length}
          labels={state.stepDefs.map((s) => s.label)}
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
          onClick={state.goBack}
          disabled={state.safeStep === 0 || submitting}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleSubmit}
            isLoading={submitting}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Skip for now
          </Button>
          {state.isLast ? (
            <Button
              onClick={handleSubmit}
              isLoading={submitting}
              className="flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Finish
            </Button>
          ) : (
            <Button
              onClick={state.goNext}
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
