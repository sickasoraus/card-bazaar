-- Prisma migration stub for Metablazt schema
-- Mirrors docs/schema-and-events.md (Phase 1 focus)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE power_tier_enum AS ENUM ('casual', 'mid', 'competitive', 'cedh');
CREATE TYPE deck_visibility_enum AS ENUM ('private', 'unlisted', 'public');
CREATE TYPE deck_zone_enum AS ENUM ('mainboard', 'sideboard', 'maybeboard', 'commander');
CREATE TYPE tag_source_enum AS ENUM ('editorial', 'inferred');
CREATE TYPE price_source_enum AS ENUM ('scryfall', 'mtggoldfish');
CREATE TYPE import_source_enum AS ENUM ('csv', 'mtg_arena_txt', 'text_list');
CREATE TYPE import_status_enum AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE recommendation_type_enum AS ENUM ('related_card', 'upgrade_suggestion', 'trending_pick');
CREATE TYPE trending_scope_enum AS ENUM ('card', 'deck');
CREATE TYPE trending_period_enum AS ENUM ('daily', 'weekly');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  handle text NOT NULL UNIQUE,
  avatar_url text,
  marketing_opt_out boolean NOT NULL DEFAULT false,
  default_format text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text,
  bio text,
  preferred_tags text[],
  power_level_pref text,
  shared_card_bazaar_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scryfall_id text NOT NULL UNIQUE,
  oracle_id text,
  name text NOT NULL,
  set_code text NOT NULL,
  rarity text NOT NULL,
  mana_cost text,
  cmc numeric,
  color_identity text[],
  type_line text NOT NULL,
  oracle_text text,
  image_uris jsonb,
  legality jsonb,
  is_token boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE printings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  set_code text NOT NULL,
  collector_number text NOT NULL,
  frame text,
  promo_types text[],
  finishes text[],
  released_at date,
  stock_status text,
  card_bazaar_sku text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printing_id uuid NOT NULL REFERENCES printings(id) ON DELETE CASCADE,
  source price_source_enum NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  retail numeric,
  buylist numeric,
  foil_retail numeric,
  foil_buylist numeric,
  sampled_at timestamptz NOT NULL
);

CREATE TABLE card_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag_slug text NOT NULL,
  tag_label text NOT NULL,
  tag_source tag_source_enum NOT NULL,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  format text NOT NULL,
  power_tier power_tier_enum,
  description text,
  visibility deck_visibility_enum NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deck_cards (
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  printing_id uuid NOT NULL REFERENCES printings(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  zone deck_zone_enum NOT NULL,
  PRIMARY KEY (deck_id, printing_id, zone)
);

CREATE TABLE imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source import_source_enum NOT NULL,
  raw_payload text,
  normalized jsonb,
  status import_status_enum NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id uuid,
  event_type text NOT NULL,
  subject_type text,
  subject_id uuid,
  context jsonb,
  value_numeric numeric,
  value_text text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trending_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope trending_scope_enum NOT NULL,
  subject_id uuid NOT NULL,
  period trending_period_enum NOT NULL,
  trend_score numeric NOT NULL,
  components jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  recommendation_type recommendation_type_enum NOT NULL,
  payload jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Relationships
ALTER TABLE recommendations
  ADD CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Convenience indexes
CREATE INDEX idx_cards_name ON cards (name);
CREATE INDEX idx_printings_card_id ON printings (card_id);
CREATE INDEX idx_prices_printing_id ON prices (printing_id);
CREATE INDEX idx_decks_user_id ON decks (user_id);
CREATE INDEX idx_event_log_user_id ON event_log (user_id);
CREATE INDEX idx_trending_scope_subject ON trending_snapshots (scope, subject_id);
