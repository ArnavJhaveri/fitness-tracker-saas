/**
 * POST /api/workouts/[id]/exercises/[exerciseId]/sets — log a set
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createSetSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { addSet, getWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

export const POST = withAuth<{ id: string; exerciseId: string }>(
  "api:workouts:sets:post",
  async ({ supabase, user, request, params }) => {
    const { id: sessionId, exerciseId } = params;

    // Verify the session belongs to this user before inserting (defence-in-depth)
    await getWorkoutSession(supabase, user.id, sessionId);

    const body = await parseRequestBody(request, createSetSchema);
    const set = await addSet(supabase, exerciseId, body);

    return NextResponse.json<ApiSuccess<typeof set>>({ success: true, data: set }, { status: 201 });
  },
);

export const dynamic = "force-dynamic";
