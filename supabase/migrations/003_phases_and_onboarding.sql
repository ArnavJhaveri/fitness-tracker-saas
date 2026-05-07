-- ============================================================
-- FitTrack — Phase 3: Phases, Onboarding, Customization
-- ============================================================
-- New tables:
--   • phases — time-bounded training/nutrition blocks with target snapshots
--
-- Extensions:
--   • profiles      — sex_at_birth, current_weight_kg
--   • user_settings — onboarded_at + onboarding answers + extended targets
--   • exercises     — archived_at (soft delete); CHECK constraint relaxed
--   • goals         — phase_id FK; type CHECK constraint dropped
--
-- Design notes:
--   • Phases are immutable in spirit: material changes (calories, macros,
--     target weight, type) END the current phase and create a NEW one with
--     `derived_from_phase_id` lineage. Cosmetic edits (name, notes) are
--     allowed in-place. This preserves analytics integrity — the question
--     "what was my target on day 14?" must always have a deterministic answer.
--
--   • A unique partial index enforces "one active phase per user" at the
--     database level. The application is responsible for transactioning
--     end-old + insert-new together.
--
--   • Phase target columns are NULLABLE so a phase can override only some
--     fields (e.g. a "Strength Block" with weekly_workout_target=5 but no
--     calorie change). Resolution to a complete daily target set happens
--     in the application via resolveDailyTargets(userId, date).
--
--   • Existing CHECK constraints on goals.type and exercises.category are
--     dropped because v3 supports user-defined goal types and exercise
--     categories. Validation moves to the application layer (Zod) with a
--     curated registry of "known types" that get rich UI; unknown types
--     get a generic fallback.
--
--   • All existing users are backfilled with onboarded_at = created_at so
--     they don't get redirected to onboarding on next login.
-- ============================================================

-- ─── 1. Drop legacy CHECK constraints ─────────────────────────────────────────

ALTER TABLE public.exercises  DROP CONSTRAINT IF EXISTS exercises_category_check;
ALTER TABLE public.goals      DROP CONSTRAINT IF EXISTS goals_type_check;

-- Add a soft NOT NULL fallback for category since we're loosening the enum.
-- An exercise without a category is meaningless for filtering; default 'other'.
ALTER TABLE public.exercises ALTER COLUMN category SET DEFAULT 'other';

