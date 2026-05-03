# FitTrack SaaS

A production-grade multi-user fitness tracking application built with Next.js 16, TypeScript, Supabase, and Tailwind CSS.

This is **Phase 1** — the foundational architecture. The goal is a scaffold that a team of engineers can confidently build on, not a collection of clever shortcuts.

---

## Quick start

```bash
# 1. Clone and install
git clone <repo-url> fitness-tracker-saas
cd fitness-tracker-saas
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Apply database schema
# Option A — Supabase CLI
npx supabase db push

# Option B — paste supabase/migrations/001_initial_schema.sql
# into the Supabase SQL editor

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech stack

| Layer      | Technology                       | Why                                                        |
| ---------- | -------------------------------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)          | Server Components, streaming, typed routes                 |
| Language   | TypeScript (strict)              | Catch entire classes of bugs at compile time               |
| Styling    | Tailwind CSS v4                  | Utility-first, zero runtime, excellent purge               |
| Database   | PostgreSQL via Supabase          | Relational integrity + Row Level Security                  |
| Auth       | Supabase Auth                    | JWT + cookie-based, handles refresh automatically          |
| State      | TanStack Query v5                | Server-state cache, background refetch, optimistic updates |
| Validation | Zod v4                           | Runtime type safety at system boundaries                   |
| Linting    | ESLint (flat config) + Prettier  | Consistent code style, enforced at commit time             |
| Hooks      | Husky + lint-staged + commitlint | Prevent bad commits from entering the repo                 |

---

## Folder structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Route group — auth pages (no dashboard chrome)
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx          # Centered card layout
│   ├── (dashboard)/            # Route group — protected pages
│   │   ├── dashboard/          # Overview page
│   │   ├── workouts/
│   │   ├── nutrition/
│   │   ├── sleep/
│   │   ├── water/
│   │   ├── weight/
│   │   ├── goals/
│   │   ├── analytics/
│   │   └── layout.tsx          # Sidebar + mobile nav, auth guard
│   ├── api/                    # Route Handlers (server-side API)
│   │   ├── health/route.ts     # Uptime probe
│   │   └── workouts/route.ts   # Example: full CRUD pattern
│   ├── globals.css
│   └── layout.tsx              # Root layout — providers, metadata, PWA
│
├── components/
│   ├── ui/                     # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   ├── layout/                 # Chrome: Sidebar, Header, MobileNav
│   ├── forms/                  # (Phase 2) Form components per domain
│   ├── charts/                 # (Phase 2) Chart components
│   └── providers/              # React context providers
│       ├── QueryProvider.tsx   # TanStack Query
│       └── AuthProvider.tsx    # Supabase auth state
│
├── hooks/
│   ├── useAuth.ts              # signIn / signUp / signOut / resetPassword
│   └── useUser.ts              # profile fetch + update via React Query
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client (Client Components)
│   │   ├── server.ts           # Server client (Server Components / Route Handlers)
│   │   └── middleware.ts       # Middleware client (cookie refresh)
│   ├── validations/            # Zod schemas, shared parse helpers
│   ├── errors/                 # Typed error classes + handleRouteError()
│   ├── logger/                 # Structured logger (JSON in prod, pretty in dev)
│   ├── rate-limit/             # Sliding-window limiter + per-route configs
│   └── utils/
│       ├── cn.ts               # clsx + tailwind-merge
│       └── format.ts           # Weight, volume, duration, calorie formatters
│
├── types/
│   ├── database.ts             # Hand-written DB shape (replace with generated)
│   ├── api.ts                  # ApiSuccess / ApiError envelopes
│   └── auth.ts                 # AuthState, AuthUser
│
├── constants/
│   ├── routes.ts               # Single source of truth for all paths
│   └── app.ts                  # APP_NAME, defaults, macro ratios
│
└── middleware.ts               # Edge: session refresh + auth redirects

supabase/
└── migrations/
    └── 001_initial_schema.sql  # Full schema + RLS + triggers + seed exercises
```

---

## Architecture decisions and why each one matters

### 1. Next.js App Router with Server Components

**Decision:** Use React Server Components by default; only opt into Client Components (`"use client"`) when interactivity or browser APIs are required.

**Why it matters:** Server Components run on the server and send zero JavaScript to the client. Dashboard pages that read and display data (the majority of fitness tracker screens) stay fast and lightweight. Only forms and real-time UI require client-side hydration. This splits naturally: `page.tsx` = Server Component, `*Form.tsx` = Client Component.

**Future problem it prevents:** If everything were a Client Component, the initial JS bundle would grow linearly with features. Server Components keep the bundle flat.

---

### 2. Three separate Supabase clients

**Decision:** `client.ts` (browser), `server.ts` (Server Components/Route Handlers), `middleware.ts` (Edge Middleware).

**Why it matters:** Each context has different cookie access semantics. The browser client reads `document.cookie`. The server client reads from `next/headers` (request-scoped). The middleware client reads from `NextRequest` and writes to `NextResponse` to propagate refreshed tokens. Mixing these causes subtle auth bugs — sessions expire unexpectedly or token refresh doesn't propagate.

**Future problem it prevents:** Avoids the "token works in client but not on server" bug class that plagues many Next.js + Supabase apps.

---

### 3. Row Level Security on every table

**Decision:** Every user-data table has RLS enabled with explicit policies. No table trusts the application layer to filter by `user_id`.

**Why it matters:** If a bug in the API layer accidentally omits a `.eq("user_id", user.id)` filter, the database refuses the query. User A cannot ever read User B's data, regardless of application bugs. This is defense-in-depth.

