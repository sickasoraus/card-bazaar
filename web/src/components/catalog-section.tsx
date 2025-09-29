"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { CardCatalogGrid } from "@/components/card-catalog-grid";
import { useCardCatalog } from "@/hooks/use-card-catalog";
import type { CatalogFacet } from "@/types/catalog";

const SORT_OPTIONS = [
  { value: "relevance" as const, label: "Relevance" },
  { value: "popularity" as const, label: "Popularity" },
  { value: "name" as const, label: "Name" },
  { value: "cmc" as const, label: "Mana Value" },
  { value: "price" as const, label: "Price" },
];

const COLOR_OPTIONS = ["w", "u", "b", "r", "g", "c"] as const;
const RARITY_OPTIONS = ["common", "uncommon", "rare", "mythic"] as const;

const COLOR_LABELS: Record<string, string> = {
  w: "W",
  u: "U",
  b: "B",
  r: "R",
  g: "G",
  c: "C",
};

export function CatalogSection() {
  const {
    cards,
    facets,
    filters,
    pagination,
    meta,
    isLoading,
    error,
    setSearch,
    setSort,
    setPage,
    setPageSize,
    toggleFormat,
    toggleColor,
    toggleRarity,
    setCmcRange,
    resetFilters,
    refetch,
  } = useCardCatalog();

  const [searchInput, setSearchInput] = useState(filters.search);
  const [cmcMin, setCmcMinInput] = useState<number | "">(filters.cmcMin ?? "");
  const [cmcMax, setCmcMaxInput] = useState<number | "">(filters.cmcMax ?? "");

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  useEffect(() => {
    setCmcMinInput(filters.cmcMin ?? "");
    setCmcMaxInput(filters.cmcMax ?? "");
  }, [filters.cmcMin, filters.cmcMax]);

  const formatFacets = useMemo(() => limitFacets(facets.formats, 12), [facets.formats]);
  const colorFacets = useMemo(() => buildColorFacetMap(facets.colors), [facets.colors]);
  const rarityFacets = useMemo(() => buildFacetMap(facets.rarities), [facets.rarities]);

  const handleApplyCmc = () => {
    const min = parseNumberOrNull(cmcMin);
    const max = parseNumberOrNull(cmcMax);
    setCmcRange(min, max);
  };

  const activeFormat = new Set(filters.formats);
  const activeColors = new Set(filters.colors);
  const activeRarities = new Set(filters.rarities);

  return (
    <section id="cards" className="relative isolate bg-[color:var(--color-neutral-200)]/25 py-24">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/30 to-transparent" aria-hidden />
      <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-10 px-6">
        <header className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
            Meta staples snapshot
          </span>
          <div className="flex flex-wrap items-baseline gap-4">
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)] sm:text-4xl">
              Top 100 staples across Standard, Modern, Commander, and Brawl
            </h2>
            <span className="text-xs uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">
              {`Showing ${cards.length.toLocaleString()} of ${pagination.total.toLocaleString()} cards • Page ${pagination.page} of ${pagination.totalPages}`}
            </span>
          </div>
          <p className="max-w-3xl text-sm text-[color:var(--color-text-subtle)]">
            Dial in format, color, and rarity to surface the cards dominating tonight&apos;s tables. We pull this feed directly from Scryfall so it always reflects the latest legal snapshot.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[360px,minmax(0,1fr)]">
          <aside className="surface-card shadow-card flex h-fit flex-col gap-6 rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/70 p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="catalog-search" className="text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">
                Search cards
              </label>
              <input
                id="catalog-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="eg. dragon tutor"
                className="rounded-[var(--radius-control)] border border-white/15 bg-black/40 px-3 py-2 text-sm text-[color:var(--color-text-body)] outline-none focus:border-[color:var(--color-accent-highlight)]"
              />
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">Sort by</span>
              <select
                value={filters.sort}
                onChange={(event) => setSort(event.target.value as typeof filters.sort)}
                className="rounded-[var(--radius-control)] border border-white/15 bg-black/40 px-3 py-2 text-sm text-[color:var(--color-text-body)]"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <FacetGroup title="Formats">
              <div className="flex flex-wrap gap-2">
                {formatFacets.map((facet) => {
                  const active = activeFormat.has(facet.value);
                  return (
                    <button
                      key={facet.value}
                      type="button"
                      onClick={() => toggleFormat(facet.value)}
                      className={`rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] transition ${
                        active
                          ? "gradient-pill text-[color:var(--color-text-hero)]"
                          : "border border-white/15 text-[color:var(--color-text-body)] hover:border-white/30"
                      }`}
                    >
                      {facet.value} ({facet.count.toLocaleString()})
                    </button>
                  );
                })}
              </div>
            </FacetGroup>

            <FacetGroup title="Colors">
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((code) => {
                  const active = activeColors.has(code);
                  const count = colorFacets.get(code) ?? 0;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleColor(code)}
                      className={`flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] transition ${
                        active ? "border-white/40 text-[color:var(--color-text-hero)]" : "border-white/15 text-[color:var(--color-text-body)]"
                      }`}
                    >
                      <span className="grid h-4 w-4 place-items-center rounded-full" style={{ backgroundColor: colorSwatch(code) }}>
                        {COLOR_LABELS[code]}
                      </span>
                      {count ? count.toLocaleString() : "--"}
                    </button>
                  );
                })}
              </div>
            </FacetGroup>

            <FacetGroup title="Rarity">
              <div className="flex flex-wrap gap-2">
                {RARITY_OPTIONS.map((rarity) => {
                  const active = activeRarities.has(rarity);
                  const count = rarityFacets.get(rarity) ?? 0;
                  return (
                    <button
                      key={rarity}
                      type="button"
                      onClick={() => toggleRarity(rarity)}
                      className={`rounded-[var(--radius-pill)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] transition ${
                        active
                          ? "gradient-pill text-[color:var(--color-text-hero)]"
                          : "border border-white/15 text-[color:var(--color-text-body)] hover:border-white/30"
                      }`}
                    >
                      {rarity}
                      {count ? ` (${count.toLocaleString()})` : ""}
                    </button>
                  );
                })}
              </div>
            </FacetGroup>

            <FacetGroup title="Mana value">
              <div className="flex items-center gap-2 text-sm">
                <input
                  value={cmcMin}
                  onChange={(event) => setCmcMinInput(event.target.value ? Number(event.target.value) : "")}
                  placeholder="Min"
                  className="w-16 rounded-[var(--radius-control)] border border-white/15 bg-black/40 px-2 py-1 text-center text-[color:var(--color-text-body)]"
                  type="number"
                  min={0}
                />
                <span className="text-[color:var(--color-text-subtle)]">to</span>
                <input
                  value={cmcMax}
                  onChange={(event) => setCmcMaxInput(event.target.value ? Number(event.target.value) : "")}
                  placeholder="Max"
                  className="w-16 rounded-[var(--radius-control)] border border-white/15 bg-black/40 px-2 py-1 text-center text-[color:var(--color-text-body)]"
                  type="number"
                  min={0}
                />
                <button
                  type="button"
                  onClick={handleApplyCmc}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] transition hover:border-white/40"
                >
                  Apply
                </button>
              </div>
            </FacetGroup>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-[var(--radius-pill)] border border-white/20 px-4 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] transition hover:border-white/40"
              >
                Clear filters
              </button>
              <span className="text-[color:var(--color-text-subtle)]">
                Showing {cards.length.toLocaleString()} of {pagination.total.toLocaleString()} results
              </span>
            </div>

            {meta.fallback ? (
              <div className="rounded-[var(--radius-control)] border border-dashed border-white/15 bg-white/5 p-3 text-[11px] text-[color:var(--color-text-subtle)]">
                Live Supabase queries will replace the Scryfall demo data once the backend is online.
              </div>
            ) : null}
          </aside>

          <div className="flex flex-col gap-6">
            <CardCatalogGrid cards={cards} isLoading={isLoading} error={error} onRetry={refetch} />

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/40 px-4 py-3 text-xs text-[color:var(--color-text-body)]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, filters.page - 1))}
                  disabled={pagination.page <= 1}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 font-semibold uppercase tracking-[2px] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(pagination.totalPages, filters.page + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 font-semibold uppercase tracking-[2px] disabled:opacity-40"
                >
                  Next
                </button>
                <span>
                  Page {pagination.page} / {pagination.totalPages}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="catalog-page-size" className="uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
                  Per page
                </label>
                <select
                  id="catalog-page-size"
                  value={filters.pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-[var(--radius-control)] border border-white/15 bg-black/40 px-2 py-1 text-[color:var(--color-text-body)]"
                >
                  {[60, 80, 100, 120].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FacetGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">{title}</span>
      {children}
    </div>
  );
}

function limitFacets(facets: CatalogFacet[], limit: number): CatalogFacet[] {
  return facets.slice(0, limit);
}

function buildFacetMap(facets: CatalogFacet[]): Map<string, number> {
  return new Map(facets.map((facet) => [facet.value.toLowerCase(), facet.count]));
}

function buildColorFacetMap(facets: CatalogFacet[]): Map<string, number> {
  const map = new Map<string, number>();
  facets.forEach((facet) => {
    map.set(facet.value.toLowerCase(), facet.count);
  });
  return map;
}

function parseNumberOrNull(value: number | ""): number | null {
  if (value === "") {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

function colorSwatch(code: string): string {
  switch (code.toLowerCase()) {
    case "w":
      return "#F8F4D8";
    case "u":
      return "#8FC7FF";
    case "b":
      return "#3C3A3B";
    case "r":
      return "#F19375";
    case "g":
      return "#85C589";
    case "c":
      return "#E2E8F0";
    default:
      return "#CBD5F5";
  }
}
