/**
 * Unit tests for buildOnboardingPayload — the pure transform that maps
 * client-side wizard state to the API payload.
 *
 * These pin the rules that previously surfaced as silent data bugs:
 *
 *   1. Imperial heights are converted via ft+in (NOT decimal feet) so a
 *      user typing "5'9"" gets 175 cm, not 180 cm.
 *   2. Imperial weights are rounded to 2 decimals so the round-tripped
 *      value is stable.
 *   3. `notifications_enabled` is ALWAYS sent — even when false — so an
 *      explicit "off" choice overrides any server-side default.
 *   4. Nutrition fields are gated on `showNutrition`; they never leak
 *      from a previously-typed-then-hidden step.
 *   5. Empty string optionals are dropped (Zod expects undefined, not "").
 */

import { describe, it, expect } from "vitest";
import { buildOnboardingPayload } from "@/app/onboarding/_lib/buildPayload";
import type { AboutYouValue } from "@/app/onboarding/_components/steps/AboutYouStep";
import type { NutritionValue } from "@/app/onboarding/_components/steps/NutritionStep";
import type { DefaultsValue } from "@/app/onboarding/_components/steps/DefaultsStep";

const blankAboutYou: AboutYouValue = {
  full_name: "",
  date_of_birth: "",
  sex_at_birth: "",
  height_cm_value: "",
  height_ft_value: "",
  height_in_value: "",
  weight_value: "",
  height_unit: "cm",
  weight_unit: "kg",
  activity_level: "",
};

const blankNutrition: NutritionValue = {
  dietary_pattern: "",
  excluded_foods: [],
};

const blankDefaults: DefaultsValue = {
  week_starts_on: 1,
  timezone: "Europe/London",
  notifications_enabled: false,
};

describe("buildOnboardingPayload", () => {
  it("emits the irreducible minimum when every optional is blank", () => {
    const payload = buildOnboardingPayload({
      intents: [],
      aboutYou: blankAboutYou,
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });

    // Always-present fields:
    expect(payload.weight_unit).toBe("kg");
    expect(payload.height_unit).toBe("cm");
    expect(payload.week_starts_on).toBe(1);
    expect(payload.timezone).toBe("Europe/London");
    expect(payload.notifications_enabled).toBe(false);

    // None of the optionals were filled — they should be absent, NOT empty.
    expect("full_name" in payload).toBe(false);
    expect("date_of_birth" in payload).toBe(false);
    expect("sex_at_birth" in payload).toBe(false);
    expect("height_cm" in payload).toBe(false);
    expect("current_weight_kg" in payload).toBe(false);
    expect("activity_level" in payload).toBe(false);
    expect("primary_intents" in payload).toBe(false);
  });

  it("converts imperial height (5'9\") to canonical cm — NOT decimal-feet math", () => {
    // The 5.9-feet bug: parseFloat("5.9") * 30.48 ≈ 180 cm. Correct math
    // for 5'9" is (5*12 + 9) * 2.54 = 175.26 cm.
    const payload = buildOnboardingPayload({
      intents: [],
      aboutYou: {
        ...blankAboutYou,
        height_unit: "ft",
        height_ft_value: "5",
        height_in_value: "9",
      },
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });

    // 175.26 cm — within rounding tolerance.
    expect(payload.height_cm).toBeGreaterThan(175);
    expect(payload.height_cm).toBeLessThan(176);
  });

  it("converts imperial weight (lbs) to kg with 2-decimal rounding", () => {
    const payload = buildOnboardingPayload({
      intents: [],
      aboutYou: {
        ...blankAboutYou,
        weight_unit: "lbs",
        weight_value: "180",
      },
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });

    // 180 lbs / 2.20462 ≈ 81.6466... → rounded to 81.65
    expect(payload.current_weight_kg).toBe(81.65);
  });

  it("preserves kg input untouched", () => {
    const payload = buildOnboardingPayload({
      intents: [],
      aboutYou: { ...blankAboutYou, weight_unit: "kg", weight_value: "82.5" },
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });
    expect(payload.current_weight_kg).toBe(82.5);
  });

  it("ALWAYS sends notifications_enabled (regression: false used to be dropped)", () => {
    const off = buildOnboardingPayload({
      intents: [],
      aboutYou: blankAboutYou,
      nutrition: blankNutrition,
      defaults: { ...blankDefaults, notifications_enabled: false },
      showNutrition: false,
    });
    expect(off.notifications_enabled).toBe(false);

    const on = buildOnboardingPayload({
      intents: [],
      aboutYou: blankAboutYou,
      nutrition: blankNutrition,
      defaults: { ...blankDefaults, notifications_enabled: true },
      showNutrition: false,
    });
    expect(on.notifications_enabled).toBe(true);
  });

  it("emits nutrition fields only when the diet step was visible", () => {
    // showNutrition=false: even if the user typed something, drop it.
    const hidden = buildOnboardingPayload({
      intents: [],
      aboutYou: blankAboutYou,
      nutrition: { dietary_pattern: "vegan", excluded_foods: ["dairy"] },
      defaults: blankDefaults,
      showNutrition: false,
    });
    expect("dietary_pattern" in hidden).toBe(false);
    expect("excluded_foods" in hidden).toBe(false);

    // showNutrition=true: emit them.
    const shown = buildOnboardingPayload({
      intents: [],
      aboutYou: blankAboutYou,
      nutrition: { dietary_pattern: "vegan", excluded_foods: ["dairy"] },
      defaults: blankDefaults,
      showNutrition: true,
    });
    expect(shown.dietary_pattern).toBe("vegan");
    expect(shown.excluded_foods).toEqual(["dairy"]);
  });

  it("trims full_name and drops it when blank-after-trim", () => {
    const blankFromSpaces = buildOnboardingPayload({
      intents: [],
      aboutYou: { ...blankAboutYou, full_name: "   " },
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });
    expect("full_name" in blankFromSpaces).toBe(false);

    const trimmed = buildOnboardingPayload({
      intents: [],
      aboutYou: { ...blankAboutYou, full_name: "  Alice  " },
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });
    expect(trimmed.full_name).toBe("Alice");
  });

  it("emits primary_intents only when at least one is picked", () => {
    const empty = buildOnboardingPayload({
      intents: [],
      aboutYou: blankAboutYou,
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });
    expect("primary_intents" in empty).toBe(false);

    const picked = buildOnboardingPayload({
      intents: ["lose_weight"],
      aboutYou: blankAboutYou,
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });
    expect(picked.primary_intents).toEqual(["lose_weight"]);
  });

  it("drops invalid numeric inputs rather than emitting NaN", () => {
    // parseFloat("abc") = NaN. Without the guard this would emit
    // height_cm: NaN, which would fail Zod with a confusing error.
    const payload = buildOnboardingPayload({
      intents: [],
      aboutYou: {
        ...blankAboutYou,
        height_unit: "cm",
        height_cm_value: "abc",
        weight_value: "??",
      },
      nutrition: blankNutrition,
      defaults: blankDefaults,
      showNutrition: false,
    });
    expect("height_cm" in payload).toBe(false);
    expect("current_weight_kg" in payload).toBe(false);
  });
});
