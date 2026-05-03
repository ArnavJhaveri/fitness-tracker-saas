/**
 * GET /api/analytics/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns per-day aggregated data via the get_daily_summary RPC.
 * Max range: 366 days (enforced by the SQL function).
 * Default: last 30 days.
 *
 * Used by the dashboard overview and the analytics page charts.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { dateRangeSchema } from "@/lib/validations";
import { parseSearchParams } from "@/lib/validations/shared";
import { getDailySummary } from "@/lib/db/analytics";
import type { ApiSuccess } from "@/types/api";
import type { DailySummary } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit("api:analytics:daily:get", apiLimiter);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const { from, to } = parseSearchParams(
      Object.fromEntries(request.nextUrl.searchParams),
      dateRangeSchema,
    );

    const data = await getDailySummary(supabase, user.id, from, to);

    return NextResponse.json<ApiSuccess<DailySummary[]>>({
      success: true,
      data,
      meta: {
        page: 1,
        per_page: data.length,
        total: data.length,
        total_pages: 1,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
