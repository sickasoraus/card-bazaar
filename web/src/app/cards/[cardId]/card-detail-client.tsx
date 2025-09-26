'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { useRecommendations, type RecommendationSeed } from "@/hooks/use-recommendations";
import { mapRecommendationSource } from "@/lib/recommendation-utils";
import { trackBridgeInitiated, trackCardViewed, trackRecommendationServed } from "@/lib/telemetry";
import { initiateCardBazaarBridge } from "@/services/card-bazaar-bridge";
import { fetchCardById, type ScryfallCard } from "@/services/scryfall";

const COLOR_IDENTITY_LABELS: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

const RARITY_STYLES: Record<string, { label: string; className: string }> = {
  common: {
    label: "Common",
    className: "border-white/15 bg-white/10 text-[color:var(--color-text-body)]",
  },
  uncommon: {
    label: "Uncommon",
    className: "border-sky-300/40 bg-sky-500/20 text-sky-100",
  },
  rare: {
    label: "Rare",
    className: "border-amber-300/50 bg-amber-500/20 text-amber-100",
  },
  mythic: {
    label: "Mythic",
    className: "border-orange-400/60 bg-orange-500/20 text-orange-100",
  },
};

const ORACLE_LINE_BREAK = /\r?\n/;

const STAT_BLOCK_CLASS = "rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4";

type CardDetailClientProps = {
  cardId: string;
};

type BridgeState = {
  status: "idle" | "loading" | "success" | "error";
  message: string | null;
};

type CardRecommendationSeed = RecommendationSeed & {
  entity: {
    type: "card";
    card: {
      id: string;
      name: string;
      setCode: string;
      rarity: string;
      manaCost: string | null;
      image: string | null;
      colorIdentity: string[];
    };
  };
};

