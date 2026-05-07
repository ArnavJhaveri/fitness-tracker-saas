import { describe, it, expect } from "vitest";
import {
  NUTRITION_INTENTS,
  SLEEP_INTENTS,
  WATER_INTENTS,
  WORKOUT_INTENTS,
  widgetEnabled,
} from "@/components/dashboard/widgetVisibility";

/**
 * `widgetEnabled` is the single rule the dashboard uses to decide whether to
 * show each widget. The truth table below is the contract: any change to
 * the rule must update these tests in lock-step.
 *
 *   intents | matches intent | recent data | result
 *   --------+----------------+-------------+-------
 *   null    |      —         |     —       |  true     (companion: not onboarded)
 *   set     |    yes         |     —       |  true     (explicit opt-in)
 *   set     |    no          |    yes      |  true     (data-driven fallback)
 *   set     |    no          |    no       |  false    (user opted out)
 */
describe("widgetEnabled", () => {
  it("returns true when intents are null (unonboarded user) regardless of data", () => {
    expect(widgetEnabled(NUTRITION_INTENTS, null, false)).toBe(true);
    expect(widgetEnabled(NUTRITION_INTENTS, undefined, false)).toBe(true);
  });

  it("returns true when at least one user intent matches", () => {
    expect(widgetEnabled(NUTRITION_INTENTS, ["lose_weight"], false)).toBe(true);
    expect(widgetEnabled(WORKOUT_INTENTS, ["track_workouts"], false)).toBe(true);
  });

  it("returns true when the user has recent data, even without a matching intent", () => {
    // User picked only sleep tracking but has logged meals → still show nutrition.
    expect(widgetEnabled(NUTRITION_INTENTS, ["improve_sleep"], true)).toBe(true);
  });

  it("returns false when the user explicitly opted out (no matching intent + no data)", () => {
    expect(widgetEnabled(NUTRITION_INTENTS, ["track_workouts"], false)).toBe(false);
    expect(widgetEnabled(SLEEP_INTENTS, ["lose_weight"], false)).toBe(false);
  });

  it("returns false for an empty intents array with no data (explicit empty selection)", () => {
    // Different from null — empty array means the user actively chose nothing.
    // Showing nothing is the user's stated preference.
    expect(widgetEnabled(NUTRITION_INTENTS, [], false)).toBe(false);
  });
});

describe("intent groupings", () => {
  it("nutrition group covers calorie- and macro-driven goals", () => {
    expect(NUTRITION_INTENTS).toContain("lose_weight");
    expect(NUTRITION_INTENTS).toContain("gain_muscle");
    expect(NUTRITION_INTENTS).toContain("track_nutrition");
  });

  it("workout group covers all training-related goals", () => {
    expect(WORKOUT_INTENTS).toContain("track_workouts");
    expect(WORKOUT_INTENTS).toContain("improve_endurance");
    expect(WORKOUT_INTENTS).toContain("gain_muscle");
    expect(WORKOUT_INTENTS).toContain("general_fitness");
  });

  it("sleep group is narrow — only sleep-specific or general fitness intents", () => {
    expect(SLEEP_INTENTS).toEqual(["improve_sleep", "general_fitness"]);
  });

  it("water group covers users who track hydration as part of nutrition or general fitness", () => {
    expect(WATER_INTENTS).toContain("track_nutrition");
    expect(WATER_INTENTS).toContain("general_fitness");
    expect(WATER_INTENTS).toContain("lose_weight");
  });

  it("intent groupings are mutually composable — same intent can drive multiple widgets", () => {
    // gain_muscle drives both nutrition and workout widgets — that's intentional.
    expect(NUTRITION_INTENTS).toContain("gain_muscle");
    expect(WORKOUT_INTENTS).toContain("gain_muscle");
  });
});
