import { Prisma, TrendingPeriod, TrendingScope } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type RecommendationScope = "card" | "deck";
export type RecommendationSeedSource =
  | "trending_card"
  | "trending_deck"
  | "similar_card"
  | "deck_upgrade"
  | "fallback";

export type CardRecommendationEntity = {
  type: "card";
  card: {
    id: string;
    name: string;
    setCode: string;
    rarity: string;
    manaCost: string | null;
    image: string | null;
    typeLine: string | null;
    colorIdentity: string[];
  };
};

export type DeckRecommendationEntity = {
  type: "deck";
  deck: {
    id: string;
    name: string;
    format: string;
    powerTier: string | null;
    visibility: string;
  };
};

export type RecommendationEntity = CardRecommendationEntity | DeckRecommendationEntity;

export type RecommendationSeed = {
  id: string;
  scope: RecommendationScope;
  title: string;
  reason: string;
  targetId: string;
  source: RecommendationSeedSource;
  rank?: number;
  trendScore?: number;
  metrics?: Record<string, number | string>;
  components?: Record<string, unknown>;
  entity?: RecommendationEntity;
  generatedAt: string;
  fallback?: boolean;
};

type TrendingSeedOptions = {
  limit?: number;
  scope?: RecommendationScope;
  format?: string | null;
  period?: TrendingPeriod;
};

type SimilarSeedOptions = {
  limit?: number;
  format?: string | null;
};

type DeckUpgradeOptions = {
  limit?: number;
};

const DEFAULT_LIMIT = 8;
const DEFAULT_PERIOD: TrendingPeriod = "daily";
const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);

