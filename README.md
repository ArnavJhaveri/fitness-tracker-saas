# FitTrack SaaS

A multi-user fitness tracking app built on Next.js 16, Supabase, and TypeScript.
Tracks workouts, nutrition, sleep, water, weight, and goals — and supports
opt-in **phases** (cuts, bulks, strength blocks, etc.) that override your
daily targets without rewriting historical analytics.

---

## Quick start

```bash
git clone <repo-url> fitness-tracker-saas
cd fitness-tracker-saas
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Apply database schema (three migrations, in order)
npx supabase db push
# OR paste supabase/migrations/001_*.sql, 002_*.sql, 003_*.sql into the
# Supabase SQL editor

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, and you'll be
guided through onboarding — or skip it and start logging immediately
(companion mode).

---

## Tech stack

| Layer      | Technology                       | Why                                                       |
| ---------- | -------------------------------- | --------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)          | Server Components, streaming, typed routes                |
| Language   | TypeScript (strict)              | Catch entire classes of bugs at compile time              |
| Styling    | Tailwind CSS v4                  | Utility-first, zero runtime, excellent purge              |
| Database   | PostgreSQL via Supabase          | Relational integrity + Row Level Security                 |
| Auth       | Supabase Auth                    | JWT + cookie-based, handles refresh automatically         |
| State      | TanStack Query v5                | Server-state cache, optimistic updates, focus refetch     |
| Validation | Zod v4                           | Runtime type safety at every API boundary                 |
| Charts     | Recharts                         | Lazy-loaded so the bundle stays small for non-chart pages |
| Errors     | Sentry (`@sentry/nextjs`)        | Source maps, replay, edge + server runtimes               |
| Tests      | Vitest + Playwright              | Pure-logic units + auth-flow E2E                          |
| Hooks      | Husky + lint-staged + commitlint | Pre-commit format/lint, pre-push credential-leak check    |

---

## Folder layout

```
src/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # Login / register / forgot-password / reset
│   ├── (dashboard)/                # Authenticated app — workouts / nutrition /
│   │                               #   sleep / water / weight / goals / phases /
│   │                               #   exercises / analytics / settings
│   ├── onboarding/                 # First-run wizard (skippable)
│   ├── api/                        # Route handlers — every domain has its own
│   │                               #   subfolder mirroring the dashboard pages
│   ├── auth/callback/              # Supabase PKCE callback (proxy-bypassed)
│   └── layout.tsx                  # Root layout — Auth + Query providers
│
├── components/
│   ├── ui/                         # Generic UI primitives (Button, Card, …)
│   ├── layout/                     # Sidebar, MobileNav, Header
│   ├── dashboard/                  # Dashboard widgets + visibility rules
│   └── providers/                  # Auth + Query providers
│
├── features/                       # Domain features — components, hooks, utils
│   ├── analytics/                  # Streaks, adherence, trends, charts
│   ├── exercises/                  # Custom exercise CRUD + form
│   ├── goals/                      # Goal cards, form
│   ├── nutrition/                  # Meal cards, food logger, macro summary
│   ├── phases/                     # Phase progress card, form, hooks
│   ├── settings/                   # Settings hooks
│   ├── sleep/ water/ weight/       # Logging UIs
│   └── workouts/                   # Session detail, set logger
│
├── lib/
│   ├── db/                         # Supabase repository layer (per domain)
│   ├── errors/                     # Typed error classes + handleRouteError
│   ├── logger/                     # Structured logger
│   ├── monitoring/                 # Web Vitals reporter
│   ├── rate-limit/                 # In-process / Upstash sliding window
│   ├── registry/                   # Curated metadata (phase / goal / meal /
│   │                               #   exercise-category types)
│   ├── supabase/                   # Browser / server / middleware clients
│   ├── targets/                    # resolveDailyTargets — phase + settings
│   ├── utils/                      # date, format, cn, tdee, redirect, etc.
│   └── validations/                # Zod schemas at every API boundary
│
├── services/                       # Thin fetch() wrappers used by hooks
├── types/                          # Hand-written DB types + API envelope
├── constants/                      # ROUTES, APP_NAME, APP_URL
├── proxy.ts                        # Edge proxy: session refresh + auth gate
└── __tests__/                      # Vitest unit tests

