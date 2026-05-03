import { z } from "zod";

const themeEnum = z.enum(["light", "dark", "system"]);
const weightUnit = z.enum(["kg", "lbs"]);
const heightUnit = z.enum(["cm", "ft"]);
const distanceUnit = z.enum(["km", "miles"]);
const waterUnit = z.enum(["ml", "oz"]);

export const updateSettingsSchema = z.object({
  // Units
  weight_unit: weightUnit.optional(),
  height_unit: heightUnit.optional(),
  distance_unit: distanceUnit.optional(),
  water_unit: waterUnit.optional(),

  // Targets
  daily_calorie_target: z.number().int().min(500).max(10_000).optional().nullable(),
  daily_protein_target_g: z.number().min(0).max(500).optional().nullable(),
  daily_water_target_ml: z.number().int().min(500).max(10_000).optional(),
  sleep_target_minutes: z.number().int().min(60).max(1440).optional(),
  default_rest_seconds: z.number().int().min(0).max(600).optional(),

  // UI
  theme: themeEnum.optional(),
  week_starts_on: z.number().int().min(0).max(6).optional(),
  timezone: z.string().min(1).max(100).optional(),

  // Notifications
  notifications_enabled: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
