/**
 * /onboarding — entry to the new-user wizard.
 *
 * Server-side auth + already-onboarded redirect. The actual wizard is a
 * client component so step transitions and form state stay client-only.
 *
 * Access control:
 *   1. Proxy middleware ensures the user is signed in (redirects to /login).
 *   2. This page checks user_settings.onboarded_at; if non-null, the user
 *      already finished or skipped the wizard, so we send them to the
 *      dashboard. They can re-run preferences from /settings.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/constants";
import { OnboardingWizard } from "./_components/OnboardingWizard";

export const dynamic = "force-dynamic";

/**
 * Strict allowlist parsers — defend against unexpected DB values (legacy
 * data, manual SQL) silently leaking into the wizard's initial state and
 * later being rejected by Zod at submit time. The earlier `as` cast obscured
 * the actual problem; these helpers guarantee a valid default.
 */
function parseWeightUnit(v: unknown): "kg" | "lbs" {
  return v === "kg" || v === "lbs" ? v : "kg";
}
function parseHeightUnit(v: unknown): "cm" | "ft" {
  return v === "cm" || v === "ft" ? v : "cm";
}
function parseTimezone(v: unknown): string {
  return typeof v === "string" && v.length > 0 ? v : "UTC";
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN);

  const { data: settings } = await supabase
    .from("user_settings")
    .select("onboarded_at, timezone, weight_unit, height_unit")
    .eq("user_id", user.id)
    .maybeSingle();

  if (settings?.onboarded_at) {
    redirect(ROUTES.DASHBOARD);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:py-12">
      <OnboardingWizard
        defaultTimezone={parseTimezone(settings?.timezone)}
        defaultWeightUnit={parseWeightUnit(settings?.weight_unit)}
        defaultHeightUnit={parseHeightUnit(settings?.height_unit)}
      />
    </main>
  );
}
