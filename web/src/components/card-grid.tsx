"use client";

import { useMemo, useState } from "react";
import { useScryfallSearch } from "@/hooks/use-scryfall-search";
import type { ScryfallCard } from "@/services/scryfall";

const DEFAULT_QUERY = "game:paper";
const CARD_PLACEHOLDER_COUNT = 8;

const FORMAT_OPTIONS = [
  { value: "any" as const, label: "Any" },
  { value: "standard" as const, label: "Standard" },
  { value: "pioneer" as const, label: "Pioneer" },
  { value: "modern" as const, label: "Modern" },
  { value: "legacy" as const, label: "Legacy" },
  { value: "commander" as const, label: "Commander" },
];

const COLOR_OPTIONS = [
  { value: "W", label: "W" },
  { value: "U", label: "U" },
  { value: "B", label: "B" },
  { value: "R", label: "R" },
  { value: "G", label: "G" },
  { value: "C", label: "C" },
];

type FormatValue = (typeof FORMAT_OPTIONS)[number]["value"];
type ManaFilter = { min: number; max: number };

const DEFAULT_MANA_FILTER: ManaFilter = { min: 0, max: 7 };

export function CardGridFrame() {
  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY);
  const [selectedFormat, setSelectedFormat] = useState<FormatValue>("any");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [manaFilter, setManaFilter] = useState<ManaFilter>(DEFAULT_MANA_FILTER);

  const { data, isLoading, error, params, updateParams } = useScryfallSearch({
    initialQuery: DEFAULT_QUERY,
  });

  const cards = useMemo<ScryfallCard[]>(() => data?.data ?? [], [data]);
  const hasMore = data?.has_more ?? false;
  const totalCards = data?.total_cards;
  const currentPage = params.page ?? 1;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      return;
    }
    updateParams({ query: trimmed, page: 1 });
  };

  const handleNextPage = () => {
    if (hasMore) {
      updateParams({ page: currentPage + 1 });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      updateParams({ page: currentPage - 1 });
    }
  };

  const handleReset = () => {
    setSearchInput(DEFAULT_QUERY);
    setSelectedFormat("any");
    setSelectedColors([]);
    setManaFilter(DEFAULT_MANA_FILTER);
    updateParams({ query: DEFAULT_QUERY, page: 1 });
  };

  const toggleColor = (code: string) => {
    setSelectedColors((prev) => {
      if (prev.includes(code)) {
        return prev.filter((value) => value !== code);
      }
      return [...prev, code];
    });
  };

  const setManaValue = (key: keyof ManaFilter, value: number) => {
    const clamped = Math.max(0, Math.min(15, Number.isNaN(value) ? 0 : value));
    setManaFilter((prev) => {
      const next = { ...prev, [key]: clamped } as ManaFilter;
      if (next.min > next.max) {
        if (key === "min") {
          next.max = clamped;
        } else {
          next.min = clamped;
        }
      }
      return next;
    });
  };

  const activeFilterSummary = buildFilterSummary(selectedFormat, selectedColors, manaFilter);

  return (
    <section id="cards" className="pb-20">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-6">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Live Scryfall Data
            </p>
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)] sm:text-4xl">
              Search the MTG multiverse without leaving Metablazt
            </h2>
            <p className="max-w-2xl text-sm text-subtle">
              Powered by Scryfall&apos;s API. We will layer in personalization, Card Bazaar inventory, and Supabase persistence next.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-subtle lg:items-end">
            <span>
              Query: <code className="rounded bg-white/5 px-2 py-1 text-[11px] text-[color:var(--color-text-hero)]">{params.query}</code>
            </span>
            <span>
              Page {currentPage}
              {hasMore || currentPage > 1 ? ` - ${totalCards ?? "..."} cards total` : ""}
            </span>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="surface-card shadow-card flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-6 sm:flex-row sm:items-center"
        >
          <label className="flex-1">
            <span className="sr-only">Search cards</span>
            <input
              className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[color:var(--color-text-hero)] placeholder:text-subtle focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
              placeholder="Search Scryfall syntax e.g. type:creature t:legendary"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
          <div className="flex flex-none items-center gap-3">
            <button
              type="submit"
              className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-6 py-3 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px]"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-[var(--radius-control)] border border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/25"
            >
              Reset
            </button>
          </div>
        </form>

        <aside className="surface-card shadow-card flex flex-col gap-6 rounded-[var(--radius-card)] border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-[color:var(--color-text-hero)]">Filter preview</h3>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">
              Coming soon
            </span>
          </div>
          <p className="text-xs text-subtle">
            These controls capture format, color identity, and mana preferences so we can wire them into the Scryfall query builder in the next sprint.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[3px] text-subtle">Format</span>
              <div className="flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedFormat(option.value)}
                    className={`rounded-[var(--radius-pill)] px-3 py-2 text-xs font-semibold uppercase tracking-[2px] transition-colors ${
                      selectedFormat === option.value
                        ? "gradient-pill shadow-cta text-[color:var(--color-text-hero)]"
                        : "border border-white/10 text-[color:var(--color-text-body)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[3px] text-subtle">Color identity</span>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((option) => {
                  const isActive = selectedColors.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleColor(option.value)}
                      className={`h-9 w-9 rounded-full border text-xs font-semibold transition-colors ${
                        isActive
                          ? "border-white/0 gradient-pill text-[color:var(--color-text-hero)]"
                          : "border-white/15 text-[color:var(--color-text-body)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[3px] text-subtle">Mana value (CMC)</span>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-xs text-subtle">
                <span>Min</span>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={manaFilter.min}
                  onChange={(event) => setManaValue("min", Number(event.target.value))}
                  className="w-16 rounded-[var(--radius-control)] border border-white/15 bg-white/5 px-2 py-2 text-xs text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-subtle">
                <span>Max</span>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={manaFilter.max}
                  onChange={(event) => setManaValue("max", Number(event.target.value))}
                  className="w-16 rounded-[var(--radius-control)] border border-white/15 bg-white/5 px-2 py-2 text-xs text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                />
              </label>
            </div>
          </div>
          <div className="rounded-[var(--radius-control)] border border-dashed border-white/20 bg-white/5 px-4 py-3 text-xs text-subtle">
            <strong className="text-[color:var(--color-text-hero)]">Active filters:</strong> {activeFilterSummary || "None yet – defaults to the raw Scryfall query."}
          </div>
        </aside>

        {error ? (
          <div className="surface-card shadow-card rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-6 text-sm text-[color:var(--color-text-hero)]">
            <p className="font-semibold uppercase tracking-[3px]">Scryfall request failed</p>
            <p className="mt-2 text-subtle">{error.message}</p>
            <button
              type="button"
              onClick={() => updateParams({})}
              className="mt-4 rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)]"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading && cards.length === 0
            ? Array.from({ length: CARD_PLACEHOLDER_COUNT }).map((_, index) => (
                <article
                  key={`placeholder-${index}`}
                  className="surface-card shadow-card flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-5 animate-pulse"
                >
                  <div className="h-[220px] rounded-[12px] bg-white/10" />
                  <div className="h-6 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                  <div className="mt-auto h-3 w-full rounded bg-white/5" />
                </article>
              ))
            : cards.map((card) => <CardTile key={card.id} card={card} />)}
        </div>

        <footer className="flex flex-col items-center justify-between gap-4 rounded-[var(--radius-card)] border border-white/10 bg-white/5 px-4 py-4 text-xs text-subtle sm:flex-row">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <span>
              Showing page {currentPage}
              {totalCards ? ` of roughly ${totalCards.toLocaleString()} cards` : ""}
            </span>
            {data?.warnings?.length ? (
              <span className="rounded-full bg-[color:var(--color-accent-highlight)]/20 px-3 py-1 text-[11px] text-[color:var(--color-text-hero)]">
                {data.warnings[0]}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isLoading}
              className="rounded-[var(--radius-pill)] border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] transition-opacity disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!hasMore || isLoading}
              className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-opacity disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}

type CardTileProps = {
  card: ScryfallCard;
};

function CardTile({ card }: CardTileProps) {
  const artCrop =
    card.image_uris?.art_crop || card.image_uris?.border_crop || card.image_uris?.normal;

  const oraclePreview = card.oracle_text
    ? summarizeOracleText(card.oracle_text)
    : null;

  return (
    <article className="surface-card shadow-card group flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="relative h-[220px] overflow-hidden rounded-[12px] bg-[linear-gradient(160deg,var(--color-neutral-300)_0%,var(--color-neutral-100)_100%)]">
        {artCrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artCrop}
            alt={card.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[4px] text-[color:var(--color-text-hero)]/70">
            Art Preview
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-[color:var(--color-accent-highlight)]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[3px] text-[color:var(--color-neutral-100)]">
          {card.set_name ?? "Unknown Set"}
        </span>
        <span className="absolute bottom-4 left-4 text-xs uppercase tracking-[4px] text-[color:var(--color-text-hero)]/80">
          #{card.collector_number ?? "?"}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-xl text-[color:var(--color-text-hero)]">{card.name}</h3>
        <p className="text-xs uppercase tracking-[4px] text-subtle">{card.type_line}</p>
      </div>
      {oraclePreview ? <p className="text-xs text-subtle">{oraclePreview}</p> : null}
      <div className="mt-auto flex items-center justify-between text-xs text-subtle">
        <span>{card.mana_cost ?? ""}</span>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-semibold uppercase tracking-[3px] text-[10px] text-[color:var(--color-text-hero)]">
          {card.rarity ?? "-"}
        </span>
      </div>
    </article>
  );
}

function summarizeOracleText(text: string) {
  const lines = text.split("\n");
  const preview = lines.slice(0, 3).join(" ");
  return lines.length > 3 ? `${preview} ...` : preview;
}

function buildFilterSummary(format: FormatValue, colors: string[], mana: ManaFilter) {
  const summary: string[] = [];

  if (format !== "any") {
    summary.push(`Format ${format}`);
  }
  if (colors.length) {
    summary.push(`Colors ${colors.sort().join("")}`);
  }
  if (mana.min !== DEFAULT_MANA_FILTER.min || mana.max !== DEFAULT_MANA_FILTER.max) {
    summary.push(`Mana ${mana.min}-${mana.max}`);
  }

  return summary.join(" | ");
}

