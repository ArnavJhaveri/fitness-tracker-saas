/**
 * GET  /api/nutrition/food-items?q=&page=&per_page=&custom_only= — search food items
 * POST /api/nutrition/food-items — create a custom food item
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createFoodItemSchema, paginationSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { searchFoodItems, createFoodItem } from "@/lib/db/nutrition";
import type { ApiSuccess } from "@/types/api";
import type { FoodItem } from "@/types/database";

const searchQuerySchema = paginationSchema.extend({
  q: z.string().max(200).optional().default(""),
  custom_only: z.coerce.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:food-items:get", apiLimiter, user.id);

    const params = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      searchQuerySchema,
    );

    const { data, count } = await searchFoodItems(supabase, user.id, params.q, params);

    return NextResponse.json<ApiSuccess<FoodItem[]>>({
      success: true,
      data,
      meta: {
        page: params.page,
        per_page: params.per_page,
        total: count,
        total_pages: Math.ceil(count / params.per_page),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:food-items:post", apiLimiter, user.id);

    const body = await parseRequestBody(request, createFoodItemSchema);
    const item = await createFoodItem(supabase, user.id, body);

    return NextResponse.json<ApiSuccess<FoodItem>>({ success: true, data: item }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
