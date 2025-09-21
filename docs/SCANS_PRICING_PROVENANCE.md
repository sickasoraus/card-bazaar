# Scans, Pricing, and Provenance (MVP)

This document explains how to use the new features added on 2025-09-14: real scans, pricing snapshots + format indexes, and provenance scaffolding.

## Real Scans (Inventory Images)

- Storage layout (disk):
  - Originals + web derivative live under `./data/scans/{userId}/{binderItemId}/`.
  - Files: `front.jpg` (original), `front@1600w.jpg` (web).
- Upload endpoint (desktop MVP):
  - `POST /api/collection/:binderId/scan/front`
  - Content-Type: `application/octet-stream` (raw JPEG/PNG) or `application/json` with `{ "data_base64": "..." }`.
  - Limit: 12 MB.
  - On success, binder item `image` is set to the web path, and a row is inserted into `scans`.
- Serving scans in the grid:
  - The UI now prefers local scans or `entry.image` for tiles. If a scan is not found, it falls back to Scryfall.
  - You can also place public scans at `data/scans/public/<slug>-front@1600w.jpg` (slug of card name). The grid will attempt:
    - `/data/scans/public/<slug>-front@1600w.jpg` -> `/data/scans/public/<slug>-front.jpg` -> Scryfall art.

## Auction (BETA) & Provenance

- Data tables added:
  - `listings`: auction listings (prototype) with `confessional` notes.
  - `sellers`: display name, rating, verified flag.
  - `provenance_events`: event log scaffold (acquired, graded, listed, sold, etc.).
- Endpoints:
  - `POST /api/profile/display_name` -> `{ display_name }` (3-24 chars, alphanumeric & underscore; profanity rejected).
  - `POST /api/listings/:id/confessional` -> `{ confessional }` (profanity rejected).
- UI (prototype):
  - Binder "List for Auction" toggles remain in the UI. Auction (BETA) still lists from local state today; persistence added for later expansion.

## Format Indexes & Pricing Snapshots

- Config (curated staples): `config/indexes/{standard|modern|commander|vintage}.json` with `{ "cards": ["...", ...] }`.
- Endpoint to run a snapshot (manual MVP):
  - `POST /api/pricing/snapshot/run`
  - Behavior:
    - Fetches current USD prices from Scryfall for each listed staple.
    - Inserts per-card rows in `price_snapshots`.
    - Computes a format index as the equal-weighted average of the staple list.
    - Caps day-over-day index movement at +/- 25%.
    - Inserts a row in `index_snapshots` for each format.
- Future: a scheduled runner (cron/worker) can call this daily.

## Notes

- If `sharp` is installed, web derivatives are generated at 1600 px / 85% JPEG; otherwise the original is copied for the web variant.
- The API maintains outbox emails under `./data/outbox` when SMTP is not configured.
- All new data is in SQLite tables; disk persistence is required in production (Render Disk / Fly Volume).

## Safety & Moderation

- Display names and confessionals are checked against a minimal profanity list and rejected on save.
- No PII beyond display name should be stored in public fields.

## Quick Tests

1) Upload a scan:
   - `Invoke-WebRequest -Method Post -InFile .\front.jpg -ContentType application/octet-stream http://localhost:5173/api/collection/<BINDER_ID>/scan/front`
   - Refresh `/collection/` and confirm the image shows.
2) Pricing snapshot:
   - `Invoke-WebRequest -Method Post http://localhost:5173/api/pricing/snapshot/run`
   - Check DB rows in `price_snapshots` and `index_snapshots`.
3) Display name & confessional:
   - POST `/api/profile/display_name` then `/api/listings/:id/confessional` with sample text.
