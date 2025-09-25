"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import { useDraftDeck } from "@/hooks/use-draft-deck";
import { useScryfallSearch } from "@/hooks/use-scryfall-search";
import type { ScryfallCard } from "@/services/scryfall";

const DEFAULT_QUERY = "game:paper";

type DeckVisibility = "private" | "unlisted" | "public";

export default function DeckBuilderPage() {
  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY);

  const {
    deck,
    cardCount,
    recentDrafts,
    addCard,
    decrementCard,
    removeCard,
    updateDeckMeta,
    resetDeck,
    importFromList,
    exportToJson,
    loadDraft,
    deleteDraft,
    syncToSupabase,
    isSupabaseConfigured,
    isSyncing,
    syncError,
  } = useDraftDeck();

  const { data, isLoading, error, updateParams } = useScryfallSearch({ initialQuery: DEFAULT_QUERY });

  const cards = useMemo<ScryfallCard[]>(() => data?.data ?? [], [data]);

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = searchInput.trim();
      if (!trimmed) {
        return;
      }
      updateParams({ query: trimmed, page: 1 });
    },
    [searchInput, updateParams],
  );

  const handleAddCard = useCallback(
    (card: ScryfallCard) => {
      addCard({
        cardId: card.id,
        name: card.name,
        manaCost: card.mana_cost,
        typeLine: card.type_line,
        imageUrl: card.image_uris?.small ?? card.image_uris?.normal ?? null,
      });
    },
    [addCard],
  );

  const handleImportList = useCallback(() => {
    const text = window.prompt("Paste a deck list (one card per line, optional leading quantity):", "");
    if (text === null) {
      return;
    }
    const result = importFromList(text);
    if (!result.ok) {
      window.alert(result.error);
    } else {
      window.alert(`Imported ${result.added} entries into your draft.`);
    }
  }, [importFromList]);

  const handleExport = useCallback(() => {
    const payload = exportToJson();
    if (!payload) {
      window.alert("Nothing to export yet.");
      return;
    }
    const blob = new Blob([payload], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${deck.name.replace(/[^a-z0-9-_]+/gi, "-") || "metablazt-deck"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
  }, [deck.name, exportToJson]);

  const handleSupabaseSync = useCallback(async () => {
    const result = await syncToSupabase();
    if (!result.ok) {
      window.alert(result.error);
    } else {
      const entryCount = result.cardEntryCount ?? deck.cards.length;
      const quantity = result.cardQuantity ?? deck.cards.reduce((total, card) => total + card.quantity, 0);
      window.alert(`Deck saved to Supabase (${entryCount} entries / ${quantity} cards).`);
    }
  }, [deck.cards, syncToSupabase]);

  const lastSyncedLabel = useMemo(() => {
    if (!deck.lastSyncedAt) {
      return null;
    }
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(
        new Date(deck.lastSyncedAt),
      );
    } catch {
      return deck.lastSyncedAt;
    }
  }, [deck.lastSyncedAt]);

  const supabaseButtonLabel = useMemo(() => {
    if (isSyncing) {
      return deck.remoteId ? "Syncing..." : "Saving...";
    }
    return deck.remoteId ? "Sync to Supabase" : "Save to Supabase";
  }, [deck.remoteId, isSyncing]);

  const formatDraftTimestamp = useCallback((iso?: string) => {
    if (!iso) {
      return "Recently updated";
    }
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }, []);

  const formattedDrafts = useMemo(
    () =>
      recentDrafts.map((draft) => ({
        ...draft,
        isCurrent: draft.id === deck.id,
        lastUpdatedLabel: formatDraftTimestamp(draft.lastUpdated),
        badge: draft.source === "supabase" ? "Cloud" : "Local",
      })),
    [recentDrafts, deck.id, formatDraftTimestamp],
  );

  const handleLoadDraft = useCallback(
    (draftId: string) => {
      if (draftId === deck.id) {
        return;
      }
      const loaded = loadDraft(draftId);
      if (!loaded) {
        window.alert("We couldn’t open that draft. It may have been removed.");
      }
    },
    [deck.id, loadDraft],
  );

  const handleDeleteDraft = useCallback(
    (draftId: string) => {
      if (!window.confirm("Remove this draft from this device?")) {
        return;
      }
      deleteDraft(draftId);
    },
    [deleteDraft],
  );

  return (
    <div className="bg-[color:var(--color-surface-primary)] min-h-screen pb-16">
      <section className="border-b border-white/10 bg-[color:var(--color-neutral-100)]/80 py-12">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6">
          <nav className="text-xs uppercase tracking-[3px] text-subtle">
            <Link href="/">Home</Link> <span className="mx-2 text-white/40">/</span> Deck Builder (Phase 1 preview)
          </nav>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
            <div className="flex flex-col gap-4">
              <input
                className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[color:var(--color-text-hero)] placeholder:text-subtle focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                value={deck.name}
                onChange={(event) => updateDeckMeta({ name: event.target.value })}
                placeholder="Deck name"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex flex-1 items-center gap-2 text-xs uppercase tracking-[2px] text-subtle">
                  <span>Format</span>
                  <select
                    value={deck.format}
                    onChange={(event) => updateDeckMeta({ format: event.target.value })}
                    className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                  >
                    <option value="commander">Commander</option>
                    <option value="modern">Modern</option>
                    <option value="pioneer">Pioneer</option>
                    <option value="standard">Standard</option>
                    <option value="pauper">Pauper</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs uppercase tracking-[2px] text-subtle">
                  <span>Visibility</span>
                  <select
                    value={deck.visibility}
                    onChange={(event) => updateDeckMeta({ visibility: event.target.value as DeckVisibility })}
                    className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                  >
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </label>
              </div>
            </div>
            <aside className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-6 text-xs text-subtle">
              <span className="font-display text-lg text-[color:var(--color-text-hero)]">Draft summary</span>
              <div className="flex items-center justify-between">
                <span>Total cards</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{cardCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Distinct cards</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{deck.cards.length}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {isSupabaseConfigured ? (
                  <button
                    type="button"
                    onClick={handleSupabaseSync}
                    disabled={isSyncing}
                    className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {supabaseButtonLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleImportList}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
                >
                  Import list
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={resetDeck}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
                >
                  Reset draft
                </button>
              </div>
              {isSupabaseConfigured ? (
                <div className="mt-2 space-y-1 text-[11px] text-subtle">
                  <p>
                    {deck.remoteId
                      ? lastSyncedLabel
                        ? "Cloud copy updated " + lastSyncedLabel + "."
                        : "Cloud copy ready. Sync whenever you update the list."
                      : "Save this draft to Supabase to keep a cloud backup."}
                  </p>
                  {syncError ? (
                    <p className="text-rose-300">Last sync failed: {syncError}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-subtle">
                  Drafts save locally today. Configure Supabase to enable cloud persistence.
                </p>
              )}
              <div className="mt-4 space-y-2">
                <h3 className="text-[11px] uppercase tracking-[2px] text-subtle">Recent drafts</h3>
                {formattedDrafts.length ? (
                  <ul className="space-y-2">
                    {formattedDrafts.map((draft) => (
                      <li
                        key={draft.id}
                        className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[color:var(--color-text-hero)]">{draft.name}</p>
                            <p className="text-[10px] uppercase tracking-[1.5px] text-subtle">
                              {draft.format} · {draft.badge} draft · {draft.lastUpdatedLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleLoadDraft(draft.id)}
                              disabled={draft.isCurrent}
                              className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {draft.isCurrent ? "Current" : "Resume"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDraft(draft.id)}
                              className="rounded-[var(--radius-pill)] border border-rose-500/40 px-3 py-1 text-[10px] uppercase tracking-[2px] text-rose-200 hover:border-rose-300/60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-subtle">
                    Drafts you open will appear here so you can jump back later. We keep the last ten.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[color:var(--color-neutral-100)]/40 py-10">
        <div className="mx-auto flex w/full max-w-[1240px] flex-col gap-6 px-6">
          <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Your current draft</h2>
          {deck.cards.length === 0 ? (
            <p className="rounded-[var(--radius-control)] border border-dashed border-white/20 bg-white/5 p-4 text-sm text-subtle">
              No cards added yet. Search below and tap “Add to deck” to start building.
            </p>
          ) : (
            <table className="min-w-full overflow-hidden rounded-[var(--radius-card)] border border-white/10 text-sm text-subtle">
              <thead className="bg-white/5 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
                <tr>
                  <th className="px-4 py-3 text-left">Quantity</th>
                  <th className="px-4 py-3 text-left">Card</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deck.cards.map((card) => (
                  <tr key={card.cardId} className="border-t border-white/10">
                    <td className="px-4 py-3 text-[color:var(--color-text-hero)]">{card.quantity}</td>
                    <td className="px-4 py-3 text-[color:var(--color-text-hero)]">
                      <div className="flex flex-col">
                        <span className="font-semibold">{card.name}</span>
                        {card.manaCost ? (
                          <span className="text-[11px] text-subtle">{card.manaCost}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{card.typeLine ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => addCard(card)}
                          className="rounded-[var(--radius-pill)] border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/35"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => decrementCard(card.cardId)}
                          className="rounded-[var(--radius-pill)] border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/35"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCard(card.cardId)}
                          className="rounded-[var(--radius-pill)] border border-rose-500/40 px-3 py-1 text-[11px] uppercase tracking-[2px] text-rose-200 hover:border-rose-300/60"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto flex w/full max-w-[1240px] flex-col gap-8 px-6">
          <header className="flex flex-col gap-2">
            <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Search cards</h2>
            <p className="text-sm text-subtle">
              Live results come straight from Scryfall. Add cards to your draft to test the deck builder instrumentation.
            </p>
          </header>

          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Card search</span>
              <input
                className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[color:var(--color-text-hero)] placeholder:text-subtle focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                placeholder="Search Scryfall syntax (e.g. type:creature t:legendary)"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-6 py-3 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]"
            >
              Search
            </button>
          </form>

          {error ? (
            <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-[color:var(--color-text-hero)]">
              Failed to load cards: {error.message}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading && cards.length === 0
              ? Array.from({ length: 6 }).map((_, index) => (
                  <article
                    key={`card-skeleton-${index}`}
                    className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-4 animate-pulse"
                  >
                    <div className="h-[140px] rounded-[12px] bg-white/10" />
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/5" />
                    <div className="h-8 w-full rounded bg-white/5" />
                  </article>
                ))
              : cards.map((card) => (
                  <article
                    key={card.id}
                    className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">{card.name}</h3>
                        <p className="text-[11px] uppercase tracking-[3px] text-subtle">{card.type_line}</p>
                      </div>
                      <span className="rounded-full bg-[color:var(--color-accent-highlight)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
                        {card.set_name ?? card.set}
                      </span>
                    </div>
                    <p className="text-xs text-subtle">
                      {card.mana_cost ?? ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddCard(card)}
                      className="gradient-pill shadow-cta mt-auto rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]"
                    >
                      Add to deck
                    </button>
                  </article>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}
