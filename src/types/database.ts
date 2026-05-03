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

export interface Profile {
  id: UUID;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  height_cm: number | null;
  date_of_birth: ISODate | null;
  timezone: string;
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

export type ExerciseCategory = "strength" | "cardio" | "flexibility" | "sports";

export interface Exercise {
  id: UUID;
  name: string;
  category: ExerciseCategory;
  primary_muscle_group: MuscleGroup;
  secondary_muscle_groups: MuscleGroup[];
  instructions: string | null;
  is_custom: boolean;
  created_by: UUID | null; // null = system exercise
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
  | "custom";

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
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
}

// ─── User Settings ────────────────────────────────────────────────────────────

export interface UserSettings {
  user_id: UUID;
  weight_unit: "kg" | "lbs";
  height_unit: "cm" | "ft";
  distance_unit: "km" | "miles";
  water_unit: "ml" | "oz";
  daily_calorie_target: number | null;
  daily_protein_target_g: number | null;
  daily_water_target_ml: number;
  sleep_target_minutes: number;
  default_rest_seconds: number | null;
  theme: "light" | "dark" | "system";
  week_starts_on: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  timezone: string;
  notifications_enabled: boolean;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
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
    };
  };
}
