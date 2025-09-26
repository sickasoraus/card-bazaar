"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useScryfallSearch } from "@/hooks/use-scryfall-search";
import { trackBridgeInitiated, trackCardViewed, trackSearchPerformed } from "@/lib/telemetry";
import { initiateCardBazaarBridge } from "@/services/card-bazaar-bridge";
import type { ScryfallCard } from "@/services/scryfall";

const DEFAULT_QUERY = "game:paper";
const CARD_PLACEHOLDER_COUNT = 8;
const DEFAULT_MANA_FILTER = { min: 0, max: 20 } as const;

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

type PresetOption = {
  label: string;
  baseQuery: string;
  format?: FormatValue;
  colors?: string[];
  mana?: ManaFilter;
};

const PRESET_OPTIONS: PresetOption[] = [
  {
    label: "Modern Izzet Tempo",
    baseQuery: "type:instant OR type:sorcery",
    format: "modern",
    colors: ["U", "R"],
    mana: { min: 0, max: 4 },
  },
  {
    label: "Commander Ramp",
    baseQuery: 'type:creature o:"add"',
    format: "commander",
    colors: ["G"],
    mana: { min: 0, max: 3 },
  },
  {
    label: "Legacy Control",
    baseQuery: "type:instant tag:control",
    format: "legacy",
    colors: ["U"],
    mana: { min: 0, max: 6 },
  },
];

function cloneManaFilter(filter: ManaFilter): ManaFilter {
  return { min: filter.min, max: filter.max };
}

function buildQueryString(
  baseQuery: string,
  format: FormatValue,
  colors: string[],
  mana: ManaFilter,
): string {
  const clauses: string[] = [];
  const trimmedBase = baseQuery.trim();

  clauses.push(trimmedBase.length ? trimmedBase : DEFAULT_QUERY);

  if (format !== "any") {
    clauses.push(`format:${format}`);
  }

  if (colors.length) {
    const sorted = [...colors].sort();
    if (sorted.length === 1 && sorted[0] === "C") {
      clauses.push("coloridentity=c");
    } else {
      const identity = sorted.join("").toLowerCase();
      clauses.push(`coloridentity>=${identity}`);
    }
  }

  if (mana.min > DEFAULT_MANA_FILTER.min) {
    clauses.push(`mv>=${mana.min}`);
  }

  if (mana.max < DEFAULT_MANA_FILTER.max) {
    clauses.push(`mv<=${mana.max}`);
  }

  return clauses.join(" ").replace(/\s+/g, " ").trim();
}

function buildFilterSummary(format: FormatValue, colors: string[], mana: ManaFilter) {
  const tokens: string[] = [];

  if (format !== "any") {
    const option = FORMAT_OPTIONS.find((item) => item.value === format);
    tokens.push(`Format: ${option?.label ?? format}`);
  }

  if (colors.length) {
    const sorted = [...colors].sort();
    const label = sorted
      .map((code) => COLOR_LABELS[code] ?? code)
      .join(" / ");
    tokens.push(`Colors: ${label}`);
  }

  if (mana.min > DEFAULT_MANA_FILTER.min || mana.max < DEFAULT_MANA_FILTER.max) {
    tokens.push(`Mana ${mana.min}-${mana.max}`);
  }

  return tokens.join(" | ");
}

function rarityBadge(rarity?: string) {
  switch (rarity) {
    case "mythic":
      return {
        label: "Mythic",
        className:
          "bg-gradient-to-r from-amber-400/80 to-amber-200/60 text-amber-950 border border-amber-400/70",
      };
    case "rare":
      return {
        label: "Rare",
        className:
          "bg-gradient-to-r from-yellow-300/70 to-yellow-200/40 text-yellow-900 border border-yellow-300/60",
      };
    case "uncommon":
      return {
        label: "Uncommon",
        className:
          "bg-gradient-to-r from-slate-200/70 to-slate-100/50 text-slate-900 border border-slate-200/70",
      };
    default:
      return {
        label: "Common",
        className:
          "bg-gradient-to-r from-white/70 to-white/40 text-slate-800 border border-white/60",
      };
  }
}

