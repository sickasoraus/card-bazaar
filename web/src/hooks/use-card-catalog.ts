"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchScryfallCatalog, type CatalogFilters, type SortOption } from "@/lib/catalog-shared";
import type {
  CatalogCard,
  CatalogFacets,
  CatalogPagination,
  CatalogQuery,
  CatalogResponse,
} from "@/types/catalog";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_STATE: CatalogFiltersState = {
  search: "",
  formats: [],
  colors: [],
  types: [],
  rarities: [],
  cmcMin: null,
  cmcMax: null,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sort: "popularity",
};

const EMPTY_FACETS: CatalogFacets = {
  formats: [],
  colors: [],
  types: [],
  rarities: [],
};

const EMPTY_PAGINATION: CatalogPagination = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

type CatalogFiltersState = {
  search: string;
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

export type UseCardCatalogResult = {
  cards: CatalogCard[];
  facets: CatalogFacets;
  pagination: CatalogPagination;
  meta: CatalogResponse["meta"];
  isLoading: boolean;
  error: string | null;
  filters: CatalogFiltersState;
  setSearch: (value: string) => void;
  setSort: (value: CatalogFiltersState["sort"]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  toggleFormat: (value: string) => void;
  toggleColor: (value: string) => void;
  toggleType: (value: string) => void;
  toggleRarity: (value: string) => void;
  setCmcRange: (min: number | null, max: number | null) => void;
  resetFilters: () => void;
  refetch: () => Promise<void>;
};

export function useCardCatalog(initial?: CatalogQuery): UseCardCatalogResult {
  const [filters, setFilters] = useState<CatalogFiltersState>(() => createInitialState(initial));
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [facets, setFacets] = useState<CatalogFacets>(EMPTY_FACETS);
  const [pagination, setPagination] = useState<CatalogPagination>(EMPTY_PAGINATION);
  const [meta, setMeta] = useState<CatalogResponse["meta"]>({ hasDatabase: false, fallback: true });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/api/cards/search${queryString}`;

  const fetchCatalog = useCallback(
    async (signal?: AbortSignal) => {
      const normalizedFilters = toCatalogFilters(filters);

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

        const payload = (await response
          .json()
          .catch(() => ({}))) as Partial<CatalogResponse> & { error?: string };

        if (!response.ok) {
          throw new Error(payload?.error || `Card catalog request failed (${response.status})`);
        }

        if (signal?.aborted) {
          return;
        }

        setCards(Array.isArray(payload?.data) ? payload.data : []);
        setFacets(payload?.facets ?? EMPTY_FACETS);
        setPagination(payload?.pagination ?? {
          page: filters.page,
          pageSize: filters.pageSize,
          total: 0,
          totalPages: 1,
        });
        setMeta(payload?.meta ?? { hasDatabase: false, fallback: true });
      } catch {
        if (signal?.aborted) {
          return;
        }
        try {
          const fallback = await fetchScryfallCatalog(normalizedFilters, { signal });
          if (signal?.aborted) {
            return;
          }
          setCards(fallback.data);
          setFacets(fallback.facets);
          setPagination(fallback.pagination);
          setMeta(fallback.meta);
          setError(null);
        } catch (fallbackError: unknown) {
          if (signal?.aborted) {
            return;
          }
          setCards([]);
          setFacets(EMPTY_FACETS);
          setPagination({
            page: filters.page,
            pageSize: filters.pageSize,
            total: 0,
            totalPages: 1,
          });
          setMeta({ hasDatabase: false, fallback: true });
          setError(fallbackError instanceof Error ? fallbackError.message : "Unable to load cards.");
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [endpoint, filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalog(controller.signal);
    return () => controller.abort();
  }, [fetchCatalog]);

  const updateFilters = useCallback((updater: (previous: CatalogFiltersState) => CatalogFiltersState) => {
    setFilters((previous) => sanitizeState(updater(previous)));
  }, []);

  const setSearch = useCallback((value: string) => {
    updateFilters((prev) => ({
      ...prev,
      search: value,
      page: 1,
    }));
  }, [updateFilters]);

  const setSort = useCallback((value: CatalogFiltersState["sort"]) => {
    updateFilters((prev) => ({
      ...prev,
      sort: value,
      page: 1,
    }));
  }, [updateFilters]);

  const setPage = useCallback((page: number) => {
    updateFilters((prev) => ({
      ...prev,
      page: Math.max(1, Math.floor(Number.isFinite(page) ? page : 1)),
    }));
  }, [updateFilters]);

  const setPageSize = useCallback((pageSize: number) => {
    const normalized = clamp(Math.floor(pageSize), 12, MAX_ALLOWED_PAGE_SIZE);
    updateFilters((prev) => ({
      ...prev,
      pageSize: normalized,
      page: 1,
    }));
  }, [updateFilters]);

  const toggleFormat = useCallback((value: string) => {
    updateFilters((prev) => ({
      ...prev,
      formats: toggleValue(prev.formats, value),
      page: 1,
    }));
  }, [updateFilters]);

  const toggleColor = useCallback((value: string) => {
    updateFilters((prev) => ({
      ...prev,
      colors: toggleValue(prev.colors, value),
      page: 1,
    }));
  }, [updateFilters]);

  const toggleType = useCallback((value: string) => {
    updateFilters((prev) => ({
      ...prev,
      types: toggleValue(prev.types, value),
      page: 1,
    }));
  }, [updateFilters]);

  const toggleRarity = useCallback((value: string) => {
    updateFilters((prev) => ({
      ...prev,
      rarities: toggleValue(prev.rarities, value),
      page: 1,
    }));
  }, [updateFilters]);

  const setCmcRange = useCallback((min: number | null, max: number | null) => {
    const normalizedMin = sanitizeNumber(min);
    const normalizedMax = sanitizeNumber(max);
    updateFilters((prev) => ({
      ...prev,
      cmcMin: normalizedMin,
      cmcMax: normalizedMax,
      page: 1,
    }));
  }, [updateFilters]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_STATE);
  }, []);

  const refetch = useCallback(async () => {
    await fetchCatalog();
  }, [fetchCatalog]);

  return {
    cards,
    facets,
    pagination,
    meta,
    isLoading,
    error,
    filters,
    setSearch,
    setSort,
    setPage,
    setPageSize,
    toggleFormat,
    toggleColor,
    toggleType,
    toggleRarity,
    setCmcRange,
    resetFilters,
    refetch,
  };
}

function createInitialState(initial?: CatalogQuery): CatalogFiltersState {
  if (!initial) {
    return DEFAULT_STATE;
  }
  return sanitizeState({
    search: initial.search?.trim() ?? "",
    formats: normalizeArray(initial.formats),
    colors: normalizeArray(initial.colors),
    types: normalizeArray(initial.types),
    rarities: normalizeArray(initial.rarities),
    cmcMin: sanitizeNumber(initial.cmcMin),
    cmcMax: sanitizeNumber(initial.cmcMax),
    page: Math.max(1, Math.floor(initial.page ?? 1)),
    pageSize: clamp(Math.floor(initial.pageSize ?? DEFAULT_PAGE_SIZE), 12, MAX_ALLOWED_PAGE_SIZE),
    sort: (initial.sort as SortOption | undefined) ?? "popularity",
  });
}

function sanitizeState(state: CatalogFiltersState): CatalogFiltersState {
  return {
    ...state,
    search: state.search.trim(),
    formats: normalizeArray(state.formats),
    colors: normalizeArray(state.colors),
    types: normalizeArray(state.types),
    rarities: normalizeArray(state.rarities),
    cmcMin: sanitizeNumber(state.cmcMin),
    cmcMax: sanitizeNumber(state.cmcMax),
    page: Math.max(1, Math.floor(state.page)),
    pageSize: clamp(Math.floor(state.pageSize), 12, MAX_ALLOWED_PAGE_SIZE),
    sort: state.sort ?? "popularity",
  };
}

function toCatalogFilters(state: CatalogFiltersState): CatalogFilters {
  return {
    search: state.search.trim().length ? state.search.trim() : null,
    formats: state.formats,
    colors: state.colors,
    types: state.types,
    rarities: state.rarities,
    cmcMin: sanitizeNumber(state.cmcMin),
    cmcMax: sanitizeNumber(state.cmcMax),
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
  };
}

function buildQueryString(filters: CatalogFiltersState): string {
  const params = new URLSearchParams();

  if (filters.search.trim().length) {
    params.set("q", filters.search.trim());
  }
  filters.formats.forEach((format) => params.append("format", format));
  filters.colors.forEach((color) => params.append("color", color));
  filters.types.forEach((type) => params.append("type", type));
  filters.rarities.forEach((rarity) => params.append("rarity", rarity));

  if (typeof filters.cmcMin === "number") {
    params.set("cmcMin", `${filters.cmcMin}`);
  }
  if (typeof filters.cmcMax === "number") {
    params.set("cmcMax", `${filters.cmcMax}`);
  }

  if (filters.page > 1) {
    params.set("page", `${filters.page}`);
  }
  if (filters.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", `${filters.pageSize}`);
  }
  if (filters.sort !== "relevance") {
    params.set("sort", filters.sort);
  }

  const query = params.toString();
  return query.length ? `?${query}` : "";
}


function toggleValue(collection: string[], raw: string): string[] {
  const value = raw.trim().toLowerCase();
  if (!value.length) {
    return collection;
  }
  const set = new Set(collection.map((entry) => entry.toLowerCase()));
  if (set.has(value)) {
    return collection.filter((entry) => entry.toLowerCase() !== value);
  }
  return [...collection, value];
}


function normalizeArray(values: string[] | undefined | null): string[] {
  if (!values || !values.length) {
    return [];
  }
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length),
    ),
  );
}

function sanitizeNumber(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

const MAX_ALLOWED_PAGE_SIZE = 200;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
