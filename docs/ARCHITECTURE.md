# Architecture Overview

FitTrack SaaS is a multi-tenant fitness tracking platform. This document describes the technical architecture, the reasoning behind each major decision, and where the system will need to change as it scales.

---

## System diagram

```
Browser / PWA
    │
    ├── Static assets (CDN via Vercel Edge Network)
    │
    └── Next.js 16 App (Vercel Serverless + Edge)
            │
            ├── React Server Components (SSR / streaming)
            │
            ├── API Route Handlers (/api/*)
            │       ├── Rate limiter (in-process Map → Upstash Redis)
            │       ├── Auth check (Supabase JWT verification)
            │       ├── Zod validation
            │       ├── Business logic (lib/db/*)
            │       └── Supabase PostgreSQL (via @supabase/ssr)
            │
            └── Client Components ("use client")
                    ├── TanStack Query (server state cache)
                    └── Supabase client (auth session refresh)
```

---

## Layer responsibilities

### Next.js App Router (src/app/)

- Route groups `(auth)` and `(dashboard)` isolate layouts.
- Pages are Server Components by default — no JS sent to the browser until interaction is needed.
- Route Handlers (`/api/*`) are the server API. They do not import from client-only files.
- `src/proxy.ts` (Next.js 16 middleware) refreshes auth sessions on every request and redirects unauthenticated users.

### Features (src/features/)

Each feature is self-contained:

```
features/
  nutrition/
    components/  ← UI
    hooks/       ← TanStack Query (client data fetching)
    utils/       ← Pure business logic (unit-testable)
    index.ts     ← Public API barrel
```

Features never import from other features. Shared code lives in `src/lib/` or `src/components/`.

### Database layer (src/lib/db/)

- Wraps Supabase queries into typed functions.
- All functions accept a `SupabaseClient` as their first argument (dependency injection for testability).
- Every query scopes to `user_id` — defence-in-depth on top of Row Level Security.
- Throws typed errors (`NotFoundError`, `UnauthorizedError`) instead of returning null.

### Validation (src/lib/validations/)

- Zod schemas at every API boundary — request bodies and query params.
- Schemas are co-located with the domain they validate (not in a single global schemas file).
- `parseRequestBody` and `parseSearchParams` throw `ValidationError` with structured field errors.

---

## Data flow

### Read path (query)

```
Component mounts
  → TanStack Query checks cache
  → If stale: fetch /api/resource
  → Route Handler: auth → validate → db query → return ApiSuccess<T>
  → TanStack Query updates cache → component re-renders
```

### Write path (mutation)

```
User submits form
  → onSubmit: client-side validation (Zod)
  → TanStack useMutation: POST /api/resource
  → Route Handler: rate limit → auth → ownership check → validate → db write
  → onSuccess: invalidate affected query keys → refetch → UI updates
  → onError: show user-facing error message
```

### Cross-device sync

```
User logs food on Phone
  → Supabase write committed
  → Phone UI updates (cache invalidation)

User opens Desktop tab
  → Window focus event fires
  → TanStack Query refetchOnWindowFocus: true
  → Any query older than staleTime (60s) is refetched
  → Desktop UI shows latest data from Supabase
```

No WebSockets, no polling, no sync engine. Supabase is the single source of truth.

---

## Authentication

- **Provider:** Supabase Auth (email/password)
- **Flow:** PKCE (Proof Key for Code Exchange) for email confirmation — prevents code interception attacks
- **Session management:** Supabase SSR handles cookie refresh automatically in `proxy.ts`
- **Callback:** `/auth/callback` exchanges the confirmation code for a session, then redirects to `/dashboard`
- **CSRF:** Next.js App Router route handlers are only callable from the same origin by default. The `Content-Security-Policy` header additionally prevents injected script attacks.

### Auth decision record

We chose Supabase Auth over NextAuth.js because:

- It handles email confirmation, magic links, OAuth, and MFA in a single service
- The JWT is stored in a cookie (not localStorage) which mitigates XSS token theft
- The refresh token rotation is automatic via the SSR helper library
- If we add social login (Google, Apple) in Phase 6, Supabase handles the OAuth dance

---

## Security architecture

| Layer      | Mechanism                                                     |
| ---------- | ------------------------------------------------------------- |
| Transport  | HSTS (2yr, preload) — forces HTTPS                            |
| Headers    | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Auth       | Supabase JWT + PKCE confirmation flow                         |
| API        | Rate limiting (IP-based, Upstash Redis in prod)               |
| Input      | Zod validation at every route boundary                        |
| Database   | Row Level Security on every table                             |
| App layer  | Ownership checks before every mutation (defence-in-depth)     |
| Monitoring | Sentry (error tracking + session replay masked for GDPR)      |

---

## Performance architecture

| Concern            | Solution                                                                |
| ------------------ | ----------------------------------------------------------------------- |
| JS bundle size     | Server Components by default; Recharts lazy-loaded                      |
| Data freshness     | TanStack Query with 60s staleTime + refetchOnWindowFocus                |
| API latency        | Rate limiter in-process (no Redis round-trip in dev/low-traffic)        |
| Image optimization | Next.js Image with AVIF/WebP, Supabase CDN                              |
| Database queries   | Supabase PostgREST (compiled queries, connection pooling via PgBouncer) |
| Caching            | CDN edge caching for static assets; no server-side page caching yet     |

---

## Current limitations and known gaps

1. **No generated Supabase types.** Running `npx supabase gen types typescript` and passing `Database` to `createClient<Database>()` would eliminate 30+ `as SomeType` casts and catch DB schema mismatches at compile time. Blocked by: Supabase project must be set up first.

2. **No background jobs.** Streak calculations and analytics aggregations run on every request. At scale, these should be pre-computed by a cron job (Phase 5).

3. **No API versioning.** All routes are at `/api/*`. When breaking changes are needed, `/api/v2/*` routes should be introduced in parallel.

4. **Auth endpoints rate-limited at 60/min** (same as API routes). `authLimiter` (10/15min) and `passwordResetLimiter` (5/hr) are defined but cannot be applied to client-side Supabase auth calls. Mitigation: Supabase itself rate-limits auth operations server-side.

5. **In-process rate limiter resets on cold start.** In serverless environments with multiple instances, each instance has its own counter. Moving to Upstash Redis (production env var) makes it globally consistent.

---

## File map

```
src/
├── app/
│   ├── (auth)/          Public auth pages — login, register, forgot-password
│   ├── (dashboard)/     Protected pages — each feature has a page.tsx
│   ├── api/             Route Handlers — the API surface
│   └── auth/callback/   PKCE code exchange — must not be behind auth guard
├── components/
│   ├── layout/          Sidebar, MobileNav, Header
│   ├── providers/       QueryProvider (TanStack Query), AuthProvider (Supabase)
│   └── ui/              Design system primitives
├── features/            Domain modules (workouts, nutrition, sleep, water, weight, goals, analytics)
├── hooks/               Cross-cutting React hooks (useAuth, useUser)
├── lib/
│   ├── db/              Database access layer
│   ├── errors/          Typed error classes + route error handler
│   ├── logger/          Structured logger (pino-compatible interface)
│   ├── monitoring/      Sentry wrappers (captureException, identifyUser, withSpan)
│   ├── rate-limit/      Sliding-window limiter (in-process + Upstash)
│   ├── supabase/        Three Supabase clients (browser, server, middleware)
│   ├── utils/           cn, date, format
│   └── validations/     Zod schemas
├── services/            HTTP client wrappers (call API routes from client components)
└── types/               TypeScript types (database, API envelopes, auth)
```
