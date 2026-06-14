/**
 * GET  /api/goals — list goals (optionally filtered by status)
 * POST /api/goals — create a goal
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { createGoalSchema, paginationSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listGoals, createGoal } from "@/lib/db/goals";
import type { ApiSuccess } from "@/types/api";
import type { Goal } from "@/types/database";

const listQuerySchema = paginationSchema.extend({
  status: z.enum(["active", "completed", "paused", "abandoned"]).optional(),
});

export const GET = withAuth("api:goals:get", async ({ supabase, user, request }) => {
  const params = parseSearchParams(
    Object.fromEntries(request.nextUrl.searchParams),
    listQuerySchema,
  );

  const { data, count } = await listGoals(supabase, user.id, params);

  return NextResponse.json<ApiSuccess<Goal[]>>({
    success: true,
    data,
    meta: {
      page: params.page,
      per_page: params.per_page,
      total: count,
      total_pages: Math.ceil(count / params.per_page),
    },
  });
});

export const POST = withAuth("api:goals:post", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, createGoalSchema);
  const goal = await createGoal(supabase, user.id, body);

  return NextResponse.json<ApiSuccess<Goal>>({ success: true, data: goal }, { status: 201 });
});

export const dynamic = "force-dynamic";
