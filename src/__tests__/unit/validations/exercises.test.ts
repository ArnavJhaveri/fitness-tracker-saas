import { describe, expect, it } from "vitest";
import { createExerciseSchema, updateExerciseSchema } from "@/lib/validations";
import { EXERCISE_CATEGORIES } from "@/lib/registry/exercise-categories";

/**
 * Migration 003 dropped the DB CHECK constraint on `exercises.category`.
 * The Zod schema at the API boundary mirrors that — any non-empty trimmed
 * string is now valid. These tests pin that contract so a future
 * "tighten the enum back up" refactor is loud rather than silent.
 */
describe("createExerciseSchema — category", () => {
  it("accepts every curated EXERCISE_CATEGORIES value", () => {
    for (const { category } of EXERCISE_CATEGORIES) {
      const r = createExerciseSchema.safeParse({
        name: "Test",
        category,
        primary_muscle_group: "chest",
      });
      expect(r.success, `EXERCISE_CATEGORIES contains ${category}`).toBe(true);
    }
  });

  it("accepts user-defined category strings (not in EXERCISE_CATEGORIES)", () => {
    // Examples a user might invent that the app should NOT reject.
    const userCategories = ["powerlifting", "rehab", "cycling-base", "sports-specific"];
    for (const c of userCategories) {
      const r = createExerciseSchema.safeParse({
        name: "Test",
        category: c,
        primary_muscle_group: "core",
      });
      expect(r.success, `${c} should be accepted`).toBe(true);
    }
  });

  it("rejects empty / whitespace-only categories", () => {
    expect(
      createExerciseSchema.safeParse({
        name: "Test",
        category: "",
        primary_muscle_group: "chest",
      }).success,
    ).toBe(false);
    expect(
      createExerciseSchema.safeParse({
        name: "Test",
        category: "   ",
        primary_muscle_group: "chest",
      }).success,
    ).toBe(false);
  });

  it("rejects categories longer than 40 chars to defend against UI overflow", () => {
    expect(
      createExerciseSchema.safeParse({
        name: "Test",
        category: "x".repeat(41),
        primary_muscle_group: "chest",
      }).success,
    ).toBe(false);
  });

  it("trims whitespace so 'Strength ' === 'Strength'", () => {
    const r = createExerciseSchema.safeParse({
      name: "Test",
      category: "  strength  ",
      primary_muscle_group: "chest",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.category).toBe("strength");
  });
});

describe("updateExerciseSchema", () => {
  it("accepts an empty object — valid PATCH no-op", () => {
    expect(updateExerciseSchema.safeParse({}).success).toBe(true);
  });

  it("accepts each field individually", () => {
    expect(updateExerciseSchema.safeParse({ name: "New name" }).success).toBe(true);
    expect(updateExerciseSchema.safeParse({ category: "yoga" }).success).toBe(true);
    expect(updateExerciseSchema.safeParse({ primary_muscle_group: "calves" }).success).toBe(true);
    expect(updateExerciseSchema.safeParse({ instructions: null }).success).toBe(true);
  });

  it("rejects unknown fields (strict mode)", () => {
    // .strict() defends against typos like is_custom that the client must
    // never be allowed to override — that's set server-side from auth.uid().
    expect(
      updateExerciseSchema.safeParse({
        name: "x",
        is_custom: true,
      }).success,
    ).toBe(false);
  });
});
