/**
 * GET    /api/goals/[id] — single goal
 * PUT    /api/goals/[id] — update goal (status, progress, etc.)
 * DELETE /api/goals/[id] — delete goal
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updateGoalSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getGoal, updateGoal, deleteGoal } from "@/lib/db/goals";
import type { ApiSuccess } from "@/types/api";
import type { Goal } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:goals:get", apiLimiter, user.id);

    const goal = await getGoal(supabase, user.id, id);
    return NextResponse.json<ApiSuccess<Goal>>({ success: true, data: goal });
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

    await enforceUserRateLimit("api:goals:put", apiLimiter, user.id);

    const body = await parseRequestBody(req, updateGoalSchema);
    const goal = await updateGoal(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<Goal>>({ success: true, data: goal });
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

    await enforceUserRateLimit("api:goals:delete", apiLimiter, user.id);

    await deleteGoal(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
