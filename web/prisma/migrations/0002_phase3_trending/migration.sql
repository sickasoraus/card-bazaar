-- CreateEnum
CREATE TYPE "public"."IngestionJobType" AS ENUM ('scryfall_bulk', 'price_snapshot', 'telemetry_rollup', 'trending_refresh');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "public"."ingestion_job_runs" (
    "id" UUID NOT NULL,
    "job_type" "public"."IngestionJobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'queued',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ingestion_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card_daily_metrics" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "deck_inclusions" INTEGER NOT NULL DEFAULT 0,
    "price_avg" NUMERIC(12, 4),
    "price_change" NUMERIC(12, 4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deck_daily_metrics" (
    "id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "metric_date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "imports" INTEGER NOT NULL DEFAULT 0,
    "exports" INTEGER NOT NULL DEFAULT 0,
    "bridge_requests" INTEGER NOT NULL DEFAULT 0,
    "win_rate" NUMERIC(5, 2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deck_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_daily_metrics_card_id_metric_date_key" ON "public"."card_daily_metrics" ("card_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "deck_daily_metrics_deck_id_metric_date_key" ON "public"."deck_daily_metrics" ("deck_id", "metric_date");

-- AddForeignKey
ALTER TABLE "public"."card_daily_metrics" ADD CONSTRAINT "card_daily_metrics_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deck_daily_metrics" ADD CONSTRAINT "deck_daily_metrics_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
