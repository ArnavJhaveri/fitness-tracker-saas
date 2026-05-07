/**
 * GET  /api/nutrition/meals — paginated list with embedded food items
 * POST /api/nutrition/meals — create a meal
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createMealSchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listMeals, createMeal } from "@/lib/db/nutrition";
import type { ApiSuccess } from "@/types/api";
import type { Meal } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:meals:get", apiLimiter, user.id);

    const params = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      listQuerySchema,
    );

    const { data, count } = await listMeals(supabase, user.id, params);

    return NextResponse.json<ApiSuccess<Meal[]>>({
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

    await enforceUserRateLimit("api:nutrition:meals:post", apiLimiter, user.id);

    const body = await parseRequestBody(request, createMealSchema);
    const meal = await createMeal(supabase, user.id, body);

    return NextResponse.json<ApiSuccess<Meal>>({ success: true, data: meal }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
