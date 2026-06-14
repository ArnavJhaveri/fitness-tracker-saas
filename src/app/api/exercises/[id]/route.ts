/**
 * GET    /api/exercises/[id] — fetch a single exercise (system or custom)
 * PATCH  /api/exercises/[id] — edit a custom exercise (owner only)
 * DELETE /api/exercises/[id] — archive a custom exercise (soft delete; owner only)
 *
 * "Hard delete" is intentionally not exposed. Archived exercises remain
 * resolvable for historical workout pages — that's why archived_at exists.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateExerciseSchema } from "@/lib/validations";
import { archiveCustomExercise, getExercise, updateCustomExercise } from "@/lib/db/exercises";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Exercise } from "@/types/database";

export const GET = withAuth<{ id: string }>(
  "api:exercises:detail:get",
  async ({ supabase, params }) => {
    const { id } = params;

    // RLS allows reads for system rows + caller's customs. Anything else
    // surfaces as NotFoundError via .single().
    const exercise = await getExercise(supabase, id);
    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  },
);

export const PATCH = withAuth<{ id: string }>(
  "api:exercises:detail:patch",
  async ({ supabase, user, request, params }) => {
    const { id } = params;

    const body = await parseRequestBody(request, updateExerciseSchema);
    const exercise = await updateCustomExercise(supabase, user.id, id, body);

    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  },
);

export const DELETE = withAuth<{ id: string }>(
  "api:exercises:detail:delete",
  async ({ supabase, user, params }) => {
    const { id } = params;

    // Soft delete — archive only. The DB-layer helper rejects attempts to
    // archive system exercises with a clean ValidationError.
    const exercise = await archiveCustomExercise(supabase, user.id, id);
    logger.info("Custom exercise archived", { userId: user.id, exerciseId: id });

    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  },
);

export const dynamic = "force-dynamic";
