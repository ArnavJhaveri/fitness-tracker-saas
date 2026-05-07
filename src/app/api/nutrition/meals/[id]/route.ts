/**
 * GET    /api/nutrition/meals/[id] — single meal with all food items
 * PUT    /api/nutrition/meals/[id] — update meal metadata
 * DELETE /api/nutrition/meals/[id] — delete meal (cascades to items)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updateMealSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getMeal, updateMeal, deleteMeal } from "@/lib/db/nutrition";
import type { ApiSuccess } from "@/types/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:meals:get", apiLimiter, user.id);

    const meal = await getMeal(supabase, user.id, id);
    return NextResponse.json<ApiSuccess<typeof meal>>({ success: true, data: meal });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:meals:put", apiLimiter, user.id);

    const body = await parseRequestBody(req, updateMealSchema);
    const meal = await updateMeal(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<typeof meal>>({ success: true, data: meal });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:nutrition:meals:delete", apiLimiter, user.id);

    await deleteMeal(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
