/**
 * DELETE /api/workouts/[id]/exercises/[exerciseId] — remove exercise (+ its sets)
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { removeExerciseFromSession, getWorkoutSession } from "@/lib/db/workouts";

export const DELETE = withAuth<{ id: string; exerciseId: string }>(
  "api:workouts:exercises:delete",
  async ({ supabase, user, params }) => {
    const { id: sessionId, exerciseId } = params;

    // Defence-in-depth ownership check — mirrors the POST handler above.
    // RLS is the last line of defence; this ensures we 404 (not 403) for
    // resources that don't belong to this user, preventing enumeration.
    await getWorkoutSession(supabase, user.id, sessionId);
    await removeExerciseFromSession(supabase, exerciseId, sessionId);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
