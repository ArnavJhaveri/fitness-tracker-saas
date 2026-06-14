/**
 * GET  /api/phases — list phases (optionally filtered by status)
 * POST /api/phases — create a phase
 *
 * Phases are time-bounded training/nutrition blocks. Only one phase can be
 * `active` per user (enforced by a unique partial index in the DB).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { createPhaseSchema } from "@/lib/validations";
import { parseRequestBody, parseSearchParams } from "@/lib/validations/shared";
import { listPhases, createPhase } from "@/lib/db/phases";
import { logger } from "@/lib/logger";
import type { ApiSuccess } from "@/types/api";
import type { Phase } from "@/types/database";

const listQuerySchema = z.object({
  status: z.enum(["planned", "active", "ended", "superseded"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = withAuth("api:phases:get", async ({ supabase, user, request }) => {
  const params = parseSearchParams(
    Object.fromEntries(request.nextUrl.searchParams),
    listQuerySchema,
  );

  const data = await listPhases(supabase, user.id, params);
  return NextResponse.json<ApiSuccess<Phase[]>>({ success: true, data });
});

export const POST = withAuth("api:phases:post", async ({ supabase, user, request }) => {
  const body = await parseRequestBody(request, createPhaseSchema);
  const phase = await createPhase(supabase, user.id, body);

  logger.info("Phase created", {
    userId: user.id,
    phaseId: phase.id,
    type: phase.phase_type,
  });

  return NextResponse.json<ApiSuccess<Phase>>({ success: true, data: phase }, { status: 201 });
});

export const dynamic = "force-dynamic";
