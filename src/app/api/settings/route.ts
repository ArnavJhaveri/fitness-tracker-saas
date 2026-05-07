/**
 * GET /api/settings  — fetch the current user's preferences
 * PUT /api/settings  — update (partial) settings — UPSERT-safe
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import { updateSettingsSchema } from "@/lib/validations/settings";
import { parseRequestBody } from "@/lib/validations/shared";
import { getSettings, upsertSettings } from "@/lib/db/settings";
import type { ApiSuccess } from "@/types/api";
import type { UserSettings } from "@/types/database";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:settings:get", apiLimiter, user.id);

    const settings = await getSettings(supabase, user.id);
    return NextResponse.json<ApiSuccess<UserSettings>>({ success: true, data: settings });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    await enforceUserRateLimit("api:settings:put", apiLimiter, user.id);

    const body = await parseRequestBody(req, updateSettingsSchema);
    const settings = await upsertSettings(supabase, user.id, body);
    return NextResponse.json<ApiSuccess<UserSettings>>({ success: true, data: settings });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
