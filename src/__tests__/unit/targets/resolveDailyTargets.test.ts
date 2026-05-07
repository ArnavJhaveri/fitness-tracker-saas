import { describe, expect, it } from "vitest";
import { applyResolution } from "@/lib/targets/resolveDailyTargets";
import type { Phase, UserSettings } from "@/types/database";

const baseSettings: Pick<
  UserSettings,
  | "daily_calorie_target"
  | "daily_protein_target_g"
  | "daily_carbs_target_g"
  | "daily_fat_target_g"
  | "daily_sugar_target_g"
  | "daily_water_target_ml"
  | "sleep_target_minutes"
  | "weekly_workout_hours_target"
> = {
  daily_calorie_target: 2200,
  daily_protein_target_g: 150,
  daily_carbs_target_g: 250,
  daily_fat_target_g: 80,
  daily_sugar_target_g: 50,
  daily_water_target_ml: 3000,
  sleep_target_minutes: 480,
  weekly_workout_hours_target: 4,
};

function phase(overrides: Partial<Phase> = {}): Phase {
  return {
    id: "phase-1",
    user_id: "user-1",
    name: "Test cut",
    phase_type: "cut",
    notes: null,
    start_date: "2026-04-01",
    planned_end_date: null,
    actual_end_date: null,
    status: "active",
    daily_calorie_target: null,
    daily_protein_target_g: null,
    daily_carbs_target_g: null,
    daily_fat_target_g: null,
    daily_sugar_target_g: null,
    daily_water_target_ml: null,
    weekly_workout_target: null,
    weekly_workout_hours_target: null,
    target_weight_kg: null,
    target_weight_change_kg_per_week: null,
    superseded_by_phase_id: null,
    derived_from_phase_id: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

describe("applyResolution", () => {
  it("returns user_settings only when no phase is active (companion mode)", () => {
    const result = applyResolution(baseSettings, null);
    expect(result.daily_calorie_target).toBe(2200);
    expect(result.daily_protein_target_g).toBe(150);
    expect(result.active_phase_id).toBeNull();
    expect(result.active_phase_name).toBeNull();
  });

  it("returns nulls when both settings and phase are absent", () => {
    const result = applyResolution(null, null);
    expect(result.daily_calorie_target).toBeNull();
    expect(result.daily_protein_target_g).toBeNull();
    expect(result.daily_water_target_ml).toBeNull();
    expect(result.sleep_target_minutes).toBeNull();
  });

  it("phase value overrides user_settings when both are set", () => {
    const result = applyResolution(
      baseSettings,
      phase({ daily_calorie_target: 1800, daily_protein_target_g: 180 }),
    );
    expect(result.daily_calorie_target).toBe(1800);
    expect(result.daily_protein_target_g).toBe(180);
    expect(result.active_phase_id).toBe("phase-1");
  });

  it("falls through to user_settings for fields the phase doesn't set", () => {
    const result = applyResolution(
      baseSettings,
      phase({ daily_calorie_target: 1800 }), // only calories overridden
    );
    expect(result.daily_calorie_target).toBe(1800);
    expect(result.daily_protein_target_g).toBe(150); // from settings
    expect(result.daily_carbs_target_g).toBe(250); // from settings
    expect(result.daily_water_target_ml).toBe(3000); // from settings
  });

  it("treats phase value of 0 as a real override (not falsy fallback)", () => {
    const result = applyResolution(baseSettings, phase({ daily_sugar_target_g: 0 }));
    expect(result.daily_sugar_target_g).toBe(0);
  });

  it("sleep_target_minutes only comes from settings (no phase override yet)", () => {
    const result = applyResolution(baseSettings, phase());
    expect(result.sleep_target_minutes).toBe(480);
  });

  it("exposes the active phase's identity in the result", () => {
    const result = applyResolution(
      baseSettings,
      phase({ id: "phase-42", name: "Spring cut", phase_type: "cut" }),
    );
    expect(result.active_phase_id).toBe("phase-42");
    expect(result.active_phase_name).toBe("Spring cut");
    expect(result.active_phase_type).toBe("cut");
  });
});
