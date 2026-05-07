/**
 * GET    /api/exercises/[id] — fetch a single exercise (system or custom)
 * PATCH  /api/exercises/[id] — edit a custom exercise (owner only)
 * DELETE /api/exercises/[id] — archive a custom exercise (soft delete; owner only)
 *
 * "Hard delete" is intentionally not exposed. Archived exercises remain
 * resolvable for historical workout pages — that's why archived_at exists.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateExerciseSchema } from "@/lib/validations";
import { archiveCustomExercise, getExercise, updateCustomExercise } from "@/lib/db/exercises";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Exercise } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:exercises:detail:get", apiLimiter);
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // RLS allows reads for system rows + caller's customs. Anything else
    // surfaces as NotFoundError via .single().
    const exercise = await getExercise(supabase, id);
    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:exercises:detail:patch", apiLimiter);
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const body = await parseRequestBody(req, updateExerciseSchema);
    const exercise = await updateCustomExercise(supabase, user.id, id, body);

    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:exercises:detail:delete", apiLimiter);
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    // Soft delete — archive only. The DB-layer helper rejects attempts to
    // archive system exercises with a clean ValidationError.
    const exercise = await archiveCustomExercise(supabase, user.id, id);
    logger.info("Custom exercise archived", { userId: user.id, exerciseId: id });

    return NextResponse.json<ApiSuccess<Exercise>>({ success: true, data: exercise });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
