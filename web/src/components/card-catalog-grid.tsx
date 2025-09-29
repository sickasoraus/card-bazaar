
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

const CARD_ASPECT_RATIO = 488 / 680;

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
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))" }}
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

  return (
    <article className="flex flex-col gap-3">
      <Link
        href={detailHref}
        prefetch={false}
        className="group relative block overflow-hidden rounded-[18px] border border-white/15 bg-black/40 shadow-[0_14px_40px_-20px_rgba(0,0,0,0.85)] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9)]"
        style={{ aspectRatio: `${CARD_ASPECT_RATIO}` }}
      >
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.name}
            fill
            sizes="(max-width: 768px) 90vw, (max-width: 1280px) 36vw, 24vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.04]"
            priority={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-black/50 text-xs text-[color:var(--color-text-subtle)]">
            Image unavailable
          </div>
        )}
      </Link>
      <Link
        href={detailHref}
        prefetch={false}
        className="text-center text-sm font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors duration-150 hover:text-[color:var(--color-accent-highlight)]"
      >
        {card.name}
      </Link>
    </article>
  );
}

function CatalogSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[color:var(--color-neutral-100)]/55">
      <div className="grid w-full max-w-[1200px] gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))" }}>
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={`catalog-skeleton-${index}`}
            className="h-[360px] animate-pulse rounded-[18px] border border-white/10 bg-[color:var(--color-neutral-200)]/40"
          />
        ))}
      </div>
    </div>
  );
}
