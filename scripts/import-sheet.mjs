#!/usr/bin/env node
// @ts-check
/* eslint-disable no-console -- this is a CLI; console.log IS the output */
/**
 * One-shot importer for the legacy fitness-tracker JSON blob (Google Sheets
 * "data" tab → fitnessTracker key).
 *
 * Run with:
 *
 *   node scripts/import-sheet.mjs \
 *     --json /path/to/sheet-export.json \
 *     --email you@example.com \
 *     --supabase-url $NEXT_PUBLIC_SUPABASE_URL \
 *     --service-role-key $SUPABASE_SERVICE_ROLE_KEY \
 *     [--dry-run]                     # default: dry-run unless --commit is passed
 *     [--skip <weight|meals|water|sleep|workouts|settings|food-catalog>]
 *
 * Defaults to DRY-RUN. Pass --commit to actually write rows.
 *
 * Idempotency strategy:
 *
 * The script DOES NOT attempt to deduplicate against existing rows. It is
 * intended to run once on a clean account. If you re-run, you'll get
 * duplicates. To re-import, manually clear the relevant tables for the
 * target user first (TRUNCATE not allowed under RLS — use DELETE WHERE
 * user_id = ...).
 *
 * Date semantics:
 *   - The legacy data uses week numbers + day-of-week labels (Mon..Sun).
 *   - _startDate (e.g. "2026-04-22") is the first day of week 1, which may
 *     fall mid-week. Days BEFORE _startDate within week 1 are placeholders
 *     and skipped.
 *   - Each day's logs get reasonable default times (sleep 23:00 → 07:00,
 *     meals at 12:00 UTC, water at 14:00 UTC, workout at 17:00 UTC,
 *     weigh-in at 08:00 UTC). Times are arbitrary but consistent so
 *     historical analytics group by the right calendar day.
 */
import { readFileSync } from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

// ─── CLI argv parsing ─────────────────────────────────────────────────────────

