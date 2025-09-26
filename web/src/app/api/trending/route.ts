import { NextResponse } from "next/server";
import { Prisma, TrendingPeriod, TrendingScope } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;
const VALID_SCOPES: readonly TrendingScope[] = ["card", "deck"];
const VALID_PERIODS: readonly TrendingPeriod[] = ["daily", "weekly"];
const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);
const IS_STATIC_EXPORT = process.env.NEXT_PHASE === "phase-production-build";

const FALLBACK_TRENDING = {
  card: [
    {
      subjectId: "fallback-sheoldred",
      name: "Sheoldred, the Apocalypse",
      setCode: "DMU",
      image: "https://cards.scryfall.io/art_crop/front/3/9/391fce5f-7779-4b1e-bbbe-1c71cc070918.jpg?1664574018",
      rarity: "mythic",
      manaCost: "2BB",
      trendScore: 88.4,
      components: {
        views: 1420,
        deck_inclusions: 615,
        price_growth: 0.18,
        scarcity: 0.22,
      },
    },
    {
      subjectId: "fallback-fable",
      name: "Fable of the Mirror-Breaker",
      setCode: "NEO",
      image: "https://cards.scryfall.io/art_crop/front/8/4/8424d417-f5df-4ddc-a9c2-d58fc9fb8ccc.jpg?1643594833",
      rarity: "rare",
      manaCost: "2R",
      trendScore: 83.1,
      components: {
        views: 1284,
        deck_inclusions: 512,
        price_growth: 0.12,
        scarcity: 0.31,
      },
    },
    {
      subjectId: "fallback-atraxa",
      name: "Atraxa, Grand Unifier",
      setCode: "ONE",
      image: "https://cards.scryfall.io/art_crop/front/3/4/34f762a0-2f27-44be-994b-15dfbdc97716.jpg?1675957081",
      rarity: "mythic",
      manaCost: "3GWUB",
      trendScore: 79.6,
      components: {
        views: 1104,
        deck_inclusions: 471,
        price_growth: 0.07,
        scarcity: 0.28,
      },
    },
  ],
  deck: [
    {
      subjectId: "fallback-deck-izzet-phoenix",
      name: "Izzet Phoenix",
      format: "pioneer",
      trendScore: 75.2,
      components: {
        views: 284,
        imports: 94,
        exports: 61,
        bridge_requests: 33,
      },
    },
    {
      subjectId: "fallback-deck-selesnya-enchantments",
      name: "Selesnya Enchantments",
      format: "standard",
      trendScore: 71.8,
      components: {
        views: 242,
        imports: 80,
        exports: 55,
        bridge_requests: 27,
      },
    },
  ],
};

type TrendingResponseEntry = {
  rank: number;
  scope: TrendingScope;
  period: TrendingPeriod;
  subjectId: string;
  trendScore: number;
  components: Record<string, unknown>;
  calculatedAt: string;
  card?: {
    id: string;
    name: string;
    setCode: string;
    rarity: string;
    manaCost: string | null;
    image: string | null;
    colorIdentity: string[];
  };
  deck?: {
    id: string;
    name: string;
    format: string;
    powerTier: string | null;
    visibility: string;
  };
};

function parseScope(raw: string | null): TrendingScope {
  if (raw) {
    const normalized = raw.toLowerCase();
    if (VALID_SCOPES.includes(normalized as TrendingScope)) {
      return normalized as TrendingScope;
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

function decimalToNumber(value: Prisma.Decimal | number | string): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  try {
    return value.toNumber();
  } catch (error) {
    void error;
    return Number(value);
  }
}

function normalizeComponents(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function fallbackTrending(
  scope: TrendingScope,
  period: TrendingPeriod,
  limit: number,
): TrendingResponseEntry[] {
  const calculatedAt = new Date().toISOString();
  if (scope === "deck") {
    return FALLBACK_TRENDING.deck.slice(0, limit).map((item, index) => ({
      rank: index + 1,
      scope,
      period,
      subjectId: item.subjectId,
      trendScore: item.trendScore,
      components: item.components,
      calculatedAt,
      deck: {
        id: item.subjectId,
        name: item.name,
        format: item.format,
        powerTier: null,
        visibility: "public",
      },
    }));
  }

  return FALLBACK_TRENDING.card.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    scope,
    period,
    subjectId: item.subjectId,
    trendScore: item.trendScore,
    components: item.components,
    calculatedAt,
    card: {
      id: item.subjectId,
      name: item.name,
      setCode: item.setCode,
      rarity: item.rarity,
      manaCost: item.manaCost,
      image: item.image,
      colorIdentity: [],
    },
  }));
}

