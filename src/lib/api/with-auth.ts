import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { handleRouteError, UnauthorizedError } from "@/lib/errors";
import { enforceUserRateLimit, apiLimiter } from "@/lib/rate-limit";
import type { RateLimitConfig } from "@/lib/rate-limit";

export interface AuthContext<P extends Record<string, string> = Record<string, never>> {
  supabase: SupabaseClient;
  user: User;
  request: NextRequest;
  params: P;
}

type RouteHandler<P extends Record<string, string>> = (
  request: NextRequest,
  segmentData: { params: Promise<P> },
) => Promise<NextResponse>;

interface WithAuthOptions {
  limiter?: RateLimitConfig;
}

export function withAuth<P extends Record<string, string> = Record<string, never>>(
  rateLimitPrefix: string,
  handler: (ctx: AuthContext<P>) => Promise<NextResponse>,
  options?: WithAuthOptions,
): RouteHandler<P> {
  const limiter = options?.limiter ?? apiLimiter;

  return async (request, segmentData) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new UnauthorizedError();

      await enforceUserRateLimit(rateLimitPrefix, limiter, user.id);

      const params = segmentData?.params ? await segmentData.params : ({} as P);

      return await handler({ supabase, user, request, params });
    } catch (err) {
      return handleRouteError(err);
    }
  };
}
