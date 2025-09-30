# Supabase Schema & Event Taxonomy (Phase 0-5)

## Core Tables

- `users`: `id UUID PK`, `email text unique`, `handle text unique`, `avatar_url text`, `marketing_opt_out boolean default false`, `default_format text`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- `profiles`: `user_id UUID PK references users`, `display_name text`, `bio text`, `preferred_tags text[]`, `power_level_pref text`, `shared_card_bazaar_id text`, `updated_at timestamptz default now()`
- `cards`: `id UUID PK`, `scryfall_id text unique`, `oracle_id text`, `name text`, `set_code text`, `rarity text`, `mana_cost text`, `cmc numeric`, `color_identity text[]`, `type_line text`, `oracle_text text`, `image_uris jsonb`, `legality jsonb`, `is_token boolean default false`, `created_at timestamptz default now()`
- `printings`: `id UUID PK`, `card_id UUID references cards`, `set_code text`, `collector_number text`, `frame text`, `promo_types text[]`, `finishes text[]`, `released_at date`, `stock_status text`, `card_bazaar_sku text`, `created_at timestamptz default now()`
- `prices`: `id UUID PK`, `printing_id UUID references printings`, `source text check (source in ('scryfall','mtggoldfish'))`, `currency text default 'USD'`, `retail numeric`, `buylist numeric`, `foil_retail numeric`, `foil_buylist numeric`, `sampled_at timestamptz`
- `card_tags`: `id UUID PK`, `card_id UUID references cards`, `tag_slug text`, `tag_label text`, `tag_source text check (tag_source in ('editorial','inferred'))`, `assigned_by UUID references users`, `assigned_at timestamptz default now()`
- `card_format_legalities`: `card_id UUID references cards`, `format text`, `status text`, `updated_at timestamptz default now()`, primary key `(card_id, format)` with index on `(format, status)`
- `decks`: `id UUID PK`, `user_id UUID references users`, `name text`, `format text`, `power_tier text check (power_tier in ('casual','mid','competitive','cedh'))`, `description text`, `visibility text check (visibility in ('private','unlisted','public')) default 'private'`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- `deck_cards`: `deck_id UUID references decks`, `printing_id UUID references printings`, `quantity integer`, `zone text check (zone in ('mainboard','sideboard','maybeboard','commander'))`, `primary key(deck_id, printing_id, zone)`
- `imports`: `id UUID PK`, `user_id UUID references users`, `source text check (source in ('csv','mtg_arena_txt','text_list'))`, `raw_payload text`, `normalized jsonb`, `status text check (status in ('pending','processed','failed'))`, `processed_at timestamptz`, `created_at timestamptz default now()`
- `event_log`: `id UUID PK`, `user_id UUID references users`, `session_id uuid`, `event_type text`, `subject_type text`, `subject_id uuid`, `context jsonb`, `value_numeric numeric`, `value_text text`, `occurred_at timestamptz default now()`
- `trending_snapshots`: `id UUID PK`, `scope text check (scope in ('card','deck'))`, `subject_id uuid`, `period text check (period in ('daily','weekly'))`, `trend_score numeric`, `components jsonb`, `calculated_at timestamptz default now()`
- `recommendations`: `id UUID PK`, `user_id UUID references users`, `recommendation_type text check (recommendation_type in ('related_card','upgrade_suggestion','trending_pick'))`, `payload jsonb`, `generated_at timestamptz default now()`, `expires_at timestamptz`
- `ingestion_job_runs`: `id UUID PK`, `job_type public.IngestionJobType`, `status public.JobStatus`, `started_at timestamptz default now()`, `completed_at timestamptz`, `error_message text`, `metadata jsonb`.
- `card_daily_metrics`: `id UUID PK`, `card_id UUID references cards`, `metric_date date`, `views integer default 0`, `unique_users integer default 0`, `deck_inclusions integer default 0`, `price_avg numeric(12,4)`, `price_change numeric(12,4)`, `created_at timestamptz default now()`.
- `deck_daily_metrics`: `id UUID PK`, `deck_id UUID references decks`, `metric_date date`, `views integer default 0`, `unique_users integer default 0`, `imports integer default 0`, `exports integer default 0`, `bridge_requests integer default 0`, `win_rate numeric(5,2)`, `created_at timestamptz default now()`.
- `linked_accounts`: `id UUID PK`, `user_id UUID references users on delete cascade`, `provider auth_provider_enum`, `provider_user_id text unique per provider`, OAuth token metadata, `scopes text[]`, `created_at`, `updated_at`.
- `auth_bridge_sessions`: `id UUID PK`, `user_id UUID references users on delete cascade`, optional `linked_account_id`, session identifiers (`card_bazaar_session_id`, `supabase_session_id`), `status auth_session_status_enum`, timing data, metadata.
- `auth_audit_events`: `id UUID PK`, optional `user_id`/`linked_account_id`/`session_id` FKs, `event_type auth_audit_event_enum`, `context jsonb`, `occurred_at timestamptz default now()`.
- `card_similarity`: `card_id UUID`, `related_card_id UUID`, `score numeric(8,4)`, `components jsonb`, `rationale text`, `generated_at timestamptz`, unique `(card_id, related_card_id)`.
- `deck_upgrade_candidates`: `deck_id UUID`, `card_id UUID`, `score numeric(8,4)`, `components jsonb`, `rationale text`, `generated_at timestamptz`, unique `(deck_id, card_id)`.
- `user_similarity_scores`: `user_id UUID`, `similar_user_id UUID`, `score numeric(8,4)`, `shared_interactions integer`, `last_computed_at timestamptz`, unique `(user_id, similar_user_id)`.
- `privacy_requests`: `id UUID PK`, optional `user_id UUID`, `request_type privacy_request_type_enum`, `status privacy_request_status_enum`, `metadata jsonb`, timestamps.

