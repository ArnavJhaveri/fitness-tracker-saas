/**
 * Rate limiter — sliding window, globally consistent.
 *
 * Backend selection (resolved once at module load):
 *
 *   Production (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set)
 *   └── @upstash/ratelimit  ← shared across all serverless instances
 *
 *   Development / CI (env vars absent)
 *   └── in-process Map      ← zero-dependency, resets on cold start
 *
 * The public interface — enforceRateLimit(prefix, config) — is identical
 * in both paths, so no call sites need to change when env vars are added.
 *
 * Required env vars for production:
 *   UPSTASH_REDIS_REST_URL   — REST endpoint from Upstash console
 *   UPSTASH_REDIS_REST_TOKEN — read-write token from Upstash console
 *
 * Getting started:
 *   1. Create a free Redis database at https://console.upstash.com
 *   2. Copy the REST URL and token into your .env.local (and Vercel env)
 *   3. Redeploy — rate limiting is now global
 */

import { headers } from "next/headers";
import { RateLimitError } from "@/lib/errors";

// ─── Shared types (unchanged — call sites depend on these) ────────────────────

export interface RateLimitConfig {
  /** Number of requests allowed per window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ─── Pre-configured limiters (unchanged) ──────────────────────────────────────

/** Standard API endpoints — 60 requests per minute per IP */
export const apiLimiter: RateLimitConfig = { limit: 60, windowMs: 60_000 };

/** Auth endpoints (login / register) — 10 per 15 minutes per IP */
export const authLimiter: RateLimitConfig = { limit: 10, windowMs: 15 * 60_000 };

/** Strict limiter for password reset — 5 per hour */
export const passwordResetLimiter: RateLimitConfig = { limit: 5, windowMs: 60 * 60_000 };

// ─── Backend: in-process Map (dev / CI fallback) ──────────────────────────────

interface WindowEntry {
  count: number;
  resetAt: number;
}
const localStore = new Map<string, WindowEntry>();

function checkLocal(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = localStore.get(key);

  if (!entry || now > entry.resetAt) {
    localStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

// ─── Backend: Upstash Redis (production) ──────────────────────────────────────

/**
 * Lazily-initialised Upstash limiter cache.
 * We cache one Ratelimit instance per config shape (limit + window) to avoid
 * re-constructing on every request while keeping the module import side-effect free.
 */
const upstashLimiters = new Map<string, import("@upstash/ratelimit").Ratelimit>();

async function checkUpstash(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");

  const cacheKey = `${config.limit}:${config.windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);

  if (!limiter) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    limiter = new Ratelimit({
      redis,
      // Sliding window gives smoother throttling than fixed windows
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs}ms`),
      analytics: false, // opt out of Upstash analytics to keep costs minimal
    });

    upstashLimiters.set(cacheKey, limiter);
  }

  const { success, remaining, reset } = await limiter.limit(key);

  return {
    allowed: success,
    remaining: remaining,
    resetAt: Number(reset), // Upstash returns epoch-ms
  };
}

// ─── Unified check (picks backend automatically) ───────────────────────────────

const useRedis =
  typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
  process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
  typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string" &&
  process.env.UPSTASH_REDIS_REST_TOKEN.length > 0;

/**
 * Check and increment the rate limit counter for a given key.
 *
 * Uses Upstash Redis in production (env vars present) and the in-process
 * Map fallback otherwise. The return shape is identical in both paths.
 */
async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  if (useRedis) {
    return checkUpstash(key, config);
  }
  return checkLocal(key, config);
}

// ─── Route-handler helpers ───────────────────────────────────────────────────

/**
 * Resolve the client IP from request headers. Used for unauthenticated
 * endpoints (login, register, password reset) where there's no user_id yet.
 *
 * x-real-ip is a single, trusted header set by reverse proxies (nginx, Vercel).
 * When it's absent, fall back to the LAST entry in x-forwarded-for — the IP
 * most recently appended by the load balancer — rather than the first entry,
 * which is supplied by the client and can be spoofed.
 */
async function resolveClientIp(): Promise<string> {
  const headerStore = await headers();
  const xff = headerStore.get("x-forwarded-for");
  const lastXff = xff ? xff.split(",").at(-1)?.trim() : undefined;
  return headerStore.get("x-real-ip") ?? lastXff ?? "unknown";
}

/**
 * Enforce a rate limit on an UNAUTHENTICATED route. Keys by IP address.
 *
 * Use this for /auth/* routes and any other endpoint where there's no
 * `user_id` yet. For authenticated endpoints, prefer `enforceUserRateLimit`
 * — IP keying lumps every user behind the same NAT (corporate office,
 * carrier-grade NAT) into a shared bucket.
 *
 * The signature stays the same as before for drop-in compatibility with
 * pre-existing call sites that aren't yet user-aware.
 */
export async function enforceRateLimit(prefix: string, config: RateLimitConfig): Promise<void> {
  const ip = await resolveClientIp();
  const result = await checkRateLimit(`${prefix}:ip:${ip}`, config);
  if (!result.allowed) {
    throw new RateLimitError();
  }
}

/**
 * Enforce a rate limit on an AUTHENTICATED route. Keys by user_id, with
 * the client IP as a SECONDARY key qualifier so a compromised account
 * can't be used to mount a much-higher-volume attack from many machines.
 *
 * Why both: pure user_id keying lets an attacker who steals one user's
 * cookie spread the load across many IPs. Pure IP keying punishes legit
 * users sharing a NAT. Combining both ("the same user from the same IP")
 * gives each user their own quota in their normal usage, while making
 * cookie-replay attacks self-throttling.
 *
 * Pass the user.id resolved by `supabase.auth.getUser()` in the route.
 */
export async function enforceUserRateLimit(
  prefix: string,
  config: RateLimitConfig,
  userId: string,
): Promise<void> {
  const ip = await resolveClientIp();
  const result = await checkRateLimit(`${prefix}:user:${userId}:${ip}`, config);
  if (!result.allowed) {
    throw new RateLimitError();
  }
}
