/**
 * GET    /api/phases/[id] — fetch a single phase
 * PATCH  /api/phases/[id] — cosmetic edit (name, notes, planned_end_date)
 *
 * Material edits (targets, type, dates) must use POST /api/phases/[id]/pivot.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updatePhaseCosmeticSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getPhase, updatePhaseCosmetic } from "@/lib/db/phases";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

export const GET = withAuth<{ id: string }>(
  "api:phases:detail:get",
  async ({ supabase, user, params }) => {
    const { id } = params;
    const phase = await getPhase(supabase, user.id, id);
    return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase });
  },
);

export const PATCH = withAuth<{ id: string }>(
  "api:phases:detail:patch",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, updatePhaseCosmeticSchema);
    const phase = await updatePhaseCosmetic(supabase, user.id, id, body);

    return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase });
  },
);

export const dynamic = "force-dynamic";
