/**
 * GET  /api/weight — paginated weight entries
 * POST /api/weight — log body weight
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createWeightEntrySchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listWeightEntries, createWeightEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { WeightEntry } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export const GET = withAuth("api:weight:get", async ({ supabase, user, request }) => {
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
});

export const POST = withAuth("api:weight:post", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, createWeightEntrySchema);
  const entry = await createWeightEntry(supabase, user.id, body);

  return NextResponse.json<ApiSuccess<WeightEntry>>(
    { success: true, data: entry },
    { status: 201 },
  );
});

export const dynamic = "force-dynamic";
