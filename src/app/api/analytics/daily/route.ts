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
import { withAuth } from "@/lib/api/with-auth";
import { dateRangeSchema } from "@/lib/validations";
import { parseSearchParams } from "@/lib/validations/shared";
import { getDailySummary } from "@/lib/db/analytics";
import type { ApiSuccess } from "@/types/api";
import type { DailySummary } from "@/types/database";

export const GET = withAuth("api:analytics:daily:get", async ({ supabase, user, request }) => {
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
});

export const dynamic = "force-dynamic";
