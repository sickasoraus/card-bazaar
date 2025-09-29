import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { fetchScryfallCatalog, type CatalogFilters, type SortOption } from "@/lib/catalog-shared";
import type { CatalogCard, CatalogFacet, CatalogResponse } from "@/types/catalog";

const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);
const IS_STATIC_EXPORT = process.env.NEXT_PHASE === "phase-production-build";
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 120;

export async function GET(request: NextRequest) {
  const filters = parseFilters(request);

  try {
    if (!HAS_DATABASE || IS_STATIC_EXPORT) {
      const response = await fetchScryfallCatalog(filters, {
        meta: { hasDatabase: HAS_DATABASE, fallback: true },
      });
      return NextResponse.json(response, { status: 200 });
    }

    const response = await runDatabaseQuery(filters);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("/api/cards/search", error);
    try {
      const response = await fetchScryfallCatalog(filters, {
        meta: { hasDatabase: HAS_DATABASE, fallback: true },
      });
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

async function runDatabaseQuery(filters: CatalogFilters): Promise<CatalogResponse> {
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

function parseFilters(request: NextRequest): CatalogFilters {
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

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 0;