/** @returns {{ json: string; email: string; url: string; key: string; commit: boolean; skip: Set<string> }} */
function parseArgs() {
  const args = process.argv.slice(2);
  /** @type {Record<string, string>} */
  const opts = {};
  /** @type {string[]} */
  const skip = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--commit") opts.commit = "1";
    else if (a === "--dry-run") opts.commit = "0";
    else if (a === "--skip") skip.push(args[++i]);
    else if (a.startsWith("--")) opts[a.slice(2)] = args[++i] ?? "";
  }
  const json = opts["json"];
  const email = opts["email"];
  const url = opts["supabase-url"] ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = opts["service-role-key"] ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!json || !email || !url || !key) {
    console.error(
      "Usage: node scripts/import-sheet.mjs --json <path> --email <email> [--supabase-url URL] [--service-role-key KEY] [--commit] [--skip <domain>]\n",
    );
    process.exit(2);
  }
  return { json, email, url, key, commit: opts.commit === "1", skip: new Set(skip) };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAY_LABELS = /** @type {const} */ (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

/**
 * The legacy data's "Week 1, Mon" lines up with the Monday on or before
 * _startDate. So if _startDate is Wed 2026-04-22, week 1 Mon = 2026-04-20.
 * @param {string} startDateStr
 * @returns {Date}
 */
function getWeek1Monday(startDateStr) {
  const d = new Date(startDateStr + "T00:00:00Z");
  const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Mon, ..., 6 = Sun
  const monday = new Date(d.getTime() - dayOfWeek * 86_400_000);
  return monday;
}

/**
 * Date for week N, day index (0 = Mon).
 * @param {Date} week1Monday
 * @param {number} weekNum
 * @param {number} dayIndex
 * @returns {Date}
 */
function dateFor(week1Monday, weekNum, dayIndex) {
  const ms = week1Monday.getTime() + ((weekNum - 1) * 7 + dayIndex) * 86_400_000;
  return new Date(ms);
}

/**
 * Format a Date as YYYY-MM-DD in UTC.
 * @param {Date} d
 */
function ymd(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Build an ISO timestamp at the given UTC time on the given UTC date.
 * @param {Date} d
 * @param {number} hour
 * @param {number} minute
 * @returns {string}
 */
function isoAt(d, hour, minute = 0) {
  const cloned = new Date(d.getTime());
  cloned.setUTCHours(hour, minute, 0, 0);
  return cloned.toISOString();
}

// ─── Lb → kg ──────────────────────────────────────────────────────────────────

const LB_TO_KG = 1 / 2.20462;
/** @param {number} lb */
const lbToKg = (lb) => Math.round(lb * LB_TO_KG * 100) / 100;

// ─── Tracking helpers ─────────────────────────────────────────────────────────

const counters = {
  weights: 0,
  meals: 0,
  meal_items: 0,
  food_items: 0,
  water: 0,
  sleep: 0,
  workouts: 0,
  errors: 0,
};

/** @param {string} domain */
function shouldRun(domain, /** @type {Set<string>} */ skip) {
  return !skip.has(domain);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const raw = JSON.parse(readFileSync(args.json, "utf-8"));
  const ft = raw.fitnessTracker ?? raw;

  if (!args.commit) {
    console.log("(dry-run; pass --commit to actually write rows)\n");
  }

  const supabase = createClient(args.url, args.key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find user by email via the admin API.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr.message);
    process.exit(1);
  }
  const user = list.users.find((u) => u.email?.toLowerCase() === args.email.toLowerCase());
  if (!user) {
    console.error(`User not found for email: ${args.email}`);
    process.exit(1);
  }
  console.log(`Importing into user ${user.id} (${user.email})`);

  const week1Monday = getWeek1Monday(ft._startDate ?? "2026-04-22");
  const startUtc = new Date(ft._startDate + "T00:00:00Z").getTime();

  // ─── Custom food catalogue (from _quickPresets + _recentFoods) ──────
  // Built as a name → id map so historical meal items can reference them.
  /** @type {Map<string, string>} */
  const foodIdByName = new Map();

  if (shouldRun("food-catalog", args.skip)) {
    /** @type {{ name: string; kcal?: number; protein?: number; carbs?: number; fats?: number; sugar?: number }[]} */
    const presets = [...(ft._quickPresets ?? []), ...(ft._recentFoods ?? [])];
    /** @type {Map<string, typeof presets[number]>} */
    const byName = new Map();
    for (const p of presets) {
      const name = (p.label ?? p.name ?? "").trim();
      if (!name) continue;
      if (!byName.has(name)) byName.set(name, { ...p, name });
    }
    console.log(`Custom food catalogue: ${byName.size} unique items`);
    for (const item of byName.values()) {
      const inserted = await insertCustomFood(supabase, user.id, item, args.commit);
      if (inserted) {
        foodIdByName.set(item.name, inserted.id);
        counters.food_items++;
      }
    }
  }

  // ─── Walk week buckets ──────────────────────────────────────────────
  for (const [key, weekData] of Object.entries(ft)) {
    if (!/^\d+$/.test(key)) continue; // skip _startDate, _settings, etc.
    const weekNum = Number(key);
    /** @type {any} */
    const w = weekData;

    // Weekly weight (the user's weigh-in for that week, in lbs in the old data)
    if (shouldRun("weight", args.skip) && w.weight && w.weight > 0) {
      const date = dateFor(week1Monday, weekNum, 0); // Monday
      if (date.getTime() >= startUtc) {
        await insertWeight(supabase, user.id, date, lbToKg(w.weight), args.commit);
        counters.weights++;
      }
    }

    // Per-day rows
    for (let i = 0; i < DAY_LABELS.length; i++) {
      const day = DAY_LABELS[i];
      const date = dateFor(week1Monday, weekNum, i);
      if (date.getTime() < startUtc) continue;

      const dayObj = w.days?.[day] ?? {};

      // Workout
      if (shouldRun("workouts", args.skip)) {
        const activity = (dayObj.activity ?? "").trim();
        if (activity && activity !== "Rest") {
          await insertWorkout(supabase, user.id, date, dayObj, args.commit);
          counters.workouts++;
        }
      }

      // Sleep — sleepHrs 0 (or undefined) means no entry
      if (shouldRun("sleep", args.skip) && dayObj.sleepHrs > 0) {
        await insertSleep(supabase, user.id, date, dayObj, args.commit);
        counters.sleep++;
      }

      // Water
      if (shouldRun("water", args.skip)) {
        const ml = w.water?.[day];
        if (ml && ml > 0) {
          await insertWater(supabase, user.id, date, ml, args.commit);
          counters.water++;
        }
      }

      // Meals
      if (shouldRun("meals", args.skip)) {
        const dayMeals = w.calories?.[day];
        if (dayMeals) {
          for (const mealType of /** @type {const} */ ([
            "breakfast",
            "lunch",
            "dinner",
            "snacks",
          ])) {
            const items = dayMeals[mealType];
            if (!Array.isArray(items) || items.length === 0) continue;
            const dbMealType = mealType === "snacks" ? "snack" : mealType;
            const mealId = await insertMeal(supabase, user.id, date, dbMealType, args.commit);
            if (mealId) counters.meals++;
            for (const item of items) {
              await insertMealItem(supabase, user.id, mealId, foodIdByName, item, args.commit);
            }
          }
        }
      }
    }
  }

  // ─── _body — date-keyed weight + height ─────────────────────────────
  if (shouldRun("weight", args.skip)) {
    /** @type {Record<string, { height?: number; currentWeight?: number }>} */
    const body = ft._body ?? {};
    for (const [date, b] of Object.entries(body)) {
      if (b.currentWeight && b.currentWeight > 0) {
        await insertWeight(
          supabase,
          user.id,
          new Date(date + "T00:00:00Z"),
          lbToKg(b.currentWeight),
          args.commit,
        );
        counters.weights++;
      }
      if (b.height) {
        // Old data stored height in cm (175 = 175cm = 5'9"). We update the
        // profile if not already set, but never overwrite a non-null value.
        await maybeSetProfileHeight(supabase, user.id, b.height, args.commit);
      }
    }
  }

  // ─── Settings (targets) ─────────────────────────────────────────────
  if (shouldRun("settings", args.skip)) {
    const s = ft._settings ?? {};
    /** @type {Record<string, unknown>} */
    const patch = {};
    if (s.dailyTarget1 != null) patch.daily_calorie_target = s.dailyTarget1;
    if (s.proteinTarget != null) patch.daily_protein_target_g = s.proteinTarget;
    if (s.carbTarget != null) patch.daily_carbs_target_g = s.carbTarget;
    if (s.fatTarget != null) patch.daily_fat_target_g = s.fatTarget;
    if (s.sugarTarget != null) patch.daily_sugar_target_g = s.sugarTarget;
    if (s.waterTargetL != null) patch.daily_water_target_ml = Math.round(s.waterTargetL * 1000);
    if (s.weeklyHoursGoal != null) patch.weekly_workout_hours_target = s.weeklyHoursGoal;
    if (Object.keys(patch).length > 0) {
      console.log(`Updating user_settings: ${Object.keys(patch).join(", ")}`);
      if (args.commit) {
        const { error } = await supabase
          .from("user_settings")
          .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
        if (error) {
          console.error("user_settings upsert failed:", error.message);
          counters.errors++;
        }
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────
  console.log("\n──────── Import summary ────────");
  console.log(JSON.stringify(counters, null, 2));
  if (!args.commit) console.log("(dry-run — no rows written)");
}

// ─── Insert helpers ───────────────────────────────────────────────────────────

/** @param {ReturnType<typeof createClient>} supabase */
async function insertCustomFood(supabase, userId, item, commit) {
  const name = item.name ?? item.label;
  if (!name) return null;
  // Old data stores per-item totals (kcal etc) — we treat them as
  // "per serving" by inferring serving size = 100g. Macros are stored as
  // per-100g in the new schema.
  const row = {
    name,
    calories_per_100g: Number(item.kcal ?? 0),
    protein_per_100g: Number(item.protein ?? 0),
    carbs_per_100g: Number(item.carbs ?? 0),
    fat_per_100g: Number(item.fats ?? 0),
    sugar_per_100g: item.sugar != null ? Number(item.sugar) : null,
    is_custom: true,
    created_by: userId,
  };
  if (!commit) {
    return { id: `dryrun-${name.replace(/\W+/g, "-").toLowerCase()}` };
  }
  const { data, error } = await supabase.from("food_items").insert(row).select().single();
  if (error) {
    console.error(`food_items.insert("${name}") failed:`, error.message);
    counters.errors++;
    return null;
  }
  return data;
}

async function insertWeight(
  supabase,
  userId,
  /** @type {Date} */ date,
  /** @type {number} */ weightKg,
  commit,
) {
  const row = {
    user_id: userId,
    weight_kg: weightKg,
    logged_at: isoAt(date, 8, 0), // morning weigh-in
    notes: "Imported from sheet",
  };
  if (!commit) return;
  const { error } = await supabase.from("weight_entries").insert(row);
  if (error) {
    console.error(`weight @ ${ymd(date)} failed:`, error.message);
    counters.errors++;
  }
}

async function insertSleep(
  supabase,
  userId,
  /** @type {Date} */ date,
  /** @type {any} */ dayObj,
  commit,
) {
  const hrs = Number(dayObj.sleepHrs);
  if (!Number.isFinite(hrs) || hrs <= 0) return;
  // Sleep crossed midnight from the previous night. Wake at 07:00 the day
  // we're recording on; sleep_start = 07:00 - hrs.
  const wake = new Date(date.getTime());
  wake.setUTCHours(7, 0, 0, 0);
  const start = new Date(wake.getTime() - hrs * 3_600_000);
  // sleep_entries.duration_minutes is GENERATED ALWAYS in migration 001.
  // Postgres rejects writes to such columns (errcode 428C9) — any row that
  // includes the field would 500 the entire insert. Let the DB compute it
  // from sleep_end - sleep_start.
  const row = {
    user_id: userId,
    sleep_start: start.toISOString(),
    sleep_end: wake.toISOString(),
    quality: clampQuality(dayObj.energy),
    notes: "Imported from sheet",
  };
  if (!commit) return;
  const { error } = await supabase.from("sleep_entries").insert(row);
  if (error) {
    console.error(`sleep @ ${ymd(date)} failed:`, error.message);
    counters.errors++;
  }
}

/** @param {unknown} v */
function clampQuality(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

async function insertWater(
  supabase,
  userId,
  /** @type {Date} */ date,
  /** @type {number} */ ml,
  commit,
) {
  const row = {
    user_id: userId,
    amount_ml: Math.round(ml),
    logged_at: isoAt(date, 14, 0),
  };
  if (!commit) return;
  const { error } = await supabase.from("water_entries").insert(row);
  if (error) {
    console.error(`water @ ${ymd(date)} failed:`, error.message);
    counters.errors++;
  }
}

async function insertWorkout(
  supabase,
  userId,
  /** @type {Date} */ date,
  /** @type {any} */ dayObj,
  commit,
) {
  const start = isoAt(date, 17, 0);
  const dur = Number(dayObj.durationMin);
  const end =
    Number.isFinite(dur) && dur > 0 ? isoAt(date, 17 + Math.floor(dur / 60), dur % 60) : null;
  const noteParts = [];
  if (dayObj.activity) noteParts.push(`Activity: ${dayObj.activity}`);
  if (dayObj.rpe != null) noteParts.push(`RPE: ${dayObj.rpe}`);
  if (dayObj.mood != null) noteParts.push(`Mood: ${dayObj.mood}`);
  if (dayObj.energy != null) noteParts.push(`Energy: ${dayObj.energy}`);
  if (dayObj.customBurn != null) noteParts.push(`Burn: ${dayObj.customBurn} kcal`);
  if (dayObj.notes) noteParts.push(dayObj.notes);
  // workout_sessions.duration_minutes is GENERATED ALWAYS — the DB derives
  // it from started_at + ended_at. Including it in the insert payload makes
  // Postgres reject the row with errcode 428C9.
  const row = {
    user_id: userId,
    name: dayObj.activity ?? "Workout",
    notes: noteParts.join(" · ") || "Imported from sheet",
    started_at: start,
    ended_at: end,
  };
  if (!commit) return;
  const { error } = await supabase.from("workout_sessions").insert(row);
  if (error) {
    console.error(`workout @ ${ymd(date)} failed:`, error.message);
    counters.errors++;
  }
}

async function insertMeal(supabase, userId, /** @type {Date} */ date, mealType, commit) {
  const row = {
    user_id: userId,
    meal_type: mealType,
    name: null,
    logged_at: isoAt(date, mealHour(mealType), 0),
    notes: null,
  };
  if (!commit) return `dryrun-meal-${ymd(date)}-${mealType}`;
  const { data, error } = await supabase.from("meals").insert(row).select("id").single();
  if (error) {
    console.error(`meal @ ${ymd(date)} ${mealType} failed:`, error.message);
    counters.errors++;
    return null;
  }
  return data.id;
}

/** @param {string} mealType */
function mealHour(mealType) {
  if (mealType === "breakfast") return 8;
  if (mealType === "lunch") return 13;
  if (mealType === "dinner") return 19;
  return 16; // snack
}

async function insertMealItem(
  supabase,
  userId,
  /** @type {string|null} */ mealId,
  /** @type {Map<string,string>} */ foodIdByName,
  /** @type {any} */ item,
  commit,
) {
  if (!mealId) return;
  const name = (item.name ?? "").trim();
  if (!name) return;

  // Resolve food id — reuse from catalogue, or lazy-create on first sight.
  let foodId = foodIdByName.get(name);
  if (!foodId) {
    const created = await insertCustomFood(supabase, userId, item, commit);
    if (created) {
      foodId = created.id;
      foodIdByName.set(name, foodId);
      counters.food_items++;
    }
  }
  if (!foodId) return;

  const row = {
    meal_id: mealId,
    food_item_id: foodId,
    // Old data stored kcal/macros AS the serving total (no separate quantity).
    // We model it as one 100g serving so the food_items per-100g values
    // multiply out to match the old totals — preserves analytics totals to
    // within rounding error.
    quantity_grams: 100,
  };
  if (!commit) return;
  const { error } = await supabase.from("meal_items").insert(row);
  if (error) {
    console.error(`meal_item failed:`, error.message);
    counters.errors++;
    return;
  }
  counters.meal_items++;
}

async function maybeSetProfileHeight(supabase, userId, heightCm, commit) {
  if (!commit) return;
  const { data } = await supabase
    .from("profiles")
    .select("height_cm")
    .eq("id", userId)
    .maybeSingle();
  if (data?.height_cm != null) return; // never overwrite
  const { error } = await supabase
    .from("profiles")
    .update({ height_cm: heightCm })
    .eq("id", userId);
  if (error) {
    console.error(`profile.height_cm failed:`, error.message);
    counters.errors++;
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
