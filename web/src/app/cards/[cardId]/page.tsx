
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";

import { fetchCardById, type ScryfallCard } from "@/services/scryfall";

const CARD_ASPECT_RATIO = 488 / 680;
export const revalidate = 3600;

const getCard = cache(async (rawId: string): Promise<ScryfallCard> => {
  const decoded = decodeURIComponent(rawId);
  try {
    return await fetchCardById(decoded);
  } catch (error) {
    throw error;
  }
});

type CardDetailPageProps = {
  params: Promise<{ cardId: string }>;
};

export async function generateMetadata({ params }: CardDetailPageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const card = await getCard(resolvedParams.cardId);
    return {
      title: `${card.name} | Metablazt`,
      description: card.type_line ?? undefined,
      openGraph: {
        title: `${card.name} | Metablazt`,
        description: card.oracle_text ?? undefined,
        images: card.image_uris?.large ? [{ url: card.image_uris.large, width: 680, height: 488 }] : undefined,
      },
    };
  } catch {
    return {
      title: "Card | Metablazt",
    };
  }
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const resolvedParams = await params;
  let card: ScryfallCard;
  try {
    card = await getCard(resolvedParams.cardId);
  } catch {
    notFound();
  }

  const imageUrl =
    (card.image_uris?.png as string | undefined) ??
    (card.image_uris?.large as string | undefined) ??
    (card.image_uris?.normal as string | undefined) ??
    null;

  const colorIdentity = card.color_identity ?? [];
  const legalityEntries =
    card.legalities ? Object.entries(card.legalities).filter(([, status]) => status === "legal") : [];
  const oracleParagraphs = (card.oracle_text ?? "").split(/\n/).filter((line) => line.trim().length);
  const priceUsd = card.prices?.usd ?? null;
  const priceUsdFoil = card.prices?.usd_foil ?? null;

  return (
    <div className="bg-[color:var(--color-surface-primary)] pb-20">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">
          <Link href="/#cards" className="inline-flex items-center gap-2 text-[color:var(--color-accent-highlight)] transition hover:text-[color:var(--color-text-hero)]">
            <span aria-hidden>{'<'}</span> Back to catalog
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
              <article className="space-y-4 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-6 text-sm text-[color:var(--color-text-body)]">
                <h2 className="text-xs uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Oracle text</h2>
                {oracleParagraphs.length ? (
                  <div className="space-y-3">
                    {oracleParagraphs.map((line, index) => (
                      <p key={`oracle-line-${index}`}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p>No oracle text available.</p>
                )}
              </article>

              <article className="grid gap-3 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-6 text-sm text-[color:var(--color-text-body)]">
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
              <article className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-6 text-sm text-[color:var(--color-text-body)]">
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


export async function generateStaticParams() {
  return [{ cardId: "sample-card" }];
}
