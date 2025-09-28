import type { TrendingPeriod, TrendingScope } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const LIMIT_DEFAULT = 8;
const LIMIT_MAX = 24;

export type TrendingQueryArgs = {
  scope: TrendingScope;
  period: TrendingPeriod;
  format?: string | null;
  limit?: number;
};

export type TrendingSnapshotResult = {
  scope: TrendingScope;
  period: TrendingPeriod;
  subjectId: string;
  trendScore: number;
  components: Record<string, unknown>;
  calculatedAt: Date;
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

export async function fetchTrendingSnapshots({ scope, period, format, limit }: TrendingQueryArgs): Promise<TrendingSnapshotResult[]> {
  const take = normalizeLimit(limit);
  const snapshots = await prisma.trendingSnapshot.findMany({
    where: {
      scope,
      period,
    },
    orderBy: { trendScore: "desc" },
    take,
  });

  if (!snapshots.length) {
    return [];
  }

  const subjectIds = snapshots.map((snapshot) => snapshot.subjectId);

  if (scope === "card") {
    const cards = await prisma.card.findMany({
      where: { id: { in: subjectIds } },
    });
    const cardMap = new Map(cards.map((card) => [card.id, card]));

    return snapshots
      .filter((snapshot) => cardMap.has(snapshot.subjectId))
      .map((snapshot) => {
        const card = cardMap.get(snapshot.subjectId)!;
        return {
          scope,
          period,
          subjectId: snapshot.subjectId,
          trendScore: snapshot.trendScore.toNumber(),
          components: normalizeComponents(snapshot.components),
          calculatedAt: snapshot.calculatedAt,
          card: {
            id: card.id,
            name: card.name,
            setCode: card.setCode,
            rarity: card.rarity,
            manaCost: card.manaCost ?? null,
            image: extractCardImage(card.imageUris as Record<string, unknown> | null),
            colorIdentity: card.colorIdentity,
          },
        } satisfies TrendingSnapshotResult;
      });
  }

  const decks = await prisma.deck.findMany({
    where: {
      id: { in: subjectIds },
      ...(format && format !== "any"
        ? {
            format: {
              equals: format,
              mode: "insensitive",
            },
          }
        : {}),
    },
  });
  const deckMap = new Map(decks.map((deck) => [deck.id, deck]));

  return snapshots
    .filter((snapshot) => deckMap.has(snapshot.subjectId))
    .map((snapshot) => {
      const deck = deckMap.get(snapshot.subjectId)!;
      return {
        scope,
        period,
        subjectId: snapshot.subjectId,
        trendScore: snapshot.trendScore.toNumber(),
        components: normalizeComponents(snapshot.components),
        calculatedAt: snapshot.calculatedAt,
        deck: {
          id: deck.id,
          name: deck.name,
          format: deck.format,
          powerTier: deck.powerTier ?? null,
          visibility: deck.visibility,
        },
      } satisfies TrendingSnapshotResult;
    });
}

function extractCardImage(imageUris: Record<string, unknown> | null): string | null {
  if (!imageUris) {
    return null;
  }
  const record = imageUris as Record<string, unknown>;
  const preferred = ["art_crop", "large", "normal", "png"];
  for (const key of preferred) {
    const value = record[key];
    if (typeof value === "string" && value.length) {
      return value;
    }
  }
  return null;
}
export function normalizeLimit(limit?: number) {
  if (!limit || !Number.isFinite(limit)) {
    return LIMIT_DEFAULT;
  }
  return Math.min(Math.max(1, Math.floor(limit)), LIMIT_MAX);
}





function normalizeComponents(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  if (Array.isArray(value)) {
    return value.reduce<Record<string, unknown>>((acc, entry, index) => {
      acc[index.toString()] = coerceComponentValue(entry);
      return acc;
    }, {});
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    normalized[key] = coerceComponentValue(entry);
  }

  return normalized;
}

function coerceComponentValue(input: unknown): unknown {
  if (input === null || input === undefined) {
    return null;
  }

  if (Array.isArray(input)) {
    return input.map((item) => coerceComponentValue(item));
  }

  if (isDecimalLike(input)) {
    try {
      const numeric = input.toNumber();
      if (typeof numeric === "number" && Number.isFinite(numeric)) {
        return numeric;
      }
      const parsed = Number(numeric);
      return Number.isFinite(parsed) ? parsed : numeric;
    } catch {
      return null;
    }
  }

  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed.length) {
      return "";
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : input;
  }

  if (typeof input === "object") {
    const nested: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      nested[key] = coerceComponentValue(value);
    }
    return nested;
  }

  return input;
}

function isDecimalLike(value: unknown): value is { toNumber: () => unknown } {
  return Boolean(value) && typeof value === "object" && "toNumber" in (value as Record<string, unknown>) &&
    typeof (value as { toNumber?: unknown }).toNumber === "function";
}


