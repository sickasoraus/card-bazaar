-- Phase 5 advanced recommendation scaffolding

ALTER TYPE "public"."IngestionJobType" ADD VALUE IF NOT EXISTS 'recommendation_similarity';
ALTER TYPE "public"."IngestionJobType" ADD VALUE IF NOT EXISTS 'recommendation_personalization';

CREATE TABLE card_similarity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  related_card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  score numeric(8,4),
  components jsonb,
  rationale text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(card_id, related_card_id)
);

CREATE TABLE deck_upgrade_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  score numeric(8,4),
  components jsonb,
  rationale text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deck_id, card_id)
);

CREATE TABLE user_similarity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  similar_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score numeric(8,4) NOT NULL,
  shared_interactions integer NOT NULL DEFAULT 0,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, similar_user_id)
);

CREATE INDEX card_similarity_card_idx ON card_similarity(card_id);
CREATE INDEX card_similarity_related_idx ON card_similarity(related_card_id);
CREATE INDEX deck_upgrade_candidates_deck_idx ON deck_upgrade_candidates(deck_id);
CREATE INDEX deck_upgrade_candidates_card_idx ON deck_upgrade_candidates(card_id);
CREATE INDEX user_similarity_scores_user_idx ON user_similarity_scores(user_id);
CREATE INDEX user_similarity_scores_peer_idx ON user_similarity_scores(similar_user_id);
