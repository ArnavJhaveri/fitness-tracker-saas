/**
 * DELETE /api/water/[id] — remove a water log entry
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { deleteWaterEntry } from "@/lib/db/health";

export const DELETE = withAuth<{ id: string }>(
  "api:water:delete",
  async ({ supabase, user, params }) => {
    const { id } = params;
    await deleteWaterEntry(supabase, user.id, id);
    return new NextResponse(null, { status: 204 });
  },
);

export const dynamic = "force-dynamic";
