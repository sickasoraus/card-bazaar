# Auth Bridge & SSO Design (Phase 5)

## Objectives
- Allow Card Bazaar users to transition into Metablazt without a new login.
- Preserve Supabase Auth as the system of record while trusting Card Bazaar as an external IdP.
- Share profile preferences and personalization data bidirectionally.

## High-Level Flow
1. Metablazt renders a "Continue with Card Bazaar" button that points to the Card Bazaar OIDC authorize endpoint with PKCE.
2. Card Bazaar authenticates the user and redirects back to `https://metablazt.app/api/auth/callback` with an authorization code.
3. Our edge handler exchanges the code for Card Bazaar tokens, stores them in `linked_accounts`, and creates an `auth_bridge_sessions` row tying Supabase session -> Card Bazaar session.
4. If the user is new, we create a Supabase user and profile via service role; otherwise we link to the existing `users` row.
5. We mint a Supabase JWT and set a secure, same-site cookie for the metablazt domain; Card Bazaar receives a short-lived bridge token via postMessage to confirm the linkage.
6. Background jobs refresh Card Bazaar tokens when `auth_bridge_sessions.expires_at` is near expiry.

## Data Model Mapping
- `linked_accounts` holds provider-level identity + tokens (refresh tokens encrypted via KMS, stored base64 in `refresh_token`).
- `auth_bridge_sessions` tracks cross-domain sessions and last validation timestamp; partial unique indexes guarantee we never attach a Card Bazaar session to multiple users.
- `auth_audit_events` records compliance trail (link initiation, success, failure, refresh, revoke) with request metadata.

## API / Edge Endpoints
- `POST /api/auth/link` – begins PKCE flow, persists `auth_link_initiated` telemetry and returns verifier details.
- `GET /api/auth/callback` – exchanges code, writes to Supabase, emits `auth_link_succeeded` or `auth_link_failed`.
- `POST /api/auth/session/refresh` – refreshes the Card Bazaar token when a Supabase session is active, logs `auth_session_refreshed`.
- `POST /api/auth/session/revoke` – revokes both Supabase and Card Bazaar sessions, logs `auth_session_revoked`.
- `GET /api/auth/status` – lightweight endpoint to show whether the linked account is current (used by the UI badge).

## Security Considerations
- All secrets (Card Bazaar client ID/secret, encryption key) stored in Supabase vault or GitHub Actions secrets; never exposed to the client.
- Refresh tokens encrypted using AES-GCM prior to storage in `linked_accounts.refresh_token`; decrypted only inside serverless handlers.
- Cookies set with `Secure`, `HttpOnly`, `SameSite=None` for cross-origin iframes; fallback to `SameSite=Lax` for the standalone app.
- RLS policies restrict `linked_accounts` and `auth_bridge_sessions` to service role access; UI uses RPC to fetch masked status.
- Audit events keep `context` small (no tokens) but record IP, user agent, error codes, and attempt IDs.

## Open TODOs After Phase 5
- Finish Supabase Edge Functions that encrypt/decrypt refresh tokens.
- Implement cross-product logout listener so Card Bazaar can call a webhook to invalidate `auth_bridge_sessions`.
- Define retention policy for `auth_audit_events` (default 180 days) and archive into cold storage.
- Coordinate with Card Bazaar team on hashing plan for `provider_user_id` if direct IDs cannot leave their environment.

## Configuration Notes
- `NEXT_PUBLIC_SSO_ENABLED` gates the API stubs so static exports return 501 until real SSO is wired.
- `NEXT_PUBLIC_SSO_CLIENT_ID` and `NEXT_PUBLIC_CARDBAZAAR_ORIGIN` inform the authorize URL builder.
- Server-side secrets (`CARDBAZAAR_OIDC_CLIENT_ID`, `CARDBAZAAR_OIDC_CLIENT_SECRET`, `CARDBAZAAR_OIDC_ISSUER`, `CARDBAZAAR_OIDC_REDIRECT_URI`, `CARDBAZAAR_ENCRYPTION_KEY`) must live in Supabase config or GitHub Actions secrets before enabling SSO.
## Current Status (Phase 5 Stub)
- Card Bazaar SSO is not yet connected to a live OIDC provider. NEXT_PUBLIC_SSO_ENABLED stays alse, and the /api/auth/* endpoints return stub responses so the UI can message "demo mode" instead of failing.
- When the provider is ready, flip NEXT_PUBLIC_SSO_ENABLED=true, populate the CARDBAZAAR_OIDC_* secrets, and the bridge will start performing the real PKCE + token exchange flow.
