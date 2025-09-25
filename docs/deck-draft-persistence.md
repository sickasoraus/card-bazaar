# Deck Draft Persistence Strategy (Phase 1)

_Last updated: 2025-09-25_

This document captures how Metablazt will persist in-progress deck builds across anonymous and authenticated sessions during Phase 1. The goal is to provide a smooth builder experience tonight on GitHub Pages while preparing the hand-off to Supabase once user accounts go live.

## Guiding Principles

- **Zero-friction drafting:** Users should be able to experiment with a deck without signing in. All interactions feel instant and resilient to page reloads.
- **Progress follows you:** When a user signs in (later phase), their drafts move to Supabase automatically so they can resume on any device.
- **Single source of truth per state:** While drafting anonymously we rely on local storage; once persisted to Supabase, the hosted record becomes authoritative and the local cache becomes a sync buffer.
- **Telemetry ready:** Every save, restore, and conflict state is observable through the event_log table to inform future tuning.

## Data Model Overview

`
type DraftDeck = {
  id: string;              // UUID generated client-side
  remoteId?: string | null;
  name: string;
  format: string;          // e.g. commander, modern
  powerTier?: "casual" | "mid" | "competitive" | "cedh";
  description?: string;
  cards: Array<{
    printingId: string;    // maps to Supabase printings.id
    quantity: number;
    zone: "mainboard" | "sideboard" | "maybeboard" | "commander";
  }>;
  lastUpdated: string;     // ISO timestamp for conflict resolution
  lastSyncedAt?: string | null;
  source: "local" | "supabase";
};
`

Supabase mirrors the Deck/DeckCard models defined in web/prisma/schema.prisma, providing the long-term storage for authenticated users.

## Phase 1 Storage Layers

| Context | Storage | Notes |
| --- | --- | --- |
| Anonymous visitor (default tonight) | localStorage key metablazt:draft:<uuid> | Stores serialized DraftDeck. Cleaned up via lastUpdated TTL (7 days). |
| Authenticated user (once Supabase auth lands) | Supabase decks + deck_cards | POST /api/decks seeds the shell; follow-up PUT /api/decks/cards?deckId=<id> will sync card list. |
| Hybrid (offline or network error) | Local cache flagged source="supabase" + syncPending=true | Allows temporary edits even when Supabase fails. Background sync retries when telemetry reports success. |

## Client Workflow (Phase 1)

1. **Draft bootstrap**
   - On builder mount, check URL param/deep link for a deckId.
   - If none, look for metablazt:draft:latest pointer; load associated draft.
   - If still empty, create a new DraftDeck with source="local".
2. **Change handling**
   - Mutations update state in memory, then debounce-write to localStorage.
   - Emit telemetry via `trackDeckCardAdded` and `trackDeckCreated` so analytics capture anonymous vs. signed-in sources.
3. **Manual saves**
   - Provide “Save copy” action to export JSON/CSV for now (no auth required).
   - When Supabase env vars exist, the builder shows a “Save to Supabase” action that POSTs /api/decks then PUTs /api/decks/cards?deckId=<uuid> to store the draft metadata.
4. **Supabase sync (future)**
   - When user signs in, call POST /api/decks with metadata. Capture returned id.
   - Upsert card list via pending cards endpoint (coming in Phase 1). Mark local cache source="supabase" and store Supabase id.
   - Subsequent edits call Supabase first; local storage mirrors the latest server state for offline resilience.
5. **Conflict resolution**
   - Compare lastUpdated timestamps. If local is newer than Supabase on load, prompt user to merge or overwrite.
6. **Draft picker UI**
   - The deck builder sidebar lists recent drafts (local and Supabase-backed) so users can resume or remove them quickly.

## API Touchpoints

- GET /api/decks?userId=… – list decks once a user is logged in; builder can offer “resume draft” selection.
- POST /api/decks – already live; seeds metadata and returns Supabase id.
- PUT /api/decks/cards?deckId=<uuid> – now syncs deck_cards rows (Phase 1 implementation live).
- POST /api/telemetry – capture lifecycle events (deck_created, deck_card_added, future deck_saved).

## Local Storage Schema

- metablazt:draft:index – array of { id, name, format, lastUpdated, source } for lightweight dashboard rendering.
- metablazt:draft:<id> – full DraftDeck payload.
- metablazt:draft:latest – simple string pointer to last active draft.

A nightly cleanup job (browser-side) removes drafts older than 7 days unless flagged source="supabase".

## Security & Privacy Considerations

- Local storage never includes Supabase tokens or user emails.
- When copying to Supabase, enforce ownership via RLS: user_id = auth.uid().
- Telemetry events avoid sending full deck lists; only aggregate info (card_count, format, changes).

## Open Questions

1. How should imports from MTG Arena/CSV coexist with autosaved drafts? (Proposal: treat as new draft with link to import source.)
2. What is the retention policy for Supabase drafts without activity? (Likely 30 days before archival.)
3. Do we allow multiple concurrent drafts per user in Phase 1? (Default yes; index view filters by updated_at.)

## Next Actions

- Implement local storage utilities in the deck builder hook.
- Ensure PUT /api/decks/cards?deckId=<uuid> stays aligned with deck_cards upsert helper.
- Wire telemetry for draft save/restore flows once deck builder UI lands.


