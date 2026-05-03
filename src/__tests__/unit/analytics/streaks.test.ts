import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calcWorkoutStreak,
  calcWaterStreak,
  calcLongestWorkoutStreak,
} from "@/features/analytics/utils/streaks";
import type { DailySummary } from "@/types/database";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal DailySummary for a given date. */
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

/** Pin the system clock to a specific local date string "YYYY-MM-DD". */
function freezeLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(y, m - 1, d, 12, 0, 0)); // local noon
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ─── calcWorkoutStreak ────────────────────────────────────────────────────────

describe("calcWorkoutStreak", () => {
  it("returns 0 for an empty dataset", () => {
    freezeLocalDate("2025-08-15");
    expect(calcWorkoutStreak([])).toBe(0);
  });

  it("returns 0 when the most recent workout was more than a day ago", () => {
    freezeLocalDate("2025-08-15");
    const data = [day("2025-08-13", { workout_count: 1 })];
    expect(calcWorkoutStreak(data)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    freezeLocalDate("2025-08-15");
    const data = [
      day("2025-08-15", { workout_count: 1 }),
      day("2025-08-14", { workout_count: 1 }),
      day("2025-08-13", { workout_count: 1 }),
      day("2025-08-12", { workout_count: 0 }), // breaks the streak
    ];
    expect(calcWorkoutStreak(data)).toBe(3);
  });

  it("counts a streak starting yesterday (rest day today is ok)", () => {
    freezeLocalDate("2025-08-15");
    const data = [day("2025-08-14", { workout_count: 1 }), day("2025-08-13", { workout_count: 1 })];
    expect(calcWorkoutStreak(data)).toBe(2);
  });

  it("returns 1 for a single workout today", () => {
    freezeLocalDate("2025-08-15");
    const data = [day("2025-08-15", { workout_count: 2 })];
    expect(calcWorkoutStreak(data)).toBe(1);
  });

  it("ignores future dates in the dataset", () => {
    freezeLocalDate("2025-08-15");
    const data = [
      day("2025-08-16", { workout_count: 1 }), // future — ignore
      day("2025-08-15", { workout_count: 1 }),
      day("2025-08-14", { workout_count: 1 }),
    ];
    expect(calcWorkoutStreak(data)).toBe(2);
  });

  it("handles unsorted input", () => {
    freezeLocalDate("2025-08-15");
    const data = [
      day("2025-08-13", { workout_count: 1 }),
      day("2025-08-15", { workout_count: 1 }),
      day("2025-08-14", { workout_count: 1 }),
    ];
    expect(calcWorkoutStreak(data)).toBe(3);
  });
});

// ─── calcWaterStreak ──────────────────────────────────────────────────────────

describe("calcWaterStreak", () => {
  const TARGET = 2000;

  it("returns 0 for an empty dataset", () => {
    freezeLocalDate("2025-08-15");
    expect(calcWaterStreak([], TARGET)).toBe(0);
  });

  it("counts consecutive days meeting the target", () => {
    freezeLocalDate("2025-08-15");
    const data = [
      day("2025-08-15", { total_water_ml: 2500 }),
      day("2025-08-14", { total_water_ml: 2000 }),
      day("2025-08-13", { total_water_ml: 1999 }), // just under target
    ];
    expect(calcWaterStreak(data, TARGET)).toBe(2);
  });

  it("treats exactly hitting the target as success", () => {
    freezeLocalDate("2025-08-15");
    const data = [day("2025-08-15", { total_water_ml: 2000 })];
    expect(calcWaterStreak(data, TARGET)).toBe(1);
  });
});

// ─── calcLongestWorkoutStreak ─────────────────────────────────────────────────

describe("calcLongestWorkoutStreak", () => {
  it("returns 0 for an empty dataset", () => {
    expect(calcLongestWorkoutStreak([])).toBe(0);
  });

  it("finds the longest run in non-contiguous data", () => {
    const data = [
      day("2025-08-01", { workout_count: 1 }),
      day("2025-08-02", { workout_count: 1 }),
      day("2025-08-03", { workout_count: 1 }), // streak of 3
      day("2025-08-04", { workout_count: 0 }),
      day("2025-08-05", { workout_count: 1 }),
      day("2025-08-06", { workout_count: 1 }), // streak of 2
    ];
    expect(calcLongestWorkoutStreak(data)).toBe(3);
  });

  it("handles all rest days", () => {
    const data = [day("2025-08-01"), day("2025-08-02")];
    expect(calcLongestWorkoutStreak(data)).toBe(0);
  });

  it("handles a single workout day", () => {
    const data = [day("2025-08-01", { workout_count: 1 })];
    expect(calcLongestWorkoutStreak(data)).toBe(1);
  });
});
