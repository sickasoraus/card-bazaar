import { NextResponse } from "next/server";
import { TrendingPeriod } from "@prisma/client";

import {
  getDeckUpgradeSeeds,
  getSimilarCardSeeds,
  getTrendingSeeds,
  type RecommendationScope,
  type RecommendationSeed,
} from "@/services/recommendation-seeds";

const VALID_SCOPES: RecommendationScope[] = ["card", "deck"];
const VALID_PERIODS: TrendingPeriod[] = ["daily", "weekly"];
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;
const IS_STATIC_EXPORT = process.env.NEXT_PHASE === "phase-production-build";

function parseScope(raw: string | null): RecommendationScope {
  if (raw) {
    const normalized = raw.toLowerCase();
    if (VALID_SCOPES.includes(normalized as RecommendationScope)) {
      return normalized as RecommendationScope;
    }
  }
  return "card";
}

function parsePeriod(raw: string | null): TrendingPeriod {
  if (raw) {
    const normalized = raw.toLowerCase();
    if (VALID_PERIODS.includes(normalized as TrendingPeriod)) {
      return normalized as TrendingPeriod;
    }
  }
  return "daily";
}

function parseLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_LIMIT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: Request) {
  if (IS_STATIC_EXPORT) {
    const limit = DEFAULT_LIMIT;
    const seeds = await getTrendingSeeds({ scope: "card", limit, period: "daily" });
    return NextResponse.json(
      {
        data: seeds,
        meta: {
          scope: "card" as RecommendationScope,
          subjectId: null,
          format: null,
          period: "daily" as TrendingPeriod,
          surface: null,
          resolver: "static-fallback",
          count: seeds.length,
        },
      },
      { status: 200 },
    );
  }

  const { searchParams } = new URL(request.url);
  const scope = parseScope(searchParams.get("scope"));
  const subjectIdParam = searchParams.get("subjectId");
  const formatParam = searchParams.get("format");
  const surfaceParam = searchParams.get("surface");
  const period = parsePeriod(searchParams.get("period"));
  const limit = parseLimit(searchParams.get("limit"));

  const format = formatParam && formatParam.trim().length ? formatParam.trim().toLowerCase() : null;
  const subjectId = subjectIdParam && subjectIdParam.trim().length ? subjectIdParam.trim() : null;
  const surface = surfaceParam && surfaceParam.trim().length ? surfaceParam.trim() : null;

  let seeds: RecommendationSeed[] = [];
  let resolver = "trending";

  try {
    if (scope === "card" && subjectId) {
      seeds = await getSimilarCardSeeds(subjectId, { limit, format });
      resolver = seeds.some((seed) => {
        const metrics = seed.metrics ?? {};
        return Object.prototype.hasOwnProperty.call(metrics, 'similarity');
      })
        ? "similarity-model"
        : "similar-heuristic";
    } else if (scope === "deck" && subjectId) {
      seeds = await getDeckUpgradeSeeds(subjectId, { limit });
      resolver = seeds.some((seed) => {
        const metrics = seed.metrics ?? {};
        return Object.prototype.hasOwnProperty.call(metrics, 'upgradeScore');
      })
        ? "deck-upgrade-model"
        : "deck-upgrade-heuristic";
    }

    if (!seeds.length) {
      seeds = await getTrendingSeeds({ scope, format, limit, period });
      resolver = "trending";
    }
  } catch (error) {
    console.error("Failed to resolve recommendations", error);
    seeds = await getTrendingSeeds({ scope, format, limit, period });
    resolver = "fallback-trending";
  }

  const response = NextResponse.json(
    {
      data: seeds,
      meta: {
        scope,
        subjectId,
        format,
        period,
        surface,
        resolver,
        count: seeds.length,
      },
    },
    { status: 200 },
  );

  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=600");

  return response;
}

export const runtime = "nodejs";
export const dynamic = "force-static";

export const revalidate = 0;




