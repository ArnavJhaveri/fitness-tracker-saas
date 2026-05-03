# Contributing to FitTrack SaaS

This guide covers the development workflow, code standards, and review process for contributors.

---

## Quick start

```bash
git clone https://github.com/ArnavJhaveri/fitness-tracker-saas
cd fitness-tracker-saas
npm install
cp .env.example .env.local   # add your Supabase credentials
npm run dev
```

---

## Branch strategy

```
main      — production. Protected. Requires passing CI + 1 approval.
staging   — pre-production integration. Merges here first.
feat/*    — new features. Branch from staging, PR into staging.
fix/*     — bug fixes. Branch from staging (or main for hotfixes).
chore/*   — tooling, deps, refactors with no user-facing changes.
```

**Never commit directly to `main` or `staging`.** All changes arrive via pull request.

---

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Commitlint enforces this at commit time.

```
type(scope): short description (lowercase, no period)

Optional longer body explaining WHY, not what.

Co-Authored-By: Your Pair <pair@example.com>
```

| Type       | Use for                                     |
| ---------- | ------------------------------------------- |
| `feat`     | New user-facing feature                     |
| `fix`      | Bug fix                                     |
| `perf`     | Performance improvement (no feature change) |
| `refactor` | Code restructure (no feature or fix)        |
| `test`     | Adding or fixing tests                      |
| `docs`     | Documentation only                          |
| `chore`    | Build scripts, deps, CI config              |
| `ci`       | CI/CD configuration changes                 |

Examples:

```
feat(nutrition): add barcode scanner for food logging
fix(auth): prevent redirect loop when session expires during PKCE flow
perf(charts): lazy-load recharts bundle to reduce initial JS size
test(streaks): add edge cases for midnight timezone boundary
```

---

## Code standards

### TypeScript

- No `as any`. Use `as Route` for typed routes, `as SpecificType` only when structurally verified.
- All new API route handlers must validate request bodies with Zod before touching the DB.
- All new API route handlers must check authentication before doing anything.

### React

- Prefer Server Components. Only use `"use client"` when you need interactivity or browser APIs.
- No `Date.now()` / `new Date()` in render bodies — use `useState(() => Date.now())` lazy initialisers.
- No `setState` synchronously inside `useEffect`.

### API routes

- Every write mutation (POST/PATCH/DELETE) must have an ownership check beyond RLS.
- Every route must call `enforceRateLimit()` first.
- Every route must return `ApiSuccess<T>` or let `handleRouteError()` produce `ApiError`.

### TanStack Query mutations

- Every `onSuccess` must invalidate all affected query keys, including `["analytics"]` when the mutation affects tracked metrics.
- Every mutation must have an `onError` that shows the user feedback (or the global `MutationCache` onError handles it as a fallback).

---

## Running tests

```bash
npm run test              # unit tests (one shot)
npm run test:watch        # unit tests (interactive watch mode)
npm run test:coverage     # unit tests + coverage report
npm run test:e2e          # end-to-end tests (requires running app)
npm run test:e2e:ui       # Playwright UI mode for debugging
```

### E2E setup

E2E tests need a real Supabase test project and a dedicated test user:

```
E2E_USER_EMAIL=test@yourproject.com
E2E_USER_PASSWORD=TestPassword123!
E2E_SUPABASE_URL=https://your-test-project.supabase.co
E2E_SUPABASE_ANON_KEY=your-test-anon-key
```

Create a separate Supabase project for testing — never run E2E against production data.

---

## Pull request checklist

Before opening a PR, verify:

- [ ] `npm run validate` passes (type-check + lint + format)
- [ ] `npm run test` passes
- [ ] New features have unit tests
- [ ] New API routes have been manually tested with the auth checks verified
- [ ] No `as any` introduced
- [ ] `onSuccess` cache invalidation covers all affected queries
- [ ] PR description explains **why** the change is made, not just what

---

## Database migrations

1. Write migration SQL in `supabase/migrations/NNN_description.sql`
2. Apply locally: `npx supabase db push` or paste into the SQL editor
3. Include the migration in your PR — reviewers check that RLS policies are correct
4. Never modify existing migration files — always add a new one

---

## Environment variables

| Variable                        | Required   | Description                              |
| ------------------------------- | ---------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes        | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes        | Supabase anon key (safe to expose)       |
| `SUPABASE_SERVICE_ROLE_KEY`     | No         | Admin key — only for server-side scripts |
| `NEXT_PUBLIC_APP_URL`           | Yes        | Canonical URL (used in auth callbacks)   |
| `NEXT_PUBLIC_SENTRY_DSN`        | Production | Sentry DSN for error tracking            |
| `SENTRY_AUTH_TOKEN`             | CI         | For source map uploads to Sentry         |
| `SENTRY_ORG`                    | CI         | Sentry org slug (for releases + uploads) |
| `SENTRY_PROJECT`                | CI         | Sentry project slug                      |
| `UPSTASH_REDIS_REST_URL`        | Production | Redis URL for distributed rate limiting  |
| `UPSTASH_REDIS_REST_TOKEN`      | Production | Redis token                              |
| `E2E_SUPABASE_URL`              | E2E only   | Test Supabase project URL                |
| `E2E_SUPABASE_ANON_KEY`         | E2E only   | Test Supabase anon key                   |
| `E2E_USER_EMAIL`                | E2E only   | Test user email                          |
| `E2E_USER_PASSWORD`             | E2E only   | Test user password                       |

Never commit `.env.local` or any file containing real credentials.
