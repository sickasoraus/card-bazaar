"use client";

import Link from "next/link";

import Image from "next/image";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

import type { CatalogCard } from "@/types/catalog";

const GAP_PX = 24;
const CARD_ASPECT_RATIO = 1.395; // MTG card proportion

export type CardCatalogGridProps = {
  cards: CatalogCard[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  onCardClick?: (card: CatalogCard) => void;
  emptyMessage?: string;
};

export function CardCatalogGrid({
  cards,
  isLoading,
  error,
  onRetry,
  onCardClick,
  emptyMessage = "No cards match the current filters.",
}: CardCatalogGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useResizeObserver(scrollRef, setContainerWidth);

  const columnCount = useMemo(() => determineColumnCount(containerWidth), [containerWidth]);
  const rowCount = Math.max(1, Math.ceil(cards.length / columnCount));

  const cardDimensions = useMemo(() => {
    if (!containerWidth || columnCount === 0) {
      return { width: 0, height: 0 };
    }
    const totalGap = GAP_PX * (columnCount - 1);
    const width = Math.max(160, (containerWidth - totalGap) / columnCount);
    const height = width * CARD_ASPECT_RATIO + 96;
    return { width, height };
  }, [columnCount, containerWidth]);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => cardDimensions.height || 400,
    overscan: 6,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const renderRow = useCallback(
    (virtualRow: VirtualItem) => {
      const rowIndex = virtualRow.index;
      const start = rowIndex * columnCount;
      const rowCards = cards.slice(start, start + columnCount);
      if (!rowCards.length) {
        return null;
      }
      return (
        <div
          key={virtualRow.key}
          style={{
            position: "absolute",
            top: `${virtualRow.start}px`,
            left: 0,
            width: "100%",
            height: `${(virtualRow.size ?? cardDimensions.height)}px`,
          }}
        >
          <div
            className="grid"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
              gap: GAP_PX,
              paddingBottom: GAP_PX,
            }}
          >
            {rowCards.map((card) => (
              <CatalogCardTile key={card.id} card={card} onClick={onCardClick} />
            ))}
          </div>
        </div>
      );
    },
    [cards, columnCount, onCardClick, cardDimensions.height],
  );

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
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="relative h-[720px] overflow-y-auto rounded-[var(--radius-card)] border border-white/10 bg-white/5"
      style={{ scrollBehavior: "smooth" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {virtualRows.map((virtualRow) => renderRow(virtualRow))}
      </div>
      {isLoading && cards.length === 0 ? <CatalogSkeleton /> : null}
    </div>
  );
}

function CatalogCardTile({ card, onClick }: { card: CatalogCard; onClick?: (card: CatalogCard) => void }) {
  const detailHref = {
    pathname: "/cards/[cardId]",
    query: { cardId: card.id },
  } as const;

  const handleNavigate = useCallback(() => {
    onClick?.(card);
  }, [card, onClick]);

  const colors = card.colorIdentity.length ? card.colorIdentity : card.colors;

  return (
    <article className="surface-card hover:shadow-lg flex h-full flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/70 p-4 transition-transform duration-150 hover:-translate-y-1">
      <Link
        href={detailHref}
        prefetch={false}
        onClick={handleNavigate}
        className="group flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-highlight)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <div
          className="relative overflow-hidden rounded-[12px] border border-white/10 bg-black/40"
          style={{ paddingTop: `${CARD_ASPECT_RATIO * 100}%` }}
        >
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt={card.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
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
        <span className="text-[color:var(--color-text-subtle)]">
          {`${formatPrice(card.priceLow)} - ${formatPrice(card.priceHigh)}`}
        </span>
        <Link
          href={detailHref}
          prefetch={false}
          onClick={handleNavigate}
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
      <div className="grid w-full max-w-[640px] gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
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
function determineColumnCount(width: number): number {
  if (width >= 1440) {
    return 5;
  }
  if (width >= 1180) {
    return 4;
  }
  if (width >= 860) {
    return 3;
  }
  return width > 0 ? 2 : 0;
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
    default:
      return "#E2E8F0";
  }
}

function formatPrice(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }
  const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(2);
  return `${formatted}`;
}

function useResizeObserver(ref: RefObject<HTMLElement | null>, onResize: (width: number) => void) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width != null) {
        onResize(entry.contentRect.width);
      }
    });
    observer.observe(element);
    onResize(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref, onResize]);
}
