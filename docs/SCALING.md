# Scaling Plan

This document describes what changes as FitTrack grows from hundreds to hundreds of thousands of users. Written for the team that inherits this codebase.

---

## Current architecture capacity (baseline)

| Resource                | Limit                               | Notes                              |
| ----------------------- | ----------------------------------- | ---------------------------------- |
| Supabase Free           | 500 MB DB, 2 GB bandwidth           | Fine for < ~1k active users        |
| Supabase Pro            | 8 GB DB, 250 GB bandwidth           | ~10k–50k users depending on usage  |
| Vercel Hobby            | 100 GB bandwidth                    | Fine for < ~5k monthly active      |
| Vercel Pro              | 1 TB bandwidth, edge functions      | Up to ~50k monthly active          |
| In-process rate limiter | Per-instance (resets on cold start) | Non-issue until multiple instances |

---

## 1,000 users — no changes needed

The current architecture handles 1,000 MAU comfortably. Supabase Pro handles the load. Vercel's serverless model scales to zero and back automatically.

**Recommended at this stage:**

- Switch `authLimiter`/`passwordResetLimiter` to Upstash Redis (one env var change)
- Set up Supabase Pro for daily backups and point-in-time recovery
- Enable Supabase connection pooling (PgBouncer) — free on Pro

---

## 10,000 users

### Database

- **Enable Supabase connection pooler** (Transaction mode, port 6543). Each serverless function opening a new DB connection is the #1 performance killer at this scale. PgBouncer pools connections across all serverless instances.
- **Add indexes** on high-query columns:
  ```sql
  -- Most queries filter by user_id + date range
  CREATE INDEX idx_water_entries_user_date ON water_entries(user_id, logged_at DESC);
  CREATE INDEX idx_sleep_logs_user_date ON sleep_logs(user_id, sleep_start DESC);
  CREATE INDEX idx_weight_entries_user_date ON weight_entries(user_id, logged_at DESC);
  ```
- **Analytics pre-computation:** Move `get_daily_summary` from a live RPC call to a pre-computed `daily_summaries` table updated by a Postgres trigger or cron job. This prevents N complex aggregations per dashboard load.

### Application

- **Upstash Redis for rate limiting:** Distributed rate limiting becomes critical once multiple Vercel instances exist. One env var change deploys this.
- **TanStack Query staleTime increase:** Consider increasing from 60s to 5min for analytics data. Analytics don't change often — reduce server load.
- **CDN caching for analytics API:** `Cache-Control: s-maxage=300` on `GET /api/analytics/daily` dramatically reduces DB load for returning users checking the same day's data.

### Infrastructure

