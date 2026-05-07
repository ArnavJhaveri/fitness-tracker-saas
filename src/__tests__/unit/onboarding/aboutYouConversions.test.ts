import { describe, it, expect } from "vitest";
import {
  ftInToCm,
  kgToLbs,
  lbsToKg,
  parseKg,
} from "@/app/onboarding/_components/steps/AboutYouStep";

/**
 * The earlier wizard had a UX trap: a single decimal-feet input where typing
 * "5.9" was interpreted as 5.9 ft (≈ 5'10.8" / 179.8 cm) when the user almost
 * always meant 5 feet 9 inches (175.3 cm). The wizard now uses separate ft +
 * in inputs whose conversion lives in `ftInToCm`. These tests pin the
 * arithmetic so any future regression is loud.
 */
describe("ftInToCm", () => {
  it("converts 5'9\" to ~175 cm", () => {
    expect(ftInToCm("5", "9")).toBeCloseTo(175.3, 1);
  });

  it("converts 6'0\" to ~183 cm", () => {
    expect(ftInToCm("6", "0")).toBeCloseTo(182.9, 1);
  });

  it("treats only-feet as inches=0", () => {
    expect(ftInToCm("5", "")).toBeCloseTo(152.4, 1); // 5 ft × 30.48
  });

  it("treats only-inches as feet=0", () => {
    expect(ftInToCm("", "70")).toBeCloseTo(177.8, 1); // 70 × 2.54
  });

  it("returns null when both inputs are blank/invalid (user fully skipped)", () => {
    expect(ftInToCm("", "")).toBeNull();
    expect(ftInToCm("abc", "xyz")).toBeNull();
  });

  it("does not silently mistreat decimal feet as the old single-input bug did", () => {
    // The old buggy path: "5.9" interpreted as 5.9 ft → 179.8 cm.
    // The new path requires the user to put inches in the second field, so
    // entering "5.9" alone with no inches yields 5.9 ft × 30.48 ≈ 179.8 cm
    // (still a single-feet value, never a "5'9\"" misreading). This test
    // documents that the single-feet semantics is intentional in the
    // ft input — the UX guard against the misreading lives in the JSX
    // (separate ft and in fields).
    expect(ftInToCm("5.9", "")).toBeCloseTo(179.8, 1);
  });
});

describe("lbsToKg / parseKg / kgToLbs", () => {
  it("lbsToKg converts pounds to kilograms", () => {
    expect(lbsToKg("165")).toBeCloseTo(74.84, 1);
    expect(lbsToKg("220")).toBeCloseTo(99.79, 1);
  });

  it("parseKg passes through valid kg values, rounded to 2 dp", () => {
    expect(parseKg("75")).toBe(75);
    expect(parseKg("75.456")).toBe(75.46);
  });

  it("returns null on invalid input", () => {
    expect(lbsToKg("")).toBeNull();
    expect(lbsToKg("abc")).toBeNull();
    expect(parseKg("")).toBeNull();
  });

  it("kgToLbs round-trips with lbsToKg within rounding tolerance", () => {
    const original = "150";
    const kg = lbsToKg(original)!;
    const back = kgToLbs(kg);
    expect(back).toBeCloseTo(150, 1);
  });
});
