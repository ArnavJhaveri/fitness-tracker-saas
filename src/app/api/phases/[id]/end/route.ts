/**
 * POST /api/phases/[id]/end — end the active phase without a replacement
 * (drops the user into companion mode).
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { endPhaseSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { endPhase } from "@/lib/db/phases";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

export const POST = withAuth<{ id: string }>(
  "api:phases:end",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, endPhaseSchema);
    const phase = await endPhase(supabase, user.id, id, body.actual_end_date);

    logger.info("Phase ended", { userId: user.id, phaseId: phase.id });

    return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase });
  },
);

export const dynamic = "force-dynamic";
