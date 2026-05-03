/**
 * GET /auth/callback?code=...&next=/path
 *
 * Supabase PKCE callback handler.  Email confirmation links and OAuth
 * redirects land here with a one-time `code` query parameter.  We exchange
 * it for a session and then redirect the user onward.
 *
 * This is a Route Handler (server-side) — no client JS is executed here.
 *
 * The proxy bypasses /auth/* so this handler always runs even before a
 * session exists.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  // Allow a custom redirect target, but only allow relative paths
  // to prevent open-redirect attacks.
  const rawNext = searchParams.get("next") ?? "";
  const next = rawNext.startsWith("/") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session established — send the user into the app.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Exchange failed or no code supplied — redirect to login with an error hint
  // so the user knows something went wrong rather than seeing a blank page.
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
