/**
 * PUT    /api/workouts/[id]/exercises/[exerciseId]/sets/[setId] — edit a set
 * DELETE /api/workouts/[id]/exercises/[exerciseId]/sets/[setId] — delete a set
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updateSetSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateSet, deleteSet, getWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

export const PUT = withAuth<{ id: string; exerciseId: string; setId: string }>(
  "api:workouts:sets:put",
  async ({ supabase, user, request, params }) => {
    const { id: sessionId, exerciseId, setId } = params;

    // Verify the parent session belongs to this user before mutating the set.
    // Also pass exerciseId so the DB layer scopes the update to the correct exercise.
    await getWorkoutSession(supabase, user.id, sessionId);
    const body = await parseRequestBody(request, updateSetSchema);
    const set = await updateSet(supabase, setId, exerciseId, body);
    return NextResponse.json<ApiSuccess<typeof set>>({ success: true, data: set });
  },
);

export const DELETE = withAuth<{ id: string; exerciseId: string; setId: string }>(
  "api:workouts:sets:delete",
  async ({ supabase, user, params }) => {
    const { id: sessionId, exerciseId, setId } = params;

    // Verify the parent session belongs to this user before deleting the set.
    // Also pass exerciseId so the DB layer scopes the delete to the correct exercise.
    await getWorkoutSession(supabase, user.id, sessionId);
    await deleteSet(supabase, setId, exerciseId);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