const FALLBACK_TRENDING: { card: RecommendationSeed[]; deck: RecommendationSeed[] } = {
  card: [
    {
      id: "fallback-card-sheoldred",
      scope: "card",
      title: "Sheoldred, the Apocalypse",
      reason: "Daily fallback seed when database data is unavailable.",
      targetId: "fallback-sheoldred",
      source: "fallback",
      rank: 1,
      trendScore: 88.4,
      components: {
        views: 1420,
        deck_inclusions: 615,
        price_growth: 0.18,
        scarcity: 0.22,
      },
      entity: {
        type: "card",
        card: {
          id: "fallback-sheoldred",
          name: "Sheoldred, the Apocalypse",
          setCode: "DMU",
          rarity: "mythic",
          manaCost: "2BB",
          image: "https://cards.scryfall.io/art_crop/front/3/9/391fce5f-7779-4b1e-bbbe-1c71cc070918.jpg?1664574018",
          typeLine: "Legendary Creature - Phyrexian Praetor",
          colorIdentity: ["B"],
        },
      },
      generatedAt: new Date().toISOString(),
      fallback: true,
    },
    {
      id: "fallback-card-fable",
      scope: "card",
      title: "Fable of the Mirror-Breaker",
      reason: "Daily fallback seed when database data is unavailable.",
      targetId: "fallback-fable",
      source: "fallback",
      rank: 2,
      trendScore: 83.1,
      components: {
        views: 1284,
        deck_inclusions: 512,
        price_growth: 0.12,
        scarcity: 0.31,
      },
      entity: {
        type: "card",
        card: {
          id: "fallback-fable",
          name: "Fable of the Mirror-Breaker",
          setCode: "NEO",
          rarity: "rare",
          manaCost: "2R",
          image: "https://cards.scryfall.io/art_crop/front/8/4/8424d417-f5df-4ddc-a9c2-d58fc9fb8ccc.jpg?1643594833",
          typeLine: "Enchantment - Saga",
          colorIdentity: ["R"],
        },
      },
      generatedAt: new Date().toISOString(),
      fallback: true,
    },
    {
      id: "fallback-card-atraxa",
      scope: "card",
      title: "Atraxa, Grand Unifier",
      reason: "Daily fallback seed when database data is unavailable.",
      targetId: "fallback-atraxa",
      source: "fallback",
      rank: 3,
      trendScore: 79.6,
      components: {
        views: 1104,
        deck_inclusions: 471,
        price_growth: 0.07,
        scarcity: 0.28,
      },
      entity: {
        type: "card",
        card: {
          id: "fallback-atraxa",
          name: "Atraxa, Grand Unifier",
          setCode: "ONE",
          rarity: "mythic",
          manaCost: "3GWUB",
          image: "https://cards.scryfall.io/art_crop/front/3/4/34f762a0-2f27-44be-994b-15dfbdc97716.jpg?1675957081",
          typeLine: "Legendary Creature - Phyrexian Angel",
          colorIdentity: ["G", "W", "U", "B"],
        },
      },
      generatedAt: new Date().toISOString(),
      fallback: true,
    },
  ],
  deck: [
    {
      id: "fallback-deck-izzet-phoenix",
      scope: "deck",
      title: "Izzet Phoenix",
      reason: "Daily fallback seed when database data is unavailable.",
      targetId: "fallback-deck-izzet-phoenix",
      source: "fallback",
      rank: 1,
      trendScore: 75.2,
      components: {
        views: 284,
        imports: 94,
        exports: 61,
        bridge_requests: 33,
      },
      entity: {
        type: "deck",
        deck: {
          id: "fallback-deck-izzet-phoenix",
          name: "Izzet Phoenix",
          format: "pioneer",
          powerTier: "competitive",
          visibility: "public",
        },
      },
      generatedAt: new Date().toISOString(),
      fallback: true,
    },
    {
      id: "fallback-deck-selesnya-enchantments",
      scope: "deck",
      title: "Selesnya Enchantments",
      reason: "Daily fallback seed when database data is unavailable.",
      targetId: "fallback-deck-selesnya-enchantments",
      source: "fallback",
      rank: 2,
      trendScore: 71.8,
      components: {
        views: 242,
        imports: 80,
        exports: 55,
        bridge_requests: 27,
      },
      entity: {
        type: "deck",
        deck: {
          id: "fallback-deck-selesnya-enchantments",
          name: "Selesnya Enchantments",
          format: "standard",
          powerTier: "mid",
          visibility: "public",
        },
      },
      generatedAt: new Date().toISOString(),
      fallback: true,
    },
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  try {
    return value.toNumber();
  } catch (error) {
    void error;
    return undefined;
  }
}

function extractImage(card: { imageUris: Prisma.JsonValue | null }): string | null {
  if (!card.imageUris || typeof card.imageUris !== "object") {
    return null;
  }
  const uris = card.imageUris as Record<string, string>;
  return uris.art_crop ?? uris.border_crop ?? uris.normal ?? null;
}

function cardLegalInFormat(card: { legality: Prisma.JsonValue | null }, format: string | null): boolean {
  if (!format || format === "any") {
    return true;
  }
  const legality = card.legality as Record<string, unknown> | null;
  if (!legality) {
    return false;
  }
  const value = legality[format];
  if (typeof value !== "string") {
    return false;
  }
  return value.toLowerCase() === "legal";
}

function normalizeComponentsValue(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function cloneSeed(seed: RecommendationSeed): RecommendationSeed {
  return JSON.parse(JSON.stringify(seed)) as RecommendationSeed;
}

export async function getTrendingSeeds(options: TrendingSeedOptions = {}): Promise<RecommendationSeed[]> {
  const {
    limit = DEFAULT_LIMIT,
    scope = "card",
    format = null,
    period = DEFAULT_PERIOD,
  } = options;

  if (!HAS_DATABASE) {
    return FALLBACK_TRENDING[scope].slice(0, limit).map(cloneSeed);
  }

  const take = Math.min(Math.max(limit * 2, limit), 50);

  const snapshots = await prisma.trendingSnapshot.findMany({
    where: { scope: scope as TrendingScope, period },
    orderBy: { trendScore: "desc" },
    take,
  });

  if (!snapshots.length) {
    return FALLBACK_TRENDING[scope].slice(0, limit).map(cloneSeed);
  }

  if (scope === "card") {
    const subjectIds = snapshots.map((snapshot) => snapshot.subjectId);
    const cards = await prisma.card.findMany({ where: { id: { in: subjectIds } } });
    const cardMap = new Map(cards.map((card) => [card.id, card]));

    const results = snapshots
      .map((snapshot, index) => {
        const card = cardMap.get(snapshot.subjectId);
        if (!card) {
          return null;
        }
        if (!cardLegalInFormat(card, format)) {
          return null;
        }
        const components = normalizeComponentsValue(snapshot.components ?? null);
        const trendScore = decimalToNumber(snapshot.trendScore);
        return {
          id: `trending-card-${snapshot.subjectId}`,
          scope: "card" as const,
          title: card.name,
          reason: format ? `Legal in ${format.toUpperCase()} and trending today.` : "Trending momentum across the catalog.",
          targetId: snapshot.subjectId,
          source: "trending_card" as const,
          rank: index + 1,
          trendScore,
          metrics: trendScore !== undefined ? { trendScore } : undefined,
          components,
          entity: {
            type: "card" as const,
            card: {
              id: card.id,
              name: card.name,
              setCode: card.setCode,
              rarity: card.rarity,
              manaCost: card.manaCost ?? null,
              image: extractImage(card),
              typeLine: card.typeLine ?? null,
              colorIdentity: card.colorIdentity,
            },
          },
          generatedAt: snapshot.calculatedAt.toISOString(),
          fallback: false,
        } satisfies RecommendationSeed;
      })
      .filter(Boolean) as RecommendationSeed[];

    if (!results.length) {
      return FALLBACK_TRENDING.card.slice(0, limit).map(cloneSeed);
    }

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

  const results = snapshots
    .map((snapshot, index) => {
      const deck = deckMap.get(snapshot.subjectId);
      if (!deck) {
        return null;
      }
      const components = normalizeComponentsValue(snapshot.components ?? null);
      const trendScore = decimalToNumber(snapshot.trendScore);
      return {
        id: `trending-deck-${snapshot.subjectId}`,
        scope: "deck" as const,
        title: deck.name,
        reason: `Trending ${deck.format} deck this ${period}.`,
        targetId: snapshot.subjectId,
        source: "trending_deck" as const,
        rank: index + 1,
        trendScore,
        metrics: trendScore !== undefined ? { trendScore } : undefined,
        components,
        entity: {
          type: "deck" as const,
          deck: {
            id: deck.id,
            name: deck.name,
            format: deck.format,
            powerTier: deck.powerTier ?? null,
            visibility: deck.visibility,
          },
        },
        generatedAt: snapshot.calculatedAt.toISOString(),
        fallback: false,
      } satisfies RecommendationSeed;
    })
    .filter(Boolean) as RecommendationSeed[];

  if (!results.length) {
    return FALLBACK_TRENDING.deck.slice(0, limit).map(cloneSeed);
  }

  return results.slice(0, limit);
}

export async function getSimilarCardSeeds(
  cardId: string,
  options: SimilarSeedOptions = {},
): Promise<RecommendationSeed[]> {
  const { limit = 6, format = null } = options;

  if (!HAS_DATABASE) {
    return FALLBACK_TRENDING.card.slice(0, limit).map(cloneSeed);
  }

  const baseCard = await prisma.card.findUnique({ where: { id: cardId } });
  if (!baseCard) {
    return FALLBACK_TRENDING.card.slice(0, limit).map(cloneSeed);
  }

  const similarityRows = await prisma.cardSimilarity.findMany({
    where: { cardId },
    orderBy: { score: 'desc' },
    include: { relatedCard: true },
    take: Math.min(limit * 3, 45),
  });

  const seeds: RecommendationSeed[] = [];
  const seenTargets = new Set<string>();

  if (similarityRows.length) {
    const relatedIds = similarityRows
      .map((row) => row.relatedCardId)
      .filter((relatedId) => relatedId !== cardId);

    const snapshots = relatedIds.length
      ? await prisma.trendingSnapshot.findMany({
          where: {
            scope: 'card',
            subjectId: { in: relatedIds },
            period: DEFAULT_PERIOD,
          },
        })
      : [];

    const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.subjectId, snapshot]));
    for (const row of similarityRows) {
      const related = row.relatedCard;
      if (!related || related.id === cardId) {
        continue;
      }
      if (seenTargets.has(related.id)) {
        continue;
      }
      if (!cardLegalInFormat(related, format)) {
        continue;
      }
      const snapshot = snapshotMap.get(related.id);
      const similarityScore = decimalToNumber(row.score);
      const trendScore = snapshot ? decimalToNumber(snapshot.trendScore) : undefined;

      seeds.push({
        id: `similar-card-${cardId}-${related.id}`,
        scope: 'card',
        title: related.name,
        reason: row.rationale ?? `Similarity model overlap with ${baseCard.name}.`,
        targetId: related.id,
        source: 'similar_card',
        rank: seeds.length + 1,
        trendScore: similarityScore ?? trendScore,
        metrics: {
          ...(similarityScore !== undefined ? { similarity: similarityScore } : {}),
          ...(trendScore !== undefined ? { trendScore } : {}),
        },
        components: normalizeComponentsValue(row.components),
        entity: {
          type: 'card',
          card: {
            id: related.id,
            name: related.name,
            setCode: related.setCode,
            rarity: related.rarity,
            manaCost: related.manaCost ?? null,
            image: extractImage(related),
            typeLine: related.typeLine ?? null,
            colorIdentity: related.colorIdentity,
          },
        },
        generatedAt: row.generatedAt.toISOString(),
        fallback: false,
      });
      seenTargets.add(related.id);
      if (seeds.length >= limit) {
        break;
      }
    }
  }

  if (seeds.length < limit) {
    const heuristicSeeds = await buildHeuristicSimilarSeeds(
      baseCard,
      cardId,
      Math.max(limit, 6),
      format,
      seenTargets,
    );
    for (const heuristic of heuristicSeeds) {
      if (seenTargets.has(heuristic.targetId)) {
        continue;
      }
      seeds.push({ ...heuristic, rank: seeds.length + 1 });
      seenTargets.add(heuristic.targetId);
      if (seeds.length >= limit) {
        break;
      }
    }
  }

  if (seeds.length < limit) {
    const trendingSeeds = await getTrendingSeeds({
      scope: 'card',
      limit: Math.max(limit, 6),
      period: DEFAULT_PERIOD,
      format,
    });
    for (const trending of trendingSeeds) {
      if (seenTargets.has(trending.targetId)) {
        continue;
      }
      seeds.push({
        ...trending,
        id: `similar-card-${cardId}-${trending.targetId}`,
        source: 'similar_card',
        rank: seeds.length + 1,
        reason: trending.reason ?? `Trending card adjacent to ${baseCard.name}.`,
      });
      seenTargets.add(trending.targetId);
      if (seeds.length >= limit) {
        break;
      }
    }
  }

  if (!seeds.length) {
    return FALLBACK_TRENDING.card.slice(0, limit).map(cloneSeed);
  }

  return seeds.slice(0, limit);
}

