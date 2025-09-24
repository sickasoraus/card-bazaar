# Metablazt Roadmap (Phase Tracker)

_Last updated: 2025-09-24_

This document tracks feature delivery for Phases 0 and 1 as we work toward the GitHub Pages milestone.

## Phase 0 - Foundation & Branding

**Status:** Complete

**Scope:** design tokens, shared UI kit scaffolding, static Next.js shell, GitHub Pages deployment pipeline.

**Completed**
- Architecture stack alignment captured in project plan (2025-09-23)
- Supabase schema and event taxonomy documented in `docs/schema-and-events.md` (2025-09-23)
- Design tokens established in `docs/design-tokens.md` (2025-09-23)
- Next.js static-export scaffold created under `/web` with build verification (2025-09-24)
- Base navigation, hero, and card grid frame implemented using design tokens (2025-09-24)
- GitHub Pages workflow configured for automated static deploys (2025-09-24)

**Next Up**
- Roll forward into Phase 1 feature delivery.

**Risks & Watchouts**
- Static export must avoid Supabase dependencies until backend available.
- Branding assets need placeholder logo/art until design handoff.

## Phase 1 - Card Explorer & Data Hooks

**Status:** In progress

**Scope:** client-side Scryfall integration, card explorer page, deck data scaffolding, migrations ready for Supabase.

**Completed**
- Client-side Scryfall data service with in-memory caching implemented (src/services/scryfall.ts) (2025-09-24)
- Card explorer wired to live Scryfall search with pagination + loading states (2025-09-24)
- Filter controls (format, color identity, mana value) scaffolded with state ready for query wiring (2025-09-24)
- Prisma schema and initial migration SQL drafted under web/prisma (2025-09-24)
- Telemetry helper stubs for Phase 1 events added (src/lib/telemetry.ts) (2025-09-24)

**Next Up**
1. Connect filter state to the Scryfall query builder and expose preset shortcuts.
2. Integrate telemetry helpers into card search/results interactions.
3. Stand up Supabase project and apply initial migration; wire Prisma client usage in Next.js API routes.
4. Define persistence strategy for deck drafts (local storage vs Supabase) ahead of builder work.

**Dependencies**
- Supabase database provisioned with env secrets before Prisma client is enabled.
- API rate-limiting plan for Scryfall once filters are live to avoid throttling.

## Change Log

- 2025-09-24: Card explorer now consumes live Scryfall search with pagination and loading states.
- 2025-09-24: Filter controls (format/color identity/mana) scaffolded for future query wiring.
- 2025-09-24: Prisma schema + initial migration and telemetry stubs added for Supabase integration.
- 2025-09-24: Scryfall client-side data service with caching added for Phase 1 groundwork.
- 2025-09-24: GitHub Pages base path configuration added to Next.js export to fix static styling.
- 2025-09-23: Initial roadmap drafted; schema & event taxonomy documented.
- 2025-09-23: Design tokens locked in for Phase 0 foundation.
- 2025-09-24: Next.js App Router scaffold added under `/web` with static export config.
- 2025-09-24: Base navigation/hero/card grid frame shipped for Phase 0 UI shell.
- 2025-09-24: GitHub Pages workflow added for automated static deployments.
