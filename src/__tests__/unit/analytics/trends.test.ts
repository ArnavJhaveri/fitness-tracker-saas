import { describe, it, expect } from "vitest";
import {
  movingAverage,
  periodDelta,
  latestWeight,
  formatDelta,
  trendDirection,
} from "@/features/analytics/utils/trends";
import type { DailySummary } from "@/types/database";

function day(log_date: string, weight_kg: number | null = null): DailySummary {
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
    weight_kg,
    body_fat_percentage: null,
  };
}

// ─── movingAverage ────────────────────────────────────────────────────────────

describe("movingAverage", () => {
  it("returns empty array for empty input", () => {
    expect(movingAverage([], [])).toEqual([]);
  });

  it("returns null when all values in window are null", () => {
    const data = [day("2025-08-01"), day("2025-08-02")];
    const values = [null, null];
    const result = movingAverage(data, values);
    expect(result.every((r) => r.value === null)).toBe(true);
  });

  it("computes a 7-day average ignoring nulls", () => {
    const data = [day("2025-08-01"), day("2025-08-02"), day("2025-08-03")];
    // Only the last value is non-null; the 7-day window for each point
    // only looks backward so day 3 has only 1 non-null value.
    const values: (number | null)[] = [null, null, 70];
    const result = movingAverage(data, values, 7);

    expect(result[0]).toEqual({ date: "2025-08-01", value: null });
    expect(result[1]).toEqual({ date: "2025-08-02", value: null });
    expect(result[2]).toEqual({ date: "2025-08-03", value: 70 });
  });

  it("averages a window of values and rounds to 1 decimal", () => {
    const data = [day("2025-08-01"), day("2025-08-02"), day("2025-08-03")];
    const values: (number | null)[] = [70, 71, 72];
    const result = movingAverage(data, values, 3);

    // Window for day 3 includes [70, 71, 72] → avg = 71.0
    expect(result[2].value).toBe(71);
  });

  it("does not include future nulls in the window (only backward-looking)", () => {
    const data = [day("2025-08-01"), day("2025-08-02"), day("2025-08-03")];
    const values: (number | null)[] = [80, null, 80];
    const result = movingAverage(data, values, 3);

    // Day 1: window = [80] → avg = 80
    expect(result[0].value).toBe(80);
    // Day 2: window = [80, null] → non-null = [80] → avg = 80
    expect(result[1].value).toBe(80);
    // Day 3: window = [80, null, 80] → non-null = [80, 80] → avg = 80
    expect(result[2].value).toBe(80);
  });
});

// ─── periodDelta ──────────────────────────────────────────────────────────────
// periodDelta(values: number[], period = 7): number
// Compares the last `period` values vs the prior `period` values (% change).
// Returns 0 when there is not enough data or all values are zero/negative.

describe("periodDelta", () => {
  it("returns 0 when array is too short for two periods", () => {
    expect(periodDelta([100])).toBe(0);
  });

  it("computes positive delta when recent average exceeds prior average", () => {
    // prior 7: 100 each, recent 7: 120 each → +20%
    const values = [...Array(7).fill(100), ...Array(7).fill(120)];
    expect(periodDelta(values, 7)).toBe(20);
  });

  it("computes negative delta when recent average is below prior average", () => {
    // prior 7: 120 each, recent 7: 100 each → -17%
    const values = [...Array(7).fill(120), ...Array(7).fill(100)];
    expect(periodDelta(values, 7)).toBeCloseTo(-17, 0);
  });

  it("returns 0 when all values are zero", () => {
    expect(periodDelta([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(0);
  });
});

// ─── latestWeight ─────────────────────────────────────────────────────────────

describe("latestWeight", () => {
  it("returns null for empty array", () => {
    expect(latestWeight([])).toBeNull();
  });

  it("returns the most recent non-null weight", () => {
    const data = [day("2025-08-01", 70), day("2025-08-02", null), day("2025-08-03", 69.5)];
    expect(latestWeight(data)).toBe(69.5);
  });

  it("returns null when all weights are null", () => {
    const data = [day("2025-08-01", null), day("2025-08-02", null)];
    expect(latestWeight(data)).toBeNull();
  });
});

// ─── formatDelta ──────────────────────────────────────────────────────────────
// formatDelta(delta: number): string — returns "—" for 0, "+N%" or "N%"

describe("formatDelta", () => {
  it("returns em-dash for zero delta", () => {
    expect(formatDelta(0)).toBe("—");
  });

  it("prefixes positive delta with +", () => {
    expect(formatDelta(5)).toBe("+5%");
  });

  it("shows negative sign for decrease", () => {
    expect(formatDelta(-10)).toBe("-10%");
  });
});

// ─── trendDirection ───────────────────────────────────────────────────────────
// Threshold: delta > 1 → "up", delta < -1 → "down", else "flat"

describe("trendDirection", () => {
  it("returns up for delta above threshold (+1)", () => {
    expect(trendDirection(5)).toBe("up");
  });

  it("returns down for delta below threshold (-1)", () => {
    expect(trendDirection(-5)).toBe("down");
  });

  it("returns flat for zero", () => {
    expect(trendDirection(0)).toBe("flat");
  });

  it("returns flat for delta exactly at +1 boundary (not strictly greater)", () => {
    expect(trendDirection(1)).toBe("flat");
  });

  it("returns flat for delta exactly at -1 boundary (not strictly less)", () => {
    expect(trendDirection(-1)).toBe("flat");
  });

  it("returns flat for very small positive delta (noise threshold)", () => {
    expect(trendDirection(0.5)).toBe("flat");
  });

  it("returns flat for very small negative delta (noise threshold)", () => {
    expect(trendDirection(-0.5)).toBe("flat");
  });
});
