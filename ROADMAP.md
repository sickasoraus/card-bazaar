# Metablazt Roadmap (Phase Tracker)

_Last updated: 2025-09-26_

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
- Rolling into Phase 3 (trending analytics + personalization rails).

**Dependencies**
- Supabase database provisioned with env secrets before Prisma client is enabled.
- API rate-limiting plan for Scryfall once filters are live to avoid throttling.


## Phase 1 - Card Explorer & Data Hooks

**Status:** Complete

**Scope:** client-side Scryfall integration, card explorer page, deck data scaffolding, migrations ready for Supabase.

**Completed**
- Client-side Scryfall data service with in-memory caching implemented (`src/services/scryfall.ts`) (2025-09-24)
- Card explorer wired to live Scryfall search with pagination + loading states (2025-09-24)
- Filter controls (format, color identity, mana value) scaffolded with state ready for query wiring (2025-09-24)
- Prisma schema and initial migration SQL drafted under `web/prisma` (2025-09-24)
- Telemetry helper stubs for Phase 1 events added (`src/lib/telemetry.ts`) (2025-09-24)
- Deck API route stubbed with Prisma-backed GET/POST endpoints for future builder integration (`src/app/api/decks/route.ts`) (2025-09-25)
- Deck draft persistence strategy documented (`docs/deck-draft-persistence.md`) (2025-09-25)
- Filter state wired into Scryfall query builder with preset chips and filter summary UI (2025-09-25)
- Search telemetry now emits filter metadata alongside pagination events (2025-09-25)
- Deck builder integrates Supabase deck sync with recent draft picker and cloud/local instrumentation (2025-09-25)

**Next Up**
- Rolling into Phase 3 (trending analytics + personalization rails).

**Dependencies**
- Supabase database provisioned with env secrets before Prisma client is enabled.
- API rate-limiting plan for Scryfall once filters are live to avoid throttling.

## Phase 2 - Deck Builder & Cart Bridge

**Status:** Complete

**Scope:** robust deck import/export support, deck builder UX polish, and Card Bazaar bridge placeholders ready for integration.

**Completed**
- Multi-format deck import pipeline (text, MTG Arena `.txt`, CSV) with Scryfall resolution, unresolved tracking, and telemetry metrics.
- Deck builder UI refresh with import workspace, zone/resolution indicators, and export options (JSON, MTG Arena text, CSV).
- Card Bazaar bridge payload helper + `/api/cart-bridge` stub for both single-card and deck manifests.

**Next Up**
- Surface deck suggestions and card-recommendation hooks once personalization jobs land.
- Wire authenticated Supabase deck sync + conflict resolution UI polish.
- Add deck-to-cart manifest preview once Card Bazaar endpoint is live.

## Phase 3 - Trending Analytics & Personalization

**Status:** In Progress

**Scope:** Supabase metrics rollups, trending APIs, and recommendation rails across the product surfaces.

**Completed**
- Trending data service and /api/trending expose Supabase metrics with job health metadata (2025-09-26).
- Homepage trending rail now consumes live metrics with status chips and refresh controls (2025-09-26).
- Deck builder recommendations panel calls /api/recommendations, logs telemetry, and supports add-to-deck actions (2025-09-26).

**Next Up**
- Implement recommendation rail on /cards/[cardId] with bridge/add-to-deck actions.
- Finalize cron automation runbooks and Supabase monitoring dashboards.
- Persist personalized seeds in recommendations for authenticated users.

**Dependencies**
- Supabase cron jobs (telemetry_rollup, trending_refresh) remain healthy.
- Recommendation persistence schema migrations applied before enabling personalized seeds.
## Phase 4 - Deck Simulator & Autofill Prototype

**Status:** Complete

**Scope:** Goldfishing workspace, rule-based autofill, and Card Bazaar bridge polish before the AI handoff.

**Completed**
- Deck builder now links directly into the simulator workspace with a branded CTA.
- Autofill prototype panel generates suggestions via `/api/autofill`, supports add/add-all flows, and emits telemetry.

**Next Up**
- Kick off Phase 5 (SSO + advanced recommendations) planning.

**Dependencies**
- Supabase card catalog plus trending seeds stay fresh for non-fallback suggestions.
- Additional telemetry coverage to train the ML-based autofill that replaces the prototype.

## Change Log

- 2025-09-28: Deck builder autofill panel and simulator CTA shipped.
- 2025-09-26: Homepage trending rail now renders Supabase metrics with status chips and refresh controls.
- 2025-09-26: Deck builder recommendations panel wired to `/api/recommendations` with add-to-deck telemetry.
- 2025-09-26: Deck builder import/export pipeline, zone awareness, and Card Bazaar bridge preview shipped.
- 2025-09-25: Card explorer filters now drive Scryfall queries with summary UI and telemetry metadata.
- 2025-09-25: Deck builder Supabase sync plus recent draft picker shipped.
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






