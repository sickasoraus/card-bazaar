"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { type DeckSummary, useDecks } from "@/hooks/use-decks";

const VISIBILITY_FILTERS = [
  { label: "Public", value: "public" as const },
  { label: "Unlisted", value: "unlisted" as const },
  { label: "Private", value: "private" as const },
];

type DeckVisibilityFilter = typeof VISIBILITY_FILTERS[number]["value"];

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "â€”";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DeckBuilderPreviewSection() {
  const [visibility, setVisibility] = useState<DeckVisibilityFilter>("public");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { decks, meta, note, isLoading, error, refresh } = useDecks({
    visibility,
    limit: 6,
  });

  const deckCountLabel = useMemo(() => {
    if (meta?.count) {
      return `${meta.count} deck${meta.count === 1 ? "" : "s"}`;
    }
    if (decks.length) {
      return `${decks.length} deck${decks.length === 1 ? "" : "s"}`;
    }
    return "No decks yet";
  }, [meta, decks]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  return (
    <section id="deckbuilder" className="bg-[color:var(--color-neutral-200)]/30 py-20">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Deck scaffolding live
            </p>
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)] sm:text-4xl">
              Preview your saved decks and builder entry points
            </h2>
            <p className="max-w-3xl text-sm text-subtle">
              We&apos;re tapping the new `/api/decks` endpoint so everything you save later in the builder can surface instantly.
              For now, this panel shows stub data and the visibility filters that will power quick switching between personal,
              unlisted, and community decks.
            </p>
          </div>
          <Link
            href="/#cards"
            className="gradient-pill shadow-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px]"
          >
            Back to cards
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="surface-card shadow-card flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-[color:var(--color-text-hero)]">Deck visibility</h3>
              <span className="text-xs uppercase tracking-[3px] text-subtle">{deckCountLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {VISIBILITY_FILTERS.map((option) => {
                const isActive = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
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
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="rounded-[var(--radius-control)] border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] transition-opacity hover:border-white/35 disabled:opacity-40"
            >
              {isRefreshing ? "Refreshingâ€¦" : "Refresh list"}
            </button>
            {note ? (
              <p className="rounded-[var(--radius-control)] border border-dashed border-white/20 bg-white/5 p-3 text-xs text-subtle">
                {note}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-[var(--radius-control)] border border-rose-500/40 bg-rose-900/20 p-3 text-xs text-[color:var(--color-text-hero)]">
                {error}
              </p>
            ) : null}
          </aside>

          <div className="surface-card shadow-card flex flex-col gap-6 rounded-[var(--radius-card)] border border-white/10 p-6">
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-2xl text-[color:var(--color-text-hero)]">Deck drafts</h3>
              <p className="text-sm text-subtle">
                Saved decks will appear here once Supabase auth is wired up. The list updates live from the API endpoint that the
                builder will use for persistence, so this section doubles as our smoke test for draft storage.
              </p>
            </div>

            <DeckList isLoading={isLoading} decks={decks} />

            <div className="rounded-[var(--radius-control)] border border-dashed border-white/15 bg-white/5 p-4 text-xs text-subtle">
              <strong className="text-[color:var(--color-text-hero)]">Builder roadmap:</strong> Local drafts in `localStorage`,
              Supabase sync on sign-in, and quick deck switching from this panel. Check out the full plan in the deck draft
              persistence doc inside `/docs`.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type DeckListProps = {
  decks: DeckSummary[];
  isLoading: boolean;
};

function DeckList({ decks, isLoading }: DeckListProps) {
  if (isLoading) {
    return (
      <ul className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <li
            key={`deck-skeleton-${index}`}
            className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 p-4 animate-pulse"
          >
            <div className="h-4 w-1/2 rounded bg-white/15" />
            <div className="mt-3 h-3 w-3/4 rounded bg-white/10" />
            <div className="mt-6 h-3 w-1/2 rounded bg-white/10" />
          </li>
        ))}
      </ul>
    );
  }

  if (!decks.length) {
    return (
      <div className="rounded-[var(--radius-control)] border border-dashed border-white/15 bg-white/5 p-5 text-sm text-subtle">
        No decks yet. Once the builder ships, your saved lists will land here automatically. For now, the API is ready and
        waiting.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {decks.map((deck) => (
        <li
          key={deck.id}
          className="surface-card hover:shadow-lg flex flex-col gap-3 rounded-[var(--radius-control)] border border-white/10 bg-white/5 p-4 transition-transform duration-150 hover:-translate-y-[2px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg text-[color:var(--color-text-hero)]">{deck.name}</p>
              <span className="text-[11px] uppercase tracking-[3px] text-subtle">
                {deck.format} Â· {deck.visibility}
              </span>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
              {deck.cardCount} cards
            </span>
          </div>
          <p className="text-xs text-subtle">Updated {formatTimestamp(deck.updatedAt)}</p>
        </li>
      ))}
    </ul>
  );
}