e2e/                                # Playwright auth + smoke tests
scripts/                            # Operational tooling (sheet importer)
supabase/migrations/                # 001 / 002 / 003 SQL migrations
public/                             # PWA manifest
```

---

## Architecture principles

**Server-side auth, every time.** Every dashboard route checks `auth.getUser()`
in a Server Component layout AND every API handler checks it again. The
`src/proxy.ts` middleware is the third belt — it refreshes the session JWT
and redirects unauthenticated users to `/login`.

**Validation at every API boundary.** No route handler trusts request input.
`src/lib/validations/*` defines Zod schemas; `parseRequestBody` and
`parseSearchParams` throw a structured `ValidationError` on bad input that
`handleRouteError` translates to a 400 with field-level details.

**Repository pattern for DB access.** Routes are thin HTTP adapters;
`src/lib/db/*.ts` owns the SQL. This keeps routes ~30 lines each and makes
the SQL testable in isolation.

**Companion mode is the default.** A user with no active phase, no goals,
and no targets gets a fully usable dashboard. Phases are an opt-in power
feature that override targets on a per-field basis (see
`src/lib/targets/resolveDailyTargets.ts`).

**Phases never rewrite history.** When you pivot or end a phase, analytics
for past days resolve against the phase that was active at the time. The
`findPhaseForDate` SQL filter handles this; the `pivotPhase` DB layer
enforces "new phase can't start in the past."

**Target resolution is layered.** Phase overrides → `user_settings` →
companion-mode (no target). The pure `applyResolution` function is unit-
tested; `resolveDailyTargets` adds the SQL layer that finds the right phase
for a given date.

---

## Database

Three migrations, applied in order:

| File                            | What it adds                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `001_initial_schema.sql`        | profiles, exercises (system + custom), workouts, nutrition, sleep, water, weight, goals, RLS policies, triggers |
| `002_phase2_additions.sql`      | user_settings, workout_templates, meal_templates, personal_records, `get_daily_summary` RPC                     |
| `003_phases_and_onboarding.sql` | phases, onboarding fields on user_settings, custom-category support, soft-delete on exercises                   |

RLS is on for every table; all multi-user safety is enforced by Postgres
policies, not application code. Application-layer checks in `lib/db/*` are
defence-in-depth so 404 responses are clean rather than RLS-deny errors.

---

## Commands

```bash
# Dev
npm run dev                # next dev --turbopack
npm run build              # production build
npm run start              # serve production build

# Quality
npm run type-check         # tsc --noEmit
npm run lint               # eslint
npm run lint:fix           # eslint --fix
npm run format             # prettier --write .
npm run format:check       # prettier --check .
npm run validate           # type-check + lint + format:check

# Tests
npm run test               # vitest run (unit)
npm run test:watch         # vitest watch
npm run test:coverage      # vitest run --coverage
npm run test:e2e           # playwright (requires Supabase test project)

# Operations
npm run import:sheet -- --json /path/to/sheet.json --email you@example.com [--commit]
npm run analyze            # bundle-size analyzer

# PWA
# manifest.json is in public/. Icons are intentionally not committed —
# generate from your brand image and drop them into public/icons/.
```

---

## Environment variables

See `.env.example` for the full list. Required for local dev:

| Var                             | Purpose                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon public key — safe to expose, RLS protects data           |
| `NEXT_PUBLIC_APP_URL`           | Public origin (used in OAuth redirects + Sentry release tags) |

Required for production:

| Var                             | Purpose                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`        | Error tracking + Web Vitals + Replay                          |
| `SENTRY_AUTH_TOKEN`             | Source-map upload during build                                |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry release tagging                                        |
| `UPSTASH_REDIS_REST_URL`        | Distributed rate limiting (in-process Map fallback if absent) |
| `UPSTASH_REDIS_REST_TOKEN`      |                                                               |

Required only for the import script (admin-only tool):

| Var                         | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — never expose to client; used only by `scripts/` |

E2E tests need their own Supabase test project (see `CONTRIBUTING.md`).

---

## Importing existing data

If you're migrating from the legacy Google Sheets `fitnessTracker` blob, see
`scripts/README.md`. Run `--dry-run` first; pass `--commit` to actually
write rows.

---

## Contributing

See `CONTRIBUTING.md` for the branch + commit conventions and the PR
checklist. Short version:

- `feat:` / `fix:` / `chore:` Conventional Commit subjects (lowercase)
- Pre-commit hook runs eslint + prettier on staged files
- Pre-push hook refuses pushes when the remote URL contains a credential
- All changes ship behind PR review on `main`

---

## License

Private project. No license granted.
