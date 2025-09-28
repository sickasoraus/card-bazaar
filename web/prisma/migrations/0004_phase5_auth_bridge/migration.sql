-- Phase 5 auth bridge schema additions

CREATE TYPE auth_provider_enum AS ENUM ('supabase', 'card_bazaar');
CREATE TYPE auth_session_status_enum AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE auth_audit_event_enum AS ENUM (
  'link_initiated',
  'link_succeeded',
  'link_failed',
  'session_refreshed',
  'session_revoked'
);

CREATE TABLE linked_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider auth_provider_enum NOT NULL,
  provider_user_id text NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE auth_bridge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_account_id uuid REFERENCES linked_accounts(id) ON DELETE SET NULL,
  status auth_session_status_enum NOT NULL DEFAULT 'active',
  card_bazaar_session_id text,
  supabase_session_id text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  last_validated_at timestamptz,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  linked_account_id uuid REFERENCES linked_accounts(id) ON DELETE SET NULL,
  session_id uuid REFERENCES auth_bridge_sessions(id) ON DELETE SET NULL,
  event_type auth_audit_event_enum NOT NULL,
  context jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_audit_events_user_idx ON auth_audit_events (user_id);
CREATE INDEX auth_audit_events_linked_account_idx ON auth_audit_events (linked_account_id);
CREATE INDEX linked_accounts_user_idx ON linked_accounts (user_id);
CREATE INDEX auth_bridge_sessions_user_idx ON auth_bridge_sessions (user_id);
