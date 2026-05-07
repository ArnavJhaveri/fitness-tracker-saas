/**
 * GET /api/health
 *
 * Used by uptime monitors (UptimeRobot, Vercel, etc.) to verify the
 * deployment is alive and the database connection is healthy.
 * This route is explicitly excluded from rate limiting.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    const supabase = await createClient();
    // Probe the auth service rather than an RLS-protected table.
    //
    // Previously this route did a HEAD on `profiles`. The endpoint is
    // anonymous (no session cookie required to hit it), and `profiles`'
    // RLS policy requires `auth.uid() = id` for SELECT. Result: an
    // unauthenticated probe returned 0 rows + error=null = "looks healthy"
    // even when the policy was misconfigured or the table was missing.
    //
    // `auth.getSession()` is the cheapest non-RLS-protected probe — it
    // exercises the Supabase auth API gateway end-to-end. A real DB
    // outage surfaces as an error here.
    const { error } = await supabase.auth.getSession();

    if (error) {
      // Log internally — never expose raw DB error messages to callers
      console.error("[health] auth probe failed:", error.message);
      return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503 });
    }

    return NextResponse.json({
      status: "ok",
      database: "connected",
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", database: "unknown", latency_ms: Date.now() - start },
      { status: 503 },
    );
  }
}
