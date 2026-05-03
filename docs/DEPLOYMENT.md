# Deployment Guide

---

## Environments

| Environment | Branch    | URL                                       | Purpose                |
| ----------- | --------- | ----------------------------------------- | ---------------------- |
| Production  | `main`    | `https://fittrack.yourdomain.com`         | Live users             |
| Staging     | `staging` | `https://staging.fittrack.yourdomain.com` | Pre-release validation |
| Preview     | Any PR    | Auto-generated Vercel URL                 | Per-PR review          |

---

## Pre-deployment checklist

### Every deployment

- [ ] `npm run validate` passes locally
- [ ] `npm run test` passes
- [ ] Build completes: `npm run build`
- [ ] New environment variables are added to Vercel dashboard
- [ ] Database migrations reviewed and applied (staging first, then production)

### New feature deployments

- [ ] Feature tested against the staging Supabase project
- [ ] E2E tests pass against staging
- [ ] RLS policies on new tables reviewed
- [ ] Rate limiting applied to new API routes

### Major releases

- [ ] Rollback plan documented (see Rollback section below)
- [ ] Sentry release created
- [ ] Health endpoint confirms the deployment is alive

---

## Vercel setup

### Required secrets (Vercel dashboard → Settings → Environment Variables)

**Production + Staging:**

```
NEXT_PUBLIC_SUPABASE_URL          Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     Supabase anon key
NEXT_PUBLIC_APP_URL               https://fittrack.yourdomain.com
NEXT_PUBLIC_SENTRY_DSN            Sentry DSN (from sentry.io)
UPSTASH_REDIS_REST_URL            Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN          Upstash Redis token
```

**CI only (GitHub Actions secrets):**

```
VERCEL_TOKEN                      Vercel API token
SENTRY_AUTH_TOKEN                 Sentry source-map upload token
SENTRY_ORG                        Sentry org slug
SENTRY_PROJECT                    Sentry project slug
E2E_SUPABASE_URL                  Test Supabase project URL
E2E_SUPABASE_ANON_KEY             Test Supabase anon key
E2E_USER_EMAIL                    E2E test user email
E2E_USER_PASSWORD                 E2E test user password
```

---

## Database migrations

FitTrack uses Supabase migrations. Apply them in order, staging before production.

```bash
# Option 1 — Supabase CLI (recommended)
npx supabase link --project-ref <ref>
npx supabase db push

# Option 2 — SQL editor
# Paste supabase/migrations/NNN_*.sql into the Supabase SQL editor
# Run migrations in numeric order

# Verify
npx supabase db diff     # should show no diff if migrations are current
```

**Golden rule:** Never modify an existing migration file. Always create a new numbered file.

---

## Rollback strategy

### Vercel deployment rollback (fastest — seconds)

1. Go to Vercel dashboard → Deployments
2. Find the last known good deployment
3. Click "..." → "Promote to Production"

This rolls back the code instantly. The database is **not** rolled back.

### Database rollback

For reversible migrations, include a `-- rollback` comment with the inverse SQL:

```sql
-- migrate: add column
ALTER TABLE weight_entries ADD COLUMN source TEXT;

-- rollback: remove column
-- ALTER TABLE weight_entries DROP COLUMN source;
```

For destructive migrations (column drops, table drops), create a snapshot before applying:

```bash
# Before running a destructive migration
npx supabase db dump --data-only > backup-$(date +%Y%m%d).sql
```

### Full incident rollback

1. Roll back Vercel deployment (above)
2. If DB schema changed: apply the rollback SQL manually
3. Alert active users via email/status page if data may be affected
4. Post-mortem within 48h

---

## Backup strategy

### What Supabase backs up automatically

- Supabase Pro+ plans: daily automatic backups, 7-day retention
- Point-in-time recovery available on Enterprise

### Additional backup recommendations

- Export a full logical dump weekly using `pg_dump` via the Supabase connection string
- Store dumps in a separate cloud provider (not Supabase) for disaster recovery
- Test restore quarterly: spin up a new Supabase project and restore from backup

```bash
# Export (replace connection string with yours from Supabase dashboard)
pg_dump "postgresql://..." --no-owner --no-acl -f backup.sql

# Restore to test project
psql "postgresql://test-project..." < backup.sql
```

---

## Monitoring after deployment

After every production deployment, verify:

```bash
# 1. Health endpoint
curl https://fittrack.yourdomain.com/api/health

# Expected: { "status": "ok", "database": "connected" }

# 2. Auth flow
# Manually: go to /login, sign in, confirm dashboard loads

# 3. Sentry
# Check Sentry dashboard for new errors in the first 15 minutes
```

---

## Staging vs. production Supabase

Use **separate Supabase projects** for staging and production:

- Staging: `fittrack-staging` — seed with test data, run migrations here first
- Production: `fittrack-prod` — real user data, apply migrations after staging validation

Never point staging to the production database. Never point E2E tests to production.

---

## Performance monitoring

The app reports Web Vitals (LCP, CLS, INP, FCP, TTFB) to Sentry.

Acceptable thresholds:
| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP | < 2.5s | < 4.0s | ≥ 4.0s |
| CLS | < 0.1 | < 0.25 | ≥ 0.25 |
| INP | < 200ms | < 500ms | ≥ 500ms |

Check the Sentry Performance dashboard after major deployments and after traffic spikes.
