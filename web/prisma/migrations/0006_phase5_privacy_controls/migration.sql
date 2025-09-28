-- Phase 5 privacy control tables

CREATE TYPE privacy_request_type_enum AS ENUM ('telemetry_opt_out', 'telemetry_opt_in', 'data_export', 'data_delete');
CREATE TYPE privacy_request_status_enum AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  request_type privacy_request_type_enum NOT NULL,
  status privacy_request_status_enum NOT NULL DEFAULT 'pending',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX privacy_requests_user_idx ON privacy_requests(user_id);
CREATE INDEX privacy_requests_status_idx ON privacy_requests(status);
