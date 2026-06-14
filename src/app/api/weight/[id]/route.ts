/**
 * PUT    /api/weight/[id] — edit a weight entry
 * DELETE /api/weight/[id] — delete a weight entry
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updateWeightEntrySchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { updateWeightEntry, deleteWeightEntry } from "@/lib/db/health";
import type { ApiSuccess } from "@/types/api";
import type { WeightEntry } from "@/types/database";

export const PUT = withAuth<{ id: string }>(
  "api:weight:put",
  async ({ supabase, user, request, params }) => {
    const { id } = params;
    const body = await parseRequestBody(request, updateWeightEntrySchema);
    const entry = await updateWeightEntry(supabase, user.id, id, body);
    return NextResponse.json<ApiSuccess<WeightEntry>>({ success: true, data: entry });
  },
);

export const DELETE = withAuth<{ id: string }>(
  "api:weight:delete",
  async ({ supabase, user, params }) => {
    const { id } = params;
    await deleteWeightEntry(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
