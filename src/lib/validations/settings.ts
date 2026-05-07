import { z } from "zod";

const themeEnum = z.enum(["light", "dark", "system"]);
const weightUnit = z.enum(["kg", "lbs"]);
const heightUnit = z.enum(["cm", "ft"]);
const distanceUnit = z.enum(["km", "miles"]);
const waterUnit = z.enum(["ml", "oz"]);
const activityLevelEnum = z.enum(["sedentary", "light", "moderate", "very_active", "extra_active"]);
const primaryIntentEnum = z.enum([
  "track_workouts",
  "track_nutrition",
  "lose_weight",
  "gain_muscle",
  "improve_endurance",
  "improve_sleep",
  "general_fitness",
]);

export const updateSettingsSchema = z.object({
  // Units
  weight_unit: weightUnit.optional(),
  height_unit: heightUnit.optional(),
  distance_unit: distanceUnit.optional(),
  water_unit: waterUnit.optional(),

  // Targets
  daily_calorie_target: z.number().int().min(500).max(10_000).optional().nullable(),
  daily_protein_target_g: z.number().min(0).max(500).optional().nullable(),
  daily_carbs_target_g: z.number().min(0).max(1500).optional().nullable(),
  daily_fat_target_g: z.number().min(0).max(500).optional().nullable(),
  daily_sugar_target_g: z.number().min(0).max(500).optional().nullable(),
  daily_water_target_ml: z.number().int().min(500).max(10_000).optional(),
  sleep_target_minutes: z.number().int().min(60).max(1440).optional(),
  weekly_workout_hours_target: z.number().min(0).max(50).optional().nullable(),
  default_rest_seconds: z.number().int().min(0).max(600).optional(),

  // UI
  theme: themeEnum.optional(),
  week_starts_on: z.number().int().min(0).max(6).optional(),
  timezone: z.string().min(1).max(100).optional(),

  // Notifications
  notifications_enabled: z.boolean().optional(),

  // Onboarding answers (Phase 3)
  activity_level: activityLevelEnum.optional().nullable(),
  dietary_pattern: z.string().max(50).optional().nullable(),
  excluded_foods: z.array(z.string().max(100)).max(50).optional().nullable(),
  primary_intents: z.array(primaryIntentEnum).max(10).optional().nullable(),
  adaptive_targets: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/**
 * Marks the user as having completed (or skipped) onboarding. Separate from
 * updateSettingsSchema so the route is dedicated and doesn't conflict with
 * partial settings updates.
 */
export const completeOnboardingSchema = z
  .object({
    // All onboarding answers — every one is optional so the user can skip
    // individual steps. We persist whatever they did fill in.
    full_name: z.string().min(1).max(200).optional(),
    sex_at_birth: z.enum(["male", "female", "intersex", "prefer_not_to_say"]).optional(),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    height_cm: z.number().min(50).max(280).optional(),
    current_weight_kg: z.number().min(20).max(400).optional(),
    activity_level: activityLevelEnum.optional(),
    weight_unit: weightUnit.optional(),
    height_unit: heightUnit.optional(),
    distance_unit: distanceUnit.optional(),
    water_unit: waterUnit.optional(),
    week_starts_on: z.number().int().min(0).max(6).optional(),
    timezone: z.string().min(1).max(100).optional(),
    primary_intents: z.array(primaryIntentEnum).max(10).optional(),
    dietary_pattern: z.string().max(50).optional(),
    excluded_foods: z.array(z.string().max(100)).max(50).optional(),
  })
  .strict();

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
