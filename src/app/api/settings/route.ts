/**
 * GET /api/settings  — fetch the current user's preferences
 * PUT /api/settings  — update (partial) settings — UPSERT-safe
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { updateSettingsSchema } from "@/lib/validations/settings";
import { parseRequestBody } from "@/lib/validations/shared";
import { getSettings, upsertSettings } from "@/lib/db/settings";
import type { ApiSuccess } from "@/types/api";
import type { UserSettings } from "@/types/database";

export const GET = withAuth("api:settings:get", async ({ supabase, user }) => {
  const settings = await getSettings(supabase, user.id);
  return NextResponse.json<ApiSuccess<UserSettings>>({ success: true, data: settings });
});

export const PUT = withAuth("api:settings:put", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, updateSettingsSchema);
  const settings = await upsertSettings(supabase, user.id, body);
  return NextResponse.json<ApiSuccess<UserSettings>>({ success: true, data: settings });
});

export const dynamic = "force-dynamic";
