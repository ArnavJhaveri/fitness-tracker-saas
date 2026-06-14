/**
 * PUT    /api/sleep/[id] — edit a sleep entry
 * DELETE /api/sleep/[id] — delete a sleep entry
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updateSleepEntrySchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateSleepEntry, deleteSleepEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { SleepEntry } from "@/types/database";

export const PUT = withAuth<{ id: string }>(
  "api:sleep:put",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, updateSleepEntrySchema);
    const entry = await updateSleepEntry(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<SleepEntry>>({ success: true, data: entry });
  },
);

export const DELETE = withAuth<{ id: string }>(
  "api:sleep:delete",
  async ({ supabase, user, params }) => {
    const { id } = params;
    await deleteSleepEntry(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
