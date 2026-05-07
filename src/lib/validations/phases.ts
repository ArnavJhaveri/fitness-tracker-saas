import { z } from "zod";
import { isValidISODate } from "@/lib/utils/date";

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

/**
 * Status values a *route handler* will accept on input. We deliberately
 * exclude 'ended' and 'superseded' — these are terminal states managed by
 * the dedicated /api/phases/[id]/end and /pivot endpoints. Letting clients
 * POST a directly-ended phase would clutter history and could create an
 * orphaned superseded row with no successor.
 */
const phaseStatusOnCreateEnum = z.enum(["active", "planned"]);

/**
 * YYYY-MM-DD with calendar-validity check. Rejects "2026-13-45" etc. at the
 * API boundary so users see a clean Zod error rather than a Postgres 500.
 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine(isValidISODate, { message: "Date is not a valid calendar date" });

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
    // Only 'active' or 'planned' on creation. Ending and pivoting have
    // dedicated endpoints; accepting 'ended'/'superseded' here would let
    // clients clutter history with same-day-ended phases or orphaned
    // superseded rows with no successor.
    status: phaseStatusOnCreateEnum.default("active"),
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
 * Pivot — end the active phase and create a replacement phase.
 *
 * The new phase's start_date is the cut-over date. The old phase is given
 * `actual_end_date = start_date − 1` and `status='superseded'`; the new
 * phase becomes the active one with `derived_from_phase_id` pointing at the
 * old. Defaulting `start_date` to tomorrow means today's adherence isn't
 * measured against the new target halfway through, but the client can opt
 * into "start today" by sending today's date explicitly.
 */
export const pivotPhaseSchema = z.object({
  new_phase: createPhaseSchema,
});

export type PivotPhaseInput = z.infer<typeof pivotPhaseSchema>;

/**
 * End the active phase without creating a replacement (drop into companion
 * mode). actual_end_date is optional — the DB layer falls back to "today
 * in the user's local timezone" if not provided.
 */
export const endPhaseSchema = z
  .object({
    actual_end_date: isoDate.optional(),
  })
  .strict();

export type EndPhaseInput = z.infer<typeof endPhaseSchema>;
