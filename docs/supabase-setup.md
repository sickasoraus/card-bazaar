# Supabase Setup Guide (Phase 1)

This walkthrough gets a Supabase Postgres instance ready for Metablazt.

## 1. Create the project
- Sign in at [https://app.supabase.com](https://app.supabase.com) and create a new project.
- Choose the organization, project name, and region closest to your users.
- Copy the generated **Session Pooler** connection string (URI tab -> Session Pooler). We use the pooler because Prisma Client runs over IPv4 by default.
  - Example: `postgresql://postgres:<password>@aws-1-us-west-1.pooler.supabase.com:5432/postgres`

## 2. Configure environment variables
Inside `web/`:

1. Duplicate `.env.example` to `.env.local` (or `.env` if you prefer a single file).
2. Replace `DATABASE_URL` with the Session Pooler URI and append Prisma-friendly flags:
   ```
   postgresql://postgres:<password>@aws-1-us-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1&connect_timeout=10
   ```
3. Set `NEXT_PUBLIC_TELEMETRY_DEBUG=false` in production (leave `true` locally if you want console-only telemetry during development).

## 3. Apply the initial schema
Prisma Migrate cannot run directly through the pooler, so apply the schema once via SQL and then mark it as applied locally.

1. Open Supabase -> **SQL Editor** -> new query.
2. Paste the contents of `web/prisma/migrations/0001_initial/manual.sql` and run it.
3. Back on your machine:
   ```bash
   cd web
   npx prisma migrate resolve --applied 0001_initial
   npm run prisma:generate
   ```

## 3b. Apply Phase 3 trending scaffolding (optional until Phase 3)
- In Supabase SQL editor run `web/prisma/migrations/0002_phase3_trending/manual.sql` to create the job log and daily metric tables.
- Locally, mark the migration as applied so Prisma stays in sync:
  ```bash
  cd web
  npx prisma migrate resolve --applied 0002_phase3_trending
  ```
- If Prisma returns P3008 (already applied), the migration is already recorded in Supabase and you can skip straight to Prisma client generation.
- Regenerate the client after schema changes:
  ```bash
  npm run prisma:generate
  ```

## 3c. Add trending snapshot unique index (Phase 3)
- Run `web/prisma/migrations/0003_trending_snapshot_unique/migration.sql` in the Supabase SQL editor (or execute it locally with `npx prisma db execute --file prisma/migrations/0003_trending_snapshot_unique/migration.sql`). This deduplicates existing rows and enforces uniqueness on `(scope, subject_id, period)` so upserts work reliably.
- Mark the migration as applied locally so Prisma stays in sync:
  ```bash
  cd web
  npx prisma migrate resolve --applied 0003_trending_snapshot_unique
  npm run prisma:generate
  ```

## 3d. Enable auth bridge tables (Phase 5)
- Run `web/prisma/migrations/0004_phase5_auth_bridge/migration.sql` in the Supabase SQL editor to create `linked_accounts`, `auth_bridge_sessions`, and `auth_audit_events`.
- Execute `web/prisma/migrations/0004_phase5_auth_bridge/manual.sql` to add partial unique indexes for nullable session identifiers.
- Mark the migration as applied locally and regenerate Prisma:
  ```bash
  cd web
  npx prisma migrate resolve --applied 0004_phase5_auth_bridge
  npm run prisma:generate
  ```
- Add a Supabase secret `card_bazaar_oauth_secret` (or similar) so edge functions can exchange tokens without embedding credentials in the client.

## 3e. Advanced recommendation tables (Phase 5)
- Run `web/prisma/migrations/0005_phase5_recommendations/migration.sql` in the Supabase SQL editor to build similarity, deck upgrade, and user affinity tables.
- No manual post-step required, but keep an eye on index build times if the tables grow large.
- Locally, mark the migration as applied and regenerate Prisma:
  ```bash
  cd web
  npx prisma migrate resolve --applied 0005_phase5_recommendations
  npm run prisma:generate
  ```

## 3f. Privacy request logging (Phase 5)
- Run `web/prisma/migrations/0006_phase5_privacy_controls/migration.sql` in Supabase to create `privacy_requests`.
- Resolve the migration locally and regenerate Prisma:
  ```bash
  cd web
  npx prisma migrate resolve --applied 0006_phase5_privacy_controls
  npm run prisma:generate
  ```

## 4. Using Prisma in the app
- Import the shared client from `src/lib/prisma.ts` inside API routes or server actions.
- Prisma Client will reuse the Session Pooler connection defined in `DATABASE_URL`.

## 5. Telemetry endpoint
- The client helpers post to `/api/telemetry`. When `NEXT_PUBLIC_TELEMETRY_DEBUG=true`, data stays in the console; set it to `false` to forward events to Supabase (`event_log` table).

## 6. CI/CD reminders
- Add `DATABASE_URL` as a secret in GitHub (`Settings -> Secrets and variables -> Actions`).
- Update deployment workflows (Vercel or GitHub Actions) to export the secret before running Prisma commands.

## 7. Ingestion helpers
- `npm run jobs:telemetry` rolls up `event_log` into `card_daily_metrics` and `deck_daily_metrics` for the current day window.
- `npm run jobs:trending` recomputes `trending_snapshots` using the latest daily metrics.
- `npm run jobs:seed` primes Supabase with a sample card/deck and baseline metrics so UI rails show live data before real cron jobs run.

### Need direct migrations later?
If you want Prisma to execute migrations automatically, either tunnel with the [Supabase CLI](https://supabase.com/docs/guides/cli/local-development#database-connect) or run from an environment with IPv6 access to the "Direct Connection" endpoint, then switch the URL back to the pooler for normal usage.

With this setup, later phases can persist decks, telemetry, and ingested card data directly into Supabase.