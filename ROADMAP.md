# Metablazt Roadmap (Phase Tracker)

_Last updated: 2025-09-29_

This document tracks progress across the phased rollout toward the Metablazt MVP.

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
- Maintain token parity once the shared `@metablazt/ui` package is spun up post-MVP.

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
- Expand explorer filters once Supabase-backed search is live.

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
- Local deck library sidebar plus catalog handoff into the builder shipped (2025-09-29).

**Next Up**
- Surface deck suggestions and card-recommendation hooks once personalization jobs land.
- Wire authenticated Supabase deck sync + conflict resolution UI polish.
- Add deck-to-cart manifest preview once Card Bazaar endpoint is live.

## Phase 3 - Trending Analytics & Personalization

**Status:** Complete

**Scope:** Supabase metrics rollups, trending APIs, and recommendation rails across the product surfaces.

**Completed**
- Trending data service and `/api/trending` expose Supabase metrics with job health metadata (2025-09-26).
- Homepage trending rail now consumes live metrics with status chips and refresh controls (2025-09-26).
- Deck builder recommendations panel calls `/api/recommendations`, logs telemetry, and supports add-to-deck actions (2025-09-26).
- Prisma migration `0002_phase3_trending` documented + applied, with client regeneration steps captured (2025-09-27).

**Next Up**
- Backfill Supabase cron automation and Metabase dashboards once deployed to Vercel.
- Add card-detail recommendation rail to round out Phase 3 once live data is seeded.

**Dependencies**
- Supabase cron jobs (`telemetry_rollup`, `trending_refresh`) remain healthy.
- Recommendation persistence schema migrations applied before enabling personalized seeds.

## Phase 4 - Deck Simulator & Autofill Prototype

**Status:** Complete

**Scope:** Goldfishing workspace, rule-based autofill, and Card Bazaar bridge polish before the AI handoff.

**Completed**
- Deck builder now links directly into the simulator workspace with branded CTA and K'rrik seed deck (2025-09-27).
- `useDeckSimulator` hook manages zones, mulligans, persistence, and telemetry (2025-09-27).
- Autofill prototype panel generates suggestions via `/api/autofill`, supports add/add-all flows, and emits telemetry (2025-09-27).
- Unit coverage for simulator + autofill logic in place (`use-deck-simulator.test.ts`, `autofill.test.ts`) (2025-09-27).

**Next Up**
- Upgrade simulator to handle sideboard/companion once multi-zone support is prioritized.

**Dependencies**
- Supabase card catalog plus trending seeds stay fresh for non-fallback suggestions.
- Additional telemetry coverage to train the ML-based autofill that replaces the prototype.

## Phase 5 - SSO, Advanced Recommendations & Privacy Controls

**Status:** Complete

**Scope:** Card Bazaar SSO bridge design, similarity-driven recommendations, privacy center UX, and supporting migrations/docs.

**Completed**
- Auth bridge spec + Supabase migrations for `linked_accounts`, `auth_bridge_sessions`, and audit logs (`docs/auth-bridge.md`, migration `0004`) (2025-09-28).
- Similarity/upgrade schemas (`0005_phase5_recommendations`) and recommendation service updates powering richer seeds (2025-09-28).
- Privacy center page with telemetry opt-out/export/delete actions and new `/api/privacy/*` stubs (`settings/privacy`) (2025-09-28).
- Telemetry pipeline expanded with auth/privacy events and stricter validation in `/api/telemetry` (2025-09-28).
- Documentation refresh across README, `docs/personalization-strategy.md`, and `docs/supabase-setup.md` to cover Phase 5 setup (2025-09-28).

**Next Up**
- Adopt a real OIDC provider for Card Bazaar, populate the `CARDBAZAAR_OIDC_*` secrets, and flip `NEXT_PUBLIC_SSO_ENABLED=true` so the bridge leaves demo mode.
- Build the personalized dashboard (saved decks, recent recommendations) leveraging new similarity tables.
- Prepare infrastructure migration from GitHub Pages to Vercel so dynamic APIs can go live.

**Dependencies**
- Card Bazaar OIDC client credentials and encryption keys stored in Supabase/Actions secrets.
- Supabase migrations `0004`–`0006` applied (`manual.sql` in each folder) followed by `prisma migrate resolve` on the project.

## Change Log

 - 2025-09-29: Deck library sidebar connected to catalog Add to deck flow, with automatic deck selection when arriving from cards.
 - 2025-09-29: Catalog filters now stream top-100 high-res staples per format/color/type, card detail pages fetch client-side on GitHub Pages, and hover overlays add deckbuilder CTAs.
- 2025-09-28: Phase 5 SSO bridge docs, similarity migrations, privacy center, and telemetry updates shipped.
- 2025-09-28: Deck builder seeded with K'rrik commander list, simulator CTA polished, and Phase 4 UI updates deployed.
- 2025-09-27: Prisma migration 0002 marked applied; trending/recommendation services integrated with Supabase fallback logic.
- 2025-09-26: Homepage trending rail renders Supabase metrics with status chips and refresh controls.
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

## Post-Phase 5 Backlog\n\n- Adopt a production OIDC provider for Card Bazaar and supply the CARDBAZAAR_OIDC_* secrets so the bridge leaves demo mode.\n- Move the app off GitHub Pages to a server environment (e.g., Vercel) so /api/* routes run with Supabase credentials.\n- Build the personalized dashboard experience backed by live recommendation metrics and Supabase-authenticated sessions.\n- Stand up operational jobs (token encryption edge functions, cron monitors) once the server deployment is live.\n\n

