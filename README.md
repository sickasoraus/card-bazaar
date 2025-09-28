# metablazt

Magic the Gathering Card Database and deck builder.

## Project Structure

- `/web` – Next.js App Router frontend (TypeScript, Tailwind, Prisma-ready) configured for static export.
- `/docs` – architecture references and deployment guides (`schema-and-events.md`, `design-tokens.md`, `supabase-setup.md`, `trending-analytics.md`, `personalization-strategy.md`).

## Getting Started

```bash
cd web
npm install
npm run dev
```

The card explorer hits live Scryfall search; use the preset chips or filter controls to see the integration in action. Telemetry emits to the console when `NEXT_PUBLIC_TELEMETRY_DEBUG=true`.

## Static Export Preview

```bash
cd web
npm run build
# Static output available in web/out for GitHub Pages deployment
```

## Supabase + Prisma

1. Copy `web/.env.example` to `.env.local` and fill in `DATABASE_URL` from Supabase.
2. Apply the initial schema:
   ```bash
   cd web
   npx prisma migrate deploy
   ```
3. Generate the Prisma client when ready for server usage:
   ```bash
   npm run prisma:generate
   ```

See `docs/supabase-setup.md` for the full walkthrough (Phase 5 adds steps for migrations `0004`–`0006`, PKCE secrets, and privacy workflows).

## Current Highlights

**Phase 4 – Simulator & Autofill**
- Deck builder import workspace supports quantity/name text, MTG Arena `.txt`, and CSV lists with automatic Scryfall resolution.
- Goldfish simulator (`/deckbuilder/simulator`) runs mulligans/draws with telemetry and persists state locally.
- Rule-based autofill suggestions hit `/api/autofill`, with add-to-deck + Card Bazaar bridge actions and coverage in vitest.

**Phase 5 – SSO & Privacy Readiness**
- Auth bridge plan documented in `docs/auth-bridge.md`, with PKCE helpers, stubbed API routes, and telemetry instrumentation.
- Similarity + upgrade tables wired into `/api/recommendations` so richer seeds are ready once cron jobs feed Supabase.
- Privacy center (`/settings/privacy`) lets users opt out of telemetry or queue export/deletion requests; APIs persist to `privacy_requests` when Supabase is available.

Refer to `ROADMAP.md` for the latest milestone status.

## Card Bazaar SSO (Phase 5 Preview)

- Populate the Card Bazaar credentials in `web/.env.local` (`CARDBAZAAR_OIDC_*`, `NEXT_PUBLIC_SSO_CLIENT_ID`, `NEXT_PUBLIC_CARDBAZAAR_ORIGIN`).
- `POST /api/auth/link` returns the authorize URL + PKCE verifier; pair it with `logAuthLink` helpers in `@/services/auth-bridge` to emit telemetry.
- `GET /api/auth/status` responds with the current bridge state (stubbed until Supabase policies are live).
- See `docs/auth-bridge.md` for the architecture diagram, security constraints, and open TODOs before launch.

## Privacy Controls (Phase 5 Preview)

- `/settings/privacy` surfaces telemetry toggles, export, and deletion requests. API handlers queue requests in `privacy_requests` when Supabase is available and fall back to static messaging on GitHub Pages.
