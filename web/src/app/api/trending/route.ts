import { NextResponse } from "next/server";
import { IngestionJobType, JobStatus, TrendingPeriod, TrendingScope } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { fetchTrendingSnapshots, type TrendingSnapshotResult } from "@/services/trending-data";

const DEFAULT_LIMIT = 8;
const FALLBACK_LIMIT = 8;
const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);
const IS_STATIC_EXPORT = process.env.NEXT_PHASE === "phase-production-build";

const FALLBACK_CARDS: Array<{
  subjectId: string;
  trendScore: number;
  components: Record<string, unknown>;
  card: TrendingSnapshotResult["card"] & { manaCost: string | null };
}> = [
  {
    subjectId: "fallback-sheoldred",
    trendScore: 88.4,
    components: {
      views: 1420,
      deck_inclusions: 615,
      price_growth: 0.18,
      scarcity: 0.22,
    },
    card: {
      id: "fallback-sheoldred",
      name: "Sheoldred, the Apocalypse",
      setCode: "DMU",
      rarity: "mythic",
      manaCost: "2BB",
      image: "https://cards.scryfall.io/art_crop/front/3/9/391fce5f-7779-4b1e-bbbe-1c71cc070918.jpg?1664574018",
      colorIdentity: ["B"],
    },
  },
  {
    subjectId: "fallback-fable",
    trendScore: 83.1,
    components: {
      views: 1284,
      deck_inclusions: 512,
      price_growth: 0.12,
      scarcity: 0.31,
    },
    card: {
      id: "fallback-fable",
      name: "Fable of the Mirror-Breaker",
      setCode: "NEO",
      rarity: "rare",
      manaCost: "2R",
      image: "https://cards.scryfall.io/art_crop/front/8/4/8424d417-f5df-4ddc-a9c2-d58fc9fb8ccc.jpg?1643594833",
      colorIdentity: ["R"],
    },
  },
  {
    subjectId: "fallback-atraxa",
    trendScore: 79.6,
    components: {
      views: 1104,
      deck_inclusions: 471,
      price_growth: 0.07,
      scarcity: 0.28,
    },
    card: {
      id: "fallback-atraxa",
      name: "Atraxa, Grand Unifier",
      setCode: "ONE",
      rarity: "mythic",
      manaCost: "3GWUB",
      image: "https://cards.scryfall.io/art_crop/front/3/4/34f762a0-2f27-44be-994b-15dfbdc97716.jpg?1675957081",
      colorIdentity: ["G", "W", "U", "B"],
    },
  },
];

const FALLBACK_DECKS: Array<{
  subjectId: string;
  trendScore: number;
  components: Record<string, unknown>;
  deck: TrendingSnapshotResult["deck"];
}> = [
  {
    subjectId: "fallback-deck-izzet-phoenix",
    trendScore: 75.2,
    components: {
      views: 284,
      imports: 94,
      exports: 61,
      bridge_requests: 33,
    },
    deck: {
      id: "fallback-deck-izzet-phoenix",
      name: "Izzet Phoenix",
      format: "pioneer",
      powerTier: null,
      visibility: "public",
    },
  },
  {
    subjectId: "fallback-deck-selesnya-enchantments",
    trendScore: 71.8,
    components: {
      views: 242,
      imports: 80,
      exports: 55,
      bridge_requests: 27,
    },
    deck: {
      id: "fallback-deck-selesnya-enchantments",
      name: "Selesnya Enchantments",
      format: "standard",
      powerTier: null,
      visibility: "public",
    },
  },
];

type TrendingResponseEntry = {
  rank: number;
  scope: TrendingScope;
  period: TrendingPeriod;
  subjectId: string;
  trendScore: number;
  components: Record<string, unknown>;
  calculatedAt: string | null;
  card?: TrendingSnapshotResult["card"] & { manaCost: string | null };
  deck?: TrendingSnapshotResult["deck"];
};

type JobMeta = {
  jobType: IngestionJobType;
  status: JobStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
} | null;

