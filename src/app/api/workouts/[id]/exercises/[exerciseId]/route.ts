/**
 * DELETE /api/workouts/[id]/exercises/[exerciseId] — remove exercise (+ its sets)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { removeExerciseFromSession, getWorkoutSession } from "@/lib/db/workouts";

type Params = { params: Promise<{ id: string; exerciseId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:workouts:exercises:delete", apiLimiter);
    const { id: sessionId, exerciseId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // Defence-in-depth ownership check — mirrors the POST handler above.
    // RLS is the last line of defence; this ensures we 404 (not 403) for
    // resources that don't belong to this user, preventing enumeration.
    await getWorkoutSession(supabase, user.id, sessionId);
    await removeExerciseFromSession(supabase, exerciseId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