async function buildHeuristicSimilarSeeds(
  baseCard: {
    id: string;
    name: string;
    colorIdentity: string[];
    typeLine: string;
    legality: Prisma.JsonValue | null;
  },
  cardId: string,
  limit: number,
  format: string | null,
  excludeTargets: Set<string>,
): Promise<RecommendationSeed[]> {
  const colorIdentity = Array.isArray(baseCard.colorIdentity) ? baseCard.colorIdentity : [];
  const typeToken = baseCard.typeLine.split('-')[0]?.trim() ?? null;
  const excludedIds = [cardId, ...excludeTargets];

  const candidates = await prisma.card.findMany({
    where: {
      id: { notIn: excludedIds },
      ...(colorIdentity.length ? { colorIdentity: { hasSome: colorIdentity } } : {}),
      ...(typeToken
        ? {
            typeLine: {
              contains: typeToken,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    },
    take: Math.min(limit * 4, 40),
  });

  if (!candidates.length) {
    return [];
  }

  const candidateIds = candidates.map((card) => card.id);
  const snapshots = await prisma.trendingSnapshot.findMany({
    where: { scope: 'card', subjectId: { in: candidateIds } },
  });
  const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.subjectId, snapshot]));

  const heuristicSeeds = candidates
    .map((candidate) => {
      if (!cardLegalInFormat(candidate, format)) {
        return null;
      }
      const snapshot = snapshotMap.get(candidate.id);
      const trendScore = snapshot ? decimalToNumber(snapshot.trendScore) : undefined;
      return {
        id: `similar-heuristic-${cardId}-${candidate.id}`,
        scope: 'card' as const,
        title: candidate.name,
        reason: `Shares color identity with ${baseCard.name} and appears in adjacent decks.`,
        targetId: candidate.id,
        source: 'similar_card' as const,
        trendScore,
        metrics: trendScore !== undefined ? { trendScore } : undefined,
        components: normalizeComponentsValue(snapshot?.components ?? null),
        entity: {
          type: 'card' as const,
          card: {
            id: candidate.id,
            name: candidate.name,
            setCode: candidate.setCode,
            rarity: candidate.rarity,
            manaCost: candidate.manaCost ?? null,
            image: extractImage(candidate),
            typeLine: candidate.typeLine ?? null,
            colorIdentity: candidate.colorIdentity,
          },
        },
        generatedAt: snapshot ? snapshot.calculatedAt.toISOString() : nowIso(),
        fallback: false,
      } satisfies RecommendationSeed;
    })
    .filter(Boolean) as RecommendationSeed[];

  return heuristicSeeds;
}