export async function GET(request: Request) {
  if (IS_STATIC_EXPORT) {
    const data = buildFallbackEntries("card", "daily", FALLBACK_LIMIT);
    return NextResponse.json(
      {
        data,
        meta: {
          scope: "card" as TrendingScope,
          period: "daily" as TrendingPeriod,
          format: null,
          count: data.length,
          hasDatabase: HAS_DATABASE,
          fallback: true,
          lastCalculatedAt: null,
          jobs: null,
        },
      },
      { status: 200 },
    );
  }

  const { searchParams } = new URL(request.url);
  const scope = parseScope(searchParams.get("scope"));
  const period = parsePeriod(searchParams.get("period"));
  const formatParam = searchParams.get("format");
  const format = formatParam && formatParam.trim().length ? formatParam.trim().toLowerCase() : null;
  const limit = parseLimit(searchParams.get("limit"));

  let records: TrendingSnapshotResult[] = [];
  let usedFallback = false;

  if (HAS_DATABASE) {
    try {
      records = await fetchTrendingSnapshots({ scope, period, format, limit });
    } catch (error) {
      console.error("Failed to query trending data", error);
    }
  }

  if (!records.length) {
    usedFallback = true;
  }

  const data = records.length
    ? buildEntriesFromRecords(records)
    : buildFallbackEntries(scope, period, limit ?? DEFAULT_LIMIT);

  const lastCalculatedAt = records.length
    ? records.reduce<Date | null>((latest, record) => {
        if (!latest || record.calculatedAt > latest) {
          return record.calculatedAt;
        }
        return latest;
      }, null)
    : null;

  const [rollupJob, trendingJob] = await Promise.all([
    fetchLatestJobRun(IngestionJobType.telemetry_rollup),
    fetchLatestJobRun(IngestionJobType.trending_refresh),
  ]);

  const response = NextResponse.json(
    {
      data,
      meta: {
        scope,
        period,
        format: format ?? null,
        count: data.length,
        hasDatabase: HAS_DATABASE,
        fallback: usedFallback,
        lastCalculatedAt: lastCalculatedAt ? lastCalculatedAt.toISOString() : null,
        jobs: {
          telemetryRollup: rollupJob,
          trendingRefresh: trendingJob,
        },
      },
    },
    { status: 200 },
  );

  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  return response;
}

function parseScope(raw: string | null): TrendingScope {
  if (raw) {
    const normalized = raw.toLowerCase();
    if (normalized === "deck" || normalized === "card") {
      return normalized as TrendingScope;
    }
  }
  return "card";
}

function parsePeriod(raw: string | null): TrendingPeriod {
  if (raw) {
    const normalized = raw.toLowerCase();
    if (normalized === "weekly" || normalized === "daily") {
      return normalized as TrendingPeriod;
    }
  }
  return "daily";
}

function parseLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_LIMIT;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(1, Math.floor(numeric)), 24);
}

function buildEntriesFromRecords(records: TrendingSnapshotResult[]): TrendingResponseEntry[] {
  return records.map((record, index) => ({
    rank: index + 1,
    scope: record.scope,
    period: record.period,
    subjectId: record.subjectId,
    trendScore: record.trendScore,
    components: record.components,
    calculatedAt: record.calculatedAt.toISOString(),
    card: record.card,
    deck: record.deck,
  }));
}

function buildFallbackEntries(scope: TrendingScope, period: TrendingPeriod, limit: number): TrendingResponseEntry[] {
  const take = Math.min(limit, FALLBACK_LIMIT);
  if (scope === "card") {
    return FALLBACK_CARDS.slice(0, take).map((entry, index) => ({
      rank: index + 1,
      scope,
      period,
      subjectId: entry.subjectId,
      trendScore: entry.trendScore,
      components: entry.components,
      calculatedAt: null,
      card: entry.card,
      deck: undefined,
    }));
  }

  return FALLBACK_DECKS.slice(0, take).map((entry, index) => ({
    rank: index + 1,
    scope,
    period,
    subjectId: entry.subjectId,
    trendScore: entry.trendScore,
    components: entry.components,
    calculatedAt: null,
    card: undefined,
    deck: entry.deck,
  }));
}
async function fetchLatestJobRun(jobType: IngestionJobType): Promise<JobMeta> {
  if (!HAS_DATABASE) {
    return null;
  }
  const run = await prisma.ingestionJobRun.findFirst({
    where: { jobType },
    orderBy: { startedAt: "desc" },
  });

  if (!run) {
    return null;
  }

  const completedAt = run.completedAt ?? null;
  const durationMs = completedAt ? completedAt.getTime() - run.startedAt.getTime() : null;

  return {
    jobType,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    completedAt: completedAt ? completedAt.toISOString() : null,
    durationMs,
    errorMessage: run.errorMessage ?? null,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 0;

