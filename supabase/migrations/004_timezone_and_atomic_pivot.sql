-- ============================================================
-- FitTrack — Phase 4: Timezone-correct analytics + atomic phase pivot
-- ============================================================
-- Two related fixes from the post-Phase-3 audit:
--
--   1. get_daily_summary aggregated by UTC date. Users in non-UTC zones
--      saw late-night entries grouped under the wrong calendar day, and
--      "today" totals could include or omit boundary rows depending on
--      offset. The new version takes the user's user_settings.timezone
--      and groups by (col AT TIME ZONE us.timezone)::DATE.
--
--   2. pivotPhase was three sequential PostgREST writes — atomic only by
--      virtue of the unique partial active-phase index. A concurrent
--      two-tab pivot or a step-2 failure could leave the user with a
--      "superseded" phase that has no successor. The new pivot_phase()
--      RPC is one transaction; the application calls it via
--      supabase.rpc('pivot_phase', ...).
--
-- Both changes are additive to migrations 001/002/003. The application
-- code that uses them lands alongside this migration.
-- ============================================================

-- ─── 1. Timezone-aware daily summary ─────────────────────────────────────────
--
-- Drop and recreate. RPCs in Supabase are versioned by signature; the new
-- function adds a `p_timezone` parameter so we replace cleanly.

DROP FUNCTION IF EXISTS public.get_daily_summary(UUID, DATE, DATE);

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
DECLARE
  v_tz TEXT;
BEGIN
  -- Authorisation: this RPC is callable by any authenticated user with
  -- their own UUID. Cross-user reads are blocked here AND by RLS on the
  -- queried tables (defence in depth).
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: you can only request your own summary';
  END IF;

  IF (p_to - p_from) > 366 THEN
    RAISE EXCEPTION 'Date range must not exceed 366 days';
  END IF;

  -- Resolve the user's timezone once. Fall back to UTC if user_settings
  -- is missing (which can happen on legacy accounts predating the
  -- handle_new_user_settings trigger).
  SELECT COALESCE(timezone, 'UTC') INTO v_tz
  FROM public.user_settings
  WHERE user_id = p_user_id;
  IF v_tz IS NULL THEN
    v_tz := 'UTC';
  END IF;

  -- All "::DATE" casts now use the user's timezone instead of UTC. A meal
  -- logged at 23:30 NZT (= 10:30 UTC the same day) groups under the
  -- user's local calendar day, matching their dashboard expectation.
  RETURN QUERY
  SELECT
    d.log_date,
    COALESCE(ws.workout_count, 0)          AS workout_count,
    COALESCE(ws.workout_minutes, 0)        AS total_workout_minutes,
    COALESCE(n.calories,  0)               AS total_calories,
    COALESCE(n.protein_g, 0)               AS total_protein_g,
    COALESCE(n.carbs_g,   0)               AS total_carbs_g,
    COALESCE(n.fat_g,     0)               AS total_fat_g,
    COALESCE(w.water_ml, 0)                AS total_water_ml,
    COALESCE(sl.sleep_minutes, 0)          AS total_sleep_minutes,
    sl.sleep_quality                       AS avg_sleep_quality,
    we.weight_kg,
    we.body_fat_percentage
  FROM (
    SELECT generate_series(p_from, p_to, '1 day'::INTERVAL)::DATE AS log_date
  ) d

  LEFT JOIN (
    SELECT
      (started_at AT TIME ZONE v_tz)::DATE AS log_date,
      COUNT(*)                              AS workout_count,
      SUM(duration_minutes)                 AS workout_minutes
    FROM public.workout_sessions
    WHERE user_id = auth.uid()
      AND ended_at IS NOT NULL
      AND (started_at AT TIME ZONE v_tz)::DATE BETWEEN p_from AND p_to
    GROUP BY (started_at AT TIME ZONE v_tz)::DATE
  ) ws ON ws.log_date = d.log_date

  LEFT JOIN (
    SELECT
      (m.logged_at AT TIME ZONE v_tz)::DATE         AS log_date,
      SUM(mi.quantity_grams / 100.0 * fi.calories_per_100g) AS calories,
      SUM(mi.quantity_grams / 100.0 * fi.protein_per_100g)  AS protein_g,
      SUM(mi.quantity_grams / 100.0 * fi.carbs_per_100g)    AS carbs_g,
      SUM(mi.quantity_grams / 100.0 * fi.fat_per_100g)      AS fat_g
    FROM public.meals m
    JOIN public.meal_items  mi ON mi.meal_id      = m.id
    JOIN public.food_items  fi ON fi.id           = mi.food_item_id
    WHERE m.user_id = auth.uid()
      AND (m.logged_at AT TIME ZONE v_tz)::DATE BETWEEN p_from AND p_to
    GROUP BY (m.logged_at AT TIME ZONE v_tz)::DATE
  ) n ON n.log_date = d.log_date

  LEFT JOIN (
    SELECT
      (logged_at AT TIME ZONE v_tz)::DATE AS log_date,
      SUM(amount_ml)::BIGINT              AS water_ml
    FROM public.water_entries
    WHERE user_id = auth.uid()
      AND (logged_at AT TIME ZONE v_tz)::DATE BETWEEN p_from AND p_to
    GROUP BY (logged_at AT TIME ZONE v_tz)::DATE
  ) w ON w.log_date = d.log_date

  LEFT JOIN (
    SELECT
      (sleep_end AT TIME ZONE v_tz)::DATE AS log_date,
      SUM(duration_minutes)               AS sleep_minutes,
      ROUND(AVG(quality)::NUMERIC, 1)     AS sleep_quality
    FROM public.sleep_entries
    WHERE user_id = auth.uid()
      AND (sleep_end AT TIME ZONE v_tz)::DATE BETWEEN p_from AND p_to
    GROUP BY (sleep_end AT TIME ZONE v_tz)::DATE
  ) sl ON sl.log_date = d.log_date

  LEFT JOIN LATERAL (
    SELECT weight_kg, body_fat_percentage
    FROM public.weight_entries
    WHERE user_id = auth.uid()
      AND (logged_at AT TIME ZONE v_tz)::DATE = d.log_date
    ORDER BY logged_at DESC
    LIMIT 1
  ) we ON TRUE

  ORDER BY d.log_date DESC;
