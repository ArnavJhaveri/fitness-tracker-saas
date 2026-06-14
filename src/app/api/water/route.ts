/**
 * GET  /api/water — paginated water entries
 * POST /api/water — log a water intake
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createWaterEntrySchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listWaterEntries, createWaterEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { WaterEntry } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export const GET = withAuth("api:water:get", async ({ supabase, user, request }) => {
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
});

export const POST = withAuth("api:water:post", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, createWaterEntrySchema);
  const entry = await createWaterEntry(supabase, user.id, body);

  return NextResponse.json<ApiSuccess<WaterEntry>>({ success: true, data: entry }, { status: 201 });
});

export const dynamic = "force-dynamic";
