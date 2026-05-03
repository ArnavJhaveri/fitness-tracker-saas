import { describe, it, expect } from "vitest";
import {
  workoutAdherence,
  waterAdherence,
  sleepAdherence,
  overallScore,
} from "@/features/analytics/utils/adherence";
import type { DailySummary } from "@/types/database";

function day(log_date: string, overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    log_date,
    workout_count: 0,
    total_workout_minutes: 0,
    total_water_ml: 0,
    total_sleep_minutes: 0,
    avg_sleep_quality: null,
    total_calories: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    weight_kg: null,
    body_fat_percentage: null,
    ...overrides,
  };
}

// ─── workoutAdherence ─────────────────────────────────────────────────────────

describe("workoutAdherence", () => {
  it("returns 0 for an empty dataset", () => {
    expect(workoutAdherence([], 3)).toBe(0);
  });

  it("returns 100 when every target day has a workout", () => {
    // 7 days, target 7 days/week → all 7 have workouts
    const data = Array.from({ length: 7 }, (_, i) =>
      day(`2025-08-0${i + 1}`, { workout_count: 1 }),
    );
    expect(workoutAdherence(data, 7)).toBe(100);
  });

  it("returns 0 when no workouts logged", () => {
    const data = [day("2025-08-01"), day("2025-08-02"), day("2025-08-03")];
    expect(workoutAdherence(data, 3)).toBe(0);
  });

  it("caps at 100 when actual exceeds target", () => {
    // Target 3/wk, actual 7/7 days → score capped at 100
    const data = Array.from({ length: 7 }, (_, i) =>
      day(`2025-08-0${i + 1}`, { workout_count: 1 }),
    );
    expect(workoutAdherence(data, 3)).toBe(100);
  });

  it("calculates partial adherence correctly", () => {
    // 14 days (2 weeks), target 5/week → 10 target days
    // Actual: 5 workouts logged
    const data = Array.from({ length: 14 }, (_, i) =>
      day(`2025-08-${String(i + 1).padStart(2, "0")}`, {
        workout_count: i < 5 ? 1 : 0,
      }),
    );
    expect(workoutAdherence(data, 5)).toBe(50);
  });
});

// ─── waterAdherence ───────────────────────────────────────────────────────────

describe("waterAdherence", () => {
  it("returns 0 for an empty dataset", () => {
    expect(waterAdherence([], 2000)).toBe(0);
  });

  it("returns 0 when target is 0 (degenerate case)", () => {
    const data = [day("2025-08-01", { total_water_ml: 1000 })];
    expect(waterAdherence(data, 0)).toBe(0);
  });

  it("returns 100 when every day meets target", () => {
    const data = [
      day("2025-08-01", { total_water_ml: 2000 }),
      day("2025-08-02", { total_water_ml: 2500 }),
    ];
    expect(waterAdherence(data, 2000)).toBe(100);
  });

  it("counts days meeting exactly the target", () => {
    const data = [
      day("2025-08-01", { total_water_ml: 2000 }), // exactly on target
      day("2025-08-02", { total_water_ml: 1999 }), // 1ml under
    ];
    expect(waterAdherence(data, 2000)).toBe(50);
  });
});

// ─── sleepAdherence ───────────────────────────────────────────────────────────

describe("sleepAdherence", () => {
  it("returns 0 for an empty dataset", () => {
    expect(sleepAdherence([], 480)).toBe(0);
  });

  it("allows 30-minute tolerance below target", () => {
    const data = [
      day("2025-08-01", { total_sleep_minutes: 450 }), // exactly 30m under 480
      day("2025-08-02", { total_sleep_minutes: 449 }), // 31m under — fails
    ];
    expect(sleepAdherence(data, 480)).toBe(50);
  });

  it("ignores days with no sleep logged", () => {
    const data = [
      day("2025-08-01", { total_sleep_minutes: 480 }),
      day("2025-08-02", { total_sleep_minutes: 0 }), // not logged
    ];
    // Only 1 logged day, and it meets target → 100%
    expect(sleepAdherence(data, 480)).toBe(100);
  });
});

// ─── overallScore ─────────────────────────────────────────────────────────────

describe("overallScore", () => {
  it("returns 0 for empty scores", () => {
    expect(overallScore([])).toBe(0);
  });

  it("returns 0 when all scores are 0", () => {
    expect(overallScore([0, 0, 0])).toBe(0);
  });

  it("averages non-zero scores only", () => {
    // 0 is excluded from the average (no data for that metric)
    expect(overallScore([100, 80, 0])).toBe(90);
  });

  it("returns 100 for perfect scores", () => {
    expect(overallScore([100, 100, 100])).toBe(100);
  });
});
