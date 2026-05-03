/**
 * GET  /api/workouts  — paginated list of the authenticated user's sessions
 * POST /api/workouts  — create a new workout session
 *
 * This file demonstrates the full Route Handler pattern used across ALL API
 * routes in this codebase:
 *   1. Rate limit check
 *   2. Auth check (server-side Supabase client)
 *   3. Input validation (Zod)
 *   4. Business logic
 *   5. Typed JSON response
 *   6. Catch-all error handler → consistent error envelope
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createWorkoutSessionSchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { WorkoutSession } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit("api:workouts:get", apiLimiter);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const params = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      listQuerySchema,
    );

    let query = supabase
      .from("workout_sessions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

    if (params.from) query = query.gte("started_at", params.from);
    if (params.to) query = query.lte("started_at", params.to);

    const { data, error, count } = await query;
    if (error) throw error;

    const response: ApiSuccess<WorkoutSession[]> = {
      success: true,
      data: (data ?? []) as WorkoutSession[],
      meta: {
        page: params.page,
        per_page: params.per_page,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / params.per_page),
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit("api:workouts:post", apiLimiter);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const body = await parseRequestBody(request, createWorkoutSessionSchema);

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({ ...body, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    logger.info("Workout session created", {
      userId: user.id,
      sessionId: (data as WorkoutSession).id,
    });

    const response: ApiSuccess<WorkoutSession> = { success: true, data: data as WorkoutSession };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

// Make the route dynamic — never serve stale cached data for user-specific endpoints
export const dynamic = "force-dynamic";
