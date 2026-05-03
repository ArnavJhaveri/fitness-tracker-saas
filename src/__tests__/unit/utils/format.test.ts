import { describe, it, expect } from "vitest";
import {
  formatWeight,
  formatVolume,
  formatDuration,
  formatNumber,
  formatCalories,
  formatMacro,
  formatPercent,
} from "@/lib/utils/format";

describe("formatWeight", () => {
  it("formats kg with one decimal place", () => {
    expect(formatWeight(70)).toBe("70.0 kg");
    expect(formatWeight(70.5)).toBe("70.5 kg");
  });

  it("converts to lbs correctly", () => {
    expect(formatWeight(100, "lbs")).toBe("220.5 lbs");
    expect(formatWeight(0, "lbs")).toBe("0.0 lbs");
  });

  it("defaults to kg", () => {
    expect(formatWeight(80)).toContain("kg");
  });
});

describe("formatVolume", () => {
  it("shows ml for values under 1000", () => {
    expect(formatVolume(500)).toBe("500 ml");
    expect(formatVolume(999)).toBe("999 ml");
  });

  it("converts to litres at 1000ml", () => {
    expect(formatVolume(1000)).toBe("1 L");
    expect(formatVolume(1500)).toBe("1.5 L");
  });

  it("strips trailing zeros from litre values", () => {
    expect(formatVolume(2000)).toBe("2 L");
    expect(formatVolume(1250)).toBe("1.25 L");
  });
});

describe("formatDuration", () => {
  it("shows only minutes for sub-hour durations", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(59)).toBe("59m");
  });

  it("shows only hours when minutes are zero", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
  });

  it("shows hours and minutes combined", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(75)).toBe("1h 15m");
  });
});

describe("formatNumber", () => {
  it("adds thousands separator", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("respects decimal places", () => {
    expect(formatNumber(1.5, 1)).toBe("1.5");
    expect(formatNumber(1.567, 2)).toBe("1.57");
  });

  it("defaults to zero decimals", () => {
    expect(formatNumber(42.9)).toBe("43");
  });
});

describe("formatCalories", () => {
  it("rounds and appends kcal", () => {
    expect(formatCalories(2000)).toBe("2,000 kcal");
    expect(formatCalories(1500.7)).toBe("1,501 kcal");
  });
});

describe("formatMacro", () => {
  it("shows one decimal place with g suffix", () => {
    expect(formatMacro(25.5)).toBe("25.5g");
    expect(formatMacro(100)).toBe("100.0g");
  });
});

describe("formatPercent", () => {
  it("converts decimal to percent with default 0 decimals", () => {
    expect(formatPercent(0.75)).toBe("75%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("respects decimal places", () => {
    expect(formatPercent(0.756, 1)).toBe("75.6%");
  });
});
