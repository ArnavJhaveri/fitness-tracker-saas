# scripts/

One-off operational scripts. Not part of the build.

## `import-sheet.mjs`

Imports the legacy Google Sheets `fitnessTracker` JSON blob into Supabase
for a single user. Designed to run **once** on a clean account.

### Prerequisites

- The user must already exist in Supabase (sign up via the app first).
- `SUPABASE_SERVICE_ROLE_KEY` is required — it bypasses RLS so the script
  can write rows on behalf of the user. Never run this in production with
  a logged-in client; this is admin tooling only.
- Supabase migration 003 must have been applied.

### Inputs

The JSON file should be the raw value of the `fitnessTracker` cell in the
"data" tab (paste the cell into a `.json` file). The script also accepts a
wrapper shape `{ "fitnessTracker": { ... } }`.

### Usage

```bash
# Dry-run: prints what would be inserted but doesn't write
node scripts/import-sheet.mjs \
  --json /path/to/sheet.json \
  --email you@example.com \
  --supabase-url "$NEXT_PUBLIC_SUPABASE_URL" \
  --service-role-key "$SUPABASE_SERVICE_ROLE_KEY"

# Add --commit to actually insert
node scripts/import-sheet.mjs \
  --json /path/to/sheet.json \
  --email you@example.com \
  --commit

# Skip a domain (repeatable)
node scripts/import-sheet.mjs \
  --json /path/to/sheet.json \
  --email you@example.com \
  --commit \
  --skip workouts \
  --skip food-catalog
```

`--supabase-url` and `--service-role-key` fall back to the
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars if
omitted, so you can `source .env.local && node scripts/import-sheet.mjs --json …`.

### What gets imported

| Domain       | Source                                    | Notes                                          |
| ------------ | ----------------------------------------- | ---------------------------------------------- |
| Weights      | week-level `weight` (lb) + `_body[date]`  | Converted to kg, weigh-in pinned at 08:00 UTC  |
| Workouts     | `days[Day]` (activity, durationMin, rpe…) | Notes preserve activity/RPE/mood/energy        |
| Sleep        | `days[Day].sleepHrs`                      | Wake at 07:00 UTC, sleep_start back-derived    |
| Water        | `water[Day]`                              | Logged at 14:00 UTC                            |
| Meals        | `calories[Day][meal_type]` arrays         | Each item creates a custom food + meal_item    |
| Custom foods | `_quickPresets` + `_recentFoods`          | Deduped by name                                |
| Settings     | `_settings.*` targets                     | Calorie, protein, carbs, fat, water, weekly hr |

### Idempotency

The script does **not** dedupe against existing rows. If you run it twice
you'll get duplicates. To re-import:

```sql
-- Run in Supabase SQL editor; replace the user_id
DELETE FROM meal_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = '<uid>');
DELETE FROM meals          WHERE user_id = '<uid>';
DELETE FROM water_entries  WHERE user_id = '<uid>';
DELETE FROM sleep_entries  WHERE user_id = '<uid>';
DELETE FROM weight_entries WHERE user_id = '<uid>';
DELETE FROM workout_sessions WHERE user_id = '<uid>';
DELETE FROM food_items     WHERE created_by = '<uid>' AND is_custom = TRUE;
```

### What's NOT imported

- **Per-set workout details** (the legacy `workoutLog.entries` was almost
  always empty in practice) — only the session record is created.
- **An active phase** — phases are created via the onboarding wizard or
  the `/phases` page so the user explicitly confirms targets.
- **Macro overrides per food**: each meal item is inserted as 100 g of a
  custom food whose per-100g values equal the legacy item's totals. This
  preserves daily kcal/macro totals to within rounding error.
