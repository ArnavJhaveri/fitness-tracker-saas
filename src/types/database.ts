/**
 * Auto-generated database types should come from `supabase gen types typescript`.
 * These are the hand-written base types that seed the initial schema.
 * Run: npx supabase gen types typescript --project-id <id> > src/types/database.generated.ts
 * and then re-export from here.
 */

// ─── Shared primitives ───────────────────────────────────────────────────────

export type UUID = string;
export type ISODate = string; // "YYYY-MM-DD"
export type ISOTimestamp = string; // ISO 8601

// ─── Profile ─────────────────────────────────────────────────────────────────

export type SexAtBirth = "male" | "female" | "intersex" | "prefer_not_to_say";

export interface Profile {
  id: UUID;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  date_of_birth: ISODate | null;
  timezone: string;
  /** Phase 3: optional, used only for BMR/TDEE calculations */
  sex_at_birth: SexAtBirth | null;
  /** Phase 3: denormalised cache of latest weight_entries row */
  current_weight_kg: number | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ─── Workouts ────────────────────────────────────────────────────────────────

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "full_body"
  | "cardio";

/**
 * Curated set of exercise categories that get rich UI (icons, filters).
 * The DB column is `text` with NO CHECK constraint as of migration 003 —
 * users can introduce arbitrary categories. Unknown categories render
 * with a generic look; known categories use the registry in src/lib/registry/exercise-categories.ts.
 */
export type ExerciseCategory =
  | "strength"
  | "cardio"
  | "flexibility"
  | "sports"
  | "calisthenics"
  | "mobility"
  | "yoga"
  | "other"
  | (string & {}); // permissive: allow any text from the DB

export interface Exercise {
  id: UUID;
  name: string;
  category: ExerciseCategory;
  primary_muscle_group: MuscleGroup;
  secondary_muscle_groups: MuscleGroup[];
  instructions: string | null;
  is_custom: boolean;
  created_by: UUID | null; // null = system exercise
  /** Phase 3: soft-delete timestamp; null means active */
  archived_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
}

export interface WorkoutSession {
  id: UUID;
  user_id: UUID;
  name: string;
  notes: string | null;
  started_at: ISOTimestamp;
  ended_at: ISOTimestamp | null;
  duration_minutes: number | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

export interface WorkoutExercise {
  id: UUID;
  workout_session_id: UUID;
  exercise_id: UUID;
  /** Populated by Supabase join — key matches the table name returned by PostgREST */
  exercises?: Exercise;
  order_index: number;
  notes: string | null;
  created_at: ISOTimestamp;
}

export interface ExerciseSet {
  id: UUID;
  workout_exercise_id: UUID;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null; // Rate of Perceived Exertion 1-10
  is_warmup: boolean;
  created_at: ISOTimestamp;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export interface FoodItem {
  id: UUID;
  name: string;
  brand: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_per_100g: number | null;
  is_custom: boolean;
  created_by: UUID | null;
  created_at: ISOTimestamp;
}

export interface Meal {
  id: UUID;
  user_id: UUID;
  meal_type: MealType;
  name: string | null;
  logged_at: ISOTimestamp;
  notes: string | null;
  created_at: ISOTimestamp;
  /** Populated by Supabase joins — key matches the actual DB relation name */
  meal_items?: (MealItem & { food_items?: FoodItem })[];
}

export interface MealItem {
  id: UUID;
  meal_id: UUID;
  food_item_id: UUID;
  /** Populated by Supabase join — key matches the table name returned by PostgREST */
  food_items?: FoodItem;
  quantity_grams: number;
  created_at: ISOTimestamp;
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export type SleepQuality = 1 | 2 | 3 | 4 | 5;

export interface SleepEntry {
  id: UUID;
  user_id: UUID;
  sleep_start: ISOTimestamp;
  sleep_end: ISOTimestamp;
  duration_minutes: number; // computed or stored
  quality: SleepQuality | null;
  notes: string | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ─── Water ────────────────────────────────────────────────────────────────────

export interface WaterEntry {
  id: UUID;
  user_id: UUID;
  amount_ml: number;
  logged_at: ISOTimestamp;
  created_at: ISOTimestamp;
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export interface WeightEntry {
  id: UUID;
  user_id: UUID;
  weight_kg: number;
  body_fat_percentage: number | null;
  logged_at: ISOTimestamp;
  notes: string | null;
  created_at: ISOTimestamp;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

/**
 * Curated set of goal types with rich UI. The DB column has no CHECK
 * constraint as of migration 003 — additional types render generically.
 * See src/lib/registry/goal-types.ts for the rich-UI registry.
 */
export type GoalType =
  | "weight_loss"
  | "weight_gain"
  | "muscle_gain"
  | "improve_endurance"
  | "improve_strength"
  | "calorie_target"
  | "water_target"
  | "sleep_target"
  | "workout_frequency"
  | "custom"
  | (string & {});

export type GoalStatus = "active" | "completed" | "paused" | "abandoned";

export interface Goal {
  id: UUID;
  user_id: UUID;
  type: GoalType;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  target_date: ISODate | null;
  status: GoalStatus;
  /** Phase 3: optional link to the phase that owns this goal */
  phase_id: UUID | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ─── User Settings ────────────────────────────────────────────────────────────

export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active" | "extra_active";

/**
 * Multi-select chips collected during onboarding step 1.
 * Drives which dashboard widgets show by default, but every choice is
 * also overridable via explicit add/remove later.
 */
export type PrimaryIntent =
  | "track_workouts"
  | "track_nutrition"
  | "lose_weight"
  | "gain_muscle"
  | "improve_endurance"
  | "improve_sleep"
  | "general_fitness";

export interface UserSettings {
  user_id: UUID;
  weight_unit: "kg" | "lbs";
  height_unit: "cm" | "ft";
  distance_unit: "km" | "miles";
  water_unit: "ml" | "oz";
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
  /** Phase 3 */
  daily_carbs_target_g: number | null;
  daily_fat_target_g: number | null;
  daily_sugar_target_g: number | null;
  daily_water_target_ml: number;
  sleep_target_minutes: number;
  /** Phase 3 */
  weekly_workout_hours_target: number | null;
  default_rest_seconds: number | null;
  theme: "light" | "dark" | "system";
  week_starts_on: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  timezone: string;
  notifications_enabled: boolean;
  /** Phase 3: onboarding state — null means show banner / wizard */
  onboarded_at: ISOTimestamp | null;
  activity_level: ActivityLevel | null;
  dietary_pattern: string | null;
  excluded_foods: string[] | null;
  primary_intents: PrimaryIntent[] | null;
  /** Reserved for v2 adaptive-targets feature; not yet read from */
  adaptive_targets: boolean;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ─── Phases (migration 003) ───────────────────────────────────────────────────

export type PhaseType =
  | "cut"
  | "bulk"
  | "maintenance"
  | "recomp"
  | "strength_block"
  | "hypertrophy_block"
  | "endurance_block"
  | "general_fitness"
  | "custom";

export type PhaseStatus = "planned" | "active" | "ended" | "superseded";

export interface Phase {
  id: UUID;
  user_id: UUID;
  name: string;
  phase_type: PhaseType;
  notes: string | null;
  start_date: ISODate;
  planned_end_date: ISODate | null;
  actual_end_date: ISODate | null;
  status: PhaseStatus;
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
  daily_carbs_target_g: number | null;
  daily_fat_target_g: number | null;
  daily_sugar_target_g: number | null;
  daily_water_target_ml: number | null;
  weekly_workout_target: number | null;
  weekly_workout_hours_target: number | null;
  target_weight_kg: number | null;
  target_weight_change_kg_per_week: number | null;
  superseded_by_phase_id: UUID | null;
  derived_from_phase_id: UUID | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

/**
 * Resolved daily targets — output of resolveDailyTargets().
 * Any field can be null if neither the active phase nor user_settings provides
 * a value. UI must render gracefully when targets are missing.
 */
export interface ResolvedDailyTargets {
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
  daily_carbs_target_g: number | null;
  daily_fat_target_g: number | null;
  daily_sugar_target_g: number | null;
  daily_water_target_ml: number | null;
  sleep_target_minutes: number | null;
  weekly_workout_hours_target: number | null;
  /** The phase that supplied any non-null overrides; null means companion mode */
  active_phase_id: UUID | null;
  active_phase_name: string | null;
  active_phase_type: PhaseType | null;
}

// ─── Workout Templates ────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: UUID;
  user_id: UUID;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  exercises?: WorkoutTemplateExercise[];
}

export interface WorkoutTemplateExercise {
  id: UUID;
  template_id: UUID;
  exercise_id: UUID;
  exercise?: Exercise;
  order_index: number;
  target_sets: number | null;
  target_reps: number | null;
  target_kg: number | null;
  rest_seconds: number | null;
  notes: string | null;
  created_at: ISOTimestamp;
}

// ─── Meal Templates ───────────────────────────────────────────────────────────

export interface MealTemplate {
  id: UUID;
  user_id: UUID;
  name: string;
  meal_type: MealType | null;
  description: string | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  items?: MealTemplateItem[];
}

export interface MealTemplateItem {
  id: UUID;
  template_id: UUID;
  food_item_id: UUID;
  food_item?: FoodItem;
  quantity_grams: number;
  created_at: ISOTimestamp;
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export type PersonalRecordType =
  | "max_weight_kg"
  | "max_reps"
  | "max_volume_kg"
  | "best_time_sec"
  | "best_distance_m";

export interface PersonalRecord {
  id: UUID;
  user_id: UUID;
  exercise_id: UUID;
  exercise?: Exercise;
  record_type: PersonalRecordType;
  value: number;
  achieved_at: ISOTimestamp;
  workout_set_id: UUID | null;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DailySummary {
  log_date: ISODate;
  workout_count: number;
  total_workout_minutes: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_water_ml: number;
  total_sleep_minutes: number;
  avg_sleep_quality: number | null;
  weight_kg: number | null;
  body_fat_percentage: number | null;
}

// ─── Database shape (for Supabase typed client) ───────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      exercises: {
        Row: Exercise;
        Insert: Omit<Exercise, "id" | "created_at">;
        Update: Partial<Omit<Exercise, "id" | "created_at">>;
      };
      workout_sessions: {
        Row: WorkoutSession;
        Insert: Omit<WorkoutSession, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<WorkoutSession, "id" | "user_id" | "created_at">>;
      };
      workout_exercises: {
        Row: WorkoutExercise;
        Insert: Omit<WorkoutExercise, "id" | "created_at">;
        Update: Partial<Omit<WorkoutExercise, "id" | "created_at">>;
      };
      exercise_sets: {
        Row: ExerciseSet;
        Insert: Omit<ExerciseSet, "id" | "created_at">;
        Update: Partial<Omit<ExerciseSet, "id" | "created_at">>;
      };
      food_items: {
        Row: FoodItem;
        Insert: Omit<FoodItem, "id" | "created_at">;
        Update: Partial<Omit<FoodItem, "id" | "created_at">>;
      };
      meals: {
        Row: Meal;
        Insert: Omit<Meal, "id" | "created_at">;
        Update: Partial<Omit<Meal, "id" | "user_id" | "created_at">>;
      };
      meal_items: {
        Row: MealItem;
        Insert: Omit<MealItem, "id" | "created_at">;
        Update: Partial<Omit<MealItem, "id" | "created_at">>;
      };
      sleep_entries: {
        Row: SleepEntry;
        Insert: Omit<SleepEntry, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SleepEntry, "id" | "user_id" | "created_at">>;
      };
      water_entries: {
        Row: WaterEntry;
        Insert: Omit<WaterEntry, "id" | "created_at">;
        Update: Partial<Omit<WaterEntry, "id" | "user_id" | "created_at">>;
      };
      weight_entries: {
        Row: WeightEntry;
        Insert: Omit<WeightEntry, "id" | "created_at">;
        Update: Partial<Omit<WeightEntry, "id" | "user_id" | "created_at">>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Goal, "id" | "user_id" | "created_at">>;
      };
      phases: {
        Row: Phase;
        Insert: Omit<Phase, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Phase, "id" | "user_id" | "created_at">>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, "created_at" | "updated_at">;
        Update: Partial<Omit<UserSettings, "user_id" | "created_at">>;
      };
    };
  };
}
