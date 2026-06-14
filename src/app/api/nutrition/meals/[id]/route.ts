/**
 * GET    /api/nutrition/meals/[id] — single meal with all food items
 * PUT    /api/nutrition/meals/[id] — update meal metadata
 * DELETE /api/nutrition/meals/[id] — delete meal (cascades to items)
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updateMealSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getMeal, updateMeal, deleteMeal } from "@/lib/db/nutrition";
import type { ApiSuccess } from "@/types/api";

export const GET = withAuth<{ id: string }>(
  "api:nutrition:meals:get",
  async ({ supabase, user, params }) => {
    const { id } = params;
    const meal = await getMeal(supabase, user.id, id);
    return NextResponse.json<ApiSuccess<typeof meal>>({ success: true, data: meal });
  },
);

export const PUT = withAuth<{ id: string }>(
  "api:nutrition:meals:put",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, updateMealSchema);
    const meal = await updateMeal(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<typeof meal>>({ success: true, data: meal });
  },
);

export const DELETE = withAuth<{ id: string }>(
  "api:nutrition:meals:delete",
  async ({ supabase, user, params }) => {
    const { id } = params;
    await deleteMeal(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
