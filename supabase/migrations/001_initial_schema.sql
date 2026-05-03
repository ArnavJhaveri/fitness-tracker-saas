-- ============================================================
-- FitTrack — Initial Schema
-- ============================================================
-- Run via: supabase db push  (or paste into Supabase SQL editor)
--
-- Design principles:
--   • Row Level Security (RLS) on EVERY user-data table
--   • Users can only ever read/write their own rows
--   • Timestamps use timestamptz (UTC) everywhere
--   • Soft deletes via deleted_at where needed (adds later)
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast ILIKE on food/exercise names

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users with app-specific fields.
-- Created automatically via trigger on auth.users INSERT.

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  height_cm       NUMERIC(5,2),
  date_of_birth   DATE,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Exercises ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exercises (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  category                TEXT NOT NULL CHECK (category IN ('strength','cardio','flexibility','sports')),
  primary_muscle_group    TEXT NOT NULL,
  secondary_muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  instructions            TEXT,
  is_custom               BOOLEAN NOT NULL DEFAULT FALSE,
  created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System exercises are visible to all; custom exercises only to their owner
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System exercises are visible to all authenticated users"
  ON public.exercises FOR SELECT USING (
    auth.role() = 'authenticated' AND (is_custom = FALSE OR created_by = auth.uid())
  );

CREATE POLICY "Users can insert own custom exercises"
  ON public.exercises FOR INSERT WITH CHECK (
    is_custom = TRUE AND created_by = auth.uid()
  );

CREATE POLICY "Users can update own custom exercises"
  ON public.exercises FOR UPDATE USING (is_custom = TRUE AND created_by = auth.uid());

CREATE POLICY "Users can delete own custom exercises"
  ON public.exercises FOR DELETE USING (is_custom = TRUE AND created_by = auth.uid());

CREATE INDEX exercises_name_trgm_idx ON public.exercises USING GIN (name gin_trgm_ops);

-- ─── Workout Sessions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  notes            TEXT,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
      ELSE NULL
    END
  ) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workout sessions"
  ON public.workout_sessions FOR ALL USING (auth.uid() = user_id);

CREATE INDEX workout_sessions_user_started_idx ON public.workout_sessions (user_id, started_at DESC);

CREATE TRIGGER workout_sessions_set_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Workout Exercises (session × exercise join) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_session_id  UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id         UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index         INTEGER NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- RLS through workout_sessions ownership
CREATE POLICY "Users can manage exercises in own sessions"
  ON public.workout_exercises FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    )
  );

-- ─── Exercise Sets ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exercise_sets (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id   UUID NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number            INTEGER NOT NULL,
  reps                  INTEGER CHECK (reps > 0),
  weight_kg             NUMERIC(7,3) CHECK (weight_kg >= 0),
  duration_seconds      INTEGER CHECK (duration_seconds > 0),
  distance_meters       NUMERIC(10,2) CHECK (distance_meters >= 0),
  rpe                   NUMERIC(3,1) CHECK (rpe BETWEEN 1 AND 10),
  is_warmup             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sets in own workouts"
  ON public.exercise_sets FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM   public.workout_exercises we
      JOIN   public.workout_sessions  ws ON ws.id = we.workout_session_id
      WHERE  we.id = workout_exercise_id AND ws.user_id = auth.uid()
    )
  );

-- ─── Food Items ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.food_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  brand               TEXT,
  calories_per_100g   NUMERIC(8,2) NOT NULL CHECK (calories_per_100g >= 0),
  protein_per_100g    NUMERIC(6,2) NOT NULL CHECK (protein_per_100g >= 0),
  carbs_per_100g      NUMERIC(6,2) NOT NULL CHECK (carbs_per_100g >= 0),
  fat_per_100g        NUMERIC(6,2) NOT NULL CHECK (fat_per_100g >= 0),
  fiber_per_100g      NUMERIC(6,2) CHECK (fiber_per_100g >= 0),
  sugar_per_100g      NUMERIC(6,2) CHECK (sugar_per_100g >= 0),
  sodium_per_100g     NUMERIC(8,2) CHECK (sodium_per_100g >= 0),
  is_custom           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System food items visible to all; custom only to owner"
  ON public.food_items FOR SELECT USING (
    auth.role() = 'authenticated' AND (is_custom = FALSE OR created_by = auth.uid())
  );

