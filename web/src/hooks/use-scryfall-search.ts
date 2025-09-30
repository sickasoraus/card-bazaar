'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CardSearchParams,
  CardSearchResult,
  ScryfallApiError,
  searchCards,
} from "@/services/scryfall";

type UseScryfallSearchOptions = {
  initialQuery: string;
  initialPage?: number;
  order?: string;
  dir?: "asc" | "desc";
  /** Optional debounce duration in ms. */
  debounceMs?: number;
};

type UseScryfallSearchReturn = {
  data: CardSearchResult | null;
  isLoading: boolean;
  error: Error | null;
  params: Readonly<CardSearchParams>;
  updateParams: (next: Partial<CardSearchParams>) => void;
  refetch: () => void;
};

const DEFAULT_DEBOUNCE = 120;

/**
 * Client-side hook for querying the Scryfall search endpoint with simple caching + abort handling.
 */
export function useScryfallSearch(options: UseScryfallSearchOptions): UseScryfallSearchReturn {
  const { initialQuery, initialPage = 1, order, dir, debounceMs = DEFAULT_DEBOUNCE } = options;

  const [params, setParams] = useState<CardSearchParams>({
    query: initialQuery,
    page: initialPage,
    order,
    dir,
  });
  const [data, setData] = useState<CardSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCounter = useRef(0);
  const lastSignature = useRef<string | null>(null);

  const memoizedParams = useMemo(
    () => ({ ...params }),
    [params],
  );

  const updateParams = (next: Partial<CardSearchParams>) => {
    setParams((prev) => {
      const merged: CardSearchParams = {
        query: next.query !== undefined ? next.query : prev.query,
        page: next.page !== undefined ? next.page : prev.page ?? 1,
        order: next.order !== undefined ? next.order : prev.order,
        dir: next.dir !== undefined ? next.dir : prev.dir,
      };

      if (next.query !== undefined && next.query !== prev.query) {
        merged.page = 1;
      }

      if (merged.page && (merged.page < 1 || merged.page > 200)) {
        merged.page = Math.min(Math.max(merged.page, 1), 200);
      }

      return merged;
    });
  };

  const executeSearch = () => {
    const signature = JSON.stringify(memoizedParams);
    if (signature === lastSignature.current) {
      return;
    }
    lastSignature.current = signature;

    const currentFetchId = ++fetchCounter.current;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    searchCards(memoizedParams, { signal: controller.signal })
      .then((result) => {
        if (fetchCounter.current !== currentFetchId) {
          return;
        }
        setData(result);
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }
        if (fetchCounter.current !== currentFetchId) {
          return;
        }

        if (err instanceof ScryfallApiError) {
          setError(err);
          return;
        }

        if ((err as Error)?.name === "AbortError") {
          return;
        }

        setError(err as Error);
      })
      .finally(() => {
        if (fetchCounter.current === currentFetchId) {
          setIsLoading(false);
        }
      });
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      executeSearch();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoizedParams, debounceMs]);

  const refetch = () => {
    lastSignature.current = null;
    executeSearch();
  };

  return {
    data,
    isLoading,
    error,
    params: memoizedParams,
    updateParams,
    refetch,
  };
}