export function CardDetailClient({ cardId: initialCardId }: CardDetailClientProps) {
  const cardId = decodeURIComponent(initialCardId ?? "");
  const [card, setCard] = useState<ScryfallCard | null>(null);
  const [isLoadingCard, setIsLoadingCard] = useState<boolean>(true);
  const [cardError, setCardError] = useState<string | null>(null);
  const [bridgeState, setBridgeState] = useState<BridgeState>({ status: "idle", message: null });

  const {
    seeds,
    meta,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refresh: refreshRecommendations,
  } = useRecommendations({
    scope: "card",
    subjectId: cardId || undefined,
    surface: "card_detail",
    limit: 6,
  });

  const servedRecommendationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!cardId) {
      setCardError("We could not determine which card to load.");
      setIsLoadingCard(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingCard(true);
    setCardError(null);

    fetchCardById(cardId, { signal: controller.signal })
      .then((data) => {
        setCard(data);
        trackCardViewed({ cardId: data.id, context: "card_detail" });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "We could not load this card from Scryfall right now.";
        setCardError(message);
        setCard(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingCard(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [cardId]);

  useEffect(() => {
    if (!seeds.length) {
      return;
    }
    seeds.forEach((seed) => {
      if (servedRecommendationIdsRef.current.has(seed.id)) {
        return;
      }
      trackRecommendationServed({
        recommendationId: seed.id,
        surface: "card_detail",
        algorithm: mapRecommendationSource(seed.source),
      });
      servedRecommendationIdsRef.current.add(seed.id);
    });
  }, [seeds]);

  const colorIdentityLabel = useMemo(() => formatColorIdentity(card?.color_identity ?? []), [card]);
  const rarityStyle = useMemo(() => getRarityStyle(card?.rarity), [card?.rarity]);
  const priceLabel = useMemo(() => formatPrice(card), [card]);

  const handleBridgeToCardBazaar = async () => {
    if (!card) {
      return;
    }
    setBridgeState({ status: "loading", message: null });
    try {
      const result = await initiateCardBazaarBridge({
        type: "card",
        cardId: card.id,
        name: card.name,
        setCode: card.set ?? card.set_name ?? "",
      });
      trackBridgeInitiated({
        scope: "card",
        subjectId: card.id,
        destination: "card_bazaar",
        missingCount: Array.isArray(result.missing) ? result.missing.length : undefined,
        bridgeId: result.bridgeId,
      });

      const message =
        Array.isArray(result.missing) && result.missing.length > 0
          ? "Card Bazaar does not have an exact match yet, but we have flagged it for the ops team."
          : "Card Bazaar bridge is ready-check your cart preview to continue.";
      setBridgeState({ status: "success", message });
    } catch (error) {
      console.warn("Card Bazaar bridge failed", error);
      setBridgeState({
        status: "error",
        message: "We could not reach Card Bazaar right now. Please try again in a moment.",
      });
    }
  };

  return (
    <main className="min-h-screen bg-[color:var(--color-background)] text-[color:var(--color-text-body)]">
      <section className="border-b border-white/10 bg-[color:var(--color-neutral-200)]/20 py-10 sm:py-16">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-4 sm:px-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-colors hover:text-[color:var(--color-accent-highlight)]"
            >
              <span aria-hidden="true">?</span> Back to explorer
            </Link>
            <div className="flex items-center gap-2 text-xs text-subtle">
              {meta?.resolver === "fallback" ? "Personalization data is bootstrapping (showing curated picks)." : null}
            </div>
          </header>

          {isLoadingCard ? (
            <CardDetailSkeleton />
          ) : cardError ? (
            <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-[color:var(--color-text-hero)]">
              {cardError}
            </div>
          ) : card ? (
            <CardHero
              card={card}
              colorIdentityLabel={colorIdentityLabel}
              rarityStyle={rarityStyle}
              priceLabel={priceLabel}
              bridgeState={bridgeState}
              onBridge={handleBridgeToCardBazaar}
            />
          ) : null}
        </div>
      </section>
      <RecommendationRailSection
        cardId={cardId}
        seeds={seeds}
        isLoading={isLoadingRecommendations}
        error={recommendationsError}
        onRefresh={refreshRecommendations}
      />
    </main>
  );
}

type CardHeroProps = {
  card: ScryfallCard;
  colorIdentityLabel: string;
  rarityStyle: { label: string; className: string };
  priceLabel: string | null;
  bridgeState: BridgeState;
  onBridge: () => void;
};

function CardHero({ card, colorIdentityLabel, rarityStyle, priceLabel, bridgeState, onBridge }: CardHeroProps) {
  const art = card.image_uris?.art_crop ?? card.image_uris?.large ?? card.image_uris?.normal ?? null;
  const oracleLines = useMemo(() => {
    const text = card.oracle_text ?? "";
    return text
      .split(ORACLE_LINE_BREAK)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [card.oracle_text]);

  const powerToughness = card.power || card.toughness ? `${card.power ?? "?"}/${card.toughness ?? "?"}` : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[2px] ${rarityStyle.className}`}>
            {rarityStyle.label}
          </span>
          {priceLabel ? (
            <span className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
              {priceLabel}
            </span>
          ) : null}
          {colorIdentityLabel ? (
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
              {colorIdentityLabel}
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-4xl text-[color:var(--color-text-hero)] sm:text-5xl">{card.name}</h1>
          <p className="text-sm uppercase tracking-[4px] text-subtle">{card.type_line}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={STAT_BLOCK_CLASS}>
            <h2 className="text-xs font-semibold uppercase tracking-[3px] text-subtle">Oracle text</h2>
            <div className="mt-3 space-y-2 text-sm text-[color:var(--color-text-body)]">
              {oracleLines.length
                ? oracleLines.map((line, index) => <p key={`oracle-line-${index}`}>{line}</p>)
                : <p className="text-subtle">No rules text.</p>}
            </div>
          </div>
          <div className={`${STAT_BLOCK_CLASS} space-y-3`}>
            <h2 className="text-xs font-semibold uppercase tracking-[3px] text-subtle">Card stats</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <StatRow label="Mana cost" value={card.mana_cost ?? "-"} />
              <StatRow label="Mana value" value={formatManaValue(card.cmc)} />
              <StatRow label="Set" value={card.set_name ?? card.set ?? "-"} />
              <StatRow label="Collector #" value={card.collector_number ?? "-"} />
              <StatRow label="Layout" value={card.layout ?? "-"} />
              <StatRow label="Power/Toughness" value={powerToughness ?? "-"} />
            </dl>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onBridge}
            disabled={bridgeState.status === "loading"}
            className="gradient-pill shadow-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-3 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bridgeState.status === "loading" ? "Connecting..." : "Bridge to Card Bazaar"}
          </button>
          {bridgeState.message ? (
            <span
              className={`text-xs ${
                bridgeState.status === "error" ? "text-rose-200" : "text-[color:var(--color-text-hero)]"
              }`}
            >
              {bridgeState.message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-[340px] justify-center">
        <div
          className="absolute inset-0 translate-x-[18px] translate-y-[16px] rotate-6 rounded-[28px] border border-white/10 bg-white/10 blur-sm"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -translate-x-[16px] -translate-y-[20px] -rotate-6 rounded-[28px] border border-white/10 bg-white/10 blur-sm"
          aria-hidden="true"
        />
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt={card.name}
            className="relative h-[480px] w-full rounded-[28px] border border-white/15 object-cover shadow-2xl"
          />
        ) : (
          <div className="relative flex h-[480px] w-full items-center justify-center rounded-[28px] border border-dashed border-white/20 bg-white/10 text-xs uppercase tracking-[4px] text-subtle">
            Art unavailable
          </div>
        )}
      </div>
    </div>
  );
}

type RecommendationRailSectionProps = {
  cardId: string;
  seeds: RecommendationSeed[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
};

function RecommendationRailSection({ cardId, seeds, isLoading, error, onRefresh }: RecommendationRailSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bridgeFeedback, setBridgeFeedback] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const cardSeeds = useMemo(() => seeds.filter(isCardRecommendationSeed), [seeds]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setBridgeFeedback(null);
    setBridgeError(null);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  if (!isLoading && !cardSeeds.length && !error) {
    return null;
  }

  return (
    <section className="border-t border-white/10 bg-[color:var(--color-neutral-100)]/40 py-16">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Recommended next picks
            </p>
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)] sm:text-4xl">
              Cards that pair well with this build
            </h2>
            <p className="max-w-2xl text-sm text-subtle">
              Suggestions blend similar archetypes, recent Metablazt decks, and Card Bazaar trends. Refresh to get a new
              mix when telemetry evolves.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="gradient-pill shadow-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing || isLoading ? "Refreshing..." : "Refresh suggestions"}
          </button>
        </header>

        {error ? (
          <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-[color:var(--color-text-hero)]">
            {error}
          </div>
        ) : null}

        {bridgeFeedback ? (
          <div className="rounded-[var(--radius-card)] border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm text-emerald-100">
            {bridgeFeedback}
          </div>
        ) : null}
        {bridgeError ? (
          <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-rose-200">
            {bridgeError}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading && cardSeeds.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <article
                  key={`recommendation-skeleton-${index}`}
                  className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-4 animate-pulse"
                >
                  <div className="h-36 rounded-[16px] bg-white/10" />
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                  <div className="mt-auto h-8 w-full rounded bg-white/10" />
                </article>
              ))
            : cardSeeds.map((seed) => (
                <RecommendationCardTile
                  key={seed.id}
                  seed={seed}
                  currentCardId={cardId}
                  onBridgeFeedback={setBridgeFeedback}
                  onBridgeError={setBridgeError}
                />
              ))}
        </div>
      </div>
    </section>
  );
}

type RecommendationCardTileProps = {
  seed: CardRecommendationSeed;
  currentCardId: string;
  onBridgeFeedback: (message: string | null) => void;
  onBridgeError: (message: string | null) => void;
};

function RecommendationCardTile({ seed, currentCardId, onBridgeFeedback, onBridgeError }: RecommendationCardTileProps) {
  const card = seed.entity.card;
  const [isLinking, setIsLinking] = useState(false);

  const handleBridge = async () => {
    try {
      setIsLinking(true);
      onBridgeError(null);
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
      const message =
        Array.isArray(result.missing) && result.missing.length > 0
          ? "Card Bazaar does not have every printing yet, but the merchandising team has been notified."
          : "Card Bazaar bridge is ready. Check your cart preview to continue.";
      onBridgeFeedback(message);
    } catch (error) {
      console.warn("Card Bazaar bridge failed", error);
      onBridgeError("We could not bridge this card right now. Please try again soon.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <article className="surface-card hover:shadow-xl flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 transition-transform duration-150 hover:-translate-y-[2px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">{card.name}</h3>
          <p className="text-[11px] uppercase tracking-[3px] text-subtle">
            {card.setCode} - {card.colorIdentity.length ? card.colorIdentity.join(" ") : "Colorless"}
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
          {mapRecommendationSource(seed.source)}
        </span>
      </div>
      <p className="text-xs text-subtle">{seed.reason}</p>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs">
        <Link
          href={`/cards/${encodeURIComponent(card.id)}`}
          className="rounded-[var(--radius-pill)] border border-white/15 px-4 py-2 uppercase tracking-[2px] text-[color:var(--color-text-hero)] hover:border-white/35"
        >
          View card
        </Link>
        <button
          type="button"
          onClick={handleBridge}
          className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-4 py-2 uppercase tracking-[2px] text-[color:var(--color-text-hero)]"
          disabled={isLinking}
        >
          {isLinking ? "Linking..." : "Bridge"}
        </button>
      </div>
      {seed.targetId === currentCardId ? (
        <span className="text-[11px] uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">Pairs with this card</span>
      ) : null}
    </article>
  );
}

type StatRowProps = {
  label: string;
  value: string | number | null;
};

function StatRow({ label, value }: StatRowProps) {
  return (
    <>
      <dt className="text-xs text-[color:var(--color-accent-highlight)]">{label}</dt>
      <dd>{value ?? "-"}</dd>
    </>
  );
}

function formatManaValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatColorIdentity(symbols: string[]) {
  if (!symbols.length) {
    return "Colorless";
  }
  return symbols.map((symbol) => COLOR_IDENTITY_LABELS[symbol] ?? symbol).join(" / ");
}

function getRarityStyle(rarity?: string | null) {
  const key = typeof rarity === "string" ? rarity.toLowerCase() : "";
  return RARITY_STYLES[key] ?? {
    label: rarity ? rarity : "Unknown",
    className: "border-white/15 bg-white/10 text-[color:var(--color-text-body)]",
  };
}

function formatPrice(card: ScryfallCard | null) {
  if (!card?.prices) {
    return null;
  }
  const price = card.prices.usd ?? card.prices.usd_foil ?? null;
  if (!price) {
    return null;
  }
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return `$${numeric.toFixed(2)}`;
}

function CardDetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-6 w-24 rounded-full bg-white/10" />
          <span className="h-6 w-32 rounded-full bg-white/5" />
        </div>
        <div className="space-y-3">
          <div className="h-10 w-2/3 rounded bg-white/10" />
          <div className="h-4 w-1/3 rounded bg-white/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={STAT_BLOCK_CLASS}>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`skeleton-oracle-${index}`} className="h-3 w-full rounded bg-white/5" />
              ))}
            </div>
          </div>
          <div className={`${STAT_BLOCK_CLASS} grid grid-cols-2 gap-3`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-stat-${index}`} className="h-3 w-3/4 rounded bg-white/5" />
            ))}
          </div>
        </div>
      </div>
      <div className="relative mx-auto flex w-full max-w-[340px] justify-center">
        <div className="relative h-[480px] w-full rounded-[28px] border border-dashed border-white/20 bg-white/10" />
      </div>
    </div>
  );
}

function isCardRecommendationSeed(seed: RecommendationSeed): seed is CardRecommendationSeed {
  return Boolean(seed.entity && seed.entity.type === "card");
}








