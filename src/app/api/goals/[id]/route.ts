/**
 * GET    /api/goals/[id] — single goal
 * PUT    /api/goals/[id] — update goal (status, progress, etc.)
 * DELETE /api/goals/[id] — delete goal
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updateGoalSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getGoal, updateGoal, deleteGoal } from "@/lib/db/goals";
import type { ApiSuccess } from "@/types/api";
import type { Goal } from "@/types/database";

export const GET = withAuth<{ id: string }>("api:goals:get", async ({ supabase, user, params }) => {
  const { id } = params;
  const goal = await getGoal(supabase, user.id, id);
  return NextResponse.json<ApiSuccess<Goal>>({ success: true, data: goal });
});

export const PUT = withAuth<{ id: string }>(
  "api:goals:put",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, updateGoalSchema);
    const goal = await updateGoal(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<Goal>>({ success: true, data: goal });
  },
);

export const DELETE = withAuth<{ id: string }>(
  "api:goals:delete",
  async ({ supabase, user, params }) => {
    const { id } = params;
    await deleteGoal(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
