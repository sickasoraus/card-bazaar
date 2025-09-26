# Supabase Schema & Event Taxonomy (Phase 0–2)

## Core Tables

- `users`: `id UUID PK`, `email text unique`, `handle text unique`, `avatar_url text`, `marketing_opt_out boolean default false`, `default_format text`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- `profiles`: `user_id UUID PK references users`, `display_name text`, `bio text`, `preferred_tags text[]`, `power_level_pref text`, `shared_card_bazaar_id text`, `updated_at timestamptz default now()`
- `cards`: `id UUID PK`, `scryfall_id text unique`, `oracle_id text`, `name text`, `set_code text`, `rarity text`, `mana_cost text`, `cmc numeric`, `color_identity text[]`, `type_line text`, `oracle_text text`, `image_uris jsonb`, `legality jsonb`, `is_token boolean default false`, `created_at timestamptz default now()`
- `printings`: `id UUID PK`, `card_id UUID references cards`, `set_code text`, `collector_number text`, `frame text`, `promo_types text[]`, `finishes text[]`, `released_at date`, `stock_status text`, `card_bazaar_sku text`, `created_at timestamptz default now()`
- `prices`: `id UUID PK`, `printing_id UUID references printings`, `source text check (source in ('scryfall','mtggoldfish'))`, `currency text default 'USD'`, `retail numeric`, `buylist numeric`, `foil_retail numeric`, `foil_buylist numeric`, `sampled_at timestamptz`
- `card_tags`: `id UUID PK`, `card_id UUID references cards`, `tag_slug text`, `tag_label text`, `tag_source text check (tag_source in ('editorial','inferred'))`, `assigned_by UUID references users`, `assigned_at timestamptz default now()`
- `decks`: `id UUID PK`, `user_id UUID references users`, `name text`, `format text`, `power_tier text check (power_tier in ('casual','mid','competitive','cedh'))`, `description text`, `visibility text check (visibility in ('private','unlisted','public')) default 'private'`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- `deck_cards`: `deck_id UUID references decks`, `printing_id UUID references printings`, `quantity integer`, `zone text check (zone in ('mainboard','sideboard','maybeboard','commander'))`, `primary key(deck_id, printing_id, zone)`
- `imports`: `id UUID PK`, `user_id UUID references users`, `source text check (source in ('csv','mtg_arena_txt','text_list'))`, `raw_payload text`, `normalized jsonb`, `status text check (status in ('pending','processed','failed'))`, `processed_at timestamptz`, `created_at timestamptz default now()`
- `event_log`: `id UUID PK`, `user_id UUID references users`, `session_id uuid`, `event_type text`, `subject_type text`, `subject_id uuid`, `context jsonb`, `value_numeric numeric`, `value_text text`, `occurred_at timestamptz default now()`
- `trending_snapshots`: `id UUID PK`, `scope text check (scope in ('card','deck'))`, `subject_id uuid`, `period text check (period in ('daily','weekly'))`, `trend_score numeric`, `components jsonb`, `calculated_at timestamptz default now()`
- `recommendations`: `id UUID PK`, `user_id UUID references users`, `recommendation_type text check (recommendation_type in ('related_card','upgrade_suggestion','trending_pick'))`, `payload jsonb`, `generated_at timestamptz default now()`, `expires_at timestamptz`
- `ingestion_job_runs`: `id UUID PK`, `job_type public.IngestionJobType`, `status public.JobStatus`, `started_at timestamptz default now()`, `completed_at timestamptz`, `error_message text`, `metadata jsonb`.
- `card_daily_metrics`: `id UUID PK`, `card_id UUID references cards`, `metric_date date`, `views integer default 0`, `unique_users integer default 0`, `deck_inclusions integer default 0`, `price_avg numeric(12,4)`, `price_change numeric(12,4)`, `created_at timestamptz default now()`.
- `deck_daily_metrics`: `id UUID PK`, `deck_id UUID references decks`, `metric_date date`, `views integer default 0`, `unique_users integer default 0`, `imports integer default 0`, `exports integer default 0`, `bridge_requests integer default 0`, `win_rate numeric(5,2)`, `created_at timestamptz default now()`.

## Event Taxonomy (Phase 1+ focus)

