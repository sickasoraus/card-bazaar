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

**Status:** Not started

**Scope:** client-side Scryfall integration, card explorer page, deck data scaffolding, migrations ready for Supabase.

**Next Up**
1. Create Scryfall data access module with caching and rate-limit guards.
2. Implement card grid + search UI consuming live Scryfall responses.
3. Stub advanced filter controls (format, color identity, mana value) with placeholder state.
4. Author Prisma schema and generate migration SQL aligned with `docs/schema-and-events.md`.
5. Establish telemetry event contracts for `search_performed`, `card_viewed`, and `deck_card_added` in the codebase.

**Dependencies**
- Phase 0 Next.js shell ready for feature integration.
- Environment configuration strategy for runtime API keys (if any) while staying Pages-compatible.

## Change Log

- 2025-09-24: GitHub Pages base path configuration added to Next.js export to fix static styling.

- 2025-09-23: Initial roadmap drafted; schema & event taxonomy documented.
- 2025-09-23: Design tokens locked in for Phase 0 foundation.
- 2025-09-24: Next.js App Router scaffold added under `/web` with static export config.
- 2025-09-24: Base navigation/hero/card grid frame shipped for Phase 0 UI shell.
- 2025-09-24: GitHub Pages workflow added for automated static deployments.
