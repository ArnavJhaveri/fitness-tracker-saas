/**
 * POST /api/workouts/[id]/exercises — add an exercise to a workout session
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { addExerciseToWorkoutSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { addExerciseToSession, getWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:workouts:exercises:post", apiLimiter);
    const { id: sessionId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // Verify the session belongs to this user before inserting (defence-in-depth
    // on top of RLS — getWorkoutSession throws NotFoundError if it doesn't)
    await getWorkoutSession(supabase, user.id, sessionId);

    const body = await parseRequestBody(req, addExerciseToWorkoutSchema);
    const exercise = await addExerciseToSession(supabase, sessionId, body);

    return NextResponse.json<ApiSuccess<typeof exercise>>(
      { success: true, data: exercise },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
