/**
 * Next.js 16 Proxy (previously "middleware") — runs before every request on the edge.
 *
 * Responsibilities (in order):
 * 1. Refresh the Supabase session (rotate JWT if close to expiry)
 * 2. Enforce authentication: redirect unauthenticated users to /login
 * 3. Redirect authenticated users away from auth pages
 *
 * Rate limiting is intentionally handled per-route in Route Handlers rather
 * than here, because the edge proxy has no access to the in-process store
 * on Vercel's edge network.  If you add Upstash Redis, move it here.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

/** Routes that are always public (no auth required). */
const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

/** Routes that should redirect to dashboard when already authenticated. */
const AUTH_ONLY_ROUTES = ["/login", "/register", "/forgot-password"];

/** Static asset / API routes that bypass all proxy logic. */
const BYPASS_PREFIXES = [
  "/api/",
  "/auth/", // auth callbacks (PKCE code exchange) must run before a session exists
  "/_next/",
  "/favicon.ico",
  "/icons/",
  "/manifest.json",
];

function shouldBypass(pathname: string): boolean {
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't run proxy for static files and API routes
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);

  // Refresh session — this also writes updated cookies into response
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // Authenticated user hitting an auth-only route → send to dashboard
  if (isAuthenticated && isAuthOnlyRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user hitting a protected route → send to login
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
