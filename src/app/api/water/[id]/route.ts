/**
 * DELETE /api/water/[id] — remove a water log entry
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { deleteWaterEntry } from "@/lib/db/health";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await enforceRateLimit("api:water:delete", apiLimiter);
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await deleteWaterEntry(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
