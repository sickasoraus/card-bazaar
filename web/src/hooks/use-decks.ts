"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DeckVisibilityFilter = "private" | "unlisted" | "public";

export type DeckSummary = {
  id: string;
  name: string;
  format: string;
  powerTier: "casual" | "mid" | "competitive" | "cedh" | null;
  description: string | null;
  visibility: DeckVisibilityFilter;
  userId: string | null;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

type UseDecksOptions = {
  userId?: string;
  visibility?: DeckVisibilityFilter;
  limit?: number;
};

type UseDecksResult = {
  decks: DeckSummary[];
  meta: { count: number } | null;
  note: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function buildSearchParams(options: UseDecksOptions) {
  const params = new URLSearchParams();
  if (options.userId) {
    params.set("userId", options.userId);
  }
  if (options.visibility) {
    params.set("visibility", options.visibility);
  }
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", `${Math.max(1, Math.floor(options.limit))}`);
  }
  const queryString = params.toString();
  return queryString.length ? `?${queryString}` : "";
}

export function useDecks(options: UseDecksOptions = {}): UseDecksResult {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [meta, setMeta] = useState<{ count: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const queryString = useMemo(() => buildSearchParams(options), [options]);
  const endpoint = useMemo(() => `/api/decks${queryString}`, [queryString]);

  const fetchDecks = useCallback(
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
          data?: unknown;
          meta?: unknown;
          error?: string;
          note?: string;
        };

        if (!response.ok) {
          throw new Error(payload?.error || `Deck request failed (${response.status})`);
        }

        const parsedDecks = Array.isArray(payload?.data)
          ? (payload.data as DeckSummary[])
          : [];
        setDecks(parsedDecks);
        setMeta((payload?.meta as { count: number } | undefined) ?? null);
        setNote(typeof payload?.note === "string" ? payload.note : null);
      } catch (cause: unknown) {
        if (signal?.aborted) {
          return;
        }
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Unable to load decks.");
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
    fetchDecks(controller.signal);
    return () => controller.abort();
  }, [fetchDecks]);

  const refresh = useCallback(async () => {
    await fetchDecks();
  }, [fetchDecks]);

  return {
    decks,
    meta,
    note,
    isLoading,
    error,
    refresh,
  };
}
