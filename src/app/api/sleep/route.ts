/**
 * GET  /api/sleep — paginated sleep entries
 * POST /api/sleep — log a sleep session
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { createSleepEntrySchema, paginationSchema, dateRangeSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listSleepEntries, createSleepEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { SleepEntry } from "@/types/database";

const listQuerySchema = paginationSchema.merge(dateRangeSchema);

export const GET = withAuth("api:sleep:get", async ({ supabase, user, request }) => {
  const params = parseSearchParams(
    Object.fromEntries(request.nextUrl.searchParams),
    listQuerySchema,
  );

  const { data, count } = await listSleepEntries(supabase, user.id, params);

  return NextResponse.json<ApiSuccess<SleepEntry[]>>({
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

export const POST = withAuth("api:sleep:post", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, createSleepEntrySchema);
  const entry = await createSleepEntry(supabase, user.id, body);

  return NextResponse.json<ApiSuccess<SleepEntry>>({ success: true, data: entry }, { status: 201 });
});

export const dynamic = "force-dynamic";