type TrendingQuery = {
  scope: TrendingScope;
  period: TrendingPeriod;
  format: string | null;
  limit: number;
};

async function queryTrendingFromDatabase({ scope, period, format, limit }: TrendingQuery) {
  const snapshots = await prisma.trendingSnapshot.findMany({
    where: { scope, period },
    orderBy: { trendScore: "desc" },
    take: limit,
  });

  if (!snapshots.length) {
    return [] as TrendingResponseEntry[];
  }

  if (scope === "card") {
    const subjectIds = snapshots.map((snapshot) => snapshot.subjectId);
    const cards = await prisma.card.findMany({
      where: { id: { in: subjectIds } },
    });
    const cardMap = new Map(cards.map((card) => [card.id, card]));

    const results: TrendingResponseEntry[] = [];

    snapshots.forEach((snapshot, index) => {
      const card = cardMap.get(snapshot.subjectId);
      if (!card) {
        return;
      }
      if (format && format !== "any") {
        const legality = (card.legality as Record<string, unknown> | null) ?? null;
        const legalityValue =
          legality && typeof legality[format] === "string"
            ? (legality[format] as string).toLowerCase()
            : null;
        if (legalityValue !== "legal") {
          return;
        }
      }

      const image = (() => {
        if (!card.imageUris || typeof card.imageUris !== "object") {
          return null;
        }
        const uris = card.imageUris as Record<string, string>;
        return uris.art_crop ?? uris.border_crop ?? uris.normal ?? null;
      })();

      results.push({
        rank: index + 1,
        scope,
        period,
        subjectId: snapshot.subjectId,
        trendScore: decimalToNumber(snapshot.trendScore),
        components: normalizeComponents(snapshot.components ?? null),
        calculatedAt: snapshot.calculatedAt.toISOString(),
        card: {
          id: card.id,
          name: card.name,
          setCode: card.setCode,
          rarity: card.rarity,
          manaCost: card.manaCost ?? null,
          image,
          colorIdentity: card.colorIdentity,
        },
      });
    });

    return results.slice(0, limit);
  }

  const subjectIds = snapshots.map((snapshot) => snapshot.subjectId);
  const decks = await prisma.deck.findMany({
    where: {
      id: { in: subjectIds },
      ...(format && format !== "any" ? { format } : {}),
    },
  });
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));

  const results: TrendingResponseEntry[] = [];

  snapshots.forEach((snapshot, index) => {
    const deck = deckMap.get(snapshot.subjectId);
    if (!deck) {
      return;
    }
    results.push({
      rank: index + 1,
      scope,
      period,
      subjectId: snapshot.subjectId,
      trendScore: decimalToNumber(snapshot.trendScore),
      components: normalizeComponents(snapshot.components ?? null),
      calculatedAt: snapshot.calculatedAt.toISOString(),
      deck: {
        id: deck.id,
        name: deck.name,
        format: deck.format,
        powerTier: deck.powerTier ?? null,
        visibility: deck.visibility,
      },
    });
  });

  return results.slice(0, limit);
}

export async function GET(request: Request) {
  if (IS_STATIC_EXPORT) {
    const scope: TrendingScope = "card";
    const period: TrendingPeriod = "daily";
    const limit = DEFAULT_LIMIT;
    const data = fallbackTrending(scope, period, limit);
    return NextResponse.json(
      {
        data,
        meta: {
          scope,
          period,
          format: null,
          count: data.length,
          hasDatabase: HAS_DATABASE,
          fallback: true,
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

  let data: TrendingResponseEntry[] = [];
  let usedFallback = false;

  if (HAS_DATABASE) {
    try {
      data = await queryTrendingFromDatabase({ scope, period, format, limit });
    } catch (error) {
      console.error("Failed to query trending data", error);
    }
  }

  if (!data.length) {
    data = fallbackTrending(scope, period, limit);
    usedFallback = true;
  }

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
      },
    },
    {
      status: 200,
    },
  );

  response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  return response;
}

export const runtime = "nodejs";

export const dynamic = "force-static";

export const revalidate = 0;



