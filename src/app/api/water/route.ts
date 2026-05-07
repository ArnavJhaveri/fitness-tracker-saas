/**
 * GET  /api/water — paginated water entries
 * POST /api/water — log a water intake
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createWaterEntrySchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listWaterEntries, createWaterEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { WaterEntry } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:water:get", apiLimiter, user.id);

    const params = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      listQuerySchema,
    );

    const { data, count } = await listWaterEntries(supabase, user.id, params);

    return NextResponse.json<ApiSuccess<WaterEntry[]>>({
      success: true,
      data,
      meta: {
        page: params.page,
        per_page: params.per_page,
        total: count,
        total_pages: Math.ceil(count / params.per_page),
      },
    });
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

    await enforceUserRateLimit("api:water:post", apiLimiter, user.id);

    const body = await parseRequestBody(request, createWaterEntrySchema);
    const entry = await createWaterEntry(supabase, user.id, body);

    return NextResponse.json<ApiSuccess<WaterEntry>>(
      { success: true, data: entry },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
