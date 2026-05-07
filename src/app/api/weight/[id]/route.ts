/**
 * PUT    /api/weight/[id] — edit a weight entry
 * DELETE /api/weight/[id] — delete a weight entry
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updateWeightEntrySchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateWeightEntry, deleteWeightEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { WeightEntry } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:weight:put", apiLimiter, user.id);

    const body = await parseRequestBody(req, updateWeightEntrySchema);
    const entry = await updateWeightEntry(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<WeightEntry>>({ success: true, data: entry });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:weight:delete", apiLimiter, user.id);

    await deleteWeightEntry(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
