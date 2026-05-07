/**
 * GET  /api/weight — paginated weight entries
 * POST /api/weight — log body weight
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { createWeightEntrySchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listWeightEntries, createWeightEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { WeightEntry } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:weight:get", apiLimiter, user.id);

    const params = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      listQuerySchema,
    );

    const { data, count } = await listWeightEntries(supabase, user.id, params);

    return NextResponse.json<ApiSuccess<WeightEntry[]>>({
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

    await enforceUserRateLimit("api:weight:post", apiLimiter, user.id);

    const body = await parseRequestBody(request, createWeightEntrySchema);
    const entry = await createWeightEntry(supabase, user.id, body);

    return NextResponse.json<ApiSuccess<WeightEntry>>(
      { success: true, data: entry },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
