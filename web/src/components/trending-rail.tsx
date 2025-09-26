"use client";

import { useMemo } from "react";

import { trackBridgeInitiated } from "@/lib/telemetry";
import { useTrending, type TrendingEntry } from "@/hooks/use-trending";
import { initiateCardBazaarBridge } from "@/services/card-bazaar-bridge";

type CardTrendingEntry = TrendingEntry & {
  card: NonNullable<TrendingEntry["card"]>;
};

export function TrendingRail() {
  const { entries, meta, isLoading, error, refresh } = useTrending({ scope: "card", period: "daily", limit: 6 });

  const cards = useMemo<CardTrendingEntry[]>(
    () =>
      entries
        .filter((entry): entry is CardTrendingEntry => entry.scope === "card" && Boolean(entry.card))
        .slice(0, 6),
    [entries],
  );

  return (
    <section
      id="trending"
      className="border-b border-white/10 bg-[color:var(--color-neutral-200)]/20 py-16"
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Daily trend report
            </p>
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)] sm:text-4xl">
              Cards heating up across Metablazt & Card Bazaar
            </h2>
            <p className="max-w-3xl text-sm text-subtle">
              {meta?.fallback
                ? "Supabase metrics are coming online soon - for now we're highlighting a curated set of standouts so the rail always feels alive."
                : "Scores blend view velocity, deck inclusions, price movement, and inventory pressure. Hover to inspect the data points before pivoting into deeper searches."}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="gradient-pill shadow-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px]"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh snapshot"}
          </button>
        </header>

        {error ? (
          <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-[color:var(--color-text-hero)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {isLoading && cards.length === 0
            ? Array.from({ length: 6 }).map((_, index) => (
                <article
                  key={`trending-skeleton-${index}`}
                  className="surface-card shadow-card flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-4 animate-pulse"
                >
                  <div className="h-[140px] rounded-[14px] bg-white/10" />
                  <div className="h-4 w-3/4 rounded bg-white/15" />
                  <div className="h-3 w-1/2 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/5" />
                </article>
              ))
            : cards.map((entry) => (
                <TrendingCardTile key={entry.subjectId} entry={entry} />
              ))}
        </div>
      </div>
    </section>
  );
}

type TrendingCardTileProps = {
  entry: ReturnType<typeof useTrending>["entries"][number];
};

function TrendingCardTile({ entry }: TrendingCardTileProps) {
  const card = entry.card;
  if (!card) {
    return null;
  }

  const imageSrc = card.image ?? undefined;
  const identity = card.colorIdentity?.length ? card.colorIdentity.join(" / ") : "Colorless";

  const handleBridge = async () => {
    try {
      const result = await initiateCardBazaarBridge({
        type: "card",
        cardId: card.id,
        name: card.name,
        setCode: card.setCode,
      });
      trackBridgeInitiated({
        scope: "card",
        subjectId: card.id,
        destination: "card_bazaar",
        missingCount: Array.isArray(result.missing) ? result.missing.length : undefined,
        bridgeId: result.bridgeId,
      });
    } catch (cause) {
      console.warn("Card Bazaar bridge failed", cause);
    }
  };

  return (
    <article className="surface-card hover:shadow-xl flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 transition-transform duration-150 hover:-translate-y-[2px]">
      <div className="relative h-[140px] overflow-hidden rounded-[14px] border border-white/10 bg-[color:var(--color-neutral-200)]/20">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={card.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[3px] text-subtle">
            No art
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
          Rank {entry.rank}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">{card.name}</h3>
        <p className="text-[11px] uppercase tracking-[3px] text-subtle">
          {card.setCode} - {identity}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[2px] text-subtle">
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Trend score</dt>
          <dd className="text-[color:var(--color-text-hero)] font-semibold">{entry.trendScore.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Views</dt>
          <dd>{Number(entry.components?.views ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Deck inclusions</dt>
          <dd>{Number(entry.components?.deck_inclusions ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Price delta</dt>
          <dd>{formatPercentage(entry.components?.price_growth)}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={handleBridge}
        className="gradient-pill shadow-cta mt-auto rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]"
      >
        Bridge to Card Bazaar
      </button>
    </article>
  );
}

function formatPercentage(value: unknown) {
  let numeric: number | null = null;
  if (typeof value === "number" && Number.isFinite(value)) {
    numeric = value;
  } else if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      numeric = parsed;
    }
  }

  if (numeric === null) {
    return "--";
  }

  const percentage = numeric * 100;
  const formatted = Math.abs(percentage) >= 1 ? percentage.toFixed(1) : percentage.toFixed(2);
  return `${formatted}%`;
}





