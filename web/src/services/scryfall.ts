const SCRYFALL_API = "https://api.scryfall.com";

const MAX_PAGE = 200;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const cache = new Map<string, CacheEntry<unknown>>();

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

type FetchOptions = {
  signal?: AbortSignal;
};

type ScryfallListResponse<T> = {
  object: "list";
  total_cards?: number;
  has_more: boolean;
  next_page?: string;
  data: T[];
  warnings?: string[];
};

export type ScryfallCard = {
  id: string;
  name: string;
  type_line: string;
  mana_cost?: string;
  cmc?: number;
  oracle_text?: string;
  image_uris?: Record<string, string>;
  set_name?: string;
  set?: string;
  collector_number?: string;
  rarity?: string;
  prices?: Record<string, string | null>;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  layout?: string;
};

export type CardSearchParams = {
  /** Scryfall syntax query string. */
  query: string;
  /** 1-based page index; Scryfall caps at 200. */
  page?: number;
  /** Optional sort order; e.g. `released`, `cmc`. */
  order?: string;
  /** Order direction when supported; e.g. `asc` or `desc`. */
  dir?: "asc" | "desc";
};

export type CardSearchResult = ScryfallListResponse<ScryfallCard>;

export class ScryfallApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ScryfallApiError";
    this.status = status;
  }
}

function buildCacheKey(path: string, params?: URLSearchParams) {
  return `${path}?${params?.toString() ?? ""}`;
}

async function fetchFromScryfall<T>(path: string, params?: URLSearchParams, options: FetchOptions = {}): Promise<T> {
  const cacheKey = buildCacheKey(path, params);
  const now = Date.now();
  const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const url = new URL(path, SCRYFALL_API);
  if (params) {
    params.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-cache",
    signal: options.signal,
  });

  if (!response.ok) {
    let message = `Scryfall request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (typeof errorBody?.details === "string") {
        message = errorBody.details;
      }
    } catch {
      // ignore JSON parse errors and fall back to default message
    }
    throw new ScryfallApiError(response.status, message);
  }

  const data: T = await response.json();

  cache.set(cacheKey, {
    data,
    expiresAt: now + CACHE_TTL,
  });

  return data;
}

export async function searchCards(params: CardSearchParams, options: FetchOptions = {}): Promise<CardSearchResult> {
  const { query, page = 1, order, dir } = params;

  if (!query || !query.trim()) {
    throw new Error("Scryfall search requires a non-empty query string.");
  }

  if (page < 1 || page > MAX_PAGE) {
    throw new RangeError(`Scryfall page must be between 1 and ${MAX_PAGE}.`);
  }

  const searchParams = new URLSearchParams({
    q: query,
    page: page.toString(),
  });

  if (order) {
    searchParams.append("order", order);
  }
  if (dir) {
    searchParams.append("dir", dir);
  }

  const result = await fetchFromScryfall<CardSearchResult>("/cards/search", searchParams, options);

  return result;
}

export function primeSearchCache(result: CardSearchResult, params: CardSearchParams) {
  const searchParams = new URLSearchParams({
    q: params.query,
    page: (params.page ?? 1).toString(),
  });
  if (params.order) {
    searchParams.append("order", params.order);
  }
  if (params.dir) {
    searchParams.append("dir", params.dir);
  }

  const cacheKey = buildCacheKey("/cards/search", searchParams);
  cache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

export function clearScryfallCache(keyStartsWith?: string) {
  if (!keyStartsWith) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(keyStartsWith)) {
      cache.delete(key);
    }
  }
}

export type { ScryfallListResponse };




