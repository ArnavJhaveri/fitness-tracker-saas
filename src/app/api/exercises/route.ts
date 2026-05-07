/**
 * GET  /api/exercises — search the exercise library (system + caller's custom)
 * POST /api/exercises — create a new custom exercise
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { createExerciseSchema } from "@/lib/validations";
import { createCustomExercise, searchExercises } from "@/lib/db/exercises";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Exercise } from "@/types/database";

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  muscle: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
  include_archived: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:exercises:get", apiLimiter, user.id);

    const params = parseSearchParams(Object.fromEntries(request.nextUrl.searchParams), querySchema);

    const { data, count } = await searchExercises(supabase, {
      q: params.q,
      category: params.category,
      muscle: params.muscle,
      page: params.page,
      per_page: params.per_page,
      userId: user.id,
      includeArchived: params.include_archived,
    });

    return NextResponse.json<ApiSuccess<Exercise[]>>({
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

    await enforceUserRateLimit("api:exercises:post", apiLimiter, user.id);

    const body = await parseRequestBody(request, createExerciseSchema);
    const exercise = await createCustomExercise(supabase, user.id, body);

    logger.info("Custom exercise created", {
      userId: user.id,
      exerciseId: exercise.id,
      category: exercise.category,
    });

    return NextResponse.json<ApiSuccess<Exercise>>(
      { success: true, data: exercise },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