CREATE POLICY "Users can insert own custom food items"
  ON public.food_items FOR INSERT WITH CHECK (is_custom = TRUE AND created_by = auth.uid());

CREATE POLICY "Users can update own custom food items"
  ON public.food_items FOR UPDATE USING (is_custom = TRUE AND created_by = auth.uid());

CREATE POLICY "Users can delete own custom food items"
  ON public.food_items FOR DELETE USING (is_custom = TRUE AND created_by = auth.uid());

CREATE INDEX food_items_name_trgm_idx ON public.food_items USING GIN (name gin_trgm_ops);

-- ─── Meals ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meals (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type  TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack','other')),
  name       TEXT,
  logged_at  TIMESTAMPTZ NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meals"
  ON public.meals FOR ALL USING (auth.uid() = user_id);

CREATE INDEX meals_user_logged_idx ON public.meals (user_id, logged_at DESC);

-- ─── Meal Items ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meal_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id         UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  food_item_id    UUID NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
  quantity_grams  NUMERIC(8,2) NOT NULL CHECK (quantity_grams > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items in own meals"
  ON public.meal_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.meals m WHERE m.id = meal_id AND m.user_id = auth.uid())
  );

-- ─── Sleep Entries ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sleep_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sleep_start      TIMESTAMPTZ NOT NULL,
  sleep_end        TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (sleep_end - sleep_start)) / 60
  ) STORED,
  quality          SMALLINT CHECK (quality BETWEEN 1 AND 5),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sleep_end_after_start CHECK (sleep_end > sleep_start)
);

ALTER TABLE public.sleep_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sleep entries"
  ON public.sleep_entries FOR ALL USING (auth.uid() = user_id);

CREATE INDEX sleep_entries_user_start_idx ON public.sleep_entries (user_id, sleep_start DESC);

CREATE TRIGGER sleep_entries_set_updated_at
  BEFORE UPDATE ON public.sleep_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Water Entries ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.water_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml   INTEGER NOT NULL CHECK (amount_ml > 0),
  logged_at   TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.water_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own water entries"
  ON public.water_entries FOR ALL USING (auth.uid() = user_id);

CREATE INDEX water_entries_user_logged_idx ON public.water_entries (user_id, logged_at DESC);

-- ─── Weight Entries ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weight_entries (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg            NUMERIC(6,3) NOT NULL CHECK (weight_kg > 0),
  body_fat_percentage  NUMERIC(5,2) CHECK (body_fat_percentage BETWEEN 1 AND 70),
  logged_at            TIMESTAMPTZ NOT NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own weight entries"
  ON public.weight_entries FOR ALL USING (auth.uid() = user_id);

CREATE INDEX weight_entries_user_logged_idx ON public.weight_entries (user_id, logged_at DESC);

-- ─── Goals ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  target_value   NUMERIC,
  current_value  NUMERIC,
  unit           TEXT,
  target_date    DATE,
  status         TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','completed','paused','abandoned')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON public.goals FOR ALL USING (auth.uid() = user_id);

CREATE INDEX goals_user_status_idx ON public.goals (user_id, status);

CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Seed: system exercises ───────────────────────────────────────────────────
-- A minimal seed — add more in 002_seed_exercises.sql

INSERT INTO public.exercises (name, category, primary_muscle_group, is_custom) VALUES
  ('Barbell Back Squat',    'strength', 'quads',      FALSE),
  ('Barbell Deadlift',      'strength', 'back',       FALSE),
  ('Bench Press',           'strength', 'chest',      FALSE),
  ('Pull-up',               'strength', 'back',       FALSE),
  ('Overhead Press',        'strength', 'shoulders',  FALSE),
  ('Barbell Row',           'strength', 'back',       FALSE),
  ('Romanian Deadlift',     'strength', 'hamstrings', FALSE),
  ('Dumbbell Curl',         'strength', 'biceps',     FALSE),
  ('Tricep Pushdown',       'strength', 'triceps',    FALSE),
  ('Running',               'cardio',   'cardio',     FALSE),
  ('Cycling',               'cardio',   'cardio',     FALSE),
  ('Jump Rope',             'cardio',   'cardio',     FALSE),
  ('Plank',                 'strength', 'core',       FALSE),
  ('Cable Crunch',          'strength', 'core',       FALSE),
  ('Hip Thrust',            'strength', 'glutes',     FALSE)
ON CONFLICT DO NOTHING;
