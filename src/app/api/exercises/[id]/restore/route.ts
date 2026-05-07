/**
 * POST /api/exercises/[id]/restore — clear archived_at on a custom exercise.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { restoreCustomExercise } from "@/lib/db/exercises";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Exercise } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:exercises:restore", apiLimiter, user.id);

    const exercise = await restoreCustomExercise(supabase, user.id, id);
    logger.info("Custom exercise restored", { userId: user.id, exerciseId: id });

    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
