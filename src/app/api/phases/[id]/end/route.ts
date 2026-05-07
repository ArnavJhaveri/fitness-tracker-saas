/**
 * POST /api/phases/[id]/end — end the active phase without a replacement
 * (drops the user into companion mode).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { endPhaseSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { endPhase } from "@/lib/db/phases";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:phases:end", apiLimiter, user.id);

    const body = await parseRequestBody(req, endPhaseSchema);
    const phase = await endPhase(supabase, user.id, id, body.actual_end_date);

    logger.info("Phase ended", { userId: user.id, phaseId: phase.id });

    return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
