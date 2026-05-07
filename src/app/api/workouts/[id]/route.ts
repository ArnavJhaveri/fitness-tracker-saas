/**
 * GET    /api/workouts/[id]  — fetch a single session (with exercises + sets)
 * PUT    /api/workouts/[id]  — update session metadata
 * DELETE /api/workouts/[id]  — delete session (cascades to exercises + sets)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updateWorkoutSessionSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getWorkoutSession, updateWorkoutSession, deleteWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:workouts:get", apiLimiter, user.id);

    const session = await getWorkoutSession(supabase, user.id, id);
    return NextResponse.json<ApiSuccess<typeof session>>({ success: true, data: session });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:workouts:put", apiLimiter, user.id);

    const body = await parseRequestBody(req, updateWorkoutSessionSchema);
    const session = await updateWorkoutSession(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<typeof session>>({ success: true, data: session });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:workouts:delete", apiLimiter, user.id);

    await deleteWorkoutSession(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
