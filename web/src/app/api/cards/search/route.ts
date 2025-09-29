import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { searchCards, type CardSearchParams, type ScryfallCard } from "@/services/scryfall";
import type { CatalogCard, CatalogFacet, CatalogResponse } from "@/types/catalog";

const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);
const IS_STATIC_EXPORT = process.env.NEXT_PHASE === "phase-production-build";
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const SCRYFALL_API_PAGE_SIZE = 175;


type DbCatalogRow = {
  card_id: string;
  name: string;
  set_code: string;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string;
  card_types: string[] | null;
  subtypes: string[] | null;
  color_identity: string[] | null;
  colors: string[] | null;
  rarity: string;
  image_url: string | null;
  oracle_text: string | null;
  formats: string[] | null;
  popularity: number | null;
  price_low: number | null;
  price_high: number | null;
};

type SortOption = "relevance" | "name" | "cmc" | "price" | "popularity";

type ParsedFilters = {
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

export async function GET(request: NextRequest) {
  const filters = parseFilters(request);

  try {
    if (!HAS_DATABASE || IS_STATIC_EXPORT) {
      const response = await runScryfallFallback(filters);
      return NextResponse.json(response, { status: 200 });
    }

    const response = await runDatabaseQuery(filters);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("/api/cards/search", error);
    try {
      const response = await runScryfallFallback(filters);
      return NextResponse.json(response, { status: 200 });
    } catch (fallbackError) {
      console.error("/api/cards/search fallback", fallbackError);
      return NextResponse.json(
        {
          error: "Unable to load card catalog at this time.",
        },
        { status: 500 },
      );
    }
  }
}

function parseFilters(request: NextRequest): ParsedFilters {
  const url = request.nextUrl ?? new URL(request.url);
  const params = url.searchParams;

  const search = normalizeString(params.get("q"));
  const formats = normalizeList(params.getAll("format"));
  const colors = normalizeList(params.getAll("color"));
  const types = normalizeList(params.getAll("type"));
  const rarities = normalizeList(params.getAll("rarity"));

  const cmcMin = parseOptionalNumber(params.get("cmcMin"));
  const cmcMax = parseOptionalNumber(params.get("cmcMax"));

  const page = parsePositiveInteger(params.get("page"), 1);
  const pageSize = clampInteger(parsePositiveInteger(params.get("pageSize"), DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);
  const sort = parseSort(params.get("sort"));

  return {
    search,
    formats,
    colors,
    types,
    rarities,
    cmcMin,
    cmcMax,
    page,
    pageSize,
    sort,
  };
}

async function runDatabaseQuery(filters: ParsedFilters): Promise<CatalogResponse> {
  const whereClauses: Prisma.Sql[] = [];

  if (filters.search) {
    const like = `%${filters.search.replace(/\s+/g, "%")}%`;
    whereClauses.push(
      Prisma.sql`(card_catalog_view.name ILIKE ${like} OR card_catalog_view.oracle_text ILIKE ${like})`,
    );
  }
  if (filters.formats.length) {
    const array = buildTextArray(filters.formats);
    whereClauses.push(Prisma.sql`card_catalog_view.formats && ${array}`);
  }
  if (filters.colors.length) {
    const array = buildTextArray(filters.colors);
    whereClauses.push(Prisma.sql`card_catalog_view.color_identity @> ${array}`);
  }
  if (filters.types.length) {
    const array = buildTextArray(filters.types);
    whereClauses.push(Prisma.sql`card_catalog_view.card_types && ${array}`);
  }
  if (filters.rarities.length) {
    const array = buildTextArray(filters.rarities);
    whereClauses.push(Prisma.sql`card_catalog_view.rarity = ANY(${array})`);
  }
  if (typeof filters.cmcMin === "number") {
    whereClauses.push(Prisma.sql`card_catalog_view.cmc >= ${filters.cmcMin}`);
  }
  if (typeof filters.cmcMax === "number") {
    whereClauses.push(Prisma.sql`card_catalog_view.cmc <= ${filters.cmcMax}`);
  }

  const whereSql = whereClauses.length
    ? Prisma.sql`WHERE ${Prisma.join(whereClauses, " AND ")}`
    : Prisma.sql``;

  const orderSql = getOrderBy(filters.sort);
  const offset = (filters.page - 1) * filters.pageSize;

  const selectColumns = Prisma.sql`
    card_id,
    name,
    set_code,
    mana_cost,
    cmc,
    type_line,
    card_types,
    subtypes,
    color_identity,
    colors,
    rarity,
    image_url,
    oracle_text,
    formats,
    popularity,
    price_low,
    price_high
  `;

  const results = await prisma.$queryRaw<DbCatalogRow[]>(
    Prisma.sql`
      SELECT ${selectColumns}
      FROM card_catalog_view
      ${whereSql}
      ${orderSql}
      LIMIT ${filters.pageSize}
      OFFSET ${offset}
    `,
  );

  const totalResult = await prisma.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM card_catalog_view
      ${whereSql}
    `,
  );

  const total = totalResult?.[0]?.count ?? results.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const facets = await loadFacets(whereSql);

  return {
    data: results.map(mapDbRowToCatalogCard),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
    },
    facets,
    meta: {
      hasDatabase: true,
      fallback: false,
    },
  };
}

async function loadFacets(whereSql: Prisma.Sql): Promise<CatalogResponse["facets"]> {
  const formatsPromise = prisma.$queryRaw<CatalogFacet[]>(
    Prisma.sql`
      WITH base AS (
        SELECT formats
        FROM card_catalog_view
        ${whereSql}
      )
      SELECT
        LOWER(format) AS value,
        COUNT(*)::int AS count
      FROM base, LATERAL unnest(base.formats) AS format
      GROUP BY format
      ORDER BY count DESC, value ASC
      LIMIT 24
    `,
  );

  const colorsPromise = prisma.$queryRaw<CatalogFacet[]>(
    Prisma.sql`
      WITH base AS (
        SELECT color_identity
        FROM card_catalog_view
        ${whereSql}
      )
      SELECT
        UPPER(color)::text AS value,
        COUNT(*)::int AS count
      FROM base, LATERAL unnest(base.color_identity) AS color
      GROUP BY color
      ORDER BY count DESC, value ASC
      LIMIT 12
    `,
  );

  const typesPromise = prisma.$queryRaw<CatalogFacet[]>(
    Prisma.sql`
      WITH base AS (
        SELECT card_types
        FROM card_catalog_view
        ${whereSql}
      )
      SELECT
        INITCAP(card_type) AS value,
        COUNT(*)::int AS count
      FROM base, LATERAL unnest(base.card_types) AS card_type
      GROUP BY card_type
      ORDER BY count DESC, value ASC
      LIMIT 20
    `,
  );

  const raritiesPromise = prisma.$queryRaw<CatalogFacet[]>(
    Prisma.sql`
      WITH base AS (
        SELECT rarity
        FROM card_catalog_view
        ${whereSql}
      )
      SELECT
        INITCAP(rarity) AS value,
        COUNT(*)::int AS count
      FROM base
      GROUP BY rarity
      ORDER BY count DESC, value ASC
    `,
  );

  const [formats, colors, types, rarities] = await Promise.all([
    formatsPromise.catch(() => []),
    colorsPromise.catch(() => []),
    typesPromise.catch(() => []),
    raritiesPromise.catch(() => []),
  ]);

  return {
    formats,
    colors,
    types,
    rarities,
  };
}

async function runScryfallFallback(filters: ParsedFilters): Promise<CatalogResponse> {
  const { page, pageSize } = filters;
  const { query, order, dir } = buildScryfallQuery(filters);

  const desiredStartIndex = (page - 1) * pageSize;
  const initialScryfallPage = calculateScryfallPage(desiredStartIndex);

  const firstPage = await searchCards({
    query,
    page: initialScryfallPage,
    order,
    dir,
  } as CardSearchParams);

  const collected: ScryfallCard[] = [...firstPage.data];
  let totalCards = firstPage.total_cards ?? firstPage.data.length;

  let nextPage = firstPage;
  let currentScryfallPage = initialScryfallPage;

  while (collected.length < desiredStartIndex + pageSize && nextPage.has_more) {
    currentScryfallPage += 1;
    nextPage = await searchCards({
      query,
      page: currentScryfallPage,
      order,
      dir,
    } as CardSearchParams);
    collected.push(...nextPage.data);
    totalCards = nextPage.total_cards ?? totalCards;

    if (currentScryfallPage - initialScryfallPage > 2) {
      break;
    }
  }

  const sliced = collected.slice(desiredStartIndex, desiredStartIndex + pageSize);

  const cards = sliced.map(mapScryfallCard);
  const totalPages = Math.max(1, Math.ceil(totalCards / pageSize));

  return {
    data: cards,
    pagination: {
      page,
      pageSize,
      total: totalCards,
      totalPages,
    },
    facets: buildFallbackFacets(collected),
    meta: {
      hasDatabase: HAS_DATABASE,
      fallback: true,
    },
  };
}

function calculateScryfallPage(startIndex: number): number {
  return Math.floor(startIndex / SCRYFALL_API_PAGE_SIZE) + 1;
}

function buildScryfallQuery(filters: ParsedFilters): { query: string; order?: string; dir?: "asc" | "desc" } {
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

function buildFallbackFacets(cards: ScryfallCard[]): CatalogResponse["facets"] {
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
      incrementMap(colorsMap, color.toUpperCase());
    });

    const typeLine = card.type_line ?? "";
    const [typesSegment, subtypesSegment] = typeLine.split("ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â").map((segment) => segment.trim());
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
    formats: mapToFacetList(formatsMap),
    colors: mapToFacetList(colorsMap),
    types: mapToFacetList(typesMap),
    rarities: mapToFacetList(raritiesMap),
  };
}

function mapDbRowToCatalogCard(row: DbCatalogRow): CatalogCard {
  return {
    id: row.card_id,
    name: row.name,
    setCode: row.set_code,
    manaCost: row.mana_cost,
    cmc: row.cmc,
    typeLine: row.type_line,
    cardTypes: row.card_types ?? [],
    subtypes: row.subtypes ?? [],
    colorIdentity: row.color_identity ?? [],
    colors: row.colors ?? row.color_identity ?? [],
    rarity: row.rarity,
    imageUrl: row.image_url,
    oracleText: row.oracle_text,
    formats: row.formats ?? [],
    popularity: row.popularity,
    priceLow: row.price_low,
    priceHigh: row.price_high,
  };
}

function mapScryfallCard(card: ScryfallCard): CatalogCard {
  const legalities = (card as Record<string, unknown>).legalities as Record<string, string> | undefined;
  const formats = legalities
    ? Object.entries(legalities)
        .filter(([, status]) => status === "legal" || status === "restricted" || status === "suspended")
        .map(([format]) => format.toLowerCase())
    : [];

  const typeLine = card.type_line ?? "";
  const [typesSegment, subtypesSegment] = typeLine.split("ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â").map((segment) => segment.trim());
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
  };
}

function buildTextArray(values: string[]): Prisma.Sql {
  const sanitized = values
    .map((value) => value.trim())
    .filter((value) => value.length);

  if (!sanitized.length) {
    return Prisma.sql`ARRAY[]::text[]`;
  }

  return Prisma.sql`ARRAY[${Prisma.join(sanitized.map((value) => Prisma.sql`${value}`))}]::text[]`;
}

function getOrderBy(sort: SortOption): Prisma.Sql {
  switch (sort) {
    case "name":
      return Prisma.sql`ORDER BY card_catalog_view.name ASC, card_catalog_view.card_id ASC`;
    case "cmc":
      return Prisma.sql`ORDER BY card_catalog_view.cmc ASC NULLS LAST, card_catalog_view.name ASC`;
    case "price":
      return Prisma.sql`ORDER BY card_catalog_view.price_low ASC NULLS LAST, card_catalog_view.name ASC`;
    case "popularity":
      return Prisma.sql`ORDER BY card_catalog_view.popularity DESC NULLS LAST, card_catalog_view.name ASC`;
    case "relevance":
    default:
      return Prisma.sql`ORDER BY card_catalog_view.popularity DESC NULLS LAST, card_catalog_view.cmc ASC NULLS LAST`;
  }
}

function normalizeString(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeList(values: string[]): string[] {
  const expanded: string[] = [];
  values.forEach((value) => {
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length)
      .forEach((entry) => expanded.push(entry.toLowerCase()));
  });
  return Array.from(new Set(expanded));
}

function parseOptionalNumber(raw: string | null): number | null {
  if (!raw) {
    return null;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
}

function parsePositiveInteger(raw: string | null, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const intValue = Math.floor(numeric);
  return intValue >= 1 ? intValue : fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseSort(raw: string | null): SortOption {
  if (!raw) {
    return "relevance";
  }
  const normalized = raw.toLowerCase();
  if (normalized === "name" || normalized === "cmc" || normalized === "price" || normalized === "popularity") {
    return normalized;
  }
  return "relevance";
}

function incrementMap(map: Map<string, number>, key: string) {
  const next = (map.get(key) ?? 0) + 1;
  map.set(key, next);
}

function mapToFacetList(map: Map<string, number>): CatalogFacet[] {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, 24);
}

function capitalize(value: string): string {
  if (!value.length) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 0;
