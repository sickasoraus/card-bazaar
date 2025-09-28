"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type TrendingScope = "card" | "deck";
export type TrendingPeriod = "daily" | "weekly";
export type IngestionJobStatus = "queued" | "running" | "succeeded" | "failed";

export type IngestionJobMeta = {
  jobType: string;
  status: IngestionJobStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
};

export type TrendingMeta = {
  scope: TrendingScope;
  period: TrendingPeriod;
  format: string | null;
  count: number;
  fallback: boolean;
  hasDatabase?: boolean;
  lastCalculatedAt?: string | null;
  jobs?: {
    telemetryRollup: IngestionJobMeta | null;
    trendingRefresh: IngestionJobMeta | null;
  } | null;
};

export type TrendingCard = {
  id: string;
  name: string;
  setCode: string;
  rarity: string;
  manaCost: string | null;
  image: string | null;
  colorIdentity: string[];
};

export type TrendingDeck = {
  id: string;
  name: string;
  format: string;
  powerTier: string | null;
  visibility: string;
};

export type TrendingEntry = {
  rank: number;
  scope: TrendingScope;
  period: TrendingPeriod;
  subjectId: string;
  trendScore: number;
  components: Record<string, unknown>;
  calculatedAt: string;
  card?: TrendingCard;
  deck?: TrendingDeck;
};

export type UseTrendingOptions = {
  scope?: TrendingScope;
  period?: TrendingPeriod;
  format?: string | null;
  limit?: number;
};

export type UseTrendingResult = {
  entries: TrendingEntry[];
  meta: TrendingMeta | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function buildTrendingSearchParams(options: UseTrendingOptions) {
  const params = new URLSearchParams();
  if (options.scope) {
    params.set("scope", options.scope);
  }
  if (options.period) {
    params.set("period", options.period);
  }
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", `${Math.max(1, Math.floor(options.limit))}`);
  }
  if (options.format && options.format.trim().length) {
    params.set("format", options.format.trim().toLowerCase());
  }
  const queryString = params.toString();
  return queryString.length ? `?${queryString}` : "";
}

export function useTrending(options: UseTrendingOptions = {}): UseTrendingResult {
  const [entries, setEntries] = useState<TrendingEntry[]>([]);
  const [meta, setMeta] = useState<TrendingMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const queryString = useMemo(() => buildTrendingSearchParams(options), [options]);
  const endpoint = useMemo(() => `/api/trending${queryString}`, [queryString]);

  const fetchTrending = useCallback(
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
          data?: TrendingEntry[];
          meta?: TrendingMeta;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload?.error || `Trending request failed (${response.status})`);
        }

        setEntries(Array.isArray(payload?.data) ? payload.data : []);
        setMeta(payload?.meta ?? null);
      } catch (cause: unknown) {
        if (signal?.aborted) {
          return;
        }
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Unable to load trending data.");
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
    fetchTrending(controller.signal);
    return () => controller.abort();
  }, [fetchTrending]);

  const refresh = useCallback(async () => {
    await fetchTrending();
  }, [fetchTrending]);

  return {
    entries,
    meta,
    isLoading,
    error,
    refresh,
  };
}