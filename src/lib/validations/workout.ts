import { z } from "zod";

const muscleGroupEnum = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "full_body",
  "cardio",
]);

const exerciseCategoryEnum = z.enum(["strength", "cardio", "flexibility", "sports"]);

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  category: exerciseCategoryEnum,
  primary_muscle_group: muscleGroupEnum,
  secondary_muscle_groups: z.array(muscleGroupEnum).max(4).default([]),
  instructions: z.string().max(2000).optional().nullable(),
});

export const createSetSchema = z.object({
  set_number: z.number().int().min(1).max(100),
  reps: z.number().int().min(1).max(9999).optional().nullable(),
  weight_kg: z.number().min(0).max(9999).optional().nullable(),
  duration_seconds: z.number().int().min(1).max(86400).optional().nullable(),
  distance_meters: z.number().min(0).max(100000).optional().nullable(),
  rpe: z.number().min(1).max(10).optional().nullable(),
  is_warmup: z.boolean().default(false),
});

export const createWorkoutSessionSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  notes: z.string().max(2000).optional().nullable(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional().nullable(),
});

export const updateWorkoutSessionSchema = createWorkoutSessionSchema.partial();

export const updateSetSchema = createSetSchema.partial();

export const addExerciseToWorkoutSchema = z.object({
  exercise_id: z.string().uuid(),
  order_index: z.number().int().min(0),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
export type CreateWorkoutSessionInput = z.infer<typeof createWorkoutSessionSchema>;
export type UpdateWorkoutSessionInput = z.infer<typeof updateWorkoutSessionSchema>;
export type AddExerciseToWorkoutInput = z.infer<typeof addExerciseToWorkoutSchema>;
