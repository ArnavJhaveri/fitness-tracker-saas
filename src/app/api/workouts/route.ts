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
import { listWorkoutSessions, createWorkoutSession } from "@/lib/db/workouts";
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

    // Delegate to the DB layer — keeps the route handler as a thin HTTP adapter
    // and avoids duplicating query logic that already lives in listWorkoutSessions.
    const { data, count } = await listWorkoutSessions(supabase, user.id, params);

    const response: ApiSuccess<WorkoutSession[]> = {
      success: true,
      data,
      meta: {
        page: params.page,
        per_page: params.per_page,
        total: count,
        total_pages: Math.ceil(count / params.per_page),
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
    const session = await createWorkoutSession(supabase, user.id, body);

    logger.info("Workout session created", { userId: user.id, sessionId: session.id });

    const response: ApiSuccess<WorkoutSession> = { success: true, data: session };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

// Make the route dynamic — never serve stale cached data for user-specific endpoints
export const dynamic = "force-dynamic";
