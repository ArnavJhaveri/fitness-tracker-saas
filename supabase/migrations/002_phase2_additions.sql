-- ============================================================
-- FitTrack — Phase 2 Additions
-- ============================================================
-- New tables:
--   • user_settings       — per-user preferences and daily targets
--   • workout_templates   — reusable workout plans
--   • workout_template_exercises
--   • meal_templates      — saved meal presets
--   • meal_template_items
--   • personal_records    — PR tracking per exercise
--
-- Schema fixes:
--   • goals.type gets a proper CHECK constraint (was free-text)
--
-- Analytics:
--   • get_daily_summary() RPC — efficient per-user daily aggregation
-- ============================================================

-- ─── Fix: goals.type constraint ───────────────────────────────────────────────
-- Add the CHECK that the TypeScript GoalType union already enforces.
-- Use a DO block so the migration is idempotent on re-runs.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'goals_type_check' AND conrelid = 'public.goals'::regclass
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_type_check CHECK (
        type IN (
          'weight_loss','weight_gain','muscle_gain',
          'improve_endurance','improve_strength',
          'calorie_target','water_target','sleep_target',
          'workout_frequency','custom'
        )
      );
  END IF;
END;
$$;

-- ─── User Settings ────────────────────────────────────────────────────────────
-- One row per user. Auto-created by trigger on auth.users INSERT.
-- Stores unit preferences, daily targets, and UI preferences.

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Units
  weight_unit             TEXT NOT NULL DEFAULT 'kg'     CHECK (weight_unit    IN ('kg','lbs')),
  height_unit             TEXT NOT NULL DEFAULT 'cm'     CHECK (height_unit    IN ('cm','ft')),
  distance_unit           TEXT NOT NULL DEFAULT 'km'     CHECK (distance_unit  IN ('km','miles')),
  water_unit              TEXT NOT NULL DEFAULT 'ml'     CHECK (water_unit     IN ('ml','oz')),

  -- Daily targets
  daily_calorie_target    INTEGER                        CHECK (daily_calorie_target > 0),
  daily_protein_target_g  NUMERIC(6,1)                   CHECK (daily_protein_target_g > 0),
  daily_water_target_ml   INTEGER NOT NULL DEFAULT 2000  CHECK (daily_water_target_ml > 0),
  sleep_target_minutes    INTEGER NOT NULL DEFAULT 480   CHECK (sleep_target_minutes > 0),

  -- Workout defaults
  default_rest_seconds    INTEGER          DEFAULT 90    CHECK (default_rest_seconds >= 0),

  -- UI / UX
  theme                   TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  week_starts_on          SMALLINT NOT NULL DEFAULT 1    CHECK (week_starts_on BETWEEN 0 AND 6), -- 0=Sun 1=Mon
  timezone                TEXT NOT NULL DEFAULT 'UTC',

  -- Future: push notification token / preferences
  notifications_enabled   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
  ON public.user_settings FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-provision a settings row when a user signs up.
-- Runs alongside the existing handle_new_user() trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- ─── Workout Templates ────────────────────────────────────────────────────────
-- A saved workout plan (list of exercises + default reps/sets).
-- Users can mark their own templates as public for future social features.

CREATE TABLE IF NOT EXISTS public.workout_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT           CHECK (char_length(description) <= 2000),
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workout templates"
  ON public.workout_templates FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public templates visible to all authenticated users"
  ON public.workout_templates FOR SELECT USING (
    auth.role() = 'authenticated' AND is_public = TRUE
  );

CREATE INDEX workout_templates_user_idx ON public.workout_templates (user_id);

CREATE TRIGGER workout_templates_set_updated_at
  BEFORE UPDATE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Workout Template Exercises ───────────────────────────────────────────────
-- Each exercise slot within a template, with optional default targets.

CREATE TABLE IF NOT EXISTS public.workout_template_exercises (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id  UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id  UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index  INTEGER NOT NULL DEFAULT 0,
  target_sets  SMALLINT        CHECK (target_sets  > 0 AND target_sets  <= 100),
  target_reps  SMALLINT        CHECK (target_reps  > 0 AND target_reps  <= 9999),
  target_kg    NUMERIC(7,3)    CHECK (target_kg   >= 0),
  rest_seconds INTEGER         CHECK (rest_seconds >= 0),
  notes        TEXT            CHECK (char_length(notes) <= 1000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage exercises in own templates"
  ON public.workout_template_exercises FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates wt
      WHERE wt.id = template_id AND wt.user_id = auth.uid()
    )
  );

