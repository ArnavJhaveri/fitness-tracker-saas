import { z } from "zod";

const phaseTypeEnum = z.enum([
  "cut",
  "bulk",
  "maintenance",
  "recomp",
  "strength_block",
  "hypertrophy_block",
  "endurance_block",
  "general_fitness",
  "custom",
]);

const phaseStatusEnum = z.enum(["planned", "active", "ended", "superseded"]);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

/**
 * Shared shape of phase target columns. All optional/nullable because every
 * field is opt-in — a phase can choose to override only some fields.
 */
const phaseTargetsShape = {
  daily_calorie_target: z.number().int().min(500).max(10_000).optional().nullable(),
  daily_protein_target_g: z.number().min(0).max(500).optional().nullable(),
  daily_carbs_target_g: z.number().min(0).max(1500).optional().nullable(),
  daily_fat_target_g: z.number().min(0).max(500).optional().nullable(),
  daily_sugar_target_g: z.number().min(0).max(500).optional().nullable(),
  daily_water_target_ml: z.number().int().min(500).max(10_000).optional().nullable(),
  weekly_workout_target: z.number().int().min(0).max(20).optional().nullable(),
  weekly_workout_hours_target: z.number().min(0).max(50).optional().nullable(),
  target_weight_kg: z.number().min(20).max(400).optional().nullable(),
  target_weight_change_kg_per_week: z.number().min(-3).max(3).optional().nullable(),
};

export const createPhaseSchema = z
  .object({
    name: z.string().min(1).max(200),
    phase_type: phaseTypeEnum,
    notes: z.string().max(4000).optional().nullable(),
    start_date: isoDate,
    planned_end_date: isoDate.optional().nullable(),
    status: phaseStatusEnum.default("active"),
    ...phaseTargetsShape,
  })
  .refine((data) => !data.planned_end_date || data.planned_end_date >= data.start_date, {
    message: "planned_end_date must be on or after start_date",
    path: ["planned_end_date"],
  });

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

/**
 * In-place edit — restricted to cosmetic fields. Material edits (targets,
 * type, dates) must go through the pivot endpoint to preserve analytics
 * integrity.
 */
export const updatePhaseCosmeticSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    notes: z.string().max(4000).optional().nullable(),
    planned_end_date: isoDate.optional().nullable(),
  })
  .strict();

export type UpdatePhaseCosmeticInput = z.infer<typeof updatePhaseCosmeticSchema>;

/**
 * Pivot — end the active phase and create a replacement phase in a single
 * transaction. The new phase inherits derived_from_phase_id; the old phase
 * gets superseded_by_phase_id and status='superseded'.
 */
export const pivotPhaseSchema = z
  .object({
    /** When the new phase starts. Default tomorrow so today's adherence
     *  isn't measured against the new target halfway through. */
    new_start_date: isoDate,
    new_phase: createPhaseSchema,
  })
  .refine((data) => data.new_phase.start_date === data.new_start_date, {
    message: "new_phase.start_date must equal new_start_date",
    path: ["new_phase", "start_date"],
  });

export type PivotPhaseInput = z.infer<typeof pivotPhaseSchema>;

/**
 * End the active phase without creating a replacement (drop into companion
 * mode).
 */
export const endPhaseSchema = z
  .object({
    actual_end_date: isoDate.optional(),
  })
  .strict();

export type EndPhaseInput = z.infer<typeof endPhaseSchema>;
