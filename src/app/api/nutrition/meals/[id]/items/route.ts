/**
 * POST   /api/nutrition/meals/[id]/items — add a food item to a meal
 * DELETE /api/nutrition/meals/[id]/items?item_id=[itemId] — remove a food item
 *
 * Both handlers verify that the parent meal belongs to the authenticated
 * user before reading or writing — this is defence-in-depth on top of RLS.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { addMealItemSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { addMealItem, deleteMealItem } from "@/lib/db/nutrition";
import type { ApiSuccess } from "@/types/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: mealId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:meal-items:post", apiLimiter, user.id);

    const body = await parseRequestBody(req, addMealItemSchema);
    // addMealItem verifies meal ownership before inserting
    const item = await addMealItem(supabase, user.id, mealId, body);

    return NextResponse.json<ApiSuccess<typeof item>>(
      { success: true, data: item },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest, { params: _params }: Params) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:meal-items:delete", apiLimiter, user.id);

    const itemId = req.nextUrl.searchParams.get("item_id");
    const parsed = z.string().uuid().safeParse(itemId);
    if (!parsed.success) throw new ValidationError("item_id must be a valid UUID");

    // deleteMealItem verifies ownership through the meals join before deleting
    await deleteMealItem(supabase, user.id, parsed.data);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
