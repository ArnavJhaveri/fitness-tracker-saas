/**
 * POST /api/workouts/[id]/exercises/[exerciseId]/sets — log a set
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createSetSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { addSet, getWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

type Params = { params: Promise<{ id: string; exerciseId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:workouts:sets:post", apiLimiter);
    const { id: sessionId, exerciseId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // Verify the session belongs to this user before inserting (defence-in-depth)
    await getWorkoutSession(supabase, user.id, sessionId);

    const body = await parseRequestBody(req, createSetSchema);
    const set = await addSet(supabase, exerciseId, body);

    return NextResponse.json<ApiSuccess<typeof set>>({ success: true, data: set }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
