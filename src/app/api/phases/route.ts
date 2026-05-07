/**
 * GET  /api/phases — list phases (optionally filtered by status)
 * POST /api/phases — create a phase
 *
 * Phases are time-bounded training/nutrition blocks. Only one phase can be
 * `active` per user (enforced by a unique partial index in the DB).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createPhaseSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listPhases, createPhase } from "@/lib/db/phases";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

const listQuerySchema = z.object({
  status: z.enum(["planned", "active", "ended", "superseded"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:phases:get", apiLimiter, user.id);

    const params = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      listQuerySchema,
    );

    const data = await listPhases(supabase, user.id, params);
    return NextResponse.json<ApiSuccess<Phase[]>>({ success: true, data });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:phases:post", apiLimiter, user.id);

    const body = await parseRequestBody(request, createPhaseSchema);
    const phase = await createPhase(supabase, user.id, body);

    logger.info("Phase created", {
      userId: user.id,
      phaseId: phase.id,
      type: phase.phase_type,
    });

    return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
