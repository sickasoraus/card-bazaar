"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { useRecommendations } from "@/hooks/use-recommendations";
import { useTrending } from "@/hooks/use-trending";

function formatNumber(value: number | string | undefined) {
  if (value === undefined || value === null) {
    return "–";
  }
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return `${value}`;
  }
  if (numeric >= 1000) {
    return `${Math.round(numeric / 100) / 10}k`;
  }
  return `${Math.round(numeric)}`;
}

function SectionCardSkeleton({ label }: { label: string }) {
  return (
    <div className="surface-card rounded-[var(--radius-card)] border border-white/10 p-4 shadow-card">
      <p className="text-xs uppercase tracking-[3px] text-[color:var(--color-text-subtle)]">{label}</p>
      <div className="mt-4 h-[120px] rounded-[12px] bg-white/10" />
    </div>
  );
}

function DashboardSubtitle({ note }: { note: string | null }) {
  if (!note) {
    return null;
  }
  return (
    <div className="rounded-[12px] border border-yellow-400/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-100">
      {note}
    </div>
  );
}

export default function DashboardPage() {
  const trendingCards = useTrending({ scope: "card", limit: 6 });
  const trendingDecks = useTrending({ scope: "deck", limit: 6 });
  const cardRecommendations = useRecommendations({ scope: "card", surface: "homepage", limit: 6 });
  const deckRecommendations = useRecommendations({ scope: "deck", surface: "homepage", limit: 6 });

  const heroMessage = useMemo(() => {
    if (cardRecommendations.meta?.count) {
      return "Daily intel tuned to your decks.";
    }
    if (cardRecommendations.meta?.resolver === "fallback" || cardRecommendations.seeds.some((seed) => seed.fallback)) {
      return "Demo insights until live data comes online.";
    }
    return "Metablazt personalization preview.";
  }, [cardRecommendations.meta, cardRecommendations.seeds]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col gap-10 px-6 pb-16 pt-12 text-[color:var(--color-text-body)]">
      <header className="space-y-4">
        <p className="font-display text-sm uppercase tracking-[4px] text-[color:var(--color-accent-highlight)]">Personalized Dashboard</p>
        <h1 className="font-display text-4xl text-[color:var(--color-text-hero)] sm:text-5xl">{heroMessage}</h1>
        <p className="max-w-2xl text-sm text-[color:var(--color-text-subtle)]">
          Your dashboard blends trending signals, upgrade suggestions, and privacy status. Once Supabase auth and the Card Bazaar bridge are live,
          these sections will reflect your actual deck activity.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Trending cards</h2>
              <p className="text-sm text-[color:var(--color-text-subtle)]">
                Powered by Supabase metrics (demo seed today, live data after server deployment).
              </p>
            </div>
            <button
              type="button"
              onClick={() => trendingCards.refresh()}
              className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-subtle)] transition hover:border-white/40"
            >
              Refresh
            </button>
          </div>
          {trendingCards.error ? (
            <div className="rounded-[12px] border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {trendingCards.error}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingCards.isLoading && trendingCards.entries.length === 0
              ? Array.from({ length: 3 }).map((_, index) => <SectionCardSkeleton key={`card-skeleton-${index}`} label="Loading" />)
              : trendingCards.entries.map((entry) => (
                  <article
                    key={entry.subjectId}
                    className="surface-card rounded-[var(--radius-card)] border border-white/10 p-4 shadow-card transition-transform hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-[color:var(--color-neutral-300)]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
                        #{entry.rank}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-accent-highlight)]">
                        {formatNumber(entry.components.views as number | string | undefined)} views
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-lg text-[color:var(--color-text-hero)]">{entry.card?.name ?? "Unknown"}</h3>
                    <p className="text-xs uppercase tracking-[2px] text-[color:var(--color-text-subtle)]">
                      {entry.card?.setCode ?? "–"} · {entry.card?.rarity ?? "–"}
                    </p>
                    {entry.card?.image ? (
                      <Image
                        src={entry.card.image}
                        alt={entry.card?.name ?? "Card art"}
                        width={320}
                        height={240}
                        className="mt-3 h-36 w-full rounded-[12px] object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="mt-3 h-36 rounded-[12px] border border-dashed border-white/15" />
                    )}
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[color:var(--color-text-subtle)]">
                      <div>
                        <dt className="uppercase tracking-[2px]">Trend</dt>
                        <dd className="font-semibold text-[color:var(--color-text-hero)]">
                          {formatNumber(entry.trendScore)}
                        </dd>
                      </div>
                      <div>
                        <dt className="uppercase tracking-[2px]">Deck adds</dt>
                        <dd className="font-semibold text-[color:var(--color-text-hero)]">
                          {formatNumber(entry.components.deck_inclusions as number | string | undefined)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
          </div>
          <DashboardSubtitle note={trendingCards.meta?.fallback ? "Trending cards are using fallback data until Supabase metrics are wired." : null} />
        </div>

        <aside className="space-y-4 rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
          <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Privacy snapshot</h2>
          <p className="text-sm text-[color:var(--color-text-subtle)]">
            Manage analytics on the <Link href="/settings/privacy" className="underline">
              privacy settings page
            </Link>.
          </p>
          <div className="rounded-[16px] border border-white/10 bg-white/5 p-4 text-xs text-[color:var(--color-text-subtle)]">
            <p>
              Telemetry events currently store to local demo storage. Once Supabase credentials are configured, your opt-out state will sync automatically.
            </p>
          </div>
          <div className="rounded-[16px] border border-blue-400/40 bg-blue-500/10 p-4 text-xs text-blue-100">
            Card Bazaar SSO bridge is running in demo mode. Connect a real OIDC provider to unlock cross-product personalization.
          </div>
        </aside>
      </section>

      <section className="space-y-4 rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Deck upgrade ideas</h2>
            <p className="text-sm text-[color:var(--color-text-subtle)]">
              Suggestions combine similarity signals and trending staples. Replace with live data after Supabase auth.
            </p>
          </div>
          <button
            type="button"
            onClick={() => deckRecommendations.refresh()}
            className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-subtle)] transition hover:border-white/40"
          >
            Refresh
          </button>
        </div>
        {deckRecommendations.error ? (
          <div className="rounded-[12px] border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {deckRecommendations.error}
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deckRecommendations.isLoading && deckRecommendations.seeds.length === 0
            ? Array.from({ length: 3 }).map((_, index) => <SectionCardSkeleton key={`deck-skeleton-${index}`} label="Loading" />)
            : deckRecommendations.seeds.map((seed) => (
                <article
                  key={seed.id}
                  className="surface-card rounded-[var(--radius-card)] border border-white/10 p-4 shadow-card transition-transform hover:-translate-y-1"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-accent-highlight)]">
                    {seed.source.replace("_", " ")}
                  </span>
                  <h3 className="mt-3 font-display text-lg text-[color:var(--color-text-hero)]">{seed.title}</h3>
                  <p className="mt-1 text-xs text-[color:var(--color-text-subtle)]">{seed.reason}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[color:var(--color-text-subtle)]">
                    <div>
                      <dt className="uppercase tracking-[2px]">Rank</dt>
                      <dd className="font-semibold text-[color:var(--color-text-hero)]">{seed.rank ?? "–"}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-[2px]">Trend</dt>
                      <dd className="font-semibold text-[color:var(--color-text-hero)]">
                        {formatNumber(seed.trendScore ?? seed.metrics?.trendScore)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex items-center gap-2 text-xs text-[color:var(--color-text-subtle)]">
                    <Link
                      href="/deckbuilder"
                      className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition hover:border-white/40"
                    >
                      Open builder
                    </Link>
                    <Link
                      href="/deckbuilder/simulator"
                      className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition hover:border-white/40"
                    >
                      Test upgrade
                    </Link>
                  </div>
                </article>
              ))}
        </div>
        <DashboardSubtitle note={deckRecommendations.seeds.some((seed) => seed.fallback) ? "Upgrade suggestions are using demo data until Supabase metrics are populated." : null} />
      </section>

      <section className="space-y-4 rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Trending decks</h2>
            <p className="text-sm text-[color:var(--color-text-subtle)]">Spotlight on public lists that are gaining momentum.</p>
          </div>
          <button
            type="button"
            onClick={() => trendingDecks.refresh()}
            className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-subtle)] transition hover:border-white/40"
          >
            Refresh
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trendingDecks.isLoading && trendingDecks.entries.length === 0
            ? Array.from({ length: 3 }).map((_, index) => <SectionCardSkeleton key={`trending-deck-${index}`} label="Loading" />)
            : trendingDecks.entries.map((entry) => (
                <article
                  key={entry.subjectId}
                  className="surface-card rounded-[var(--radius-card)] border border-white/10 p-4 shadow-card transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[color:var(--color-neutral-300)]/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
                      #{entry.rank}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-accent-highlight)]">
                      {entry.deck?.format ?? "–"}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-lg text-[color:var(--color-text-hero)]">{entry.deck?.name ?? "Deck"}</h3>
                  <p className="text-xs text-[color:var(--color-text-subtle)]">Visibility: {entry.deck?.visibility ?? "–"}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[color:var(--color-text-subtle)]">
                    <div>
                      <dt className="uppercase tracking-[2px]">Trend</dt>
                      <dd className="font-semibold text-[color:var(--color-text-hero)]">
                        {formatNumber(entry.trendScore)}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-[2px]">Views</dt>
                      <dd className="font-semibold text-[color:var(--color-text-hero)]">
                        {formatNumber(entry.components.views as number | string | undefined)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
        </div>
        <DashboardSubtitle note={trendingDecks.meta?.fallback ? "Trending decks are using fallback data until Supabase metrics are wired." : null} />
      </section>
    </main>
  );
}

