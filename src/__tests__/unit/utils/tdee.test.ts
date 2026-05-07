import { describe, expect, it } from "vitest";
import {
  ACTIVITY_MULTIPLIERS,
  ageFromDOB,
  calcBMR,
  calcTDEE,
  suggestCalorieTarget,
  suggestMacros,
} from "@/lib/utils/tdee";

describe("calcBMR (Mifflin-St Jeor)", () => {
  // Reference: 30 y/o, 80 kg, 180 cm
  // BMR_male = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
  // BMR_female = same - 161 - 5 = 1614
  it("computes a reasonable male BMR", () => {
    expect(calcBMR({ weight_kg: 80, height_cm: 180, age: 30, sex: "male" })).toBe(1780);
  });

  it("computes a reasonable female BMR", () => {
    expect(calcBMR({ weight_kg: 80, height_cm: 180, age: 30, sex: "female" })).toBe(1614);
  });

  it("uses an averaged offset for prefer_not_to_say (between male and female)", () => {
    const m = calcBMR({ weight_kg: 80, height_cm: 180, age: 30, sex: "male" })!;
    const f = calcBMR({ weight_kg: 80, height_cm: 180, age: 30, sex: "female" })!;
    const x = calcBMR({ weight_kg: 80, height_cm: 180, age: 30, sex: "prefer_not_to_say" })!;
    expect(x).toBeGreaterThan(f);
    expect(x).toBeLessThan(m);
  });

  it("returns null when inputs are missing or invalid", () => {
    expect(calcBMR({ weight_kg: 0, height_cm: 180, age: 30, sex: "male" })).toBeNull();
    expect(calcBMR({ weight_kg: 80, height_cm: -1, age: 30, sex: "male" })).toBeNull();
    expect(calcBMR({ weight_kg: 80, height_cm: 180, age: 999, sex: "male" })).toBeNull();
    expect(calcBMR({ weight_kg: NaN, height_cm: 180, age: 30, sex: "male" })).toBeNull();
  });
});

describe("calcTDEE", () => {
  it("multiplies BMR by the activity factor", () => {
    expect(calcTDEE(1780, "moderate")).toBeCloseTo(1780 * 1.55, 5);
    expect(calcTDEE(1500, "sedentary")).toBeCloseTo(1500 * 1.2, 5);
  });

  it("activity multipliers are monotonically increasing", () => {
    const order: (keyof typeof ACTIVITY_MULTIPLIERS)[] = [
      "sedentary",
      "light",
      "moderate",
      "very_active",
      "extra_active",
    ];
    for (let i = 1; i < order.length; i++) {
      expect(ACTIVITY_MULTIPLIERS[order[i]]).toBeGreaterThan(ACTIVITY_MULTIPLIERS[order[i - 1]]);
    }
  });
});

describe("suggestCalorieTarget", () => {
  it("subtracts 500 for cut, adds 250 for bulk, leaves maintenance unchanged", () => {
    const tdee = 2500;
    expect(suggestCalorieTarget(tdee, "cut")).toBe(2000);
    expect(suggestCalorieTarget(tdee, "bulk")).toBe(2750);
    expect(suggestCalorieTarget(tdee, "maintenance")).toBe(2500);
  });

  it("rounds to the nearest 25 for friendliness", () => {
    expect(suggestCalorieTarget(2513, "maintenance")).toBe(2525);
    expect(suggestCalorieTarget(2487, "maintenance")).toBe(2475);
  });

  it("falls back to 0 adjustment for unknown phase types", () => {
    expect(suggestCalorieTarget(2500, "made_up_type")).toBe(2500);
  });
});

describe("suggestMacros", () => {
  it("scales protein with bodyweight, carbs from remainder", () => {
    const macros = suggestMacros(2200, 80, "maintenance");
    // protein 1.8 g/kg = 144 g (576 kcal)
    // fat 0.8 g/kg = 64 g (576 kcal)
    // carbs = (2200 - 576 - 576) / 4 = 262 g
    expect(macros.protein_g).toBe(144);
    expect(macros.fat_g).toBe(64);
    expect(macros.carbs_g).toBeGreaterThan(250);
    expect(macros.carbs_g).toBeLessThan(275);
  });

  it("biases protein higher during a cut", () => {
    const cutMacros = suggestMacros(1800, 80, "cut"); // 2.0 g/kg
    const maintMacros = suggestMacros(1800, 80, "maintenance"); // 1.8 g/kg
    expect(cutMacros.protein_g).toBeGreaterThan(maintMacros.protein_g);
  });

  it("never returns negative carbs even with low calories + heavy lifters", () => {
    // 100 kg lifter on a hypothetical 800 kcal cut
    const macros = suggestMacros(800, 100, "cut");
    expect(macros.carbs_g).toBeGreaterThanOrEqual(0);
  });
});

describe("ageFromDOB", () => {
  const today = new Date(2026, 4, 7); // 2026-05-07 (months are 0-indexed)

  it("computes completed years", () => {
    expect(ageFromDOB("1995-01-15", today)).toBe(31);
  });

  it("subtracts 1 if the birthday hasn't happened yet this year", () => {
    expect(ageFromDOB("1995-12-25", today)).toBe(30); // Dec hasn't happened
    expect(ageFromDOB("1995-05-08", today)).toBe(30); // May 8 is tomorrow
    expect(ageFromDOB("1995-05-07", today)).toBe(31); // exact birthday today
  });

  it("returns null for invalid input", () => {
    expect(ageFromDOB(null)).toBeNull();
    expect(ageFromDOB(undefined)).toBeNull();
    expect(ageFromDOB("")).toBeNull();
    expect(ageFromDOB("1995/01/15")).toBeNull();
    expect(ageFromDOB("nonsense")).toBeNull();
  });
});
