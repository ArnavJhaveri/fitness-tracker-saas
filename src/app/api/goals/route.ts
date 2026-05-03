/**
 * GET  /api/goals — list goals (optionally filtered by status)
 * POST /api/goals — create a goal
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createGoalSchema, paginationSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listGoals, createGoal } from "@/lib/db/goals";
import type { ApiSuccess } from "@/types/api";
import type { Goal } from "@/types/database";

const listQuerySchema = paginationSchema.extend({
  status: z.enum(["active", "completed", "paused", "abandoned"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit("api:goals:get", apiLimiter);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const params = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      listQuerySchema,
    );

    const { data, count } = await listGoals(supabase, user.id, params);

    return NextResponse.json<ApiSuccess<Goal[]>>({
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
    await enforceRateLimit("api:goals:post", apiLimiter);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const body = await parseRequestBody(request, createGoalSchema);
    const goal = await createGoal(supabase, user.id, body);

    return NextResponse.json<ApiSuccess<Goal>>({ success: true, data: goal }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