export async function getDeckUpgradeSeeds(
  deckId: string,
  options: DeckUpgradeOptions = {},
): Promise<RecommendationSeed[]> {
  const { limit = 6 } = options;

  if (!HAS_DATABASE) {
    return FALLBACK_TRENDING.card.slice(0, limit).map(cloneSeed);
  }

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        include: {
          printing: {
            include: {
              card: true,
            },
          },
        },
      },
    },
  });

  if (!deck) {
    return FALLBACK_TRENDING.card.slice(0, limit).map(cloneSeed);
  }

  const deckCardIds = new Set<string>();
  deck.cards.forEach((deckCard) => {
    deckCardIds.add(deckCard.printing.card.id);
  });

  const seeds: RecommendationSeed[] = [];
  const seenTargets = new Set<string>(deckCardIds);

  const upgradeRows = await prisma.deckUpgradeCandidate.findMany({
    where: { deckId },
    orderBy: { score: 'desc' },
    include: { card: true },
    take: Math.min(limit * 3, 45),
  });

  if (upgradeRows.length) {
    const relatedIds = upgradeRows.map((row) => row.cardId);
    const snapshots = relatedIds.length
      ? await prisma.trendingSnapshot.findMany({
          where: { scope: 'card', subjectId: { in: relatedIds } },
        })
      : [];
    const snapshotMap = new Map(snapshots.map((snapshot) => [snapshot.subjectId, snapshot]));

    for (const row of upgradeRows) {
      const card = row.card;
      if (!card) {
        continue;
      }
      if (seenTargets.has(card.id)) {
        continue;
      }
      if (!cardLegalInFormat(card, deck.format)) {
        continue;
      }
      const snapshot = snapshotMap.get(card.id);
      const upgradeScore = decimalToNumber(row.score);

      seeds.push({
        id: `deck-upgrade-${deckId}-${card.id}`,
        scope: 'card',
        title: card.name,
        reason: row.rationale ?? `High affinity replacement for ${deck.name}.`,
        targetId: card.id,
        source: 'deck_upgrade',
        rank: seeds.length + 1,
        trendScore: upgradeScore ?? (snapshot ? decimalToNumber(snapshot.trendScore) : undefined),
        metrics: upgradeScore !== undefined ? { upgradeScore } : undefined,
        components: normalizeComponentsValue(row.components),
        entity: {
          type: 'card',
          card: {
            id: card.id,
            name: card.name,
            setCode: card.setCode,
            rarity: card.rarity,
            manaCost: card.manaCost ?? null,
            image: extractImage(card),
            typeLine: card.typeLine ?? null,
            colorIdentity: card.colorIdentity,
          },
        },
        generatedAt: row.generatedAt.toISOString(),
        fallback: false,
      });
      seenTargets.add(card.id);
      if (seeds.length >= limit) {
        break;
      }
    }
  }

  if (seeds.length < limit) {
    const heuristic = await buildHeuristicDeckUpgradeSeeds(
      deck,
      Math.max(limit, 6),
      deckCardIds,
      seenTargets,
    );
    for (const candidate of heuristic) {
      if (seenTargets.has(candidate.targetId)) {
        continue;
      }
      seeds.push({ ...candidate, rank: seeds.length + 1 });
      seenTargets.add(candidate.targetId);
      if (seeds.length >= limit) {
        break;
      }
    }
  }

  if (seeds.length < limit) {
    const trendingSeeds = await getTrendingSeeds({ scope: 'card', limit: Math.max(limit, 6) });
    for (const trending of trendingSeeds) {
      if (seenTargets.has(trending.targetId)) {
        continue;
      }
      seeds.push({
        ...trending,
        id: `deck-upgrade-${deckId}-${trending.targetId}`,
        source: 'deck_upgrade',
        rank: seeds.length + 1,
        reason: trending.reason ?? `Trending staple worth testing in ${deck.name}.`,
      });
      seenTargets.add(trending.targetId);
      if (seeds.length >= limit) {
        break;
      }
    }
  }

  if (!seeds.length) {
    return FALLBACK_TRENDING.card.slice(0, limit).map(cloneSeed);
  }

  return seeds.slice(0, limit);
}

