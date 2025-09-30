-- Optional partial unique indexes for nullable session identifiers
CREATE UNIQUE INDEX IF NOT EXISTS auth_bridge_sessions_card_session_idx
  ON auth_bridge_sessions(card_bazaar_session_id)
  WHERE card_bazaar_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS auth_bridge_sessions_supabase_session_idx
  ON auth_bridge_sessions(supabase_session_id)
  WHERE supabase_session_id IS NOT NULL;
