import { z } from "zod";
import { MUSCLE_GROUP_VALUES } from "@/lib/registry/muscle-groups";

const muscleGroupEnum = z.enum(MUSCLE_GROUP_VALUES);

// Trim BEFORE the length check so "   " (whitespace-only) is rejected. The
// chain order matters: `.min(1).trim()` validates the raw string first, so
// "   " passes min(1) (length 3) and then trims to "". The transform-and-refine
// pattern below applies length checks to the trimmed result.
const exerciseCategorySchema = z
  .string()
  .max(40, "Category must be 40 characters or fewer")
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, { message: "Category is required" });

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  category: exerciseCategorySchema,
  primary_muscle_group: muscleGroupEnum,
  secondary_muscle_groups: z.array(muscleGroupEnum).max(4).default([]),
  instructions: z.string().max(2000).optional().nullable(),
});

export const updateExerciseSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    category: exerciseCategorySchema.optional(),
    primary_muscle_group: muscleGroupEnum.optional(),
    secondary_muscle_groups: z.array(muscleGroupEnum).max(4).optional(),
    instructions: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const createSetSchema = z.object({
  set_number: z.number().int().min(1).max(100),
  reps: z.number().int().min(1).max(9999).optional().nullable(),
  weight_kg: z.number().min(0).max(9999).optional().nullable(),
  duration_seconds: z.number().int().min(1).max(86400).optional().nullable(),
  distance_meters: z.number().min(0).max(100000).optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  is_warmup: z.boolean().default(false),
});

export const createWorkoutSessionSchema = z
  .object({
    name: z.string().min(1).max(200).trim(),
    notes: z.string().max(2000).optional().nullable(),
    started_at: z.string().datetime(),
    ended_at: z.string().datetime().optional().nullable(),
  })
  .refine((d) => !d.ended_at || d.ended_at >= d.started_at, {
    message: "ended_at must be on or after started_at",
    path: ["ended_at"],
  });

// `.partial()` on a `.refine()`'d schema strips the cross-field check, so
// re-apply it. PATCH callers may submit just one of the two fields, in
// which case the refine's check is a no-op (only enforced if both present).
export const updateWorkoutSessionSchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    notes: z.string().max(2000).optional().nullable(),
    started_at: z.string().datetime().optional(),
    ended_at: z.string().datetime().optional().nullable(),
  })
  .refine((d) => !d.started_at || !d.ended_at || d.ended_at >= d.started_at, {
    message: "ended_at must be on or after started_at",
    path: ["ended_at"],
  });

export const updateSetSchema = createSetSchema.partial();

export const addExerciseToWorkoutSchema = z.object({
  exercise_id: z.string().uuid(),
  order_index: z.number().int().min(0),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type CreateWorkoutSessionInput = z.infer<typeof createWorkoutSessionSchema>;
export type UpdateWorkoutSessionInput = z.infer<typeof updateWorkoutSessionSchema>;
export type AddExerciseToWorkoutInput = z.infer<typeof addExerciseToWorkoutSchema>;
