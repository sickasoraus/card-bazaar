# Supabase Schema & Event Taxonomy (Phase 0–1)

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
- `recommendations`: `id UUID PK`, `user_id UUID references users`, `recommendation_type text check (recommendation_type in ('related_card','upgrade_suggestion','trending_pick'))`, `payload jsonb`, `generated_at timestamptz default now()`, `expires_at timestamptz

## Event Taxonomy (Phase 1 focus)

- `search_performed`: context captures `query`, `filters`, `results_count`.
- `card_viewed`: subject is card/printing; context includes `page`, `position`, `source` (e.g., trending, search).
- `deck_card_added`: subject is deck; context includes `card_id`, `zone`, `method` (manual, suggestion, import).
- `deck_created`: subject deck; context includes `format`, `seed` (blank, template, import).
- `import_attempted`: subject import; context includes `source`, `status`, `error_code` when failed.
- `export_completed`: subject deck; context includes `export_format`, `cards_missing` count.
- `simulator_started`: future-proof flag for Phase 3+, but log structure ready with `starting_hand` sample toggle.

## Notes

- All tables expect row-level security with context-aware policies before exposing to clients.
- Prisma schema should mirror these definitions with enums for constrained fields.
- Phase 1 only uses `cards`, `printings`, `prices`, `card_tags`, `decks`, `deck_cards`, `event_log`; later tables are ready for incremental rollout.