CREATE INDEX workout_template_exercises_template_idx
  ON public.workout_template_exercises (template_id, order_index);

-- ─── Meal Templates ───────────────────────────────────────────────────────────
-- A saved collection of foods (e.g., "My usual breakfast").

CREATE TABLE IF NOT EXISTS public.meal_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  meal_type   TEXT           CHECK (meal_type IN ('breakfast','lunch','dinner','snack','other')),
  description TEXT           CHECK (char_length(description) <= 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meal templates"
  ON public.meal_templates FOR ALL USING (auth.uid() = user_id);

CREATE INDEX meal_templates_user_idx ON public.meal_templates (user_id);

CREATE TRIGGER meal_templates_set_updated_at
  BEFORE UPDATE ON public.meal_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Meal Template Items ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meal_template_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id    UUID NOT NULL REFERENCES public.meal_templates(id) ON DELETE CASCADE,
  food_item_id   UUID NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
  quantity_grams NUMERIC(8,2) NOT NULL CHECK (quantity_grams > 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meal_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items in own meal templates"
  ON public.meal_template_items FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meal_templates mt
      WHERE mt.id = template_id AND mt.user_id = auth.uid()
    )
  );

-- ─── Personal Records ─────────────────────────────────────────────────────────
-- One row per (user, exercise, record_type) — UPSERT on improvement.
-- Linked back to the specific set that set the record for audit trail.

CREATE TABLE IF NOT EXISTS public.personal_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  record_type     TEXT NOT NULL CHECK (
                    record_type IN (
                      'max_weight_kg',   -- heaviest single lift
                      'max_reps',        -- most reps in one set
                      'max_volume_kg',   -- weight × reps (one set)
                      'best_time_sec',   -- fastest time (cardio / timed)
                      'best_distance_m'  -- longest distance
                    )
                  ),
  value           NUMERIC(12,3) NOT NULL CHECK (value >= 0),
  achieved_at     TIMESTAMPTZ NOT NULL,
  workout_set_id  UUID REFERENCES public.exercise_sets(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, exercise_id, record_type)
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own personal records"
  ON public.personal_records FOR ALL USING (auth.uid() = user_id);

CREATE INDEX personal_records_user_exercise_idx
  ON public.personal_records (user_id, exercise_id);

CREATE TRIGGER personal_records_set_updated_at
  BEFORE UPDATE ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Additional indexes for analytics queries ─────────────────────────────────
-- These support the get_daily_summary function and future analytics pages.

-- Timestamp indexes for analytics range queries.
-- Expression indexes on (col::DATE) require IMMUTABLE functions; casting
-- TIMESTAMPTZ→DATE is STABLE (timezone-dependent), so we index the raw
-- timestamp instead. Range scans on these are equally efficient.
CREATE INDEX IF NOT EXISTS meals_user_date_idx
  ON public.meals (user_id, logged_at);

CREATE INDEX IF NOT EXISTS water_entries_user_date_idx
  ON public.water_entries (user_id, logged_at);

CREATE INDEX IF NOT EXISTS sleep_entries_user_end_date_idx
  ON public.sleep_entries (user_id, sleep_end);

CREATE INDEX IF NOT EXISTS weight_entries_user_date_idx
  ON public.weight_entries (user_id, logged_at);

CREATE INDEX IF NOT EXISTS workout_sessions_user_date_idx
  ON public.workout_sessions (user_id, started_at);

-- ─── RPC: get_daily_summary ───────────────────────────────────────────────────
-- Called via supabase.rpc('get_daily_summary', { p_user_id, p_from, p_to }).
-- Returns one row per calendar day with totals across all tracking domains.
-- SECURITY INVOKER means RLS on all queried tables is respected naturally —
-- the function runs as the calling user, not as postgres.
-- The explicit uid() guard is a belt-and-suspenders safety check.

