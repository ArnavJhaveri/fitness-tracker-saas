/**
 * DELETE /api/workouts/[id]/exercises/[exerciseId] — remove exercise (+ its sets)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { removeExerciseFromSession } from "@/lib/db/workouts";

type Params = { params: Promise<{ id: string; exerciseId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:workouts:exercises:delete", apiLimiter);
    const { exerciseId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // RLS on workout_exercises enforces ownership through workout_sessions
    await removeExerciseFromSession(supabase, exerciseId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
