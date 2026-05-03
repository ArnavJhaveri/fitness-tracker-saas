/**
 * GET /api/exercises — search the exercise library
 *
 * Query params:
 *   q          string  — search term (name contains, case-insensitive)
 *   category   string  — filter by category (strength | cardio | flexibility | sports)
 *   muscle     string  — filter by primary_muscle_group
 *   page       number  — default 1
 *   per_page   number  — default 20, max 100
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceRateLimit, apiLimiter } from "@/lib/rate-limit";
import { parseSearchParams } from "@/lib/validations/shared";
import type { ApiSuccess } from "@/types/api";
import type { Exercise } from "@/types/database";

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  muscle: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit("api:exercises:get", apiLimiter);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new UnauthorizedError();

    const params = parseSearchParams(Object.fromEntries(request.nextUrl.searchParams), querySchema);

    let query = supabase
      .from("exercises")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

    if (params.q?.trim()) query = query.ilike("name", `%${params.q.trim()}%`);
    if (params.category) query = query.eq("category", params.category);
    if (params.muscle) query = query.eq("primary_muscle_group", params.muscle);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json<ApiSuccess<Exercise[]>>({
      success: true,
      data: (data ?? []) as Exercise[],
      meta: {
        page: params.page,
        per_page: params.per_page,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / params.per_page),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export const dynamic = "force-dynamic";
