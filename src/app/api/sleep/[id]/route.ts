/**
 * PUT    /api/sleep/[id] — edit a sleep entry
 * DELETE /api/sleep/[id] — delete a sleep entry
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updateSleepEntrySchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateSleepEntry, deleteSleepEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { SleepEntry } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:sleep:put", apiLimiter);
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const body = await parseRequestBody(req, updateSleepEntrySchema);
    const entry = await updateSleepEntry(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<SleepEntry>>({ success: true, data: entry });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:sleep:delete", apiLimiter);
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await deleteSleepEntry(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
