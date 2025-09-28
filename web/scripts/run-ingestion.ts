import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv();
import { Prisma, IngestionJobType, JobStatus, TrendingPeriod, TrendingScope } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const SUPPORTED_JOBS = ["telemetry_rollup", "trending_refresh", "seed_sample"] as const;
type JobName = (typeof SUPPORTED_JOBS)[number];

type JobMetadata = Prisma.JsonObject;

type DateWindow = {
  start: Date;
  end: Date;
  metricDate: Date;
};

async function main() {
  const jobName = parseJobName(process.argv[2]);
  const targetDate = parseTargetDate(process.env.METRICS_DATE);
  const window = computeDateWindow(targetDate);

  const jobRun = await prisma.ingestionJobRun.create({
    data: {
      jobType: mapJobNameToType(jobName),
      status: JobStatus.running,
      metadata: {
        window_start: window.start.toISOString(),
        window_end: window.end.toISOString(),
      },
    },
  });

  let metadata: JobMetadata = {};

  try {
    if (jobName === "telemetry_rollup") {
      metadata = await rollupTelemetry(window);
    } else if (jobName === "trending_refresh") {
      metadata = await refreshTrending(window.metricDate);
    } else {
      metadata = await seedSampleData(window.metricDate);
    }

    await prisma.ingestionJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: JobStatus.succeeded,
        completedAt: new Date(),
        metadata: mergeMetadata(jobRun.metadata, metadata),
      },
    });
  } catch (error) {
    await prisma.ingestionJobRun.update({
      where: { id: jobRun.id },
      data: {
        status: JobStatus.failed,
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown ingestion error",
        metadata: mergeMetadata(jobRun.metadata, metadata),
      },
    });
    console.error(`[ingestion] ${jobName} failed`, error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

function parseJobName(raw: string | undefined): JobName {
  if (raw && (SUPPORTED_JOBS as readonly string[]).includes(raw)) {
    return raw as JobName;
  }
  return "telemetry_rollup";
}

function parseTargetDate(raw: string | undefined): Date {
  if (!raw) {
    return new Date();
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid METRICS_DATE value: ${raw}`);
  }
  return parsed;
}

function computeDateWindow(date: Date): DateWindow {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    start,
    end,
    metricDate: start,
  };
}

function mapJobNameToType(job: JobName): IngestionJobType {
  switch (job) {
    case "telemetry_rollup":
      return IngestionJobType.telemetry_rollup;
    case "trending_refresh":
      return IngestionJobType.trending_refresh;
    case "seed_sample":
      return IngestionJobType.scryfall_bulk;
    default:
      return IngestionJobType.telemetry_rollup;
  }
}

function mergeMetadata(base: Prisma.JsonValue | null, patch: JobMetadata): JobMetadata {
  const baseObject = (base ?? {}) as Prisma.JsonObject;
  return {
    ...baseObject,
    ...patch,
  };
}

async function rollupTelemetry(window: DateWindow): Promise<JobMetadata> {
  const [cardMeta, deckMeta] = await Promise.all([
    aggregateCardMetrics(window),
    aggregateDeckMetrics(window),
  ]);

  return {
    job: "telemetry_rollup",
    card_metrics_updated: cardMeta.count,
    deck_metrics_updated: deckMeta.count,
  } satisfies JobMetadata;
}

type AggregateResult = {
  count: number;
};

async function aggregateCardMetrics(window: DateWindow): Promise<AggregateResult> {
  const events = await prisma.eventLog.findMany({
    where: {
      occurredAt: {
        gte: window.start,
        lt: window.end,
      },
      eventType: {
        in: ["card_viewed", "deck_card_added"],
      },
      subjectId: {
        not: null,
      },
    },
    select: {
      subjectId: true,
      userId: true,
      eventType: true,
    },
  });

  const cardStats = new Map<string, {
    views: number;
    deckInclusions: number;
    users: Set<string>;
  }>();

  for (const event of events) {
    const subjectId = event.subjectId;
    if (!subjectId || !isUuid(subjectId)) {
      continue;
    }
    if (!cardStats.has(subjectId)) {
      cardStats.set(subjectId, {
        views: 0,
        deckInclusions: 0,
        users: new Set<string>(),
      });
    }
    const stats = cardStats.get(subjectId)!;
    if (event.eventType === "card_viewed") {
      stats.views += 1;
      if (event.userId) {
        stats.users.add(event.userId);
      }
    }
    if (event.eventType === "deck_card_added") {
      stats.deckInclusions += 1;
    }
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  for (const [cardId, stats] of cardStats.entries()) {
    operations.push(
      prisma.cardDailyMetric.upsert({
        where: {
          cardId_metricDate: {
            cardId,
            metricDate: window.metricDate,
          },
        },
        create: {
          cardId,
          metricDate: window.metricDate,
          views: stats.views,
          uniqueUsers: stats.users.size,
          deckInclusions: stats.deckInclusions,
        },
        update: {
          views: stats.views,
          uniqueUsers: stats.users.size,
          deckInclusions: stats.deckInclusions,
        },
      }),
    );
  }

  if (operations.length) {
    await prisma.$transaction(operations);
  }

  return { count: cardStats.size };
}

async function aggregateDeckMetrics(window: DateWindow): Promise<AggregateResult> {
  const events = await prisma.eventLog.findMany({
    where: {
      occurredAt: {
        gte: window.start,
        lt: window.end,
      },
      eventType: {
        in: ["deck_viewed", "deck_imported", "export_completed", "bridge_initiated"],
      },
      subjectId: {
        not: null,
      },
    },
    select: {
      subjectId: true,
      userId: true,
      eventType: true,
      context: true,
    },
  });

  const deckStats = new Map<string, {
    views: number;
    imports: number;
    exports: number;
    bridgeRequests: number;
    users: Set<string>;
    winRateSum: number;
    winRateSamples: number;
  }>();

  for (const event of events) {
    const subjectId = event.subjectId;
    if (!subjectId || !isUuid(subjectId)) {
      continue;
    }
    if (!deckStats.has(subjectId)) {
      deckStats.set(subjectId, {
        views: 0,
        imports: 0,
        exports: 0,
        bridgeRequests: 0,
        users: new Set<string>(),
        winRateSum: 0,
        winRateSamples: 0,
      });
    }
    const stats = deckStats.get(subjectId)!;
    if (event.userId) {
      stats.users.add(event.userId);
    }
    switch (event.eventType) {
      case "deck_viewed":
        stats.views += 1;
        accumulateWinRate(stats, event.context);
        break;
      case "deck_imported":
        stats.imports += 1;
        break;
      case "export_completed":
        stats.exports += 1;
        break;
      case "bridge_initiated":
        stats.bridgeRequests += 1;
        break;
      default:
        break;
    }
  }

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  for (const [deckId, stats] of deckStats.entries()) {
    const winRate = stats.winRateSamples > 0 ? stats.winRateSum / stats.winRateSamples : null;
    operations.push(
      prisma.deckDailyMetric.upsert({
        where: {
          deckId_metricDate: {
            deckId,
            metricDate: window.metricDate,
          },
        },
        create: {
          deckId,
          metricDate: window.metricDate,
          views: stats.views,
          uniqueUsers: stats.users.size,
          imports: stats.imports,
          exports: stats.exports,
          bridgeRequests: stats.bridgeRequests,
          winRate: winRate !== null ? new Prisma.Decimal(winRate.toFixed(2)) : null,
        },
        update: {
          views: stats.views,
          uniqueUsers: stats.users.size,
          imports: stats.imports,
          exports: stats.exports,
          bridgeRequests: stats.bridgeRequests,
          winRate: winRate !== null ? new Prisma.Decimal(winRate.toFixed(2)) : null,
        },
      }),
    );
  }

  if (operations.length) {
    await prisma.$transaction(operations);
  }

  return { count: deckStats.size };
}

function accumulateWinRate(
  stats: {
    winRateSum: number;
    winRateSamples: number;
  },
  context: Prisma.JsonValue,
) {
  if (!context || typeof context !== "object") {
    return;
  }
  const record = context as Record<string, unknown>;
  const raw = typeof record.win_rate !== "undefined" ? record.win_rate : record.winRate;
  if (raw === null || raw === undefined) {
    return;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return;
  }
  stats.winRateSum += numeric;
  stats.winRateSamples += 1;
}

async function refreshTrending(metricDate: Date): Promise<JobMetadata> {
  const cards = await prisma.cardDailyMetric.findMany({
    where: { metricDate },
  });
  const decks = await prisma.deckDailyMetric.findMany({
    where: { metricDate },
  });

  let cardCount = 0;
  for (const metric of cards) {
    const priceAvg = metric.priceAvg ? metric.priceAvg.toNumber() : 0;
    const priceChange = metric.priceChange ? metric.priceChange.toNumber() : 0;
    const priceGrowth = priceAvg !== 0 ? priceChange / priceAvg : 0;
    const trendScore = Number((metric.views * 0.4 + metric.deckInclusions * 0.4 + priceGrowth * 0.2).toFixed(4));
    const components = {
      views: metric.views,
      deck_inclusions: metric.deckInclusions,
      price_growth: Number(priceGrowth.toFixed(4)),
    } satisfies Record<string, unknown>;

    await prisma.trendingSnapshot.upsert({
      where: {
        scope_subjectId_period: {
          scope: TrendingScope.card,
          subjectId: metric.cardId,
          period: TrendingPeriod.daily,
        },
      },
      create: {
        scope: TrendingScope.card,
        subjectId: metric.cardId,
        period: TrendingPeriod.daily,
        trendScore: new Prisma.Decimal(trendScore.toFixed(4)),
        components,
      },
      update: {
        trendScore: new Prisma.Decimal(trendScore.toFixed(4)),
        components,
        calculatedAt: new Date(),
      },
    });
    cardCount += 1;
  }

  let deckCount = 0;
  for (const metric of decks) {
    const winRate = metric.winRate ? metric.winRate.toNumber() : 0;
    const trendScore = Number(
      (metric.views * 0.35 + metric.imports * 0.25 + metric.exports * 0.2 + metric.bridgeRequests * 0.1 + winRate * 0.1).toFixed(4),
    );
    const components = {
      views: metric.views,
      imports: metric.imports,
      exports: metric.exports,
      bridge_requests: metric.bridgeRequests,
      win_rate: Number(winRate.toFixed(2)),
    } satisfies Record<string, unknown>;

    await prisma.trendingSnapshot.upsert({
      where: {
        scope_subjectId_period: {
          scope: TrendingScope.deck,
          subjectId: metric.deckId,
          period: TrendingPeriod.daily,
        },
      },
      create: {
        scope: TrendingScope.deck,
        subjectId: metric.deckId,
        period: TrendingPeriod.daily,
        trendScore: new Prisma.Decimal(trendScore.toFixed(4)),
        components,
      },
      update: {
        trendScore: new Prisma.Decimal(trendScore.toFixed(4)),
        components,
        calculatedAt: new Date(),
      },
    });
    deckCount += 1;
  }

  return {
    job: "trending_refresh",
    card_snapshots: cardCount,
    deck_snapshots: deckCount,
  } satisfies JobMetadata;
}

async function seedSampleData(metricDate: Date): Promise<JobMetadata> {
  const sampleCardId = "11111111-1111-4111-8111-111111111111";
  const sampleDeckId = "22222222-2222-4222-8222-222222222222";

  await prisma.card.upsert({
    where: { id: sampleCardId },
    create: {
      id: sampleCardId,
      scryfallId: "sample-card",
      oracleId: "sample-card",
      name: "Sample Trendsetter",
      setCode: "DEV",
      rarity: "mythic",
      manaCost: "2UR",
      cmc: new Prisma.Decimal(4),
      colorIdentity: ["U", "R"],
      typeLine: "Legendary Creature",
      oracleText: "Sample card inserted for analytics testing.",
      imageUris: {
        art_crop: "https://cards.scryfall.io/art_crop/front/b/c/bcc384c0-66b3-4a64-8aca-d10eb7b9cf45.jpg?1593813845",
      },
      legality: {},
    },
    update: {
      name: "Sample Trendsetter",
      rarity: "mythic",
      manaCost: "2UR",
      colorIdentity: ["U", "R"],
    },
  });

  await prisma.deck.upsert({
    where: { id: sampleDeckId },
    create: {
      id: sampleDeckId,
      name: "Sample Deck",
      format: "standard",
      powerTier: null,
      visibility: "public",
      description: "Seeded deck for analytics smoke tests.",
    },
    update: {
      name: "Sample Deck",
      description: "Seeded deck for analytics smoke tests.",
    },
  });

  await prisma.cardDailyMetric.upsert({
    where: {
      cardId_metricDate: {
        cardId: sampleCardId,
        metricDate,
      },
    },
    create: {
      cardId: sampleCardId,
      metricDate,
      views: 420,
      uniqueUsers: 260,
      deckInclusions: 120,
      priceAvg: new Prisma.Decimal(12.5),
      priceChange: new Prisma.Decimal(1.5),
    },
    update: {
      views: 420,
      uniqueUsers: 260,
      deckInclusions: 120,
      priceAvg: new Prisma.Decimal(12.5),
      priceChange: new Prisma.Decimal(1.5),
    },
  });

  await prisma.deckDailyMetric.upsert({
    where: {
      deckId_metricDate: {
        deckId: sampleDeckId,
        metricDate,
      },
    },
    create: {
      deckId: sampleDeckId,
      metricDate,
      views: 95,
      uniqueUsers: 52,
      imports: 18,
      exports: 11,
      bridgeRequests: 6,
      winRate: new Prisma.Decimal(0.61),
    },
    update: {
      views: 95,
      uniqueUsers: 52,
      imports: 18,
      exports: 11,
      bridgeRequests: 6,
      winRate: new Prisma.Decimal(0.61),
    },
  });

  await refreshTrending(metricDate);

  return {
    job: "seed_sample",
    sample_card: sampleCardId,
    sample_deck: sampleDeckId,
  } satisfies JobMetadata;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

main().catch((error) => {
  console.error("[ingestion] unhandled error", error);
  process.exitCode = 1;
});

