/**
 * BMR / TDEE / macro suggestions.
 *
 * Used during onboarding to seed sensible default targets the user can
 * accept or override. Functions are pure and well-bounded; behaviour is
 * unit-tested in src/__tests__/unit/utils/tdee.test.ts.
 *
 * References:
 *   - Mifflin-St Jeor (1990) — most accurate BMR estimator for the general
 *     adult population (±10% for ~80% of people).
 *   - Activity multipliers from the standard Harris-Benedict / Mifflin
 *     conventions used by MyFitnessPal, Cronometer, etc.
 *   - Macro targets follow the moderate consensus of evidence-based
 *     fitness sources (Stronger by Science, Renaissance Periodization):
 *       protein 1.6–2.2 g/kg, fat 0.7–1.0 g/kg, carbs from remainder.
 */
import type { ActivityLevel, SexAtBirth } from "@/types/database";

// ─── BMR (Mifflin-St Jeor) ────────────────────────────────────────────────────

/**
 * Basal Metabolic Rate in kcal/day.
 *
 * Returns null when any input is missing — callers must surface "we need
 * more info to suggest a target" rather than silently substituting zero.
 */
export function calcBMR(args: {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: SexAtBirth;
}): number | null {
  const { weight_kg, height_cm, age, sex } = args;
  if (!Number.isFinite(weight_kg) || weight_kg <= 0) return null;
  if (!Number.isFinite(height_cm) || height_cm <= 0) return null;
  if (!Number.isFinite(age) || age < 0 || age > 130) return null;

  // Mifflin-St Jeor base
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;

  switch (sex) {
    case "male":
      return base + 5;
    case "female":
      return base - 161;
    case "intersex":
    case "prefer_not_to_say":
      // Average of male + female offsets (≈ −78). The estimator is intrinsically
      // imprecise; users can manually override the suggested target.
      return base - 78;
  }
}

// ─── Activity multipliers ─────────────────────────────────────────────────────

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // little / no exercise
  light: 1.375, // 1–3 days/week
  moderate: 1.55, // 3–5 days/week
  very_active: 1.725, // 6–7 days/week
  extra_active: 1.9, // very intense daily training, physical job
};

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity];
}

// ─── Calorie target by phase type ─────────────────────────────────────────────

const PHASE_CALORIE_ADJUSTMENT: Record<string, number> = {
  cut: -500, // ~0.5 kg/week loss
  bulk: 250, // ~0.25 kg/week gain (lean bulk)
  recomp: -200, // small deficit, high protein, lift hard
  maintenance: 0,
  // Training-only phases keep TDEE
  strength_block: 0,
  hypertrophy_block: 0,
  endurance_block: 0,
  general_fitness: 0,
  custom: 0,
};

export function suggestCalorieTarget(tdee: number, phaseType: string): number {
  const adjustment = PHASE_CALORIE_ADJUSTMENT[phaseType] ?? 0;
  // Floor at 1200 (women) / 1500 (men) is the conventional sustainable-deficit
  // boundary, but we don't have sex here and a single floor is too coarse —
  // round to nearest 25 for friendliness; UI surfaces a warning if <1500.
  return Math.round((tdee + adjustment) / 25) * 25;
}

// ─── Macro split ──────────────────────────────────────────────────────────────

/**
 * Suggest a starting macro distribution given total calories and bodyweight.
 *
 * Strategy: protein and fat are scaled by bodyweight (the evidence-based
 * approach), carbs fill the rest. Protein bias adjusts by phase — higher in
 * a cut for satiety + muscle preservation, baseline in maintenance/bulk.
 */
export function suggestMacros(
  calories: number,
  weight_kg: number,
  phaseType: string,
): { protein_g: number; carbs_g: number; fat_g: number } {
  const proteinPerKg = phaseType === "cut" ? 2.0 : phaseType === "bulk" ? 1.6 : 1.8;
  const fatPerKg = 0.8;

  const protein_g = Math.round(weight_kg * proteinPerKg);
  const fat_g = Math.round(weight_kg * fatPerKg);

  // Carbs from the remainder. 4 kcal/g carbs+protein, 9 kcal/g fat.
  const remaining = calories - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(remaining / 4));

  return { protein_g, carbs_g, fat_g };
}

// ─── Age helper ───────────────────────────────────────────────────────────────

/**
 * Age in completed years from a YYYY-MM-DD date of birth.
 * Returns null if dob is missing or invalid.
 */
export function ageFromDOB(dob: string | null | undefined, today = new Date()): number | null {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [, y, mo, d] = m;
  const birth = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(birth.getTime())) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthdayThisYear =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthdayThisYear) age -= 1;
  return age;
}
