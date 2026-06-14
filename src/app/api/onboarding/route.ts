/**
 * POST /api/onboarding — finalise the onboarding wizard.
 *
 * Accepts a partial bag of answers (every step is individually skippable),
 * fans them out to:
 *   - profiles    — full_name, sex_at_birth, date_of_birth, height_cm, current_weight_kg
 *   - user_settings — units, activity_level, dietary_pattern, excluded_foods,
 *                     primary_intents, week_starts_on, timezone, AND onboarded_at
 *   - weight_entries — if current_weight_kg is provided, log a row so the
 *                      analytics chart starts immediately
 *
 * Optional first phase creation lives at POST /api/phases — the client can
 * fire that as a separate request after onboarding completes. Splitting the
 * two means a phase failure doesn't block the user from being marked
 * onboarded (they can always create a phase later).
 *
 * Setting onboarded_at = NOW() unconditionally is the contract: once the
 * user posts to this endpoint, the dashboard banner stops showing — even
 * if they only filled out step 1. They can always edit answers via /settings.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { completeOnboardingSchema } from "@/lib/validations";
import { parseRequestBody } from "@/lib/validations/shared";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";

export const POST = withAuth("api:onboarding", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, completeOnboardingSchema);

  // ─── Profile fields ────────────────────────────────────────────────
  const profilePatch: Record<string, unknown> = {};
  if (body.full_name !== undefined) profilePatch.full_name = body.full_name;
  if (body.sex_at_birth !== undefined) profilePatch.sex_at_birth = body.sex_at_birth;
  if (body.date_of_birth !== undefined) profilePatch.date_of_birth = body.date_of_birth;
  if (body.height_cm !== undefined) profilePatch.height_cm = body.height_cm;
  if (body.current_weight_kg !== undefined) {
    profilePatch.current_weight_kg = body.current_weight_kg;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase.from("profiles").update(profilePatch).eq("id", user.id);
    if (error) throw error;
  }

  // ─── user_settings fields ───────────────────────────────────────────
  // Build patch from settings-shaped fields only. The schema includes
  // profile fields too, so we must allowlist explicitly.
  const settingsPatch: Record<string, unknown> = {
    onboarded_at: new Date().toISOString(),
  };
  const settingsKeys = [
    "activity_level",
    "weight_unit",
    "height_unit",
    "distance_unit",
    "water_unit",
    "week_starts_on",
    "timezone",
    "notifications_enabled",
    "primary_intents",
    "dietary_pattern",
    "excluded_foods",
  ] as const;
  for (const key of settingsKeys) {
    const value = (body as Record<string, unknown>)[key];
    if (value !== undefined) settingsPatch[key] = value;
  }

  // Upsert (rather than update) defends against the rare case where the
  // handle_new_user_settings() trigger never fired for this user — e.g.
  // a legacy account predating migration 002, or a transient trigger
  // failure. Without onConflict, .update().eq() silently returns 0 rows
  // and the user gets stuck in an "always-banner" loop with onboarded_at
  // never being written.
  const { error: settingsError } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...settingsPatch }, { onConflict: "user_id" });
  if (settingsError) throw settingsError;

  // ─── Optional: log the starting weight ─────────────────────────────
  // Non-fatal — if it fails the user is still onboarded successfully.
  if (body.current_weight_kg !== undefined) {
    const { error: weightErr } = await supabase.from("weight_entries").insert({
      user_id: user.id,
      weight_kg: body.current_weight_kg,
      logged_at: new Date().toISOString(),
      notes: "Starting weight (logged during onboarding)",
    });
    if (weightErr) {
      logger.error("Failed to log starting weight during onboarding", {
        userId: user.id,
        message: weightErr.message,
      });
    }
  }

  logger.info("Onboarding completed", {
    userId: user.id,
    filledFields: Object.keys(profilePatch).length + Object.keys(settingsPatch).length,
  });

  return NextResponse.json<ApiSuccess<{ onboarded_at: string }>>({
    success: true,
    data: { onboarded_at: settingsPatch.onboarded_at as string },
  });
});

export const dynamic = "force-dynamic";
