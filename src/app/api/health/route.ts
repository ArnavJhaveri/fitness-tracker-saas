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
    // Lightweight probe — just check we can reach the DB
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      // Log internally — never expose raw DB error messages to callers
      console.error("[health] DB probe failed:", error.message);
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
