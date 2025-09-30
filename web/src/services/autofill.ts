import { getSimilarCardSeeds, getTrendingSeeds } from "@/services/recommendation-seeds";

export type AutofillRequestCard = {
  cardId: string;
  name: string;
  quantity: number;
};

export type AutofillRequest = {
  deckId?: string | null;
  deckName?: string | null;
  format?: string | null;
  colors?: string[] | null;
  cards: AutofillRequestCard[];
  limit?: number;
};

export type AutofillSuggestion = {
  cardId: string;
  name: string;
  setCode: string;
  image: string | null;
  manaCost: string | null;
  colorIdentity: string[];
  typeLine: string | null;
  reason: string;
  source: "trending" | "similar" | "fallback";
  seedId: string;
};

function normalizeColors(colors?: string[] | null) {
  if (!Array.isArray(colors)) {
    return null;
  }
  const normalized = colors
    .map((color) => (typeof color === "string" ? color.trim().toUpperCase() : ""))
    .filter(Boolean);
  return normalized.length ? new Set(normalized) : null;
}

function colorMatches(seedColors: string[] | undefined, allowed: Set<string> | null) {
  if (!allowed) {
    return true;
  }
  if (!seedColors || seedColors.length === 0) {
    // Colorless card is always permitted.
    return true;
  }
  return seedColors.every((color) => allowed.has(color));
}

export async function getAutofillSuggestions(request: AutofillRequest): Promise<AutofillSuggestion[]> {
  const limit = request.limit && Number.isFinite(request.limit) ? Math.max(1, Math.floor(request.limit)) : 10;
  const deckCardIds = new Set(request.cards.map((card) => card.cardId));
  const allowedColors = normalizeColors(request.colors);
  const deckFormat = request.format && request.format.trim().length ? request.format.trim().toLowerCase() : null;

  const suggestions: AutofillSuggestion[] = [];
  const seen = new Set<string>();

  const trendingSeeds = await getTrendingSeeds({ scope: "card", format: deckFormat, limit: 30 });
  for (const seed of trendingSeeds) {
    if (!seed.entity || seed.entity.type !== "card") {
      continue;
    }
    const card = seed.entity.card;
    if (deckCardIds.has(card.id) || seen.has(card.id)) {
      continue;
    }
    if (!colorMatches(card.colorIdentity, allowedColors)) {
      continue;
    }
    suggestions.push({
      cardId: card.id,
      name: card.name,
      setCode: card.setCode,
      image: card.image ?? null,
      manaCost: card.manaCost ?? null,
      colorIdentity: card.colorIdentity,
      typeLine: card.typeLine ?? null,
      reason: seed.reason || "Trending card suggestion",
      source: seed.fallback ? "fallback" : "trending",
      seedId: seed.id,
    });
    seen.add(card.id);
    if (suggestions.length >= limit) {
      return suggestions.slice(0, limit);
    }
  }

  const deckSeedIds = request.cards
    .map((card) => card.cardId)
    .filter((cardId, index, array) => array.indexOf(cardId) === index)
    .slice(0, 3);

  for (const seedCardId of deckSeedIds) {
    const similarSeeds = await getSimilarCardSeeds(seedCardId, { limit: 12, format: deckFormat });
    for (const seed of similarSeeds) {
      if (!seed.entity || seed.entity.type !== "card") {
        continue;
      }
      const card = seed.entity.card;
      if (deckCardIds.has(card.id) || seen.has(card.id)) {
        continue;
      }
      if (!colorMatches(card.colorIdentity, allowedColors)) {
        continue;
      }
      suggestions.push({
        cardId: card.id,
        name: card.name,
        setCode: card.setCode,
        image: card.image ?? null,
        manaCost: card.manaCost ?? null,
        colorIdentity: card.colorIdentity,
        typeLine: card.typeLine ?? null,
        reason: seed.reason || `Similar to ${seed.targetId}`,
        source: seed.fallback ? "fallback" : "similar",
        seedId: seed.id,
      });
      seen.add(card.id);
      if (suggestions.length >= limit) {
        return suggestions.slice(0, limit);
      }
    }
  }

  return suggestions.slice(0, limit);
}