## Catalog Views

- `card_catalog_view`: flattened card metadata for search results (card identity, mana stats, parsed card types/subtypes, color identity, legality formats aggregated from `card_format_legalities`, primary image URL, popularity signal from `trending_snapshots`, and latest USD price range). Read-only, refreshed by database view.

## Event Taxonomy (Phase 5)

- `search_performed`: context captures `query`, `filters`, `results_count`, and optional `source_surface`.
- `card_viewed`: subject is a card/printing; context includes `page`, `position`, `source` (trending, search, recommendation).
- `deck_viewed`: subject deck; context tracks `source`, `format`, `card_count`, `source_category` (builder, gallery, share).
- `deck_card_added`: subject deck; context includes `card_id`, `zone`, `method` (manual, suggestion, import, import_unresolved, autofill).
- `deck_created`: subject deck; context includes `format`, `seed` (blank, template, import, autofill).
- `deck_imported`: subject deck; context includes `source`, `card_count`, `matched_count`, `missing_count`.
- `import_attempted`: subject import; context includes `source`, `status`, `error_code`, `card_count`, `matched_count`, `missing_count`, `merged_count`.
- `export_completed`: subject deck; context includes `export_format`, `cards_missing`, `destination` (download, card_bazaar_bridge, arena).
- `bridge_initiated`: subject `scope` (card/deck); context captures `destination`, `missing_count`, `bridge_id`, and local references.
- `recommendation_served`: subject recommendation; context includes `surface`, `algorithm`, `impression_count`, `recommendation_id`.
- `deck_simulator_action`: subject simulator; context records `action` (draw, mulligan, reset), `deckId`, counts before/after.
- `deck_autofill_action`: subject deck; context records `action`, `deckId`, `suggestionCount`.
- `auth_link_initiated`: subject linked account; context includes `provider`, `redirect_uri`, `attempt_id`.
- `auth_link_succeeded`: subject linked account; context includes `provider`, `provider_user_id`, `latency_ms`.
- `auth_link_failed`: subject linked account; context includes `provider`, `error_code`, `stage` (authorization, token_exchange, profile_sync).
- `auth_session_refreshed`: subject session; context includes `provider`, `session_id`, `refresh_reason` (expiry, manual).
- `auth_session_revoked`: subject session; context includes `provider`, `session_id`, `reason` (logout, remote_revocation, idle_timeout).
- `privacy_opt_out`: subject privacy; context includes `reason` and action=`opt_out`.
- `privacy_opt_in`: subject privacy; context includes `reason` and action=`opt_in`.
- `privacy_data_export_requested`: subject privacy; context includes `reason` and action=`data_export`.
- `privacy_data_delete_requested`: subject privacy; context includes `reason` and action=`data_delete`.

