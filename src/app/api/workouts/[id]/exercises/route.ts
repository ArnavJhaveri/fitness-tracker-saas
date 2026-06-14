/**
 * POST /api/workouts/[id]/exercises — add an exercise to a workout session
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { addExerciseToWorkoutSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { addExerciseToSession, getWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

export const POST = withAuth<{ id: string }>(
  "api:workouts:exercises:post",
  async ({ supabase, user, request, params }) => {
    const { id: sessionId } = params;

    // Verify the session belongs to this user before inserting (defence-in-depth
    // on top of RLS — getWorkoutSession throws NotFoundError if it doesn't)
    await getWorkoutSession(supabase, user.id, sessionId);

    const body = await parseRequestBody(request, addExerciseToWorkoutSchema);
    const exercise = await addExerciseToSession(supabase, sessionId, body);

    return NextResponse.json<ApiSuccess<typeof exercise>>(
      { success: true, data: exercise },
      { status: 201 },
    );
  },
);

export const dynamic = "force-dynamic";
