-- Phase 3 trending analytics scaffolding
-- Run in Supabase SQL editor, then mark migration 0002 as applied locally.

-- Create enums for job tracking
CREATE TYPE "public"."IngestionJobType" AS ENUM ('scryfall_bulk', 'price_snapshot', 'telemetry_rollup', 'trending_refresh');
CREATE TYPE "public"."JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- Job run log for cron orchestration
CREATE TABLE "public"."ingestion_job_runs" (
    "id" UUID PRIMARY KEY,
    "job_type" "public"."IngestionJobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'queued',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB
);

-- Daily card metrics used by trending score computations
CREATE TABLE "public"."card_daily_metrics" (
    "id" UUID PRIMARY KEY,
    "card_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "deck_inclusions" INTEGER NOT NULL DEFAULT 0,
    "price_avg" NUMERIC(12, 4),
    "price_change" NUMERIC(12, 4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "card_daily_metrics_card_id_metric_date_key" ON "public"."card_daily_metrics" ("card_id", "metric_date");

ALTER TABLE "public"."card_daily_metrics"
  ADD CONSTRAINT "card_daily_metrics_card_id_fkey"
  FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Daily deck metrics derived from telemetry + imports/exports
CREATE TABLE "public"."deck_daily_metrics" (
    "id" UUID PRIMARY KEY,
    "deck_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "imports" INTEGER NOT NULL DEFAULT 0,
    "exports" INTEGER NOT NULL DEFAULT 0,
    "bridge_requests" INTEGER NOT NULL DEFAULT 0,
    "win_rate" NUMERIC(5, 2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "deck_daily_metrics_deck_id_metric_date_key" ON "public"."deck_daily_metrics" ("deck_id", "metric_date");

ALTER TABLE "public"."deck_daily_metrics"
  ADD CONSTRAINT "deck_daily_metrics_deck_id_fkey"
  FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
