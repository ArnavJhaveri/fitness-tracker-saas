# ADR 001: Supabase as the backend platform

**Status:** Accepted  
**Date:** 2025-08  
**Authors:** Arnav Jhaveri

---

## Context

FitTrack needed a backend platform that could provide:

- PostgreSQL with relational integrity
- Authentication (email/password + OAuth in future)
- Row-level security for multi-tenant data isolation
- Real-time subscriptions (for future live features)
- Storage for user-uploaded content (avatars, meal photos)
- Minimal operational overhead for a solo developer

Alternatives considered:

- **Firebase / Firestore** — NoSQL, poor fit for relational fitness data (aggregations, JOINs for analytics are painful in document stores)
- **PlanetScale** — MySQL, no built-in auth, requires separate auth service
- **Self-hosted Postgres + Auth.js** — more control, but significant operational burden (DB hosting, connection pooling, session management)
- **Neon** — serverless Postgres, but no auth, no storage, no realtime

## Decision

Use Supabase as the primary backend platform for:

- Database: PostgreSQL 15 with RLS
- Authentication: Supabase Auth (PKCE flow, JWTs in cookies)
- Storage: Supabase Storage (future use for photos)
- Realtime: Available if needed (not yet used)

## Consequences

**Positive:**

- Single platform for DB + auth + storage + realtime
- RLS enforces tenant isolation at the database level, not in application code
- The `@supabase/ssr` library handles cookie-based session management in Next.js App Router correctly
- `supabase gen types typescript` can generate fully typed query results (not yet done)
- Connection pooling via PgBouncer included

**Negative:**

- Vendor lock-in: migrating away from Supabase Auth is a significant effort
- No generated types yet — requires running CLI to get compile-time query type safety
- Supabase's rate limits on the free tier are aggressive for production use
- The Supabase JS client is large (~50 kB gzipped) — mitigated by server-side use

**Risk mitigation:**

- The database access layer (`src/lib/db/`) abstracts Supabase-specific calls. If we migrate to a different Postgres provider, only this layer changes.
- Authentication is isolated in `src/lib/supabase/` and `src/hooks/useAuth.ts`. Replacing the auth provider is a contained change.
