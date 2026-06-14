/**
 * POST /api/exercises/[id]/restore — clear archived_at on a custom exercise.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { restoreCustomExercise } from "@/lib/db/exercises";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Exercise } from "@/types/database";

export const POST = withAuth<{ id: string }>(
  "api:exercises:restore",
  async ({ supabase, user, params }) => {
    const { id } = params;

    const exercise = await restoreCustomExercise(supabase, user.id, id);
    logger.info("Custom exercise restored", { userId: user.id, exerciseId: id });

    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  },
);

export const dynamic = "force-dynamic";
