import type { BinderCardVariant } from "@/types/binder";

type Finish = BinderCardVariant["finish"];

const PRICE_FIELD_BY_FINISH: Record<Finish, readonly PriceField[]> = {
  nonfoil: ["usd"],
  foil: ["usd_foil", "usd"],
  etched: ["usd_etched", "usd_foil", "usd"],
  gilded: ["usd_foil", "usd"],
};

type PriceField = "usd" | "usd_foil" | "usd_etched";

type ScryfallCardResponse = {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  scryfall_uri: string;
  prices?: Record<string, string | null>;
};

export type ScryfallPricingRequest = {
  setCode: string;
  collectorNumber: string;
  finish: Finish;
};

export type ScryfallPriceResult = {
  key: string;
  price: number | null;
  field: PriceField | null;
  fetchedAt: string;
  cardName: string | null;
  url: string;
  error?: string;
};

const cache = new Map<string, ScryfallPriceResult>();

export function buildPricingKey({ setCode, collectorNumber, finish }: ScryfallPricingRequest): string {
  return `${setCode.trim().toUpperCase()}::${collectorNumber.trim().toLowerCase()}::${finish}`;
}

export async function fetchScryfallPrice(request: ScryfallPricingRequest): Promise<ScryfallPriceResult> {
  const key = buildPricingKey(request);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const url = `https://api.scryfall.com/cards/${encodeURIComponent(request.setCode.trim().toLowerCase())}/${encodeURIComponent(request.collectorNumber.trim().toLowerCase())}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 404) {
      const notFound: ScryfallPriceResult = {
        key,
        price: null,
        field: null,
        fetchedAt: new Date().toISOString(),
        cardName: null,
        url,
        error: `Scryfall card not found for ${request.setCode.toUpperCase()} ${request.collectorNumber}`,
      };
      cache.set(key, notFound);
      return notFound;
    }

    if (!response.ok) {
      throw new Error(`Scryfall request failed (${response.status})`);
    }

    const payload = (await response.json()) as ScryfallCardResponse;
    const prices = payload.prices ?? {};
    const fields = PRICE_FIELD_BY_FINISH[request.finish] ?? PRICE_FIELD_BY_FINISH.nonfoil;

    let resolvedField: PriceField | null = null;
    let resolvedPrice: number | null = null;

    for (const field of fields) {
      const value = prices[field];
      if (value && Number.isFinite(Number(value))) {
        resolvedField = field;
        resolvedPrice = Math.round(Number(value) * 100) / 100;
        break;
      }
    }

    const result: ScryfallPriceResult = {
      key,
      price: resolvedPrice,
      field: resolvedField,
      fetchedAt: new Date().toISOString(),
      cardName: payload.name ?? null,
      url: payload.scryfall_uri ?? url,
      error: resolvedPrice === null ? `No price available for ${payload.name ?? key}` : undefined,
    };

    cache.set(key, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Scryfall error";
    const failure: ScryfallPriceResult = {
      key,
      price: null,
      field: null,
      fetchedAt: new Date().toISOString(),
      cardName: null,
      url,
      error: message,
    };
    return failure;
  }
}

export async function fetchPricesForRequests(
  requests: ScryfallPricingRequest[],
  options: { throttleMs?: number } = {},
): Promise<Map<string, ScryfallPriceResult>> {
  const throttleMs = typeof options.throttleMs === "number" ? Math.max(0, options.throttleMs) : 120;
  const results = new Map<string, ScryfallPriceResult>();

  for (const request of requests) {
    const key = buildPricingKey(request);
    if (results.has(key)) {
      continue;
    }

    const result = await fetchScryfallPrice(request);
    results.set(key, result);

    if (throttleMs > 0) {
      await sleep(throttleMs);
    }
  }

  return results;
}

function sleep(duration: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, duration);
  });
}