async function buildHeuristicDeckUpgradeSeeds(
  deck: {
    id: string;
    name: string;
    format: string;
    cards: { printing: { card: { id: string; colorIdentity: string[] } } }[];
  },
  limit: number,
  deckCardIds: Set<string>,
  seenTargets: Set<string>,
): Promise<RecommendationSeed[]> {
  const deckColors = new Set<string>();
  deck.cards.forEach((deckCard) => {
    (deckCard.printing.card.colorIdentity ?? []).forEach((color) => deckColors.add(color));
  });

  const trendingCandidates = await getTrendingSeeds({
    scope: 'card',
    limit: Math.min(limit * 4, 32),
    period: DEFAULT_PERIOD,
  });

  const seeds: RecommendationSeed[] = [];
  for (const candidate of trendingCandidates) {
    if (candidate.entity?.type !== 'card') {
      continue;
    }
    const candidateId = candidate.entity.card.id;
    if (deckCardIds.has(candidateId) || seenTargets.has(candidateId)) {
      continue;
    }
    if (deckColors.size) {
      const candidateColors = new Set(candidate.entity.card.colorIdentity);
      if (!candidateColors.size) {
        continue;
      }
      let sharesColor = false;
      deckColors.forEach((color) => {
        if (candidateColors.has(color)) {
          sharesColor = true;
        }
      });
      if (!sharesColor) {
        continue;
      }
    }

    seeds.push({
      ...candidate,
      id: `deck-upgrade-${deck.id}-${candidateId}`,
      source: 'deck_upgrade',
      reason: candidate.reason ?? `High-performing staple for ${deck.format}.`,
      fallback: candidate.fallback ?? false,
    });
    if (seeds.length >= limit) {
      break;
    }
  }

  return seeds;
}