## Notes

- All tables expect row-level security with context-aware policies before exposing to clients.
- Prisma schema should mirror these definitions with enums for constrained fields.
- Phase 1/2 use `cards`, `printings`, `prices`, `card_tags`, `decks`, `deck_cards`, `event_log`; later tables are ready for incremental rollout.
- Deck draft persistence approach is detailed in `docs/deck-draft-persistence.md`.
- Supabase cron jobs should log executions to `ingestion_job_runs` (scryfall_bulk, price_snapshot, telemetry_rollup, trending_refresh, recommendation_similarity, recommendation_personalization) so analytics can monitor latency/error rates.

## API Stubs (Phase 2)

- `GET /api/decks`: Optional query params `userId`, `visibility`, `format`, `limit` (defaults to 12, max 50). Returns deck metadata plus card counts for builder list views.
- `POST /api/decks`: Accepts `name`, `format`, optional `description`, `visibility`, `powerTier`, `userId`. Persists a deck shell and returns the created record; cards are synced separately.
- `PUT /api/decks/cards`: Accepts deck metadata plus `{ printingId, quantity, zone }[]` to upsert deck cards during Supabase sync.
- `POST /api/cart-bridge`: Accepts either `{ type: "card", cardId, name, setCode?, setName?, price? }` or deck manifests `{ type: "deck", deckId, name, format, totalCards, distinctCards, items[], missing[] }` to queue Card Bazaar bridge placeholders until the live integration is enabled. Returns `bridgeId`, user message, optional `summary`, and a `missing` array for unresolved cards.
- `GET /api/trending`: Returns current trending cards/decks using `trending_snapshots`, optionally filtered by `scope`, `period`, or `format` query params.
- `POST /api/auth/link`: bootstraps the Card Bazaar OIDC flow, returning authorize URL + PKCE verifier for the client.
- `GET /api/auth/status`: lightweight read to show whether the current session is linked to Card Bazaar.
- `POST /api/auth/session/refresh`: placeholder endpoint for refreshing Card Bazaar tokens (returns 501 until wired).
- `POST /api/auth/session/revoke`: queues a revoke signal for Card Bazaar + Supabase sessions (202 Accepted in stub form).

## Telemetry Helpers (Phase 5)

- `trackSearchPerformed({ query, filters, page, totalResults, sourceSurface })` – wraps `search_performed`.
- `trackCardViewed({ cardId, source, surface })` – lightweight helper for `card_viewed`.
- `trackDeckCreated({ deckId, format, visibility, seed, source })` – ensures lifecycle metrics stay accurate.
- `trackDeckViewed({ deckId, source, format, cardCount })` – logs builder/gallery engagement.
- `trackDeckCardAdded({ deckId, cardId, zone, method })` – now includes autofill-only methods.
- `trackDeckImported({ deckId, source, cardCount, matchedCount, missingCount })` – consolidates import telemetry.
- `trackImportAttempted({ importId, source, status, errorCode, cardCount, matchedCount, missingCount, mergedCount })` – records pre/post import states.
- `trackExportCompleted({ deckId, exportFormat, cardsMissing, destination })` – covers downloads and Card Bazaar bridge pushes.
- `trackBridgeInitiated({ scope, subjectId, destination, missingCount, bridgeId })` – funnels into commerce analytics.
- `trackRecommendationServed({ recommendationId, surface, algorithm, impressionCount })` – personalization measurement hook.
- `trackDeckSimulatorAction({ action, deckId, cardCount, count, destination })` – emits `deck_simulator_action`.
- `trackDeckAutofillAction({ action, deckId, suggestionCount })` – captures `deck_autofill_action`.
- `trackAuthLinkEvent({ stage, status, provider, attemptId, errorCode })` – maps to `auth_link_initiated|succeeded|failed`.
- `trackAuthSessionEvent({ action, provider, sessionId, reason })` – covers `auth_session_refreshed` and `auth_session_revoked`.
- `trackPrivacyEvent(type, { reason })` – emits privacy opt-in/out and export/delete requests for compliance tracking.



