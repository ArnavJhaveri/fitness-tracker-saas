/**
 * Curated registry of phase types with rich UI metadata.
 *
 * The DB column is permissive (`text`, no CHECK), so users can theoretically
 * insert anything. Types listed here get an icon, description, and sensible
 * default copy. Unknown types render with the `custom` fallback.
 *
 * Adding a new phase type to the registry is a code-only change — no migration.
 */
import type { PhaseType } from "@/types/database";

export interface PhaseTypeMeta {
  /** Discriminator used in the DB */
  type: PhaseType;
  /** Short human label, shown in selectors and badges */
  label: string;
  /** One-line description shown beneath the label in the picker */
  description: string;
  /** Suggested rate of weight change in kg/week (null = not weight-driven) */
  suggestedWeightChange: number | null;
  /** Suggested colour theme key (resolved by Tailwind classes) */
  color: "indigo" | "rose" | "emerald" | "amber" | "sky" | "violet" | "slate";
  /** Whether this phase type implies a calorie target by default */
  isNutritionFocused: boolean;
  /** Whether this phase type implies a training-volume target by default */
  isTrainingFocused: boolean;
}

export const PHASE_TYPES: PhaseTypeMeta[] = [
  {
    type: "cut",
    label: "Cut",
    description: "Lose fat — sustained calorie deficit",
    suggestedWeightChange: -0.5,
    color: "rose",
    isNutritionFocused: true,
    isTrainingFocused: true,
  },
  {
    type: "bulk",
    label: "Bulk",
    description: "Build muscle — slight calorie surplus",
    suggestedWeightChange: 0.25,
    color: "emerald",
    isNutritionFocused: true,
    isTrainingFocused: true,
  },
  {
    type: "maintenance",
    label: "Maintenance",
    description: "Hold weight — eat at TDEE",
    suggestedWeightChange: 0,
    color: "indigo",
    isNutritionFocused: true,
    isTrainingFocused: true,
  },
  {
    type: "recomp",
    label: "Recomposition",
    description: "Lose fat and gain muscle simultaneously",
    suggestedWeightChange: 0,
    color: "violet",
    isNutritionFocused: true,
    isTrainingFocused: true,
  },
  {
    type: "strength_block",
    label: "Strength Block",
    description: "Lower volume, heavier loads",
    suggestedWeightChange: null,
    color: "amber",
    isNutritionFocused: false,
    isTrainingFocused: true,
  },
  {
    type: "hypertrophy_block",
    label: "Hypertrophy Block",
    description: "Higher volume, moderate loads",
    suggestedWeightChange: null,
    color: "violet",
    isNutritionFocused: false,
    isTrainingFocused: true,
  },
  {
    type: "endurance_block",
    label: "Endurance Block",
    description: "Cardiovascular conditioning focus",
    suggestedWeightChange: null,
    color: "sky",
    isNutritionFocused: false,
    isTrainingFocused: true,
  },
  {
    type: "general_fitness",
    label: "General Fitness",
    description: "Stay active without a specific goal",
    suggestedWeightChange: null,
    color: "slate",
    isNutritionFocused: false,
    isTrainingFocused: false,
  },
  {
    type: "custom",
    label: "Custom",
    description: "Define your own focus",
    suggestedWeightChange: null,
    color: "slate",
    isNutritionFocused: false,
    isTrainingFocused: false,
  },
];

const PHASE_TYPE_INDEX: ReadonlyMap<string, PhaseTypeMeta> = new Map(
  PHASE_TYPES.map((p) => [p.type, p]),
);

/**
 * Resolve a phase type to its metadata. Unknown types fall back to `custom`
 * so the UI never breaks when an admin or future migration introduces a new
 * value the client hasn't been deployed to recognise yet.
 */
export function getPhaseTypeMeta(type: string | null | undefined): PhaseTypeMeta {
  if (!type) return PHASE_TYPE_INDEX.get("custom")!;
  return PHASE_TYPE_INDEX.get(type) ?? PHASE_TYPE_INDEX.get("custom")!;
}
