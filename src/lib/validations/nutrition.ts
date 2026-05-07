import { z } from "zod";

const mealTypeEnum = z.enum(["breakfast", "lunch", "dinner", "snack", "other"]);

// .strict() on every create schema rejects unknown keys at parse time. The
// route handlers spread the validated body into Supabase inserts (then
// override server-controlled fields like user_id / is_custom / created_by).
// Without strict mode, a client could include those fields and rely on JS
// object-spread order to leak them past the override.
export const createFoodItemSchema = z
  .object({
    name: z.string().min(1).max(200).trim(),
    brand: z.string().max(100).trim().optional().nullable(),
    calories_per_100g: z.number().min(0).max(9000),
    protein_per_100g: z.number().min(0).max(100),
    carbs_per_100g: z.number().min(0).max(100),
    fat_per_100g: z.number().min(0).max(100),
    fiber_per_100g: z.number().min(0).max(100).optional().nullable(),
    sugar_per_100g: z.number().min(0).max(100).optional().nullable(),
    sodium_per_100g: z.number().min(0).max(100000).optional().nullable(),
  })
  .strict();

export const createMealSchema = z
  .object({
    meal_type: mealTypeEnum,
    name: z.string().max(200).trim().optional().nullable(),
    logged_at: z.string().datetime(),
    notes: z.string().max(1000).optional().nullable(),
  })
  .strict();

export const addMealItemSchema = z
  .object({
    food_item_id: z.string().uuid(),
    quantity_grams: z.number().min(0.1).max(10000),
  })
  .strict();

export const updateMealSchema = createMealSchema.partial();

export type CreateFoodItemInput = z.infer<typeof createFoodItemSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type AddMealItemInput = z.infer<typeof addMealItemSchema>;
