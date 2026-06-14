/**
 * POST   /api/nutrition/meals/[id]/items — add a food item to a meal
 * DELETE /api/nutrition/meals/[id]/items?item_id=[itemId] — remove a food item
 *
 * Both handlers verify that the parent meal belongs to the authenticated
 * user before reading or writing — this is defence-in-depth on top of RLS.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { ValidationError } from "@/lib/errors";
import { addMealItemSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { addMealItem, deleteMealItem } from "@/lib/db/nutrition";
import type { ApiSuccess } from "@/types/api";

export const POST = withAuth<{ id: string }>(
  "api:nutrition:meal-items:post",
  async ({ supabase, user, request, params }) => {
    const { id: mealId } = params;
    const body = await parseRequestBody(request, addMealItemSchema);
    // addMealItem verifies meal ownership before inserting
    const item = await addMealItem(supabase, user.id, mealId, body);

    return NextResponse.json<ApiSuccess<typeof item>>(
      { success: true, data: item },
      { status: 201 },
    );
  },
);

export const DELETE = withAuth<{ id: string }>(
  "api:nutrition:meal-items:delete",
  async ({ supabase, user, request }) => {
    const itemId = request.nextUrl.searchParams.get("item_id");
    const parsed = z.string().uuid().safeParse(itemId);
    if (!parsed.success) throw new ValidationError("item_id must be a valid UUID");

    // deleteMealItem verifies ownership through the meals join before deleting
    await deleteMealItem(supabase, user.id, parsed.data);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
