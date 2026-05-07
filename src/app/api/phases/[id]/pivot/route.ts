/**
 * POST /api/phases/[id]/pivot — supersede the active phase and start a new one.
 *
 * Used for material changes (calories, macros, target weight, type).
 * Preserves analytics integrity: past days resolve to the OLD phase's targets,
 * the cut-over day onwards resolves to the NEW phase.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { pivotPhaseSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { pivotPhase } from "@/lib/db/phases";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:phases:pivot", apiLimiter);
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const body = await parseRequestBody(req, pivotPhaseSchema);
    const result = await pivotPhase(supabase, user.id, id, body.new_phase);

    logger.info("Phase pivoted", {
      userId: user.id,
      oldPhaseId: result.oldPhase.id,
      newPhaseId: result.newPhase.id,
      newType: result.newPhase.phase_type,
    });

    return NextResponse.json<ApiSuccess<{ oldPhase: Phase; newPhase: Phase }>>(
      { success: true, data: result },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