**Future problem it prevents:** Data leaks between users as the codebase grows and new developers write queries.

---

### 4. Zod at every system boundary

**Decision:** All request bodies and query params are parsed through Zod schemas before touching business logic.

**Why it matters:** TypeScript types are erased at runtime. An API caller can send `{"weight_kg": "not-a-number"}` and TypeScript won't catch it. Zod rejects invalid input and returns structured field-level errors that map directly to form validation UI.

**Future problem it prevents:** Prevents an entire class of runtime type errors and makes error messages user-friendly rather than "Internal Server Error".

---

### 5. Typed error classes + uniform API envelope

**Decision:** `AppError` subclasses (`UnauthorizedError`, `ValidationError`, etc.) + `handleRouteError()` in every catch block + `ApiSuccess<T>` / `ApiError` envelopes.

**Why it matters:** Without this, every Route Handler has different error shapes — some return `{ error: string }`, others return `{ message: string }`, others throw and return 500. Frontend code becomes a tangle of `if (error.error || error.message || ...)`. With a typed envelope, the client always knows the shape.

**Future problem it prevents:** As the API grows to 20+ routes, consistent error handling prevents fragile frontend error handling code.

---

### 6. Route groups for layout isolation

**Decision:** `(auth)` group for public auth pages, `(dashboard)` group for protected pages.

**Why it matters:** Each group gets its own `layout.tsx`. Auth pages need a centered-card layout with no sidebar. Dashboard pages need the sidebar + mobile nav. Without route groups, you'd need to detect the current route inside a single layout and conditionally render — fragile and hard to extend.

**Future problem it prevents:** Adding a new section (e.g. "Admin panel") becomes: create `(admin)/layout.tsx` with its own chrome, done.

---

### 7. TanStack Query for server state

**Decision:** Use React Query for all client-side data fetching — no `useEffect` + `useState` data fetching.

**Why it matters:** React Query provides: automatic caching, background refetching, optimistic updates, request deduplication, and loading/error states for free. Manual `useEffect` fetching duplicates these capabilities poorly and adds subtle bugs (race conditions, stale closures, missing cleanup).

**Future problem it prevents:** As the app grows, the cache prevents the same data from being fetched 5 times on the same screen.

---

### 8. In-process rate limiter with upgrade path

**Decision:** Built-in sliding-window rate limiter with per-route configs. The interface is identical to what you'd use with Upstash Redis.

**Why it matters:** Free-tier Vercel deployments can still be abused. The in-process limiter stops obvious abuse. The `.env.example` includes Upstash credentials — swapping the implementation is a one-file change.

**Future problem it prevents:** DDoS and credential-stuffing attacks on auth endpoints are common. Even a basic limiter blocks 99% of automated attacks.

---

### 9. Mobile-first with safe-area support

**Decision:** Bottom tab bar on mobile (`MobileNav`), sidebar on desktop. `pb-safe` / `pt-safe` CSS utilities use `env(safe-area-inset-*)`.

**Why it matters:** iPhone notch and home indicator overlap the bottom tab bar without safe-area padding. The PWA `standalone` display mode removes the browser chrome, making this critical.

**Future problem it prevents:** The #1 complaint for fitness PWAs is UI being cut off by the iPhone home bar.

---

### 10. Commitlint + conventional commits

**Decision:** Enforce `feat:`, `fix:`, `chore:` commit prefixes via Husky.

**Why it matters:** Conventional commits enable automatic changelog generation, semantic version bumping, and make `git log` useful. With multiple developers, unstructured commit messages make release notes impossible.

**Future problem it prevents:** "What changed in v2.3.1?" becomes answerable with one command.

---

## Setup: Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (never expose this)
3. Go to **SQL Editor** and paste `supabase/migrations/001_initial_schema.sql`
4. Enable **Email** auth in **Authentication → Providers**

---

## Deployment: Vercel (recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_APP_URL
```

Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL, then add it to Supabase's **Authentication → URL Configuration → Site URL**.

## Deployment: Cloudflare Pages (alternative)

```bash
npm install -g wrangler
wrangler pages deploy .vercel/output/static
```

Note: Cloudflare Pages requires the Edge Runtime. Add `export const runtime = "edge"` to Route Handlers that need it, and verify Supabase SSR cookie handling works in the Edge context.

---

## Development workflow

```bash
npm run dev          # Start dev server (Turbopack)
npm run type-check   # TypeScript check
npm run lint         # ESLint
npm run format       # Prettier write
npm run validate     # type-check + lint + format:check (runs in CI)
```

## Git workflow

```
main         — production, protected
staging      — pre-production integration
feat/*       — feature branches, PRs into staging
fix/*        — bug fix branches
chore/*      — tooling, dependencies
```

Commit message format: `type(scope): description`
Examples:

- `feat(workouts): add set reordering`
- `fix(auth): refresh token not propagating to server`
- `chore(deps): upgrade supabase-js to 2.106`

---

## Phase roadmap

| Phase      | Focus                                              |
| ---------- | -------------------------------------------------- |
| ✅ Phase 1 | Architecture, infrastructure, auth, design system  |
| Phase 2    | Migrate workout + nutrition tracking from monolith |
| Phase 3    | Migrate sleep, water, weight, goals                |
| Phase 4    | Analytics, charts, historical data views           |
| Phase 5    | Offline support (Workbox), push notifications      |
| Phase 6    | Social features, sharing, leaderboards             |
