/**
 * GET /api/nutrition/food-items/recent
 *
 * Returns the food items the caller has logged in the last 14 days,
 * ordered by most-recent-use, deduped by food_item id, capped at 12.
 *
 * Powers the "recent foods" chip row on the nutrition page so users can
 * one-tap log foods they eat regularly without typing into search.
 *
 * Implementation: Supabase JS doesn't expose a clean DISTINCT ON, so we
 * fetch a wider window of meal_items + food_items and dedupe in app code.
 * The cap (60 raw rows → 12 deduped) keeps the endpoint cheap.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import type { ApiSuccess } from "@/types/api";
import type { FoodItem } from "@/types/database";

const LOOKBACK_DAYS = 14;
const RAW_ROW_CAP = 60;
const DEDUPED_CAP = 12;

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:recent-foods", apiLimiter, user.id);

    const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

    // Pull meal_items joined to meals (for the date filter and ownership)
    // and to food_items (for the FoodItem payload). Order by the meal's
    // logged_at descending so the most recent uses come first.
    const { data, error } = await supabase
      .from("meal_items")
      .select(`food_items ( * ), meals!inner ( user_id, logged_at )`)
      .eq("meals.user_id", user.id)
      .gte("meals.logged_at", since)
      .order("logged_at", { foreignTable: "meals", ascending: false })
      .limit(RAW_ROW_CAP);

    if (error) throw error;

    // Dedupe by food_item id, preserving the order from the query.
    const seen = new Set<string>();
    const recent: FoodItem[] = [];
    for (const row of data ?? []) {
      // Supabase types the joined column as either a single object or an
      // array depending on the relation cardinality. meal_items.food_item_id
      // is nullable so the relation can be missing too — treat that as a
      // dropped row rather than an error.
      const fi = (row as { food_items: FoodItem | FoodItem[] | null }).food_items;
      const food = Array.isArray(fi) ? fi[0] : fi;
      if (!food || seen.has(food.id)) continue;
      seen.add(food.id);
      recent.push(food);
      if (recent.length >= DEDUPED_CAP) break;
    }

    return NextResponse.json<ApiSuccess<FoodItem[]>>({ success: true, data: recent });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
