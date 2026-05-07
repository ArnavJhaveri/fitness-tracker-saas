/**
 * Pure transform: client-side wizard state → API payload.
 *
 * Extracted from OnboardingWizard so it can be unit-tested directly
 * (see __tests__/unit/onboarding/buildPayload.test.ts) and so the wizard
 * itself stays focused on rendering. The function has no React or fetch
 * dependencies — given identical inputs it always produces identical
 * outputs.
 *
 * Rules of the transform:
 *
 *   - Only fields the user actually filled in are emitted. Optional
 *     strings and unselected enums are omitted, never sent as empty
 *     string (Zod `.optional()` accepts undefined, not "").
 *   - Imperial inputs are converted to canonical SI here so the API
 *     always receives kg + cm. Earlier versions used a single decimal-
 *     feet input which produced a silent ~5 cm error (e.g. user types
 *     "5.9" expecting 5'9" but getting 5.9 ft = 5'10.8").
 *   - `notifications_enabled` is ALWAYS sent so the user's explicit
 *     "off" choice overrides any server-side default. A previous bug
 *     collected the value but never wrote it because buildPayload
 *     omitted it.
 *   - Nutrition fields are gated on `showNutrition`; otherwise a user
 *     who progresses through the wizard without seeing the diet step
 *     could overwrite an existing dietary_pattern.
 */

import type { CompleteOnboardingInput } from "@/lib/validations/settings";
import type { ActivityLevel, PrimaryIntent, SexAtBirth } from "@/types/database";
import { ftInToCm, type AboutYouValue } from "../_components/steps/AboutYouStep";
import type { NutritionValue } from "../_components/steps/NutritionStep";
import type { DefaultsValue } from "../_components/steps/DefaultsStep";

export interface BuildPayloadArgs {
  intents: PrimaryIntent[];
  aboutYou: AboutYouValue;
  nutrition: NutritionValue;
  defaults: DefaultsValue;
  showNutrition: boolean;
}

/** Resolve the height-cm value from either the cm input or the ft+in pair. */
export function resolveHeightCm(aboutYou: AboutYouValue): number | null {
  if (aboutYou.height_unit === "ft") {
    return ftInToCm(aboutYou.height_ft_value, aboutYou.height_in_value);
  }
  const n = parseFloat(aboutYou.height_cm_value);
  return Number.isFinite(n) ? n : null;
}

/** Resolve weight-kg, applying lbs→kg with 2-decimal rounding when needed. */
export function resolveWeightKg(aboutYou: AboutYouValue): number | null {
  const n = parseFloat(aboutYou.weight_value);
  if (!Number.isFinite(n)) return null;
  if (aboutYou.weight_unit === "lbs") {
    // Round to 2 decimals so the round-tripped value is stable when the
    // settings page later renders it back in lbs.
    return Math.round((n / 2.20462) * 100) / 100;
  }
  return n;
}

export function buildOnboardingPayload({
  intents,
  aboutYou,
  nutrition,
  defaults,
  showNutrition,
}: BuildPayloadArgs): CompleteOnboardingInput {
  const heightCm = resolveHeightCm(aboutYou);
  const weightKg = resolveWeightKg(aboutYou);

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
  payload.notifications_enabled = defaults.notifications_enabled;

  if (intents.length > 0) payload.primary_intents = intents;

  return payload;
}
