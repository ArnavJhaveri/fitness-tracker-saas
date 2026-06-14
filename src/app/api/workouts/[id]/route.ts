/**
 * GET    /api/workouts/[id]  — fetch a single session (with exercises + sets)
 * PUT    /api/workouts/[id]  — update session metadata
 * DELETE /api/workouts/[id]  — delete session (cascades to exercises + sets)
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updateWorkoutSessionSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getWorkoutSession, updateWorkoutSession, deleteWorkoutSession } from "@/lib/db/workouts";
import type { ApiSuccess } from "@/types/api";

export const GET = withAuth<{ id: string }>(
  "api:workouts:get",
  async ({ supabase, user, params }) => {
    const { id } = params;
    const session = await getWorkoutSession(supabase, user.id, id);
    return NextResponse.json<ApiSuccess<typeof session>>({ success: true, data: session });
  },
);

export const PUT = withAuth<{ id: string }>(
  "api:workouts:put",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, updateWorkoutSessionSchema);
    const session = await updateWorkoutSession(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<typeof session>>({ success: true, data: session });
  },
);

export const DELETE = withAuth<{ id: string }>(
  "api:workouts:delete",
  async ({ supabase, user, params }) => {
    const { id } = params;
    await deleteWorkoutSession(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