function getUsageScore(card: ScryfallCard): number {
  const rank = (card as unknown as { edhrec_rank?: number }).edhrec_rank;
  if (typeof rank === "number" && rank > 0) {
    const normalized = Math.max(0, Math.min(1, 1 - Math.log10(rank) / 4));
    return Math.round(normalized * 100);
  }
  return 35;
}

function getPrice(card: ScryfallCard): string | null {
  const source = card.prices?.usd ?? card.prices?.usd_foil ?? card.prices?.usd_etched ?? null;
  if (!source) {
    return null;
  }
  const parsed = Number.parseFloat(source);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return `$${parsed.toFixed(2)}`;
}

const COLOR_HEX: Record<string, string> = {
  W: "#f8f5e1",
  U: "#8fb7ff",
  B: "#4b4a4f",
  R: "#ff8a7a",
  G: "#73d08b",
  C: "#d1d5db",
};

const COLOR_LABELS: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

function renderColorPips(colors: string[]) {
  if (!colors.length) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] text-[color:var(--color-text-body)]">
        C
      </span>
    );
  }

  return colors.map((color, index) => (
    <span
      key={`${color}-${index}`}
      className="h-6 w-6 rounded-full border border-white/20"
      style={{ background: COLOR_HEX[color] ?? COLOR_HEX.C }}
    />
  ));
}

