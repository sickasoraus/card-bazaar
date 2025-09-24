const sampleCards = [
  {
    name: "Gaea's Cradle",
    subtitle: "Legendary Land",
    stat: "+36 copies sold",
  },
  {
    name: "Grim Monolith",
    subtitle: "Artifact",
    stat: "+18% week over week",
  },
  {
    name: "Underground Sea",
    subtitle: "Dual Land",
    stat: "Trending in Legacy",
  },
  {
    name: "Sheoldred, the Apocalypse",
    subtitle: "Creature - Phyrexian Praetor",
    stat: "Top pick in Pioneer",
  },
  {
    name: "Teferi, Hero of Dominaria",
    subtitle: "Planeswalker",
    stat: "Control decks +12%",
  },
  {
    name: "Liliana of the Veil",
    subtitle: "Planeswalker",
    stat: "Modern midrange staple",
  },
];

export function CardGridFrame() {
  return (
    <section id="cards" className="pb-20">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Phase 1 Preview
            </p>
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)] sm:text-4xl">
              Card explorer frame with Scryfall data stubs
            </h2>
            <p className="max-w-2xl text-sm text-subtle">
              We will hydrate this grid with live Scryfall responses and deck-aware metadata while keeping the browsing cadence that Card Bazaar players love.
            </p>
          </div>
          <button
            type="button"
            className="gradient-pill shadow-cta mt-4 inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] px-6 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px]"
          >
            View Data Blueprint
          </button>
        </header>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sampleCards.map((card) => (
            <article
              key={card.name}
              className="surface-card shadow-card group flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-5 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="relative h-[220px] overflow-hidden rounded-[12px] bg-[linear-gradient(160deg,var(--color-neutral-300)_0%,var(--color-neutral-100)_100%)] opacity-90">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--color-accent-start)_0%,transparent_65%)]" aria-hidden />
                <span className="absolute left-4 top-4 rounded-full bg-[color:var(--color-accent-highlight)]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[3px] text-[color:var(--color-neutral-100)]">
                  Placeholder Art
                </span>
                <span className="absolute bottom-4 left-4 text-xs uppercase tracking-[4px] text-[color:var(--color-text-hero)]/80">
                  {card.stat}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-xl text-[color:var(--color-text-hero)]">
                  {card.name}
                </h3>
                <p className="text-xs uppercase tracking-[4px] text-subtle">
                  {card.subtitle}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between text-xs text-subtle">
                <span>Deck suggestions coming soon</span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-semibold uppercase tracking-[3px] text-[10px] text-[color:var(--color-text-hero)]">
                  Phase 1
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