END;
$$;

COMMENT ON FUNCTION public.get_daily_summary IS
  'Per-day aggregation of all tracking domains, grouped by the calling user''s local timezone (from user_settings.timezone, falling back to UTC). Defence-in-depth auth checks: auth.uid()=p_user_id at entry, plus user_id=auth.uid() in every subquery (so dropping the entry check still doesn''t leak across users).';

-- ─── 2. Atomic phase pivot ───────────────────────────────────────────────────
--
-- The TS pivotPhase helper does THREE sequential writes (mark old superseded,
-- insert new active, patch old's superseded_by_phase_id pointer). Two-tab
-- concurrent pivots can interleave; a step-2 failure leaves the user with a
-- broken-lineage row.
--
-- This RPC wraps the whole operation in a single transaction. The PostgREST
-- client calls it via `.rpc('pivot_phase', { ... })` — one HTTP round trip,
-- one transaction, all three writes commit-or-rollback together.

DROP FUNCTION IF EXISTS public.pivot_phase(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.pivot_phase(
  p_old_phase_id  UUID,
  p_new_phase     JSONB
)
RETURNS TABLE (
  old_phase_id  UUID,
  new_phase_id  UUID
)
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_old phases%ROWTYPE;
  v_new_id UUID;
  v_new_start DATE;
  v_old_end DATE;
  v_today DATE;
  v_tz TEXT;
BEGIN
  -- Authorisation guard. RLS on `phases` will also enforce this, but the
  -- explicit check gives a clean error message instead of a no-op update.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  -- 1. Lock + load the active phase (FOR UPDATE blocks concurrent pivots).
  SELECT * INTO v_old
  FROM public.phases
  WHERE id = p_old_phase_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phase not found' USING ERRCODE = '42704';
  END IF;
  IF v_old.status != 'active' THEN
    RAISE EXCEPTION 'Only the active phase can be pivoted'
      USING ERRCODE = '22023', HINT = 'current status: ' || v_old.status;
  END IF;

  -- 2. Validate the new phase's start_date.
  v_new_start := (p_new_phase->>'start_date')::DATE;
  IF v_new_start IS NULL THEN
    RAISE EXCEPTION 'new phase requires start_date' USING ERRCODE = '22023';
  END IF;
  IF v_new_start <= v_old.start_date THEN
    RAISE EXCEPTION 'new phase must start after the current phase started'
      USING ERRCODE = '22023';
  END IF;
  -- start_date can't be in the past — would silently rewrite history.
  SELECT COALESCE(timezone, 'UTC') INTO v_tz
  FROM public.user_settings WHERE user_id = v_uid;
  IF v_tz IS NULL THEN v_tz := 'UTC'; END IF;
  v_today := (NOW() AT TIME ZONE v_tz)::DATE;
  IF v_new_start < v_today THEN
    RAISE EXCEPTION 'new phase start_date can''t be in the past'
      USING ERRCODE = '22023';
  END IF;

  v_old_end := v_new_start - INTERVAL '1 day';

  -- 3. Mark old phase superseded with the day-before end_date.
  UPDATE public.phases
  SET status = 'superseded', actual_end_date = v_old_end
  WHERE id = p_old_phase_id AND user_id = v_uid;

  -- 4. Insert the new active phase, lifting fields out of the JSONB blob.
  INSERT INTO public.phases (
    user_id,
    name, phase_type, notes,
    start_date, planned_end_date, status,
    daily_calorie_target, daily_protein_target_g, daily_carbs_target_g,
    daily_fat_target_g, daily_sugar_target_g,
    daily_water_target_ml,
    weekly_workout_target, weekly_workout_hours_target,
    target_weight_kg, target_weight_change_kg_per_week,
    derived_from_phase_id
  ) VALUES (
    v_uid,
    p_new_phase->>'name',
    p_new_phase->>'phase_type',
    p_new_phase->>'notes',
    v_new_start,
    NULLIF(p_new_phase->>'planned_end_date', '')::DATE,
    'active',
    NULLIF(p_new_phase->>'daily_calorie_target', '')::INT,
    NULLIF(p_new_phase->>'daily_protein_target_g', '')::NUMERIC,
    NULLIF(p_new_phase->>'daily_carbs_target_g', '')::NUMERIC,
    NULLIF(p_new_phase->>'daily_fat_target_g', '')::NUMERIC,
    NULLIF(p_new_phase->>'daily_sugar_target_g', '')::NUMERIC,
    NULLIF(p_new_phase->>'daily_water_target_ml', '')::INT,
    NULLIF(p_new_phase->>'weekly_workout_target', '')::SMALLINT,
    NULLIF(p_new_phase->>'weekly_workout_hours_target', '')::NUMERIC,
    NULLIF(p_new_phase->>'target_weight_kg', '')::NUMERIC,
    NULLIF(p_new_phase->>'target_weight_change_kg_per_week', '')::NUMERIC,
    p_old_phase_id
  )
  RETURNING id INTO v_new_id;

  -- 5. Patch the old phase's superseded_by_phase_id pointer.
  UPDATE public.phases
  SET superseded_by_phase_id = v_new_id
  WHERE id = p_old_phase_id AND user_id = v_uid;

  RETURN QUERY SELECT p_old_phase_id, v_new_id;
END;
$$;

COMMENT ON FUNCTION public.pivot_phase IS
  'Atomically end the user''s active phase and create a successor. All four DB writes (lock + status flip + insert + lineage pointer) commit or rollback together. The application should always prefer this RPC over chained PostgREST calls — see src/lib/db/phases.ts.';

-- Allow authenticated users to call the RPC.
GRANT EXECUTE ON FUNCTION public.pivot_phase(UUID, JSONB) TO authenticated;