- Move from Vercel Hobby to Vercel Pro for SLA guarantees.
- Set up a status page (statuspage.io or Vercel's built-in) for SLA visibility.

---

## 100,000 users

At this scale, architecture changes are significant. Plan 3–6 months of engineering time.

### Database

- **Supabase Enterprise** or self-hosted Postgres with a managed provider (RDS, Neon, Fly.io Postgres).
- **Read replicas:** Route all `GET` queries to a read replica. Write queries go to the primary. The `SupabaseClient` created in route handlers can be pointed at either.
  ```ts
  // Read replica for queries
  const supabase = createClient(REPLICA_URL, ANON_KEY);
  // Primary for writes
  const writableSupabase = createClient(PRIMARY_URL, SERVICE_ROLE_KEY);
  ```
- **Partitioning:** Partition high-volume tables (`water_entries`, `weight_entries`, `exercise_sets`) by `user_id` range or by `created_at` date range. This keeps table scans fast as rows grow into the hundreds of millions.
- **Data archival:** Move entries older than 2 years to a cold storage table or object storage. Most users only query recent data.

### API architecture

- **API versioning:** Introduce `/api/v2/*` routes before making breaking changes. Maintain v1 for 6 months minimum. Use a `Accept: application/vnd.fittrack.v2+json` header or path-based versioning.
- **Background jobs:** Replace synchronous aggregations with async workers.
  - Technology: Inngest, Trigger.dev, or Supabase Edge Functions as cron jobs.
  - Workloads: daily summary computation, streak calculation, email digests.
- **Queue architecture:** Write mutations enqueue a job instead of computing synchronously.
  ```
  POST /api/water → insert entry → enqueue "compute-daily-summary" job
                                → job runs async → updates daily_summaries table
  ```
- **Webhook delivery:** When social features launch (Phase 6), webhook delivery must be queue-backed with retry logic.

### Caching

- **Redis caching layer:** Cache analytics results per user per day. TTL = until next write. Invalidate on mutation.
  - Cache key: `analytics:daily:{userId}:{date}`
  - Saves the most expensive RPC calls per request
- **Edge caching:** Vercel Edge Config for feature flags, rate limit overrides, and A/B test configuration.

### Observability

- **Structured logging to a log aggregator:** Replace `console.log` with a structured log sink (Axiom, Datadog, Logtail). Add `request_id` to every log line for distributed tracing.
- **Custom dashboards:** Build dashboards tracking: DAU/MAU, feature adoption rates, API error rates per route, P50/P95/P99 latency per endpoint.
- **Alerts:** PagerDuty or similar for: error rate > 1%, P99 latency > 2s, database CPU > 80%.

### Mobile

- **React Native app** (Phase 5): The existing API surface is already mobile-ready. The API routes are the same — only the client changes. Supabase handles offline sync via the `realtime` client.
- **Push notifications:** Supabase Edge Functions can send FCM/APNs push notifications triggered by DB changes (streak at risk, daily reminder).

---

## Future feature integrations

### AI features (Phase 5+)

- **Meal recognition from photos:** Image → nutrition data pipeline. Architecture: upload to Supabase Storage → trigger Edge Function → call vision API (GPT-4o, Gemini) → return structured nutrition data → user confirms → insert to meal_items.
- **AI coaching:** Daily/weekly summaries generated by LLM from the user's data. Implement as a background job that writes to a `ai_insights` table. Keep LLM calls async — never block the API response.
- **Embedding search for exercises:** `pgvector` on the `exercises` table enables semantic search ("what exercises target the same muscle as bench press?").

### Social features (Phase 6+)

- **User follows/friends:** Add `user_follows` table. RLS: users can see friends' public stats only if `is_public = true`.
- **Leaderboards:** Materialized views refreshed hourly. Never compute leaderboards on-demand at scale.
- **Challenges:** `challenges` table with `challenge_participants`. Challenge completion checked by trigger or cron.
- **Activity feed:** Fanout-on-write pattern: when a user logs a workout, write activity records for all followers. At high scale, switch to fanout-on-read with a Redis timeline cache.

### Subscription model

- **Payment provider:** Stripe. Use Stripe Checkout for the payment flow, webhooks for subscription lifecycle events.
- **Entitlements:** Add a `subscription_tier` column to `profiles`. API routes check the tier for feature gating. Keep this simple — a single column, not a complex RBAC system.
- **Usage limits:** Rate limit per-user (not per-IP) for authenticated endpoints once subscriptions are live. `enforceRateLimit` already supports arbitrary key prefixes.

---

## Architecture review

### Strengths

1. **Server-authoritative from day one.** All data in Supabase with RLS — no sync conflicts, no client-side data store to debug.
2. **Zero-infrastructure auto-scaling.** Vercel serverless + Supabase cloud scales to zero and to 10x traffic without configuration.
3. **Security by default.** CSP, HSTS, RLS, rate limiting, PKCE auth, defence-in-depth ownership checks — the baseline is strong.
4. **Feature-module architecture.** Each domain (nutrition, workouts, sleep, etc.) is self-contained. New features are additive, not modifying.
5. **TanStack Query cross-device sync.** `refetchOnWindowFocus: true` solves multi-device consistency without WebSockets.

### Remaining risks

1. **No generated Supabase types.** 30+ `as SomeType` casts will silently pass wrong data if the DB schema changes. Highest priority technical debt.
2. **In-process rate limiter.** Non-issue now, critical at 10k+ concurrent users across multiple instances. One env var change to Upstash Redis, but it needs to be done before traffic spikes.
3. **No background job infrastructure.** Analytics are computed on every API request. At 10k+ users this becomes a performance bottleneck and a cost issue.
4. **No API versioning.** Breaking API changes require coordinated frontend + backend deployment. At 100k+ with a mobile app, this becomes a production incident.
5. **Single-region deployment.** Vercel's edge network handles static assets globally, but the Supabase database and serverless functions are in a single region. P99 latency for users far from the region will be high.

### Scaling bottlenecks by milestone

| Milestone  | First bottleneck          | Fix                                                                |
| ---------- | ------------------------- | ------------------------------------------------------------------ |
| 1k users   | None                      | —                                                                  |
| 10k users  | DB connections            | PgBouncer connection pooling (1 day)                               |
| 10k users  | Rate limiter per-instance | Upstash Redis (1 day)                                              |
| 25k users  | Analytics RPC cost        | Pre-compute daily_summaries (1 week)                               |
| 50k users  | Read latency              | Read replica (1 week)                                              |
| 100k users | DB contention             | Table partitioning + background jobs (1 month)                     |
| 500k users | Single-region latency     | Multi-region Postgres (Neon, PlanetScale) + global edge deployment |

### Recommended next milestones after Phase 4

1. **Generate Supabase TypeScript types** — eliminates the biggest type-safety gap. ~2 hours.
2. **Set up Upstash Redis** — makes rate limiting production-correct. ~1 hour.
3. **Add Supabase connection pooling** — `?pgbouncer=true` on the connection string. ~30 minutes.
4. **Pre-compute daily_summaries** — write a Postgres function triggered on inserts to water/sleep/workout tables. ~1 week.
5. **Stripe integration** — subscription model enables monetisation. ~2 weeks.
6. **React Native app** — the API is already mobile-ready. ~6 weeks for a feature-complete native app.
