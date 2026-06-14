/**
 * GET  /api/nutrition/meals — paginated list with embedded food items
 * POST /api/nutrition/meals — create a meal
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createMealSchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listMeals, createMeal } from "@/lib/db/nutrition";
import type { ApiSuccess } from "@/types/api";
import type { Meal } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export const GET = withAuth("api:nutrition:meals:get", async ({ supabase, user, request }) => {
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
});

export const POST = withAuth("api:nutrition:meals:post", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, createMealSchema);
  const meal = await createMeal(supabase, user.id, body);

  return NextResponse.json<ApiSuccess<Meal>>({ success: true, data: meal }, { status: 201 });
});

export const dynamic = "force-dynamic";