- `search_performed`: context captures `query`, `filters`, `results_count`.
- `card_viewed`: subject is card/printing; context includes `page`, `position`, `source` (e.g., trending, search).
- `deck_viewed`: subject deck; context includes `source`, `format`, `card_count`, and normalized `source_category`.
- `deck_card_added`: subject deck; context includes `card_id`, `zone`, `method` (manual, suggestion, import, import_unresolved) so unresolved imports are traceable.
- `deck_created`: subject deck; context includes `format`, `seed` (blank, template, import).
- `deck_imported`: subject deck; context includes `source`, `card_count`, `matched_count`, `missing_count`.
- `import_attempted`: subject import; context includes `source`, `status`, `error_code`, plus `card_count`, `matched_count`, `missing_count`, `merged_count` for import quality metrics.
- `export_completed`: subject deck; context includes `export_format`, `cards_missing`, `destination` (local download, card bazaar bridge, etc.).
- `bridge_initiated`: subject `scope` (card/deck); context captures `destination`, `missing_count`, `bridge_id`, and any local subject reference.
- `recommendation_served`: subject recommendation; context includes `surface`, `algorithm`, `impression_count`, and optional `recommendation_id`.
- `simulator_started`: future-proof flag for Phase 3+, but log structure ready with `starting_hand` sample toggle.

## Notes

- All tables expect row-level security with context-aware policies before exposing to clients.
- Prisma schema should mirror these definitions with enums for constrained fields.
- Phase 1/2 use `cards`, `printings`, `prices`, `card_tags`, `decks`, `deck_cards`, `event_log`; later tables are ready for incremental rollout.
- Deck draft persistence approach is detailed in `docs/deck-draft-persistence.md`.
- Supabase cron jobs should log executions to `ingestion_job_runs` (scryfall_bulk, price_snapshot, telemetry_rollup, trending_refresh) so analytics can monitor latency/error rates.

## API Stubs (Phase 2)

- `GET /api/decks`: Optional query params `userId`, `visibility`, `format`, `limit` (defaults to 12, max 50). Returns deck metadata plus card counts for builder list views.
- `POST /api/decks`: Accepts `name`, `format`, optional `description`, `visibility`, `powerTier`, `userId`. Persists a deck shell and returns the created record; cards are synced separately.
- `PUT /api/decks/cards`: Accepts deck metadata plus `{ printingId, quantity, zone }[]` to upsert deck cards during Supabase sync.
- `POST /api/cart-bridge`: Accepts either `{ type: "card", cardId, name, setCode?, setName?, price? }` or deck manifests `{ type: "deck", deckId, name, format, totalCards, distinctCards, items[], missing[] }` to queue Card Bazaar bridge placeholders until the live integration is enabled. Returns `bridgeId`, user message, optional `summary`, and a `missing` array for unresolved cards.
- `GET /api/trending`: Returns current trending cards/decks using `trending_snapshots`, optionally filtered by `scope`, `period`, or `format` query params.

## Telemetry Helpers (Phase 2)

- `trackDeckCreated({ deckId, format, visibility, seed, source })` – call when a new deck shell is created so lifecycle analytics stay accurate.
- `trackDeckViewed({ deckId, source, format, cardCount })` – log when a draft loads so daily engagement metrics stay accurate.
- `trackDeckImported({ deckId, source, cardCount, matchedCount, missingCount })` – fires after successful list imports to correlate telemetry with ingestion quality.
- `trackImportAttempted({ importId, source, status, errorCode, cardCount, matchedCount, missingCount, mergedCount })` – emit before/after CSV or Arena imports to monitor success vs. failure and how many cards still need manual mapping.
- `trackExportCompleted({ deckId, exportFormat, cardsMissing, destination })` – record when a cart/export hand-off finishes for downstream commerce analytics (local downloads, Card Bazaar bridge, etc.).
- `trackBridgeInitiated({ scope, subjectId, destination, missingCount, bridgeId })` – log bridge placeholders so we can measure deck-to-commerce funnels.
- `trackRecommendationServed({ recommendationId, surface, algorithm, impressionCount })` – instrumentation for personalization rails once they ship.
- `trackDeckCardAdded({ deckId, cardId, zone, method })` – method now includes `import_unresolved` when the card could not be matched to a Scryfall ID.
- Existing helpers (`trackSearchPerformed`, `trackCardViewed`) stay unchanged.
