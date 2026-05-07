/**
 * GET    /api/phases/[id] — fetch a single phase
 * PATCH  /api/phases/[id] — cosmetic edit (name, notes, planned_end_date)
 *
 * Material edits (targets, type, dates) must use POST /api/phases/[id]/pivot.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updatePhaseCosmeticSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { getPhase, updatePhaseCosmetic } from "@/lib/db/phases";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:phases:detail:get", apiLimiter, user.id);

    const phase = await getPhase(supabase, user.id, id);
    return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:phases:detail:patch", apiLimiter, user.id);

    const body = await parseRequestBody(req, updatePhaseCosmeticSchema);
    const phase = await updatePhaseCosmetic(supabase, user.id, id, body);

    return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
