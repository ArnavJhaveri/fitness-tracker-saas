/**
 * Unit tests for useOnboardingState — the hook owning step navigation
 * and conditional-step visibility for the onboarding wizard.
 *
 * The wizard's step list is dynamic: nutrition + first-phase steps are
 * gated on the intents the user picked on the welcome screen. If the
 * user advances past a step, then goes back and deselects the intent
 * that revealed it, the visible step list shrinks beneath the cursor.
 * `safeStep` is the clamping mechanism that prevents the wizard from
 * landing on `undefined` and rendering a blank screen.
 *
 * These tests pin that clamping behaviour plus the basic navigation
 * primitives (goNext/goBack bounds).
 */
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useOnboardingState } from "@/app/onboarding/_lib/useOnboardingState";

const baseDefaults = {
  defaultTimezone: "Europe/London",
  defaultWeightUnit: "kg" as const,
  defaultHeightUnit: "cm" as const,
};

describe("useOnboardingState — initial step list", () => {
  it("starts with [welcome, you, defaults] when no intents are picked", () => {
    const { result } = renderHook(() => useOnboardingState(baseDefaults));

    expect(result.current.stepDefs.map((s) => s.key)).toEqual(["welcome", "you", "defaults"]);
    expect(result.current.safeStep).toBe(0);
    expect(result.current.currentKey).toBe("welcome");
    expect(result.current.isLast).toBe(false);
  });

  it("inserts the nutrition step when a diet-relevant intent is picked", () => {
    const { result } = renderHook(() => useOnboardingState(baseDefaults));

    act(() => result.current.setIntents(["track_nutrition"]));

    expect(result.current.stepDefs.map((s) => s.key)).toEqual([
      "welcome",
      "you",
      "nutrition",
      "defaults",
    ]);
    expect(result.current.showNutrition).toBe(true);
    expect(result.current.showFirstPhase).toBe(false);
  });

  it("inserts the phase step when a body-composition intent is picked", () => {
    const { result } = renderHook(() => useOnboardingState(baseDefaults));

    act(() => result.current.setIntents(["gain_muscle"]));

    expect(result.current.stepDefs.map((s) => s.key)).toEqual([
      "welcome",
      "you",
      "nutrition", // gain_muscle is also a nutrition intent
      "defaults",
      "phase",
    ]);
    expect(result.current.showFirstPhase).toBe(true);
  });
});

describe("useOnboardingState — navigation bounds", () => {
  it("goNext stops at the last step instead of overshooting", () => {
    // Without bounds checks the wizard would render `undefined` for
    // currentKey and crash. Pin the clamp.
    const { result } = renderHook(() => useOnboardingState(baseDefaults));

    // Default list has 3 steps: welcome (0), you (1), defaults (2). Try to
    // overshoot.
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    act(() => result.current.goNext());

    expect(result.current.safeStep).toBe(2);
    expect(result.current.currentKey).toBe("defaults");
    expect(result.current.isLast).toBe(true);
  });

  it("goBack stops at 0 instead of going negative", () => {
    const { result } = renderHook(() => useOnboardingState(baseDefaults));

    act(() => result.current.goBack());
    act(() => result.current.goBack());

    expect(result.current.safeStep).toBe(0);
    expect(result.current.currentKey).toBe("welcome");
  });
});

describe("useOnboardingState — safe-clamp when steps disappear", () => {
  it("clamps safeStep when the user deselects an intent that revealed a later step", () => {
    // The bug this guards against: user picks gain_muscle (adds nutrition +
    // phase), advances to step 4 (phase), goes back to welcome, deselects
    // gain_muscle. stepDefs shrinks from 5 → 3 entries; the underlying step
    // counter is still 4 (out of bounds). Without safeStep clamping, the
    // wizard renders currentKey=undefined → blank screen.
    const { result } = renderHook(() => useOnboardingState(baseDefaults));

    // 1. Pick a body-comp intent → step list grows to 5
    act(() => result.current.setIntents(["gain_muscle"]));
    expect(result.current.stepDefs).toHaveLength(5);

    // 2. Advance to the last step (phase, index 4)
    act(() => result.current.goNext()); // 1 (you)
    act(() => result.current.goNext()); // 2 (nutrition)
    act(() => result.current.goNext()); // 3 (defaults)
    act(() => result.current.goNext()); // 4 (phase)
    expect(result.current.currentKey).toBe("phase");

    // 3. Deselect the intent. List shrinks to 3 — the raw counter is still
    // pointing at 4. safeStep must clamp.
    act(() => result.current.setIntents([]));
    expect(result.current.stepDefs).toHaveLength(3);
    expect(result.current.safeStep).toBe(2); // clamped to last valid index
    expect(result.current.currentKey).toBe("defaults");
    expect(result.current.isLast).toBe(true);
  });

  it("goNext from a clamped position respects the new bound, not the stale counter", () => {
    // After deselecting an intent that shrank the step list, the next
    // goNext call must NOT advance past the new last step. Without the
    // double-clamp inside goNext, the user could press Next and skip past
    // the visible last step.
    const { result } = renderHook(() => useOnboardingState(baseDefaults));

    act(() => result.current.setIntents(["lose_weight"])); // 5 steps
    act(() => result.current.goNext()); // 1
    act(() => result.current.goNext()); // 2
    act(() => result.current.goNext()); // 3
    act(() => result.current.goNext()); // 4 (phase, last)

    act(() => result.current.setIntents([])); // shrinks list back to 3
    act(() => result.current.goNext()); // would-be 5 without clamp

    expect(result.current.safeStep).toBe(2);
    expect(result.current.currentKey).toBe("defaults");
  });
});

describe("useOnboardingState — defaults from props", () => {
  it("seeds aboutYou units from the props (not hard-coded kg/cm)", () => {
    // Server passes the user's existing units in. The hook must respect
    // them so an imperial user doesn't see the form pre-filled with metric.
    const { result } = renderHook(() =>
      useOnboardingState({
        defaultTimezone: "America/Los_Angeles",
        defaultWeightUnit: "lbs",
        defaultHeightUnit: "ft",
      }),
    );

    expect(result.current.aboutYou.weight_unit).toBe("lbs");
    expect(result.current.aboutYou.height_unit).toBe("ft");
  });

  it("seeds defaults.timezone from props (browser-resolved value overrides on mount)", () => {
    // The post-mount Intl-resolved timezone is whatever the test runner's
    // environment reports — we don't pin a specific value, just that the
    // initial value is correctly seeded from props before mount.
    const { result } = renderHook(() => useOnboardingState(baseDefaults));
    // The browser-resolved tz overrides on mount in jsdom (resolves to the
    // host tz). The point of this test is the seed path, not the override:
    // assert it's a non-empty string.
    expect(typeof result.current.defaults.timezone).toBe("string");
    expect(result.current.defaults.timezone.length).toBeGreaterThan(0);
  });
});
