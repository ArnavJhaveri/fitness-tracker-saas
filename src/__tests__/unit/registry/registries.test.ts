import { describe, expect, it } from "vitest";
import { MEAL_TYPES, getMealTypeMeta } from "@/lib/registry/meal-types";
import { EXERCISE_CATEGORIES, getExerciseCategoryMeta } from "@/lib/registry/exercise-categories";
import { GOAL_TYPES, getGoalTypeMeta } from "@/lib/registry/goal-types";
import { getPhaseTypeMeta } from "@/lib/registry/phase-types";

/**
 * Registries are the single source of truth for icon + label + ordering
 * decisions across the UI. These tests pin the contract: every entry must
 * be resolvable by its `type` key, and unknown values must safely fall
 * back to a curated default rather than throwing.
 */

describe("MEAL_TYPES registry", () => {
  it("includes the five DB-supported meal types", () => {
    const types = MEAL_TYPES.map((m) => m.type);
    expect(types).toEqual(["breakfast", "lunch", "dinner", "snack", "other"]);
  });

  it("entries have monotonic order", () => {
    for (let i = 1; i < MEAL_TYPES.length; i++) {
      expect(MEAL_TYPES[i].order).toBeGreaterThan(MEAL_TYPES[i - 1].order);
    }
  });

  it("getMealTypeMeta resolves every known type", () => {
    for (const m of MEAL_TYPES) {
      const meta = getMealTypeMeta(m.type);
      expect(meta.type).toBe(m.type);
      expect(meta.label).toBe(m.label);
    }
  });

  it("getMealTypeMeta falls back to 'other' for unknown / null / empty", () => {
    expect(getMealTypeMeta(null).type).toBe("other");
    expect(getMealTypeMeta(undefined).type).toBe("other");
    expect(getMealTypeMeta("").type).toBe("other");
    expect(getMealTypeMeta("brunch").type).toBe("other");
  });

  it("default hours are within the typical window of each meal type", () => {
    expect(getMealTypeMeta("breakfast").defaultHour).toBeGreaterThanOrEqual(6);
    expect(getMealTypeMeta("breakfast").defaultHour).toBeLessThanOrEqual(10);
    expect(getMealTypeMeta("lunch").defaultHour).toBeGreaterThanOrEqual(11);
    expect(getMealTypeMeta("lunch").defaultHour).toBeLessThanOrEqual(14);
    expect(getMealTypeMeta("dinner").defaultHour).toBeGreaterThanOrEqual(17);
    expect(getMealTypeMeta("dinner").defaultHour).toBeLessThanOrEqual(21);
  });
});

describe("EXERCISE_CATEGORIES registry", () => {
  it("getExerciseCategoryMeta resolves curated categories", () => {
    for (const c of EXERCISE_CATEGORIES) {
      expect(getExerciseCategoryMeta(c.category).category).toBe(c.category);
    }
  });

  it("falls back to 'other' for user-defined categories not in the curated list", () => {
    // Migration 003 dropped the CHECK constraint, so users can introduce
    // categories like "powerlifting". The registry must not throw or return
    // undefined for these.
    expect(getExerciseCategoryMeta("powerlifting").category).toBe("other");
    expect(getExerciseCategoryMeta(null).category).toBe("other");
  });
});

describe("GOAL_TYPES registry", () => {
  it("includes all curated goal types from the union", () => {
    const types = GOAL_TYPES.map((g) => g.type);
    expect(types).toContain("weight_loss");
    expect(types).toContain("muscle_gain");
    expect(types).toContain("custom");
  });

  it("getGoalTypeMeta falls back to 'custom' for unknown types", () => {
    expect(getGoalTypeMeta("powerlifting_total").type).toBe("custom");
    expect(getGoalTypeMeta(null).type).toBe("custom");
  });
});

describe("PHASE_TYPES registry", () => {
  it("getPhaseTypeMeta resolves curated phase types", () => {
    expect(getPhaseTypeMeta("cut").type).toBe("cut");
    expect(getPhaseTypeMeta("bulk").type).toBe("bulk");
    expect(getPhaseTypeMeta("maintenance").type).toBe("maintenance");
  });

  it("getPhaseTypeMeta falls back to 'custom' for unknown types", () => {
    expect(getPhaseTypeMeta("future_methodology").type).toBe("custom");
    expect(getPhaseTypeMeta(null).type).toBe("custom");
  });

  it("cut/bulk have suggestedWeightChange in the right direction", () => {
    expect(getPhaseTypeMeta("cut").suggestedWeightChange).toBeLessThan(0);
    expect(getPhaseTypeMeta("bulk").suggestedWeightChange).toBeGreaterThan(0);
    expect(getPhaseTypeMeta("maintenance").suggestedWeightChange).toBe(0);
  });
});
