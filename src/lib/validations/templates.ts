import { z } from "zod";

const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack", "other"]);

// ─── Workout templates ────────────────────────────────────────────────────────

export const createWorkoutTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional().nullable(),
  is_public: z.boolean().default(false),
});

export const addTemplateExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  order_index: z.number().int().min(0),
  target_sets: z.number().int().min(1).max(100).optional().nullable(),
  target_reps: z.number().int().min(1).max(9999).optional().nullable(),
  target_kg: z.number().min(0).max(9999).optional().nullable(),
  rest_seconds: z.number().int().min(0).max(600).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateWorkoutTemplateSchema = createWorkoutTemplateSchema.partial();

// ─── Meal templates ───────────────────────────────────────────────────────────

export const createMealTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  meal_type: mealTypeEnum.optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export const addTemplateFoodSchema = z.object({
  food_item_id: z.string().uuid(),
  quantity_grams: z.number().min(0.1).max(10_000),
});

export const updateMealTemplateSchema = createMealTemplateSchema.partial();

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateWorkoutTemplateInput = z.infer<typeof createWorkoutTemplateSchema>;
export type AddTemplateExerciseInput = z.infer<typeof addTemplateExerciseSchema>;
export type UpdateWorkoutTemplateInput = z.infer<typeof updateWorkoutTemplateSchema>;
export type CreateMealTemplateInput = z.infer<typeof createMealTemplateSchema>;
export type AddTemplateFoodInput = z.infer<typeof addTemplateFoodSchema>;
export type UpdateMealTemplateInput = z.infer<typeof updateMealTemplateSchema>;
