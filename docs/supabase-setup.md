# Supabase Setup Guide (Phase 1)

This walkthrough gets a Supabase Postgres instance ready for Metablazt.

## 1. Create the project
- Sign in at [https://app.supabase.com](https://app.supabase.com) and create a new project.
- Choose the organization, project name, and region closest to your users.
- Copy the generated **Session Pooler** connection string (URI tab ? Session Pooler). We use the pooler because Prisma Client runs over IPv4 by default.
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

1. Open Supabase ? **SQL Editor** ? new query.
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
## 4. Using Prisma in the app
- Import the shared client from `src/lib/prisma.ts` inside API routes or server actions.
- Prisma Client will reuse the Session Pooler connection defined in `DATABASE_URL`.

### Need direct migrations later?
If you want Prisma to execute migrations automatically, either tunnel with the [Supabase CLI](https://supabase.com/docs/guides/cli/local-development#database-connect) or run from an environment with IPv6 access to the “Direct Connection” endpoint, then switch the URL back to the pooler for normal usage.

## 5. Telemetry endpoint
- The client helpers post to `/api/telemetry`. When `NEXT_PUBLIC_TELEMETRY_DEBUG=true`, data stays in the console; set it to `false` to forward events to Supabase (`event_log` table).

## 6. CI/CD reminders
- Add `DATABASE_URL` as a secret in GitHub (`Settings ? Secrets and variables ? Actions`).
- Update deployment workflows (Vercel or GitHub Actions) to export the secret before running Prisma commands.

With this setup, later phases can persist decks, telemetry, and ingested card data directly into Supabase.





