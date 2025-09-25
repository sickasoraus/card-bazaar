# metablazt

Magic the Gathering Card Database and deck builder.

## Project Structure

- `/web` – Next.js App Router frontend (TypeScript, Tailwind, Prisma-ready) configured for static export.
- `/docs` – architecture references and deployment guides (`schema-and-events.md`, `design-tokens.md`, `supabase-setup.md`).

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

See `docs/supabase-setup.md` for the full walkthrough.

Refer to `ROADMAP.md` for current Phase 1 milestones.
