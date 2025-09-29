import { searchCards, type CardSearchParams, type ScryfallCard } from "@/services/scryfall";
import type { CatalogCard, CatalogFacet, CatalogFacets, CatalogResponse } from "@/types/catalog";

export type SortOption = "relevance" | "name" | "cmc" | "price" | "popularity";

export type CatalogFilters = {
  search: string | null;
  formats: string[];
  colors: string[];
  types: string[];
  rarities: string[];
  cmcMin: number | null;
  cmcMax: number | null;
  page: number;
  pageSize: number;
  sort: SortOption;
};

type FetchOptions = {
  signal?: AbortSignal;
  meta?: Partial<CatalogResponse["meta"]>;
};

const SCRYFALL_API_PAGE_SIZE = 175;

export function buildScryfallQuery(filters: CatalogFilters): { query: string; order?: string; dir?: "asc" | "desc" } {
  const tokens: string[] = [];

  if (filters.search) {
    tokens.push(filters.search);
  }
  if (filters.formats.length) {
    tokens.push(filters.formats.map((format) => `legal:${format}`).join(" "));
  }
  if (filters.colors.length) {
    const colorId = filters.colors.map((color) => color.trim().toLowerCase()).join("");
    if (colorId.length) {
      tokens.push(`c>=${colorId}`);
    }
  }
  if (filters.types.length) {
    tokens.push(filters.types.map((value) => `type:${value}`).join(" "));
  }
  if (filters.rarities.length) {
    tokens.push(filters.rarities.map((value) => `rarity:${value}`).join(" "));
  }
  if (typeof filters.cmcMin === "number") {
    tokens.push(`cmc>=${filters.cmcMin}`);
  }
  if (typeof filters.cmcMax === "number") {
    tokens.push(`cmc<=${filters.cmcMax}`);
  }

  const query = tokens.length ? tokens.join(" ") : "*";

  const orderMappings: Record<SortOption, { order?: string; dir?: "asc" | "desc" }> = {
    relevance: { order: "relevance" },
    name: { order: "name", dir: "asc" },
    cmc: { order: "cmc", dir: "asc" },
    price: { order: "usd", dir: "asc" },
    popularity: { order: "edhrec", dir: "desc" },
  };

  return {
    query,
    ...orderMappings[filters.sort],
  };
}

export function mapScryfallCard(card: ScryfallCard): CatalogCard {
  const legalities = (card as Record<string, unknown>).legalities as Record<string, string> | undefined;
  const formats = legalities
    ? Object.entries(legalities)
        .filter(([, status]) => status === "legal" || status === "restricted" || status === "suspended")
        .map(([format]) => format.toLowerCase())
    : [];

  const typeLine = card.type_line ?? "";
  const [typesSegment, subtypesSegment] = typeLine.split("—").map((segment) => segment.trim());
  const cardTypes = typesSegment?.split(/\s+/).filter((value) => value.length) ?? [];
  const subtypes = subtypesSegment?.split(/\s+/).filter((value) => value.length) ?? [];

  const priceLow = parseFloat(card.prices?.usd ?? "");
  const priceHigh = parseFloat(card.prices?.usd_foil ?? card.prices?.usd ?? "");

  return {
    id: card.id,
    name: card.name,
    setCode: card.set ?? "",
    manaCost: card.mana_cost ?? null,
    cmc: typeof card.cmc === "number" ? card.cmc : null,
    typeLine,
    cardTypes,
    subtypes,
    colorIdentity: card.color_identity ?? [],
    colors: card.colors ?? card.color_identity ?? [],
    rarity: card.rarity ?? "unknown",
    imageUrl:
      (card.image_uris?.png as string | undefined) ??
      (card.image_uris?.large as string | undefined) ??
      (card.image_uris?.normal as string | undefined) ??
      null,
    oracleText: card.oracle_text ?? null,
    formats,
    popularity: null,
    priceLow: Number.isFinite(priceLow) ? priceLow : null,
    priceHigh: Number.isFinite(priceHigh) ? priceHigh : null,
    scryfallUri: typeof card.scryfall_uri === "string" ? card.scryfall_uri : null,
    edhrecRank: typeof card.edhrec_rank === "number" ? card.edhrec_rank : null,
  };

}

