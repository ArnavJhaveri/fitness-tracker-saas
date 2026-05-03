import { z } from "zod";

// ─── Sleep ────────────────────────────────────────────────────────────────────

// Base object — no refinements so .partial() is safe to call on it
const sleepEntryBaseSchema = z.object({
  sleep_start: z.string().datetime(),
  sleep_end: z.string().datetime(),
  quality: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// Create: add cross-field refinement (end > start)
export const createSleepEntrySchema = sleepEntryBaseSchema.refine(
  (d) => new Date(d.sleep_end) > new Date(d.sleep_start),
  { message: "Sleep end must be after sleep start", path: ["sleep_end"] },
);

// Update: all fields optional, no cross-field check needed for partial updates
export const updateSleepEntrySchema = sleepEntryBaseSchema.partial();

// ─── Water ────────────────────────────────────────────────────────────────────

export const createWaterEntrySchema = z.object({
  amount_ml: z.number().int().min(1).max(5000),
  logged_at: z.string().datetime(),
});

// ─── Weight ───────────────────────────────────────────────────────────────────

export const createWeightEntrySchema = z.object({
  weight_kg: z.number().min(1).max(500),
  body_fat_percentage: z.number().min(0).max(70).optional().nullable(),
  logged_at: z.string().datetime(),
  notes: z.string().max(500).optional().nullable(),
});

export const updateWeightEntrySchema = createWeightEntrySchema.partial();

// ─── Goals ────────────────────────────────────────────────────────────────────

const goalTypeEnum = z.enum([
  "weight_loss",
  "weight_gain",
  "muscle_gain",
  "improve_endurance",
  "improve_strength",
  "calorie_target",
  "water_target",
  "sleep_target",
  "workout_frequency",
  "custom",
]);

const goalStatusEnum = z.enum(["active", "completed", "paused", "abandoned"]);

export const createGoalSchema = z.object({
  type: goalTypeEnum,
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional().nullable(),
  target_value: z.number().optional().nullable(),
  current_value: z.number().optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  target_date: z.string().date().optional().nullable(),
});

export const updateGoalSchema = createGoalSchema
  .extend({
    status: goalStatusEnum,
  })
  .partial();

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateSleepEntryInput = z.infer<typeof createSleepEntrySchema>;
export type UpdateSleepEntryInput = z.infer<typeof updateSleepEntrySchema>;
export type CreateWaterEntryInput = z.infer<typeof createWaterEntrySchema>;
export type CreateWeightEntryInput = z.infer<typeof createWeightEntrySchema>;
export type UpdateWeightEntryInput = z.infer<typeof updateWeightEntrySchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
