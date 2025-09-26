'use client';

import { useCallback, useEffect, useMemo, useState } from "react";

export type RecommendationScope = "card" | "deck";

export type RecommendationSeedSource =
  | "trending_card"
  | "trending_deck"
  | "similar_card"
  | "deck_upgrade"
  | "fallback";

export type RecommendationCardEntity = {
  type: "card";
  card: {
    id: string;
    name: string;
    setCode: string;
    rarity: string;
    manaCost: string | null;
    image: string | null;
    colorIdentity: string[];
  };
};

export type RecommendationDeckEntity = {
  type: "deck";
  deck: {
    id: string;
    name: string;
    format: string;
    powerTier: string | null;
    visibility: string;
  };
};

export type RecommendationEntity = RecommendationCardEntity | RecommendationDeckEntity;

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

export type UseRecommendationsOptions = {
  scope?: RecommendationScope;
  subjectId?: string | null;
  format?: string | null;
  surface?: "homepage" | "deck_builder" | "card_detail" | null;
  period?: "daily" | "weekly";
  limit?: number;
};

export type UseRecommendationsResult = {
  seeds: RecommendationSeed[];
  meta: {
    scope: RecommendationScope;
    subjectId: string | null;
    format: string | null;
    period: string | null;
    surface: string | null;
    resolver: string | null;
    count: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function buildRecommendationSearchParams(options: UseRecommendationsOptions) {
  const params = new URLSearchParams();
  if (options.scope) {
    params.set("scope", options.scope);
  }
  if (options.subjectId) {
    params.set("subjectId", options.subjectId);
  }
  if (options.surface) {
    params.set("surface", options.surface);
  }
  if (options.period) {
    params.set("period", options.period);
  }
  if (options.format && options.format.trim().length) {
    params.set("format", options.format.trim().toLowerCase());
  }
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", `${Math.max(1, Math.floor(options.limit))}`);
  }
  const queryString = params.toString();
  return queryString.length ? `?${queryString}` : "";
}

export function useRecommendations(options: UseRecommendationsOptions = {}): UseRecommendationsResult {
  const [seeds, setSeeds] = useState<RecommendationSeed[]>([]);
  const [meta, setMeta] = useState<UseRecommendationsResult["meta"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const queryString = useMemo(() => buildRecommendationSearchParams(options), [options]);
  const endpoint = useMemo(() => `/api/recommendations${queryString}`, [queryString]);

  const fetchRecommendations = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(endpoint, {
          signal,
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (signal?.aborted) {
          return;
        }

        const payload = (await response
          .json()
          .catch(() => ({}))) as {
          data?: RecommendationSeed[];
          meta?: UseRecommendationsResult["meta"];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload?.error || `Recommendation request failed (${response.status})`);
        }

        setSeeds(Array.isArray(payload?.data) ? payload.data : []);
        setMeta(payload?.meta ?? null);
      } catch (cause: unknown) {
        if (signal?.aborted) {
          return;
        }
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Unable to load recommendations.");
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [endpoint],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendations(controller.signal);
    return () => controller.abort();
  }, [fetchRecommendations]);

  const refresh = useCallback(async () => {
    await fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    seeds,
    meta,
    isLoading,
    error,
    refresh,
  };
}


