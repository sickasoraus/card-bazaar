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
        className="grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        aria-live="polite"
      >
        {cards.map((card) => (
          <CatalogCardTile key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function CatalogCardTile({ card }: { card: CatalogCard }) {
  const detailHref = {
    pathname: "/cards/[cardId]",
    query: { cardId: card.id },
  } as const;

  const colors = card.colorIdentity.length ? card.colorIdentity : card.colors;

  return (
    <article className="surface-card hover:shadow-lg flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/70 p-4 transition-transform duration-150 hover:-translate-y-1">
      <Link
        href={detailHref}
        prefetch={false}
        className="group flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-highlight)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <div
          className="relative overflow-hidden rounded-[12px] border border-white/10 bg-black/40"
          style={{ paddingTop: "139.5%" }}
        >
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt={card.name}
              fill
              sizes="(max-width: 768px) 45vw, (max-width: 1280px) 22vw, 12vw"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              priority={false}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-xs text-[color:var(--color-text-subtle)]">
              Image unavailable
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-right">
            <span className="font-display text-sm text-[color:var(--color-text-hero)]">{card.manaCost ?? "--"}</span>
          </div>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-left text-base font-semibold text-[color:var(--color-text-hero)] transition-colors group-hover:text-[color:var(--color-accent-highlight)]">
              {card.name}
            </span>
            <span className="text-[11px] uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">{card.typeLine}</span>
          </div>
          <ColorPips colors={colors} />
        </div>
        <p className="line-clamp-3 text-sm text-[color:var(--color-text-subtle)]">{card.oracleText ?? "No rules text"}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
          <span className="rounded-full border border-white/10 px-2 py-1 text-[color:var(--color-text-body)]">{card.setCode || "SET"}</span>
          <span className="rounded-full border border-white/10 px-2 py-1 text-[color:var(--color-text-body)]">{card.rarity}</span>
          {card.formats.slice(0, 3).map((format) => (
            <span key={format} className="rounded-full border border-white/10 px-2 py-1 text-[color:var(--color-text-body)]">
              {format}
            </span>
          ))}
        </div>
      </Link>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--color-text-subtle)]">{formatPrice(card.priceLow, card.priceHigh)}</span>
        <Link
          href={detailHref}
          prefetch={false}
          className="rounded-[var(--radius-pill)] border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-accent-highlight)] transition hover:border-white/40"
        >
          View details
        </Link>
      </div>
    </article>
  );
}

function CatalogSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[color:var(--color-neutral-100)]/40">
      <div className="grid w-full max-w-[960px] gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={`catalog-skeleton-${index}`}
            className="h-64 animate-pulse rounded-[var(--radius-card)] bg-[color:var(--color-neutral-200)]/40"
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