CREATE OR REPLACE FUNCTION public.get_daily_summary(
  p_user_id  UUID,
  p_from     DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_to       DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  log_date              DATE,
  workout_count         BIGINT,
  total_workout_minutes NUMERIC,
  total_calories        NUMERIC,
  total_protein_g       NUMERIC,
  total_carbs_g         NUMERIC,
  total_fat_g           NUMERIC,
  total_water_ml        BIGINT,
  total_sleep_minutes   NUMERIC,
  avg_sleep_quality     NUMERIC,
  weight_kg             NUMERIC,
  body_fat_percentage   NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Prevent fetching another user's summary even if called directly.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: you can only request your own summary';
  END IF;

  -- Clamp range to a maximum of 366 days to avoid runaway queries.
  IF (p_to - p_from) > 366 THEN
    RAISE EXCEPTION 'Date range must not exceed 366 days';
  END IF;

  RETURN QUERY
  SELECT
    d.log_date,

    -- Workouts
    COALESCE(ws.workout_count, 0)          AS workout_count,
    COALESCE(ws.workout_minutes, 0)        AS total_workout_minutes,

    -- Nutrition
    COALESCE(n.calories,  0)               AS total_calories,
    COALESCE(n.protein_g, 0)               AS total_protein_g,
    COALESCE(n.carbs_g,   0)               AS total_carbs_g,
    COALESCE(n.fat_g,     0)               AS total_fat_g,

    -- Water
    COALESCE(w.water_ml, 0)                AS total_water_ml,

    -- Sleep (end date = the day you wake up)
    COALESCE(sl.sleep_minutes, 0)          AS total_sleep_minutes,
    sl.sleep_quality                       AS avg_sleep_quality,

    -- Weight (latest entry that day)
    we.weight_kg,
    we.body_fat_percentage

  FROM (
    SELECT generate_series(p_from, p_to, '1 day'::INTERVAL)::DATE AS log_date
  ) d

  LEFT JOIN (
    SELECT
      (started_at AT TIME ZONE 'UTC')::DATE AS log_date,
      COUNT(*)                              AS workout_count,
      SUM(duration_minutes)                 AS workout_minutes
    FROM public.workout_sessions
    WHERE user_id = p_user_id
      AND ended_at IS NOT NULL
      AND (started_at AT TIME ZONE 'UTC')::DATE BETWEEN p_from AND p_to
    GROUP BY (started_at AT TIME ZONE 'UTC')::DATE
  ) ws ON ws.log_date = d.log_date

  LEFT JOIN (
    SELECT
      (m.logged_at AT TIME ZONE 'UTC')::DATE        AS log_date,
      SUM(mi.quantity_grams / 100.0 * fi.calories_per_100g) AS calories,
      SUM(mi.quantity_grams / 100.0 * fi.protein_per_100g)  AS protein_g,
      SUM(mi.quantity_grams / 100.0 * fi.carbs_per_100g)    AS carbs_g,
      SUM(mi.quantity_grams / 100.0 * fi.fat_per_100g)      AS fat_g
    FROM public.meals m
    JOIN public.meal_items  mi ON mi.meal_id      = m.id
    JOIN public.food_items  fi ON fi.id           = mi.food_item_id
    WHERE m.user_id = p_user_id
      AND (m.logged_at AT TIME ZONE 'UTC')::DATE BETWEEN p_from AND p_to
    GROUP BY (m.logged_at AT TIME ZONE 'UTC')::DATE
  ) n ON n.log_date = d.log_date

  LEFT JOIN (
    SELECT
      (logged_at AT TIME ZONE 'UTC')::DATE AS log_date,
      SUM(amount_ml)::BIGINT               AS water_ml
    FROM public.water_entries
    WHERE user_id = p_user_id
      AND (logged_at AT TIME ZONE 'UTC')::DATE BETWEEN p_from AND p_to
    GROUP BY (logged_at AT TIME ZONE 'UTC')::DATE
  ) w ON w.log_date = d.log_date

  LEFT JOIN (
    SELECT
      (sleep_end AT TIME ZONE 'UTC')::DATE AS log_date,
      SUM(duration_minutes)                AS sleep_minutes,
      ROUND(AVG(quality)::NUMERIC, 1)      AS sleep_quality
    FROM public.sleep_entries
    WHERE user_id = p_user_id
      AND (sleep_end AT TIME ZONE 'UTC')::DATE BETWEEN p_from AND p_to
    GROUP BY (sleep_end AT TIME ZONE 'UTC')::DATE
  ) sl ON sl.log_date = d.log_date

  LEFT JOIN LATERAL (
    SELECT weight_kg, body_fat_percentage
    FROM public.weight_entries
    WHERE user_id = p_user_id
      AND (logged_at AT TIME ZONE 'UTC')::DATE = d.log_date
    ORDER BY logged_at DESC
    LIMIT 1
  ) we ON TRUE

  ORDER BY d.log_date DESC;
END;
$$;
