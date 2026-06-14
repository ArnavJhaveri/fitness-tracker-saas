/**
 * POST /api/phases/[id]/pivot — supersede the active phase and start a new one.
 *
 * Used for material changes (calories, macros, target weight, type).
 * Preserves analytics integrity: past days resolve to the OLD phase's targets,
 * the cut-over day onwards resolves to the NEW phase.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { pivotPhaseSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { pivotPhase } from "@/lib/db/phases";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

export const POST = withAuth<{ id: string }>(
  "api:phases:pivot",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, pivotPhaseSchema);
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
  },
);

export const dynamic = "force-dynamic";