export function buildFallbackFacets(cards: ScryfallCard[]): CatalogFacets {
  const formatsMap = new Map<string, number>();
  const colorsMap = new Map<string, number>();
  const typesMap = new Map<string, number>();
  const raritiesMap = new Map<string, number>();

  for (const card of cards) {
    const legalities = (card as Record<string, unknown>).legalities as Record<string, string> | undefined;
    if (legalities) {
      for (const [format, status] of Object.entries(legalities)) {
        if (status === "legal" || status === "restricted" || status === "suspended") {
          incrementMap(formatsMap, format.toLowerCase());
        }
      }
    }

    (card.color_identity ?? []).forEach((color) => {
      incrementMap(colorsMap, color.toLowerCase());
    });

    const typeLine = card.type_line ?? "";
    const [typesSegment, subtypesSegment] = typeLine.split("—").map((segment) => segment.trim());
    typesSegment
      ?.split(/\s+/)
      .filter((value) => value.length)
      .forEach((type) => incrementMap(typesMap, capitalize(type)));

    subtypesSegment
      ?.split(/\s+/)
      .filter((value) => value.length)
      .forEach((subtype) => incrementMap(typesMap, capitalize(subtype)));

    if (card.rarity) {
      incrementMap(raritiesMap, capitalize(card.rarity));
    }
  }

  return {
    formats: mapToFacetList(formatsMap, 24),
    colors: mapToFacetList(colorsMap, 12).map((facet) => ({ ...facet, value: facet.value.toUpperCase() })),
    types: mapToFacetList(typesMap, 20),
    rarities: mapToFacetList(raritiesMap, 8),
  };
}

export async function fetchScryfallCatalog(
  filters: CatalogFilters,
  options: FetchOptions = {},
): Promise<CatalogResponse> {
  const { signal, meta } = options;

  const desiredStartIndex = Math.max(0, (filters.page - 1) * filters.pageSize);
  const desiredEndIndex = desiredStartIndex + filters.pageSize;

  const { query, order, dir } = buildScryfallQuery(filters);

  const initialScryfallPage = calculateScryfallPage(desiredStartIndex);
  const params: CardSearchParams = {
    query,
    page: initialScryfallPage,
    order,
    dir,
  };

  const firstPage = await searchCards(params, { signal });
  const collected: ScryfallCard[] = [...firstPage.data];
  let totalCards = firstPage.total_cards ?? firstPage.data.length;
  let nextPage = firstPage;
  let currentScryfallPage = initialScryfallPage;

  while (collected.length < desiredEndIndex && nextPage.has_more) {
    if (signal?.aborted) {
      break;
    }
    currentScryfallPage += 1;
    nextPage = await searchCards(
      {
        query,
        page: currentScryfallPage,
        order,
        dir,
      },
      { signal },
    );
    collected.push(...nextPage.data);
    totalCards = nextPage.total_cards ?? totalCards;

    if (currentScryfallPage - initialScryfallPage > 3) {
      break;
    }
  }

  const sliced = collected.slice(desiredStartIndex, desiredEndIndex);
  const cards = sliced.map(mapScryfallCard);
  const totalPages = Math.max(1, Math.ceil(totalCards / filters.pageSize));
  const facets = buildFallbackFacets(collected);

  return {
    data: cards,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: totalCards,
      totalPages,
    },
    facets,
    meta: {
      hasDatabase: meta?.hasDatabase ?? false,
      fallback: meta?.fallback ?? true,
    },
  };
}

function calculateScryfallPage(startIndex: number): number {
  return Math.floor(startIndex / SCRYFALL_API_PAGE_SIZE) + 1;
}

function incrementMap(map: Map<string, number>, key: string) {
  const normalized = key.trim().toLowerCase();
  if (!normalized.length) {
    return;
  }
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function mapToFacetList(map: Map<string, number>, limit: number): CatalogFacet[] {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

function capitalize(value: string): string {
  if (!value.length) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