export function CardGridFrame() {
  const initialQuery = buildQueryString(
    DEFAULT_QUERY,
    "any",
    [],
    cloneManaFilter(DEFAULT_MANA_FILTER),
  );

  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);
  const [selectedFormat, setSelectedFormat] = useState<FormatValue>("any");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [manaFilter, setManaFilter] = useState<ManaFilter>(() => cloneManaFilter(DEFAULT_MANA_FILTER));

  const { data, isLoading, error, params, updateParams } = useScryfallSearch({
    initialQuery,
  });

  const cards = useMemo<ScryfallCard[]>(() => data?.data ?? [], [data]);
  const hasMore = data?.has_more ?? false;
  const totalCards = data?.total_cards;
  const currentPage = params.page ?? 1;

  const filterSummary = useMemo(
    () => buildFilterSummary(selectedFormat, selectedColors, manaFilter),
    [selectedFormat, selectedColors, manaFilter],
  );

  const runSearch = useCallback(
    (base: string, page = 1) => {
      const nextQuery = buildQueryString(base, selectedFormat, selectedColors, manaFilter);
      updateParams({ query: nextQuery, page });
    },
    [selectedFormat, selectedColors, manaFilter, updateParams],
  );

  useEffect(() => {
    runSearch(submittedQuery, 1);
  }, [submittedQuery, selectedFormat, selectedColors, manaFilter, runSearch]);

  const lastTrackedSignature = useRef<string | null>(null);
  useEffect(() => {
    if (!data || isLoading || error) {
      return;
    }
    const page = params.page ?? 1;
    const signature = `${params.query ?? ""}|${page}|${filterSummary}`;
    if (lastTrackedSignature.current === signature) {
      return;
    }
    lastTrackedSignature.current = signature;
    trackSearchPerformed({
      query: params.query,
      page,
      totalResults: data.total_cards,
      filters: filterSummary || undefined,
    });
  }, [data, isLoading, error, params, filterSummary]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      return;
    }
    setSubmittedQuery(trimmed);
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
    setSubmittedQuery(DEFAULT_QUERY);
    setSelectedFormat("any");
    setSelectedColors([]);
    setManaFilter(cloneManaFilter(DEFAULT_MANA_FILTER));
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
    const clamped = Math.max(0, Math.min(20, Number.isNaN(value) ? 0 : value));
    setManaFilter((prev) => {
      const next = { ...prev };
      next[key] = clamped;
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

  const applyPreset = (preset: PresetOption) => {
    setSearchInput(preset.baseQuery);
    setSubmittedQuery(preset.baseQuery);
    setSelectedFormat(preset.format ?? "any");
    setSelectedColors(preset.colors ? [...preset.colors] : []);
    setManaFilter(cloneManaFilter(preset.mana ?? DEFAULT_MANA_FILTER));
  };

  const [featuredCard, ...restCards] = cards;

  return (
    <section id="cards" className="border-b border-white/10 bg-[color:var(--color-surface-primary)] py-16">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Phase 2 Preview
            </span>
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)]">
              Discover stacked highlights and pro-tuned staples
            </h2>
            <p className="max-w-2xl text-sm text-subtle">
              Filters, presets, and usage insights help you move from browsing to brewing without leaving Metablazt.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-right text-xs text-subtle">
            <span>
              Query: <code className="rounded bg-white/5 px-2 py-1 text-[11px] text-[color:var(--color-text-hero)]">{params.query}</code>
            </span>
            <span>
              Page {currentPage}
              {hasMore || currentPage > 1 ? ` - ${hasMore ? "More results available" : "End of results"}` : ""}
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

        <div className="text-[11px] uppercase tracking-[2px] text-subtle">
          {filterSummary.length
            ? ['Filters:', filterSummary].join(' ')
            : "Filters: All formats - All colors - Mana 0-20"}
        </div>

        <div className="surface-card shadow-card flex flex-col gap-5 rounded-[var(--radius-card)] border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-[color:var(--color-text-hero)]">Quick presets</h3>
            <span className="text-xs uppercase tracking-[3px] text-subtle">Tap to explore themed queries</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {PRESET_OPTIONS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[1px]"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[3px] text-subtle">Format</span>
              <div className="flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((option) => {
                  const isActive = selectedFormat === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedFormat(option.value)}
                      className={`rounded-[var(--radius-pill)] px-3 py-2 text-xs font-semibold uppercase tracking-[2px] transition-colors ${
                        isActive
                          ? "gradient-pill shadow-cta text-[color:var(--color-text-hero)]"
                          : "border border-white/10 text-[color:var(--color-text-body)] hover:border-white/25"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
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
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-transform ${
                        isActive
                          ? "border-white/60 bg-white/20 text-[color:var(--color-text-hero)] shadow-card"
                          : "border-white/15 bg-white/5 text-[color:var(--color-text-body)] hover:-translate-y-[1px] hover:border-white/35"
                      }`}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[3px] text-subtle">Mana range</span>
              <div className="flex items-center gap-3 text-xs text-subtle">
                <label className="flex items-center gap-2">
                  <span>Min</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
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
                    max={20}
                    value={manaFilter.max}
                    onChange={(event) => setManaValue("max", Number(event.target.value))}
                    className="w-16 rounded-[var(--radius-control)] border border-white/15 bg-white/5 px-2 py-2 text-xs text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-[var(--radius-control)] border border-dashed border-white/20 bg-white/5 px-4 py-3 text-xs text-subtle">
              <strong className="text-[color:var(--color-text-hero)]">Active filters:</strong> {filterSummary || "None yet - defaults to the raw Scryfall query."}
            </div>
          </div>
        </div>

        {featuredCard ? (
          <FeaturedCardShowcase card={featuredCard} queryContext={params.query} />
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading && restCards.length === 0
            ? Array.from({ length: CARD_PLACEHOLDER_COUNT }).map((_, index) => (
                <article
                  key={`card-placeholder-${index}`}
                  className="surface-card shadow-card flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-5 animate-pulse"
                >
                  <div className="relative h-64 overflow-hidden rounded-[18px] bg-white/5" />
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                  <div className="mt-auto h-3 w-full rounded bg-white/5" />
                </article>
              ))
            : restCards.map((card) => (
                <StackedCardTile key={card.id} card={card} queryContext={params.query} />
              ))}
        </div>

        <footer className="flex flex-col items-center justify-between gap-4 rounded-[var(--radius-card)] border border-white/10 bg-white/5 px-4 py-4 text-xs text-subtle sm:flex-row">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <span>
              Showing page {currentPage}
              {totalCards ? ` - ${totalCards.toLocaleString()} cards` : ""}
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

type FeaturedCardProps = {
  card: ScryfallCard;
  queryContext: string;
};

function FeaturedCardShowcase({ card, queryContext }: FeaturedCardProps) {
  const artCrop = card.image_uris?.art_crop ?? card.image_uris?.border_crop ?? card.image_uris?.normal;
  const usage = getUsageScore(card);
  const price = getPrice(card);
  const rarity = rarityBadge(card.rarity);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeMessage, setBridgeMessage] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const handleView = () => {
    trackCardViewed({ cardId: card.id, context: queryContext });
  };

  const handleBridge = async () => {
    setIsBridging(true);
    setBridgeMessage(null);
    setBridgeError(null);

    try {
      const result = await initiateCardBazaarBridge({
        type: "card",
        cardId: card.id,
        name: card.name,
        setCode: card.set ?? null,
        setName: card.set_name ?? null,
        price,
      });
      trackBridgeInitiated({
        scope: "card",
        subjectId: card.id,
        destination: "card_bazaar",
        missingCount: Array.isArray(result.missing) ? result.missing.length : undefined,
        bridgeId: result.bridgeId,
      });
      const summary = result.summary ? ` ${result.summary}` : "";
      setBridgeMessage(`${result.message ?? "Card Bazaar bridge saved."}${summary}`.trim());
    } catch (error) {
      setBridgeError(error instanceof Error ? error.message : "Failed to reach bridge endpoint.");
    } finally {
      setIsBridging(false);
    }
  };

  if (!artCrop) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[color:var(--color-neutral-100)]/80 via-[color:var(--color-neutral-200)]/60 to-[color:var(--color-surface-primary)]/90 p-8">
      <div className="absolute inset-0 -z-10 opacity-40 blur-3xl" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artCrop} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr),320px]">
        <div className="flex flex-col gap-6">
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[3px] text-[color:var(--color-text-hero)]">
            Featured highlight
          </span>
          <h3 className="font-display text-4xl text-[color:var(--color-text-hero)]">{card.name}</h3>
          <p className="text-sm text-subtle">{card.oracle_text ?? "No rules text available."}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-subtle">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
              {card.type_line}
            </span>
            {price ? (
              <span className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-[color:var(--color-text-hero)]">
                Market {price}
              </span>
            ) : null}
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] ${rarity.className}`}
            >
              {rarity.label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-subtle">
              <span>Usage</span>
              <div className="relative h-2 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--color-accent-start)] to-[color:var(--color-accent-end)]"
                  style={{ width: `${Math.min(usage, 100)}%` }}
                />
              </div>
              <span className="text-[color:var(--color-text-hero)] font-semibold">{usage}%</span>
            </div>
            <div className="flex items-center gap-1">{renderColorPips(card.color_identity ?? [])}</div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleView}
              className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]"
            >
              Inspect card
            </button>
            <button
              type="button"
              onClick={handleBridge}
              disabled={isBridging}
              className="rounded-[var(--radius-pill)] border border-dashed border-white/25 px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-body)] transition-opacity hover:border-white/40 disabled:opacity-50"
            >
              {isBridging ? "Bridging..." : "Card Bazaar Bridge (preview)"}
            </button>
          </div>
          {bridgeMessage ? (
            <p className="rounded-[var(--radius-control)] border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs text-[color:var(--color-text-hero)]">
              {bridgeMessage}
            </p>
          ) : null}
          {bridgeError ? (
            <p className="rounded-[var(--radius-control)] border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-[color:var(--color-text-hero)]">
              {bridgeError}
            </p>
          ) : null}
        </div>
        <div className="relative mx-auto h-[420px] w-[300px]">
          <div className="absolute inset-0 translate-x-[22px] translate-y-[18px] rotate-6 rounded-[24px] border border-white/10 bg-white/10 blur-sm" aria-hidden="true" />
          <div className="absolute inset-0 -translate-x-[18px] -translate-y-[22px] -rotate-3 rounded-[24px] border border-white/10 bg-white/10 blur-sm" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artCrop}
            alt={card.name}
            className="relative h-full w-full rounded-[24px] border border-white/20 object-cover shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}

function StackedCardTile({ card, queryContext }: { card: ScryfallCard; queryContext: string }) {
  const artCrop = card.image_uris?.art_crop ?? card.image_uris?.border_crop ?? card.image_uris?.normal;
  const usage = getUsageScore(card);
  const price = getPrice(card);
  const rarity = rarityBadge(card.rarity);
  const detailLink = {
    pathname: "/cards/[cardId]",
    query: { cardId: card.id },
  } as const;

  const handleView = () => {
    trackCardViewed({ cardId: card.id, context: queryContext });
  };

  return (
    <Link
      href={detailLink}
      prefetch={false}
      onClick={handleView}
      className="surface-card group relative flex h-full flex-col gap-4 overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-5 transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-highlight)]"
    >
      <div className="relative h-56">
        <div className="absolute inset-0 translate-x-[14px] translate-y-[16px] rotate-[6deg] rounded-[22px] border border-white/10 bg-[color:var(--color-neutral-100)]/40 transition duration-300 group-hover:translate-x-[18px] group-hover:translate-y-[18px] group-hover:rotate-[9deg]" aria-hidden="true" />
        <div className="absolute inset-0 -translate-x-[10px] -translate-y-[12px] -rotate-[4deg] rounded-[22px] border border-white/10 bg-[color:var(--color-neutral-200)]/30 transition duration-300 group-hover:-translate-x-[14px] group-hover:-translate-y-[14px] group-hover:-rotate-[7deg]" aria-hidden="true" />
        {artCrop ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={artCrop}
            alt={card.name}
            className="absolute inset-0 h-full w-full rounded-[22px] border border-white/15 object-cover shadow-xl transition duration-300 group-hover:shadow-2xl"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center rounded-[22px] border border-dashed border-white/15 bg-white/5 text-xs uppercase tracking-[3px] text-subtle">
            Art unavailable
          </div>
        )}
        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] ${rarity.className}`}
        >
          {rarity.label}
        </span>
        <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
          {card.set_name ?? card.set}
        </span>
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-[color:var(--color-text-hero)]">
          {renderColorPips(card.color_identity ?? [])}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="font-display text-xl text-[color:var(--color-text-hero)]">{card.name}</h4>
        <p className="text-[11px] uppercase tracking-[3px] text-subtle">{card.type_line}</p>
      </div>
      {card.oracle_text ? (
        <p className="line-clamp-3 text-xs text-subtle">{summarizeOracleText(card.oracle_text)}</p>
      ) : null}
      <div className="mt-auto flex flex-col gap-3 text-xs text-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Usage</span>
            <div className="relative h-2 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--color-accent-start)] to-[color:var(--color-accent-end)]"
                style={{ width: `${Math.min(usage, 100)}%` }}
              />
            </div>
            <span className="text-[color:var(--color-text-hero)] font-semibold">{usage}%</span>
          </div>
          {price ? (
            <span className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-3 py-1 text-[color:var(--color-text-hero)]">
              {price}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[2px] text-subtle">
          <span>{card.mana_cost ?? ""}</span>
          <span>#{card.collector_number ?? "?"}</span>
        </div>
      </div>
    </Link>
  );
}

function summarizeOracleText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const preview = lines.slice(0, 3).join(" ");
  return lines.length > 3 ? `${preview}...` : preview;
}



























