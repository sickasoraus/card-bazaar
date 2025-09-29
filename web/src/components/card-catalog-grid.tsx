"use client";

import Image from "next/image";
import Link from "next/link";

import type { CatalogCard } from "@/types/catalog";

type CardCatalogGridProps = {
  cards: CatalogCard[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
};

export function CardCatalogGrid({ cards, isLoading, error, onRetry }: CardCatalogGridProps) {
  if (error && !isLoading) {
    return (
      <div className="surface-card rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-6 text-sm text-[color:var(--color-text-hero)]">
        <p>{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition hover:border-white/40"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!cards.length && !isLoading) {
    return (
      <div className="surface-card rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-6 text-sm text-[color:var(--color-text-subtle)]">
        No cards match the current filters.
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading ? <CatalogSkeleton /> : null}
      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        aria-live="polite"
      >
        {cards.map((card, index) => (
          <CatalogCardTile key={card.id} card={card} index={index} />
        ))}
      </div>
    </div>
  );
}

function CatalogCardTile({ card, index }: { card: CatalogCard; index: number }) {
  const detailHref = {
    pathname: "/cards/[cardId]",
    query: { cardId: card.id },
  } as const;
  const externalHref =
    typeof card.scryfallUri === "string" && card.scryfallUri.length ? card.scryfallUri : null;
  const isExternal = Boolean(externalHref);
  const colors = card.colorIdentity.length ? card.colorIdentity : card.colors;
  const rankLabel = `#${index + 1}`;
  const priceLabel = formatPrice(card.priceLow, card.priceHigh);
  const usageLabel = formatUsage(card);
  const formatsLabel =
    card.formats.slice(0, 3).map((format) => format.toUpperCase()).join(" / ") || "--";
  const colorsLabel = colors.length ? colors.map((value) => value.toUpperCase()).join("") : "C";
  const rarityLabel = card.rarity ? card.rarity.toUpperCase() : "UNKNOWN";
  const linkClassName =
    "group relative flex flex-col gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-highlight)] focus-visible:ring-offset-2 focus-visible:ring-offset-black";

  const linkContent = (
    <>
      <div
        className="relative overflow-hidden rounded-[16px] border border-white/10 bg-black/40 shadow-lg"
        style={{ paddingTop: "140%" }}
      >
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 24vw, 14vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.06]"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs text-[color:var(--color-text-subtle)]">
            Image unavailable
          </div>
        )}
        <span className="absolute left-4 top-4 inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-[color:var(--color-accent-highlight)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-black shadow-lg">
          {rankLabel}
        </span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 text-right">
          <span className="font-display text-sm text-[color:var(--color-text-hero)]">{card.manaCost ?? "--"}</span>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-left text-lg font-semibold text-[color:var(--color-text-hero)] transition-colors duration-150 group-hover:text-[color:var(--color-accent-highlight)]">
            {card.name}
          </span>
          <span className="text-[11px] uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">
            {card.typeLine}
          </span>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
            <span className="rounded-full border border-white/10 px-2 py-1 text-[color:var(--color-text-body)]">
              {rarityLabel}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[color:var(--color-text-body)]">
              {card.setCode || "SET"}
            </span>
          </div>
        </div>
        <ColorPips colors={colors} />
      </div>
      <p className="line-clamp-3 text-sm text-[color:var(--color-text-subtle)]">{card.oracleText ?? "No rules text"}</p>
    </>
  );
  const viewDetailsClass =
    "rounded-[var(--radius-pill)] border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-accent-highlight)] transition hover:border-white/40";

  return (
    <article className="surface-card flex h-full flex-col gap-5 rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/75 p-5 shadow-[0_22px_60px_-32px_rgba(0,0,0,0.9)] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[0_28px_75px_-28px_rgba(0,0,0,0.95)]">
      {isExternal && externalHref ? (
        <a href={externalHref} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {linkContent}
        </a>
      ) : (
        <Link href={detailHref} prefetch={false} className={linkClassName}>
          {linkContent}
        </Link>
      )}
      <div className="mt-auto flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between text-[color:var(--color-text-subtle)]">
          <span className="font-semibold text-[color:var(--color-text-body)]">{priceLabel}</span>
          <span className="text-[11px] uppercase tracking-[2px]">{usageLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          <StatPill label="Formats" value={formatsLabel} />
          <StatPill label="Colors" value={colorsLabel} />
          <StatPill label="Rarity" value={rarityLabel} />
        </div>
        {isExternal && externalHref ? (
          <a href={externalHref} target="_blank" rel="noopener noreferrer" className={viewDetailsClass}>
            View details
          </a>
        ) : (
          <Link href={detailHref} prefetch={false} className={viewDetailsClass}>
            View details
          </Link>
        )}
      </div>
    </article>
  );
}


function CatalogSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[color:var(--color-neutral-100)]/60">
      <div className="grid w-full max-w-[1280px] gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`catalog-skeleton-${index}`}
            className="h-[460px] animate-pulse rounded-[var(--radius-card)] bg-[color:var(--color-neutral-200)]/35"
          />
        ))}
      </div>
    </div>
  );
}

function ColorPips({ colors }: { colors: string[] }) {
  if (!colors.length) {
    return (
      <span className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
        Colorless
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {colors.map((color) => (
        <span
          key={color}
          className="grid h-6 w-6 place-items-center rounded-full border border-white/20 text-[11px] font-semibold text-black"
          style={{ backgroundColor: colorToHex(color) }}
        >
          {color.toUpperCase()}
        </span>
      ))}
    </div>
  );
}

function colorToHex(color: string): string {
  switch (color.toLowerCase()) {
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

function formatPrice(low: number | null, high: number | null): string {
  const lowLabel = normalizePrice(low);
  const highLabel = normalizePrice(high);
  if (lowLabel && highLabel && lowLabel !== highLabel) {
    return `${lowLabel} - ${highLabel}`;
  }
  return lowLabel ?? highLabel ?? "--";
}

function normalizePrice(value: number | null): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(2);
  return `$${formatted}`;
}


function formatUsage(card: CatalogCard): string {
  if (typeof card.edhrecRank === "number" && Number.isFinite(card.edhrecRank)) {
    return `EDHREC #${card.edhrecRank.toLocaleString()}`;
  }
  if (typeof card.popularity === "number" && Number.isFinite(card.popularity)) {
    return `Deck score ${Math.round(card.popularity)}`;
  }
  return "Usage coming soon";
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)]">
      {label}: {value}
    </span>
  );
}
