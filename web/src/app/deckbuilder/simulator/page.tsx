"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CardStack } from "@/components/card-stack";
import { useDeckSimulator, type SimulatorDeckInputCard } from "@/hooks/use-deck-simulator";
import { useDraftDeck } from "@/hooks/use-draft-deck";

function buildDeckInput(cards: Array<{ cardId: string; name: string; quantity: number; imageUrl?: string | null }>) {
  const reduced: Record<string, SimulatorDeckInputCard> = {};
  cards.forEach((card) => {
    if (!reduced[card.cardId]) {
      reduced[card.cardId] = {
        cardId: card.cardId,
        name: card.name,
        quantity: 0,
        imageUrl: card.imageUrl ?? null,
      };
    }
    reduced[card.cardId].quantity += card.quantity;
  });
  return Object.values(reduced);
}

export default function DeckSimulatorPage() {
  const { deck } = useDraftDeck();
  const {
    state,
    summary,
    loadDeck,
    shuffleLibrary,
    drawCards,
    drawOpeningHand,
    mulligan,
    nextTurn,
    moveCard,
    resetSession,
    clearSession,
  } = useDeckSimulator();

  const currentDeckCards = useMemo(() => {
    if (!deck || !deck.cards.length) {
      return [];
    }
    return deck.cards
      .filter((card) => card.zone === "mainboard" && card.quantity > 0)
      .map((card) => ({
        cardId: card.cardId,
        name: card.name,
        quantity: card.quantity,
        imageUrl: card.imageUrl ?? null,
      }));
  }, [deck]);

  const handleLoadCurrentDeck = () => {
    if (!deck || !currentDeckCards.length) {
      return;
    }
    loadDeck({
      id: deck.id,
      name: deck.name,
      source: "draft",
      cards: buildDeckInput(currentDeckCards),
    });
  };

  const libraryPreview = useMemo(() => state.library.slice(0, 3), [state.library]);
  const exilePreview = useMemo(() => state.exile.slice(0, 4), [state.exile]);
  const graveyardPreview = useMemo(() => state.graveyard.slice(0, 6), [state.graveyard]);

  return (
    <div className="min-h-screen bg-[color:var(--color-surface-primary)] text-[color:var(--color-text-body)]">
      <header className="border-b border-white/10 bg-[color:var(--color-neutral-100)]/60">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-6 py-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[3px] text-[color:var(--color-accent-highlight)]">
            <Link href="/deckbuilder" className="transition-opacity hover:opacity-80">
              Deckbuilder
            </Link>
            <span className="text-[color:var(--color-neutral-300)]">/</span>
            <span>Simulator</span>
          </div>
          <h1 className="font-display text-4xl text-[color:var(--color-text-hero)]">Deck Simulator</h1>
          <p className="max-w-2xl text-sm text-subtle">
            Goldfish your mainboard, track turn progression, and practice mulligans without leaving the Metablazt flow.
            This MVP focuses on the main deck—commander and sideboard zones are coming in later drops.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[2px] text-subtle">
            <span className="rounded-full border border-white/10 bg-[color:var(--color-neutral-200)]/40 px-3 py-1 text-[color:var(--color-text-hero)]">
              Turn {summary.turn}
            </span>
            <span className="rounded-full border border-white/10 bg-[color:var(--color-neutral-200)]/40 px-3 py-1 text-[color:var(--color-text-hero)]">
              Mulligans {summary.mulligans}
            </span>
            <span className="rounded-full border border-white/10 bg-[color:var(--color-neutral-200)]/40 px-3 py-1 text-[color:var(--color-text-hero)]">
              Library {summary.library}
            </span>
            <span className="rounded-full border border-white/10 bg-[color:var(--color-neutral-200)]/40 px-3 py-1 text-[color:var(--color-text-hero)]">
              Hand {summary.hand}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6 py-10">
        <section className="grid gap-4 rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/40 p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Load deck</h2>
            <div className="flex flex-col gap-3 text-sm">
              <button
                type="button"
                className="gradient-pill shadow-cta inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleLoadCurrentDeck}
                disabled={!currentDeckCards.length}
              >
                Use active deck ({currentDeckCards.length ? `${currentDeckCards.length} cards` : "empty"})
              </button>\n            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Session controls</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => drawCards(1)}
                className="rounded-[var(--radius-control)] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors hover:border-white/35 disabled:opacity-60"
                disabled={!state.loaded}
              >
                Draw 1
              </button>
              <button
                type="button"
                onClick={() => drawCards(7)}
                className="rounded-[var(--radius-control)] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors hover:border-white/35 disabled:opacity-60"
                disabled={!state.loaded}
              >
                Draw 7
              </button>
              <button
                type="button"
                onClick={drawOpeningHand}
                className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[1px] disabled:opacity-60"
                disabled={!state.loaded}
              >
                Opening Hand
              </button>
              <button
                type="button"
                onClick={mulligan}
                className="rounded-[var(--radius-control)] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors hover:border-white/35 disabled:opacity-60"
                disabled={!state.loaded}
              >
                Mulligan
              </button>
              <button
                type="button"
                onClick={nextTurn}
                className="rounded-[var(--radius-control)] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors hover:border-white/35 disabled:opacity-60"
                disabled={!state.loaded}
              >
                Next Turn
              </button>
              <button
                type="button"
                onClick={shuffleLibrary}
                className="rounded-[var(--radius-control)] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors hover:border-white/35 disabled:opacity-60"
                disabled={!state.loaded}
              >
                Shuffle
              </button>
              <button
                type="button"
                onClick={resetSession}
                className="rounded-[var(--radius-control)] border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors hover:border-white/35 disabled:opacity-60"
                disabled={!state.loaded}
              >
                Reset Session
              </button>
              <button
                type="button"
                onClick={clearSession}
                className="rounded-[var(--radius-control)] border border-rose-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-rose-100 transition-colors hover:border-rose-300/60"
              >
                Clear Save
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Session log</h2>
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-200)]/30 p-4 text-xs text-subtle">
              {state.history.length ? (
                <ul className="flex max-h-56 flex-col gap-2 overflow-auto pr-2">
                  {state.history.slice(0, 32).map((entry) => (
                    <li key={entry.id}>
                      <span className="text-[10px] uppercase tracking-[2px] text-[color:var(--color-accent-highlight)]">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="ml-2 text-[color:var(--color-text-hero)]">{entry.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No simulator actions yet. Load a deck to get started.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Library</h3>
                <span className="text-xs text-subtle">{state.library.length} cards</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {libraryPreview.length ? (
                  libraryPreview.map((card) => (
                    <CardStack key={card.instanceId} title={state.loaded ? card.name : "Face Down"} imageUrl={state.loaded ? card.imageUrl : null} subtitle="Top of library" />
                  ))
                ) : (
                  <div className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-8 text-center text-xs text-subtle">
                    Library empty
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Exile</h3>
                <span className="text-xs text-subtle">{state.exile.length}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {exilePreview.length ? (
                  exilePreview.map((card) => (
                    <CardStack key={card.instanceId} title={card.name} imageUrl={card.imageUrl} subtitle="Exile" />
                  ))
                ) : (
                  <div className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-6 text-center text-xs text-subtle">
                    No cards exiled
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Hand</h3>
                <span className="text-xs text-subtle">{state.hand.length}</span>
              </div>
              {state.hand.length ? (
                <div className="flex flex-wrap gap-4">
                  {state.hand.map((card) => (
                    <div key={card.instanceId} className="w-36">
                      <CardStack title={card.name} imageUrl={card.imageUrl} subtitle="Hand" />
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[2px]">
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "battlefield")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Battlefield
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "graveyard")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Graveyard
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "exile")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Exile
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "library", "bottom")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Bottom
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-10 text-center text-xs text-subtle">
                  Draw cards to populate your hand.
                </div>
              )}
            </div>
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Battlefield</h3>
                <span className="text-xs text-subtle">{state.battlefield.length}</span>
              </div>
              {state.battlefield.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {state.battlefield.map((card) => (
                    <div key={card.instanceId} className="flex flex-col gap-2">
                      <CardStack title={card.name} imageUrl={card.imageUrl} subtitle="Battlefield" />
                      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[2px]">
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "graveyard")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Graveyard
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "exile")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Exile
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "library")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Top Library
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-10 text-center text-xs text-subtle">
                  No permanents yet. Move cards from your hand to battlefield.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Graveyard</h3>
                <span className="text-xs text-subtle">{state.graveyard.length}</span>
              </div>
              {graveyardPreview.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {graveyardPreview.map((card) => (
                    <div key={card.instanceId} className="flex flex-col gap-2">
                      <CardStack title={card.name} imageUrl={card.imageUrl} subtitle="Graveyard" />
                      <div className="flex gap-2 text-[10px] uppercase tracking-[2px]">
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "hand")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Return to hand
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(card.instanceId, "battlefield")}
                          className="rounded-[var(--radius-pill)] border border-white/10 px-3 py-1 text-[color:var(--color-text-hero)] transition-colors hover:border-white/35"
                        >
                          Battlefield
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-8 text-center text-xs text-subtle">
                  No cards in the graveyard.
                </div>
              )}
            </div>
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[color:var(--color-neutral-100)]/50 p-4 text-xs text-subtle">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]">Tips</h3>
              <ul className="list-disc space-y-2 pl-4">
                <li>Use the hand controls to goldfish combo lines quickly.</li>
                <li>Mulligans follow the London pattern; we will add bottom-card selection in a future iteration.</li>
                <li>Session state auto-saves locally so you can return later.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}







