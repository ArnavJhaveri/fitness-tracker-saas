/**
 * PUT    /api/workouts/[id]/exercises/[exerciseId]/sets/[setId] — edit a set
 * DELETE /api/workouts/[id]/exercises/[exerciseId]/sets/[setId] — delete a set
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updateSetSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateSet, deleteSet, getWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

type Params = { params: Promise<{ id: string; exerciseId: string; setId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:workouts:sets:put", apiLimiter);
    const { id: sessionId, exerciseId, setId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // Verify the parent session belongs to this user before mutating the set.
    // Also pass exerciseId so the DB layer scopes the update to the correct exercise.
    await getWorkoutSession(supabase, user.id, sessionId);
    const body = await parseRequestBody(req, updateSetSchema);
    const set = await updateSet(supabase, setId, exerciseId, body);
    return NextResponse.json<ApiSuccess<typeof set>>({ success: true, data: set });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:workouts:sets:delete", apiLimiter);
    const { id: sessionId, exerciseId, setId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // Verify the parent session belongs to this user before deleting the set.
    // Also pass exerciseId so the DB layer scopes the delete to the correct exercise.
    await getWorkoutSession(supabase, user.id, sessionId);
    await deleteSet(supabase, setId, exerciseId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