-- ─── 2. Profile extensions ────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sex_at_birth        TEXT
    CHECK (sex_at_birth IN ('male','female','intersex','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS current_weight_kg   NUMERIC(6,3)
    CHECK (current_weight_kg IS NULL OR current_weight_kg > 0);

COMMENT ON COLUMN public.profiles.current_weight_kg IS
  'Denormalised cache of the latest weight_entries row. Updated by application code on weight log; safe to recompute from weight_entries.';

-- ─── 3. user_settings extensions ──────────────────────────────────────────────

ALTER TABLE public.user_settings
  -- Onboarding gate: NULL = haven't onboarded yet; banner is shown.
  -- Set on completion or skip; either way no further redirect.
  ADD COLUMN IF NOT EXISTS onboarded_at         TIMESTAMPTZ,

  -- Onboarding answers (all nullable — every step is skippable individually)
  ADD COLUMN IF NOT EXISTS activity_level       TEXT
    CHECK (activity_level IN ('sedentary','light','moderate','very_active','extra_active')),
  ADD COLUMN IF NOT EXISTS dietary_pattern      TEXT, -- free-text; common values: vegetarian, vegan, pescatarian, keto, mediterranean
  ADD COLUMN IF NOT EXISTS excluded_foods       TEXT[],
  ADD COLUMN IF NOT EXISTS primary_intents      TEXT[], -- e.g. {"track_workouts","lose_weight"}; drives dashboard widgets

  -- Reserved for the v2 adaptive-targets feature (MacroFactor-style nightly
  -- recalculation). Not used by any read path yet — schema-only opt-in.
  ADD COLUMN IF NOT EXISTS adaptive_targets     BOOLEAN NOT NULL DEFAULT FALSE,

  -- Extended daily targets the old monolith tracked but the new app didn't:
  ADD COLUMN IF NOT EXISTS daily_carbs_target_g NUMERIC(6,1)
    CHECK (daily_carbs_target_g IS NULL OR daily_carbs_target_g >= 0),
  ADD COLUMN IF NOT EXISTS daily_fat_target_g   NUMERIC(6,1)
    CHECK (daily_fat_target_g IS NULL OR daily_fat_target_g >= 0),
  ADD COLUMN IF NOT EXISTS daily_sugar_target_g NUMERIC(6,1)
    CHECK (daily_sugar_target_g IS NULL OR daily_sugar_target_g >= 0),
  ADD COLUMN IF NOT EXISTS weekly_workout_hours_target NUMERIC(4,1)
    CHECK (weekly_workout_hours_target IS NULL OR weekly_workout_hours_target >= 0);

-- Backfill: existing users have already used the app, don't force onboarding
-- on their next login. New signups still get NULL via the trigger default.
UPDATE public.user_settings
   SET onboarded_at = created_at
 WHERE onboarded_at IS NULL;

-- ─── 4. exercises soft-delete ─────────────────────────────────────────────────

-- archived_at lets us hide an exercise from new selections without breaking
-- historical workouts that reference it. The exercise picker filters
-- archived_at IS NULL; analytics still resolve the name correctly.
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS exercises_active_idx
  ON public.exercises (is_custom, created_by)
  WHERE archived_at IS NULL;

-- ─── 5. phases table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.phases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  phase_type      TEXT NOT NULL CHECK (
    phase_type IN (
      'cut','bulk','maintenance','recomp',
      'strength_block','hypertrophy_block','endurance_block',
      'general_fitness','custom'
    )
  ),
  notes           TEXT CHECK (char_length(notes) <= 4000),

  -- Time
  start_date          DATE NOT NULL,
  planned_end_date    DATE,
  actual_end_date     DATE,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('planned','active','ended','superseded')),

  -- Snapshot of targets ACTIVE during this phase. All NULLABLE so a phase
  -- can override only the fields it cares about; the rest fall through to
  -- user_settings via resolveDailyTargets().
  daily_calorie_target            INTEGER       CHECK (daily_calorie_target IS NULL OR daily_calorie_target > 0),
  daily_protein_target_g          NUMERIC(6,1)  CHECK (daily_protein_target_g IS NULL OR daily_protein_target_g >= 0),
  daily_carbs_target_g            NUMERIC(6,1)  CHECK (daily_carbs_target_g IS NULL OR daily_carbs_target_g >= 0),
  daily_fat_target_g              NUMERIC(6,1)  CHECK (daily_fat_target_g IS NULL OR daily_fat_target_g >= 0),
  daily_sugar_target_g            NUMERIC(6,1)  CHECK (daily_sugar_target_g IS NULL OR daily_sugar_target_g >= 0),
  daily_water_target_ml           INTEGER       CHECK (daily_water_target_ml IS NULL OR daily_water_target_ml > 0),
  weekly_workout_target           SMALLINT      CHECK (weekly_workout_target IS NULL OR weekly_workout_target >= 0),
  weekly_workout_hours_target     NUMERIC(4,1)  CHECK (weekly_workout_hours_target IS NULL OR weekly_workout_hours_target >= 0),
  target_weight_kg                NUMERIC(6,3)  CHECK (target_weight_kg IS NULL OR target_weight_kg > 0),
  target_weight_change_kg_per_week NUMERIC(4,2),

  -- Lineage for end-and-replace pattern
  superseded_by_phase_id  UUID REFERENCES public.phases(id) ON DELETE SET NULL,
  derived_from_phase_id   UUID REFERENCES public.phases(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT phases_planned_end_sane CHECK (
    planned_end_date IS NULL OR planned_end_date >= start_date
  ),
  CONSTRAINT phases_actual_end_sane CHECK (
    actual_end_date IS NULL OR actual_end_date >= start_date
  ),
  CONSTRAINT phases_terminal_status_has_end CHECK (
    -- Ended/superseded phases must have an actual_end_date set
    (status NOT IN ('ended','superseded')) OR (actual_end_date IS NOT NULL)
  )
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own phases"
  ON public.phases FOR ALL USING (auth.uid() = user_id);

-- One active phase per user. Planned/ended/superseded phases can coexist.
CREATE UNIQUE INDEX IF NOT EXISTS phases_one_active_per_user
  ON public.phases (user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS phases_user_status_idx
  ON public.phases (user_id, status);

CREATE INDEX IF NOT EXISTS phases_user_dates_idx
  ON public.phases (user_id, start_date DESC);

-- Reuse the global set_updated_at trigger function from migration 001.
CREATE TRIGGER phases_set_updated_at
  BEFORE UPDATE ON public.phases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-set actual_end_date when a phase transitions to a terminal status.
-- Belt-and-suspenders for the CHECK constraint above; lets the application
-- omit actual_end_date when ending or superseding.
CREATE OR REPLACE FUNCTION public.phases_auto_set_end_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('ended','superseded') AND NEW.actual_end_date IS NULL THEN
    NEW.actual_end_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER phases_auto_end_date
  BEFORE INSERT OR UPDATE ON public.phases
  FOR EACH ROW EXECUTE FUNCTION public.phases_auto_set_end_date();

-- ─── 6. goals: link to phase, drop type CHECK ─────────────────────────────────

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS goals_phase_idx
  ON public.goals (phase_id) WHERE phase_id IS NOT NULL;

-- The Zod registry in src/lib/validations/goal-types.ts is now the source of
-- truth for which goal types get rich UI. The DB stays permissive so adding
-- a new type is a code-only change.

-- ─── 7. View: current targets resolved per user ───────────────────────────────
-- A convenience view that mirrors resolveDailyTargets() in TypeScript for
-- the CURRENT day, useful for debugging and ad-hoc queries.
-- The TS helper is still authoritative because per-day historical resolution
-- requires a DATE parameter that views can't take.

CREATE OR REPLACE VIEW public.current_daily_targets AS
SELECT
  us.user_id,
  COALESCE(p.daily_calorie_target,        us.daily_calorie_target)        AS daily_calorie_target,
  COALESCE(p.daily_protein_target_g,      us.daily_protein_target_g)      AS daily_protein_target_g,
  COALESCE(p.daily_carbs_target_g,        us.daily_carbs_target_g)        AS daily_carbs_target_g,
  COALESCE(p.daily_fat_target_g,          us.daily_fat_target_g)          AS daily_fat_target_g,
  COALESCE(p.daily_sugar_target_g,        us.daily_sugar_target_g)        AS daily_sugar_target_g,
  COALESCE(p.daily_water_target_ml,       us.daily_water_target_ml)       AS daily_water_target_ml,
  COALESCE(p.weekly_workout_hours_target, us.weekly_workout_hours_target) AS weekly_workout_hours_target,
  p.id   AS active_phase_id,
  p.name AS active_phase_name,
  p.phase_type
FROM public.user_settings us
LEFT JOIN public.phases p
  ON p.user_id = us.user_id
 AND p.status = 'active'
 AND p.start_date <= CURRENT_DATE
 AND (p.actual_end_date IS NULL OR p.actual_end_date >= CURRENT_DATE);

-- The view inherits the underlying tables' RLS; no extra policy needed
-- because both tables are owner-scoped via auth.uid().

COMMENT ON VIEW public.current_daily_targets IS
  'Resolved current daily targets per user — phase overrides user_settings where set. Use resolveDailyTargets() from app code for date-historical resolution.';
