"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { fetchCardById, type ScryfallCard } from "@/services/scryfall";

const CARD_ASPECT_RATIO = 488 / 680;

const STAT_BLOCK_CLASS = "rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-6";

export function CardDetailClient({ cardId }: { cardId: string }) {
  const decodedId = decodeURIComponent(cardId ?? "");
  const [card, setCard] = useState<ScryfallCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    if (!decodedId) {
      setError("We couldn't determine which card to load.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    fetchCardById(decodedId, { signal: controller.signal })
      .then((nextCard) => {
        setCard(nextCard);
      })
      .catch((reason) => {
        if (controller.signal.aborted) {
          return;
        }
        const message = reason instanceof Error ? reason.message : "Unable to load this card right now.";
        setError(message);
        setCard(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [decodedId]);

  const oracleParagraphs = useMemo(() => {
    if (!card?.oracle_text) {
      return [];
    }
    return card.oracle_text.split(/\n/).filter((line) => line.trim().length);
  }, [card?.oracle_text]);

  const imageUrl = useMemo(() => {
    if (!card?.image_uris) {
      return null;
    }
    return (
      (card.image_uris.png as string | undefined) ??
      (card.image_uris.large as string | undefined) ??
      (card.image_uris.normal as string | undefined) ??
      null
    );
  }, [card?.image_uris]);

  const legalityEntries = useMemo(() => {
    if (!card?.legalities) {
      return [];
    }
    return Object.entries(card.legalities).filter(([, status]) => status === "legal");
  }, [card?.legalities]);

  if (isLoading) {
    return <CardDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-[color:var(--color-surface-primary)] py-20">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-6 text-center text-sm text-[color:var(--color-text-body)]">
          <h1 className="font-display text-3xl text-[color:var(--color-text-hero)]">Card not available</h1>
          <p>{error}</p>
          <Link
            href="/#cards"
            className="mx-auto inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs uppercase tracking-[3px] text-[color:var(--color-accent-highlight)] transition hover:border-white/40"
          >
            ← Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  if (!card) {
    return null;
  }

  const priceUsd = card.prices?.usd ?? null;
  const priceUsdFoil = card.prices?.usd_foil ?? null;
  const colorIdentity = card.color_identity ?? [];

  return (
    <div className="bg-[color:var(--color-surface-primary)] pb-20">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">
          <Link href="/#cards" className="inline-flex items-center gap-2 text-[color:var(--color-accent-highlight)] transition hover:text-[color:var(--color-text-hero)]">
            <span aria-hidden>{"←"}</span> Back to catalog
          </Link>
          {card.scryfall_uri ? (
            <a
              href={card.scryfall_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[color:var(--color-text-hero)] transition hover:border-white/40"
            >
              View on Scryfall
            </a>
          ) : null}
        </div>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[4px] text-[color:var(--color-accent-highlight)]">
                {card.set_name ?? card.set?.toUpperCase() ?? "Unknown Set"}
              </p>
              <h1 className="font-display text-4xl text-[color:var(--color-text-hero)]">{card.name}</h1>
              <p className="text-sm uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">{card.type_line}</p>
            </header>

            <div className="grid gap-6 lg:grid-cols-2">
              <article className={`${STAT_BLOCK_CLASS} text-sm text-[color:var(--color-text-body)]`}>
                <h2 className="text-xs uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Oracle text</h2>
                {oracleParagraphs.length ? (
                  <div className="mt-3 space-y-3">
                    {oracleParagraphs.map((line, index) => (
                      <p key={`oracle-line-${index}`}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3">No oracle text available.</p>
                )}
              </article>

              <article className={`${STAT_BLOCK_CLASS} grid gap-3 text-sm text-[color:var(--color-text-body)]`}>
                <h2 className="text-xs uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Stats</h2>
                <StatRow label="Mana cost" value={card.mana_cost ?? "-"} />
                <StatRow label="Mana value" value={typeof card.cmc === "number" ? formatManaValue(card.cmc) : "-"} />
                <StatRow label="Colors" value={colorIdentity.length ? colorIdentity.join(" / ") : "Colorless"} />
                <StatRow label="Rarity" value={(card.rarity ?? "").toUpperCase() || "-"} />
                <StatRow label="Collector" value={`${card.collector_number ?? "?"}${card.lang ? ` / ${card.lang.toUpperCase()}` : ""}`} />
                <StatRow label="Prices" value={formatPriceLabel(priceUsd, priceUsdFoil)} />
              </article>
            </div>

            {legalityEntries.length ? (
              <article className={`${STAT_BLOCK_CLASS} text-sm text-[color:var(--color-text-body)]`}>
                <h2 className="mb-3 text-xs uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Legal in</h2>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[2px]">
                  {legalityEntries.map(([format]) => (
                    <span key={format} className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[color:var(--color-text-hero)]">
                      {format}
                    </span>
                  ))}
                </div>
              </article>
            ) : null}
          </div>

          <aside className="flex flex-col items-center gap-6">
            <div
              className="relative w-full max-w-[360px] overflow-hidden rounded-[24px] border border-white/12 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_rgba(7,24,48,0.9))] shadow-[0_30px_60px_-35px_rgba(0,0,0,0.9)]"
              style={{ aspectRatio: CARD_ASPECT_RATIO }}
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={card.name}
                  fill
                  sizes="(max-width: 768px) 70vw, 360px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[color:var(--color-text-subtle)]">
                  Card art unavailable
                </div>
              )}
            </div>
            {card.flavor_text ? (
              <blockquote className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 text-center text-sm italic text-[color:var(--color-text-subtle)]">
                {card.flavor_text}
              </blockquote>
            ) : null}
          </aside>
        </section>
      </div>
    </div>
  );
}

type StatRowProps = {
  label: string;
  value: string | number;
};

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">{label}</span>
      <span className="text-sm text-[color:var(--color-text-hero)]">{value}</span>
    </div>
  );
}

function formatManaValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatPriceLabel(usd: string | null, foil: string | null) {
  const labelParts: string[] = [];
  const normalizedUsd = normalizePrice(usd);
  const normalizedFoil = normalizePrice(foil);
  if (normalizedUsd) {
    labelParts.push(`${normalizedUsd} USD`);
  }
  if (normalizedFoil) {
    labelParts.push(`${normalizedFoil} Foil`);
  }
  return labelParts.length ? labelParts.join(" | ") : "-";
}

function normalizePrice(value: string | null) {
  if (!value) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return `$${numeric.toFixed(2)}`;
}

function CardDetailSkeleton() {
  return (
    <div className="bg-[color:var(--color-surface-primary)] py-20">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">
          <div className="h-5 w-32 rounded bg-white/10" />
          <div className="h-5 w-32 rounded bg-white/10" />
        </div>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-6">
            <div className="space-y-3">
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="h-8 w-2/3 rounded bg-white/10" />
              <div className="h-4 w-1/2 rounded bg-white/5" />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className={STAT_BLOCK_CLASS}>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`oracle-skeleton-${index}`} className="h-3 w-full rounded bg-white/10" />
                  ))}
                </div>
              </div>
              <div className={`${STAT_BLOCK_CLASS} grid grid-cols-2 gap-4`}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`stat-skeleton-${index}`} className="h-3 w-24 rounded bg-white/10" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="h-[480px] w-[320px] rounded-[24px] border border-dashed border-white/20 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
